import datetime
from decimal import Decimal
from pydantic import BaseModel


class EligibilityRequest(BaseModel):
    salary_structure_id: int
    period_start: datetime.date
    period_end: datetime.date
    department_id: int | None = None


class EligibleEmployeeOut(BaseModel):
    employee_id: int
    name: str
    department_name: str | None
    employee_type_name: str | None
    contract_id: int | None
    wage: Decimal | None
    eligible: bool
    reason: str | None = None


class PayrunCreateRequest(BaseModel):
    salary_structure_id: int
    period_start: datetime.date
    period_end: datetime.date
    department_id: int | None = None
    employee_ids: list[int]


class PayslipLineOut(BaseModel):
    id: int
    salary_rule_id: int | None
    name: str
    code: str
    category: str
    sequence: int
    amount: Decimal
    model_config = {"from_attributes": True}


class PayslipOut(BaseModel):
    id: int
    payrun_id: int
    employee_id: int
    employee_name: str | None = None
    contract_id: int | None
    period_start: datetime.date
    period_end: datetime.date
    worked_days: Decimal
    status: str
    warning_messages: list[dict] | None
    basic_amount: Decimal
    gross_amount: Decimal
    net_amount: Decimal
    lines: list[PayslipLineOut] = []
    sent_at: datetime.datetime | None = None
    model_config = {"from_attributes": True}


class PayrunOut(BaseModel):
    id: int
    name: str
    salary_structure_id: int
    salary_structure_name: str | None = None
    department_id: int | None
    period_start: datetime.date
    period_end: datetime.date
    status: str
    total_employees: int
    total_net: Decimal
    validated_at: datetime.datetime | None
    paid_at: datetime.datetime | None
    payslips: list[PayslipOut] = []
    model_config = {"from_attributes": True}
