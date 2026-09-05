"""UNIQUE FEATURE - MySQL race regression using only the isolated smoke fixture."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import datetime as dt
import json
from concurrent.futures import ThreadPoolExecutor
from unittest.mock import patch
from fastapi.testclient import TestClient
from app.main import app
from app.db.session import SessionLocal, engine
from app.services import attendance_service
from app.models.attendance import Attendance
from app.models.employee import Employee
from app.core.security import create_access_token
from app.services.auth_service import user_to_dict
assert engine.dialect.name == 'mysql'
s=json.loads(Path('../frontend/ui-audit/unique-mysql.json').read_text())
with SessionLocal() as db:
    emp=db.get(Employee,s['employee_id']); assert emp.name.startswith('QA-UNIQUE-')
    user=emp.user
    token=create_access_token(user.id, sorted(user.permission_codes()), user.role_names())
employee_headers={'Authorization':'Bearer '+token}
with TestClient(app) as c:
    auth=c.post('/api/v1/auth/login',json={'email':'admin@peoplepay360.com','password':'Admin@123'}).json()['data']
headers={'Authorization':'Bearer '+auth['access_token']}
def post(args):
    path,payload,auth=args
    with TestClient(app) as c:
        r=c.post('/api/v1'+path,json=payload,headers=auth)
        return r.status_code
future=dt.date.today()+dt.timedelta(days=2)
with patch.object(attendance_service,'utc_now',return_value=dt.datetime.combine(future,dt.time(6),tzinfo=dt.timezone.utc)):
    with ThreadPoolExecutor(2) as pool:
        attendance=list(pool.map(post,[('/attendance/check-in',{'latitude':26.48,'longitude':73.11},employee_headers)]*2))
assert sorted(attendance)==[200,422],attendance
with SessionLocal() as db:
    row=db.query(Attendance).filter_by(employee_id=s['employee_id'],date=future).one()
    assert row.location_tag=='OUTSIDE'
month=(dt.date.today().replace(day=1)+dt.timedelta(days=32)).replace(day=1)
end=(month+dt.timedelta(days=32)).replace(day=1)-dt.timedelta(days=1)
payload={'salary_structure_id':s['structure_id'],'employee_ids':[s['employee_id']], 'period_start':str(month),'period_end':str(end)}
with ThreadPoolExecutor(2) as pool:
    payroll=list(pool.map(post,[('/payruns',payload,headers)]*2))
assert sorted(payroll)==[200,409],payroll
print(json.dumps({'concurrent_checkin':attendance,'concurrent_generation':payroll,'outside_persisted':True}))
