import enum
from decimal import Decimal
from typing import Optional

from sqlalchemy import String, Boolean, Integer, ForeignKey, Numeric, Text, Enum as SAEnum, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class RuleCategory(str, enum.Enum):
    BASIC = "Basic"
    ALLOWANCE = "Allowance"
    GROSS = "Gross"
    DEDUCTION = "Deduction"
    NET = "Net"


class ComputationType(str, enum.Enum):
    FIXED = "Fixed"
    PERCENTAGE = "Percentage"
    FORMULA = "Formula"


class SalaryStructure(Base):
    __tablename__ = "salary_structures"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    code: Mapped[str] = mapped_column(String(32), unique=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    rules: Mapped[list["SalaryRule"]] = relationship(
        back_populates="structure", order_by="SalaryRule.sequence", cascade="all, delete-orphan"
    )


class SalaryRule(Base):
    __tablename__ = "salary_rules"

    id: Mapped[int] = mapped_column(primary_key=True)
    structure_id: Mapped[int] = mapped_column(
        ForeignKey("salary_structures.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    code: Mapped[str] = mapped_column(String(32), nullable=False)
    category: Mapped[RuleCategory] = mapped_column(SAEnum(RuleCategory), nullable=False)
    sequence: Mapped[int] = mapped_column(Integer, default=10, nullable=False)
    computation_type: Mapped[ComputationType] = mapped_column(SAEnum(ComputationType), nullable=False)
    fixed_amount: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=Decimal("0.00"), nullable=False)
    percentage: Mapped[Optional[Decimal]] = mapped_column(Numeric(6, 3), nullable=True)
    base_rule_code: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    formula_text: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    structure = relationship("SalaryStructure", back_populates="rules")

    __table_args__ = (UniqueConstraint("structure_id", "code", name="uq_rule_structure_code"),)
