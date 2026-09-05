# UNIQUE FEATURE - regression coverage; no real external messages.
import datetime as dt
from decimal import Decimal
from types import SimpleNamespace
from uuid import uuid4
import pytest
from pydantic import ValidationError
from app.models.employee import Employee
from app.models.audit import EmployeeAuditLog
from app.models.auth import User
from app.models.contract import Contract, ContractStatus
from app.models.salary import SalaryStructure
from app.models.organization import Department
from app.models.time_off import TimeOffType, TimeOffAllocation, AllocationStatus
from app.models.payroll import Payslip, Payrun, PayrunStatus
from app.schemas.employee import EmployeeUpdate
from app.schemas.attendance import CheckInRequest
from app.schemas.salary import SalaryRuleCreate, SalaryRuleUpdate
from app.schemas.time_off import RequestCreate
from app.services import employee_service, attendance_service, salary_service, timeoff_service, payroll_service
from app.services.employee_buttons import get_visible_buttons
from app.services.dashboard_service import salary_burn_live
from app.utils.attendance_rules import location_tag
from app.utils.pdf_generator import verification_payload, generate_payslip_pdf
from app.engines.payroll_validation_engine import validate_payslip_before_generate
from app.core.exceptions import ValidationAppError, ConflictError


@pytest.fixture
def records(db):
    code = uuid4().hex[:10]
    user = User(email=f'{code}@example.com', hashed_password='never-audited', full_name='Test')
    department = Department(name=code)
    structure = SalaryStructure(name=code, code=code)
    db.add_all([user, department, structure]); db.flush()
    employee = Employee(employee_code=code, name='Unique Test', email=f'e{code}@example.com', user_id=user.id,
                        department_id=department.id, bank_account='ACC1', phone='9876543210')
    db.add(employee); db.flush()
    return employee, user, structure


def contract(db, employee, structure, start=dt.date(2026, 1, 1), end=None):
    row = Contract(employee_id=employee.id, reference=uuid4().hex[:20], start_date=start, end_date=end,
                   wage=Decimal('12345.67'), salary_structure_id=structure.id, status=ContractStatus.ACTIVE)
    db.add(row); db.flush()
    return row


def test_employee_audit_atomic_and_sensitive_allowlist(db, records):
    employee, user, _ = records
    employee_service.update_employee(db, employee.id, EmployeeUpdate(name=employee.name), user.id)
    assert db.query(EmployeeAuditLog).filter_by(employee_id=employee.id).count() == 0
    employee_service.update_employee(db, employee.id, EmployeeUpdate(name='Changed'), user.id)
    row = db.query(EmployeeAuditLog).filter_by(employee_id=employee.id).one()
    assert (row.changed_by, row.old_value, row.new_value) == (user.id, 'Unique Test', 'Changed')
    payload = SimpleNamespace(model_dump=lambda **_: {'hashed_password': 'secret', 'refresh_token': 'secret'})
    employee_service.update_employee(db, employee.id, payload, user.id)
    assert db.query(EmployeeAuditLog).filter_by(employee_id=employee.id).count() == 1
    db.rollback()
    assert db.query(EmployeeAuditLog).filter_by(new_value='Changed').count() == 0


@pytest.mark.parametrize('role,expected', [('Admin',['contract','attendance','timeoff','payrun','rules','payslip']),
    ('HR Manager',['employee','contract','attendance','timeoff']), ('HR Payroll Manager',['payrun','rules','payslip']),
    ('Employee',['my_profile','my_payslip']), ('unknown',[])])
def test_role_buttons(role, expected):
    assert get_visible_buttons(role) == expected


@pytest.mark.parametrize('lat,lon,expected', [(26.47,73.11,'OFFICE'),(26.4701,73.11,'OFFICE'),(26.48,73.11,'OUTSIDE')])
def test_geofence(lat,lon,expected):
    assert location_tag(lat,lon) == expected


@pytest.mark.parametrize('payload', [{'latitude':91,'longitude':0}, {'latitude':0,'longitude':181}, {'latitude':26}, {'longitude':73}, {'latitude':float('nan'),'longitude':0}])
def test_invalid_coordinates(payload):
    with pytest.raises(ValidationError): CheckInRequest(**payload)


@pytest.mark.parametrize('hour,status', [(6,'Missing Checkout'),(7,'Half-day')])
def test_checkin_and_short_checkout(db, records, monkeypatch, hour, status):
    employee,_,_ = records
    monkeypatch.setattr(attendance_service,'utc_now',lambda:dt.datetime(2026,9,5,hour,tzinfo=dt.timezone.utc))
    row=attendance_service.check_in(db,employee.id,26.47,73.11)
    assert row.status.value == status and row.location_tag == 'OFFICE'
    monkeypatch.setattr(attendance_service,'utc_now',lambda:dt.datetime(2026,9,5,hour+1,tzinfo=dt.timezone.utc))
    row=attendance_service.check_out(db,employee.id)
    assert row.status.value == 'Absent' and row.auto_status_note == 'Auto Absent - worked < 4 hours'
    assert row.worked_hours == Decimal('1.00')


