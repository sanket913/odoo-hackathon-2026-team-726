# Official Acceptance Flows

Both flows below were executed end-to-end against a live MySQL 8 database (not SQLite, not
mocks) during development — once via direct API calls (`curl`) exercising every state
transition including illegal ones, and once via a real headless-Chromium browser session
against the running Vite dev server + FastAPI backend, confirming the UI itself drives the
same flow correctly and that data persists across a page reload.

## Flow 1 — Employee → Payslip

1. **Login** as `payroll.manager@peoplepay360.com` / `Payroll@123`. Lands on `/employees`
   (the manager's landing page) with the full navigation shell visible.
2. **Employees** — open an employee record. The four smart-button counts (Contracts,
   Attendance, Time Off, Allocations) reflect live counts from MySQL. Tabs show:
   - **Contracts**: the employee's active contract (reference, wage, dates, status).
   - **Attendance**: logged days with status (Present/Late/Absent/Overtime/MissingCheckout).
   - **Time Off**: submitted requests and their status.
3. **Working Schedules** — inspect a schedule's line table; the displayed `weekly_hours`
   figure is server-computed from the enabled lines, not hardcoded.
4. **Salary Structures / Rules** — open "Regular Salary," inspect its ordered rules
   (Fixed / Percentage / Formula computation types) including at least one Formula rule
   referencing other rule codes.
5. **New Payrun** (two-step wizard):
   - **Step 1** (department + period, "Continue") calls the eligibility endpoint only —
     confirmed by a passing frontend test and by network inspection that no `Payrun` row is
     created at this point.
   - **Step 2** shows the eligibility table with per-employee eligible/ineligible + reason;
     the manager deselects any ineligible rows and clicks **"Create Payrun (N)"**, which is
     the only action that creates the `Payrun` + `Payslip` rows.
6. **Compute** — from the Payrun detail page, click Compute. Every payslip's lines, gross,
   and net populate from the salary structure's rules via the formula engine; the payrun
   moves to `Computed`. Warnings (e.g. `MISSING_BANK_DETAILS`) surface in a banner.
7. **Validate** — attempting to validate while a blocking warning exists is rejected with
   the offending employee named; after resolving it (or if only non-blocking warnings
   exist), Validate succeeds and the payrun moves to `Validated`.
8. **Mark Paid** — moves the payrun (and every payslip) to `Paid`. Attempting any further
   transition (e.g. calling compute again via a raw API request) is rejected with
   `INVALID_TRANSITION`, proving the state machine is enforced server-side, not just hidden
   in the UI.
9. **Payslip** — open an individual payslip, view its line breakdown, and download the PDF.
   The PDF includes employee/period/line items/net pay and an optional QR code encoding the
   payslip id/employee/net/hash.
10. **Dashboard** — `/payroll/dashboard` reflects the newly paid payrun immediately: Total
    Net Salary Paid and Payslips Generated increase, the Salary Cost by Department chart and
    Monthly Net Salary Trend line update, and the Payroll Alerts panel lists the same
    non-blocking warnings seen on the payrun.
11. **Persistence check** — a full page reload (and, during testing, a backend process
    restart) preserves every one of the above: the payrun's status, the payslips' amounts,
    and the dashboard figures are all read fresh from MySQL, not from client-side state.

## Flow 2 — Leave Request → Approval

1. **Login** as `employee@peoplepay360.com` / `Employee@123`.
2. **Submit a request** — Time Off → New Request, pick a type with an approved allocation
   covering the dates, submit. The request appears with status `Pending (To Approve)`; a
   notification row is created; an audit log entry (`SUBMIT`) is written.
3. **Login** as `hr.manager@peoplepay360.com` / `Hr@12345` (a different browser session in
   testing, confirming this is genuinely two separate accounts/permissions, not just two UI
   states of one session).
4. **Approve** — open the request, click Approve. The atomic transaction runs: lock the
   request row, recheck it is still Pending, resolve the covering allocation (locking that
   row too), verify sufficient remaining balance, increment `taken` on the allocation, set
   the request to `Approved`, write the audit entry, create a notification for the employee
   — all inside one database transaction.
5. **Double-approval check** — a second Approve call (e.g. from a raw API request, or a
   second tab that hadn't refreshed) on the same request is rejected with `ConflictError`
   ("already been decided") rather than double-consuming the allocation.
6. **Self-approval check** — an Employee-role token attempting to call the approve endpoint
   directly is rejected with 403 (`timeoff.approve` is not in the Employee permission set),
   proving the restriction is enforced by the backend, not merely by hiding the Approve
   button in the UI.
7. **Dashboards update** — the Time Off Overview section on the Payroll Dashboard and the
   employee's own remaining-allocation figure both reflect the newly consumed balance
   immediately on next fetch.
8. **Persistence check** — reloading either session's page shows the request as `Approved`
   and the allocation's reduced remaining balance, all read fresh from MySQL.

## Automated coverage backing these flows

- `backend/tests/` (42 tests, all passing) includes dedicated tests for: contract period
  resolution and overlap rejection, working-schedule weekly-hours calculation, formula
  engine rejection of unsafe expressions (`eval`-style payloads, attribute access, function
  calls), salary rule computation types, the full payrun state machine (including illegal
  transitions), duplicate-payslip prevention, mark-paid one-way-door behavior, the leave
  approval transaction (including a simulated concurrent double-approval), RBAC denial for
  every non-permitted role/action pair used in the flows above, and object-ownership scoping
  for self-service endpoints.
- `frontend/` (18 tests, all passing) includes: the Payrun wizard never calling
  `createPayrun` on step 1, the `RequireAuth` / `RequirePermission` route guards, Zod schema
  validation for employee/contract forms, and the API response normalizers.

Run them with:

```bash
# backend
cd backend && source venv/bin/activate && pytest -q

# frontend
cd frontend && npm run test
```
