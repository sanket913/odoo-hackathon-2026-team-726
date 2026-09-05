import datetime
from decimal import Decimal
from sqlalchemy.orm import Session, joinedload, selectinload
from sqlalchemy import or_

from app.models.employee import Employee
from app.models.contract import Contract
from app.models.salary import SalaryStructure
from app.models.payroll import Payrun, Payslip, PayrunStatus, PayslipStatus, PAYRUN_TRANSITIONS
from app.repositories.contract_repository import get_applicable_contract
from app.core.exceptions import NotFoundError, ValidationAppError, ConflictError, InvalidStateTransitionError
from app.engines.payroll_engine import compute_payslip
from app.engines.payroll_validation_engine import has_blocking, validate_payslip_before_generate
from app.services.audit_service import write_audit
from app.services.notification_service import notify
from app.core.config import settings


def payslip_to_dict(payslip: Payslip) -> dict:
    return {
        "id": payslip.id,
        "payrun_id": payslip.payrun_id,
        "employee_id": payslip.employee_id,
        "employee_name": payslip.employee.name if payslip.employee else None,
        "contract_id": payslip.contract_id,
        "period_start": payslip.period_start,
        "period_end": payslip.period_end,
        "worked_days": payslip.worked_days,
        "status": payslip.status.value if hasattr(payslip.status, "value") else payslip.status,
        "warning_messages": payslip.warning_messages,
        "basic_amount": payslip.basic_amount,
        "gross_amount": payslip.gross_amount,
        "net_amount": payslip.net_amount,
        "sent_at": payslip.sent_at,
        "lines": [
            {
                "id": l.id, "salary_rule_id": l.salary_rule_id, "name": l.name, "code": l.code,
                "category": l.category, "sequence": l.sequence, "amount": l.amount,
            }
            for l in sorted(payslip.lines, key=lambda x: x.sequence)
        ],
    }


def payrun_to_dict(payrun: Payrun, include_payslips: bool = True) -> dict:
    return {
        "id": payrun.id,
        "name": payrun.name,
        "salary_structure_id": payrun.salary_structure_id,
        "salary_structure_name": payrun.salary_structure.name if payrun.salary_structure else None,
        "department_id": payrun.department_id,
        "period_start": payrun.period_start,
        "period_end": payrun.period_end,
        "status": payrun.status.value if hasattr(payrun.status, "value") else payrun.status,
        "total_employees": payrun.total_employees,
        "total_net": payrun.total_net,
        "validated_at": payrun.validated_at,
        "paid_at": payrun.paid_at,
        "payslips": [payslip_to_dict(p) for p in payrun.payslips] if include_payslips else [],
    }


def compute_eligibility(db: Session, salary_structure_id: int, period_start, period_end,
                         department_id: int | None) -> list[dict]:
    # period-aware contract eligibility, preserving diagnostic rows.
    if period_end < period_start:
        raise ValidationAppError("Invalid pay period", status_code=400)
    structure = db.get(SalaryStructure, salary_structure_id)
    if not structure:
        raise NotFoundError("Salary structure not found")

    query = db.query(Employee).filter(Employee.active.is_(True))
    if department_id:
        query = query.filter(Employee.department_id == department_id)
    employees = query.order_by(Employee.name).all()

    results = []
    for emp in employees:
        try:
            contract = get_applicable_contract(db, emp.id, period_start, period_end)
        except ConflictError:
            results.append({
                "employee_id": emp.id, "name": emp.name,
                "department_name": emp.department.name if emp.department else None,
                "employee_type_name": emp.employee_type.name if emp.employee_type else None,
                "contract_id": None, "wage": None, "eligible": False,
                "reason": "Multiple overlapping active contracts (data integrity error)",
                "has_warning": True, "warning": "Multiple overlapping active contracts",
            })
            continue
        if contract is None:
            results.append({
                "employee_id": emp.id, "name": emp.name,
                "department_name": emp.department.name if emp.department else None,
                "employee_type_name": emp.employee_type.name if emp.employee_type else None,
                "contract_id": None, "wage": None, "eligible": False,
                "reason": "No active contract for this period - cannot generate payslip",
                "has_warning": True, "warning": "No active contract for this period - cannot generate payslip",
            })
            continue
        results.append({
            "employee_id": emp.id, "name": emp.name,
            "department_name": emp.department.name if emp.department else None,
            "employee_type_name": emp.employee_type.name if emp.employee_type else None,
            "contract_id": contract.id, "wage": contract.wage, "eligible": True, "reason": None,
            "has_warning": False, "warning": None,
        })
    return results


