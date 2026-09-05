from sqlalchemy.orm import Session

from app.models.salary import SalaryStructure, SalaryRule
from app.models.contract import Contract
from app.core.exceptions import NotFoundError, ValidationAppError
from app.engines.formula_engine import evaluate_formula, FormulaEvaluationError, FormulaSecurityError
from decimal import Decimal


def rule_to_dict(rule: SalaryRule) -> dict:
    return {
        "id": rule.id, "structure_id": rule.structure_id, "name": rule.name, "code": rule.code,
        "category": rule.category.value if hasattr(rule.category, "value") else rule.category,
        "sequence": rule.sequence,
        "computation_type": rule.computation_type.value if hasattr(rule.computation_type, "value") else rule.computation_type,
        "fixed_amount": rule.fixed_amount, "percentage": rule.percentage,
        "base_rule_code": rule.base_rule_code, "formula_text": rule.formula_text, "active": rule.active,
    }


def structure_to_dict(db: Session, structure: SalaryStructure) -> dict:
    return {
        "id": structure.id, "name": structure.name, "code": structure.code,
        "description": structure.description, "active": structure.active,
        "rules_count": len(structure.rules),
        "employees_count": db.query(Contract).filter(Contract.salary_structure_id == structure.id).count(),
        "rules": [rule_to_dict(r) for r in sorted(structure.rules, key=lambda r: r.sequence)],
    }


def list_structures(db: Session, active: bool | None):
    query = db.query(SalaryStructure)
    if active is not None:
        query = query.filter(SalaryStructure.active == active)
    return query.order_by(SalaryStructure.name).all()


def get_structure(db: Session, structure_id: int) -> SalaryStructure:
    s = db.get(SalaryStructure, structure_id)
    if not s:
        raise NotFoundError("Salary structure not found")
    return s


def create_structure(db: Session, payload) -> SalaryStructure:
    existing = db.query(SalaryStructure).filter(SalaryStructure.code == payload.code).first()
    if existing:
        raise ValidationAppError("A salary structure with this code already exists")
    s = SalaryStructure(**payload.model_dump())
    db.add(s)
    db.flush()
    return s


def update_structure(db: Session, structure_id: int, payload) -> SalaryStructure:
    s = get_structure(db, structure_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(s, field, value)
    db.flush()
    return s


def list_rules(db: Session, structure_id: int | None):
    query = db.query(SalaryRule)
    if structure_id:
        query = query.filter(SalaryRule.structure_id == structure_id)
    return query.order_by(SalaryRule.structure_id, SalaryRule.sequence).all()


def get_rule(db: Session, rule_id: int) -> SalaryRule:
    r = db.get(SalaryRule, rule_id)
    if not r:
        raise NotFoundError("Salary rule not found")
    return r


def _validate_rule_payload(computation_type: str, fixed_amount, percentage, formula_text) -> None:
    if computation_type == "Percentage" and percentage is None:
        raise ValidationAppError("percentage is required for Percentage rules")
    if computation_type == "Formula":
        if not formula_text:
            raise ValidationAppError("formula_text is required for Formula rules")
        try:
            # Static safety validation against a synthetic full-numeric context
            evaluate_formula(formula_text, {c: Decimal("1") for c in _extract_names(formula_text)})
        except (FormulaEvaluationError, FormulaSecurityError) as exc:
            raise ValidationAppError(f"Invalid or unsafe formula: {exc}")


def _extract_names(expr: str) -> set[str]:
    import ast
    try:
        tree = ast.parse(expr, mode="eval")
    except SyntaxError:
        return set()
    return {node.id for node in ast.walk(tree) if isinstance(node, ast.Name)}


def create_rule(db: Session, payload) -> SalaryRule:
    # Salary Rule Dependency Validation
    payload.code = payload.code.strip().upper()
    validate_rule_dependency(db, payload.model_dump())
    structure = get_structure(db, payload.structure_id)
    existing = db.query(SalaryRule).filter(
        SalaryRule.structure_id == payload.structure_id, SalaryRule.code == payload.code
    ).first()
    if existing:
        raise ValidationAppError("A rule with this code already exists in the structure")
    _validate_rule_payload(payload.computation_type, payload.fixed_amount, payload.percentage, payload.formula_text)
    rule = SalaryRule(**payload.model_dump())
    db.add(rule)
    db.flush()
    return rule


def update_rule(db: Session, rule_id: int, payload) -> SalaryRule:
    rule = get_rule(db, rule_id)
    data = payload.model_dump(exclude_unset=True)
    # Salary Rule Dependency Validation
    validate_rule_dependency(db, {**rule_to_dict(rule), **data}, rule_id)
    computation_type = data.get("computation_type", rule.computation_type.value if hasattr(rule.computation_type, "value") else rule.computation_type)
    fixed_amount = data.get("fixed_amount", rule.fixed_amount)
    percentage = data.get("percentage", rule.percentage)
    formula_text = data.get("formula_text", rule.formula_text)
    _validate_rule_payload(computation_type, fixed_amount, percentage, formula_text)
    for field, value in data.items():
        setattr(rule, field, value)
    db.flush()
    return rule


# Salary Rule Dependency Validation
DEPENDENCIES = {"HRA": ["BASIC"], "GROSS": ["BASIC", "HRA"], "NET": ["GROSS"], "PF": ["BASIC"]}


def validate_rule_dependency(db, new_rule, exclude_id=None):
    # Serialize configuration changes within a structure. Sequences are unique here.
    structure_id = new_rule["structure_id"]
    db.query(SalaryStructure).filter(SalaryStructure.id == structure_id).with_for_update().first()
    rules = [rule_to_dict(r) for r in db.query(SalaryRule).filter(SalaryRule.structure_id == structure_id).with_for_update().populate_existing().all() if r.id != exclude_id]
    sequence = new_rule["sequence"]
    if sequence is None:
        raise ValidationAppError("Sequence is required", status_code=400)
    for rule in rules:
        if rule["sequence"] == sequence:
            raise ValidationAppError(f"Sequence conflict: sequence {sequence} is already used by rule {rule['code']}", status_code=400)
    rules.append(new_rule)
    by_code = {r["code"].strip().upper(): r for r in rules if r["active"]}
    for code, rule in by_code.items():
        deps = DEPENDENCIES.get(code, [])
        if any(d not in by_code or by_code[d]["sequence"] >= rule["sequence"] for d in deps):
            raise ValidationAppError(f"Dependency failed: {code} requires {', '.join(deps)} to be created before with lower sequence", status_code=400)
