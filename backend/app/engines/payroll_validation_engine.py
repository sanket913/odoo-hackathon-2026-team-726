"""
Payroll integrity warnings. Each warning is classified blocking / non-blocking.
Blocking warnings must be resolved before a Payrun can be Validated.
"""

from sqlalchemy.orm import Session

from app.models.employee import Employee
from app.models.contract import Contract
from app.models.payroll import Payslip


def warning(code: str, message: str, severity: str) -> dict:
    return {"code": code, "message": message, "severity": severity}


def build_warnings(db: Session, employee: Employee, contract: Contract | None, payslip: Payslip | None) -> list[dict]:
    warnings: list[dict] = []

    if contract is None:
        warnings.append(warning(
            "NO_VALID_CONTRACT",
            f"No active contract found for {employee.name} covering this payroll period.",
            "blocking",
        ))

    if not (employee.bank_account or "").strip():
        warnings.append(warning(
            "MISSING_BANK_DETAILS",
            f"{employee.name} has no bank account on file.",
            "non-blocking",
        ))

    if not employee.department_id:
        warnings.append(warning(
            "INCOMPLETE_EMPLOYEE_DATA",
            f"{employee.name} has no department assigned.",
            "non-blocking",
        ))

    if payslip is not None:
        duplicate = (
            db.query(Payslip)
            .filter(
                Payslip.employee_id == employee.id,
                Payslip.period_start == payslip.period_start,
                Payslip.period_end == payslip.period_end,
                Payslip.id != payslip.id,
            )
            .first()
        )
        if duplicate is not None:
            warnings.append(warning(
                "DUPLICATE_PAYSLIP",
                f"Another payslip already exists for {employee.name} covering this exact period.",
                "blocking",
            ))

    return warnings


def has_blocking(warnings: list[dict]) -> bool:
    return any(w.get("severity") == "blocking" for w in warnings)


# Payslip Pre-generation Validator
def validate_payslip_before_generate(employee_id, period_start, period_end, db, exclude_payslip_id=None, lock=False):
    import calendar
    from app.repositories.contract_repository import get_applicable_contract
    from app.core.exceptions import ConflictError, NotFoundError
    employee = db.get(Employee, employee_id)
    if not employee:
        raise NotFoundError("Employee not found")
    result = []
    def add(kind, code, message, severity):
        result.append({**warning(code, message, severity), "type": kind, "msg": message})
    if not (employee.bank_account or "").strip():
        add("bank", "MISSING_BANK_DETAILS", f"Bank account missing for employee {employee_id}", "non-blocking")
    try:
        contract = get_applicable_contract(db, employee_id, period_start, period_end)
        if not contract:
            add("contract", "NO_VALID_CONTRACT", "No active contract", "blocking")
    except ConflictError:
        add("contract", "CONTRACT_CONFLICT", "Multiple overlapping active contracts", "blocking")
    month_start = period_start.replace(day=1)
    month_end = period_start.replace(day=calendar.monthrange(period_start.year, period_start.month)[1])
    query = db.query(Payslip).filter(Payslip.employee_id == employee_id,
        Payslip.period_start >= month_start, Payslip.period_start <= month_end)
    if exclude_payslip_id is not None:
        query = query.filter(Payslip.id != exclude_payslip_id)
    # current read after employee lock under MySQL REPEATABLE READ.
    if lock:
        query = query.with_for_update()
    if query.first():
        add("duplicate", "DUPLICATE_PAYSLIP", f"Payslip already exists for {period_start:%Y-%m}", "blocking")
    return result
