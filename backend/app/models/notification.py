import datetime
from typing import Optional
from sqlalchemy import String, ForeignKey, Boolean, Text, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title: Mapped[str] = mapped_column(String(150), nullable=False)
    body: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    category: Mapped[str] = mapped_column(String(50), default="general", nullable=False)
    link: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    user = relationship("User")


# Historical delivery records retained for database compatibility.
class NotificationLog(Base):
    __tablename__ = "notification_logs"
    id: Mapped[int] = mapped_column(primary_key=True)
    employee_id: Mapped[int] = mapped_column(ForeignKey("employees.id"), index=True)
    payslip_id: Mapped[int] = mapped_column(ForeignKey("payslips.id"), unique=True)
    phone: Mapped[Optional[str]] = mapped_column(String(32))
    message: Mapped[str] = mapped_column(Text)
    twilio_sid: Mapped[Optional[str]] = mapped_column(String(64))
    status: Mapped[str] = mapped_column(String(20), default="PENDING")
    error_message: Mapped[Optional[str]] = mapped_column(String(255))
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, server_default=func.now())
