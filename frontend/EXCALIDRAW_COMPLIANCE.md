# Excalidraw compliance - PeoplePay360

Reference: `C:/Users/udays/Downloads/HRMS OXP - 24 hours.excalidraw.png` (12146 - 17637).

All 29 screen/popup frames and the connected navigation and yellow notes were reviewed using full-resolution crops. The image is a UI/workflow specification, not authorization to change backend rules. Its dark appearance is superseded by the requested Odoo light theme. Names, amounts, counts, company names and dates in the image are illustrative; production screens continue to use real API data.

## Frame inventory and disposition

| # | Reference frame | Application route / entry | Fields, controls, workflow and disposition |
|---|---|---|---|
| 1 | Login | `/login` | Work email, password, sign in, administrator-owned accounts. Existing login preserved. Initial passwords required by current API; reset/invitation/SSO are explicitly optional notes and have no endpoints. |
| 2 | User Management / Create/Edit User | `/admin/users`, New User / Edit user / Edit roles modals | Search, role filter, name, work email, linked employee, roles, active status; creation and account editing wired to existing services. Employee links displayed where present. Own role editing is not offered. Selecting/linking an existing employee is blocked by API (see below). |
| 3 | Employee kanban | `/employees`, Kanban view | Initials, name, job position, department, status, New, search and view switch. Real records navigate to detail. |
| 4 | Employee list | `/employees`, List view | Name, email, job position, department, status plus pre-existing manager/schedule columns. Server search and pagination retained. |
| 5 | Employee record | `/employees/:employeeId` and `/edit` | Identity/job, email/phone, department, manager, schedule, active status, private bank detail; related Contracts, Attendance, Time Off and Allocations smart buttons/notebook. Company and work location unavailable. Work/Private Information tabs preserve the existing work fields and private phone/bank details. |
| 6 | Contract list | `/contracts` | Employee, reference, dates, monthly wage, structure, exact API status; search current page, status filter, pagination, New and open record. |
| 7 | Contract record | `/contracts/:contractId`, `/edit` | Employee, department, job position, working schedule, wage, dates, structure and status. Related names resolved through existing read services. Contract history and all resolution rules unchanged. |
| 8 | Working schedules list | `/schedules` | Name, type, days/week derived from actual schedule days, API weekly hours and status; search/open/New. Calendar/list view switch, active filter and working column chooser added; company is unavailable. |
| 9 | Working schedule form | `/schedules/:scheduleId`, `/new`, `/edit` | Name, type, weekly pattern, day/start/end/break/duration, calculated weekly total; actual API values. Existing enabled-day controls serve Add/Remove Day behavior. No company/timezone storage. |
| 10 | Attendance list | `/attendance` | Date, employee, check-in/out, worked hours, status and corrections; Today/date range/employee filter, open detail and manual record actions. Backend employee scoping preserved. |
| 11 | Attendance record | `/attendance/:attendanceId`, `/edit` | Employee identity, department/manager resolved through the existing employee read, date/time, worked hours, status, correction reason and correction action. Separate overtime-hours field is not returned. |
| 12 | Attendance widget | Top-bar clock, My attendance modal | Linked employee identity, today, current check-in status, elapsed clock, Check In/Check Out and record link. Calls existing endpoints and invalidation, no alternative attendance computation. Completed day shows recorded hours. Opening the widget never mutates attendance. |
| 13 | Time Off requests list | `/time-off/requests` | Employee, type, start/end, duration, exact API status; search, status filter, New, open and permission/status-gated Approve/Refuse. My Team has no backend filter. |
| 14 | Time Off request | `/time-off/requests/:requestId` | Employee/type identity, dates, duration, reason, HR comment, state and decision actions. Approver identity/allocation consumed are not returned. |
| 15 | Allocations list | `/time-off/allocations` | Employee, type, allocated/taken/remaining, validity, status; search/New/open. |
| 16 | Allocation record | `/time-off/allocations/:allocationId` | Employee/type identity, allocation name, allocated/taken/remaining, validity, status, Approve/Refuse for existing Draft state. No approver/description API fields. |
| 17 | Time Off types list | `/time-off/types` | Name/code, unit, allocation requirement, approval requirement, status; search/New/open. |
| 18 | Time Off type record | `/time-off/types/:typeId`, `/edit` | Name/code, unit, active, allocation/approval flags, payroll deduction and negative-balance flags. No approver-class, display-color or work-entry-type fields. |
| 19 | Payrun scope popup | `/payroll/payruns/new`, step 1 | Structure, period and supported department scope. Continue calls only eligibility. Existing full-page wizard preserved with Odoo step styling. No employee-type scope API parameter. |
| 20 | Employee selection popup | Same route, step 2 | Search, selection, employee/department/type, contract, wage, eligibility/reason, Back and Create Payrun. Search does not alter the selected set. Only Create calls the creation endpoint. Weekly hours/start date are absent from eligibility response. |
| 21 | Payruns list | `/payroll/payruns` | Name, period, employee count, total net, exact state, search/status filter/New/open. Existing compact table retained (reference uses compact record cards). List API does not include warning summaries. |
| 22 | Payrun record | `/payroll/payruns/:payrunId` | Structure/period, state, Compute/Validate/Mark Paid/Send Payslips, totals and employee payslips. Warning messages made visible in rows; payslip/PDF navigation added. Existing state and permission gates retained. |
| 23 | Payslips list | `/payroll/payslips` | Employee, period, basic/gross/net, status and warning count, search/status filter/open. New/Compute/Mark Paid are payrun-level operations in this application, not standalone payslip mutations. |
| 24 | Payslip record | `/payroll/payslips/:payslipId` | Employee/payrun relationship, period, worked days, basic/gross/net, warnings, ordered rule/category/code/amount breakdown, existing PDF download. Payrun link shown only with payrun-read permission. |
| 25 | Salary structures list | `/payroll/salary-structures` | Name/code, rule count, contracts using, active; search/New/open. Backend `employees_count` counts contracts, so the existing honest label is retained instead of relabeling as employees. |
| 26 | Salary structure record | `/payroll/salary-structures/:id`, `/edit` | Name/code/description, ordered rules, category/code/sequence/computation/value/status, Add Rule and Edit. No salary calculations changed. |
| 27 | Salary rules list | `/payroll/salary-rules` | Name/code/category/sequence/computation/active, structure column/link and filter, search/New/open. |
| 28 | Salary rule record | `/payroll/salary-rules/:id`, `/edit` | Name/code/sequence, linked salary structure, category, type, fixed/percentage/base/formula and active display; Edit. Existing safe formula syntax retained; diagram's Python-code example is not executed or introduced. |
| 29 | Payroll dashboard | `/payroll/dashboard` | Period/department/employee-type filters; actual salary, payslip, approved leave-day and attendance KPIs; department salary and monthly trend charts; alerts, attendance/time-off summaries, department breakdown. No fake status split, company or trend deltas. |

