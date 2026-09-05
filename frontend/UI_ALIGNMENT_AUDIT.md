# Reference supplied and reviewed

The missing reference has now been supplied. See [EXCALIDRAW_COMPLIANCE.md](EXCALIDRAW_COMPLIANCE.md) for the current 29-frame assessment, implemented changes, exact frozen-API gaps, and latest verification. The inventory below records the initial theme pass.

# PeoplePay360 frontend alignment audit

## Scope and source of truth

The existing frontend is the source of truth for fields, actions, API usage, and routing. The supplied prompt defines the Odoo presentation. The reference was missing during the initial theme pass and has now been reviewed in the linked compliance report.

## Implementation

- Shared light theme, 46px purple navbar, 220px sidebar and breadcrumbs.
- Compact buttons, inputs, tables, form sheets, badges, modal, notebook and smart buttons.
- Four primary payroll KPI cards; all other existing metrics retained as secondary KPIs.
- Existing employee list/kanban, filter, pagination and record actions retained.
- Contract, leave/allocation, payrun and payslip status bars use existing domain statuses.
- Two-step payrun progress sits over existing eligibility and creation handlers.
- Attendance dates now link to the existing detail route.
- Labels, forwarded form refs, focus states, modal Escape/focus restoration, mobile navigation.

## Routes and current screen inventory

### `/login` ? Login

- Screen: `frontend/src/pages/Login.jsx`
- Type: dashboard / utility.
- Fields: Existing page-specific controls and read-only values retained.
- Table columns: Not a table screen.
- Data reads: Inherited/shared data or navigation only.
- Mutation service handlers: See existing component handlers; no new domain mutation added.
- Excalidraw status: see the current frame assessment in EXCALIDRAW_COMPLIANCE.md.

### `/employees` ? EmployeesListPage

- Screen: `frontend/src/pages/employees/EmployeesListPage.jsx`
- Type: list.
- Fields: Existing page-specific controls and read-only values retained.
- Table columns: Name, Email, Department, Manager, Schedule, Active
- Data reads: employeeService.list, masterDataService.departments
- Mutation service handlers: See existing component handlers; no new domain mutation added.
- Excalidraw status: see the current frame assessment in EXCALIDRAW_COMPLIANCE.md.

### `/employees/new` ? EmployeeFormPage

- Screen: `frontend/src/pages/employees/EmployeeFormPage.jsx`
- Type: form / edit.
- Fields: Full name, Email, Phone, Bank account, Department, Job position, Employee type, Working schedule, Manager
- Table columns: Not a table screen.
- Data reads: employeeService.get, masterDataService.departments, masterDataService.jobPositions, masterDataService.employeeTypes, scheduleService.list, employeeService.list
- Mutation service handlers: See existing component handlers; no new domain mutation added.
- Excalidraw status: see the current frame assessment in EXCALIDRAW_COMPLIANCE.md.

### `/employees/:employeeId` ? EmployeeDetailPage

- Screen: `frontend/src/pages/employees/EmployeeDetailPage.jsx`
- Type: record detail.
- Fields: Existing page-specific controls and read-only values retained.
- Table columns: Reference, Start, End, Wage, Status, Date, Check In, Check Out, Hours, Type, From, To, Days, Allocated, Taken, Remaining
- Data reads: employeeService.get, employeeService.contracts, employeeService.attendance, employeeService.timeOff, employeeService.allocations
- Mutation service handlers: See existing component handlers; no new domain mutation added.
- Excalidraw status: see the current frame assessment in EXCALIDRAW_COMPLIANCE.md.

### `/employees/:employeeId/edit` ? EmployeeFormPage

- Screen: `frontend/src/pages/employees/EmployeeFormPage.jsx`
- Type: form / edit.
- Fields: Full name, Email, Phone, Bank account, Department, Job position, Employee type, Working schedule, Manager
- Table columns: Not a table screen.
- Data reads: employeeService.get, masterDataService.departments, masterDataService.jobPositions, masterDataService.employeeTypes, scheduleService.list, employeeService.list
- Mutation service handlers: See existing component handlers; no new domain mutation added.
- Excalidraw status: see the current frame assessment in EXCALIDRAW_COMPLIANCE.md.

