# Demo Script (Judge Walkthrough)

A suggested 10-12 minute walkthrough covering both official acceptance flows plus the
dashboard and RBAC differences between roles. Assumes the backend, frontend, and MySQL are
already running per the main `README.md` setup steps, and the database has been seeded
(`python -m app.seed`).

## 1. Login & role differences (1 min)

- Open `/login`. Log in as `employee@peoplepay360.com` / `Employee@123`. Note the reduced
  navigation — no Payroll, no Admin, only self-service screens.
- Log out, log back in as `payroll.manager@peoplepay360.com` / `Payroll@123`. Note the full
  navigation including Payroll and Admin.

## 2. Employee, Contract, Schedule, Attendance (2 min)

- Employees list → open any employee. Walk through the smart-button tabs: Contracts,
  Attendance, Time Off, Allocations — all counts and rows are live MySQL data.
- Working Schedules → open a schedule, point out the per-weekday line table and the
  server-computed weekly hours total.
- Attendance list → point out the variety of statuses seeded (Present, Late, Absent,
  Overtime, Missing Checkout) and one manually-corrected record.

## 3. Salary structure & rules (1 min)

- Salary Structures → open "Regular Salary" → show the ordered rule list, including a
  `Formula` rule referencing other rule codes, to set up the payroll computation demo.

## 4. Payrun wizard — the "Continue never creates" moment (2 min)

- Payroll → Payruns → New Payrun.
- Step 1: pick a department + a **fresh, never-used** period (e.g. next month), click
  Continue. **Call out explicitly: this only fetched eligibility, no Payrun exists yet** —
  optionally open dev tools Network tab to show the eligibility call returns data with no
  corresponding create call.
- Step 2: show the eligibility table (any ineligible employees and why), deselect one,
  click **Create Payrun (N)**. Now the Payrun exists.

## 5. Compute → Validate → Mark Paid (2 min)

- On the new Payrun's detail page: click **Compute**. Point out per-employee gross/net
  figures and the non-blocking warnings banner (e.g. missing bank details for a couple of
  seeded employees).
- Click **Validate** — succeeds since only non-blocking warnings are present. If time
  allows, demonstrate the blocking case: open a payslip belonging to an employee whose
  contract has expired/been removed and show Validate is refused with that employee named.
- Click **Mark Paid**. Attempt to click Compute again (button should already be
  disabled/hidden) — mention that even a raw API call to compute a `Paid` payrun is rejected
  server-side with `INVALID_TRANSITION`.
- Open one payslip, download the PDF, briefly show its contents (line items, net pay, QR
  code).

## 6. Dashboard (1 min)

- Payroll Dashboard → point out the KPI cards (Total Net Salary Paid, Payslips Generated,
  Average Salary, Approved Time Off, Attendance Health) and both charts (Salary Cost by
  Department, Monthly Net Salary Trend) reflecting the payrun just paid, plus the Payroll
  Alerts panel showing the same non-blocking warnings.

## 7. Leave flow (2 min)

- Log out, log back in as `employee@peoplepay360.com`. Time Off → New Request → submit a
  request against a type/period with a known approved allocation.
- Log out, log back in as `hr.manager@peoplepay360.com` / `Hr@12345`. Time Off → Requests →
  open the new request → Approve.
- Point out the allocation's remaining balance decreased, a notification exists for the
  employee, and (optional) show the audit log entry for the approval.
- Optional: demonstrate the guard rail — attempt to approve the same request again (e.g. via
  a second browser tab that hadn't refreshed) and show it is rejected as already decided.

## 8. Wrap-up (30 sec)

- Reload the browser on the dashboard and a payslip page to show everything survived a full
  refresh — all state lives in MySQL, nothing is client-side mock data.
