from types import SimpleNamespace
from app.models.notification import Notification
from app.api.v1.notifications import list_notifications, mark_read, mark_all_read


def test_unread_count_pagination_and_account_isolation(db, make_user):
    first = make_user(['Employee'], email='notifications-first@example.test')
    second = make_user(['Employee'], email='notifications-second@example.test')
    notes = [Notification(user_id=first.id, title=f'Update {i}', is_read=False) for i in range(25)]
    other = Notification(user_id=second.id, title='Private update', is_read=False)
    db.add_all(notes + [other])
    db.commit()
    current = SimpleNamespace(id=first.id)
    result = list_notifications(unread_only=False, limit=5, page=1, db=db, current=current)
    assert len(result['data']) == 5 and result['unread_count'] == 25
    assert result['pagination']['totalPages'] == 5
    assert not mark_read(other.id, db, current)['data']['marked_read']
    mark_read(notes[0].id, db, current)
    db.expire_all()
    assert db.get(Notification, notes[0].id).is_read
    mark_all_read(db, current)
    db.expire_all()
    result = list_notifications(unread_only=True, limit=5, page=1, db=db, current=current)
    assert result['unread_count'] == 0 and result['data'] == []
    assert not db.get(Notification, other.id).is_read
