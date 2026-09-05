import datetime
from decimal import Decimal
from pydantic import BaseModel, Field


class ContractCreate(BaseModel):
    employee_id: int
    reference: str | None = None
    start_date: datetime.date
    end_date: datetime.date | None = None
    wage: Decimal = Field(gt=0)
    department_id: int | None = None
    job_position_id: int | None = None
    salary_structure_id: int | None = None
    working_schedule_id: int | None = None
    status: str = "Active"


class ContractUpdate(BaseModel):
    reference: str | None = None
    start_date: datetime.date | None = None
    end_date: datetime.date | None = None
    wage: Decimal | None = None
    department_id: int | None = None
    job_position_id: int | None = None
    salary_structure_id: int | None = None
    working_schedule_id: int | None = None
    status: str | None = None


class ContractOut(BaseModel):
    id: int
    employee_id: int
    employee_name: str | None = None
    reference: str
    start_date: datetime.date
    end_date: datetime.date | None
    wage: Decimal
    department_id: int | None
    job_position_id: int | None
    salary_structure_id: int | None
    salary_structure_name: str | None = None
    working_schedule_id: int | None
    status: str

    model_config = {"from_attributes": True}
