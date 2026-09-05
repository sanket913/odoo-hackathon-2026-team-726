import datetime
from typing import Optional
from sqlalchemy import String, ForeignKey, JSON, DateTime, func, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    actor_user_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)
    entity_type: Mapped[str] = mapped_column(String(64), nullable=False)
    entity_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    action: Mapped[str] = mapped_column(String(64), nullable=False)
    before_data: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    after_data: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    meta: Mapped[Optional[dict]] = mapped_column("metadata", JSON, nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    actor = relationship("User")


# Employee Audit Trail
class EmployeeAuditLog(Base):
    __tablename__ = "employee_audit_log"
    id: Mapped[int] = mapped_column(primary_key=True)
    employee_id: Mapped[int] = mapped_column(ForeignKey("employees.id"), index=True)
    changed_by: Mapped[int] = mapped_column(ForeignKey("users.id"))
    field_name: Mapped[str] = mapped_column(String(100))
    old_value: Mapped[Optional[str]] = mapped_column(Text)
    new_value: Mapped[Optional[str]] = mapped_column(Text)
    changed_at: Mapped[datetime.datetime] = mapped_column(DateTime, server_default=func.now())
