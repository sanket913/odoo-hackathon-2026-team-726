from pydantic import BaseModel


class DepartmentOut(BaseModel):
    id: int
    name: str
    active: bool
    model_config = {"from_attributes": True}


class DepartmentCreate(BaseModel):
    name: str


class JobPositionOut(BaseModel):
    id: int
    name: str
    active: bool
    model_config = {"from_attributes": True}


class JobPositionCreate(BaseModel):
    name: str


class EmployeeTypeOut(BaseModel):
    id: int
    name: str
    active: bool
    model_config = {"from_attributes": True}


class EmployeeTypeCreate(BaseModel):
    name: str
