from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.api.deps import get_current_user, CurrentUser
from app.models.notification import Notification
from app.utils.response import ok

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("")
def list_notifications(unread_only: bool = False, limit: int = Query(20, ge=1, le=100), page: int = Query(1, ge=1), db: Session = Depends(get_db),
                        current: CurrentUser = Depends(get_current_user)):
    query = db.query(Notification).filter(Notification.user_id == current.id)
    unread_count = query.filter(Notification.is_read.is_(False)).count()
    if unread_only:
        query = query.filter(Notification.is_read.is_(False))
    total = query.count()
    rows = query.order_by(Notification.created_at.desc(), Notification.id.desc()).offset((page - 1) * limit).limit(limit).all()
    result = ok([
        {
            "id": n.id, "title": n.title, "body": n.body, "category": n.category,
            "link": n.link, "is_read": n.is_read, "created_at": n.created_at,
        }
        for n in rows
    ])
    result["pagination"] = {"page": page, "totalPages": max(1, (total + limit - 1) // limit), "total": total}
    result["unread_count"] = unread_count
    return result


@router.post("/{notification_id}/read")
def mark_read(notification_id: int, db: Session = Depends(get_db), current: CurrentUser = Depends(get_current_user)):
    note = db.query(Notification).filter(Notification.id == notification_id, Notification.user_id == current.id).first()
    if note:
        note.is_read = True
        db.commit()
    return ok({"marked_read": bool(note)})


@router.post("/read-all")
def mark_all_read(db: Session = Depends(get_db), current: CurrentUser = Depends(get_current_user)):
    db.query(Notification).filter(Notification.user_id == current.id, Notification.is_read.is_(False)).update({"is_read": True})
    db.commit()
    return ok({"marked_read": True})
