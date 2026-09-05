# PeoplePay360 — Backend

FastAPI + SQLAlchemy 2.x + Alembic + MySQL 8 backend for PeoplePay360. See the repository
root `README.md` for the full project overview, architecture diagrams, and business rules;
this file covers backend-specific setup and commands only.

## Requirements

- Python 3.11+
- MySQL 8 server, running locally, with a database and user created for this app
- No Docker is used anywhere in this project — everything below runs directly on your
  machine

## 1. Create the MySQL database and user

```sql
CREATE DATABASE peoplepay360 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'pp360'@'localhost' IDENTIFIED BY 'change_me';
GRANT ALL PRIVILEGES ON peoplepay360.* TO 'pp360'@'localhost';
FLUSH PRIVILEGES;
```

## 2. Python environment

```bash
cd backend
python3.11 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

## 3. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` and set `DB_USER` / `DB_PASSWORD` / `DB_NAME` to match step 1, and generate a
real `JWT_SECRET_KEY`:

```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

Leave `SMTP_HOST` empty to run without email delivery — the API will honestly report
`EMAIL_NOT_CONFIGURED` for send-payslip actions instead of pretending mail was sent.

## 4. Run migrations

```bash
alembic upgrade head
```

This creates every table (`users`, `roles`, `permissions`, `employees`, `contracts`,
`working_schedules`, `attendances`, `time_off_types`, `time_off_allocations`,
`time_off_requests`, `salary_structures`, `salary_rules`, `payruns`, `payslips`,
`payslip_lines`, `departments`, `job_positions`, `employee_types`, `audit_logs`,
`notifications`, `refresh_sessions`, plus the `user_roles` / `role_permissions` join
tables) against the MySQL database configured in `.env`.

## 5. Seed demo data

```bash
python -m app.seed
```

This is idempotent-safe to re-run for adding more history, but re-running with the same
period will report duplicates skipped rather than erroring. It creates:

- The 5 official role-based demo users (see the root README for credentials)
- 10-15 employees across multiple departments/positions/employee types
- 2+ working schedules
- Contracts covering active, historical (expired), and draft states
- 3+ time-off types with allocations and requests spanning Pending/Approved/Refused
- Attendance covering Present/Late/Absent/Overtime/MissingCheckout/manually-corrected
- 2 salary structures with a mix of Fixed/Percentage/Formula rules
- Payruns existing in all four states simultaneously: Draft, Computed, Validated, Paid

## 6. Run the API

```bash
uvicorn app.main:app --reload --port 8000
```

The API is served at `http://localhost:8000/api/v1`, with a health check at
`http://localhost:8000/api/v1/health` and interactive docs at
`http://localhost:8000/docs`.

## Running tests

```bash
pytest -q
```

Tests run against an isolated SQLite database by default (see `tests/conftest.py`), so they
do not touch your local MySQL data. 42 tests, covering: contract period resolution and
overlap rejection, working-schedule weekly-hours calculation, the safe formula evaluator
(including rejection of unsafe expressions), salary rule computation types, the full payrun
state machine, duplicate-payslip prevention, mark-paid behavior, the atomic leave-approval
transaction (including double-approval prevention), RBAC denial, and object-ownership
scoping.

## Project layout

See `docs/ARCHITECTURE.md` in the repository root for the full layered-architecture
explanation (routers → services → repositories → engines → models).


## Automatic record identifiers

Run `python -m alembic upgrade head` before using the updated contract and employee creation flows.
Contracts receive `CTR-<start-year>-<six-digit number>` when saved; the reference is read-only and remains unchanged when dates or other details are edited. Legacy references are preserved. The database enforces contract reference uniqueness, and the migration stops for review if legacy duplicates exist.
Employee codes use `EMP-<four-or-more-digit number>`. Both flows use transactional database counters and skip existing identifiers, rather than counting rows. Deleted committed numbers are not reused. Counters roll back with failed saves.
Payrun names already derive from period and structure. Payslips, attendance, leave requests and allocations retain their database-generated record IDs. Salary-rule and leave-type codes remain meaningful configuration values, not automatic document numbers.
