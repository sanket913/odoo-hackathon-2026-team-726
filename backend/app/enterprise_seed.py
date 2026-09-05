"""Explicit development-only enterprise dataset. Never imported at server startup."""
import argparse
import calendar
import datetime as dt
import gzip
import json
import random
import time
from collections import Counter
from decimal import Decimal
from pathlib import Path

from sqlalchemy import select, update
from app.seed import (seed_rbac, seed_salary_structure, seed_time_off_types, make_user)
from app.db.base import Base
from app.db.session import SessionLocal, engine
from app.core.config import settings
from app.models.auth import User, ROLE_ADMIN, ROLE_HR_MANAGER, ROLE_HR_PAYROLL_USER, ROLE_HR_PAYROLL_MANAGER, ROLE_EMPLOYEE
from app.models.organization import Department, JobPosition, EmployeeType
from app.models.employee import Employee
from app.models.contract import Contract, ContractStatus
from app.models.schedule import WorkingSchedule, ScheduleLine, ScheduleType
from app.models.attendance import Attendance
from app.models.time_off import TimeOffType, TimeOffAllocation, TimeOffRequest, AllocationStatus, RequestStatus, TimeOffUnit
from app.models.payroll import Payrun, Payslip, PayslipLine, PayrunStatus, PayslipStatus
from app.models.salary import SalaryStructure, SalaryRule
from app.models.notification import Notification
from app.models.audit import AuditLog
from app.schemas.contract import ContractCreate
from app.schemas.payroll import PayrunCreateRequest
from app.services import contract_service, payroll_service, attendance_service, dashboard_service
from app.services.audit_service import write_audit
from app.repositories.contract_repository import get_applicable_contract
from app.utils.attendance_rules import business_time

ANCHOR = dt.date(2026, 9, 5)
MARKER = 'EnterpriseSeed726'
PRESERVE = {'users', 'roles', 'permissions', 'user_roles', 'role_permissions', 'refresh_sessions'}
MODELS = [User, Employee, Department, JobPosition, EmployeeType, WorkingSchedule, Contract, Attendance,
          TimeOffType, TimeOffAllocation, TimeOffRequest, SalaryStructure, SalaryRule, Payrun, Payslip,
          PayslipLine, Notification, AuditLog]


def backup(db):
    """Typed JSON snapshot of existing rows, including account hashes; never print contents."""
    folder = Path('.seed-backups')
    folder.mkdir(exist_ok=True)
    path = folder / (dt.datetime.now().strftime('%Y%m%d-%H%M%S-%f') + '.json.gz')
    def encode(value):
        if isinstance(value, (dt.datetime, dt.date, dt.time, Decimal)):
            return {'__type__': type(value).__name__, 'value': str(value)}
        raise TypeError(type(value).__name__)
    rows = {t.name: [dict(r) for r in db.execute(select(t)).mappings()] for t in Base.metadata.sorted_tables}
    with gzip.open(path, 'wt', encoding='utf-8') as stream:
        json.dump(rows, stream, default=encode)
    print('Pre-reset backup:', path, flush=True)
    return path


def clear_domain(db):
    db.execute(update(Employee).values(manager_id=None))
    for table in reversed(Base.metadata.sorted_tables):
        if table.name not in PRESERVE:
            db.execute(table.delete())
    db.flush()
    db.expire_all()


def counts(db):
    return {model.__tablename__: db.query(model).count() for model in MODELS}