## Connected navigation

- Added `/departments` from the Employees menu reference using existing list/create services. No edit/delete endpoint exists, so none is rendered.
- Time Off Requests, Allocations and Types remain grouped in sidebar navigation, with no separate fake module landing buttons. The image's Time Off Dashboard menu item has no distinct frame; existing time-off reporting is in Payroll Dashboard.
- Payroll Dashboard, Payruns, Payslips, Structures and Rules remain grouped and permission-aware.
- All previous routes remain; Departments is an additive route, with no router architecture change.

## Exact remaining limits under the frozen backend constraint

1. **Employee/account linking:** `UserCreateRequest` accepts email/password/full_name/role_names; `UserUpdateRequest` accepts full_name/is_active/password. Neither accepts employee_id, and EmployeeUpdate has no user_id. New User can create a real account but cannot associate it with an existing employee. The existing EmployeeCreate `create_login` path creates a new employee and login together; it is not a safe substitute for linking existing records.
2. **Own-role enforcement:** the UI withholds own-role editing as the drawing requires. The existing role-update service has no self-change prohibition; this frontend pass does not claim server-side enforcement or modify authentication/authorization.
3. **Unavailable record attributes:** company/work location; schedule company/timezone; attendance overtime amount; request approver and consumed allocation; allocation approver/description; time-off type display color/work-entry type/approver class are absent from the exposed contracts. They are not fabricated.
4. **Search scope:** user, contract, schedule, payrun and payslip APIs lack text-search parameters. These views clearly label search as current-page filtering. Existing server pagination is retained; this is not represented as a global search. No unsupported My Team filter is sent.
5. **Payrun differences:** the application uses a full-page two-step wizard and a table list. The required eligibility-to-create boundary is preserved. Employee type scope, employee start date/weekly hours in eligibility, and list-level warning aggregates are not exposed by the relevant responses.
6. **Payslip actions:** only the existing payrun endpoints can compute/validate/mark paid; no per-payslip equivalent exists. Payslip New/Compute/Mark Paid controls from the drawing are not fabricated. PDF stays on its original endpoint.
7. **Dashboard aggregates:** no filtered payslip-status split or per-leave-type breakdown is returned. The existing monthly trend and Today KPIs are not scoped by all department/type filters in the backend, and department headcount does not honor every selected filter. Those existing semantics remain unchanged and prevent claiming exact dashboard-filter compliance. No frontend reimplementation of those calculations was added.
8. **Visual variants:** list tables retain useful existing columns; the schedule calendar visualizes recurring weekly patterns rather than introducing dated events. The drawing's dark colors and generic statuses (Running/Done) are superseded by the Odoo light palette and exact existing Active/Computed/Validated/Paid domain states.

