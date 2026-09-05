import datetime as dt
from uuid import uuid4
import pytest
from app.models.employee import Employee
from app.services import attendance_service as service
from app.api.v1.attendance import self_status
from app.core.exceptions import ValidationAppError
from app.core.config import settings
from fastapi.testclient import TestClient
from app.main import app
from app.db.session import get_db


@pytest.fixture
def employee(db):
    row = Employee(employee_code=uuid4().hex[:12], name='Attendance test', email=f'{uuid4().hex}@example.com')
    db.add(row)
    db.flush()
    return row


@pytest.mark.parametrize('coordinates', [{}, {'latitude': 0.0, 'longitude': 0.0}])
def test_check_in_out_and_duplicates(db, employee, monkeypatch, coordinates):
    monkeypatch.setattr(service, 'utc_now', lambda: dt.datetime(2026, 9, 5, 3, tzinfo=dt.timezone.utc))
    with pytest.raises(ValidationAppError, match='before checking out'):
        service.check_out(db, employee.id)
    row = service.check_in(db, employee.id, **coordinates)
    assert row.check_in and not row.check_out
    assert (row.latitude is not None) == bool(coordinates)
    assert row.location_tag in ('OFFICE', 'OUTSIDE') if coordinates else row.location_tag is None
    with pytest.raises(ValidationAppError, match='already checked in'):
        service.check_in(db, employee.id)
    monkeypatch.setattr(service, 'utc_now', lambda: dt.datetime(2026, 9, 5, 11, tzinfo=dt.timezone.utc))
    result = service.check_out(db, employee.id)
    assert result.id == row.id
    assert float(result.worked_hours) == 8
    with pytest.raises(ValidationAppError, match='already checked out'):
        service.check_out(db, employee.id)


def test_overnight_shift_and_business_date(db, employee, monkeypatch):
    monkeypatch.setattr(settings, 'BUSINESS_TIMEZONE', 'Asia/Kolkata')
    monkeypatch.setattr(service, 'utc_now', lambda: dt.datetime(2026, 9, 5, 17, tzinfo=dt.timezone.utc))
    row = service.check_in(db, employee.id)
    monkeypatch.setattr(service, 'utc_now', lambda: dt.datetime(2026, 9, 6, 1, tzinfo=dt.timezone.utc))
    with pytest.raises(ValidationAppError, match='open shift'):
        service.check_in(db, employee.id)
    from app.utils import attendance_rules
    monkeypatch.setattr(attendance_rules, 'utc_now', service.utc_now)
    state = self_status(db=db, employee=employee, _=None)['data']
    assert state['business_date'] == dt.date(2026, 9, 6)
    assert state['record']['id'] == row.id
    assert service.check_out(db, employee.id).id == row.id
    assert float(row.worked_hours) == 8
    assert self_status(db=db, employee=employee, _=None)['data']['record'] is None
    assert service.check_in(db, employee.id).date == dt.date(2026, 9, 6)


@pytest.mark.parametrize('payload', [{}, {'latitude': 12.5, 'longitude': 77.5}])
def test_authenticated_api_actions(db, employee, make_user, payload):
    user = make_user(['Employee'], email=f'{uuid4().hex}@example.com')
    employee.user_id = user.id
    db.commit()
    def override_db():
        yield db
    app.dependency_overrides[get_db] = override_db
    try:
        with TestClient(app) as client:
            assert client.get('/api/v1/attendance/self-status').status_code == 401
            login = client.post('/api/v1/auth/login', json={'email': user.email, 'password': 'Test@123'})
            headers = {'Authorization': 'Bearer ' + login.json()['data']['access_token']}
            state = client.get('/api/v1/attendance/self-status', headers=headers)
            assert state.status_code == 200
            assert state.json()['data']['record'] is None
            assert client.post('/api/v1/attendance/check-out', headers=headers).status_code == 422
            assert client.post('/api/v1/attendance/check-in', headers=headers, json={'latitude': 12}).status_code == 422
            assert client.get('/api/v1/attendance/self-status', headers=headers).json()['data']['record'] is None
            checked_in = client.post('/api/v1/attendance/check-in', headers=headers, json=payload)
            assert checked_in.status_code == 200
            assert checked_in.json()['data']['employee_id'] == employee.id
            assert client.post('/api/v1/attendance/check-in', headers=headers, json={}).status_code == 422
            checked_out = client.post('/api/v1/attendance/check-out', headers=headers)
            assert checked_out.status_code == 200
            assert checked_out.json()['data']['check_out']
            assert client.post('/api/v1/attendance/check-out', headers=headers).status_code == 422
    finally:
        app.dependency_overrides.clear()