### `/contracts` ? ContractsListPage

- Screen: `frontend/src/pages/contracts/ContractsListPage.jsx`
- Type: list.
- Fields: Existing page-specific controls and read-only values retained.
- Table columns: Employee, Reference, Start, End, Wage, Structure, Status
- Data reads: contractService.list
- Mutation service handlers: See existing component handlers; no new domain mutation added.
- Excalidraw status: see the current frame assessment in EXCALIDRAW_COMPLIANCE.md.

### `/contracts/new` ? ContractFormPage

- Screen: `frontend/src/pages/contracts/ContractFormPage.jsx`
- Type: form / edit.
- Fields: Employee, Reference, Start date, End date (leave blank if ongoing), Wage (monthly), Status, Salary structure, Working schedule, Department, Job position
- Table columns: Not a table screen.
- Data reads: contractService.get, employeeService.list, masterDataService.departments, masterDataService.jobPositions, salaryService.structures, scheduleService.list
- Mutation service handlers: See existing component handlers; no new domain mutation added.
- Excalidraw status: see the current frame assessment in EXCALIDRAW_COMPLIANCE.md.

### `/contracts/:contractId` ? ContractDetailPage

- Screen: `frontend/src/pages/contracts/ContractDetailPage.jsx`
- Type: record detail.
- Fields: Existing page-specific controls and read-only values retained.
- Table columns: Not a table screen.
- Data reads: contractService.get
- Mutation service handlers: See existing component handlers; no new domain mutation added.
- Excalidraw status: see the current frame assessment in EXCALIDRAW_COMPLIANCE.md.

### `/contracts/:contractId/edit` ? ContractFormPage

- Screen: `frontend/src/pages/contracts/ContractFormPage.jsx`
- Type: form / edit.
- Fields: Employee, Reference, Start date, End date (leave blank if ongoing), Wage (monthly), Status, Salary structure, Working schedule, Department, Job position
- Table columns: Not a table screen.
- Data reads: contractService.get, employeeService.list, masterDataService.departments, masterDataService.jobPositions, salaryService.structures, scheduleService.list
- Mutation service handlers: See existing component handlers; no new domain mutation added.
- Excalidraw status: see the current frame assessment in EXCALIDRAW_COMPLIANCE.md.

### `/schedules` ? SchedulesListPage

- Screen: `frontend/src/pages/schedules/SchedulesListPage.jsx`
- Type: list.
- Fields: Existing page-specific controls and read-only values retained.
- Table columns: Name, Type, Weekly Hours, Status
- Data reads: scheduleService.list
- Mutation service handlers: See existing component handlers; no new domain mutation added.
- Excalidraw status: see the current frame assessment in EXCALIDRAW_COMPLIANCE.md.

### `/schedules/new` ? ScheduleFormPage

- Screen: `frontend/src/pages/schedules/ScheduleFormPage.jsx`
- Type: form / edit.
- Fields: Schedule name, Type
- Table columns: Day, Start, End, Break (hrs), Duration
- Data reads: scheduleService.get
- Mutation service handlers: See existing component handlers; no new domain mutation added.
- Excalidraw status: see the current frame assessment in EXCALIDRAW_COMPLIANCE.md.

### `/schedules/:scheduleId` ? ScheduleDetailPage

- Screen: `frontend/src/pages/schedules/ScheduleDetailPage.jsx`
- Type: record detail.
- Fields: Existing page-specific controls and read-only values retained.
- Table columns: Day, Start, End, Break, Duration
- Data reads: scheduleService.get
- Mutation service handlers: See existing component handlers; no new domain mutation added.
- Excalidraw status: see the current frame assessment in EXCALIDRAW_COMPLIANCE.md.

### `/schedules/:scheduleId/edit` ? ScheduleFormPage

- Screen: `frontend/src/pages/schedules/ScheduleFormPage.jsx`
- Type: form / edit.
- Fields: Schedule name, Type
- Table columns: Day, Start, End, Break (hrs), Duration
- Data reads: scheduleService.get
- Mutation service handlers: See existing component handlers; no new domain mutation added.
- Excalidraw status: see the current frame assessment in EXCALIDRAW_COMPLIANCE.md.

