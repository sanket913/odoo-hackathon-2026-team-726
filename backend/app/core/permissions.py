"""
Permission catalogue and the default Role -> Permission matrix used by the
seed script. Backend authorization is authoritative: every mutating and
sensitive-read route depends on `require_permission(...)`.
"""
from app.models.auth import (
    ROLE_EMPLOYEE, ROLE_HR_MANAGER, ROLE_HR_PAYROLL_USER, ROLE_HR_PAYROLL_MANAGER, ROLE_ADMIN,
)

# ---- Permission codes -------------------------------------------------
P_EMPLOYEE_READ_SELF = "employee.read_self"
P_EMPLOYEE_READ_ALL = "employee.read_all"
P_EMPLOYEE_CREATE = "employee.create"
P_EMPLOYEE_UPDATE = "employee.update"
P_EMPLOYEE_ARCHIVE = "employee.archive"

P_CONTRACT_READ = "contract.read"
P_CONTRACT_CREATE = "contract.create"
P_CONTRACT_UPDATE = "contract.update"

P_SCHEDULE_MANAGE = "schedule.manage"
P_SCHEDULE_READ = "schedule.read"

P_ATTENDANCE_READ_SELF = "attendance.read_self"
P_ATTENDANCE_READ_ALL = "attendance.read_all"
P_ATTENDANCE_CREATE_SELF = "attendance.create_self"
P_ATTENDANCE_CORRECT = "attendance.correct"

P_TIMEOFF_REQUEST = "timeoff.request"
P_TIMEOFF_READ_SELF = "timeoff.read_self"
P_TIMEOFF_READ_ALL = "timeoff.read_all"
P_TIMEOFF_APPROVE = "timeoff.approve"
P_TIMEOFF_ALLOCATE = "timeoff.allocate"
P_TIMEOFF_CONFIGURE = "timeoff.configure"

P_SALARY_STRUCTURE_READ = "salary_structure.read"
P_SALARY_STRUCTURE_MANAGE = "salary_structure.manage"
P_SALARY_RULE_READ = "salary_rule.read"
P_SALARY_RULE_MANAGE = "salary_rule.manage"

P_PAYRUN_READ = "payrun.read"
P_PAYRUN_CREATE = "payrun.create"
P_PAYRUN_COMPUTE = "payrun.compute"
P_PAYRUN_VALIDATE = "payrun.validate"
P_PAYRUN_MARK_PAID = "payrun.mark_paid"
P_PAYRUN_SEND = "payrun.send"

P_PAYSLIP_READ_SELF = "payslip.read_self"
P_PAYSLIP_READ_ALL = "payslip.read_all"
P_PAYSLIP_PRINT = "payslip.print"

P_DASHBOARD_READ = "dashboard.read"

P_USER_MANAGE = "user.manage"
P_ROLE_MANAGE = "role.manage"

P_MASTER_DATA_MANAGE = "master_data.manage"
P_MASTER_DATA_READ = "master_data.read"

P_NOTIFICATION_READ_SELF = "notification.read_self"

