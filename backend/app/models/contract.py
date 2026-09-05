import enum
from typing import Optional
from decimal import Decimal
import datetime

from sqlalchemy import String, ForeignKey, Date, Numeric, Enum as SAEnum, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import TimestampMixin


class ContractStatus(str, enum.Enum):
    DRAFT = "Draft"
    ACTIVE = "Active"
    EXPIRED = "Expired"


class Contract(TimestampMixin, Base):
    __tablename__ = "contracts"
    __table_args__ = (
        Index("ix_contracts_employee_dates", "employee_id", "start_date", "end_date"),
        Index("ix_contracts_status", "status"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    employee_id: Mapped[int] = mapped_column(ForeignKey("employees.id", ondelete="CASCADE"), nullable=False)
    reference: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    start_date: Mapped[datetime.date] = mapped_column(Date, nullable=False)
    end_date: Mapped[Optional[datetime.date]] = mapped_column(Date, nullable=True)
    wage: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)

    department_id: Mapped[Optional[int]] = mapped_column(ForeignKey("departments.id"), nullable=True)
    job_position_id: Mapped[Optional[int]] = mapped_column(ForeignKey("job_positions.id"), nullable=True)
    salary_structure_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("salary_structures.id"), nullable=True
    )
    working_schedule_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("working_schedules.id"), nullable=True
    )
    status: Mapped[ContractStatus] = mapped_column(
        SAEnum(ContractStatus), default=ContractStatus.ACTIVE, nullable=False
    )

    employee = relationship("Employee", back_populates="contracts")
    department = relationship("Department")
    job_position = relationship("JobPosition")
    salary_structure = relationship("SalaryStructure")
    working_schedule = relationship("WorkingSchedule")
