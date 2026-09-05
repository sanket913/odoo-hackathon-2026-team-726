import datetime
from fastapi import APIRouter, Depends, Response, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.api.deps import require_permission, get_current_user, CurrentUser
from app.core.permissions import P_PAYRUN_READ, P_PAYRUN_CREATE, P_PAYRUN_COMPUTE, P_PAYRUN_VALIDATE, P_PAYRUN_MARK_PAID, P_PAYRUN_SEND, P_PAYSLIP_READ_ALL, P_PAYSLIP_PRINT
from app.core.exceptions import PermissionDeniedError, ConflictError
from app.schemas.payroll import EligibilityRequest, PayrunCreateRequest
from app.services import payroll_service
from app.models.employee import Employee
from app.utils.response import ok, paginated
from app.utils.pdf_generator import generate_payslip_pdf

router = APIRouter(tags=["payroll"])


# Payslip Pre-generation Validator
@router.get("/payruns/{payrun_id}/validation-warnings")
def validation_warnings(payrun_id: int, db: Session = Depends(get_db), _=Depends(require_permission(P_PAYRUN_READ))):
    from app.engines.payroll_validation_engine import validate_payslip_before_generate
    payrun = payroll_service.get_payrun(db, payrun_id)
    employees = [{"employee_id": p.employee_id, "employee_name": p.employee.name,
        "warnings": validate_payslip_before_generate(p.employee_id, payrun.period_start, payrun.period_end, db, p.id)}
        for p in payrun.payslips]
    count = sum(len(e["warnings"]) for e in employees)
    return ok({"payrun_id": payrun_id, "has_warnings": count > 0, "warning_count": count, "employees": employees})


@router.post("/payruns/wizard/eligibility")
def wizard_eligibility(payload: EligibilityRequest, db: Session = Depends(get_db),
                        _=Depends(require_permission(P_PAYRUN_CREATE))):
    """Step 1 of the Payrun wizard. Never creates a Payrun."""
    results = payroll_service.compute_eligibility(
        db, payload.salary_structure_id, payload.period_start, payload.period_end, payload.department_id
    )
    return ok(results)


@router.get("/payruns")
def list_payruns(status: str | None = None, page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=100), date_from: datetime.date | None = None, date_to: datetime.date | None = None, search: str | None = None, db: Session = Depends(get_db),
                  _=Depends(require_permission(P_PAYRUN_READ))):
    items, total = payroll_service.list_payruns(db, status, page, limit, search=search, date_from=date_from, date_to=date_to)
    return paginated([payroll_service.payrun_to_dict(p, include_payslips=False) for p in items], page, limit, total)


@router.post("/payruns")
def create_payrun(payload: PayrunCreateRequest, db: Session = Depends(get_db),
                   current: CurrentUser = Depends(require_permission(P_PAYRUN_CREATE))):
    """Step 2 of the Payrun wizard. This is the ONLY endpoint that creates a Payrun."""
    payrun = payroll_service.create_payrun(db, payload, current.id)
    db.commit()
    return ok(payroll_service.payrun_to_dict(payrun))


@router.get("/payruns/{payrun_id}")
def get_payrun(payrun_id: int, db: Session = Depends(get_db), _=Depends(require_permission(P_PAYRUN_READ))):
    payrun = payroll_service.get_payrun(db, payrun_id)
    return ok(payroll_service.payrun_to_dict(payrun))


@router.post("/payruns/{payrun_id}/compute")
def compute_payrun(payrun_id: int, db: Session = Depends(get_db),
                    current: CurrentUser = Depends(require_permission(P_PAYRUN_COMPUTE))):
    payrun = payroll_service.compute_payrun(db, payrun_id, current.id)
    db.commit()
    return ok(payroll_service.payrun_to_dict(payrun))


@router.post("/payruns/{payrun_id}/validate")
def validate_payrun(payrun_id: int, db: Session = Depends(get_db),
                     current: CurrentUser = Depends(require_permission(P_PAYRUN_VALIDATE))):
    payrun = payroll_service.validate_payrun(db, payrun_id, current.id)
    db.commit()
    return ok(payroll_service.payrun_to_dict(payrun))


@router.post("/payruns/{payrun_id}/mark-paid")
def mark_paid(payrun_id: int, db: Session = Depends(get_db),
              current: CurrentUser = Depends(require_permission(P_PAYRUN_MARK_PAID))):
    payrun = payroll_service.mark_paid(db, payrun_id, current.id)
    db.commit()
    return ok(payroll_service.payrun_to_dict(payrun))


@router.post("/payruns/{payrun_id}/send-payslips")
def send_payslips(payrun_id: int, db: Session = Depends(get_db),
                   current: CurrentUser = Depends(require_permission(P_PAYRUN_SEND))):
    result = payroll_service.send_payslips(db, payrun_id, current.id)
    db.commit()
    return ok(result)


@router.get("/payslips")
def list_payslips(employee_id: int | None = None, payrun_id: int | None = None, status: str | None = None,
                   page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=100), date_from: datetime.date | None = None, date_to: datetime.date | None = None, search: str | None = None, db: Session = Depends(get_db),
                   current: CurrentUser = Depends(get_current_user)):
    if not current.has_permission(P_PAYSLIP_READ_ALL):
        emp = db.query(Employee).filter(Employee.user_id == current.id).first()
        employee_id = emp.id if emp else -1
    items, total = payroll_service.list_payslips(db, employee_id, payrun_id, status, page, limit, search=search, date_from=date_from, date_to=date_to)
    return paginated([payroll_service.payslip_to_dict(p) for p in items], page, limit, total)


@router.get("/payslips/{payslip_id}")
def get_payslip(payslip_id: int, db: Session = Depends(get_db), current: CurrentUser = Depends(get_current_user)):
    payslip = payroll_service.get_payslip(db, payslip_id)
    if not current.has_permission(P_PAYSLIP_READ_ALL):
        emp = db.query(Employee).filter(Employee.user_id == current.id).first()
        if not emp or emp.id != payslip.employee_id:
            raise PermissionDeniedError("You may only access your own payslip")
    return ok(payroll_service.payslip_to_dict(payslip))


@router.get("/payslips/{payslip_id}/pdf")
def download_payslip_pdf(payslip_id: int, db: Session = Depends(get_db), current: CurrentUser = Depends(get_current_user)):
    payslip = payroll_service.get_payslip(db, payslip_id)
    if not current.has_permission(P_PAYSLIP_READ_ALL) and not current.has_permission(P_PAYSLIP_PRINT):
        raise PermissionDeniedError("Missing payslip print permission")
    if not current.has_permission(P_PAYSLIP_READ_ALL):
        emp = db.query(Employee).filter(Employee.user_id == current.id).first()
        if not emp or emp.id != payslip.employee_id:
            raise PermissionDeniedError("You may only download your own payslip")
    if payslip.status != "Paid":
        raise ConflictError("PDF download is available only after the payslip is marked Paid.", code="PAYSLIP_NOT_PAID")
    pdf_bytes = generate_payslip_pdf(payslip)
    return Response(content=pdf_bytes, media_type="application/pdf", headers={
        "Content-Disposition": f'inline; filename="payslip-{payslip.id}.pdf"'
    })
