"""
Safe salary-rule formula evaluator.

Formulas are short arithmetic expressions such as:
    "BASIC + HRA + CONV"
    "GROSS - PF"
    "(BASIC * 2) / 3"

Security model
--------------
We parse the expression with Python's `ast` module and walk the resulting
tree, allowing ONLY:
    - numeric literals (int / float)
    - the four binary arithmetic operators: + - * /
    - unary +/-
    - parentheses (implicit in the AST)
    - Name nodes that resolve to an already-computed salary rule code

Anything else (function calls, attribute access, subscripts, imports,
comparisons, boolean ops, string literals, comprehensions, etc.) raises
FormulaSecurityError. There is no `eval()` / `exec()` anywhere in this file.
"""
import ast
from decimal import Decimal, InvalidOperation


class FormulaSecurityError(Exception):
    pass


class FormulaEvaluationError(Exception):
    pass


_ALLOWED_BINOPS = (ast.Add, ast.Sub, ast.Mult, ast.Div)
_ALLOWED_UNARYOPS = (ast.UAdd, ast.USub)


def _to_decimal(value) -> Decimal:
    if isinstance(value, Decimal):
        return value
    try:
        return Decimal(str(value))
    except InvalidOperation:
        raise FormulaEvaluationError(f"Invalid numeric value: {value!r}")


class SafeFormulaEvaluator:
    """Evaluates a whitelisted arithmetic AST against a context of known codes."""

    def __init__(self, context: dict[str, Decimal]):
        self.context = context

    def evaluate(self, expression: str) -> Decimal:
        if not expression or not expression.strip():
            raise FormulaEvaluationError("Empty formula")
        try:
            tree = ast.parse(expression, mode="eval")
        except SyntaxError as exc:
            raise FormulaEvaluationError(f"Invalid formula syntax: {exc}")
        self._validate_node(tree.body)
        return self._eval_node(tree.body)

    # ---- validation pass: reject anything not explicitly whitelisted ----
    def _validate_node(self, node) -> None:
        if isinstance(node, ast.Expression):
            self._validate_node(node.body)
        elif isinstance(node, ast.BinOp):
            if not isinstance(node.op, _ALLOWED_BINOPS):
                raise FormulaSecurityError(f"Operator not allowed: {type(node.op).__name__}")
            self._validate_node(node.left)
            self._validate_node(node.right)
        elif isinstance(node, ast.UnaryOp):
            if not isinstance(node.op, _ALLOWED_UNARYOPS):
                raise FormulaSecurityError(f"Unary operator not allowed: {type(node.op).__name__}")
            self._validate_node(node.operand)
        elif isinstance(node, ast.Constant):
            if not isinstance(node.value, (int, float)):
                raise FormulaSecurityError("Only numeric literals are allowed")
        elif isinstance(node, ast.Name):
            pass  # resolved (and validated for existence) at eval time
        else:
            raise FormulaSecurityError(f"Disallowed expression element: {type(node).__name__}")

    # ---- evaluation pass ----
    def _eval_node(self, node) -> Decimal:
        if isinstance(node, ast.Expression):
            return self._eval_node(node.body)
        if isinstance(node, ast.Constant):
            return _to_decimal(node.value)
        if isinstance(node, ast.Name):
            if node.id not in self.context:
                raise FormulaEvaluationError(f"Unknown salary rule code referenced: {node.id}")
            return _to_decimal(self.context[node.id])
        if isinstance(node, ast.UnaryOp):
            val = self._eval_node(node.operand)
            return -val if isinstance(node.op, ast.USub) else val
        if isinstance(node, ast.BinOp):
            left = self._eval_node(node.left)
            right = self._eval_node(node.right)
            if isinstance(node.op, ast.Add):
                return left + right
            if isinstance(node.op, ast.Sub):
                return left - right
            if isinstance(node.op, ast.Mult):
                return left * right
            if isinstance(node.op, ast.Div):
                if right == 0:
                    raise FormulaEvaluationError("Division by zero in formula")
                return left / right
        raise FormulaSecurityError(f"Disallowed expression element: {type(node).__name__}")


def evaluate_formula(expression: str, context: dict[str, Decimal]) -> Decimal:
    return SafeFormulaEvaluator(context).evaluate(expression)
