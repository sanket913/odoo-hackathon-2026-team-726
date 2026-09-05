from app.api.v1.audit import list_audit_logs
from app.models.audit import AuditLog
from app.services.audit_service import write_audit


def test_audit_filters_pagination_actor_and_redaction(db, make_user):
    actor = make_user(['Admin'], email='audit-list@example.com')
    write_audit(db, actor.id, 'AuditTest', 1, 'APPROVE', after={'status': 'Approved', 'password': 'private'})
    db.add(AuditLog(actor_user_id=actor.id, entity_type='AuditTest', entity_id=2,
                    action='APPROVE', meta={'nested': [{'access_token': 'legacy-secret'}]}))
    write_audit(db, actor.id, 'AuditTest', 3, 'REFUSE')
    db.flush()
    result = list_audit_logs(entity_type='AuditTest', action='APPROVE', page=1, limit=1, db=db)
    assert result['pagination']['total'] == 2
    row = result['data'][0]
    assert row['entity_id'] == 2
    assert row['actor_name'] == actor.full_name
    assert row['metadata']['nested'][0]['access_token'] == '[REDACTED]'
    result = list_audit_logs(entity_type='AuditTest', action='APPROVE', page=2, limit=1, db=db)
    assert result['data'][0]['after_data'] == {'status': 'Approved', 'password': '[REDACTED]'}
