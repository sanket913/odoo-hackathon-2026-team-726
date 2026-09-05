"""UNIQUE FEATURE - real configured MySQL HTTP workflow, with isolated QA records.

Run from backend: venv/Scripts/python.exe scripts/unique_mysql_smoke.py
QA records remain
available for browser verification; their IDs (no credentials) are written to
the ignored frontend/ui-audit/unique-mysql.json file.
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import datetime as dt
import json
import subprocess
from uuid import uuid4
from unittest.mock import patch
from concurrent.futures import ThreadPoolExecutor
from fastapi.testclient import TestClient
from sqlalchemy import select
from app.main import app
from app.db.session import engine, SessionLocal
from app.models.audit import EmployeeAuditLog
from app.models.notification import NotificationLog
from app.models.time_off import TimeOffAllocation
from app.models.attendance import Attendance
from app.services import attendance_service

assert engine.dialect.name == 'mysql', 'This check requires the configured MySQL database'
tag='QA-UNIQUE-'+uuid4().hex[:8]
client=TestClient(app)
def call(method,path,payload=None,status=200,headers=None):
    r=client.request(method,'/api/v1'+path,json=payload,headers=headers or admin)
    assert r.status_code==status, (method,path,r.status_code,r.text[:400])
    return r.json().get('data') if status==200 else r.json()

admin={}
login=call('POST','/auth/login',{'email':'admin@peoplepay360.com','password':'Admin@123'})
admin={'Authorization':'Bearer '+login['access_token']}
actor=login['user']['id']
department=call('POST','/departments',{'name':tag})
structure=call('POST','/salary-structures',{'name':tag,'code':tag})
password=uuid4().hex+'@aA1'
employee=call('POST','/employees',{'name':tag,'email':tag.lower()+'@example.com','phone':'9876543210',
    'department_id':department['id'],'create_login':True,'login_password':password,'role_names':['Employee']})
eid=employee['id']
call('PATCH',f'/employees/{eid}',{'name':tag+' Updated'})
call('PATCH',f'/employees/{eid}',{'name':tag+' Updated'})
audit=call('GET',f'/employees/{eid}/audit-log')
assert len(audit)==1 and audit[0]['changed_by']==actor
assert call('GET',f'/employees/{eid}')['visible_buttons']==['contract','attendance','timeoff','payrun','rules','payslip']
own=call('POST','/auth/login',{'email':employee['email'],'password':password})
employee_headers={'Authorization':'Bearer '+own['access_token']}
assert call('GET',f'/employees/{eid}',headers=employee_headers)['visible_buttons']==['my_profile','my_payslip']
call('GET','/dashboard/salary-burn-live',status=403,headers=employee_headers)
call('GET',f'/employees/{eid}/audit-log',status=403,headers=employee_headers)
today=dt.date.today(); start=today.replace(day=1); end=(start+dt.timedelta(days=32)).replace(day=1)-dt.timedelta(days=1)
contract=call('POST','/contracts',{'employee_id':eid,'reference':tag,'start_date':str(start),'wage':'12345.67',
    'salary_structure_id':structure['id'],'status':'Active'})
burn=call('GET',f"/dashboard/salary-burn-live?department_id={department['id']}")
assert float(burn['total_monthly_burn'])==12345.67
call('PATCH',f"/contracts/{contract['id']}",{'wage':'13000.00'})
assert float(call('GET',f"/dashboard/salary-burn-live?department_id={department['id']}")['total_monthly_burn'])==13000
with patch.object(attendance_service,'utc_now',return_value=dt.datetime.combine(today,dt.time(7),tzinfo=dt.timezone.utc)):
    attendance=call('POST','/attendance/check-in',{'latitude':26.47,'longitude':73.11},headers=employee_headers)
assert attendance['status']=='Half-day' and attendance['location_tag']=='OFFICE'
with patch.object(attendance_service,'utc_now',return_value=dt.datetime.combine(today,dt.time(8),tzinfo=dt.timezone.utc)):
    checkout=call('POST','/attendance/check-out',headers=employee_headers)
assert checkout['status']=='Absent' and checkout['worked_hours']==1
leave=call('POST','/time-off/types',{'name':tag,'code':tag})
allocation=call('POST','/time-off/allocations',{'employee_id':eid,'time_off_type_id':leave['id'],
    'allocated':'2','valid_from':str(start),'valid_to':str(end)})
call('POST',f"/time-off/allocations/{allocation['id']}/approve")
payload={'employee_id':eid,'time_off_type_id':leave['id'],'from_date':str(start),'to_date':str(start)}
request=call('POST','/time-off/requests',payload)
call('POST',f"/time-off/requests/{request['id']}/approve",{})
call('POST',f"/time-off/requests/{request['id']}/approve",{},status=409)
call('POST','/time-off/requests',{**payload,'to_date':str(start+dt.timedelta(days=2))},status=400)
# Two requests can fit separately; concurrent approvals must not overspend one remaining day.
pending=[call('POST','/time-off/requests',payload) for _ in range(2)]
def approve(row):
    with TestClient(app) as c:
        return c.post(f"/api/v1/time-off/requests/{row['id']}/approve",json={},headers=admin).status_code
with ThreadPoolExecutor(2) as pool: statuses=sorted(pool.map(approve,pending))
assert statuses==[200,409],statuses
def rule(code,sequence,status=200):
    return call('POST','/salary-rules',{'structure_id':structure['id'],'name':code,'code':code,
        'sequence':sequence,'category':{'BASIC':'Basic','HRA':'Allowance','GROSS':'Gross','NET':'Net'}[code],
        'computation_type':'Fixed','fixed_amount':'1000'},status=status)
rule('HRA',20,400);rule('BASIC',10);rule('HRA',20);rule('GROSS',30);rule('NET',40)
scope={'salary_structure_id':structure['id'],'period_start':str(start),'period_end':str(end),'department_id':department['id']}
assert call('POST','/payruns/wizard/eligibility',scope)[0]['eligible']
run=call('POST','/payruns',{**scope,'employee_ids':[eid]})
warnings=call('GET',f"/payruns/{run['id']}/validation-warnings")
assert warnings['employees'][0]['warnings'][0]['type']=='bank'
call('POST','/payruns',{**scope,'employee_ids':[eid]},status=409)
call('POST',f"/payruns/{run['id']}/compute")
call('POST',f"/payruns/{run['id']}/validate")
paid=call('POST',f"/payruns/{run['id']}/mark-paid")
assert paid['status']=='Paid'
assert call('POST',f"/payruns/{run['id']}/mark-paid")['status']=='Paid'
pdf=client.get(f"/api/v1/payslips/{run['payslips'][0]['id']}/pdf",headers=admin)
assert pdf.status_code==200 and pdf.content.startswith(b'%PDF')
out=Path('../frontend/ui-audit');out.mkdir(exist_ok=True)
(out/'unique-payslip.pdf').write_bytes(pdf.content)
snapshot={'employee_id':eid,'payrun_id':run['id'],'payslip_id':run['payslips'][0]['id'],
    'attendance_id':attendance['id'],'allocation_id':allocation['id'],'department_id':department['id'],
    'structure_id':structure['id'],'time_off_type_id':leave['id'],'user_id':employee['user_id'],
    'contract_id':contract['id'],'tag':tag}
(out/'unique-mysql.json').write_text(json.dumps(snapshot),encoding='utf-8')
# A fresh Python process reloads settings/models/connections and verifies durable data.
code=f'''from app.db.session import SessionLocal
from app.models.audit import EmployeeAuditLog
from app.models.attendance import Attendance
from app.models.notification import NotificationLog
from app.models.time_off import TimeOffAllocation
with SessionLocal() as db:
 assert db.query(EmployeeAuditLog).filter_by(employee_id={eid}).count()==1
 assert db.get(Attendance,{attendance['id']}).auto_status_note=='Auto Absent - worked < 4 hours'
 assert db.get(TimeOffAllocation,{allocation['id']}).remaining==0
 assert db.query(NotificationLog).filter_by(payslip_id={snapshot['payslip_id']}).count()==0
print('Fresh backend process: persistence checks passed')'''
subprocess.run([sys.executable,'-c',code],check=True)
print(json.dumps({'result':'PASS','mysql':True,'concurrent_approval_statuses':statuses,'real_messages_sent':0,'fixture':tag}))
