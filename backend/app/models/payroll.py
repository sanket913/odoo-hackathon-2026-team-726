from sqlalchemy import Index
import enum
import datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import (
    String, ForeignKey, Date, Numeric, Integer, Enum as SAEnum, JSON, UniqueConstraint, DateTime
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import TimestampMixin


class PayrunStatus(str, enum.Enum):
    DRAFT = "Draft"
    COMPUTED = "Computed"
    VALIDATED = "Validated"
    PAID = "Paid"


class PayslipStatus(str, enum.Enum):
    DRAFT = "Draft"
    COMPUTED = "Computed"
    VALIDATED = "Validated"
    PAID = "Paid"


# Legal, ordered transitions for the Payrun/Payslip state machine.
PAYRUN_TRANSITIONS = {
    PayrunStatus.DRAFT: {PayrunStatus.COMPUTED},
    PayrunStatus.COMPUTED: {PayrunStatus.COMPUTED, PayrunStatus.VALIDATED},
    PayrunStatus.VALIDATED: {PayrunStatus.PAID},
    PayrunStatus.PAID: set(),
}


class Payrun(TimestampMixin, Base):
    __tablename__ = "payruns"
    __table_args__ = (Index("ix_payruns_period_status", "period_start", "status"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    salary_structure_id: Mapped[int] = mapped_column(ForeignKey("salary_structures.id"), nullable=False)
    department_id: Mapped[Optional[int]] = mapped_column(ForeignKey("departments.id"), nullable=True)
    period_start: Mapped[datetime.date] = mapped_column(Date, nullable=False)
    period_end: Mapped[datetime.date] = mapped_column(Date, nullable=False)
    status: Mapped[PayrunStatus] = mapped_column(SAEnum(PayrunStatus), default=PayrunStatus.DRAFT, nullable=False)
    total_employees: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_net: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=Decimal("0.00"), nullable=False)
    validated_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, nullable=True)
    paid_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, nullable=True)
    created_by_user_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)

    salary_structure = relationship("SalaryStructure")
    department = relationship("Department")
    payslips: Mapped[list["Payslip"]] = relationship(back_populates="payrun", cascade="all, delete-orphan")


class Payslip(TimestampMixin, Base):
    __tablename__ = "payslips"
    __table_args__ = (Index("ix_payslips_period_status", "period_start", "status"), Index("ix_payslips_employee_period", "employee_id", "period_start", "period_end"),UniqueConstraint("payrun_id", "employee_id", name="uq_payslip_payrun_employee"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    payrun_id: Mapped[int] = mapped_column(ForeignKey("payruns.id", ondelete="CASCADE"), nullable=False)
    employee_id: Mapped[int] = mapped_column(ForeignKey("employees.id"), nullable=False)
    contract_id: Mapped[Optional[int]] = mapped_column(ForeignKey("contracts.id"), nullable=True)
    period_start: Mapped[datetime.date] = mapped_column(Date, nullable=False)
    period_end: Mapped[datetime.date] = mapped_column(Date, nullable=False)
    worked_days: Mapped[Decimal] = mapped_column(Numeric(6, 2), default=Decimal("0.00"), nullable=False)
    status: Mapped[PayslipStatus] = mapped_column(SAEnum(PayslipStatus), default=PayslipStatus.DRAFT, nullable=False)
    warning_messages: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    basic_amount: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=Decimal("0.00"), nullable=False)
    gross_amount: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=Decimal("0.00"), nullable=False)
    net_amount: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=Decimal("0.00"), nullable=False)
    sent_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, nullable=True)

    payrun = relationship("Payrun", back_populates="payslips")
    employee = relationship("Employee")
    contract = relationship("Contract")
    lines: Mapped[list["PayslipLine"]] = relationship(
        back_populates="payslip", cascade="all, delete-orphan", order_by="PayslipLine.sequence"
    )

    def has_blocking_warning(self) -> bool:
        for w in (self.warning_messages or []):
            if isinstance(w, dict) and w.get("severity") == "blocking":
                return True
        return False


class PayslipLine(Base):
    __tablename__ = "payslip_lines"

    id: Mapped[int] = mapped_column(primary_key=True)
    payslip_id: Mapped[int] = mapped_column(ForeignKey("payslips.id", ondelete="CASCADE"), nullable=False)
    salary_rule_id: Mapped[Optional[int]] = mapped_column(ForeignKey("salary_rules.id"), nullable=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    code: Mapped[str] = mapped_column(String(32), nullable=False)
    category: Mapped[str] = mapped_column(String(32), nullable=False)
    sequence: Mapped[int] = mapped_column(Integer, default=10, nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=Decimal("0.00"), nullable=False)

    payslip = relationship("Payslip", back_populates="lines")
