"""Shared demo seed helpers and explicit enterprise seed CLI. Run python -m app.seed --help."""
import datetime
from decimal import Decimal

import app.models  # noqa - registers full metadata
from app.db.base import Base
from app.db.session import engine, SessionLocal
from app.core.security import hash_password
from app.core.permissions import ALL_PERMISSIONS, ROLE_PERMISSIONS
from app.models.auth import User, Role, Permission, ROLE_EMPLOYEE, ROLE_HR_MANAGER, ROLE_HR_PAYROLL_USER, \
    ROLE_HR_PAYROLL_MANAGER, ROLE_ADMIN, ALL_ROLES
from app.models.organization import Department, JobPosition, EmployeeType
from app.models.employee import Employee
from app.models.schedule import WorkingSchedule, ScheduleLine, ScheduleType
from app.models.contract import Contract, ContractStatus
from app.models.attendance import Attendance, AttendanceStatus
from app.models.time_off import TimeOffType, TimeOffAllocation, TimeOffRequest, AllocationStatus, RequestStatus, TimeOffUnit
from app.models.salary import SalaryStructure, SalaryRule, RuleCategory, ComputationType
from app.models.payroll import Payrun, Payslip, PayrunStatus, PayslipStatus
from app.engines.payroll_engine import compute_payslip


def seed_rbac(db):
    permissions = {}
    for code, desc in ALL_PERMISSIONS:
        perm = db.query(Permission).filter_by(code=code).first() or Permission(code=code, description=desc)
        db.add(perm)
        permissions[code] = perm
    db.flush()

    roles = {}
    for role_name in ALL_ROLES:
        role = db.query(Role).filter_by(name=role_name).first() or Role(name=role_name, description=f"{role_name} role")
        role.permissions = [permissions[c] for c in ROLE_PERMISSIONS[role_name]]
        db.add(role)
        roles[role_name] = role
    db.flush()
    return roles


def seed_master_data(db):
    departments = {name: Department(name=name) for name in ["Engineering", "Sales", "Human Resources", "Finance"]}
    for d in departments.values():
        db.add(d)

    positions = {name: JobPosition(name=name) for name in [
        "Software Engineer", "Senior Software Engineer", "HR Executive", "HR Manager",
        "Payroll Specialist", "Sales Executive", "Finance Analyst",
    ]}
    for p in positions.values():
        db.add(p)

    employee_types = {name: EmployeeType(name=name) for name in ["Full-Time", "Contract", "Intern"]}
    for e in employee_types.values():
        db.add(e)

    db.flush()
    return departments, positions, employee_types


def seed_schedules(db):
    fixed = WorkingSchedule(name="Fixed 9-6", type=ScheduleType.FIXED)
    db.add(fixed)
    db.flush()
    for day in range(5):  # Monday..Friday
        db.add(ScheduleLine(schedule_id=fixed.id, day_of_week=day,
                             start_time=datetime.time(9, 0), end_time=datetime.time(18, 0),
                             break_hours=Decimal("1.00")))
    db.flush()
    fixed.recompute_weekly_hours()

    flexible = WorkingSchedule(name="Flexible Hours", type=ScheduleType.FLEXIBLE)
    db.add(flexible)
    db.flush()
    for day in range(5):
        db.add(ScheduleLine(schedule_id=flexible.id, day_of_week=day,
                             start_time=datetime.time(8, 0), end_time=datetime.time(16, 30),
                             break_hours=Decimal("0.50")))
    db.flush()
    flexible.recompute_weekly_hours()
    db.flush()
    return fixed, flexible


def seed_salary_structure(db):
    structure = SalaryStructure(name="Regular Salary", code="REGULAR", description="Standard monthly salary structure")
    db.add(structure)
    db.flush()

    rules = [
        SalaryRule(structure_id=structure.id, name="Basic Salary", code="BASIC", category=RuleCategory.BASIC,
                   sequence=10, computation_type=ComputationType.FORMULA, formula_text="WAGE"),
        SalaryRule(structure_id=structure.id, name="House Rent Allowance", code="HRA", category=RuleCategory.ALLOWANCE,
                   sequence=20, computation_type=ComputationType.PERCENTAGE, percentage=Decimal("40.000"),
                   base_rule_code="BASIC"),
        SalaryRule(structure_id=structure.id, name="Conveyance Allowance", code="CONV", category=RuleCategory.ALLOWANCE,
                   sequence=30, computation_type=ComputationType.FIXED, fixed_amount=Decimal("1600.00")),
        SalaryRule(structure_id=structure.id, name="Gross Salary", code="GROSS", category=RuleCategory.GROSS,
                   sequence=40, computation_type=ComputationType.FORMULA, formula_text="BASIC + HRA + CONV"),
        SalaryRule(structure_id=structure.id, name="Provident Fund", code="PF", category=RuleCategory.DEDUCTION,
                   sequence=50, computation_type=ComputationType.PERCENTAGE, percentage=Decimal("12.000"),
                   base_rule_code="BASIC"),
        SalaryRule(structure_id=structure.id, name="Net Salary", code="NET", category=RuleCategory.NET,
                   sequence=60, computation_type=ComputationType.FORMULA, formula_text="GROSS - PF"),
    ]
    db.add_all(rules)
    db.flush()

    contract_structure = SalaryStructure(name="Contractor Payout", code="CONTRACTOR",
                                          description="Simplified structure for contract staff")
    db.add(contract_structure)
    db.flush()
    db.add_all([
        SalaryRule(structure_id=contract_structure.id, name="Basic Salary", code="BASIC", category=RuleCategory.BASIC,
                   sequence=10, computation_type=ComputationType.FORMULA, formula_text="WAGE"),
        SalaryRule(structure_id=contract_structure.id, name="Gross Salary", code="GROSS", category=RuleCategory.GROSS,
                   sequence=20, computation_type=ComputationType.FORMULA, formula_text="BASIC"),
        SalaryRule(structure_id=contract_structure.id, name="Net Salary", code="NET", category=RuleCategory.NET,
                   sequence=30, computation_type=ComputationType.FORMULA, formula_text="GROSS"),
    ])
    db.flush()
    return structure, contract_structure


def seed_time_off_types(db):
    types = {
        "PAID": TimeOffType(name="Paid Leave", code="PAID", unit=TimeOffUnit.DAYS, requires_allocation=True,
                             approval_required=True, deduct_from_payroll=False, allow_negative=False),
        "SICK": TimeOffType(name="Sick Leave", code="SICK", unit=TimeOffUnit.DAYS, requires_allocation=True,
                             approval_required=True, deduct_from_payroll=False, allow_negative=False),
        "UNPAID": TimeOffType(name="Unpaid Leave", code="UNPAID", unit=TimeOffUnit.DAYS, requires_allocation=False,
                               approval_required=True, deduct_from_payroll=True, allow_negative=True),
    }
    for t in types.values():
        db.add(t)
    db.flush()
    return types


def make_user(db, roles, email, password, full_name, role_names):
    existing = db.query(User).filter_by(email=email).first()
    if existing:
        return existing
    user = User(email=email, hashed_password=hash_password(password), full_name=full_name,
                roles=[roles[r] for r in role_names])
    db.add(user)
    db.flush()
    return user


def seed():
    from app.enterprise_seed import main
    main()


if __name__ == "__main__":
    seed()
