# Attendance Geofence / Auto Attendance Status
import datetime
import math
from decimal import Decimal
from dateutil import tz
from app.core.config import settings
from app.core.exceptions import ValidationAppError
from app.models.attendance import AttendanceStatus


def utc_now():
    return datetime.datetime.now(datetime.timezone.utc)


def as_utc(value):
    return value.replace(tzinfo=datetime.timezone.utc) if value.tzinfo is None else value.astimezone(datetime.timezone.utc)


def business_time(value):
    zone = tz.gettz(settings.BUSINESS_TIMEZONE)
    if zone is None:
        raise ValueError("Invalid BUSINESS_TIMEZONE")
    return as_utc(value).astimezone(zone)


def location_tag(latitude, longitude):
    lat1, lon1, lat2, lon2 = map(math.radians, (latitude, longitude, settings.OFFICE_LAT, settings.OFFICE_LON))
    a = math.sin((lat2-lat1)/2)**2 + math.cos(lat1)*math.cos(lat2)*math.sin((lon2-lon1)/2)**2
    a = min(1, max(0, a))
    distance = 6371 * 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    return "OUTSIDE" if distance > settings.OFFICE_RADIUS_KM else "OFFICE"


def apply_auto_status(row):
    row.auto_status_note = None
    if row.check_out and row.check_in:
        duration = as_utc(row.check_out) - as_utc(row.check_in)
        if duration.total_seconds() < 0:
            raise ValidationAppError("Check-out cannot precede check-in")
        if Decimal(str(duration.total_seconds())) / Decimal(3600) - Decimal(row.break_hours or 0) < Decimal('4'):
            row.status = AttendanceStatus.ABSENT
            row.auto_status_note = "Auto Absent - worked < 4 hours"
            return
    if row.check_in and business_time(row.check_in).time() > datetime.time(12):
        if row.status != AttendanceStatus.ABSENT:
            row.status = AttendanceStatus.HALF_DAY
            row.auto_status_note = "Auto Half Day - Late check-in after 12 PM"
