from sqlalchemy.orm import Session
from app.models.audit import AuditLog
from app.utils.serialization import to_jsonable


def redact_audit(value):
    if isinstance(value, dict):
        return {key: '[REDACTED]' if any(part in key.lower() for part in ('password', 'token', 'secret', 'authorization', 'api_key')) else redact_audit(item) for key, item in value.items()}
    if isinstance(value, list):
        return [redact_audit(item) for item in value]
    return value


def write_audit(db: Session, actor_user_id: int | None, entity_type: str, entity_id: int | None,
                 action: str, before: dict | None = None, after: dict | None = None,
                 meta: dict | None = None) -> AuditLog:
    entry = AuditLog(
        actor_user_id=actor_user_id,
        entity_type=entity_type,
        entity_id=entity_id,
        action=action,
        before_data=redact_audit(to_jsonable(before)),
        after_data=redact_audit(to_jsonable(after)),
        meta=redact_audit(to_jsonable(meta)),
    )
    db.add(entry)
    db.flush()
    return entry
