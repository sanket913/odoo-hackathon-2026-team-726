import datetime
from decimal import Decimal
from pydantic import BaseModel, Field, model_validator


class AttendanceCreate(BaseModel):
    employee_id: int
    date: datetime.date
    check_in: datetime.datetime | None = None
    check_out: datetime.datetime | None = None


class AttendanceUpdate(BaseModel):
    break_hours: Decimal | None = Field(default=None, ge=0, le=24, allow_inf_nan=False)
    check_in: datetime.datetime | None = None
    check_out: datetime.datetime | None = None
    correction_reason: str | None = None


class CheckInRequest(BaseModel):
    # Attendance Geofence
    latitude: float | None = Field(default=None, ge=-90, le=90, allow_inf_nan=False)
    longitude: float | None = Field(default=None, ge=-180, le=180, allow_inf_nan=False)

    @model_validator(mode="after")
    def coordinate_pair(self):
        if (self.latitude is None) != (self.longitude is None):
            raise ValueError("Latitude and longitude must be supplied together")
        return self


class CheckOutRequest(BaseModel):
    latitude: float | None = None
    longitude: float | None = None


class AttendanceOut(BaseModel):
    # Attendance Geofence / Auto Attendance Status
    latitude: float | None = None
    longitude: float | None = None
    location_tag: str | None = None
    auto_status_note: str | None = None
    id: int
    employee_id: int
    employee_name: str | None = None
    date: datetime.date
    check_in: datetime.datetime | None
    check_out: datetime.datetime | None
    gross_hours: Decimal = Decimal("0")
    break_hours: Decimal = Decimal("0")
    break_source: str = "Legacy"
    worked_hours: Decimal
    status: str
    is_manual_correction: bool
    correction_reason: str | None

    model_config = {"from_attributes": True}
