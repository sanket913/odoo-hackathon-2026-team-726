import datetime
from decimal import Decimal
from sqlalchemy.orm import Session, joinedload, selectinload
from sqlalchemy import or_

from app.models.attendance import Attendance, AttendanceStatus
from app.models.employee import Employee
from app.core.exceptions import NotFoundError, ValidationAppError

from app.utils.attendance_rules import utc_now, as_utc, business_time, location_tag, apply_auto_status

LATE_THRESHOLD = datetime.time(10, 15)


def to_out_dict(attendance: Attendance) -> dict:
    return {
        "id": attendance.id,
        # Attendance Geofence / Auto Attendance Status
        "latitude": attendance.latitude, "longitude": attendance.longitude,
        "location_tag": attendance.location_tag, "auto_status_note": attendance.auto_status_note,
        "employee_id": attendance.employee_id,
        "employee_name": attendance.employee.name if attendance.employee else None,
        "date": attendance.date,
        # preserve UTC meaning when browsers display local business time.
        "check_in": as_utc(attendance.check_in) if attendance.check_in else None,
        "check_out": as_utc(attendance.check_out) if attendance.check_out else None,
        "worked_hours": attendance.worked_hours,
        "gross_hours": gross_hours(attendance),
        "break_hours": attendance.break_hours or Decimal('0'),
        "break_allowance_hours": attendance.break_allowance_hours or Decimal('0'),
        "break_source": attendance.break_source or 'Legacy',
        "break_threshold_hours": 6,
        "status": attendance.status.value if hasattr(attendance.status, "value") else attendance.status,
        "is_manual_correction": attendance.is_manual_correction,
        "correction_reason": attendance.correction_reason,
    }


def gross_hours(row):
    if not row.check_in or not row.check_out:
        return Decimal('0.00')
    return (Decimal(str((as_utc(row.check_out) - as_utc(row.check_in)).total_seconds())) / Decimal(3600)).quantize(Decimal('.01'))


def snapshot_break(db, row):
    from app.models.schedule import WorkingSchedule
    employee = db.get(Employee, row.employee_id)
    schedule = db.get(WorkingSchedule, employee.working_schedule_id) if employee and employee.working_schedule_id else None
    row.break_allowance_hours = sum((line.break_hours for line in schedule.lines if line.day_of_week == row.date.weekday()), Decimal('0')) if schedule else Decimal('0')
    row.break_hours = Decimal('0')
    row.break_source = 'Scheduled'


def _apply_recompute(attendance: Attendance) -> None:
    # Auto Attendance Status: store naive UTC consistently with MySQL.
    for field in ("check_in", "check_out"):
        value = getattr(attendance, field)
        if value:
            setattr(attendance, field, as_utc(value).replace(tzinfo=None))
    if attendance.check_in and attendance.check_out and attendance.check_out < attendance.check_in:
        raise ValidationAppError("Check-out cannot precede check-in")
    gross = gross_hours(attendance)
    if attendance.break_source == 'Scheduled':
        attendance.break_hours = min(Decimal(attendance.break_allowance_hours or 0), gross) if gross >= Decimal('6') else Decimal('0')
    if Decimal(attendance.break_hours or 0) < 0 or Decimal(attendance.break_hours or 0) > max(gross, Decimal('0')):
        raise ValidationAppError('Break duration must be between zero and the total time on site')
    attendance.recompute()
    if attendance.check_in and business_time(attendance.check_in).time() > LATE_THRESHOLD and attendance.status == AttendanceStatus.PRESENT:
        attendance.status = AttendanceStatus.LATE
    apply_auto_status(attendance)


