import datetime
from decimal import Decimal
import pytest

from app.models.employee import Employee
from app.models.contract import Contract, ContractStatus
from app.models.salary import SalaryStructure, SalaryRule, RuleCategory, ComputationType
from app.services import payroll_service
from app.schemas.payroll import PayrunCreateRequest
from app.core.exceptions import InvalidStateTransitionError, ValidationAppError, ConflictError


def _setup_structure_and_employee(db, code="EMP-PS1"):
    structure = SalaryStructure(name="Simple", code=f"SIMPLE-{code}")
    db.add(structure)
    db.flush()
    db.add_all([
        SalaryRule(structure_id=structure.id, name="Basic", code="BASIC", category=RuleCategory.BASIC,
                   sequence=10, computation_type=ComputationType.FIXED, fixed_amount=Decimal("0.00")),
        SalaryRule(structure_id=structure.id, name="Gross", code="GROSS", category=RuleCategory.GROSS,
                   sequence=20, computation_type=ComputationType.FORMULA, formula_text="BASIC"),
        SalaryRule(structure_id=structure.id, name="Net", code="NET", category=RuleCategory.NET,
                   sequence=30, computation_type=ComputationType.FORMULA, formula_text="GROSS"),
    ])
    emp = Employee(employee_code=code, name="Payrun Test", email=f"{code.lower()}@example.com", bank_account="ACC1")
    db.add(emp)
    db.flush()
    db.add(Contract(employee_id=emp.id, reference=f"CTR-{code}", start_date=datetime.date(2026, 1, 1),
                     end_date=None, wage=Decimal("10000.00"), salary_structure_id=structure.id,
                     status=ContractStatus.ACTIVE))
    db.commit()
    return structure, emp


def test_cannot_validate_before_compute(db):
    structure, emp = _setup_structure_and_employee(db, "EMP-PS1")
    payrun = payroll_service.create_payrun(db, PayrunCreateRequest(
        salary_structure_id=structure.id, period_start=datetime.date(2026, 9, 1),
        period_end=datetime.date(2026, 9, 30), employee_ids=[emp.id]), actor_user_id=None)
    db.commit()

    with pytest.raises(InvalidStateTransitionError):
        payroll_service.validate_payrun(db, payrun.id, actor_user_id=None)


def test_cannot_mark_paid_before_validate(db):
    structure, emp = _setup_structure_and_employee(db, "EMP-PS2")
    payrun = payroll_service.create_payrun(db, PayrunCreateRequest(
        salary_structure_id=structure.id, period_start=datetime.date(2026, 9, 1),
        period_end=datetime.date(2026, 9, 30), employee_ids=[emp.id]), actor_user_id=None)
    db.commit()
    payroll_service.compute_payrun(db, payrun.id, actor_user_id=None)
    db.commit()

    with pytest.raises(InvalidStateTransitionError):
        payroll_service.mark_paid(db, payrun.id, actor_user_id=None)


def test_full_lifecycle_and_no_skipping(db):
    structure, emp = _setup_structure_and_employee(db, "EMP-PS3")
    payrun = payroll_service.create_payrun(db, PayrunCreateRequest(
        salary_structure_id=structure.id, period_start=datetime.date(2026, 9, 1),
        period_end=datetime.date(2026, 9, 30), employee_ids=[emp.id]), actor_user_id=None)
    db.commit()

    payroll_service.compute_payrun(db, payrun.id, actor_user_id=None)
    db.commit()
    payroll_service.validate_payrun(db, payrun.id, actor_user_id=None)
    db.commit()
    payroll_service.mark_paid(db, payrun.id, actor_user_id=None)
    db.commit()

    # Repeat payment is idempotent and creates no legacy delivery jobs.
    assert payroll_service.mark_paid(db, payrun.id, actor_user_id=None).status.value == "Paid"
    from app.models.notification import NotificationLog
    assert db.query(NotificationLog).filter(NotificationLog.payslip_id == payrun.payslips[0].id).count() == 0


def test_duplicate_payslip_prevented_on_payrun_creation(db):
    structure, emp = _setup_structure_and_employee(db, "EMP-PS4")
    payrun1 = payroll_service.create_payrun(db, PayrunCreateRequest(
        salary_structure_id=structure.id, period_start=datetime.date(2026, 9, 1),
        period_end=datetime.date(2026, 9, 30), employee_ids=[emp.id]), actor_user_id=None)
    db.commit()
    assert payrun1.total_employees == 1

    # UNIQUE FEATURE - reject duplicates explicitly; do not create empty payruns.
    with pytest.raises(ConflictError, match="Payslip already exists"):
        payroll_service.create_payrun(db, PayrunCreateRequest(
            salary_structure_id=structure.id, period_start=datetime.date(2026, 9, 1),
            period_end=datetime.date(2026, 9, 30), employee_ids=[emp.id]), actor_user_id=None)
    db.rollback()


def test_validate_requires_all_payslips_computed(db):
    structure, emp = _setup_structure_and_employee(db, "EMP-PS5")
    payrun = payroll_service.create_payrun(db, PayrunCreateRequest(
        salary_structure_id=structure.id, period_start=datetime.date(2026, 9, 1),
        period_end=datetime.date(2026, 9, 30), employee_ids=[emp.id]), actor_user_id=None)
    db.commit()

    with pytest.raises(InvalidStateTransitionError):
        # Draft -> Validated is not an allowed transition at all
        payroll_service.validate_payrun(db, payrun.id, actor_user_id=None)
