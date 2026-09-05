# Enterprise dataset and attendance delivery report

## Executed commands and result

Working directory: `D:\manav\peoplepay360\backend`.

```powershell
.\venv\Scripts\python.exe -m app.seed --reset
.\venv\Scripts\python.exe -m alembic upgrade head
.\venv\Scripts\python.exe -m app.seed
.\venv\Scripts\python.exe -m app.seed --verify
```

Enterprise seed completed successfully against MySQL database `peoplepay360` in **78.80 seconds** on this machine. The first seed used the existing schema; the supporting index and break migrations were then applied, reaching revision `827attendancebreaks`. For future setup, run `alembic upgrade head` before seeding as documented in README.

The pre-reset domain/account snapshot is `backend/.seed-backups/20260905-221501-257728.json.gz` (private and gitignored). Existing domain demo records were replaced by explicit `--reset`. All five pre-existing account password hashes were compared against the snapshot and are unchanged. Three new Employee login users were inserted. Default repeat seeding reported ?Enterprise dataset already exists; no rows changed,? retained identical counts, and reran consistency validation. No frontend mock data was introduced.

## Exact verified MySQL totals

These are final table counts after replacement, not additional rows appended to the previous dataset.

| Records | Count |
|---|---:|
| Users | 8 |
| Employees | 250 |
| Departments | 8 |
| Job positions | 26 |
| Employee types | 3 |
| Working schedules | 5 |
| Contracts | 295 |
| Attendance | 14,817 |
| Time off types | 4 |
| Allocations | 762 |
| Leave requests | 420 |
| Salary structures | 2 |
| Salary rules | 9 |
| Payruns | 13 |
| Payslips | 1,501 |
| Payslip lines | 8,406 |
| Notifications | 150 |
| System audit entries | 119 |

Attendance distribution: 12,400 Present; 883 Late; 708 Absent; 563 Overtime; 263 Missing Checkout. Approved leave dates are excluded from attendance generation. Representative login employees have no seeded open shifts. Leave requests: 273 Approved, 84 To Approve, 63 Refused. Each employee has three approved annual allowances; 12 additional grants demonstrate Draft/Refused states.

There are 250 current contracts and 45 expired historical contracts. Each month has one payroll per salary structure. April?July are Paid, August Validated, September Computed; October has one Draft employee payslip. Thus 1,500 payslips are computed and one is Draft. The two existing structures have six and three rules respectively, producing 8,406 real rule-engine lines.

## Consistency and performance checks

- All active employees resolve to valid current contracts; the generated current contracts do not overlap.
- Schedules have positive hours derived by `recompute_weekly_hours`; manager chains are acyclic.
- Approved allocated leave matches employee/type/validity; taken balances equal approved request durations, with no negative remainder.
- Employee/month payslip uniqueness, applicable contract, salary structure, computed lines, NET line, run totals and Paid run/slip state consistency passed.
- Eight representative login/password pairs verified through the API; five original password hashes unchanged.
- First and last list pages verified for employees, contracts, attendance, requests, allocations and payslips. Payruns fit on one 20-row page. All seven endpoints reject limits over 100 or page zero.
- Employee name/email/code search finds an employee outside the first page. Department filtering and attendance/leave/payroll status filters tested.
- Employee page serialization uses six SQL statements independent of row count; a 250-payslip payrun detail serializes with at most four statements, covered by regression tests.
- Added targeted indexes through Alembic for employee ordering, attendance date/status, leave status, allocation lookup and payroll periods.
- Dropdown selectors fetch employee options in requests of at most 100, supporting all 250 employees without truncating at 200.
- Dashboard department/type filters now scope monthly salary trends and today's counters as well as the primary KPIs. Aggregation remains database-backed and independent of list pagination.

For 1 April?30 September 2026, the live API returned: **1,500 generated payslips**, **88,078,400.00 total net salary paid**, **88,078.40 average salary**, **273 approved leave days** (all seeded requests are one day), and **93.4% attendance health**. The raw non-secret check results are in `backend/enterprise-verification.json`.

A single local TestClient/MySQL read per list returned in 0.014?0.073 seconds, including serialization. These are spot checks, not a concurrent-user benchmark or a production performance guarantee.

## Tests and browser checks

- Backend: **82 tests passed**, including 250-employee search/pagination, 1,000-row attendance pagination, real 250-payslip computation, filtered dashboard totals, bounded API limits, SQL query counts and scheduled break edge cases.
- A MySQL transaction verified the Employee flow: nine elapsed hours minus one scheduled break produced eight net hours. The test was rolled back and attendance counts remained unchanged.
- Frontend: **36 tests passed**, including distinct gross/break/net display and the single-pair attendance guidance.
- Production Vite build passed. Existing advisory about a JavaScript chunk above 500 KB remains.
- Browser verification: employee search and Kanban result, list pages, leave/payslip page two, allocation details beyond page one, dashboard and attendance breakdown. No browser exceptions; checked desktop 1440px and mobile 390px for horizontal page overflow.