@pytest.mark.parametrize('start,end,warning', [(dt.date(2026,1,1),None,False),(dt.date(2027,1,1),None,True),
    (dt.date(2025,1,1),dt.date(2025,12,31),True)])
def test_period_eligibility(db,records,start,end,warning):
    employee,_,structure=records
    contract(db,employee,structure,start,end)
    rows=payroll_service.compute_eligibility(db,structure.id,dt.date(2026,9,1),dt.date(2026,9,30),employee.department_id)
    assert rows[0]['has_warning'] == warning


def test_live_burn_and_prevalidation(db,records):
    employee,_,structure=records
    today=dt.date.today()
    contract(db,employee,structure,today)
    data=salary_burn_live(db,employee.department_id)
    assert data['total_monthly_burn'] == Decimal('12345.67')
    assert data['dept_burn'][0]['monthly_burn'] == Decimal('12345.67')
    employee.bank_account='  '
    warnings=validate_payslip_before_generate(employee.id,today,today,db)
    assert [w['type'] for w in warnings] == ['bank']


def test_paid_leave_blocker_and_approval(db,records):
    employee,user,_=records
    leave=TimeOffType(name='Paid',code=uuid4().hex[:20],allow_negative=True)
    db.add(leave);db.flush()
    allocation=TimeOffAllocation(employee_id=employee.id,time_off_type_id=leave.id,allocated=Decimal('2'),taken=Decimal('0'),
        valid_from=dt.date(2026,1,1),valid_to=dt.date(2026,12,31),status=AllocationStatus.APPROVED)
    db.add(allocation);db.flush()
    payload=RequestCreate(employee_id=employee.id,time_off_type_id=leave.id,from_date=dt.date(2026,9,1),to_date=dt.date(2026,9,3))
    with pytest.raises(ValidationAppError,match='UNIQUE FEATURE BLOCKER') as exc:timeoff_service.create_request(db,payload)
    assert exc.value.status_code == 400
    payload.to_date=payload.from_date
    row=timeoff_service.create_request(db,payload)
    assert allocation.remaining == Decimal('2')
    timeoff_service.approve_request(db,row.id,user.id,None)
    assert allocation.remaining == Decimal('1')
    with pytest.raises(ConflictError):timeoff_service.approve_request(db,row.id,user.id,None)
    assert allocation.remaining == Decimal('1')


def test_rule_dependencies_and_updates(db,records):
    _,_,structure=records
    def create(code,sequence):
        return salary_service.create_rule(db,SalaryRuleCreate(structure_id=structure.id,name=code,code=code,sequence=sequence,category='Basic',computation_type='Fixed'))
    with pytest.raises(ValidationAppError,match='Dependency failed'):create('HRA',20)
    basic=create('basic',10); assert basic.code == 'BASIC'
    with pytest.raises(ValidationAppError,match='Dependency failed'):create('GROSS',30)
    hra=create('HRA',20); create('GROSS',30)
    with pytest.raises(ValidationAppError,match='Sequence conflict'):create('OTHER',20)
    salary_service.update_rule(db,hra.id,SalaryRuleUpdate(name='Housing'))
    with pytest.raises(ValidationAppError,match='Dependency failed'):salary_service.update_rule(db,basic.id,SalaryRuleUpdate(sequence=25))
    with pytest.raises(ValidationAppError,match='Dependency failed'):salary_service.update_rule(db,basic.id,SalaryRuleUpdate(active=False))


def test_qr_hash_and_pdf(db,records):
    employee,_,structure=records
    slip=Payslip(id=10000,employee=employee,employee_id=employee.id,period_start=dt.date(2026,9,1),period_end=dt.date(2026,9,30),
        net_amount=Decimal('100.00'),basic_amount=Decimal('100'),gross_amount=Decimal('100'),worked_days=Decimal('1'),status='Paid')
    assert verification_payload(slip) == verification_payload(slip)
    before=verification_payload(slip);slip.net_amount=Decimal('101')
    assert before != verification_payload(slip)
    assert generate_payslip_pdf(slip).startswith(b'%PDF')


def test_negative_checkout_rejected(db, records, monkeypatch):
    employee,_,_=records
    monkeypatch.setattr(attendance_service,'utc_now',lambda:dt.datetime(2026,9,5,7,tzinfo=dt.timezone.utc))
    attendance_service.check_in(db,employee.id)
    monkeypatch.setattr(attendance_service,'utc_now',lambda:dt.datetime(2026,9,5,6,tzinfo=dt.timezone.utc))
    with pytest.raises(ValidationAppError,match='precede'):attendance_service.check_out(db,employee.id)


