"""
Normalized RBAC: users / roles / permissions / user_roles / role_permissions
plus server-side refresh sessions.
"""
import datetime
from sqlalchemy import String, Boolean, ForeignKey, DateTime, Table, Column
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import TimestampMixin

# Official roles (seeded) - kept as constants for reference across the app.
ROLE_EMPLOYEE = "Employee"
ROLE_HR_MANAGER = "HR Manager"
ROLE_HR_PAYROLL_USER = "HR Payroll User"
ROLE_HR_PAYROLL_MANAGER = "HR Payroll Manager"
ROLE_ADMIN = "Admin"

ALL_ROLES = [ROLE_EMPLOYEE, ROLE_HR_MANAGER, ROLE_HR_PAYROLL_USER, ROLE_HR_PAYROLL_MANAGER, ROLE_ADMIN]


user_roles = Table(
    "user_roles",
    Base.metadata,
    Column("user_id", ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    Column("role_id", ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True),
)

role_permissions = Table(
    "role_permissions",
    Base.metadata,
    Column("role_id", ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True),
    Column("permission_id", ForeignKey("permissions.id", ondelete="CASCADE"), primary_key=True),
)


class User(TimestampMixin, Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    roles: Mapped[list["Role"]] = relationship(secondary=user_roles, back_populates="users")
    employee: Mapped["Employee"] = relationship(back_populates="user", uselist=False)

    def permission_codes(self) -> set[str]:
        codes: set[str] = set()
        for role in self.roles:
            for perm in role.permissions:
                codes.add(perm.code)
        return codes

    def role_names(self) -> list[str]:
        return [r.name for r in self.roles]


class Role(Base):
    __tablename__ = "roles"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    description: Mapped[str] = mapped_column(String(255), default="", nullable=False)

    users: Mapped[list["User"]] = relationship(secondary=user_roles, back_populates="roles")
    permissions: Mapped[list["Permission"]] = relationship(
        secondary=role_permissions, back_populates="roles"
    )


class Permission(Base):
    __tablename__ = "permissions"

    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    description: Mapped[str] = mapped_column(String(255), default="", nullable=False)

    roles: Mapped[list["Role"]] = relationship(secondary=role_permissions, back_populates="permissions")


# Kept as explicit mapped classes too (association object style) is not needed since
# we used plain Tables above; UserRole / RolePermission names are exposed for import
# compatibility with the architecture doc.
UserRole = user_roles
RolePermission = role_permissions


class RefreshSession(Base):
    __tablename__ = "refresh_sessions"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    token_hash: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    expires_at: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=False)
    revoked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=False)
    user_agent: Mapped[str] = mapped_column(String(255), default="", nullable=False)

    user: Mapped["User"] = relationship()
