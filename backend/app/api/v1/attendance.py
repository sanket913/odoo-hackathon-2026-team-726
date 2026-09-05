import datetime
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.api.deps import get_current_user, require_permission, get_current_employee, CurrentUser
from app.core.permissions import P_ATTENDANCE_READ_ALL, P_ATTENDANCE_CREATE_SELF, P_ATTENDANCE_CORRECT
from app.core.exceptions import PermissionDeniedError, ValidationAppError
from app.schemas.attendance import AttendanceCreate, AttendanceUpdate, CheckInRequest
from app.services import attendance_service
from app.models.employee import Employee
from app.utils.response import ok, paginated

router = APIRouter(prefix="/attendance", tags=["attendance"])


@router.get("")
def list_attendance(employee_id: int | None = None, date_from: datetime.date | None = None,
                     date_to: datetime.date | None = None, status: str | None = None,
                     page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=100), search: str | None = None, db: Session = Depends(get_db),
                     current: CurrentUser = Depends(get_current_user)):
    if not current.has_permission(P_ATTENDANCE_READ_ALL):
        emp = db.query(Employee).filter(Employee.user_id == current.id).first()
        employee_id = emp.id if emp else -1
    items, total = attendance_service.list_attendance(db, employee_id, date_from, date_to, status, page, limit, search=search)
    return paginated([attendance_service.to_out_dict(a) for a in items], page, limit, total)


@router.post("")
def create_attendance(payload: AttendanceCreate, db: Session = Depends(get_db),
                       _=Depends(require_permission(P_ATTENDANCE_CORRECT))):
    row = attendance_service.create_attendance(db, payload)
    db.commit()
    return ok(attendance_service.to_out_dict(row))


@router.get("/self-status")
def self_status(db: Session = Depends(get_db), employee=Depends(get_current_employee),
                _=Depends(require_permission(P_ATTENDANCE_CREATE_SELF))):
    from app.models.attendance import Attendance
    from app.utils.attendance_rules import business_time, utc_now
    if not employee:
        raise ValidationAppError("No employee record linked to this user account")
    today = business_time(utc_now()).date()
    record = db.query(Attendance).filter(Attendance.employee_id == employee.id, Attendance.check_in.isnot(None), Attendance.check_out.is_(None)).order_by(Attendance.check_in.desc()).first()
    if record is None:
        record = db.query(Attendance).filter(Attendance.employee_id == employee.id, Attendance.date == today).first()
    return ok({"business_date": today, "record": attendance_service.to_out_dict(record) if record else None})


@router.get("/{attendance_id}")
def get_attendance(attendance_id: int, db: Session = Depends(get_db), current: CurrentUser = Depends(get_current_user)):
    row = attendance_service.get_attendance(db, attendance_id)
    if not current.has_permission(P_ATTENDANCE_READ_ALL):
        emp = db.query(Employee).filter(Employee.user_id == current.id).first()
        if not emp or row.employee_id != emp.id:
            raise PermissionDeniedError("You may only access your own attendance")
    return ok(attendance_service.to_out_dict(row))


@router.patch("/{attendance_id}")
def update_attendance(attendance_id: int, payload: AttendanceUpdate, db: Session = Depends(get_db),
                       current=Depends(require_permission(P_ATTENDANCE_CORRECT))):
    from app.services.audit_service import write_audit
    before = attendance_service.to_out_dict(attendance_service.get_attendance(db, attendance_id))
    row = attendance_service.update_attendance(db, attendance_id, payload)
    write_audit(db, current.id, "Attendance", row.id, "CORRECT", before=before, after=attendance_service.to_out_dict(row))
    db.commit()
    return ok(attendance_service.to_out_dict(row))


@router.post("/check-in")
def check_in(payload: CheckInRequest | None = None, db: Session = Depends(get_db), employee=Depends(get_current_employee),
             _=Depends(require_permission(P_ATTENDANCE_CREATE_SELF))):
    if not employee:
        raise ValidationAppError("No employee record linked to this user account")
    # Attendance Geofence
    payload = payload or CheckInRequest()
    row = attendance_service.check_in(db, employee.id, payload.latitude, payload.longitude)
    db.commit()
    return ok(attendance_service.to_out_dict(row))


@router.post("/check-out")
def check_out(db: Session = Depends(get_db), employee=Depends(get_current_employee),
              _=Depends(require_permission(P_ATTENDANCE_CREATE_SELF))):
    if not employee:
        raise ValidationAppError("No employee record linked to this user account")
    row = attendance_service.check_out(db, employee.id)
    db.commit()
    return ok(attendance_service.to_out_dict(row))
