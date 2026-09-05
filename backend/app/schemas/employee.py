from pydantic import BaseModel, EmailStr, Field


class EmployeeCreate(BaseModel):
    name: str = Field(min_length=1)
    email: EmailStr
    phone: str | None = None
    department_id: int | None = None
    job_position_id: int | None = None
    manager_id: int | None = None
    employee_type_id: int | None = None
    working_schedule_id: int | None = None
    bank_account: str | None = None
    create_login: bool = False
    login_password: str | None = None
    role_names: list[str] = Field(default_factory=lambda: ["Employee"])


class EmployeeUpdate(BaseModel):
    name: str | None = None
    email: EmailStr | None = None
    phone: str | None = None
    department_id: int | None = None
    job_position_id: int | None = None
    manager_id: int | None = None
    employee_type_id: int | None = None
    working_schedule_id: int | None = None
    bank_account: str | None = None
    active: bool | None = None


class EmployeeOut(BaseModel):
    id: int
    employee_code: str
    name: str
    email: str
    phone: str | None
    department_id: int | None
    department_name: str | None = None
    job_position_id: int | None
    job_position_name: str | None = None
    manager_id: int | None
    manager_name: str | None = None
    employee_type_id: int | None
    employee_type_name: str | None = None
    working_schedule_id: int | None
    working_schedule_name: str | None = None
    active: bool
    bank_account: str | None
    user_id: int | None
    # Role-aware smart buttons
    visible_buttons: list[str] = Field(default_factory=list)
    contracts_count: int = 0
    attendance_count: int = 0
    time_off_count: int = 0
    allocations_count: int = 0

    model_config = {"from_attributes": True}