def populate(db):
    rng = random.Random(726)
    roles = seed_rbac(db)
    regular, contractor = seed_salary_structure(db)
    types = seed_time_off_types(db)
    types['CASUAL'] = TimeOffType(name='Casual Leave', code='CASUAL', unit=TimeOffUnit.DAYS,
        requires_allocation=True, approval_required=True, deduct_from_payroll=False, allow_negative=False)
    db.add(types['CASUAL'])
    departments = [Department(name=name) for name in ['Engineering', 'Product', 'Sales', 'Marketing',
        'Finance', 'Human Resources', 'Operations', 'Customer Success']]
    positions = [JobPosition(name=name) for name in ['Software Engineer', 'Senior Software Engineer', 'QA Engineer',
        'Product Analyst', 'Product Manager', 'Business Analyst', 'Sales Executive', 'Account Executive', 'Sales Analyst',
        'Marketing Executive', 'Content Specialist', 'Designer', 'Accountant', 'Finance Analyst', 'Payroll Specialist',
        'HR Executive', 'Recruiter', 'HR Analyst', 'Operations Executive', 'Logistics Coordinator', 'Procurement Analyst',
        'Customer Success Executive', 'Support Specialist', 'Implementation Consultant', 'Department Head', 'Team Manager']]
    employee_types = [EmployeeType(name=name) for name in ['Full-Time', 'Contract', 'Intern']]
    db.add_all(departments + positions + employee_types)
    schedules = []
    for name, start, end, saturday in [('Standard 9–6', 9, 18, False), ('Early Shift 8–5', 8, 17, False),
        ('Flexible 40 Hours', 9, 18, False), ('Half-Day Saturday', 9, 18, True), ('Operations Shift', 8, 17, False)]:
        schedule = WorkingSchedule(name=name, type=ScheduleType.FLEXIBLE if 'Flexible' in name else ScheduleType.FIXED)
        schedule.lines = [ScheduleLine(day_of_week=day, start_time=dt.time(start), end_time=dt.time(end), break_hours=Decimal('1')) for day in range(5)]
        if saturday:
            schedule.lines.append(ScheduleLine(day_of_week=5, start_time=dt.time(9), end_time=dt.time(13), break_hours=Decimal('0')))
        schedule.recompute_weekly_hours()
        db.add(schedule)
        schedules.append(schedule)
    db.flush()
    official = [
        ('Hannah Manager', 'hr.manager@peoplepay360.com', 'Hr@12345', ROLE_HR_MANAGER, 5),
        ('Pat PayrollUser', 'payroll.user@peoplepay360.com', 'Payroll@123', ROLE_HR_PAYROLL_USER, 4),
        ('Priya PayrollManager', 'payroll.manager@peoplepay360.com', 'Payroll@123', ROLE_HR_PAYROLL_MANAGER, 4),
        ('Ava Admin', 'admin@peoplepay360.com', 'Admin@123', ROLE_ADMIN, 5),
        ('Ethan Employee', 'employee@peoplepay360.com', 'Employee@123', ROLE_EMPLOYEE, 0),
        ('Aarav Sharma', 'aarav.sharma@peoplepay360.com', 'Employee@123', ROLE_EMPLOYEE, 0),
        ('Diya Patel', 'diya.patel@peoplepay360.com', 'Employee@123', ROLE_EMPLOYEE, 1),
        ('Isha Nair', 'isha.nair@peoplepay360.com', 'Employee@123', ROLE_EMPLOYEE, 2)]
    first = 'Ananya Arjun Kavya Rohan Meera Karan Sneha Vikram Neha Aditya Priyanka Nikhil Pooja Rahul Sanya Varun Tanvi Akash Ritika Dev Ishaan Aditi Manav Simran'.split()
    last = 'Kapoor Mehta Iyer Rao Joshi Shah Desai Menon Reddy Gupta Bose Malhotra Kulkarni Bhat Singh Verma Sethi Khanna Jain Nair'.split()
    names = [f'{a} {b}' for a in first for b in last]
    rng.shuffle(names)
    employees, wages, structures, groups = [], {}, {}, {i: [] for i in range(8)}
    for i in range(250):
        dept = official[i][4] if i < 8 else i % 8
        rank = len(groups[dept])
        etype = 0 if rank < 3 or i < 8 else (1 if i % 7 == 0 else 2 if i % 13 == 0 else 0)
        name = official[i][0] if i < 8 else names[i]
        email = official[i][1] if i < 8 else name.lower().replace(' ', '.') + '@peoplepay360.example'
        user = make_user(db, roles, email, official[i][2], name, [official[i][3]]) if i < 8 else None
        pos = 24 if rank == 0 else 25 if rank < 3 else dept * 3 + i % 3
        emp = Employee(employee_code=f'EMP-{i+1:04d}', name=name, email=email,
            department_id=departments[dept].id, job_position_id=positions[pos].id,
            employee_type_id=employee_types[etype].id, working_schedule_id=schedules[i % 5].id,
            bank_account=f'DEMO-{i+1:010d}', user_id=user.id if user else None, active=True)
        db.add(emp)
        db.flush()
        if rank:
            emp.manager_id = groups[dept][0 if rank < 3 else 1 + rank % 2].id
        groups[dept].append(emp)
        employees.append(emp)
        low, high = (140, 250) if rank == 0 else (90, 180) if rank < 3 else (15, 25) if etype == 2 else (75, 130) if i % 5 == 0 else (45, 80) if i % 3 else (25, 45)
        wages[emp.id] = Decimal(rng.randint(low, high) * 1000)
        structures[emp.id] = contractor if etype == 1 else regular
        common = dict(employee_id=emp.id, department_id=emp.department_id, job_position_id=emp.job_position_id,
            working_schedule_id=emp.working_schedule_id, salary_structure_id=structures[emp.id].id)
        contract_service.create_contract(db, ContractCreate(**common, reference=f'ENT726-{i+1}-CURRENT',
            start_date=dt.date(2026, 1, 1), wage=wages[emp.id]))
        if i < 45:
            contract_service.create_contract(db, ContractCreate(**common, reference=f'ENT726-{i+1}-HISTORY',
                start_date=dt.date(2024, 1, 1), end_date=dt.date(2025, 12, 31), wage=wages[emp.id]*Decimal('.85'), status='Expired'))
    actor = employees[0].user_id
    print('250 employees and 295 valid contracts generated.', flush=True)
    allocations = {}
    for emp in employees:
        for code, low, high in [('PAID', 12, 20), ('SICK', 6, 10), ('CASUAL', 6, 8)]:
            allocation = TimeOffAllocation(employee_id=emp.id, time_off_type_id=types[code].id,
                name=f'2026 {types[code].name} allowance', allocated=Decimal(rng.randint(low, high)), taken=Decimal('0'),
                valid_from=dt.date(2026, 1, 1), valid_to=dt.date(2026, 12, 31), status=AllocationStatus.APPROVED)
            db.add(allocation)
            allocations[emp.id, code] = allocation
    for i in range(12):
        db.add(TimeOffAllocation(employee_id=employees[i].id, time_off_type_id=types['PAID'].id,
            name='Additional leave grant', allocated=Decimal('2'), taken=Decimal('0'), valid_from=dt.date(2026, 1, 1),
            valid_to=dt.date(2026, 12, 31), status=AllocationStatus.DRAFT if i < 8 else AllocationStatus.REFUSED))
    db.flush()
    leave_days = set()
    for i in range(420):
        emp = employees[i % 250]
        code = ['PAID', 'SICK', 'CASUAL', 'UNPAID'][i % 4]
        day = dt.date(2026, 6, 1) + dt.timedelta(days=(i % 250) % 45 + (45 if i >= 250 else 0))
        while day.weekday() >= 5:
            day += dt.timedelta(days=1)
        status = RequestStatus.APPROVED if i < 273 else RequestStatus.TO_APPROVE if i < 357 else RequestStatus.REFUSED
        allocation = allocations.get((emp.id, code)) if status == RequestStatus.APPROVED else None
        if allocation:
            allocation.taken += Decimal('1')
        req = TimeOffRequest(employee_id=emp.id, time_off_type_id=types[code].id, from_date=day, to_date=day,
            duration_days=Decimal('1'), reason=['Family appointment', 'Medical consultation', 'Personal commitment', 'Family travel'][i % 4],
            status=status, allocation_id=allocation.id if allocation else None,
            decided_by_user_id=actor if status != RequestStatus.TO_APPROVE else None,
            hr_comment='Coverage reviewed by HR.' if status != RequestStatus.TO_APPROVE else None,
            created_at=dt.datetime.combine(day-dt.timedelta(days=3), dt.time(9)))
        db.add(req)
        if status == RequestStatus.APPROVED:
            leave_days.add((emp.id, day))
        if i < 75:
            db.flush()
            entry = write_audit(db, actor, 'TimeOffRequest', req.id, 'APPROVE', after={'status': 'Approved', 'duration_days': '1'})
            entry.created_at = dt.datetime.combine(day-dt.timedelta(days=1), dt.time(10))
    zone = business_time(dt.datetime.now(dt.timezone.utc)).tzinfo
    def utc(day, hour, minute=0):
        return dt.datetime.combine(day, dt.time(hour, minute), tzinfo=zone).astimezone(dt.timezone.utc).replace(tzinfo=None)
    attendance_counts = Counter()
    for i, emp in enumerate(employees):
        schedule = schedules[i % 5]
        days, day = [], ANCHOR - dt.timedelta(days=1)
        while len(days) < 60:
            if any(line.day_of_week == day.weekday() for line in schedule.lines):
                days.append(day)
            day -= dt.timedelta(days=1)
        for day in reversed(days):
            if (emp.id, day) in leave_days:
                continue
            draw = rng.randrange(100)
            start = 8 if i % 5 in (1, 4) else 9
            row = Attendance(employee_id=emp.id, date=day, check_in=utc(day, start), check_out=utc(day, start+9),
                is_manual_correction=draw in (0, 1), correction_reason='HR verified entry against shift register' if draw in (0, 1) else None)
            if day.weekday() == 5:
                row.check_out = utc(day, 13)
            elif draw < 6:
                row.check_in, row.check_out = utc(day, 10, 30), utc(day, 18, 30)
            elif draw < 10:
                row.check_in = row.check_out = None
            elif draw < 14:
                row.check_out = utc(day, start+10)
            elif draw < 16 and not emp.user_id:
                row.check_out = None
            elif draw == 16:
                row.check_out = utc(day, start+3)
            attendance_service._apply_recompute(row)
            attendance_counts[row.status.value] += 1
            db.add(row)
        db.flush()
    print('Attendance:', dict(attendance_counts), flush=True)
    for month in range(4, 10):
        start, end = dt.date(2026, month, 1), dt.date(2026, month, calendar.monthrange(2026, month)[1])
        if month == 9:
            for emp in employees[-5:]:
                emp.bank_account = None
        for structure in [regular, contractor]:
            selected = [emp.id for emp in employees if structures[emp.id] == structure]
            run = payroll_service.create_payrun(db, PayrunCreateRequest(salary_structure_id=structure.id,
                period_start=start, period_end=end, employee_ids=selected), actor)
            payroll_service.compute_payrun(db, run.id, actor)
            if month < 9:
                payroll_service.validate_payrun(db, run.id, actor)
                run.validated_at = dt.datetime.combine(end, dt.time(12))
            if month < 8:
                payroll_service.mark_paid(db, run.id, actor)
                run.paid_at = dt.datetime.combine(end, dt.time(15))
            run.created_at = dt.datetime.combine(start, dt.time(9))
            for event in db.query(AuditLog).filter_by(entity_type='Payrun', entity_id=run.id):
                event.created_at = dt.datetime.combine(end if event.action in ('VALIDATE', 'MARK_PAID') else start, dt.time(12))
        print(f'Payroll {start:%B}: computed through salary engine.', flush=True)
    payroll_service.create_payrun(db, PayrunCreateRequest(salary_structure_id=regular.id,
        period_start=dt.date(2026, 10, 1), period_end=dt.date(2026, 10, 31), employee_ids=[employees[0].id]), actor)
    for i in range(150 - db.query(Notification).count()):
        emp = employees[i % 8]
        db.add(Notification(user_id=emp.user_id, title='Monthly payslip available',
            body=f'{emp.name}, your {calendar.month_name[4+i%4]} payslip is available in the payroll portal.',
            category='payroll', link='/payroll/payslips', is_read=i % 3 != 0,
            created_at=dt.datetime(2026, 8, 31, 9) - dt.timedelta(days=i % 90)))
    marker = write_audit(db, actor, MARKER, None, 'COMPLETE', meta={'seed': 726, 'anchor': str(ANCHOR), 'employees': 250})
    marker.created_at = dt.datetime.combine(ANCHOR, dt.time(9))
    db.flush()


