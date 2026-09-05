from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.api.deps import get_current_user, require_permission, CurrentUser
from app.core.permissions import (
    P_EMPLOYEE_READ_SELF, P_EMPLOYEE_READ_ALL, P_EMPLOYEE_CREATE, P_EMPLOYEE_UPDATE, P_EMPLOYEE_ARCHIVE,
)
from app.core.exceptions import PermissionDeniedError
from app.schemas.employee import EmployeeCreate, EmployeeUpdate
from app.services import employee_service
from app.models.contract import Contract
from app.models.attendance import Attendance
from app.models.time_off import TimeOffRequest, TimeOffAllocation
from app.services.contract_service import to_out_dict as contract_dict
from app.services.attendance_service import to_out_dict as attendance_dict
from app.services.timeoff_service import to_request_dict, to_allocation_dict
from app.utils.response import ok, paginated

router = APIRouter(prefix="/employees", tags=["employees"])


# Employee Audit Trail (HR/admin only, paginated)
@router.get("/{employee_id}/audit-log")
def employee_audit_log(employee_id: int, page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=100),
                       db: Session = Depends(get_db), _=Depends(require_permission(P_EMPLOYEE_UPDATE))):
    from app.models.audit import EmployeeAuditLog
    employee_service.get_employee(db, employee_id)
    query = db.query(EmployeeAuditLog).filter(EmployeeAuditLog.employee_id == employee_id)
    total = query.count()
    rows = query.order_by(EmployeeAuditLog.id.desc()).offset((page-1)*limit).limit(limit).all()
    return paginated([{key: getattr(r, key) for key in ("id", "employee_id", "changed_by", "field_name", "old_value", "new_value", "changed_at")} for r in rows], page, limit, total)


def _assert_can_view(current: CurrentUser, employee_id: int, db: Session) -> None:
    if current.has_permission(P_EMPLOYEE_READ_ALL):
        return
    if current.has_permission(P_EMPLOYEE_READ_SELF):
        emp = employee_service.get_employee(db, employee_id)
        if emp.user_id == current.id:
            return
    raise PermissionDeniedError("You may only access your own employee record")


@router.get("")
def list_employees(employee_type_id: int | None = None, search: str | None = None, department_id: int | None = None, active: bool | None = None,
                    page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=100), db: Session = Depends(get_db),
                    current: CurrentUser = Depends(get_current_user)):
    if current.has_permission(P_EMPLOYEE_READ_ALL):
        items, total = employee_service.list_employees(db, search, department_id, active, page, limit, employee_type_id)
        return paginated([employee_service.to_out_dict(db, e) for e in items], page, limit, total)
    if current.has_permission(P_EMPLOYEE_READ_SELF):
        from app.models.employee import Employee
        emp = db.query(Employee).filter(Employee.user_id == current.id).first()
        items = [emp] if emp else []
        return paginated([employee_service.to_out_dict(db, e) for e in items], 1, 1, len(items))
    raise PermissionDeniedError("Missing employee read permission")


@router.post("")
def create_employee(payload: EmployeeCreate, db: Session = Depends(get_db),
                     _=Depends(require_permission(P_EMPLOYEE_CREATE))):
    emp = employee_service.create_employee(db, payload)
    db.commit()
    return ok(employee_service.to_out_dict(db, emp))


@router.get("/{employee_id}")
def get_employee(employee_id: int, db: Session = Depends(get_db), current: CurrentUser = Depends(get_current_user)):
    _assert_can_view(current, employee_id, db)
    emp = employee_service.get_employee(db, employee_id)
    # Role-aware smart buttons
    from app.services.employee_buttons import get_visible_buttons
    data = employee_service.to_out_dict(db, emp)
    data["visible_buttons"] = get_visible_buttons(current.roles)
    return ok(data)


@router.patch("/{employee_id}")
def update_employee(employee_id: int, payload: EmployeeUpdate, db: Session = Depends(get_db),
                     current: CurrentUser = Depends(require_permission(P_EMPLOYEE_UPDATE))):
    emp = employee_service.update_employee(db, employee_id, payload, current.id)
    db.commit()
    return ok(employee_service.to_out_dict(db, emp))


@router.post("/{employee_id}/archive")
def archive_employee(employee_id: int, db: Session = Depends(get_db),
                      _=Depends(require_permission(P_EMPLOYEE_ARCHIVE))):
    emp = employee_service.archive_employee(db, employee_id)
    db.commit()
    return ok(employee_service.to_out_dict(db, emp))


@router.get("/{employee_id}/contracts")
def employee_contracts(employee_id: int, db: Session = Depends(get_db), current: CurrentUser = Depends(get_current_user)):
    _assert_can_view(current, employee_id, db)
    rows = db.query(Contract).filter(Contract.employee_id == employee_id).order_by(Contract.start_date.desc()).all()
    return ok([contract_dict(c) for c in rows])


@router.get("/{employee_id}/attendance")
def employee_attendance(employee_id: int, db: Session = Depends(get_db), current: CurrentUser = Depends(get_current_user)):
    _assert_can_view(current, employee_id, db)
    rows = db.query(Attendance).filter(Attendance.employee_id == employee_id).order_by(Attendance.date.desc()).all()
    return ok([attendance_dict(a) for a in rows])


@router.get("/{employee_id}/time-off")
def employee_time_off(employee_id: int, db: Session = Depends(get_db), current: CurrentUser = Depends(get_current_user)):
    _assert_can_view(current, employee_id, db)
    rows = db.query(TimeOffRequest).filter(TimeOffRequest.employee_id == employee_id).order_by(TimeOffRequest.created_at.desc()).all()
    return ok([to_request_dict(r) for r in rows])


@router.get("/{employee_id}/allocations")
def employee_allocations(employee_id: int, db: Session = Depends(get_db), current: CurrentUser = Depends(get_current_user)):
    _assert_can_view(current, employee_id, db)
    rows = db.query(TimeOffAllocation).filter(TimeOffAllocation.employee_id == employee_id).order_by(TimeOffAllocation.valid_from.desc()).all()
    return ok([to_allocation_dict(a) for a in rows])
