import datetime as dt
from decimal import Decimal
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import event

from app.main import app
from app.api.deps import get_current_user, CurrentUser
from app.core.permissions import ALL_PERMISSIONS
from app.db.session import get_db
from app.models.organization import Department
from app.models.employee import Employee
from app.models.attendance import Attendance
from app.models.contract import Contract, ContractStatus
from app.models.payroll import PayslipStatus
from app.schemas.payroll import PayrunCreateRequest
from app.seed import seed_salary_structure
from app.services import employee_service, attendance_service, payroll_service, dashboard_service
from app.repositories.contract_repository import get_applicable_contract


@pytest.fixture
def scale(db):
    departments = [Department(name='Scale Engineering'), Department(name='Scale Finance')]
    db.add_all(departments)
    structure, _ = seed_salary_structure(db)
    employees = [Employee(employee_code=f'SCALE-{i:04}', name=f'Kavya Scale {i:04}', email=f'scale{i}@example.test',
        department_id=departments[i % 2].id, bank_account='DEMO-ACCOUNT') for i in range(250)]
    db.add_all(employees)
    db.flush()
    for emp in employees:
        db.add(Contract(employee_id=emp.id, reference=emp.employee_code, start_date=dt.date(2026, 1, 1),
            wage=Decimal('50000'), salary_structure_id=structure.id, status=ContractStatus.ACTIVE))
        for day in range(1, 5):
            row = Attendance(employee_id=emp.id, date=dt.date(2026, 6, day),
                check_in=dt.datetime(2026, 6, day, 3, 30), check_out=dt.datetime(2026, 6, day, 12, 30))
            attendance_service._apply_recompute(row)
            db.add(row)
    db.flush()
    return employees, departments, structure


def test_employee_scale_search_filters_and_constant_query_count(db, scale):
    employees, departments, _ = scale
    queries = []
    listener = lambda *args: queries.append(args[2])
    event.listen(db.bind, 'before_cursor_execute', listener)
    try:
        rows, total = employee_service.list_employees(db, 'Scale', None, True, 13, 20)
        serialized = [employee_service.to_out_dict(db, row) for row in rows]
    finally:
        event.remove(db.bind, 'before_cursor_execute', listener)
    assert total == 250 and len(rows) == 10
    assert all(row['attendance_count'] == 4 for row in serialized)
    assert len(queries) <= 6
    for search in ['SCALE-0249', 'scale249@example.test', 'Kavya Scale 0249']:
        rows, total = employee_service.list_employees(db, search, None, None, 1, 20)
        assert total == 1 and rows[0].id == employees[-1].id
    rows, total = employee_service.list_employees(db, None, departments[0].id, None, 1, 20)
    assert total == 125 and all(row.department_id == departments[0].id for row in rows)


def test_attendance_scale_and_api_limits(db, scale):
    rows, total = attendance_service.list_attendance(db, None, None, None, None, 50, 20, search='Kavya Scale')
    assert len(rows) == 20 and total == 1000
    app.dependency_overrides[get_db] = lambda: db
    app.dependency_overrides[get_current_user] = lambda: CurrentUser(SimpleNamespace(id=1), {p[0] for p in ALL_PERMISSIONS}, ['Admin'])
    try:
        with TestClient(app) as client:
            for route in ['employees', 'contracts', 'attendance', 'time-off/requests', 'time-off/allocations', 'payruns', 'payslips']:
                assert client.get('/api/v1/' + route, params={'limit': 101}).status_code == 422
                assert client.get('/api/v1/' + route, params={'page': 0}).status_code == 422
            result = client.get('/api/v1/employees', params={'search': 'SCALE-0249'}).json()
            assert result['pagination']['total'] == 1
    finally:
        app.dependency_overrides.clear()


def test_engine_scale_dashboard_and_payrun_loading(db, scale):
    employees, departments, structure = scale
    start, end = dt.date(2026, 6, 1), dt.date(2026, 6, 30)
    run = payroll_service.create_payrun(db, PayrunCreateRequest(salary_structure_id=structure.id,
        period_start=start, period_end=end, employee_ids=[e.id for e in employees]), None)
    payroll_service.compute_payrun(db, run.id, None)
    payroll_service.validate_payrun(db, run.id, None)
    payroll_service.mark_paid(db, run.id, None)
    db.flush()
    expected = run.total_net
    assert all(s.status == PayslipStatus.PAID and len(s.lines) == 6 for s in run.payslips)
    assert get_applicable_contract(db, employees[-1].id, start, end).employee_id == employees[-1].id
    data = dashboard_service.get_payroll_dashboard(db, start, end, departments[0].id, None)
    assert data['kpis']['payslips_generated'] == 125
    assert Decimal(str(data['kpis']['total_net_salary_paid'])) == expected / 2
    assert Decimal(str(data['charts']['monthly_net_salary_trend'][-1]['net_salary'])) == expected / 2
    run_id = run.id
    db.expunge_all()
    queries = []
    listener = lambda *args: queries.append(args[2])
    event.listen(db.bind, 'before_cursor_execute', listener)
    try:
        result = payroll_service.payrun_to_dict(payroll_service.get_payrun(db, run_id))
    finally:
        event.remove(db.bind, 'before_cursor_execute', listener)
    assert len(result['payslips']) == 250 and len(queries) <= 4
    rows, total = payroll_service.list_payruns(db, None, 1, 1)
    assert len(rows) == 1 and total >= 1
