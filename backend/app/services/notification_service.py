from sqlalchemy.orm import Session
from app.models.notification import Notification


def notify(db: Session, user_id: int | None, title: str, body: str = "", category: str = "general",
           link: str | None = None) -> Notification | None:
    if not user_id:
        return None
    note = Notification(user_id=user_id, title=title, body=body, category=category, link=link)
    db.add(note)
    db.flush()
    return note
