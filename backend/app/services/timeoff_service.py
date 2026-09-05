import datetime
from decimal import Decimal
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_

from app.models.time_off import (
    TimeOffType, TimeOffAllocation, TimeOffRequest, AllocationStatus, RequestStatus,
)
from app.models.employee import Employee
from app.core.exceptions import NotFoundError, ValidationAppError, ConflictError
from app.services.audit_service import write_audit
from app.services.notification_service import notify


# ---------------- Time Off Types ----------------

def to_type_dict(t: TimeOffType) -> dict:
    return {
        "id": t.id, "name": t.name, "code": t.code,
        "unit": t.unit.value if hasattr(t.unit, "value") else t.unit,
        "requires_allocation": t.requires_allocation,
        "approval_required": t.approval_required,
        "deduct_from_payroll": t.deduct_from_payroll,
        "allow_negative": t.allow_negative,
        "active": t.active,
    }


def list_types(db: Session, active: bool | None):
    query = db.query(TimeOffType)
    if active is not None:
        query = query.filter(TimeOffType.active == active)
    return query.order_by(TimeOffType.name).all()


def create_type(db: Session, payload) -> TimeOffType:
    existing = db.query(TimeOffType).filter(TimeOffType.code == payload.code).first()
    if existing:
        raise ValidationAppError("A time off type with this code already exists")
    t = TimeOffType(**payload.model_dump())
    db.add(t)
    db.flush()
    return t


