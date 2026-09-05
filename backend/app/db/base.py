"""
Declarative base shared by every ORM model.

IMPORTANT: this module must NOT import model modules (that would create a
circular import, since every model imports `Base` from here). The full set
of models is imported centrally by `app.models` (see models/__init__.py),
which is what Alembic and `create_all()` callers should import instead.
"""
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass
