from decimal import Decimal
import pytest

from app.engines.formula_engine import evaluate_formula, FormulaSecurityError, FormulaEvaluationError


def test_basic_addition_formula():
    result = evaluate_formula("BASIC + HRA + CONV", {"BASIC": Decimal("20000"), "HRA": Decimal("8000"), "CONV": Decimal("1600")})
    assert result == Decimal("29600")


def test_subtraction_formula():
    result = evaluate_formula("GROSS - PF", {"GROSS": Decimal("29600"), "PF": Decimal("2400")})
    assert result == Decimal("27200")


def test_parentheses_and_precedence():
    result = evaluate_formula("(BASIC + HRA) * 2", {"BASIC": Decimal("100"), "HRA": Decimal("50")})
    assert result == Decimal("300")


def test_unknown_code_raises():
    with pytest.raises(FormulaEvaluationError):
        evaluate_formula("BASIC + UNKNOWN_CODE", {"BASIC": Decimal("100")})


@pytest.mark.parametrize("malicious", [
    "__import__('os').system('echo pwned')",
    "eval('1+1')",
    "exec('1+1')",
    "().__class__.__bases__[0]",
    "open('/etc/passwd').read()",
    "[x for x in range(10)]",
    "BASIC.__class__",
    "1 if True else 0",
    "'a string'",
])
def test_malicious_formulas_are_rejected(malicious):
    with pytest.raises((FormulaSecurityError, FormulaEvaluationError)):
        evaluate_formula(malicious, {"BASIC": Decimal("100")})


def test_division_by_zero_raises():
    with pytest.raises(FormulaEvaluationError):
        evaluate_formula("BASIC / ZERO", {"BASIC": Decimal("100"), "ZERO": Decimal("0")})