def update_type(db: Session, type_id: int, payload) -> TimeOffType:
    t = db.get(TimeOffType, type_id)
    if not t:
        raise NotFoundError("Time off type not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(t, field, value)
    db.flush()
    return t


# ---------------- Allocations ----------------

def to_allocation_dict(a: TimeOffAllocation) -> dict:
    return {
        "id": a.id,
        "employee_id": a.employee_id,
        "employee_name": a.employee.name if a.employee else None,
        "time_off_type_id": a.time_off_type_id,
        "time_off_type_name": a.time_off_type.name if a.time_off_type else None,
        "name": a.name,
        "allocated": a.allocated,
        "taken": a.taken,
        "remaining": a.remaining,
        "valid_from": a.valid_from,
        "valid_to": a.valid_to,
        "status": a.status.value if hasattr(a.status, "value") else a.status,
    }


def list_allocations(db: Session, employee_id: int | None, status: str | None, page=1, limit=20, search=None, date_from=None, date_to=None):
    query = db.query(TimeOffAllocation)
    if employee_id:
        query = query.filter(TimeOffAllocation.employee_id == employee_id)
    if status:
        query = query.filter(TimeOffAllocation.status == status)
    if search:
        query = query.join(Employee).join(TimeOffType).filter(or_(Employee.name.ilike(f"%{search}%"), TimeOffType.name.ilike(f"%{search}%"), TimeOffAllocation.name.ilike(f"%{search}%")))
    if date_from:
        query = query.filter(TimeOffAllocation.valid_to >= date_from)
    if date_to:
        query = query.filter(TimeOffAllocation.valid_from <= date_to)
    total = query.count()
    rows = query.options(joinedload(TimeOffAllocation.employee), joinedload(TimeOffAllocation.time_off_type)).order_by(TimeOffAllocation.valid_from.desc(), TimeOffAllocation.id.desc()).offset((page-1)*limit).limit(limit).all()
    return rows, total


def create_allocation(db: Session, payload) -> TimeOffAllocation:
    employee = db.get(Employee, payload.employee_id)
    if not employee:
        raise NotFoundError("Employee not found")
    allocation = TimeOffAllocation(
        employee_id=payload.employee_id,
        time_off_type_id=payload.time_off_type_id,
        name=payload.name or "",
        allocated=payload.allocated,
        taken=Decimal("0.00"),
        valid_from=payload.valid_from,
        valid_to=payload.valid_to,
        status=AllocationStatus.DRAFT,
    )
    db.add(allocation)
    db.flush()
    return allocation


def approve_allocation(db: Session, allocation_id: int, actor_user_id: int | None) -> TimeOffAllocation:
    allocation = db.query(TimeOffAllocation).filter(TimeOffAllocation.id == allocation_id).with_for_update().first()
    if not allocation:
        raise NotFoundError("Allocation not found")
    if allocation.status != AllocationStatus.DRAFT:
        raise ConflictError("Only draft allocations can be approved")
    allocation.status = AllocationStatus.APPROVED
    write_audit(db, actor_user_id, "TimeOffAllocation", allocation.id, "APPROVE",
                after={"status": "Approved"})
    db.flush()
    return allocation


def refuse_allocation(db: Session, allocation_id: int, actor_user_id: int | None) -> TimeOffAllocation:
    allocation = db.query(TimeOffAllocation).filter(TimeOffAllocation.id == allocation_id).with_for_update().first()
    if not allocation:
        raise NotFoundError("Allocation not found")
    if allocation.status != AllocationStatus.DRAFT:
        raise ConflictError("Only draft allocations can be refused")
    allocation.status = AllocationStatus.REFUSED
    write_audit(db, actor_user_id, "TimeOffAllocation", allocation.id, "REFUSE",
                after={"status": "Refused"})
    db.flush()
    return allocation


# ---------------- Requests ----------------

def to_request_dict(r: TimeOffRequest) -> dict:
    return {
        "id": r.id,
        "employee_id": r.employee_id,
        "employee_name": r.employee.name if r.employee else None,
        "time_off_type_id": r.time_off_type_id,
        "time_off_type_name": r.time_off_type.name if r.time_off_type else None,
        "from_date": r.from_date,
        "to_date": r.to_date,
        "duration_days": r.duration_days,
        "reason": r.reason,
        "status": r.status.value if hasattr(r.status, "value") else r.status,
        "hr_comment": r.hr_comment,
    }


def list_requests(db: Session, employee_id: int | None, status: str | None, page=1, limit=20, search=None, date_from=None, date_to=None):
    query = db.query(TimeOffRequest)
    if employee_id:
        query = query.filter(TimeOffRequest.employee_id == employee_id)
    if status:
        query = query.filter(TimeOffRequest.status == status)
    if search:
        query = query.join(Employee).join(TimeOffType).filter(or_(Employee.name.ilike(f"%{search}%"), TimeOffType.name.ilike(f"%{search}%"), TimeOffRequest.reason.ilike(f"%{search}%")))
    if date_from:
        query = query.filter(TimeOffRequest.to_date >= date_from)
    if date_to:
        query = query.filter(TimeOffRequest.from_date <= date_to)
    total = query.count()
    rows = query.options(joinedload(TimeOffRequest.employee), joinedload(TimeOffRequest.time_off_type)).order_by(TimeOffRequest.created_at.desc(), TimeOffRequest.id.desc()).offset((page-1)*limit).limit(limit).all()
    return rows, total


def get_request(db: Session, request_id: int) -> TimeOffRequest:
    r = db.get(TimeOffRequest, request_id)
    if not r:
        raise NotFoundError("Time off request not found")
    return r


def create_request(db: Session, payload) -> TimeOffRequest:
    employee = db.get(Employee, payload.employee_id)
    if not employee:
        raise NotFoundError("Employee not found")
    time_off_type = db.get(TimeOffType, payload.time_off_type_id)
    if not time_off_type:
        raise NotFoundError("Time off type not found")
    if payload.to_date < payload.from_date:
        raise ValidationAppError("to_date must be on or after from_date")

    duration = Decimal((payload.to_date - payload.from_date).days + 1)

    # Leave Balance Blocker; remaining = allocated - taken already persists.
    if time_off_type.requires_allocation or not time_off_type.deduct_from_payroll:
        allocation = db.query(TimeOffAllocation).filter(
            TimeOffAllocation.employee_id == payload.employee_id,
            TimeOffAllocation.time_off_type_id == payload.time_off_type_id,
            TimeOffAllocation.status == AllocationStatus.APPROVED,
            TimeOffAllocation.valid_from <= payload.from_date,
            TimeOffAllocation.valid_to >= payload.to_date,
        ).order_by(TimeOffAllocation.id).first()
        remaining = allocation.remaining if allocation else Decimal("0")
        if duration > remaining and (not time_off_type.deduct_from_payroll or not time_off_type.allow_negative):
            raise ValidationAppError(
                f"Insufficient leave balance: {remaining} left, {duration} requested - UNIQUE FEATURE BLOCKER",
                status_code=400,
            )

    request = TimeOffRequest(
        employee_id=payload.employee_id,
        time_off_type_id=payload.time_off_type_id,
        from_date=payload.from_date,
        to_date=payload.to_date,
        duration_days=duration,
        reason=payload.reason,
        status=RequestStatus.TO_APPROVE,
    )
    db.add(request)
    db.flush()

    notify(
        db, employee.user_id, "Time off request submitted",
        f"Your {time_off_type.name} request for {duration} day(s) was submitted and is pending approval.",
        category="timeoff", link=f"/time-off/requests/{request.id}",
    )
    write_audit(db, None, "TimeOffRequest", request.id, "SUBMIT", after=to_request_dict(request))
    return request


def approve_request(db: Session, request_id: int, actor_user_id: int | None, hr_comment: str | None) -> TimeOffRequest:
    # Atomic Leave Approval
    """
    Atomic approval transaction:
      1. Lock & recheck the request is still pending.
      2. Resolve a valid, Approved allocation for the employee/type/period (if required).
      3. Verify sufficient remaining balance; approval cannot overdraw an allocation.
      4. Consume the allocation, approve the request, write audit + notification.
    All within the caller's transaction - any exception rolls the whole thing back.
    """
    request = db.query(TimeOffRequest).filter(TimeOffRequest.id == request_id).with_for_update().first()
    if not request:
        raise NotFoundError("Time off request not found")
    if request.status != RequestStatus.TO_APPROVE:
        raise ConflictError("This request has already been decided (prevents double-approval).")

    time_off_type = db.get(TimeOffType, request.time_off_type_id)
    before = to_request_dict(request)

    allocation = None
    if time_off_type.requires_allocation or not time_off_type.deduct_from_payroll:
        allocation = (
            db.query(TimeOffAllocation)
            .filter(
                TimeOffAllocation.employee_id == request.employee_id,
                TimeOffAllocation.time_off_type_id == request.time_off_type_id,
                TimeOffAllocation.status == AllocationStatus.APPROVED,
                TimeOffAllocation.valid_from <= request.from_date,
                TimeOffAllocation.valid_to >= request.to_date,
            )
            .order_by(TimeOffAllocation.id)
            .with_for_update()
            .first()
        )
        if not allocation:
            raise ConflictError(
                "No approved allocation covers this request's period; cannot approve.",
                code="NO_VALID_ALLOCATION",
            )
        if allocation.remaining < request.duration_days:
            raise ConflictError(
                f"Insufficient balance: {allocation.remaining} remaining, {request.duration_days} requested.",
                code="INSUFFICIENT_BALANCE",
            )
        allocation.taken = (allocation.taken or Decimal("0")) + request.duration_days
        request.allocation_id = allocation.id

    request.status = RequestStatus.APPROVED
    request.hr_comment = hr_comment
    request.decided_by_user_id = actor_user_id
    db.flush()

    write_audit(db, actor_user_id, "TimeOffRequest", request.id, "APPROVE",
                before=before, after=to_request_dict(request))
    employee = db.get(Employee, request.employee_id)
    notify(db, employee.user_id if employee else None, "Time off request approved",
           f"Your {time_off_type.name} request was approved.", category="timeoff",
           link=f"/time-off/requests/{request.id}")
    return request


def refuse_request(db: Session, request_id: int, actor_user_id: int | None, hr_comment: str | None) -> TimeOffRequest:
    request = db.query(TimeOffRequest).filter(TimeOffRequest.id == request_id).with_for_update().first()
    if not request:
        raise NotFoundError("Time off request not found")
    if request.status != RequestStatus.TO_APPROVE:
        raise ConflictError("This request has already been decided.")

    before = to_request_dict(request)
    request.status = RequestStatus.REFUSED
    request.hr_comment = hr_comment
    request.decided_by_user_id = actor_user_id
    db.flush()

    write_audit(db, actor_user_id, "TimeOffRequest", request.id, "REFUSE",
                before=before, after=to_request_dict(request))
    employee = db.get(Employee, request.employee_id)
    time_off_type = db.get(TimeOffType, request.time_off_type_id)
    notify(db, employee.user_id if employee else None, "Time off request refused",
           f"Your {time_off_type.name} request was refused.", category="timeoff",
           link=f"/time-off/requests/{request.id}")
    return request
