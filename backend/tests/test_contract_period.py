import datetime
from decimal import Decimal
import pytest

from app.models.employee import Employee
from app.models.contract import Contract, ContractStatus
from app.repositories.contract_repository import get_applicable_contract, find_overlapping_active_contracts
from app.core.exceptions import ConflictError


def _make_employee(db, code="EMP-T1"):
    emp = Employee(employee_code=code, name="Test Employee", email=f"{code.lower()}@example.com")
    db.add(emp)
    db.commit()
    db.refresh(emp)
    return emp


def test_get_applicable_contract_resolves_correct_period(db):
    emp = _make_employee(db, "EMP-CP1")
    old = Contract(employee_id=emp.id, reference="C1", start_date=datetime.date(2025, 1, 1),
                    end_date=datetime.date(2025, 6, 30), wage=Decimal("30000.00"), status=ContractStatus.EXPIRED)
    new = Contract(employee_id=emp.id, reference="C2", start_date=datetime.date(2025, 7, 1),
                    end_date=None, wage=Decimal("40000.00"), status=ContractStatus.ACTIVE)
    db.add_all([old, new])
    db.commit()

    resolved = get_applicable_contract(db, emp.id, datetime.date(2025, 9, 1), datetime.date(2025, 9, 30))
    assert resolved is not None
    assert resolved.id == new.id
    assert resolved.wage == Decimal("40000.00")


def test_get_applicable_contract_returns_none_when_no_coverage(db):
    emp = _make_employee(db, "EMP-CP2")
    db.commit()
    resolved = get_applicable_contract(db, emp.id, datetime.date(2025, 9, 1), datetime.date(2025, 9, 30))
    assert resolved is None


def test_overlapping_active_contracts_is_blocking_conflict(db):
    emp = _make_employee(db, "EMP-CP3")
    c1 = Contract(employee_id=emp.id, reference="C1", start_date=datetime.date(2025, 1, 1),
                   end_date=None, wage=Decimal("30000.00"), status=ContractStatus.ACTIVE)
    db.add(c1)
    db.commit()

    # Simulate a data-integrity bug: force a second overlapping ACTIVE contract directly
    # (bypassing the service-layer overlap guard) to prove the repository detects it.
    c2 = Contract(employee_id=emp.id, reference="C2", start_date=datetime.date(2025, 6, 1),
                   end_date=None, wage=Decimal("35000.00"), status=ContractStatus.ACTIVE)
    db.add(c2)
    db.commit()

    with pytest.raises(ConflictError):
        get_applicable_contract(db, emp.id, datetime.date(2025, 9, 1), datetime.date(2025, 9, 30))


def test_find_overlapping_active_contracts_detects_overlap(db):
    emp = _make_employee(db, "EMP-CP4")
    c1 = Contract(employee_id=emp.id, reference="C1", start_date=datetime.date(2025, 1, 1),
                   end_date=datetime.date(2025, 12, 31), wage=Decimal("30000.00"), status=ContractStatus.ACTIVE)
    db.add(c1)
    db.commit()

    overlap = find_overlapping_active_contracts(db, emp.id, datetime.date(2025, 6, 1), None)
    assert len(overlap) == 1

    no_overlap = find_overlapping_active_contracts(db, emp.id, datetime.date(2026, 1, 1), None)
    assert len(no_overlap) == 0
