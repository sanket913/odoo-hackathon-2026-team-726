from pydantic import BaseModel, EmailStr, Field


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1)


class UserOut(BaseModel):
    id: int
    email: str
    full_name: str
    is_active: bool
    roles: list[str]
    permissions: list[str]
    employee_id: int | None = None

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class RefreshRequest(BaseModel):
    refresh_token: str | None = None


class UserCreateRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    full_name: str
    role_names: list[str] = Field(default_factory=list)


class UserUpdateRequest(BaseModel):
    full_name: str | None = None
    is_active: bool | None = None
    password: str | None = Field(default=None, min_length=6)


class UserRolesUpdateRequest(BaseModel):
    role_names: list[str]


class RoleOut(BaseModel):
    id: int
    name: str
    description: str
    model_config = {"from_attributes": True}


class PermissionOut(BaseModel):
    id: int
    code: str
    description: str
    model_config = {"from_attributes": True}
