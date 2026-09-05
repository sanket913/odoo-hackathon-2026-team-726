import datetime
from decimal import Decimal
import pytest

from app.models.employee import Employee
from app.models.time_off import TimeOffType, TimeOffUnit
from app.services import timeoff_service
from app.schemas.time_off import AllocationCreate, RequestCreate
from app.core.exceptions import ConflictError


def _setup(db, code="EMP-TO1"):
    emp = Employee(employee_code=code, name="Leave Test", email=f"{code.lower()}@example.com")
    db.add(emp)
    db.flush()
    leave_type = db.query(TimeOffType).filter(TimeOffType.code == "PAID-TEST").first()
    if not leave_type:
        leave_type = TimeOffType(name="Paid Test Leave", code="PAID-TEST", unit=TimeOffUnit.DAYS,
                                  requires_allocation=True, approval_required=True)
        db.add(leave_type)
        db.flush()
    db.commit()
    return emp, leave_type


def test_approval_consumes_allocation_atomically(db):
    emp, leave_type = _setup(db, "EMP-TO1")
    allocation = timeoff_service.create_allocation(db, AllocationCreate(
        employee_id=emp.id, time_off_type_id=leave_type.id, name="Grant", allocated=Decimal("10.00"),
        valid_from=datetime.date(2026, 1, 1), valid_to=datetime.date(2026, 12, 31)))
    db.commit()
    timeoff_service.approve_allocation(db, allocation.id, actor_user_id=None)
    db.commit()

    request = timeoff_service.create_request(db, RequestCreate(
        employee_id=emp.id, time_off_type_id=leave_type.id,
        from_date=datetime.date(2026, 6, 1), to_date=datetime.date(2026, 6, 3), reason="Trip"))
    db.commit()

    approved = timeoff_service.approve_request(db, request.id, actor_user_id=None, hr_comment="ok")
    db.commit()

    db.refresh(allocation)
    assert approved.status.value == "Approved"
    assert allocation.taken == Decimal("3.00")
    assert allocation.remaining == Decimal("7.00")


def test_double_approval_is_rejected_and_does_not_double_consume(db):
    emp, leave_type = _setup(db, "EMP-TO2")
    allocation = timeoff_service.create_allocation(db, AllocationCreate(
        employee_id=emp.id, time_off_type_id=leave_type.id, name="Grant", allocated=Decimal("10.00"),
        valid_from=datetime.date(2026, 1, 1), valid_to=datetime.date(2026, 12, 31)))
    db.commit()
    timeoff_service.approve_allocation(db, allocation.id, actor_user_id=None)
    db.commit()

    request = timeoff_service.create_request(db, RequestCreate(
        employee_id=emp.id, time_off_type_id=leave_type.id,
        from_date=datetime.date(2026, 6, 1), to_date=datetime.date(2026, 6, 2), reason="Trip"))
    db.commit()

    timeoff_service.approve_request(db, request.id, actor_user_id=None, hr_comment="ok")
    db.commit()

    with pytest.raises(ConflictError):
        timeoff_service.approve_request(db, request.id, actor_user_id=None, hr_comment="ok again")
    db.rollback()

    db.refresh(allocation)
    # Balance must reflect exactly ONE consumption (2 days), not two.
    assert allocation.taken == Decimal("2.00")


def test_approval_fails_when_balance_insufficient(db):
    emp, leave_type = _setup(db, "EMP-TO3")
    allocation = timeoff_service.create_allocation(db, AllocationCreate(
        employee_id=emp.id, time_off_type_id=leave_type.id, name="Small Grant", allocated=Decimal("1.00"),
        valid_from=datetime.date(2026, 1, 1), valid_to=datetime.date(2026, 12, 31)))
    db.commit()
    timeoff_service.approve_allocation(db, allocation.id, actor_user_id=None)
    db.commit()

    request = timeoff_service.create_request(db, RequestCreate(
        employee_id=emp.id, time_off_type_id=leave_type.id,
        from_date=datetime.date(2026, 6, 1), to_date=datetime.date(2026, 6, 1), reason="Trip"))
    # UNIQUE FEATURE - balance can change after submission; approval rechecks it.
    allocation.taken = Decimal("1.00")
    db.commit()

    with pytest.raises(ConflictError):
        timeoff_service.approve_request(db, request.id, actor_user_id=None, hr_comment=None)
    db.rollback()
