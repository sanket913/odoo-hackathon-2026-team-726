import datetime
from decimal import Decimal
import pytest

from app.models.employee import Employee
from app.services import contract_service
from app.schemas.contract import ContractCreate, ContractUpdate
from app.core.exceptions import ConflictError


def _make_employee(db, code="EMP-CS1"):
    emp = Employee(employee_code=code, name="Overlap Test", email=f"{code.lower()}@example.com")
    db.add(emp)
    db.commit()
    db.refresh(emp)
    return emp


def test_create_contract_rejects_overlap(db):
    emp = _make_employee(db, "EMP-CS1")
    payload1 = ContractCreate(employee_id=emp.id, reference="C1", start_date=datetime.date(2025, 1, 1),
                               end_date=None, wage=Decimal("30000.00"), status="Active")
    contract_service.create_contract(db, payload1)
    db.commit()

    payload2 = ContractCreate(employee_id=emp.id, reference="C2", start_date=datetime.date(2025, 6, 1),
                               end_date=None, wage=Decimal("35000.00"), status="Active")
    with pytest.raises(ConflictError):
        contract_service.create_contract(db, payload2)


def test_create_contract_allows_sequential_non_overlapping(db):
    emp = _make_employee(db, "EMP-CS2")
    payload1 = ContractCreate(employee_id=emp.id, reference="C1", start_date=datetime.date(2025, 1, 1),
                               end_date=datetime.date(2025, 5, 31), wage=Decimal("30000.00"), status="Active")
    c1 = contract_service.create_contract(db, payload1)
    db.commit()

    payload2 = ContractCreate(employee_id=emp.id, reference="C2", start_date=datetime.date(2025, 6, 1),
                               end_date=None, wage=Decimal("35000.00"), status="Active")
    c2 = contract_service.create_contract(db, payload2)
    db.commit()
    assert c1.id != c2.id


def test_update_contract_rejects_new_overlap(db):
    emp = _make_employee(db, "EMP-CS3")
    c1 = contract_service.create_contract(db, ContractCreate(
        employee_id=emp.id, reference="C1", start_date=datetime.date(2025, 1, 1),
        end_date=datetime.date(2025, 5, 31), wage=Decimal("30000.00"), status="Active"))
    db.commit()
    c2 = contract_service.create_contract(db, ContractCreate(
        employee_id=emp.id, reference="C2", start_date=datetime.date(2025, 6, 1),
        end_date=None, wage=Decimal("35000.00"), status="Active"))
    db.commit()

    with pytest.raises(ConflictError):
        contract_service.update_contract(db, c1.id, ContractUpdate(end_date=datetime.date(2025, 7, 1)))
