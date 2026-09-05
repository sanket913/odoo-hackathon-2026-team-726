import datetime
from decimal import Decimal

from app.models.employee import Employee
from app.models.contract import Contract, ContractStatus
from app.models.salary import SalaryStructure, SalaryRule, RuleCategory, ComputationType
from app.models.payroll import Payrun, Payslip, PayrunStatus, PayslipStatus
from app.engines.payroll_engine import compute_payslip


def _setup_structure(db, code="REG-TEST"):
    structure = SalaryStructure(name="Regular", code=code)
    db.add(structure)
    db.flush()
    rules = [
        SalaryRule(structure_id=structure.id, name="Basic", code="BASIC", category=RuleCategory.BASIC,
                   sequence=10, computation_type=ComputationType.FIXED, fixed_amount=Decimal("0.00")),
        SalaryRule(structure_id=structure.id, name="HRA", code="HRA", category=RuleCategory.ALLOWANCE,
                   sequence=20, computation_type=ComputationType.PERCENTAGE, percentage=Decimal("40.000"), base_rule_code="BASIC"),
        SalaryRule(structure_id=structure.id, name="Conveyance", code="CONV", category=RuleCategory.ALLOWANCE,
                   sequence=30, computation_type=ComputationType.FIXED, fixed_amount=Decimal("1600.00")),
        SalaryRule(structure_id=structure.id, name="Gross", code="GROSS", category=RuleCategory.GROSS,
                   sequence=40, computation_type=ComputationType.FORMULA, formula_text="BASIC + HRA + CONV"),
        SalaryRule(structure_id=structure.id, name="PF", code="PF", category=RuleCategory.DEDUCTION,
                   sequence=50, computation_type=ComputationType.PERCENTAGE, percentage=Decimal("12.000"), base_rule_code="BASIC"),
        SalaryRule(structure_id=structure.id, name="Net", code="NET", category=RuleCategory.NET,
                   sequence=60, computation_type=ComputationType.FORMULA, formula_text="GROSS - PF"),
    ]
    db.add_all(rules)
    db.commit()
    return structure


def _setup_employee_with_contract(db, structure, wage=Decimal("20000.00"), code="EMP-PE1"):
    emp = Employee(employee_code=code, name="Payroll Test", email=f"{code.lower()}@example.com", bank_account="ACC123")
    db.add(emp)
    db.flush()
    contract = Contract(employee_id=emp.id, reference=f"CTR-{code}", start_date=datetime.date(2026, 1, 1),
                         end_date=None, wage=wage, salary_structure_id=structure.id, status=ContractStatus.ACTIVE)
    db.add(contract)
    db.commit()
    return emp, contract


def test_fixed_percentage_and_formula_rules_compute_correctly(db):
    structure = _setup_structure(db)
    emp, contract = _setup_employee_with_contract(db, structure, wage=Decimal("20000.00"), code="EMP-PE1")

    payrun = Payrun(name="Test Run", salary_structure_id=structure.id, period_start=datetime.date(2026, 9, 1),
                     period_end=datetime.date(2026, 9, 30), status=PayrunStatus.DRAFT)
    db.add(payrun)
    db.flush()
    payslip = Payslip(payrun_id=payrun.id, employee_id=emp.id, period_start=payrun.period_start,
                       period_end=payrun.period_end, status=PayslipStatus.DRAFT)
    db.add(payslip)
    db.commit()

    compute_payslip(db, payslip)
    db.commit()

    lines = {l.code: l.amount for l in payslip.lines}
    assert lines["BASIC"] == Decimal("20000.00")
    assert lines["HRA"] == Decimal("8000.00")       # 40% of 20000
    assert lines["CONV"] == Decimal("1600.00")
    assert lines["GROSS"] == Decimal("29600.00")    # 20000 + 8000 + 1600
    assert lines["PF"] == Decimal("2400.00")        # 12% of 20000
    assert lines["NET"] == Decimal("27200.00")      # 29600 - 2400
    assert payslip.basic_amount == Decimal("20000.00")
    assert payslip.gross_amount == Decimal("29600.00")
    assert payslip.net_amount == Decimal("27200.00")
    assert payslip.status == PayslipStatus.COMPUTED


def test_missing_contract_produces_blocking_warning(db):
    structure = _setup_structure(db, code="REG-TEST-2")
    emp = Employee(employee_code="EMP-PE2", name="No Contract", email="nocontract@example.com")
    db.add(emp)
    db.commit()

    payrun = Payrun(name="Test Run 2", salary_structure_id=structure.id, period_start=datetime.date(2026, 9, 1),
                     period_end=datetime.date(2026, 9, 30), status=PayrunStatus.DRAFT)
    db.add(payrun)
    db.flush()
    payslip = Payslip(payrun_id=payrun.id, employee_id=emp.id, period_start=payrun.period_start,
                       period_end=payrun.period_end, status=PayslipStatus.DRAFT)
    db.add(payslip)
    db.commit()

    compute_payslip(db, payslip)
    db.commit()

    codes = [w["code"] for w in payslip.warning_messages]
    assert "NO_VALID_CONTRACT" in codes
    severities = {w["code"]: w["severity"] for w in payslip.warning_messages}
    assert severities["NO_VALID_CONTRACT"] == "blocking"


def test_missing_bank_details_is_non_blocking_warning(db):
    structure = _setup_structure(db, code="REG-TEST-3")
    emp = Employee(employee_code="EMP-PE3", name="No Bank", email="nobank@example.com", bank_account=None)
    db.add(emp)
    db.flush()
    contract = Contract(employee_id=emp.id, reference="CTR-PE3", start_date=datetime.date(2026, 1, 1),
                         end_date=None, wage=Decimal("15000.00"), salary_structure_id=structure.id,
                         status=ContractStatus.ACTIVE)
    db.add(contract)
    db.commit()

    payrun = Payrun(name="Test Run 3", salary_structure_id=structure.id, period_start=datetime.date(2026, 9, 1),
                     period_end=datetime.date(2026, 9, 30), status=PayrunStatus.DRAFT)
    db.add(payrun)
    db.flush()
    payslip = Payslip(payrun_id=payrun.id, employee_id=emp.id, period_start=payrun.period_start,
                       period_end=payrun.period_end, status=PayslipStatus.DRAFT)
    db.add(payslip)
    db.commit()

    compute_payslip(db, payslip)
    db.commit()
    warning = next(w for w in payslip.warning_messages if w["code"] == "MISSING_BANK_DETAILS")
    assert warning["severity"] == "non-blocking"
