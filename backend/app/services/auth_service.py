import datetime
from sqlalchemy.orm import Session

from app.models.auth import User, Role, RefreshSession
from app.models.employee import Employee
from app.core.security import (
    verify_password, hash_password, create_access_token, new_raw_refresh_token,
    hash_refresh_token, refresh_token_expiry,
)
from app.core.exceptions import AuthError, ValidationAppError, NotFoundError


def authenticate(db: Session, email: str, password: str) -> User:
    user = db.query(User).filter(User.email == email.lower()).first()
    if not user or not verify_password(password, user.hashed_password):
        raise AuthError("Invalid email or password")
    if not user.is_active:
        raise AuthError("This account has been deactivated")
    return user


def issue_tokens(db: Session, user: User, user_agent: str = "") -> tuple[str, str]:
    permissions = sorted(user.permission_codes())
    roles = user.role_names()
    access_token = create_access_token(user.id, permissions, roles)

    raw_refresh = new_raw_refresh_token()
    session = RefreshSession(
        user_id=user.id,
        token_hash=hash_refresh_token(raw_refresh),
        expires_at=refresh_token_expiry(),
        created_at=datetime.datetime.utcnow(),
        user_agent=user_agent[:255],
    )
    db.add(session)
    db.flush()
    return access_token, raw_refresh


def rotate_refresh_token(db: Session, raw_refresh_token: str) -> tuple[str, str, User]:
    token_hash = hash_refresh_token(raw_refresh_token)
    session = db.query(RefreshSession).filter(RefreshSession.token_hash == token_hash).first()
    if not session or session.revoked or session.expires_at < datetime.datetime.utcnow():
        raise AuthError("Refresh token is invalid or expired")
    user = db.get(User, session.user_id)
    if not user or not user.is_active:
        raise AuthError("User not found or inactive")
    session.revoked = True
    db.flush()
    access_token, new_raw = issue_tokens(db, user)
    return access_token, new_raw, user


def revoke_refresh_token(db: Session, raw_refresh_token: str) -> None:
    token_hash = hash_refresh_token(raw_refresh_token)
    session = db.query(RefreshSession).filter(RefreshSession.token_hash == token_hash).first()
    if session:
        session.revoked = True
        db.flush()


def user_to_dict(user: User) -> dict:
    employee = user.employee
    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "is_active": user.is_active,
        "roles": user.role_names(),
        "permissions": sorted(user.permission_codes()),
        "employee_id": employee.id if employee else None,
    }


def create_user(db: Session, email: str, password: str, full_name: str, role_names: list[str], employee_id: int | None = None) -> User:
    existing = db.query(User).filter(User.email == email.lower()).first()
    if existing:
        raise ValidationAppError("A user with this email already exists", fields={"email": "already exists"})
    roles = db.query(Role).filter(Role.name.in_(role_names)).all()
    if role_names and len(roles) != len(set(role_names)):
        raise ValidationAppError("One or more role names are invalid")
    employee = None
    if employee_id is not None:
        employee = db.query(Employee).filter(Employee.id == employee_id).with_for_update().first()
        if not employee:
            raise NotFoundError("Employee not found")
        if employee.user_id:
            raise ValidationAppError("This employee already has a user account")
    user = User(email=email.lower(), hashed_password=hash_password(password), full_name=full_name, roles=roles)
    db.add(user)
    db.flush()
    if employee is not None:
        employee.user_id = user.id
        db.flush()
        db.expire(user, ["employee"])
    return user


def update_user_roles(db: Session, user_id: int, role_names: list[str]) -> User:
    user = db.get(User, user_id)
    if not user:
        raise NotFoundError("User not found")
    roles = db.query(Role).filter(Role.name.in_(role_names)).all()
    if len(roles) != len(set(role_names)):
        raise ValidationAppError("One or more role names are invalid")
    user.roles = roles
    db.flush()
    return user