ALL_PERMISSIONS = [
    (P_EMPLOYEE_READ_SELF, "View own employee record"),
    (P_EMPLOYEE_READ_ALL, "View any employee record"),
    (P_EMPLOYEE_CREATE, "Create employee records"),
    (P_EMPLOYEE_UPDATE, "Update employee records"),
    (P_EMPLOYEE_ARCHIVE, "Archive/deactivate employees"),
    (P_CONTRACT_READ, "View contracts"),
    (P_CONTRACT_CREATE, "Create contracts"),
    (P_CONTRACT_UPDATE, "Update contracts"),
    (P_SCHEDULE_MANAGE, "Manage working schedules"),
    (P_SCHEDULE_READ, "View working schedules"),
    (P_ATTENDANCE_READ_SELF, "View own attendance"),
    (P_ATTENDANCE_READ_ALL, "View all attendance"),
    (P_ATTENDANCE_CREATE_SELF, "Check in / check out for self"),
    (P_ATTENDANCE_CORRECT, "Correct attendance records"),
    (P_TIMEOFF_REQUEST, "Create own time off request"),
    (P_TIMEOFF_READ_SELF, "View own time off"),
    (P_TIMEOFF_READ_ALL, "View all time off"),
    (P_TIMEOFF_APPROVE, "Approve/refuse time off requests"),
    (P_TIMEOFF_ALLOCATE, "Create/manage allocations"),
    (P_TIMEOFF_CONFIGURE, "Configure time off types"),
    (P_SALARY_STRUCTURE_READ, "View salary structures"),
    (P_SALARY_STRUCTURE_MANAGE, "Manage salary structures"),
    (P_SALARY_RULE_READ, "View salary rules"),
    (P_SALARY_RULE_MANAGE, "Manage salary rules"),
    (P_PAYRUN_READ, "View payruns"),
    (P_PAYRUN_CREATE, "Create payruns"),
    (P_PAYRUN_COMPUTE, "Compute payruns"),
    (P_PAYRUN_VALIDATE, "Validate payruns"),
    (P_PAYRUN_MARK_PAID, "Mark payruns paid"),
    (P_PAYRUN_SEND, "Send payslips"),
    (P_PAYSLIP_READ_SELF, "View own payslips"),
    (P_PAYSLIP_READ_ALL, "View all payslips"),
    (P_PAYSLIP_PRINT, "Print/download payslip PDFs"),
    (P_DASHBOARD_READ, "View payroll dashboard"),
    (P_USER_MANAGE, "Manage user accounts"),
    (P_ROLE_MANAGE, "Manage roles/permissions"),
    (P_MASTER_DATA_MANAGE, "Manage master data (departments, positions, types)"),
    (P_MASTER_DATA_READ, "View master data"),
    (P_NOTIFICATION_READ_SELF, "View own notifications"),
]

_HR_MANAGER_PERMS = {
    P_EMPLOYEE_READ_SELF, P_EMPLOYEE_READ_ALL, P_EMPLOYEE_CREATE, P_EMPLOYEE_UPDATE, P_EMPLOYEE_ARCHIVE,
    P_CONTRACT_READ, P_CONTRACT_CREATE, P_CONTRACT_UPDATE,
    P_SCHEDULE_MANAGE, P_SCHEDULE_READ,
    P_ATTENDANCE_READ_SELF, P_ATTENDANCE_READ_ALL, P_ATTENDANCE_CREATE_SELF, P_ATTENDANCE_CORRECT,
    P_TIMEOFF_REQUEST, P_TIMEOFF_READ_SELF, P_TIMEOFF_READ_ALL, P_TIMEOFF_APPROVE, P_TIMEOFF_ALLOCATE,
    P_TIMEOFF_CONFIGURE,
    P_MASTER_DATA_MANAGE, P_MASTER_DATA_READ,
    P_DASHBOARD_READ, P_NOTIFICATION_READ_SELF,
}

_HR_PAYROLL_USER_PERMS = _HR_MANAGER_PERMS | {
    P_PAYRUN_READ, P_PAYRUN_CREATE, P_PAYRUN_COMPUTE,
    P_PAYSLIP_READ_ALL, P_PAYSLIP_PRINT,
    P_SALARY_STRUCTURE_READ, P_SALARY_RULE_READ,
}

_HR_PAYROLL_MANAGER_PERMS = _HR_PAYROLL_USER_PERMS | {
    P_PAYRUN_VALIDATE, P_PAYRUN_MARK_PAID, P_PAYRUN_SEND,
    P_SALARY_STRUCTURE_MANAGE, P_SALARY_RULE_MANAGE,
}

ROLE_PERMISSIONS = {
    ROLE_EMPLOYEE: {
        P_EMPLOYEE_READ_SELF,
        P_ATTENDANCE_READ_SELF, P_ATTENDANCE_CREATE_SELF,
        P_TIMEOFF_REQUEST, P_TIMEOFF_READ_SELF,
        P_PAYSLIP_READ_SELF, P_PAYSLIP_PRINT,
        P_CONTRACT_READ,  # self scoped in service layer
        P_SCHEDULE_READ,
        P_MASTER_DATA_READ,
        P_NOTIFICATION_READ_SELF,
    },
    ROLE_HR_MANAGER: _HR_MANAGER_PERMS,
    ROLE_HR_PAYROLL_USER: _HR_PAYROLL_USER_PERMS,
    ROLE_HR_PAYROLL_MANAGER: _HR_PAYROLL_MANAGER_PERMS,
    ROLE_ADMIN: {code for code, _ in ALL_PERMISSIONS},
}
