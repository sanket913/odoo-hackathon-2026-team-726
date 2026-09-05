from sqlalchemy.orm import Session

from app.models.schedule import WorkingSchedule, ScheduleLine
from app.core.exceptions import NotFoundError, ValidationAppError


def to_out_dict(schedule: WorkingSchedule) -> dict:
    return {
        "id": schedule.id,
        "name": schedule.name,
        "company": "PeoplePay360",
        "type": schedule.type.value if hasattr(schedule.type, "value") else schedule.type,
        "weekly_hours": schedule.weekly_hours,
        "active": schedule.active,
        "lines": [
            {
                "id": line.id,
                "day_of_week": line.day_of_week,
                "start_time": line.start_time,
                "end_time": line.end_time,
                "break_hours": line.break_hours,
                "duration_hours": line.duration_hours(),
            }
            for line in sorted(schedule.lines, key=lambda l: l.day_of_week)
        ],
    }


def _validate_lines(lines_in: list) -> None:
    if not lines_in:
        raise ValidationAppError("Add at least one working interval")
    seen = {}
    for line in lines_in:
        if line.end_time <= line.start_time:
            raise ValidationAppError("end_time must be after start_time for every schedule line")
        duration = (line.end_time.hour * 60 + line.end_time.minute - line.start_time.hour * 60 - line.start_time.minute) / 60
        if line.break_hours >= duration:
            raise ValidationAppError("Break must be shorter than the working interval")
        for previous in seen.get(line.day_of_week, []):
            if line.start_time < previous.end_time and line.end_time > previous.start_time:
                raise ValidationAppError("Schedule intervals cannot overlap on the same weekday")
        seen.setdefault(line.day_of_week, []).append(line)
        if line.break_hours < 0:
            raise ValidationAppError("break_hours must be >= 0")


def list_schedules(db: Session, active: bool | None, page: int, limit: int):
    query = db.query(WorkingSchedule)
    if active is not None:
        query = query.filter(WorkingSchedule.active == active)
    total = query.count()
    items = query.order_by(WorkingSchedule.name).offset((page - 1) * limit).limit(limit).all()
    return items, total


def get_schedule(db: Session, schedule_id: int) -> WorkingSchedule:
    schedule = db.get(WorkingSchedule, schedule_id)
    if not schedule:
        raise NotFoundError("Working schedule not found")
    return schedule


def create_schedule(db: Session, payload) -> WorkingSchedule:
    _validate_lines(payload.lines)
    schedule = WorkingSchedule(name=payload.name, type=payload.type)
    db.add(schedule)
    db.flush()
    for line_in in payload.lines:
        db.add(ScheduleLine(
            schedule_id=schedule.id,
            day_of_week=line_in.day_of_week,
            start_time=line_in.start_time,
            end_time=line_in.end_time,
            break_hours=line_in.break_hours,
        ))
    db.flush()
    db.refresh(schedule)
    schedule.recompute_weekly_hours()
    db.flush()
    return schedule


def update_schedule(db: Session, schedule_id: int, payload) -> WorkingSchedule:
    schedule = get_schedule(db, schedule_id)
    data = payload.model_dump(exclude_unset=True)
    lines_in = data.pop("lines", None)

    for field, value in data.items():
        setattr(schedule, field, value)

    if lines_in is not None:
        _validate_lines(payload.lines)
        for line in list(schedule.lines):
            db.delete(line)
        db.flush()
        for line_in in payload.lines:
            db.add(ScheduleLine(
                schedule_id=schedule.id,
                day_of_week=line_in.day_of_week,
                start_time=line_in.start_time,
                end_time=line_in.end_time,
                break_hours=line_in.break_hours,
            ))
        db.flush()
        db.refresh(schedule)

    schedule.recompute_weekly_hours()
    db.flush()
    return schedule