### `/attendance` ? AttendanceListPage

- Screen: `frontend/src/pages/attendance/AttendanceListPage.jsx`
- Type: list.
- Fields: Existing page-specific controls and read-only values retained.
- Table columns: Date, Employee, Check In, Check Out, Worked Hours, Status
- Data reads: attendanceService.list
- Mutation service handlers: attendanceService.checkIn, attendanceService.checkOut
- Excalidraw status: see the current frame assessment in EXCALIDRAW_COMPLIANCE.md.

### `/attendance/new` ? AttendanceFormPage

- Screen: `frontend/src/pages/attendance/AttendanceFormPage.jsx`
- Type: form / edit.
- Fields: Employee, Date, Check in, Check out, Correction reason
- Table columns: Not a table screen.
- Data reads: attendanceService.get, employeeService.list
- Mutation service handlers: See existing component handlers; no new domain mutation added.
- Excalidraw status: see the current frame assessment in EXCALIDRAW_COMPLIANCE.md.

### `/attendance/:attendanceId` ? AttendanceDetailPage

- Screen: `frontend/src/pages/attendance/AttendanceDetailPage.jsx`
- Type: record detail.
- Fields: Existing page-specific controls and read-only values retained.
- Table columns: Not a table screen.
- Data reads: attendanceService.get
- Mutation service handlers: See existing component handlers; no new domain mutation added.
- Excalidraw status: see the current frame assessment in EXCALIDRAW_COMPLIANCE.md.

### `/attendance/:attendanceId/edit` ? AttendanceFormPage

- Screen: `frontend/src/pages/attendance/AttendanceFormPage.jsx`
- Type: form / edit.
- Fields: Employee, Date, Check in, Check out, Correction reason
- Table columns: Not a table screen.
- Data reads: attendanceService.get, employeeService.list
- Mutation service handlers: See existing component handlers; no new domain mutation added.
- Excalidraw status: see the current frame assessment in EXCALIDRAW_COMPLIANCE.md.

### `/time-off/requests` ? RequestsListPage

- Screen: `frontend/src/pages/timeoff/RequestsListPage.jsx`
- Type: list.
- Fields: Existing page-specific controls and read-only values retained.
- Table columns: Employee, Type, From, To, Days, Status
- Data reads: timeOffService.requests
- Mutation service handlers: See existing component handlers; no new domain mutation added.
- Excalidraw status: see the current frame assessment in EXCALIDRAW_COMPLIANCE.md.

### `/time-off/requests/new` ? RequestFormPage

- Screen: `frontend/src/pages/timeoff/RequestFormPage.jsx`
- Type: form / edit.
- Fields: Employee, Time off type, From, To, Reason
- Table columns: Not a table screen.
- Data reads: employeeService.list, timeOffService.types
- Mutation service handlers: timeOffService.createRequest
- Excalidraw status: see the current frame assessment in EXCALIDRAW_COMPLIANCE.md.

### `/time-off/requests/:requestId` ? RequestDetailPage

- Screen: `frontend/src/pages/timeoff/RequestDetailPage.jsx`
- Type: record detail.
- Fields: Existing page-specific controls and read-only values retained.
- Table columns: Not a table screen.
- Data reads: timeOffService.getRequest
- Mutation service handlers: timeOffService.approveRequest, timeOffService.refuseRequest
- Excalidraw status: see the current frame assessment in EXCALIDRAW_COMPLIANCE.md.

### `/time-off/allocations` ? AllocationsListPage

- Screen: `frontend/src/pages/timeoff/AllocationsListPage.jsx`
- Type: list.
- Fields: Existing page-specific controls and read-only values retained.
- Table columns: Employee, Type, Allocated, Taken, Remaining, Valid, Status
- Data reads: timeOffService.allocations
- Mutation service handlers: See existing component handlers; no new domain mutation added.
- Excalidraw status: see the current frame assessment in EXCALIDRAW_COMPLIANCE.md.

### `/time-off/allocations/new` ? AllocationFormPage

