# Role-Based Access Control

## Why normalized RBAC instead of a single `role` enum

The schema models roles and permissions as first-class, many-to-many entities —
`users`, `roles`, `permissions`, `user_roles`, `role_permissions` — rather than a single
`role` string column on `users`. This means:

- A user can hold more than one role (not exercised by the seed data, but structurally
  supported).
- Adding a new permission or changing what a role can do is a data change
  (`ROLE_PERMISSIONS` in `app/core/permissions.py`, applied by `seed.py`), not a schema
  migration or an `if role == "admin"` code change scattered across routers.
- `refresh_sessions` is a separate table keyed to `users`, storing only the **SHA-256 hash**
  of each issued refresh token plus its expiry and a `revoked` flag — so logout / forced
  revocation is a database update, and a leaked database dump alone cannot be replayed as a
  valid refresh token.

## Enforcement model

Authorization is **backend-authoritative**. Every mutating route and every sensitive read
route depends on `require_permission("<code>")` from `app/api/deps.py`, which:

1. Decodes the JWT access token (rejects expired/invalid tokens with 401).
2. Reads the permission codes embedded in the token's claims (computed at login time from
   the user's roles).
3. Returns 403 `FORBIDDEN` if the required code is absent.

The frontend's `hasPermission` / `hasAnyPermission` (`AuthContext`, consumed via
`RequirePermission` in `src/routes/RequireAuth.jsx`) is used **only** to hide or disable
controls the user isn't allowed to use — it is a UX convenience, not a security boundary.
Every backend test in `tests/test_rbac_api.py` calls the API directly (bypassing the
frontend entirely) to prove the 403 is enforced regardless of what the UI shows.

## The five official demo roles

| Role | Purpose | Representative permissions |
|---|---|---|
| **Admin** | Full system access, user/role management | every permission in `ALL_PERMISSIONS` |
| **HR Manager** | Employee lifecycle, contracts, schedules, attendance, time off | `employee.*`, `contract.*`, `schedule.manage`, `attendance.read_all`/`correct`, `timeoff.approve`/`allocate`/`configure`, `master_data.manage`, `dashboard.read` |
| **HR & Payroll User** | Everything HR Manager has, plus running payroll (not validating/paying) | HR Manager permissions + `payrun.read`/`create`/`compute`, `payslip.read_all`/`print`, `salary_structure.read`, `salary_rule.read` |
| **HR & Payroll Manager** | Full payroll authority | HR & Payroll User permissions + `payrun.validate`/`mark_paid`/`send`, `salary_structure.manage`, `salary_rule.manage` |
| **Employee** | Self-service only | `employee.read_self`, `attendance.read_self`/`create_self`, `timeoff.request`/`read_self`, `payslip.read_self`/`print`, `contract.read` (service-layer scoped to own records), `schedule.read`, `master_data.read`, `notification.read_self` |

The full permission catalogue (39 codes) and the exact set granted to each role are defined
in `app/core/permissions.py::ALL_PERMISSIONS` / `ROLE_PERMISSIONS` — this table summarizes
that source of truth rather than replacing it.

## Object-level scoping

Permission codes answer "can this user perform this kind of action at all," not "on which
specific records." Object-level scoping is enforced in the service layer:

- An `Employee` role holding `contract.read` can only read **their own** contracts — the
  service checks `employee_id` against the requesting user's linked `Employee.id` for
  self-service permission codes (`*_self` suffixed codes), and rejects (403) an attempt to
  read another employee's record by ID even though the permission code itself is present on
  the token.
- `payslip.read_self` is similarly scoped — an Employee can fetch their own payslip PDF by
  ID, but not an arbitrary payslip ID belonging to a coworker.

## Demo credentials (from `app/seed.py`)

| Role | Email | Password |
|---|---|---|
| Admin | `admin@peoplepay360.com` | `Admin@123` |
| HR Manager | `hr.manager@peoplepay360.com` | `Hr@12345` |
| HR & Payroll User | `payroll.user@peoplepay360.com` | `Payroll@123` |
| HR & Payroll Manager | `payroll.manager@peoplepay360.com` | `Payroll@123` |
| Employee | `employee@peoplepay360.com` | `Employee@123` |

All seeded passwords are hashed with Argon2 before being stored — `seed.py` never writes a
plaintext password to the database.
