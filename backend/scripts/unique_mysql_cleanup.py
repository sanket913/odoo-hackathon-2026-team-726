"""UNIQUE FEATURE - remove only the verified, isolated smoke-test fixture rows."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import json
from sqlalchemy import delete
from app.db.session import SessionLocal
from app.models.employee import Employee
from app.models.auth import User, RefreshSession, user_roles
from app.models.organization import Department
from app.models.contract import Contract
from app.models.salary import SalaryStructure, SalaryRule
from app.models.attendance import Attendance
from app.models.time_off import TimeOffType, TimeOffAllocation, TimeOffRequest
from app.models.payroll import Payrun, Payslip, PayslipLine
from app.models.notification import Notification, NotificationLog
from app.models.audit import AuditLog, EmployeeAuditLog

path=Path('../frontend/ui-audit/unique-mysql.json')
s=json.loads(path.read_text())
assert s['tag'].startswith('QA-UNIQUE-')
with SessionLocal.begin() as db:
    employee=db.get(Employee,s['employee_id'])
    assert employee and employee.name == s['tag']+' Updated'
    assert employee.user_id == s['user_id'] and employee.department_id == s['department_id']
    assert db.get(SalaryStructure,s['structure_id']).code == s['tag']
    assert db.get(Department,s['department_id']).name == s['tag']
    runs=[r.id for r in db.query(Payrun).filter_by(salary_structure_id=s['structure_id'])]
    slips=db.query(Payslip).filter(Payslip.payrun_id.in_(runs)).all()
    assert all(p.employee_id == employee.id for p in slips)
    requests=[r.id for r in db.query(TimeOffRequest).filter_by(employee_id=employee.id)]
    allocations=[r.id for r in db.query(TimeOffAllocation).filter_by(employee_id=employee.id)]
    for entity, ids in [('Payrun',runs),('TimeOffRequest',requests),('TimeOffAllocation',allocations)]:
        db.execute(delete(AuditLog).where(AuditLog.entity_type==entity,AuditLog.entity_id.in_(ids)))
    for model, condition in [
        (NotificationLog,NotificationLog.employee_id==employee.id),
        (PayslipLine,PayslipLine.payslip_id.in_([p.id for p in slips])),
        (Payslip,Payslip.payrun_id.in_(runs)),(Payrun,Payrun.id.in_(runs)),
        (TimeOffRequest,TimeOffRequest.id.in_(requests)),(TimeOffAllocation,TimeOffAllocation.id.in_(allocations)),
        (TimeOffType,TimeOffType.id==s['time_off_type_id']),
        (Attendance,Attendance.employee_id==employee.id),(EmployeeAuditLog,EmployeeAuditLog.employee_id==employee.id),
        (Contract,Contract.employee_id==employee.id),(SalaryRule,SalaryRule.structure_id==s['structure_id']),
        (SalaryStructure,SalaryStructure.id==s['structure_id']),
        (Employee,Employee.id==employee.id),(Department,Department.id==s['department_id']),
        (Notification,Notification.user_id==s['user_id']),(RefreshSession,RefreshSession.user_id==s['user_id']),
    ]:
        db.execute(delete(model).where(condition).execution_options(synchronize_session=False))
    db.execute(delete(user_roles).where(user_roles.c.user_id==s['user_id']))
    db.execute(delete(User).where(User.id==s['user_id']))
s['cleaned_up']=True
path.write_text(json.dumps(s),encoding='utf-8')
print('Isolated QA fixture removed; existing business records preserved.')
