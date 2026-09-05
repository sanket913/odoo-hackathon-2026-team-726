from sqlalchemy import select, update
from app.models.identifier import IdentifierSequence


def next_identifier(db, namespace, prefix, model, column, digits=6):
    table = IdentifierSequence.__table__
    if db.bind.dialect.name == "mysql":
        from sqlalchemy.dialects.mysql import insert
        stmt = insert(table).values(name=namespace, value=0)
        db.execute(stmt.on_duplicate_key_update(name=stmt.inserted.name))
    else:
        from sqlalchemy.dialects.sqlite import insert
        db.execute(insert(table).values(name=namespace, value=0).on_conflict_do_nothing(index_elements=["name"]))
    value = db.execute(select(table.c.value).where(table.c.name == namespace).with_for_update()).scalar_one()
    while True:
        value += 1
        candidate = f"{prefix}{value:0{digits}d}"
        if not db.query(model).filter(column == candidate).first():
            break
    db.execute(update(table).where(table.c.name == namespace).values(value=value))
    return candidate
