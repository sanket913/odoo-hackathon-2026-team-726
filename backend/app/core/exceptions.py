"""
Domain exceptions and the standard API error envelope.

Success:  {"success": true, "data": ...}
Error:    {"success": false, "error": {"code": "...", "message": "...", "fields": {...}}}
"""
from fastapi import Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException


class AppError(Exception):
    status_code = 400
    code = "APP_ERROR"

    def __init__(self, message: str, code: str | None = None, fields: dict | None = None,
                 status_code: int | None = None):
        self.message = message
        self.code = code or self.code
        self.fields = fields or {}
        if status_code is not None:
            self.status_code = status_code
        super().__init__(message)


class NotFoundError(AppError):
    status_code = 404
    code = "NOT_FOUND"


class ValidationAppError(AppError):
    status_code = 422
    code = "VALIDATION_ERROR"


class ConflictError(AppError):
    status_code = 409
    code = "CONFLICT"


class PermissionDeniedError(AppError):
    status_code = 403
    code = "PERMISSION_DENIED"


class AuthError(AppError):
    status_code = 401
    code = "AUTH_ERROR"


class InvalidStateTransitionError(AppError):
    status_code = 409
    code = "INVALID_STATE_TRANSITION"


def error_envelope(code: str, message: str, fields: dict | None = None):
    return {"success": False, "error": {"code": code, "message": message, "fields": fields or {}}}


def register_exception_handlers(app):
    @app.exception_handler(AppError)
    async def handle_app_error(request: Request, exc: AppError):
        return JSONResponse(status_code=exc.status_code, content=error_envelope(exc.code, exc.message, exc.fields))

    @app.exception_handler(RequestValidationError)
    async def handle_validation_error(request: Request, exc: RequestValidationError):
        fields = {}
        for err in exc.errors():
            loc = ".".join(str(x) for x in err.get("loc", []) if x != "body")
            fields[loc or "_"] = err.get("msg")
        return JSONResponse(
            status_code=422,
            content=error_envelope("VALIDATION_ERROR", "Validation failed", fields),
        )

    @app.exception_handler(StarletteHTTPException)
    async def handle_http_exception(request: Request, exc: StarletteHTTPException):
        return JSONResponse(
            status_code=exc.status_code,
            content=error_envelope("HTTP_ERROR", str(exc.detail)),
        )

    @app.exception_handler(Exception)
    async def handle_unexpected(request: Request, exc: Exception):
        # Never leak tracebacks / internals to the client.
        return JSONResponse(
            status_code=500,
            content=error_envelope("INTERNAL_ERROR", "An unexpected error occurred."),
        )
