from decimal import Decimal
from pydantic import BaseModel


class SalaryRuleCreate(BaseModel):
    structure_id: int
    name: str
    code: str
    category: str
    sequence: int = 10
    computation_type: str
    fixed_amount: Decimal = Decimal("0.00")
    percentage: Decimal | None = None
    base_rule_code: str | None = None
    formula_text: str | None = None
    active: bool = True


class SalaryRuleUpdate(BaseModel):
    name: str | None = None
    category: str | None = None
    sequence: int | None = None
    computation_type: str | None = None
    fixed_amount: Decimal | None = None
    percentage: Decimal | None = None
    base_rule_code: str | None = None
    formula_text: str | None = None
    active: bool | None = None


class SalaryRuleOut(BaseModel):
    id: int
    structure_id: int
    name: str
    code: str
    category: str
    sequence: int
    computation_type: str
    fixed_amount: Decimal
    percentage: Decimal | None
    base_rule_code: str | None
    formula_text: str | None
    active: bool
    model_config = {"from_attributes": True}


class SalaryStructureCreate(BaseModel):
    name: str
    code: str
    description: str | None = None


class SalaryStructureUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    active: bool | None = None


class SalaryStructureOut(BaseModel):
    id: int
    name: str
    code: str
    description: str | None
    active: bool
    rules_count: int = 0
    employees_count: int = 0
    rules: list[SalaryRuleOut] = []
    model_config = {"from_attributes": True}
