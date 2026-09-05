import { Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import { RequireAuth, RequirePermission } from './routes/RequireAuth'
import { PERMISSIONS } from './lib/permissions/permissions'

import Login from './pages/Login'
import PublicLandingPage from './pages/PublicLandingPage'
import NotFoundPage from './pages/NotFoundPage'
import ReportsPage from './pages/ReportsPage'

import EmployeesListPage from './pages/employees/EmployeesListPage'
import EmployeeFormPage from './pages/employees/EmployeeFormPage'
import EmployeeDetailPage from './pages/employees/EmployeeDetailPage'
import DepartmentsPage from './pages/employees/DepartmentsPage'

import ContractsListPage from './pages/contracts/ContractsListPage'
import ContractFormPage from './pages/contracts/ContractFormPage'
import ContractDetailPage from './pages/contracts/ContractDetailPage'

import SchedulesListPage from './pages/schedules/SchedulesListPage'
import ScheduleFormPage from './pages/schedules/ScheduleFormPage'
import ScheduleDetailPage from './pages/schedules/ScheduleDetailPage'

import AttendanceListPage from './pages/attendance/AttendanceListPage'
import AttendanceFormPage from './pages/attendance/AttendanceFormPage'
import AttendanceDetailPage from './pages/attendance/AttendanceDetailPage'

import RequestsListPage from './pages/timeoff/RequestsListPage'
import RequestFormPage from './pages/timeoff/RequestFormPage'
import RequestDetailPage from './pages/timeoff/RequestDetailPage'
import AllocationsListPage from './pages/timeoff/AllocationsListPage'
import AllocationFormPage from './pages/timeoff/AllocationFormPage'
import AllocationDetailPage from './pages/timeoff/AllocationDetailPage'
import TimeOffTypesListPage from './pages/timeoff/TimeOffTypesListPage'
import TimeOffTypeFormPage from './pages/timeoff/TimeOffTypeFormPage'
import TimeOffTypeDetailPage from './pages/timeoff/TimeOffTypeDetailPage'

import PayrunsListPage from './pages/payroll/PayrunsListPage'
import PayrunWizardPage from './pages/payroll/PayrunWizardPage'
import PayrunDetailPage from './pages/payroll/PayrunDetailPage'
import PayslipsListPage from './pages/payroll/PayslipsListPage'
import PayslipDetailPage from './pages/payroll/PayslipDetailPage'
import SalaryStructuresListPage from './pages/salary/SalaryStructuresListPage'
import SalaryStructureFormPage from './pages/salary/SalaryStructureFormPage'
import SalaryStructureDetailPage from './pages/salary/SalaryStructureDetailPage'
import SalaryRulesListPage from './pages/salary/SalaryRulesListPage'
import SalaryRuleFormPage from './pages/salary/SalaryRuleFormPage'
import SalaryRuleDetailPage from './pages/salary/SalaryRuleDetailPage'
import PayrollDashboardPage from './pages/payroll/PayrollDashboardPage'

import AuditLogsPage from './pages/admin/AuditLogsPage'
import AdminUsersPage from './pages/admin/AdminUsersPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<PublicLandingPage />} />
      <Route path="/login" element={<Login />} />

      <Route element={<RequireAuth />}>
        <Route element={<Layout />}>


          <Route path="/employees" element={<EmployeesListPage />} />
          <Route path="/departments" element={<DepartmentsPage />} />
          <Route path="/employees/new" element={<RequirePermission permission={PERMISSIONS.EMPLOYEE_CREATE}><EmployeeFormPage /></RequirePermission>} />
          <Route path="/employees/:employeeId" element={<EmployeeDetailPage />} />
          <Route path="/employees/:employeeId/edit" element={<RequirePermission permission={PERMISSIONS.EMPLOYEE_UPDATE}><EmployeeFormPage /></RequirePermission>} />

          <Route path="/contracts" element={<RequirePermission permission={PERMISSIONS.CONTRACT_READ}><ContractsListPage /></RequirePermission>} />
          <Route path="/contracts/new" element={<RequirePermission permission={PERMISSIONS.CONTRACT_CREATE}><ContractFormPage /></RequirePermission>} />
          <Route path="/contracts/:contractId" element={<RequirePermission permission={PERMISSIONS.CONTRACT_READ}><ContractDetailPage /></RequirePermission>} />
          <Route path="/contracts/:contractId/edit" element={<RequirePermission permission={PERMISSIONS.CONTRACT_UPDATE}><ContractFormPage /></RequirePermission>} />

          <Route path="/schedules" element={<RequirePermission permission={PERMISSIONS.SCHEDULE_READ}><SchedulesListPage /></RequirePermission>} />
          <Route path="/schedules/new" element={<RequirePermission permission={PERMISSIONS.SCHEDULE_MANAGE}><ScheduleFormPage /></RequirePermission>} />
          <Route path="/schedules/:scheduleId" element={<RequirePermission permission={PERMISSIONS.SCHEDULE_READ}><ScheduleDetailPage /></RequirePermission>} />
          <Route path="/schedules/:scheduleId/edit" element={<RequirePermission permission={PERMISSIONS.SCHEDULE_MANAGE}><ScheduleFormPage /></RequirePermission>} />

          <Route path="/attendance" element={<AttendanceListPage />} />
          <Route path="/attendance/new" element={<RequirePermission permission={PERMISSIONS.ATTENDANCE_CORRECT}><AttendanceFormPage /></RequirePermission>} />
          <Route path="/attendance/:attendanceId" element={<AttendanceDetailPage />} />
          <Route path="/attendance/:attendanceId/edit" element={<RequirePermission permission={PERMISSIONS.ATTENDANCE_CORRECT}><AttendanceFormPage /></RequirePermission>} />

          <Route path="/time-off/requests" element={<RequestsListPage />} />
          <Route path="/time-off/requests/new" element={<RequestFormPage />} />
          <Route path="/time-off/requests/:requestId" element={<RequestDetailPage />} />

          <Route path="/time-off/allocations" element={<RequirePermission permission={PERMISSIONS.TIMEOFF_READ_ALL}><AllocationsListPage /></RequirePermission>} />
          <Route path="/time-off/allocations/new" element={<RequirePermission permission={PERMISSIONS.TIMEOFF_ALLOCATE}><AllocationFormPage /></RequirePermission>} />
          <Route path="/time-off/allocations/:allocationId" element={<RequirePermission permission={PERMISSIONS.TIMEOFF_READ_ALL}><AllocationDetailPage /></RequirePermission>} />

          <Route path="/time-off/types" element={<TimeOffTypesListPage />} />
          <Route path="/time-off/types/new" element={<RequirePermission permission={PERMISSIONS.TIMEOFF_CONFIGURE}><TimeOffTypeFormPage /></RequirePermission>} />
          <Route path="/time-off/types/:typeId" element={<TimeOffTypeDetailPage />} />
          <Route path="/time-off/types/:typeId/edit" element={<RequirePermission permission={PERMISSIONS.TIMEOFF_CONFIGURE}><TimeOffTypeFormPage /></RequirePermission>} />

          <Route path="/payroll/payruns" element={<RequirePermission permission={PERMISSIONS.PAYRUN_READ}><PayrunsListPage /></RequirePermission>} />
          <Route path="/payroll/payruns/new" element={<RequirePermission permission={PERMISSIONS.PAYRUN_CREATE}><PayrunWizardPage /></RequirePermission>} />
          <Route path="/payroll/payruns/:payrunId" element={<RequirePermission permission={PERMISSIONS.PAYRUN_READ}><PayrunDetailPage /></RequirePermission>} />

          <Route path="/payroll/payslips" element={<RequirePermission permission={[PERMISSIONS.PAYSLIP_READ_SELF, PERMISSIONS.PAYSLIP_READ_ALL]}><PayslipsListPage /></RequirePermission>} />
          <Route path="/payroll/payslips/:payslipId" element={<RequirePermission permission={[PERMISSIONS.PAYSLIP_READ_SELF, PERMISSIONS.PAYSLIP_READ_ALL]}><PayslipDetailPage /></RequirePermission>} />

          <Route path="/payroll/salary-structures" element={<RequirePermission permission={PERMISSIONS.SALARY_STRUCTURE_READ}><SalaryStructuresListPage /></RequirePermission>} />
          <Route path="/payroll/salary-structures/new" element={<RequirePermission permission={PERMISSIONS.SALARY_STRUCTURE_MANAGE}><SalaryStructureFormPage /></RequirePermission>} />
          <Route path="/payroll/salary-structures/:id" element={<RequirePermission permission={PERMISSIONS.SALARY_STRUCTURE_READ}><SalaryStructureDetailPage /></RequirePermission>} />
          <Route path="/payroll/salary-structures/:id/edit" element={<RequirePermission permission={PERMISSIONS.SALARY_STRUCTURE_MANAGE}><SalaryStructureFormPage /></RequirePermission>} />

          <Route path="/payroll/salary-rules" element={<RequirePermission permission={PERMISSIONS.SALARY_RULE_READ}><SalaryRulesListPage /></RequirePermission>} />
          <Route path="/payroll/salary-rules/new" element={<RequirePermission permission={PERMISSIONS.SALARY_RULE_MANAGE}><SalaryRuleFormPage /></RequirePermission>} />
          <Route path="/payroll/salary-rules/:id" element={<RequirePermission permission={PERMISSIONS.SALARY_RULE_READ}><SalaryRuleDetailPage /></RequirePermission>} />
          <Route path="/payroll/salary-rules/:id/edit" element={<RequirePermission permission={PERMISSIONS.SALARY_RULE_MANAGE}><SalaryRuleFormPage /></RequirePermission>} />

          <Route path="/payroll/dashboard" element={<RequirePermission permission={PERMISSIONS.DASHBOARD_READ}><PayrollDashboardPage /></RequirePermission>} />
          <Route path="/admin/audit-logs" element={<RequirePermission permission={PERMISSIONS.USER_MANAGE}><AuditLogsPage /></RequirePermission>} />
          <Route path="/reports" element={<RequirePermission permission={PERMISSIONS.DASHBOARD_READ}><ReportsPage /></RequirePermission>} />

          <Route path="/admin/users" element={<RequirePermission permission={PERMISSIONS.USER_MANAGE}><AdminUsersPage /></RequirePermission>} />

          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  )
}