- Screen: `frontend/src/pages/timeoff/AllocationFormPage.jsx`
- Type: form / edit.
- Fields: Employee, Time off type, Allocation name, Days allocated, Valid from, Valid to
- Table columns: Not a table screen.
- Data reads: employeeService.list, timeOffService.types
- Mutation service handlers: timeOffService.createAllocation
- Excalidraw status: see the current frame assessment in EXCALIDRAW_COMPLIANCE.md.

### `/time-off/allocations/:allocationId` ? AllocationDetailPage

- Screen: `frontend/src/pages/timeoff/AllocationDetailPage.jsx`
- Type: record detail.
- Fields: Existing page-specific controls and read-only values retained.
- Table columns: Not a table screen.
- Data reads: timeOffService.allocations
- Mutation service handlers: timeOffService.approveAllocation, timeOffService.refuseAllocation
- Excalidraw status: see the current frame assessment in EXCALIDRAW_COMPLIANCE.md.

### `/time-off/types` ? TimeOffTypesListPage

- Screen: `frontend/src/pages/timeoff/TimeOffTypesListPage.jsx`
- Type: list.
- Fields: Existing page-specific controls and read-only values retained.
- Table columns: Name, Code, Unit, Requires Allocation, Approval Required, Status
- Data reads: timeOffService.types
- Mutation service handlers: See existing component handlers; no new domain mutation added.
- Excalidraw status: see the current frame assessment in EXCALIDRAW_COMPLIANCE.md.

### `/time-off/types/new` ? TimeOffTypeFormPage

- Screen: `frontend/src/pages/timeoff/TimeOffTypeFormPage.jsx`
- Type: form / edit.
- Fields: Name, Code, Unit
- Table columns: Not a table screen.
- Data reads: timeOffService.types
- Mutation service handlers: See existing component handlers; no new domain mutation added.
- Excalidraw status: see the current frame assessment in EXCALIDRAW_COMPLIANCE.md.

### `/time-off/types/:typeId` ? TimeOffTypeDetailPage

- Screen: `frontend/src/pages/timeoff/TimeOffTypeDetailPage.jsx`
- Type: record detail.
- Fields: Existing page-specific controls and read-only values retained.
- Table columns: Not a table screen.
- Data reads: timeOffService.types
- Mutation service handlers: See existing component handlers; no new domain mutation added.
- Excalidraw status: see the current frame assessment in EXCALIDRAW_COMPLIANCE.md.

### `/time-off/types/:typeId/edit` ? TimeOffTypeFormPage

- Screen: `frontend/src/pages/timeoff/TimeOffTypeFormPage.jsx`
- Type: form / edit.
- Fields: Name, Code, Unit
- Table columns: Not a table screen.
- Data reads: timeOffService.types
- Mutation service handlers: See existing component handlers; no new domain mutation added.
- Excalidraw status: see the current frame assessment in EXCALIDRAW_COMPLIANCE.md.

### `/payroll/payruns` ? PayrunsListPage

- Screen: `frontend/src/pages/payroll/PayrunsListPage.jsx`
- Type: list.
- Fields: Existing page-specific controls and read-only values retained.
- Table columns: Name, Period, Employees, Total Net, Status
- Data reads: payrollService.listPayruns
- Mutation service handlers: See existing component handlers; no new domain mutation added.
- Excalidraw status: see the current frame assessment in EXCALIDRAW_COMPLIANCE.md.

### `/payroll/payruns/new` ? PayrunWizardPage

- Screen: `frontend/src/pages/payroll/PayrunWizardPage.jsx`
- Type: wizard.
- Fields: Salary structure, Period start, Period end, Department (optional filter)
- Table columns: Employee, Department, Employee Type, Contract, Wage, Eligibility
- Data reads: salaryService.structures, masterDataService.departments
- Mutation service handlers: payrollService.wizardEligibility, payrollService.createPayrun
- Excalidraw status: see the current frame assessment in EXCALIDRAW_COMPLIANCE.md.

### `/payroll/payruns/:payrunId` ? PayrunDetailPage

