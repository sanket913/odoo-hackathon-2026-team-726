"""
Central import point for all ORM models so that Alembic autogeneration and
`Base.metadata.create_all()` see every table. Import `app.models` (this
package) - not `app.db.base` - when you need the full metadata graph.
"""
from app.db.base import Base  # noqa

from app.models.auth import User, Role, Permission, UserRole, RolePermission, RefreshSession  # noqa
from app.models.organization import Department, JobPosition, EmployeeType  # noqa
from app.models.employee import Employee  # noqa
from app.models.schedule import WorkingSchedule, ScheduleLine  # noqa
from app.models.contract import Contract  # noqa
from app.models.attendance import Attendance  # noqa
from app.models.time_off import TimeOffType, TimeOffAllocation, TimeOffRequest  # noqa
from app.models.salary import SalaryStructure, SalaryRule  # noqa
from app.models.payroll import Payrun, Payslip, PayslipLine  # noqa
from app.models.notification import Notification  # noqa
from app.models.audit import AuditLog  # noqa

from app.models.identifier import IdentifierSequence
