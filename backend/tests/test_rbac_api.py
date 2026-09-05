import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.db.session import get_db


@pytest.fixture()
def client(db):
    def _override_get_db():
        yield db

    app.dependency_overrides[get_db] = _override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def _login(client, email, password="Test@123"):
    resp = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200, resp.text
    return resp.json()["data"]["access_token"]


def test_employee_cannot_list_all_employees(client, make_user, db):
    from app.models.employee import Employee
    user = make_user(["Employee"], email="emp.rbac@example.com")
    emp = Employee(employee_code="EMP-RBAC1", name="RBAC Test", email="emp.rbac.record@example.com", user_id=user.id)
    db.add(emp)
    db.commit()

    token = _login(client, "emp.rbac@example.com")
    resp = client.get("/api/v1/employees", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    data = resp.json()["data"]
    # Self-scoped: only their own record is returned, never the full company list.
    assert len(data) == 1
    assert data[0]["id"] == emp.id


def test_employee_cannot_read_another_employees_record(client, make_user, db):
    from app.models.employee import Employee
    user_a = make_user(["Employee"], email="emp.a@example.com")
    user_b = make_user(["Employee"], email="emp.b@example.com")
    emp_a = Employee(employee_code="EMP-RBAC-A", name="Employee A", email="a.record@example.com", user_id=user_a.id)
    emp_b = Employee(employee_code="EMP-RBAC-B", name="Employee B", email="b.record@example.com", user_id=user_b.id)
    db.add_all([emp_a, emp_b])
    db.commit()

    token_a = _login(client, "emp.a@example.com")
    # Employee A tries to fetch Employee B's record by manually changing the ID.
    resp = client.get(f"/api/v1/employees/{emp_b.id}", headers={"Authorization": f"Bearer {token_a}"})
    assert resp.status_code == 403
    body = resp.json()
    assert body["success"] is False
    assert body["error"]["code"] == "PERMISSION_DENIED"


def test_employee_missing_payroll_permission(client, make_user):
    make_user(["Employee"], email="emp.payroll@example.com")
    token = _login(client, "emp.payroll@example.com")
    resp = client.get("/api/v1/payruns", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 403


def test_hr_manager_cannot_validate_payrun(client, make_user):
    """HR Manager has no payroll permissions per the official RBAC matrix."""
    make_user(["HR Manager"], email="hr.rbac@example.com")
    token = _login(client, "hr.rbac@example.com")
    resp = client.post("/api/v1/payruns/1/validate", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 403


def test_hr_payroll_user_cannot_validate_payrun(client, make_user):
    """HR Payroll User can create/compute but not validate/mark-paid (Manager-only)."""
    make_user(["HR Payroll User"], email="payrolluser.rbac@example.com")
    token = _login(client, "payrolluser.rbac@example.com")
    resp = client.post("/api/v1/payruns/1/validate", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 403


def test_invalid_login_rejected(client, make_user):
    make_user(["Employee"], email="badlogin@example.com")
    resp = client.post("/api/v1/auth/login", json={"email": "badlogin@example.com", "password": "wrong"})
    assert resp.status_code == 401
    assert resp.json()["success"] is False


def test_unauthenticated_request_rejected(client):
    resp = client.get("/api/v1/employees")
    assert resp.status_code == 401