def create_payrun(db: Session, payload, actor_user_id: int | None) -> Payrun:
    # Payslip Pre-generation Validator
    if payload.period_end < payload.period_start:
        raise ValidationAppError("Invalid pay period", status_code=400)
    structure = db.get(SalaryStructure, payload.salary_structure_id)
    if not structure:
        raise NotFoundError("Salary structure not found")
    if not payload.employee_ids:
        raise ValidationAppError("At least one employee must be selected to create a Payrun")

    month_label = payload.period_start.strftime("%B %Y")
    payrun = Payrun(
        name=f"{month_label} - {structure.name}",
        salary_structure_id=structure.id,
        department_id=payload.department_id,
        period_start=payload.period_start,
        period_end=payload.period_end,
        status=PayrunStatus.DRAFT,
        created_by_user_id=actor_user_id,
    )
    db.add(payrun)
    db.flush()

    created = 0
    # Employee locks serialize generation across payruns/months.
    for employee_id in sorted(set(payload.employee_ids)):
        employee = db.query(Employee).filter(Employee.id == employee_id).with_for_update().first()
        if not employee or not employee.active:
            raise ValidationAppError("Selected employee is missing or inactive", status_code=400)
        warnings = validate_payslip_before_generate(employee_id, payload.period_start, payload.period_end, db, lock=True)
        if has_blocking(warnings):
            raise ConflictError("; ".join(w["message"] for w in warnings if w["severity"] == "blocking"))
        payslip = Payslip(
            payrun_id=payrun.id,
            employee_id=employee_id,
            period_start=payload.period_start,
            period_end=payload.period_end,
            status=PayslipStatus.DRAFT,
        )
        db.add(payslip)
        created += 1

    payrun.total_employees = created
    db.flush()
    write_audit(db, actor_user_id, "Payrun", payrun.id, "CREATE", after=payrun_to_dict(payrun, include_payslips=False))
    return payrun


def get_payrun(db: Session, payrun_id: int) -> Payrun:
    payrun = db.query(Payrun).options(joinedload(Payrun.salary_structure), selectinload(Payrun.payslips).joinedload(Payslip.employee), selectinload(Payrun.payslips).selectinload(Payslip.lines)).filter(Payrun.id == payrun_id).first()
    if not payrun:
        raise NotFoundError("Payrun not found")
    return payrun


def _assert_transition(payrun: Payrun, target: PayrunStatus) -> None:
    allowed = PAYRUN_TRANSITIONS.get(payrun.status, set())
    if target not in allowed:
        raise InvalidStateTransitionError(
            f"Cannot move Payrun from {payrun.status.value} to {target.value}",
            code="INVALID_STATE_TRANSITION",
        )


def compute_payrun(db: Session, payrun_id: int, actor_user_id: int | None) -> Payrun:
    # serialize compute/validate/payment transitions.
    payrun = db.query(Payrun).filter(Payrun.id == payrun_id).with_for_update().first()
    if not payrun:
        raise NotFoundError("Payrun not found")
    _assert_transition(payrun, PayrunStatus.COMPUTED)

    total_net = Decimal("0.00")
    for payslip in payrun.payslips:
        # independently revalidate at actual computation.
        warnings = validate_payslip_before_generate(payslip.employee_id, payslip.period_start, payslip.period_end, db, payslip.id)
        if has_blocking(warnings):
            raise ConflictError("; ".join(w["message"] for w in warnings if w["severity"] == "blocking"))
        compute_payslip(db, payslip)
        total_net += payslip.net_amount
    payrun.total_net = total_net
    payrun.status = PayrunStatus.COMPUTED
    db.flush()
    write_audit(db, actor_user_id, "Payrun", payrun.id, "COMPUTE", after={"total_net": str(total_net)})
    return payrun


def validate_payrun(db: Session, payrun_id: int, actor_user_id: int | None) -> Payrun:
    payrun = db.query(Payrun).filter(Payrun.id == payrun_id).with_for_update().first()
    if not payrun:
        raise NotFoundError("Payrun not found")
    _assert_transition(payrun, PayrunStatus.VALIDATED)

    if not payrun.payslips:
        raise ValidationAppError("Payrun has no payslips to validate")
    for payslip in payrun.payslips:
        if payslip.status != PayslipStatus.COMPUTED:
            raise ValidationAppError("All payslips must be Computed before validation")
        # recheck source data changed since computation.
        latest = validate_payslip_before_generate(payslip.employee_id, payslip.period_start, payslip.period_end, db, payslip.id)
        if has_blocking(latest):
            raise ConflictError("; ".join(w["message"] for w in latest if w["severity"] == "blocking"))
        if has_blocking(payslip.warning_messages or []):
            raise ConflictError(
                f"Payslip for {payslip.employee.name if payslip.employee else payslip.employee_id} has unresolved "
                f"blocking warnings.",
                code="BLOCKING_WARNINGS",
            )

    for payslip in payrun.payslips:
        payslip.status = PayslipStatus.VALIDATED
    payrun.status = PayrunStatus.VALIDATED
    payrun.validated_at = datetime.datetime.utcnow()
    db.flush()
    write_audit(db, actor_user_id, "Payrun", payrun.id, "VALIDATE")
    return payrun