- Screen: `frontend/src/pages/payroll/PayrunDetailPage.jsx`
- Type: record detail.
- Fields: Existing page-specific controls and read-only values retained.
- Table columns: Employee, Contract, Worked Days, Basic, Gross, Net, Status
- Data reads: payrollService.getPayrun
- Mutation service handlers: payrollService.compute, payrollService.validate, payrollService.markPaid, payrollService.sendPayslips
- Excalidraw status: see the current frame assessment in EXCALIDRAW_COMPLIANCE.md.

### `/payroll/payslips` ? PayslipsListPage

- Screen: `frontend/src/pages/payroll/PayslipsListPage.jsx`
- Type: list.
- Fields: Existing page-specific controls and read-only values retained.
- Table columns: Employee, Period, Basic, Gross, Net, Status
- Data reads: payrollService.listPayslips
- Mutation service handlers: See existing component handlers; no new domain mutation added.
- Excalidraw status: see the current frame assessment in EXCALIDRAW_COMPLIANCE.md.

### `/payroll/payslips/:payslipId` ? PayslipDetailPage

- Screen: `frontend/src/pages/payroll/PayslipDetailPage.jsx`
- Type: record detail.
- Fields: Existing page-specific controls and read-only values retained.
- Table columns: Seq, Rule, Code, Category, Amount
- Data reads: payrollService.getPayslip
- Mutation service handlers: See existing component handlers; no new domain mutation added.
- Excalidraw status: see the current frame assessment in EXCALIDRAW_COMPLIANCE.md.

### `/payroll/salary-structures` ? SalaryStructuresListPage

- Screen: `frontend/src/pages/salary/SalaryStructuresListPage.jsx`
- Type: list.
- Fields: Existing page-specific controls and read-only values retained.
- Table columns: Name, Code, Rules, Contracts using, Status
- Data reads: salaryService.structures
- Mutation service handlers: See existing component handlers; no new domain mutation added.
- Excalidraw status: see the current frame assessment in EXCALIDRAW_COMPLIANCE.md.

### `/payroll/salary-structures/new` ? SalaryStructureFormPage

- Screen: `frontend/src/pages/salary/SalaryStructureFormPage.jsx`
- Type: form / edit.
- Fields: Name, Code, Description
- Table columns: Not a table screen.
- Data reads: salaryService.getStructure
- Mutation service handlers: See existing component handlers; no new domain mutation added.
- Excalidraw status: see the current frame assessment in EXCALIDRAW_COMPLIANCE.md.

### `/payroll/salary-structures/:id` ? SalaryStructureDetailPage

- Screen: `frontend/src/pages/salary/SalaryStructureDetailPage.jsx`
- Type: record detail.
- Fields: Existing page-specific controls and read-only values retained.
- Table columns: Seq, Name, Code, Category, Computation, Value, Status
- Data reads: salaryService.getStructure
- Mutation service handlers: See existing component handlers; no new domain mutation added.
- Excalidraw status: see the current frame assessment in EXCALIDRAW_COMPLIANCE.md.

### `/payroll/salary-structures/:id/edit` ? SalaryStructureFormPage

- Screen: `frontend/src/pages/salary/SalaryStructureFormPage.jsx`
- Type: form / edit.
- Fields: Name, Code, Description
- Table columns: Not a table screen.
- Data reads: salaryService.getStructure
- Mutation service handlers: See existing component handlers; no new domain mutation added.
- Excalidraw status: see the current frame assessment in EXCALIDRAW_COMPLIANCE.md.

### `/payroll/salary-rules` ? SalaryRulesListPage

- Screen: `frontend/src/pages/salary/SalaryRulesListPage.jsx`
- Type: list.
- Fields: Existing page-specific controls and read-only values retained.
- Table columns: Seq, Name, Code, Category, Computation, Status
- Data reads: salaryService.structures, salaryService.rules
- Mutation service handlers: See existing component handlers; no new domain mutation added.
- Excalidraw status: see the current frame assessment in EXCALIDRAW_COMPLIANCE.md.

### `/payroll/salary-rules/new` ? SalaryRuleFormPage

- Screen: `frontend/src/pages/salary/SalaryRuleFormPage.jsx`
- Type: form / edit.
- Fields: Salary structure, Name, Code, Category, Sequence, Computation type, Fixed amount, Percentage, Base rule code, Formula
- Table columns: Not a table screen.
- Data reads: salaryService.structures, salaryService.getRule
- Mutation service handlers: See existing component handlers; no new domain mutation added.
- Excalidraw status: see the current frame assessment in EXCALIDRAW_COMPLIANCE.md.