def validate(db):
    employees = db.query(Employee).all()
    assert len(employees) == 250, 'Employee total differs from target'
    for emp in employees:
        assert emp.working_schedule and emp.working_schedule.weekly_hours > 0
        assert get_applicable_contract(db, emp.id, ANCHOR, ANCHOR)
        seen, parent = {emp.id}, emp.manager
        while parent:
            assert parent.id not in seen, 'Circular management'
            seen.add(parent.id)
            parent = parent.manager
    for a in db.query(TimeOffAllocation):
        approved = sum((r.duration_days for r in db.query(TimeOffRequest).filter_by(allocation_id=a.id, status=RequestStatus.APPROVED)), Decimal('0'))
        assert a.taken == approved and a.remaining == a.allocated - a.taken and a.remaining >= 0
    for req in db.query(TimeOffRequest).filter_by(status=RequestStatus.APPROVED):
        if req.time_off_type.requires_allocation:
            a = db.get(TimeOffAllocation, req.allocation_id)
            assert a and a.employee_id == req.employee_id and a.time_off_type_id == req.time_off_type_id
            assert a.valid_from <= req.from_date <= req.to_date <= a.valid_to
    seen = set()
    for run in db.query(Payrun):
        assert run.total_employees == len(run.payslips)
        if run.status != PayrunStatus.DRAFT:
            assert run.total_net == sum((p.net_amount for p in run.payslips), Decimal('0'))
        for slip in run.payslips:
            key = (slip.employee_id, slip.period_start.year, slip.period_start.month)
            assert key not in seen
            seen.add(key)
            if slip.status != PayslipStatus.DRAFT:
                assert slip.lines and slip.contract_id == get_applicable_contract(db, slip.employee_id, slip.period_start, slip.period_end).id
                assert slip.contract.salary_structure_id == run.salary_structure_id
                assert slip.net_amount == next(line.amount for line in slip.lines if line.code == 'NET')
            if run.status == PayrunStatus.PAID:
                assert slip.status == PayslipStatus.PAID
    dashboard_service.get_payroll_dashboard(db, dt.date(2026, 4, 1), dt.date(2026, 9, 30), None, None)
    print('Consistency checks passed (contracts, hierarchy, schedules, leave, payslips, totals, dashboard).', flush=True)