## Additional requested attendance change

Preserved one check-in and one checkout per day. New check-ins snapshot the assigned weekday schedule's break allowance. After six elapsed hours, scheduled allowance is deducted at checkout; shorter shifts have no automatic deduction. UI shows total elapsed time, break hours and net working time, explicitly labelled as a scheduled allowance rather than measured activity. HR can override the duration with a mandatory reason, which creates an audit event. Negative/excessive break durations are rejected. Existing records are marked Legacy and keep their original hours; no historical payroll recalculation was performed.

## Limitations and demo guidance

- Dataset anchor is fixed at 5 September 2026 for deterministic demonstrations. It does not grow or roll forward automatically.
- Attendance covers the latest 60 scheduled working days; April/May payroll has no imported attendance and correctly reports zero recorded worked days. Existing wage-based formulas are unchanged; the seed does not invent attendance-driven proration or unpaid-leave deduction rules.
- Select April?September on the dashboard for six-month paid history. September alone contains Computed salaries, so its paid total is zero by design.
- Generated bank references are fictional demo identifiers. Five employees have intentionally missing bank details for September warnings.
- Historical missing checkout examples are retained for employees without login accounts; there is no automatic repair of these exceptions.
- List search uses existing SQL substring matching. The added indexes improve ordering/filter/period lookup, not full-text substring search.
- The default command does not delete data. `--reset` is explicitly development-only, replaces domain data, preserves account credentials and backs up rows; it is not a production migration or an automated backup service.

## Changed files

- `backend/alembic/versions/826seedscale_query_indexes.py`
- `backend/alembic/versions/827attendance_breaks.py`
- `backend/app/api/v1/attendance.py`
- `backend/app/api/v1/contracts.py`
- `backend/app/api/v1/employees.py`
- `backend/app/api/v1/payroll.py`
- `backend/app/api/v1/timeoff.py`
- `backend/app/enterprise_seed.py`
- `backend/app/models/attendance.py`
- `backend/app/models/employee.py`
- `backend/app/models/payroll.py`
- `backend/app/models/time_off.py`
- `backend/app/schemas/attendance.py`
- `backend/app/seed.py`
- `backend/app/services/attendance_service.py`
- `backend/app/services/contract_service.py`
- `backend/app/services/dashboard_service.py`
- `backend/app/services/employee_service.py`
- `backend/app/services/payroll_service.py`
- `backend/app/services/timeoff_service.py`
- `backend/app/utils/attendance_rules.py`
- `backend/tests/test_attendance_breaks.py`
- `backend/tests/test_enterprise_scale.py`
- `frontend/src/components/AttendanceHoursSummary.jsx`
- `frontend/src/components/AttendanceHoursSummary.test.jsx`
- `frontend/src/components/AttendanceWidget.jsx`
- `frontend/src/components/DateRangeFilter.jsx`
- `frontend/src/components/ListSearch.jsx`
- `frontend/src/lib/api/services/employeeService.js`
- `frontend/src/lib/api/services/timeOffService.js`
- `frontend/src/lib/useSelfAttendance.js`
- `frontend/src/pages/attendance/AttendanceDetailPage.jsx`
- `frontend/src/pages/attendance/AttendanceFormPage.jsx`
- `frontend/src/pages/attendance/AttendanceListPage.jsx`
- `frontend/src/pages/contracts/ContractFormPage.jsx`
- `frontend/src/pages/contracts/ContractsListPage.jsx`
- `frontend/src/pages/employees/EmployeeFormPage.jsx`
- `frontend/src/pages/employees/EmployeesListPage.jsx`
- `frontend/src/pages/payroll/PayrunsListPage.jsx`
- `frontend/src/pages/payroll/PayslipsListPage.jsx`
- `frontend/src/pages/timeoff/AllocationDetailPage.jsx`
- `frontend/src/pages/timeoff/AllocationFormPage.jsx`
- `frontend/src/pages/timeoff/AllocationsListPage.jsx`
- `frontend/src/pages/timeoff/RequestFormPage.jsx`
- `frontend/src/pages/timeoff/RequestsListPage.jsx`
- `.gitignore`
- `README.md`
- `backend/enterprise-verification.json`
- `ENTERPRISE_DATA_REPORT.md`
