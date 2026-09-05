import datetime
from decimal import Decimal
from pydantic import BaseModel


class TimeOffTypeCreate(BaseModel):
    name: str
    code: str
    unit: str = "Days"
    requires_allocation: bool = True
    approval_required: bool = True
    deduct_from_payroll: bool = False
    allow_negative: bool = False


class TimeOffTypeUpdate(BaseModel):
    name: str | None = None
    unit: str | None = None
    requires_allocation: bool | None = None
    approval_required: bool | None = None
    deduct_from_payroll: bool | None = None
    allow_negative: bool | None = None
    active: bool | None = None


class TimeOffTypeOut(BaseModel):
    id: int
    name: str
    code: str
    unit: str
    requires_allocation: bool
    approval_required: bool
    deduct_from_payroll: bool
    allow_negative: bool
    active: bool
    model_config = {"from_attributes": True}


class AllocationCreate(BaseModel):
    employee_id: int
    time_off_type_id: int
    name: str = ""
    allocated: Decimal
    valid_from: datetime.date
    valid_to: datetime.date


class AllocationOut(BaseModel):
    id: int
    employee_id: int
    employee_name: str | None = None
    time_off_type_id: int
    time_off_type_name: str | None = None
    name: str
    allocated: Decimal
    taken: Decimal
    remaining: Decimal
    valid_from: datetime.date
    valid_to: datetime.date
    status: str
    model_config = {"from_attributes": True}


class RequestCreate(BaseModel):
    employee_id: int
    time_off_type_id: int
    from_date: datetime.date
    to_date: datetime.date
    reason: str | None = None


class RequestDecision(BaseModel):
    hr_comment: str | None = None


class RequestOut(BaseModel):
    id: int
    employee_id: int
    employee_name: str | None = None
    time_off_type_id: int
    time_off_type_name: str | None = None
    from_date: datetime.date
    to_date: datetime.date
    duration_days: Decimal
    reason: str | None
    status: str
    hr_comment: str | None
    model_config = {"from_attributes": True}