### `/payroll/salary-rules/:id` ? SalaryRuleDetailPage

- Screen: `frontend/src/pages/salary/SalaryRuleDetailPage.jsx`
- Type: record detail.
- Fields: Existing page-specific controls and read-only values retained.
- Table columns: Not a table screen.
- Data reads: salaryService.getRule
- Mutation service handlers: See existing component handlers; no new domain mutation added.
- Excalidraw status: see the current frame assessment in EXCALIDRAW_COMPLIANCE.md.

### `/payroll/salary-rules/:id/edit` ? SalaryRuleFormPage

- Screen: `frontend/src/pages/salary/SalaryRuleFormPage.jsx`
- Type: form / edit.
- Fields: Salary structure, Name, Code, Category, Sequence, Computation type, Fixed amount, Percentage, Base rule code, Formula
- Table columns: Not a table screen.
- Data reads: salaryService.structures, salaryService.getRule
- Mutation service handlers: See existing component handlers; no new domain mutation added.
- Excalidraw status: see the current frame assessment in EXCALIDRAW_COMPLIANCE.md.

### `/payroll/dashboard` ? PayrollDashboardPage

- Screen: `frontend/src/pages/payroll/PayrollDashboardPage.jsx`
- Type: dashboard / utility.
- Fields: Existing page-specific controls and read-only values retained.
- Table columns: Department, Headcount, Total Salary Expenditure
- Data reads: masterDataService.departments, masterDataService.employeeTypes, dashboardService.payroll
- Mutation service handlers: See existing component handlers; no new domain mutation added.
- Excalidraw status: see the current frame assessment in EXCALIDRAW_COMPLIANCE.md.

### `/reports` ? ReportsPage

- Screen: `frontend/src/pages/ReportsPage.jsx`
- Type: dashboard / utility.
- Fields: Existing page-specific controls and read-only values retained.
- Table columns: Not a table screen.
- Data reads: Inherited/shared data or navigation only.
- Mutation service handlers: See existing component handlers; no new domain mutation added.
- Excalidraw status: see the current frame assessment in EXCALIDRAW_COMPLIANCE.md.

### `/admin/users` ? AdminUsersPage

- Screen: `frontend/src/pages/admin/AdminUsersPage.jsx`
- Type: dashboard / utility.
- Fields: Existing page-specific controls and read-only values retained.
- Table columns: Name, Email, Roles, Status
- Data reads: userService.list, userService.roles
- Mutation service handlers: userService.updateRoles
- Excalidraw status: see the current frame assessment in EXCALIDRAW_COMPLIANCE.md.

### `*` ? NotFoundPage

- Screen: `frontend/src/pages/NotFoundPage.jsx`
- Type: dashboard / utility.
- Fields: Existing page-specific controls and read-only values retained.
- Table columns: Not a table screen.
- Data reads: Inherited/shared data or navigation only.
- Mutation service handlers: See existing component handlers; no new domain mutation added.
- Excalidraw status: see the current frame assessment in EXCALIDRAW_COMPLIANCE.md.

## Verification

- Production build: passed (`npm run build`). Vite warns about a ~899 kB JS chunk (253 kB gzip).
- Vitest: 22 tests passed across 6 files. React Router emits migration advisories for v7.
- Lint/typecheck: not configured in package.json.
- Real API browser smoke: 42 authenticated routes loaded at 1440, 1280, 768, and 390 px, plus login/logout. No page-level horizontal overflow or runtime/console errors in the checked authenticated flows.
- Visually reviewed desktop employee list/detail/form, dashboard and payrun wizard, plus mobile employee list and login.
- Browser result details: `ui-audit/results.json`; screenshots: `ui-audit/*.png`.
- Repeat smoke: `node scripts/ui-smoke.mjs` with local frontend/API running and Microsoft Edge installed. Optional UI_BASE_URL/UI_API_URL/UI_EMAIL/UI_PASSWORD environment variables.
- Computed light theme, text contrast palette, and 46px purple navbar.
- Employee list/kanban toggle and real API search.
- Employee notebook navigation.
- Role modal opens and closes without saving.
- Employee edit loads persisted values and Cancel returns to detail.
- Real payrun eligibility advances to step 2 and Back preserves step 1.
- Existing payslip PDF download.
- Sidebar navigation works at 768px.
- Sidebar navigation works at 390px.
- Logout returns to login.

