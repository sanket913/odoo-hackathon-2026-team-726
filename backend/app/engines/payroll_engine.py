"""
Core payroll computation engine.

For a single Payslip:
    1. Resolve the applicable contract for the period (via contract_repository)
    2. Load the salary structure's rules ordered by sequence
    3. Execute each rule (Fixed / Percentage / Formula) against a running
       context of already-computed rule codes
    4. Persist one PayslipLine per rule
    5. Derive Basic / Gross / Net from rule categories
    6. Attach integrity warnings

All monetary arithmetic uses Decimal - never float.
"""
from decimal import Decimal, ROUND_HALF_UP
import datetime

from sqlalchemy.orm import Session

from app.models.contract import Contract
from app.models.salary import SalaryRule, ComputationType, RuleCategory
from app.models.payroll import Payslip, PayslipLine, PayslipStatus
from app.models.attendance import Attendance, AttendanceStatus
from app.models.time_off import TimeOffRequest, RequestStatus
from app.repositories.contract_repository import get_applicable_contract
from app.engines.formula_engine import evaluate_formula, FormulaEvaluationError, FormulaSecurityError
from app.engines.payroll_validation_engine import build_warnings, warning
from app.core.exceptions import ConflictError

TWO_PLACES = Decimal("0.01")


def _q(value: Decimal) -> Decimal:
    return value.quantize(TWO_PLACES, rounding=ROUND_HALF_UP)


def _count_worked_days(db: Session, employee_id: int, period_start: datetime.date, period_end: datetime.date) -> Decimal:
    present_statuses = (AttendanceStatus.PRESENT, AttendanceStatus.OVERTIME, AttendanceStatus.LATE,
                        AttendanceStatus.HALF_DAY)
    rows = (
        db.query(Attendance)
        .filter(
            Attendance.employee_id == employee_id,
            Attendance.date >= period_start,
            Attendance.date <= period_end,
            Attendance.status.in_(present_statuses),
        )
        .all()
    )
    total = Decimal("0.00")
    for row in rows:
        total += Decimal("0.50") if row.status == AttendanceStatus.HALF_DAY else Decimal("1.00")
    return total