def list_attendance(db: Session, employee_id: int | None, date_from, date_to, status: str | None,
                     page: int, limit: int, search=None):
    query = db.query(Attendance)
    if employee_id:
        query = query.filter(Attendance.employee_id == employee_id)
    if date_from:
        query = query.filter(Attendance.date >= date_from)
    if date_to:
        query = query.filter(Attendance.date <= date_to)
    if status:
        query = query.filter(Attendance.status == status)
    if search:
        like = f"%{search}%"
        query = query.filter(Attendance.employee.has(Employee.name.ilike(like)))
    total = query.count()
    items = query.options(joinedload(Attendance.employee)).order_by(Attendance.date.desc(), Attendance.id.desc()).offset((page - 1) * limit).limit(limit).all()
    return items, total


def get_attendance(db: Session, attendance_id: int) -> Attendance:
    row = db.get(Attendance, attendance_id)
    if not row:
        raise NotFoundError("Attendance record not found")
    return row


def create_attendance(db: Session, payload) -> Attendance:
    employee = db.get(Employee, payload.employee_id)
    if not employee:
        raise NotFoundError("Employee not found")
    row = Attendance(
        employee_id=payload.employee_id,
        date=payload.date,
        check_in=payload.check_in,
        check_out=payload.check_out,
    )
    snapshot_break(db, row)
    _apply_recompute(row)
    db.add(row)
    db.flush()
    return row


def update_attendance(db: Session, attendance_id: int, payload) -> Attendance:
    row = get_attendance(db, attendance_id)
    data = payload.model_dump(exclude_unset=True)
    if 'break_hours' in data:
        if data['break_hours'] is None or not (data.get('correction_reason') or '').strip():
            raise ValidationAppError('A break correction requires a duration and a reason')
        row.break_source = 'HR correction'
    for field, value in data.items():
        setattr(row, field, value)
    row.is_manual_correction = True
    _apply_recompute(row)
    db.flush()
    return row


def check_in(db: Session, employee_id: int, latitude=None, longitude=None) -> Attendance:
    # serialize check-in/out per employee, including first check-in.
    db.query(Employee).filter(Employee.id == employee_id).with_for_update().first()
    open_shift = db.query(Attendance).filter(Attendance.employee_id == employee_id, Attendance.check_in.isnot(None), Attendance.check_out.is_(None)).with_for_update().populate_existing().first()
    if open_shift:
        raise ValidationAppError("You are already checked in. Check out of your open shift first.")
    today = business_time(utc_now()).date()
    existing = db.query(Attendance).filter(Attendance.employee_id == employee_id, Attendance.date == today).with_for_update().populate_existing().first()
    if existing and existing.check_in:
        raise ValidationAppError("You have already checked in today")
    now = utc_now().replace(tzinfo=None)
    if existing:
        existing.check_in = now
        row = existing
    else:
        row = Attendance(employee_id=employee_id, date=today, check_in=now)
        db.add(row)
    snapshot_break(db, row)
    # Attendance Geofence
    from app.schemas.attendance import CheckInRequest
    coordinates = CheckInRequest(latitude=latitude, longitude=longitude)
    row.latitude, row.longitude = coordinates.latitude, coordinates.longitude
    row.location_tag = location_tag(latitude, longitude) if latitude is not None else None
    _apply_recompute(row)
    db.flush()
    return row


def check_out(db: Session, employee_id: int) -> Attendance:
    # serialize check-in/out per employee, including first check-in.
    db.query(Employee).filter(Employee.id == employee_id).with_for_update().first()
    today = business_time(utc_now()).date()
    existing = db.query(Attendance).filter(Attendance.employee_id == employee_id, Attendance.check_in.isnot(None), Attendance.check_out.is_(None)).order_by(Attendance.check_in.desc()).with_for_update().populate_existing().first()
    if existing is None:
        existing = db.query(Attendance).filter(Attendance.employee_id == employee_id, Attendance.date == today).with_for_update().populate_existing().first()
    if not existing or not existing.check_in:
        raise ValidationAppError("You must check in before checking out")
    if existing.check_out:
        raise ValidationAppError("You have already checked out today")
    existing.check_out = utc_now().replace(tzinfo=None)
    _apply_recompute(existing)
    db.flush()
    return existing
