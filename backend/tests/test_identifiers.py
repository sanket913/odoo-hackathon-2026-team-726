import datetime
from decimal import Decimal
import pytest
from app.models.employee import Employee
from app.models.contract import Contract
from app.schemas.contract import ContractCreate, ContractUpdate
from app.services.contract_service import create_contract, update_contract
from app.services.employee_service import _next_employee_code
from app.core.exceptions import ConflictError


def test_generated_contract_references_are_unique_and_immutable(db):
    emp = Employee(employee_code="ID-TEST", name="Identifiers", email="identifiers@example.com")
    db.add(emp)
    db.flush()
    payload = ContractCreate(employee_id=emp.id, reference="STATIC", start_date=datetime.date(2031, 1, 1), wage=Decimal("1000"), status="Draft")
    one, two = create_contract(db, payload), create_contract(db, payload)
    assert one.reference.startswith("CTR-2031-")
    assert one.reference != two.reference
    original = one.reference
    update_contract(db, one.id, ContractUpdate(wage=Decimal("1200")))
    assert one.reference == original
    with pytest.raises(ConflictError):
        update_contract(db, one.id, ContractUpdate(reference="CHANGE"))


def test_employee_counter_skips_existing_and_does_not_reuse_deleted_numbers(db):
    first = _next_employee_code(db)
    emp = Employee(employee_code=first, name="Numbering", email="numbering@example.com")
    db.add(emp)
    db.flush()
    second = _next_employee_code(db)
    db.delete(emp)
    db.flush()
    third = _next_employee_code(db)
    assert len({first, second, third}) == 3