## Verification

Production build passed. All **26 tests across 8 files** passed. All **43 authenticated routes** loaded at **1440, 1280, 768 and 390 pixels** with **zero detected page overflow and zero runtime/console errors**. Browser interactions passed: employee search and list/kanban, Work/Private and related-record tabs; schedule calendar/list and column chooser; account/role and attendance modals; edit-value loading/cancel; real eligibility step/Back; PDF download; mobile navigation and logout. Screenshots and results are in `ui-audit/`. No lint/typecheck scripts are configured. Vite emits the existing bundle-size advisory (~918 kB JS / 258 kB gzip); React Router tests emit v7 migration advisories. Test doubles are used only inside isolated tests. Production UI uses existing services with no mock fallback. Browser verification avoids creating users/departments, recording attendance, approving leave, changing roles or performing payroll transitions.

## Files introduced in this reference pass

- `src/components/AttendanceWidget.jsx`
- `src/components/AttendanceWidget.test.jsx`
- `src/components/ListSearch.jsx`
- `src/components/RequestActions.jsx`
- `src/pages/admin/AdminUsersPage.test.jsx`
- `src/pages/employees/DepartmentsPage.jsx`
- `EXCALIDRAW_COMPLIANCE.md`

## Files updated in this reference pass

- `src/App.jsx`
- `src/components/Layout.jsx`
- `src/components/OdooTopBar.jsx`
- `src/styles/odoo-theme.css`
- `src/pages/admin/AdminUsersPage.jsx`
- `src/pages/attendance/AttendanceDetailPage.jsx`
- `src/pages/attendance/AttendanceListPage.jsx`
- `src/pages/contracts/ContractDetailPage.jsx`
- `src/pages/contracts/ContractsListPage.jsx`
- `src/pages/employees/EmployeeDetailPage.jsx`
- `src/pages/employees/EmployeesListPage.jsx`
- `src/pages/payroll/PayrollDashboardPage.jsx`
- `src/pages/payroll/PayrunDetailPage.jsx`
- `src/pages/payroll/PayrunsListPage.jsx`
- `src/pages/payroll/PayrunWizardPage.jsx`
- `src/pages/payroll/PayslipDetailPage.jsx`
- `src/pages/payroll/PayslipsListPage.jsx`
- `src/pages/salary/SalaryRuleDetailPage.jsx`
- `src/pages/salary/SalaryRulesListPage.jsx`
- `src/pages/salary/SalaryStructuresListPage.jsx`
- `src/pages/schedules/ScheduleDetailPage.jsx`
- `src/pages/schedules/SchedulesListPage.jsx`
- `src/pages/timeoff/AllocationDetailPage.jsx`
- `src/pages/timeoff/AllocationsListPage.jsx`
- `src/pages/timeoff/RequestsListPage.jsx`
- `src/pages/timeoff/TimeOffTypesListPage.jsx`
- `scripts/ui-smoke.mjs`
- `UI_ALIGNMENT_AUDIT.md`

## Source integrity

Backend/app, backend/alembic, requirements, frontend service/API/auth/permission modules and route guards match the pre-theme source hashes. App.jsx only adds the authenticated Departments route/import. No domain data was created or changed by verification. Unified diff recorded in `ui-audit/reference-diff.patch`.