def compute_payslip(db: Session, payslip: Payslip) -> Payslip:
    """Runs the salary structure's rules for this payslip's employee/period and
    persists PayslipLine rows + computed totals + warnings. Mutates and returns
    the same Payslip instance (caller commits)."""

    employee = payslip.employee
    try:
        contract = get_applicable_contract(db, employee.id, payslip.period_start, payslip.period_end)
    except ConflictError:
        payslip.warning_messages = [warning(
            "CONTRACT_CONFLICT",
            f"Multiple overlapping active contracts found for {employee.name}; payroll cannot proceed.",
            "blocking",
        )]
        payslip.contract_id = None
        payslip.basic_amount = Decimal("0.00")
        payslip.gross_amount = Decimal("0.00")
        payslip.net_amount = Decimal("0.00")
        payslip.status = PayslipStatus.COMPUTED
        payslip.lines.clear()
        return payslip

    payslip.contract_id = contract.id if contract else None
    payslip.worked_days = _count_worked_days(db, employee.id, payslip.period_start, payslip.period_end)

    rules: list[SalaryRule] = list(payslip.payrun.salary_structure.rules)
    rules = [r for r in rules if r.active]
    rules.sort(key=lambda r: r.sequence)

    context: dict[str, Decimal] = {}
    wage = contract.wage if contract else Decimal("0.00")
    context["WAGE"] = wage
    context["WORKED_DAYS"] = payslip.worked_days
    context["PERIOD_DAYS"] = Decimal((payslip.period_end - payslip.period_start).days + 1)
    attendance = db.query(Attendance).filter(Attendance.employee_id == employee.id,
        Attendance.date >= payslip.period_start, Attendance.date <= payslip.period_end).all()
    context["WORKED_HOURS"] = sum((row.worked_hours for row in attendance), Decimal("0"))
    schedule = (contract.working_schedule if contract else None) or employee.working_schedule
    expected_hours = Decimal("0")
    expected_days = Decimal("0")
    cursor = payslip.period_start
    while cursor <= payslip.period_end:
        hours = sum((line.duration_hours() for line in schedule.lines if line.day_of_week == cursor.weekday()), Decimal("0")) if schedule else Decimal("0")
        expected_hours += hours
        expected_days += Decimal(1) if hours > 0 else Decimal(0)
        cursor += datetime.timedelta(days=1)
    context["SCHEDULED_HOURS"] = expected_hours
    context["SCHEDULED_DAYS"] = expected_days
    context["OVERTIME_HOURS"] = sum((max(Decimal("0"), row.worked_hours - sum(
        (line.duration_hours() for line in schedule.lines if line.day_of_week == row.date.weekday()), Decimal("0")))
        for row in attendance), Decimal("0")) if schedule else Decimal("0")
    unpaid_dates = set()
    for leave in db.query(TimeOffRequest).filter(TimeOffRequest.employee_id == employee.id,
        TimeOffRequest.status == RequestStatus.APPROVED, TimeOffRequest.from_date <= payslip.period_end,
        TimeOffRequest.to_date >= payslip.period_start).all():
        if leave.time_off_type.deduct_from_payroll:
            cursor = max(leave.from_date, payslip.period_start)
            while cursor <= min(leave.to_date, payslip.period_end):
                unpaid_dates.add(cursor)
                cursor += datetime.timedelta(days=1)
    context["UNPAID_DAYS"] = Decimal(len(unpaid_dates))

    new_lines: list[PayslipLine] = []
    rule_warnings: list[dict] = []

    for rule in rules:
        try:
            if rule.computation_type == ComputationType.FIXED:
                amount = Decimal(rule.fixed_amount or 0)
            elif rule.computation_type == ComputationType.PERCENTAGE:
                base_code = rule.base_rule_code or "WAGE"
                base_value = context.get(base_code)
                if base_value is None:
                    rule_warnings.append(warning(
                        "RULE_BASE_MISSING",
                        f"Rule {rule.code} references unknown base '{base_code}'.",
                        "non-blocking",
                    ))
                    base_value = Decimal("0.00")
                pct = Decimal(rule.percentage or 0)
                amount = base_value * pct / Decimal("100")
            elif rule.computation_type == ComputationType.FORMULA:
                # BASIC salary rules commonly resolve straight from the contract wage
                # when no formula is supplied.
                if rule.formula_text:
                    amount = evaluate_formula(rule.formula_text, context)
                else:
                    amount = wage if rule.category == RuleCategory.BASIC else Decimal("0.00")
            else:
                amount = Decimal("0.00")
        except (FormulaEvaluationError, FormulaSecurityError) as exc:
            rule_warnings.append(warning("FORMULA_ERROR", f"Rule {rule.code}: {exc}", "blocking"))
            amount = Decimal("0.00")

        amount = _q(amount)
        context[rule.code] = amount

        new_lines.append(PayslipLine(
            salary_rule_id=rule.id,
            name=rule.name,
            code=rule.code,
            category=rule.category.value if hasattr(rule.category, "value") else str(rule.category),
            sequence=rule.sequence,
            amount=amount,
        ))

    payslip.lines.clear()
    db.flush()
    for line in new_lines:
        payslip.lines.append(line)

    basic = next((l.amount for l in new_lines if l.category == RuleCategory.BASIC.value), Decimal("0.00"))
    gross = next((l.amount for l in reversed(new_lines) if l.category == RuleCategory.GROSS.value), None)
    net = next((l.amount for l in reversed(new_lines) if l.category == RuleCategory.NET.value), None)

    if gross is None:
        gross = sum((l.amount for l in new_lines if l.category in (RuleCategory.BASIC.value, RuleCategory.ALLOWANCE.value)), Decimal("0.00"))
    if net is None:
        deductions = sum((l.amount for l in new_lines if l.category == RuleCategory.DEDUCTION.value), Decimal("0.00"))
        net = gross - deductions

    payslip.basic_amount = _q(basic)
    payslip.gross_amount = _q(gross)
    payslip.net_amount = _q(net)

    warnings = build_warnings(db, employee, contract, payslip) + rule_warnings
    payslip.warning_messages = warnings
    payslip.status = PayslipStatus.COMPUTED
    return payslip
