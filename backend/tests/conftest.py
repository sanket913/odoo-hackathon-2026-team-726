import os
import sys
import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

os.environ["DATABASE_URL"] = "sqlite:///./test_peoplepay360.db"

import app.models  # noqa - register full metadata
from app.db.base import Base
from app.db.session import SessionLocal, engine
from app.core.security import hash_password
from app.core.permissions import ALL_PERMISSIONS, ROLE_PERMISSIONS
from app.models.auth import User, Role, Permission, ALL_ROLES


@pytest.fixture(scope="session", autouse=True)
def _create_schema():
    if os.path.exists("./test_peoplepay360.db"):
        os.remove("./test_peoplepay360.db")
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)
    engine.dispose()  # Release pooled SQLite file handles on Windows.
    if os.path.exists("./test_peoplepay360.db"):
        os.remove("./test_peoplepay360.db")


@pytest.fixture()
def db():
    session = SessionLocal()
    try:
        yield session
        session.rollback()
    finally:
        session.close()


@pytest.fixture()
def rbac(db):
    """Seed roles/permissions once per test (idempotent check)."""
    if db.query(Role).count() == 0:
        perms = {}
        for code, desc in ALL_PERMISSIONS:
            p = Permission(code=code, description=desc)
            db.add(p)
            perms[code] = p
        db.flush()
        roles = {}
        for name in ALL_ROLES:
            role = Role(name=name, description=name)
            role.permissions = [perms[c] for c in ROLE_PERMISSIONS[name]]
            db.add(role)
            roles[name] = role
        db.commit()
    return {r.name: r for r in db.query(Role).all()}


@pytest.fixture()
def make_user(db, rbac):
    counter = {"n": 0}

    def _make(role_names, email=None):
        counter["n"] += 1
        email = email or f"user{counter['n']}@example.com"
        user = User(email=email, hashed_password=hash_password("Test@123"), full_name=email,
                    roles=[rbac[r] for r in role_names])
        db.add(user)
        db.commit()
        db.refresh(user)
        return user

    return _make