def main():
    parser = argparse.ArgumentParser(description='Development enterprise seed; nonempty databases require explicit --reset.')
    parser.add_argument('--reset', action='store_true', help='Back up and replace domain data; preserve existing users/passwords and RBAC.')
    parser.add_argument('--verify', action='store_true', help='Validate and print counts without modifying data.')
    args = parser.parse_args()
    if settings.ENV != 'development' or engine.dialect.name != 'mysql':
        raise SystemExit('Enterprise seed requires ENV=development and MySQL. No data changed.')
    started = time.perf_counter()
    with SessionLocal() as db:
        if args.verify:
            validate(db)
        elif db.query(AuditLog).filter_by(entity_type=MARKER).first() and not args.reset:
            print('Enterprise dataset already exists; no rows changed.')
            validate(db)
        else:
            if db.query(Employee).count() and not args.reset:
                raise SystemExit('Existing data found. Use --reset explicitly to back up and replace domain data; login accounts are preserved.')
            if args.reset:
                backup(db)
                clear_domain(db)
            populate(db)
            validate(db)
            db.commit()
        print(json.dumps(counts(db), indent=2))
        print(f'Completed in {time.perf_counter()-started:.2f}s; MySQL database: {engine.url.database}')


if __name__ == '__main__':
    main()
