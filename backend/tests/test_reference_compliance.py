import datetime as dt
from decimal import Decimal
from uuid import uuid4

import pytest
from app.models.employee import Employee
from app.models.organization import Department
from app.models.time_off import TimeOffType, TimeOffAllocation, TimeOffRequest, AllocationStatus, RequestStatus
from app.schemas.time_off import RequestCreate
from app.schemas.schedule import WorkingScheduleCreate, ScheduleLineIn
from app.services import timeoff_service, schedule_service, auth_service, dashboard_service
from app.core.exceptions import ValidationAppError


def employee(db):
    code = uuid4().hex[:12]
    row = Employee(employee_code=code, name='Audit Employee', email=f'{code}@example.com')
    db.add(row)
    db.flush()
    return row


def test_no_allocation_auto_approval_policy(db):
    emp = employee(db)
    kind = TimeOffType(name='Special leave', code=uuid4().hex[:12], requires_allocation=False, approval_required=False)
    db.add(kind)
    db.flush()
    row = timeoff_service.create_request(db, RequestCreate(employee_id=emp.id, time_off_type_id=kind.id,
        from_date=dt.date(2026, 9, 1), to_date=dt.date(2026, 9, 2)))
    assert row.status == RequestStatus.APPROVED
    assert row.allocation_id is None


def test_auto_approval_consumes_allocation_once(db):
    emp = employee(db)
    kind = TimeOffType(name='Automatic grant', code=uuid4().hex[:12], requires_allocation=True, approval_required=False)
    db.add(kind)
    db.flush()
    allocation = TimeOffAllocation(employee_id=emp.id, time_off_type_id=kind.id, allocated=3, taken=0,
        valid_from=dt.date(2026, 1, 1), valid_to=dt.date(2026, 12, 31), status=AllocationStatus.APPROVED)
    db.add(allocation)
    db.flush()
    row = timeoff_service.create_request(db, RequestCreate(employee_id=emp.id, time_off_type_id=kind.id,
        from_date=dt.date(2026, 9, 1), to_date=dt.date(2026, 9, 2)))
    assert row.status == RequestStatus.APPROVED
    assert allocation.remaining == Decimal('1')


@pytest.mark.parametrize('lines', [
    [ScheduleLineIn(day_of_week=0, start_time=dt.time(9), end_time=dt.time(10), break_hours=2)],
    [ScheduleLineIn(day_of_week=0, start_time=dt.time(9), end_time=dt.time(12), break_hours=0),
     ScheduleLineIn(day_of_week=0, start_time=dt.time(11), end_time=dt.time(14), break_hours=0)],
])
def test_invalid_schedule_intervals(db, lines):
    with pytest.raises(ValidationAppError):
        schedule_service.create_schedule(db, WorkingScheduleCreate(name=uuid4().hex, lines=lines))


def test_create_user_links_existing_employee_and_rejects_relink(db, rbac):
    emp = employee(db)
    user = auth_service.create_user(db, f'{uuid4().hex}@example.com', 'Test@123', 'Linked user', ['Employee'], emp.id)
    assert auth_service.user_to_dict(user)['employee_id'] == emp.id
    with pytest.raises(ValidationAppError):
        auth_service.create_user(db, f'{uuid4().hex}@example.com', 'Test@123', 'Duplicate', ['Employee'], emp.id)


def test_dashboard_clips_leave_days_and_filters_pending_requests(db):
    emp = employee(db)
    dept = Department(name=uuid4().hex)
    db.add(dept)
    db.flush()
    emp.department_id = dept.id
    kind = TimeOffType(name='Audit', code=uuid4().hex[:12])
    db.add(kind)
    db.flush()
    db.add_all([
        TimeOffRequest(employee_id=emp.id, time_off_type_id=kind.id, from_date=dt.date(2026, 8, 30),
            to_date=dt.date(2026, 9, 2), duration_days=4, status=RequestStatus.APPROVED),
        TimeOffRequest(employee_id=emp.id, time_off_type_id=kind.id, from_date=dt.date(2026, 10, 1),
            to_date=dt.date(2026, 10, 2), duration_days=2, status=RequestStatus.TO_APPROVE),
    ])
    db.flush()
    result = dashboard_service.get_payroll_dashboard(db, dt.date(2026, 9, 1), dt.date(2026, 9, 30), dept.id, None)
    assert result['time_off_overview']['approved_days'] == 2
    assert result['time_off_overview']['pending_requests'] == 0

def test_fixed_zero_is_exact_and_attendance_formula_context(db):
    from app.models.salary import SalaryStructure, SalaryRule, RuleCategory, ComputationType
    from app.models.contract import Contract, ContractStatus
    from app.models.payroll import Payrun, Payslip
    from app.models.attendance import Attendance, AttendanceStatus
    from app.engines.payroll_engine import compute_payslip
    emp = employee(db)
    structure = SalaryStructure(name='Audit structure', code=uuid4().hex[:12])
    db.add(structure)
    db.flush()
    db.add_all([
        SalaryRule(structure_id=structure.id, code='BASIC', name='Zero fixed basic', category=RuleCategory.BASIC,
            sequence=10, computation_type=ComputationType.FIXED, fixed_amount=0),
        SalaryRule(structure_id=structure.id, code='WORK', name='Work based', category=RuleCategory.ALLOWANCE,
            sequence=20, computation_type=ComputationType.FORMULA, formula_text='WAGE * WORKED_HOURS / SCHEDULED_HOURS'),
    ])
    schedule = schedule_service.create_schedule(db, WorkingScheduleCreate(name=uuid4().hex,
        lines=[ScheduleLineIn(day_of_week=1, start_time=dt.time(9), end_time=dt.time(18), break_hours=1)]))
    db.add(Contract(employee_id=emp.id, reference=uuid4().hex, start_date=dt.date(2026, 1, 1),
        wage=800, status=ContractStatus.ACTIVE, salary_structure_id=structure.id, working_schedule_id=schedule.id))
    db.add(Attendance(employee_id=emp.id, date=dt.date(2026, 9, 1), worked_hours=4, status=AttendanceStatus.HALF_DAY))
    run = Payrun(name='Audit', salary_structure_id=structure.id, period_start=dt.date(2026, 9, 1), period_end=dt.date(2026, 9, 1))
    db.add(run)
    db.flush()
    slip = Payslip(payrun_id=run.id, employee_id=emp.id, period_start=run.period_start, period_end=run.period_end)
    db.add(slip)
    db.flush()
    compute_payslip(db, slip)
    assert slip.basic_amount == 0
    assert slip.net_amount == Decimal('400.00')
