from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, func

from app.models.employee import Employee
from app.models.auth import User, Role
from app.models.contract import Contract
from app.models.attendance import Attendance
from app.models.time_off import TimeOffRequest, TimeOffAllocation
from app.core.security import hash_password
from app.core.exceptions import NotFoundError, ValidationAppError


def _next_employee_code(db: Session) -> str:
    count = db.query(Employee).count()
    return f"EMP-{count + 1:04d}"


def to_out_dict(db: Session, emp: Employee) -> dict:
    counts = getattr(emp, "_list_counts", {})
    return {
        "id": emp.id,
        "employee_code": emp.employee_code,
        "name": emp.name,
        "email": emp.email,
        "phone": emp.phone,
        "department_id": emp.department_id,
        "department_name": emp.department.name if emp.department else None,
        "job_position_id": emp.job_position_id,
        "job_position_name": emp.job_position.name if emp.job_position else None,
        "manager_id": emp.manager_id,
        "manager_name": emp.manager.name if emp.manager else None,
        "employee_type_id": emp.employee_type_id,
        "employee_type_name": emp.employee_type.name if emp.employee_type else None,
        "working_schedule_id": emp.working_schedule_id,
        "working_schedule_name": emp.working_schedule.name if emp.working_schedule else None,
        "active": emp.active,
        "bank_account": emp.bank_account,
        "user_id": emp.user_id,
        "contracts_count": counts["contracts"] if "contracts" in counts else db.query(Contract).filter(Contract.employee_id == emp.id).count(),
        "attendance_count": counts["attendance"] if "attendance" in counts else db.query(Attendance).filter(Attendance.employee_id == emp.id).count(),
        "time_off_count": counts["time_off"] if "time_off" in counts else db.query(TimeOffRequest).filter(TimeOffRequest.employee_id == emp.id).count(),
        "allocations_count": counts["allocations"] if "allocations" in counts else db.query(TimeOffAllocation).filter(TimeOffAllocation.employee_id == emp.id).count(),
    }


def list_employees(db: Session, search: str | None, department_id: int | None, active: bool | None,
                    page: int, limit: int, employee_type_id=None):
    query = db.query(Employee)
    if search:
        like = f"%{search}%"
        query = query.filter(or_(Employee.name.ilike(like), Employee.email.ilike(like), Employee.employee_code.ilike(like)))
    if department_id:
        query = query.filter(Employee.department_id == department_id)
    if active is not None:
        query = query.filter(Employee.active == active)
    if employee_type_id:
        query = query.filter(Employee.employee_type_id == employee_type_id)
    total = query.count()
    items = query.options(*[joinedload(getattr(Employee, field)) for field in ("department", "job_position", "manager", "employee_type", "working_schedule")]).order_by(Employee.name, Employee.id).offset((page - 1) * limit).limit(limit).all()
    ids = [emp.id for emp in items]
    summary = {}
    for name, model in [('contracts', Contract), ('attendance', Attendance), ('time_off', TimeOffRequest), ('allocations', TimeOffAllocation)]:
        summary[name] = dict(db.query(model.employee_id, func.count(model.id)).filter(model.employee_id.in_(ids)).group_by(model.employee_id).all()) if ids else {}
    for emp in items:
        emp._list_counts = {name: values.get(emp.id, 0) for name, values in summary.items()}
    return items, total


def get_employee(db: Session, employee_id: int) -> Employee:
    emp = db.get(Employee, employee_id)
    if not emp:
        raise NotFoundError("Employee not found")
    return emp


def create_employee(db: Session, payload) -> Employee:
    existing = db.query(Employee).filter(Employee.email == payload.email.lower()).first()
    if existing:
        raise ValidationAppError("An employee with this email already exists", fields={"email": "already exists"})

    user = None
    if payload.create_login:
        if not payload.login_password:
            raise ValidationAppError("login_password is required when create_login is true")
        existing_user = db.query(User).filter(User.email == payload.email.lower()).first()
        if existing_user:
            raise ValidationAppError("A user account with this email already exists")
        roles = db.query(Role).filter(Role.name.in_(payload.role_names or ["Employee"])).all()
        user = User(
            email=payload.email.lower(),
            hashed_password=hash_password(payload.login_password),
            full_name=payload.name,
            roles=roles,
        )
        db.add(user)
        db.flush()

    emp = Employee(
        employee_code=_next_employee_code(db),
        name=payload.name,
        email=payload.email.lower(),
        phone=payload.phone,
        department_id=payload.department_id,
        job_position_id=payload.job_position_id,
        manager_id=payload.manager_id,
        employee_type_id=payload.employee_type_id,
        working_schedule_id=payload.working_schedule_id,
        bank_account=payload.bank_account,
        user_id=user.id if user else None,
    )
    db.add(emp)
    db.flush()
    return emp


def update_employee(db: Session, employee_id: int, payload, actor_user_id: int) -> Employee:
    # Employee Audit Trail
    from app.models.audit import EmployeeAuditLog
    from app.schemas.employee import EmployeeUpdate
    import json
    emp = db.query(Employee).filter(Employee.id == employee_id).with_for_update().first()
    if not emp:
        raise NotFoundError("Employee not found")
    data = payload.model_dump(exclude_unset=True)
    def text(value):
        if value is None:
            return None
        if hasattr(value, "value"):
            value = value.value
        if hasattr(value, "isoformat"):
            return value.isoformat()
        return json.dumps(value) if isinstance(value, bool) else str(value)
    for field, value in data.items():
        # Explicit allowlist excludes all credentials, including future payload extensions.
        if field not in EmployeeUpdate.model_fields:
            continue
        if field == "email" and value:
            value = value.strip().lower()
        old = getattr(emp, field)
        if text(old) != text(value):
            db.add(EmployeeAuditLog(employee_id=emp.id, changed_by=actor_user_id,
                field_name=field, old_value=text(old), new_value=text(value)))
            setattr(emp, field, value)
    db.flush()
    return emp


def archive_employee(db: Session, employee_id: int) -> Employee:
    emp = get_employee(db, employee_id)
    emp.active = False
    db.flush()
    return emp
