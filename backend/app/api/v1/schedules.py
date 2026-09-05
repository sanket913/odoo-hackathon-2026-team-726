from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.api.deps import require_permission, get_current_user
from app.core.permissions import P_SCHEDULE_MANAGE
from app.schemas.schedule import WorkingScheduleCreate, WorkingScheduleUpdate
from app.services import schedule_service
from app.utils.response import ok, paginated

router = APIRouter(prefix="/schedules", tags=["schedules"])


@router.get("")
def list_schedules(active: bool | None = None, page: int = 1, limit: int = 50,
                    db: Session = Depends(get_db), _=Depends(get_current_user)):
    items, total = schedule_service.list_schedules(db, active, page, limit)
    return paginated([schedule_service.to_out_dict(s) for s in items], page, limit, total)


@router.post("")
def create_schedule(payload: WorkingScheduleCreate, db: Session = Depends(get_db),
                     _=Depends(require_permission(P_SCHEDULE_MANAGE))):
    schedule = schedule_service.create_schedule(db, payload)
    db.commit()
    return ok(schedule_service.to_out_dict(schedule))


@router.get("/{schedule_id}")
def get_schedule(schedule_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    schedule = schedule_service.get_schedule(db, schedule_id)
    return ok(schedule_service.to_out_dict(schedule))


@router.patch("/{schedule_id}")
def update_schedule(schedule_id: int, payload: WorkingScheduleUpdate, db: Session = Depends(get_db),
                     _=Depends(require_permission(P_SCHEDULE_MANAGE))):
    schedule = schedule_service.update_schedule(db, schedule_id, payload)
    db.commit()
    return ok(schedule_service.to_out_dict(schedule))
