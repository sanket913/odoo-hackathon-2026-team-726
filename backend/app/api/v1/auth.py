from fastapi import APIRouter, Depends, Response, Request
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.auth import LoginRequest, RefreshRequest
from app.services import auth_service
from app.utils.response import ok
from app.api.deps import get_current_user, CurrentUser
from app.core.config import settings

router = APIRouter(prefix="/auth", tags=["auth"])

REFRESH_COOKIE_NAME = "pp360_refresh"


def _set_refresh_cookie(response: Response, raw_refresh: str) -> None:
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=raw_refresh,
        httponly=True,
        secure=settings.ENV != "development",
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600,
        path="/api/v1/auth",
    )


@router.post("/login")
def login(payload: LoginRequest, response: Response, db: Session = Depends(get_db)):
    user = auth_service.authenticate(db, payload.email, payload.password)
    access_token, raw_refresh = auth_service.issue_tokens(db, user)
    db.commit()
    _set_refresh_cookie(response, raw_refresh)
    return ok({
        "access_token": access_token,
        "token_type": "bearer",
        "user": auth_service.user_to_dict(user),
    })


@router.get("/me")
def me(current: CurrentUser = Depends(get_current_user)):
    return ok(auth_service.user_to_dict(current.user))


@router.post("/refresh")
def refresh(payload: RefreshRequest, request: Request, response: Response, db: Session = Depends(get_db)):
    raw_refresh = payload.refresh_token or request.cookies.get(REFRESH_COOKIE_NAME)
    from app.core.exceptions import AuthError
    if not raw_refresh:
        raise AuthError("No refresh token supplied")
    access_token, new_raw, user = auth_service.rotate_refresh_token(db, raw_refresh)
    db.commit()
    _set_refresh_cookie(response, new_raw)
    return ok({"access_token": access_token, "token_type": "bearer", "user": auth_service.user_to_dict(user)})


@router.post("/logout")
def logout(request: Request, response: Response, db: Session = Depends(get_db)):
    raw_refresh = request.cookies.get(REFRESH_COOKIE_NAME)
    if raw_refresh:
        auth_service.revoke_refresh_token(db, raw_refresh)
        db.commit()
    response.delete_cookie(REFRESH_COOKIE_NAME, path="/api/v1/auth")
    return ok({"logged_out": True})
