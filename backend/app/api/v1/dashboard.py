import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.api.deps import require_permission
from app.core.permissions import P_DASHBOARD_READ
from app.services.dashboard_service import get_payroll_dashboard
from app.utils.response import ok

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


# Live Salary Burn
@router.get("/salary-burn-live")
def salary_burn_live(department_id: int | None = None, employee_type_id: int | None = None,
                     db: Session = Depends(get_db), _=Depends(require_permission(P_DASHBOARD_READ))):
    from app.services.dashboard_service import salary_burn_live as calculate
    return ok(calculate(db, department_id, employee_type_id))


@router.get("/payroll")
def payroll_dashboard(period_start: datetime.date | None = None, period_end: datetime.date | None = None,
                       department_id: int | None = None, employee_type_id: int | None = None,
                       db: Session = Depends(get_db), _=Depends(require_permission(P_DASHBOARD_READ))):
    data = get_payroll_dashboard(db, period_start, period_end, department_id, employee_type_id)
    return ok(data)