def mark_paid(db: Session, payrun_id: int, actor_user_id: int | None) -> Payrun:
    payrun = db.query(Payrun).filter(Payrun.id == payrun_id).with_for_update().first()
    if not payrun:
        raise NotFoundError("Payrun not found")
    if payrun.status == PayrunStatus.PAID:
        return payrun
    _assert_transition(payrun, PayrunStatus.PAID)

    for payslip in payrun.payslips:
        payslip.status = PayslipStatus.PAID
        employee = db.get(Employee, payslip.employee_id)
        notify(db, employee.user_id if employee else None, "Payslip paid",
               f"Your payslip for {payslip.period_start} to {payslip.period_end} has been marked paid.",
               category="payroll", link=f"/payroll/payslips/{payslip.id}")
    payrun.status = PayrunStatus.PAID
    payrun.paid_at = datetime.datetime.utcnow()
    db.flush()
    write_audit(db, actor_user_id, "Payrun", payrun.id, "MARK_PAID")
    return payrun


def send_payslips(db: Session, payrun_id: int, actor_user_id: int | None) -> dict:
    payrun = get_payrun(db, payrun_id)
    if payrun.status not in (PayrunStatus.VALIDATED, PayrunStatus.PAID):
        raise ValidationAppError("Payslips can only be sent once the Payrun is Validated or Paid")

    if not settings.smtp_configured:
        write_audit(db, actor_user_id, "Payrun", payrun.id, "SEND_ATTEMPT",
                    meta={"status": "EMAIL_NOT_CONFIGURED", "count": len(payrun.payslips)})
        db.flush()
        return {"status": "EMAIL_NOT_CONFIGURED", "sent": 0, "total": len(payrun.payslips)}

    # SMTP is configured: attempt real delivery via the email adapter.
    from app.utils.email_adapter import send_payslip_email
    sent = 0
    for payslip in payrun.payslips:
        employee = db.get(Employee, payslip.employee_id)
        if employee and employee.email:
            ok = send_payslip_email(employee.email, employee.name, payslip)
            if ok:
                payslip.sent_at = datetime.datetime.utcnow()
                sent += 1
    db.flush()
    write_audit(db, actor_user_id, "Payrun", payrun.id, "SEND",
                meta={"status": "SENT", "count": sent})
    return {"status": "SENT", "sent": sent, "total": len(payrun.payslips)}


def list_payruns(db: Session, status: str | None, page: int, limit: int, search=None, date_from=None, date_to=None):
    query = db.query(Payrun)
    if status:
        query = query.filter(Payrun.status == status)
    if search:
        like = f"%{search}%"
        query = query.filter(Payrun.name.ilike(like))
    if date_from:
        query = query.filter(Payrun.period_end >= date_from)
    if date_to:
        query = query.filter(Payrun.period_start <= date_to)
    total = query.count()
    items = query.options(joinedload(Payrun.salary_structure)).order_by(Payrun.period_start.desc(), Payrun.id.desc()).offset((page - 1) * limit).limit(limit).all()
    return items, total


def list_payslips(db: Session, employee_id: int | None, payrun_id: int | None, status: str | None,
                   page: int, limit: int, search=None, date_from=None, date_to=None):
    query = db.query(Payslip)
    if employee_id:
        query = query.filter(Payslip.employee_id == employee_id)
    if payrun_id:
        query = query.filter(Payslip.payrun_id == payrun_id)
    if status:
        query = query.filter(Payslip.status == status)
    if search:
        like = f"%{search}%"
        query = query.filter(Payslip.employee.has(Employee.name.ilike(like)))
    if date_from:
        query = query.filter(Payslip.period_end >= date_from)
    if date_to:
        query = query.filter(Payslip.period_start <= date_to)
    total = query.count()
    items = query.options(joinedload(Payslip.employee), selectinload(Payslip.lines)).order_by(Payslip.period_start.desc(), Payslip.id.desc()).offset((page - 1) * limit).limit(limit).all()
    return items, total


def get_payslip(db: Session, payslip_id: int) -> Payslip:
    payslip = db.get(Payslip, payslip_id)
    if not payslip:
        raise NotFoundError("Payslip not found")
    return payslip
