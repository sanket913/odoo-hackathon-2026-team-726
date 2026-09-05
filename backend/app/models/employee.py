from sqlalchemy import Index
from typing import Optional
from sqlalchemy import String, Boolean, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import TimestampMixin


class Employee(TimestampMixin, Base):
    __tablename__ = "employees"
    __table_args__ = (Index("ix_employees_name_id", "name", "id"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), unique=True, nullable=True
    )
    employee_code: Mapped[str] = mapped_column(String(32), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    phone: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)

    department_id: Mapped[Optional[int]] = mapped_column(ForeignKey("departments.id"), nullable=True)
    job_position_id: Mapped[Optional[int]] = mapped_column(ForeignKey("job_positions.id"), nullable=True)
    manager_id: Mapped[Optional[int]] = mapped_column(ForeignKey("employees.id"), nullable=True)
    employee_type_id: Mapped[Optional[int]] = mapped_column(ForeignKey("employee_types.id"), nullable=True)
    working_schedule_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("working_schedules.id"), nullable=True
    )

    active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    bank_account: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)

    user = relationship("User", back_populates="employee")
    department = relationship("Department")
    job_position = relationship("JobPosition")
    employee_type = relationship("EmployeeType")
    working_schedule = relationship("WorkingSchedule")
    manager = relationship("Employee", remote_side=[id])

    contracts = relationship("Contract", back_populates="employee", order_by="desc(Contract.start_date)")
    attendances = relationship("Attendance", back_populates="employee")
    time_off_requests = relationship("TimeOffRequest", back_populates="employee")
    allocations = relationship("TimeOffAllocation", back_populates="employee")
