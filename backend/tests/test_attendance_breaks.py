import datetime as dt
from decimal import Decimal
import pytest

from app.models.employee import Employee
from app.models.schedule import WorkingSchedule, ScheduleLine
from app.models.attendance import Attendance
from app.schemas.attendance import AttendanceUpdate
from app.services import attendance_service as service
from app.core.exceptions import ValidationAppError


@pytest.fixture
def employee(db):
    schedule = WorkingSchedule(name='Break test schedule')
    schedule.lines = [ScheduleLine(day_of_week=0, start_time=dt.time(9), end_time=dt.time(18), break_hours=Decimal('1'))]
    schedule.recompute_weekly_hours()
    db.add(schedule)
    db.flush()
    employee = Employee(employee_code='BREAK-TEST', name='Break Test', email='break@example.test', working_schedule_id=schedule.id)
    db.add(employee)
    db.flush()
    return employee


@pytest.mark.parametrize('elapsed,break_hours,net', [(9, '1', '8'), (3, '0', '3'), (4, '0', '4'), (6, '1', '5'), (11, '1', '10')])
def test_single_pair_scheduled_break_and_no_reentry(db, employee, monkeypatch, elapsed, break_hours, net):
    start = dt.datetime(2026, 9, 7, 3, 30, tzinfo=dt.timezone.utc)
    monkeypatch.setattr(service, 'utc_now', lambda: start)
    row = service.check_in(db, employee.id)
    assert row.break_allowance_hours == 1
    with pytest.raises(ValidationAppError, match='already checked in'):
        service.check_in(db, employee.id)
    # Later schedule changes cannot rewrite the allowance captured at check-in.
    employee.working_schedule.lines[0].break_hours = Decimal('2')
    monkeypatch.setattr(service, 'utc_now', lambda: start + dt.timedelta(hours=elapsed))
    service.check_out(db, employee.id)
    result = service.to_out_dict(row)
    assert result['gross_hours'] == elapsed
    assert result['break_hours'] == Decimal(break_hours)
    assert result['worked_hours'] == Decimal(net)
    with pytest.raises(ValidationAppError, match='already checked in today'):
        service.check_in(db, employee.id)
    with pytest.raises(ValidationAppError, match='already checked out'):
        service.check_out(db, employee.id)


def test_hr_break_override_requires_reason_and_updates_net(db, employee, monkeypatch):
    start = dt.datetime(2026, 9, 7, 3, 30, tzinfo=dt.timezone.utc)
    monkeypatch.setattr(service, 'utc_now', lambda: start)
    row = service.check_in(db, employee.id)
    monkeypatch.setattr(service, 'utc_now', lambda: start + dt.timedelta(hours=9))
    service.check_out(db, employee.id)
    with pytest.raises(ValidationAppError, match='reason'):
        service.update_attendance(db, row.id, AttendanceUpdate(break_hours=Decimal('.5')))
    service.update_attendance(db, row.id, AttendanceUpdate(break_hours=Decimal('.5'), correction_reason='Half-hour break verified'))
    assert row.worked_hours == Decimal('8.5') and row.break_source == 'HR correction'
    with pytest.raises(ValidationAppError, match='total time'):
        service.update_attendance(db, row.id, AttendanceUpdate(break_hours=Decimal('10'), correction_reason='Invalid example'))


def test_legacy_attendance_preserves_recorded_hours(db, employee):
    row = Attendance(employee_id=employee.id, date=dt.date(2026, 9, 7),
        check_in=dt.datetime(2026, 9, 7, 3, 30), check_out=dt.datetime(2026, 9, 7, 12, 30))
    service._apply_recompute(row)
    assert row.worked_hours == Decimal('9')
