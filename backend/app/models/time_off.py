from sqlalchemy import Index
import enum
import datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import String, ForeignKey, Date, Numeric, Boolean, Text, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import TimestampMixin


class TimeOffUnit(str, enum.Enum):
    DAYS = "Days"
    HOURS = "Hours"


class AllocationStatus(str, enum.Enum):
    DRAFT = "Draft"
    APPROVED = "Approved"
    REFUSED = "Refused"


class RequestStatus(str, enum.Enum):
    TO_APPROVE = "To Approve"
    APPROVED = "Approved"
    REFUSED = "Refused"


class TimeOffType(Base):
    __tablename__ = "time_off_types"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    code: Mapped[str] = mapped_column(String(32), unique=True, nullable=False)
    unit: Mapped[TimeOffUnit] = mapped_column(SAEnum(TimeOffUnit), default=TimeOffUnit.DAYS, nullable=False)
    requires_allocation: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    approval_required: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    deduct_from_payroll: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    allow_negative: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class TimeOffAllocation(TimestampMixin, Base):
    __tablename__ = "time_off_allocations"
    __table_args__ = (Index("ix_allocations_employee_type_status", "employee_id", "time_off_type_id", "status"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    employee_id: Mapped[int] = mapped_column(ForeignKey("employees.id", ondelete="CASCADE"), nullable=False)
    time_off_type_id: Mapped[int] = mapped_column(ForeignKey("time_off_types.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(150), default="", nullable=False)
    allocated: Mapped[Decimal] = mapped_column(Numeric(6, 2), nullable=False)
    taken: Mapped[Decimal] = mapped_column(Numeric(6, 2), default=Decimal("0.00"), nullable=False)
    valid_from: Mapped[datetime.date] = mapped_column(Date, nullable=False)
    valid_to: Mapped[datetime.date] = mapped_column(Date, nullable=False)
    status: Mapped[AllocationStatus] = mapped_column(
        SAEnum(AllocationStatus), default=AllocationStatus.DRAFT, nullable=False
    )

    employee = relationship("Employee", back_populates="allocations")
    time_off_type = relationship("TimeOffType")

    @property
    def remaining(self) -> Decimal:
        return (self.allocated or Decimal("0")) - (self.taken or Decimal("0"))


class TimeOffRequest(TimestampMixin, Base):
    __tablename__ = "time_off_requests"
    __table_args__ = (Index("ix_requests_status_created", "status", "created_at"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    employee_id: Mapped[int] = mapped_column(ForeignKey("employees.id", ondelete="CASCADE"), nullable=False)
    time_off_type_id: Mapped[int] = mapped_column(ForeignKey("time_off_types.id"), nullable=False)
    allocation_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("time_off_allocations.id"), nullable=True
    )
    from_date: Mapped[datetime.date] = mapped_column(Date, nullable=False)
    to_date: Mapped[datetime.date] = mapped_column(Date, nullable=False)
    duration_days: Mapped[Decimal] = mapped_column(Numeric(6, 2), nullable=False)
    reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[RequestStatus] = mapped_column(
        SAEnum(RequestStatus), default=RequestStatus.TO_APPROVE, nullable=False
    )
    hr_comment: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    decided_by_user_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)

    employee = relationship("Employee", back_populates="time_off_requests")
    time_off_type = relationship("TimeOffType")
    allocation = relationship("TimeOffAllocation")
