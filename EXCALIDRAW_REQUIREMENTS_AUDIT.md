# PeoplePay360 - Excalidraw requirements audit

Audit date: 6 September 2026
Reference: `HRMS OXP - 24 hours.excalidraw.png` (12146 x 17637). Requirement callouts were read from full-resolution crops, including the attendance quick-action note and payroll calculation note.

## Outcome and evidence

The diagram's core workflows are implemented. This pass found and corrected functional gaps; it was not just a visual comparison. The matrix below maps requirements to implementation and verification. This is an evidence-based audit, not a guarantee that every possible input, browser, race condition, or infrastructure failure has been exercised.

- Backend: 99 tests passed, including 10 new audit regression cases.
- Frontend: 45 tests passed.
- Production build: passed; existing large-bundle warning remains.
- Live browser navigation: 60 role/page combinations across Admin, HR Manager, HR Payroll User, HR Payroll Manager and Employee; no captured JavaScript errors or missing-page results. These were navigation smoke checks, not CRUD tests of every page.
- Follow-up live checks confirmed the employee-link selector, payslip-status dashboard section and schedule Company column.
- Business mutations were verified in the isolated SQLite test database. Live MySQL received migration `829basicwage`; real payrolls were not marked paid or emailed as part of this audit.

## Mandatory flow matrix

| Reference requirement | Implementation / evidence | Result |
|---|---|---|
| Admin-created accounts; login with credentials | `api/v1/users.py`, `auth_service.py`, `Login.jsx`; role API and browser checks | Present |
| Link account to relevant employee when creating user | New searchable employee selector on Users & Roles; API validates employee exists and is not already linked; regression covers duplicate linking | Fixed |
| Assign one or more roles | User creation/role update schemas require a nonempty role list; existing multi-role selector | Present, tightened |
| Modules, records and actions depend on role | Permission-based navigation; server permission dependencies; own-record API tests | Present |
| Users cannot change/elevate their own roles | Existing UI hide plus new API rejection, tested even for Admin | Fixed |
| Role changes affect access | Server reads current persisted permissions instead of relying on old token permission claims; revoked-role test | Fixed |
| Employees in Kanban and List views | `EmployeesListPage.jsx` view controls and linked records | Present, code reviewed |
| Employee HR details and related contracts, attendance, leave and allocations | `EmployeeDetailPage.jsx`, employee related-record endpoints | Present, role-scoped |
| Multiple employee contracts over time | Contract model, period lookup, overlap prevention and contract tests | Present |
| Payroll uses contract for selected period | Repository resolves dated Active/Expired contracts; regression confirms an expired contract is usable for its historical period and not a later period | Fixed historical case |
| Schedule List/Form and opening a row | Schedule list/detail/edit screens; schedule rows now open their detail view | Present, refined |
| Schedule name, calendar type, days/week, hours/week, company, status | Existing type/days/hours/status plus Company shown in list/detail | Fixed missing Company label |
| Weekly pattern: weekday, start/end, optional break, derived hours | Schedule service and `test_schedule.py`; new tests reject overlapping intervals and oversized breaks; empty schedules rejected | Present, tightened |
| Schedule assignable to employee/contract | Existing form selectors and foreign keys | Present |
| Schedule usable in attendance/payroll | Existing attendance schedule break handling; payroll now exposes schedule days/hours and overtime to formulas | Fixed payroll formula context |
| Global and employee-specific attendance | Attendance list and employee history; self-scope and employee-history tests | Present |
| Check-in/out, worked hours and status stored | Attendance model/service; action and break tests | Present |
| Employee entry shows only their attendance | Employee history passes employee ID; API denies unauthorized employee access | Present, tested |
| Attendance quick-action popup | `AttendanceWidget.jsx` opens modal; check-in/out actions and elapsed timer | Present |
| Red inactive / green checked-in indicator | Added red state; green already present, based on successful attendance query | Fixed |
| Attendance available for reporting | Dashboard attendance status aggregation and reports link | Present |
| Time-off request approval flow | Request create/approve/refuse; duplicate decision protection and notification/audit writes | Present, tested |
| Allocation-required leave consumes available balance on approval | Locked approval transaction; double-approval and insufficient-balance tests | Present |
| Type settings control leave behavior | Non-allocation types no longer incorrectly require a grant; approval-disabled types now auto-approve through the same balance transaction; inactive types rejected | Fixed |
| Payrun scope then employee selection | `PayrunWizardPage.jsx`; scope includes salary structure, dates and optional department | Present |
| Continue does not create a payrun | Eligibility endpoint is read-only; wizard test distinguishes Continue from Create | Present, tested |
| Create includes only selected employees | Explicit employee IDs, duplicate IDs deduplicated; empty/inactive/invalid selection blocked; department scope rechecked server-side | Present, tightened |
| One linked payslip per selected employee | Payroll create service and lifecycle tests | Present |
| Applicable contract and selected structure drive computation | Payroll engine obtains period contract and payrun structure rules | Present |
| Basic, allowances, deductions, Gross and Net visible | Payslip detail/lines, PDF generator; payroll engine tests | Present |
| Missing data and duplicate payslips visible | Pre-generation validator, eligibility reasons and detail warning panels; unique-feature tests | Present |
| Draft -> Compute -> Validate -> Mark Paid | Locked transitions, prerequisite checks, idempotent paid action; lifecycle tests | Present |
| Finalized history remains available | Paid payruns/payslips remain stored/listed; recomputation blocked after finalization | Present |
| Structures contain sequenced rules | Salary models/forms and engine sorting by sequence | Present |
| Fixed amounts use entered value | Removed implicit Fixed Basic=0 -> wage override; migration converts existing legacy zero-basic rules to explicit Formula WAGE | Fixed without changing legacy calculated pay |
| Percentage of wage or prior rule value | Percentage/base-code calculation and tests | Present |
| Formula supports advanced calculations | Safe arithmetic evaluator; new WAGE, WORKED_DAYS, WORKED_HOURS, PERIOD_DAYS, SCHEDULED_DAYS, SCHEDULED_HOURS, OVERTIME_HOURS, UNPAID_DAYS context; combined schedule/attendance regression | Expanded |
| Generate/print employee payslip for period | Paid payslip download, PDF generation, QR and ownership tests | Present under requested paid-only policy |
| Dashboard actual data, not fixed numbers | Dashboard queries employees, payslips, attendance, leave and allocations | Present |
| Salary totals, department costs and trends | Existing KPI/charts and dashboard service | Present |
| Payslip statuses summarized on dashboard | Added period/filter-scoped Draft/Computed/Validated/Paid counts and UI | Fixed |
| Attendance, time off and payroll warnings | Existing overview and warning sections | Present |
| Filters affect relevant dashboard data | Department/type/period filtering; fixed cross-month leave day clipping, pending-request dates and allocation validity filtering | Fixed date inconsistencies |

