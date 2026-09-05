from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.api.deps import require_permission
from app.core.permissions import P_USER_MANAGE, P_ROLE_MANAGE
from app.schemas.auth import UserCreateRequest, UserUpdateRequest, UserRolesUpdateRequest
from app.services import auth_service
from app.models.auth import User, Role, Permission
from app.core.security import hash_password
from app.core.exceptions import NotFoundError
from app.utils.response import ok, paginated

router = APIRouter(tags=["users"])


@router.get("/users")
def list_users(page: int = 1, limit: int = 20, db: Session = Depends(get_db),
               _=Depends(require_permission(P_USER_MANAGE))):
    query = db.query(User)
    total = query.count()
    items = query.order_by(User.full_name).offset((page - 1) * limit).limit(limit).all()
    return paginated([auth_service.user_to_dict(u) for u in items], page, limit, total)


@router.post("/users")
def create_user(payload: UserCreateRequest, db: Session = Depends(get_db),
                 _=Depends(require_permission(P_USER_MANAGE))):
    user = auth_service.create_user(db, payload.email, payload.password, payload.full_name, payload.role_names)
    db.commit()
    return ok(auth_service.user_to_dict(user))


@router.get("/users/{user_id}")
def get_user(user_id: int, db: Session = Depends(get_db), _=Depends(require_permission(P_USER_MANAGE))):
    user = db.get(User, user_id)
    if not user:
        raise NotFoundError("User not found")
    return ok(auth_service.user_to_dict(user))


@router.patch("/users/{user_id}")
def update_user(user_id: int, payload: UserUpdateRequest, db: Session = Depends(get_db),
                 _=Depends(require_permission(P_USER_MANAGE))):
    user = db.get(User, user_id)
    if not user:
        raise NotFoundError("User not found")
    data = payload.model_dump(exclude_unset=True)
    if "password" in data:
        pwd = data.pop("password")
        if pwd:
            user.hashed_password = hash_password(pwd)
    for field, value in data.items():
        setattr(user, field, value)
    db.commit()
    return ok(auth_service.user_to_dict(user))


@router.patch("/users/{user_id}/roles")
def update_user_roles(user_id: int, payload: UserRolesUpdateRequest, db: Session = Depends(get_db),
                       _=Depends(require_permission(P_ROLE_MANAGE))):
    user = auth_service.update_user_roles(db, user_id, payload.role_names)
    db.commit()
    return ok(auth_service.user_to_dict(user))


@router.get("/roles")
def list_roles(db: Session = Depends(get_db), _=Depends(require_permission(P_USER_MANAGE, P_ROLE_MANAGE))):
    roles = db.query(Role).order_by(Role.name).all()
    return ok([{"id": r.id, "name": r.name, "description": r.description} for r in roles])


@router.get("/permissions")
def list_permissions(db: Session = Depends(get_db), _=Depends(require_permission(P_ROLE_MANAGE))):
    perms = db.query(Permission).order_by(Permission.code).all()
    return ok([{"id": p.id, "code": p.code, "description": p.description} for p in perms])
