from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload

from app.db.session import get_db
from app.api.deps import require_permission
from app.core.permissions import P_USER_MANAGE
from app.models.audit import AuditLog
from app.services.audit_service import redact_audit
from app.utils.response import paginated

router = APIRouter(prefix="/audit-logs", tags=["audit"])


@router.get("")
def list_audit_logs(entity_type: str | None = None, action: str | None = None, page: int = Query(1, ge=1), limit: int = Query(30, ge=1, le=100), db: Session = Depends(get_db),
                     _=Depends(require_permission(P_USER_MANAGE))):
    query = db.query(AuditLog)
    if entity_type:
        query = query.filter(AuditLog.entity_type == entity_type)
    if action:
        query = query.filter(AuditLog.action == action)
    total = query.count()
    rows = query.options(joinedload(AuditLog.actor)).order_by(AuditLog.created_at.desc(), AuditLog.id.desc()).offset((page - 1) * limit).limit(limit).all()
    items = [
        {
            "id": r.id, "actor_user_id": r.actor_user_id, "entity_type": r.entity_type, "entity_id": r.entity_id,
            "actor_name": r.actor.full_name if r.actor else None,
            "action": r.action, "before_data": redact_audit(r.before_data), "after_data": redact_audit(r.after_data), "metadata": redact_audit(r.meta),
            "created_at": r.created_at,
        }
        for r in rows
    ]
    return paginated(items, page, limit, total)
