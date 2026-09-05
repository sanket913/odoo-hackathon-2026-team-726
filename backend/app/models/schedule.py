
from decimal import Decimal
from sqlalchemy import String, Boolean, ForeignKey, Integer, Time, Numeric, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum

from app.db.base import Base


class ScheduleType(str, enum.Enum):
    FIXED = "Fixed"
    FLEXIBLE = "Flexible"


class WorkingSchedule(Base):
    __tablename__ = "working_schedules"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    type: Mapped[ScheduleType] = mapped_column(SAEnum(ScheduleType), default=ScheduleType.FIXED, nullable=False)
    weekly_hours: Mapped[Decimal] = mapped_column(Numeric(6, 2), default=0, nullable=False)
    active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    lines: Mapped[list["ScheduleLine"]] = relationship(
        back_populates="schedule", cascade="all, delete-orphan", order_by="ScheduleLine.day_of_week"
    )

    def recompute_weekly_hours(self) -> Decimal:
        total = Decimal("0.00")
        for line in self.lines:
            total += line.duration_hours()
        self.weekly_hours = total
        return total


class ScheduleLine(Base):
    __tablename__ = "schedule_lines"

    id: Mapped[int] = mapped_column(primary_key=True)
    schedule_id: Mapped[int] = mapped_column(ForeignKey("working_schedules.id", ondelete="CASCADE"))
    day_of_week: Mapped[int] = mapped_column(Integer, nullable=False)  # 0=Monday ... 6=Sunday
    start_time = mapped_column(Time, nullable=False)
    end_time = mapped_column(Time, nullable=False)
    break_hours: Mapped[Decimal] = mapped_column(Numeric(4, 2), default=Decimal("0.5"), nullable=False)

    schedule: Mapped["WorkingSchedule"] = relationship(back_populates="lines")

    def duration_hours(self) -> Decimal:
        start_seconds = self.start_time.hour * 3600 + self.start_time.minute * 60 + self.start_time.second
        end_seconds = self.end_time.hour * 3600 + self.end_time.minute * 60 + self.end_time.second
        raw_hours = Decimal(end_seconds - start_seconds) / Decimal(3600)
        result = raw_hours - Decimal(self.break_hours or 0)
        return result if result > 0 else Decimal("0.00")