## Additional features retained

| Enhancement | Evidence / verification level |
|---|---|
| Employee field-level audit and global audit browsing | Existing audit tests and live navigation |
| Persistent notifications with read/read-all | Existing notification tests |
| Location check-in and attendance status rules | Existing attendance/unique-feature tests; real device geolocation was not exercised in this audit |
| Single daily session with scheduled break deduction | Existing attendance action/break tests; kept per your later instruction |
| Automatic unique employee/contract references | Existing identifier tests and database unique constraints |
| Payslip QR verification | Existing PDF/QR tests |
| Paid-only PDF and record ownership protection | Existing PDF endpoint tests |
| Live salary burn and payroll diagnostics | Existing unique-feature/scale tests |
| Pagination and employee history paging | Existing frontend tests |
| Two-way allocation date/day calculation | Existing allocation-date tests |
| Landing/login 3D effects and successful-login transition | Retained; earlier browser tests checked success/failure gating and reduced motion |

## Explicit policies and limits

- The Excalidraw note explicitly calls password reset, invitations and SSO enhancements. They are not implemented as mandatory flows here.
- Payslip sending is optional in the diagram. The existing SMTP adapter requires a working mail configuration. No external email was sent or delivery certified by this audit. WhatsApp remains removed as you requested.
- This installation is single-company PeoplePay360. Schedule Company displays that tenant. Multi-company switching/isolation is not implemented; the diagram lists company among example filters, not a required multi-tenant architecture.
- Time-off requests use inclusive calendar dates/days. Hour-based requests are not implemented; the Hours option is now disabled and the backend rejects such requests instead of silently treating hours as days. Weekend/holiday exclusion is not implied. The diagram leaves exact leave policy to the participant.
- Paid allocation-required leave cannot overdraw even if a legacy type has `allow_negative` set. This preserves your existing paid-leave blocker. Non-allocation paid types are now permitted without a grant.
- Payroll exposes attendance/unpaid/schedule values; configured rules must reference them to affect salary. Their existence does not automatically impose a salary-proration policy. Overtime is worked hours beyond the assigned schedule on each date; unpaid days are distinct calendar dates.
- A payroll period intersecting multiple eligible contracts is rejected for review. Automatic split-contract salary proration is not implemented.
- PDF download remains restricted to Paid payslips, as you explicitly requested earlier. Employee allocation/report/configuration visibility remains restricted as requested. These are intentional role/product decisions, not missing admin flows.
- Authentication/permissions were exercised with the configured roles, but the navigation smoke pass does not prove every role/action combination. The automated RBAC tests cover representative denied actions and record isolation.
- Existing dependency deprecations and the Vite bundle-size warning remain; they did not fail the test/build runs.

## Migration and review

`backend/alembic/versions/829_explicit_basic_wage.py` was applied to local MySQL. Apply `python -m alembic upgrade head` from the backend in another deployment before using this version. Historical payslip amounts are not rewritten. New fixed-zero rules now calculate zero; use Formula `WAGE` for contract-based Basic Salary.

The audit updates are published to main in two commits: backend changes attributed to Manavjoshi2579, and frontend changes plus this report attributed to sanket913. Automated tests and the production build passed before publication.
