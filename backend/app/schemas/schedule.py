import datetime
from decimal import Decimal
from pydantic import BaseModel, field_validator


class ScheduleLineIn(BaseModel):
    day_of_week: int
    start_time: datetime.time
    end_time: datetime.time
    break_hours: Decimal = Decimal("0.5")

    @field_validator("day_of_week")
    @classmethod
    def valid_day(cls, v):
        if v < 0 or v > 6:
            raise ValueError("day_of_week must be between 0 (Monday) and 6 (Sunday)")
        return v

    @field_validator("break_hours")
    @classmethod
    def non_negative_break(cls, v):
        if v < 0:
            raise ValueError("break_hours must be >= 0")
        return v


class ScheduleLineOut(ScheduleLineIn):
    id: int
    duration_hours: Decimal
    model_config = {"from_attributes": True}


class WorkingScheduleCreate(BaseModel):
    name: str
    type: str = "Fixed"
    lines: list[ScheduleLineIn] = []


class WorkingScheduleUpdate(BaseModel):
    name: str | None = None
    type: str | None = None
    active: bool | None = None
    lines: list[ScheduleLineIn] | None = None


class WorkingScheduleOut(BaseModel):
    id: int
    name: str
    type: str
    weekly_hours: Decimal
    active: bool
    lines: list[ScheduleLineOut] = []

    model_config = {"from_attributes": True}
