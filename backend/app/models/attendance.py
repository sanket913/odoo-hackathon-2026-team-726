from sqlalchemy import Index
import enum
import datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import String, ForeignKey, Date, DateTime, Numeric, Boolean, Enum as SAEnum, Index, Float
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import TimestampMixin


class AttendanceStatus(str, enum.Enum):
    PRESENT = "Present"
    LATE = "Late"
    ABSENT = "Absent"
    OVERTIME = "Overtime"
    MISSING_CHECKOUT = "Missing Checkout"
    HALF_DAY = "Half-day"


class Attendance(TimestampMixin, Base):
    __tablename__ = "attendances"
    __table_args__ = (Index("ix_attendances_date_status", "date", "status"),Index("ix_attendance_employee_date", "employee_id", "date"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    employee_id: Mapped[int] = mapped_column(ForeignKey("employees.id", ondelete="CASCADE"), nullable=False)
    date: Mapped[datetime.date] = mapped_column(Date, nullable=False)
    check_in: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, nullable=True)
    check_out: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, nullable=True)
    worked_hours: Mapped[Decimal] = mapped_column(Numeric(6, 2), default=Decimal("0.00"), nullable=False)
    status: Mapped[AttendanceStatus] = mapped_column(
        SAEnum(AttendanceStatus), default=AttendanceStatus.PRESENT, nullable=False
    )
    is_manual_correction: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    correction_reason: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    # Attendance Geofence / Auto Attendance Status
    latitude: Mapped[Optional[float]] = mapped_column(Float)
    longitude: Mapped[Optional[float]] = mapped_column(Float)
    location_tag: Mapped[Optional[str]] = mapped_column(String(20))
    auto_status_note: Mapped[Optional[str]] = mapped_column(String(100))

    break_allowance_hours: Mapped[Decimal] = mapped_column(Numeric(6, 2), default=Decimal('0'), server_default='0', nullable=False)
    break_hours: Mapped[Decimal] = mapped_column(Numeric(6, 2), default=Decimal('0'), server_default='0', nullable=False)
    break_source: Mapped[str] = mapped_column(String(20), default='Legacy', server_default='Legacy', nullable=False)

    employee = relationship("Employee", back_populates="attendances")

    def recompute(self) -> None:
        """Derive worked_hours and status from check_in/check_out."""
        if not self.check_in:
            self.worked_hours = Decimal("0.00")
            self.status = AttendanceStatus.ABSENT
            return
        if not self.check_out:
            self.worked_hours = Decimal("0.00")
            self.status = AttendanceStatus.MISSING_CHECKOUT
            return
        delta = self.check_out - self.check_in
        hours = Decimal(str(delta.total_seconds())) / Decimal(3600) - Decimal(self.break_hours or 0)
        hours = hours.quantize(Decimal("0.01"))
        self.worked_hours = hours if hours > 0 else Decimal("0.00")

        if self.status == AttendanceStatus.LATE:
            # preserve manually-flagged late status while still updating hours
            pass
        elif hours <= 0:
            self.status = AttendanceStatus.ABSENT
        elif hours < 4:
            self.status = AttendanceStatus.HALF_DAY
        elif hours > Decimal("9.00"):
            self.status = AttendanceStatus.OVERTIME
        else:
            # Late check-in detection (after 10:15 local time) is applied by the service layer,
            # which has access to the applicable working schedule.
            self.status = AttendanceStatus.PRESENT