## Source integrity

- Frozen backend/API/auth/routing source changes relative to the start of this task: 0.
- No dependencies added. No business engines or database schema changed.
- The earlier requirements.txt fix belongs to the preceding dependency task and is unchanged by this UI task.
- This workspace has no .git directory and Git is unavailable; reviewed a generated unified diff against a pre-edit backup instead.

## Remaining limits

- Current frame mapping and remaining API constraints are documented in EXCALIDRAW_COMPLIANCE.md.
- Real-data smoke checks avoid saves, role changes, leave decisions, attendance recording, payroll transitions, and email sending. Form binding and the wizard creation payload are tested with isolated test doubles; full live mutation coverage is not claimed.
- No lint or typecheck script is configured. Vite reports a large bundle advisory; no speculative bundling refactor was made.

## Files created

- `src/styles/odoo-theme.css`
- `src/components/OdooTopBar.jsx`
- `src/components/ui.test.jsx`
- `scripts/ui-smoke.mjs`
- `UI_ALIGNMENT_AUDIT.md`
- `.gitignore`

## Files modified

- `src/index.css`
- `src/main.jsx`
- `src/components/Layout.jsx`
- `src/components/ui.jsx`
- `src/pages/Login.jsx`
- `src/pages/NotFoundPage.jsx`
- `src/pages/ReportsPage.jsx`
- `src/pages/admin/AdminUsersPage.jsx`
- `src/pages/attendance/AttendanceDetailPage.jsx`
- `src/pages/attendance/AttendanceFormPage.jsx`
- `src/pages/attendance/AttendanceListPage.jsx`
- `src/pages/contracts/ContractDetailPage.jsx`
- `src/pages/contracts/ContractFormPage.jsx`
- `src/pages/contracts/ContractsListPage.jsx`
- `src/pages/employees/EmployeeDetailPage.jsx`
- `src/pages/employees/EmployeeFormPage.jsx`
- `src/pages/employees/EmployeesListPage.jsx`
- `src/pages/payroll/PayrollDashboardPage.jsx`
- `src/pages/payroll/PayrunDetailPage.jsx`
- `src/pages/payroll/PayrunsListPage.jsx`
- `src/pages/payroll/PayrunWizardPage.jsx`
- `src/pages/payroll/PayrunWizardPage.test.jsx`
- `src/pages/payroll/PayslipDetailPage.jsx`
- `src/pages/payroll/PayslipsListPage.jsx`
- `src/pages/salary/SalaryRuleDetailPage.jsx`
- `src/pages/salary/SalaryRuleFormPage.jsx`
- `src/pages/salary/SalaryRulesListPage.jsx`
- `src/pages/salary/SalaryStructureDetailPage.jsx`
- `src/pages/salary/SalaryStructureFormPage.jsx`
- `src/pages/salary/SalaryStructuresListPage.jsx`
- `src/pages/schedules/ScheduleDetailPage.jsx`
- `src/pages/schedules/ScheduleFormPage.jsx`
- `src/pages/schedules/SchedulesListPage.jsx`
- `src/pages/timeoff/AllocationDetailPage.jsx`
- `src/pages/timeoff/AllocationFormPage.jsx`
- `src/pages/timeoff/AllocationsListPage.jsx`
- `src/pages/timeoff/RequestDetailPage.jsx`
- `src/pages/timeoff/RequestFormPage.jsx`
- `src/pages/timeoff/RequestsListPage.jsx`
- `src/pages/timeoff/TimeOffTypeDetailPage.jsx`
- `src/pages/timeoff/TimeOffTypeFormPage.jsx`
- `src/pages/timeoff/TimeOffTypesListPage.jsx`
- `tailwind.config.js`
- `index.html`
