from fastapi import Depends, Header
from jose import JWTError
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.security import decode_token
from app.core.exceptions import AuthError, PermissionDeniedError
from app.models.auth import User
from app.models.employee import Employee


def get_token_from_header(authorization: str | None = Header(default=None)) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise AuthError("Missing or invalid Authorization header")
    return authorization.split(" ", 1)[1].strip()


class CurrentUser:
    """Lightweight context object carrying the authenticated user + resolved claims."""

    def __init__(self, user: User, permissions: set[str], roles: list[str]):
        self.user = user
        self.permissions = permissions
        self.roles = roles

    @property
    def id(self) -> int:
        return self.user.id

    def has_permission(self, code: str) -> bool:
        return code in self.permissions

    def has_any(self, codes: list[str]) -> bool:
        return any(c in self.permissions for c in codes)

    def is_admin(self) -> bool:
        return "Admin" in self.roles


def get_current_user(token: str = Depends(get_token_from_header), db: Session = Depends(get_db)) -> CurrentUser:
    try:
        payload = decode_token(token)
    except JWTError:
        raise AuthError("Invalid or expired token")
    if payload.get("type") != "access":
        raise AuthError("Invalid token type")
    user_id = int(payload.get("sub"))
    user = db.get(User, user_id)
    if not user or not user.is_active:
        raise AuthError("User not found or inactive")
    permissions = set(payload.get("perms") or [])
    roles = payload.get("roles") or []
    return CurrentUser(user=user, permissions=permissions, roles=roles)


def require_permission(*codes: str):
    """Dependency factory: caller must hold at least one of the given permission codes."""

    def _dep(current: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if not current.has_any(list(codes)):
            raise PermissionDeniedError(f"Missing required permission: {' or '.join(codes)}")
        return current

    return _dep


def get_current_employee(current: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)) -> Employee | None:
    return db.query(Employee).filter(Employee.user_id == current.id).first()
