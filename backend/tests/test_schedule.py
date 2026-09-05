import datetime
from decimal import Decimal
import pytest

from app.services import schedule_service
from app.schemas.schedule import WorkingScheduleCreate, ScheduleLineIn
from app.core.exceptions import ValidationAppError


def test_weekly_hours_auto_calculated(db):
    payload = WorkingScheduleCreate(name="Test Fixed", type="Fixed", lines=[
        ScheduleLineIn(day_of_week=d, start_time=datetime.time(9, 0), end_time=datetime.time(18, 0),
                        break_hours=Decimal("1.00"))
        for d in range(5)
    ])
    schedule = schedule_service.create_schedule(db, payload)
    db.commit()
    # 9 hours span - 1 hour break = 8 hours/day * 5 days = 40
    assert schedule.weekly_hours == Decimal("40.00")


def test_schedule_rejects_end_before_start(db):
    payload = WorkingScheduleCreate(name="Bad Schedule", type="Fixed", lines=[
        ScheduleLineIn(day_of_week=0, start_time=datetime.time(18, 0), end_time=datetime.time(9, 0),
                        break_hours=Decimal("0.5")),
    ])
    with pytest.raises(ValidationAppError):
        schedule_service.create_schedule(db, payload)


def test_schedule_rejects_negative_break():
    with pytest.raises(Exception):
        ScheduleLineIn(day_of_week=0, start_time=datetime.time(9, 0), end_time=datetime.time(18, 0),
                        break_hours=Decimal("-1.00"))
