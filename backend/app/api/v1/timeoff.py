import datetime
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.api.deps import get_current_user, require_permission, CurrentUser
from app.core.permissions import (
    P_TIMEOFF_REQUEST, P_TIMEOFF_READ_ALL, P_TIMEOFF_APPROVE, P_TIMEOFF_ALLOCATE, P_TIMEOFF_CONFIGURE,
)
from app.core.exceptions import PermissionDeniedError
from app.schemas.time_off import (
    TimeOffTypeCreate, TimeOffTypeUpdate, AllocationCreate, RequestCreate, RequestDecision,
)
from app.services import timeoff_service
from app.models.employee import Employee
from app.utils.response import ok, paginated

router = APIRouter(prefix="/time-off", tags=["time-off"])


# ---- Types ----
@router.get("/types")
def list_types(active: bool | None = None, db: Session = Depends(get_db), _=Depends(get_current_user)):
    return ok([timeoff_service.to_type_dict(t) for t in timeoff_service.list_types(db, active)])


@router.post("/types")
def create_type(payload: TimeOffTypeCreate, db: Session = Depends(get_db),
                 _=Depends(require_permission(P_TIMEOFF_CONFIGURE))):
    t = timeoff_service.create_type(db, payload)
    db.commit()
    return ok(timeoff_service.to_type_dict(t))


@router.patch("/types/{type_id}")
def update_type(type_id: int, payload: TimeOffTypeUpdate, db: Session = Depends(get_db),
                 _=Depends(require_permission(P_TIMEOFF_CONFIGURE))):
    t = timeoff_service.update_type(db, type_id, payload)
    db.commit()
    return ok(timeoff_service.to_type_dict(t))


# ---- Allocations ----
@router.get("/allocations")
def list_allocations(employee_id: int | None = None, status: str | None = None, page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=100), search: str | None = None, date_from: datetime.date | None = None, date_to: datetime.date | None = None, db: Session = Depends(get_db),
                      current: CurrentUser = Depends(get_current_user)):
    if not current.has_permission(P_TIMEOFF_READ_ALL):
        emp = db.query(Employee).filter(Employee.user_id == current.id).first()
        employee_id = emp.id if emp else -1
    rows, total = timeoff_service.list_allocations(db, employee_id, status, page, limit, search, date_from, date_to)
    return paginated([timeoff_service.to_allocation_dict(a) for a in rows], page, limit, total)


@router.post("/allocations")
def create_allocation(payload: AllocationCreate, db: Session = Depends(get_db),
                       _=Depends(require_permission(P_TIMEOFF_ALLOCATE))):
    allocation = timeoff_service.create_allocation(db, payload)
    db.commit()
    return ok(timeoff_service.to_allocation_dict(allocation))


@router.post("/allocations/{allocation_id}/approve")
def approve_allocation(allocation_id: int, db: Session = Depends(get_db),
                        current: CurrentUser = Depends(require_permission(P_TIMEOFF_ALLOCATE))):
    allocation = timeoff_service.approve_allocation(db, allocation_id, current.id)
    db.commit()
    return ok(timeoff_service.to_allocation_dict(allocation))


@router.post("/allocations/{allocation_id}/refuse")
def refuse_allocation(allocation_id: int, db: Session = Depends(get_db),
                       current: CurrentUser = Depends(require_permission(P_TIMEOFF_ALLOCATE))):
    allocation = timeoff_service.refuse_allocation(db, allocation_id, current.id)
    db.commit()
    return ok(timeoff_service.to_allocation_dict(allocation))


# ---- Requests ----
@router.get("/requests")
def list_requests(employee_id: int | None = None, status: str | None = None, page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=100), search: str | None = None, date_from: datetime.date | None = None, date_to: datetime.date | None = None, db: Session = Depends(get_db),
                   current: CurrentUser = Depends(get_current_user)):
    if not current.has_permission(P_TIMEOFF_READ_ALL):
        emp = db.query(Employee).filter(Employee.user_id == current.id).first()
        employee_id = emp.id if emp else -1
    rows, total = timeoff_service.list_requests(db, employee_id, status, page, limit, search, date_from, date_to)
    return paginated([timeoff_service.to_request_dict(r) for r in rows], page, limit, total)


@router.post("/requests")
def create_request(payload: RequestCreate, db: Session = Depends(get_db),
                    current: CurrentUser = Depends(require_permission(P_TIMEOFF_REQUEST))):
    if not current.has_permission(P_TIMEOFF_READ_ALL):
        emp = db.query(Employee).filter(Employee.user_id == current.id).first()
        if not emp or emp.id != payload.employee_id:
            raise PermissionDeniedError("You may only submit requests for yourself")
    request = timeoff_service.create_request(db, payload)
    db.commit()
    return ok(timeoff_service.to_request_dict(request))


@router.get("/requests/{request_id}")
def get_request(request_id: int, db: Session = Depends(get_db), current: CurrentUser = Depends(get_current_user)):
    request = timeoff_service.get_request(db, request_id)
    if not current.has_permission(P_TIMEOFF_READ_ALL):
        emp = db.query(Employee).filter(Employee.user_id == current.id).first()
        if not emp or emp.id != request.employee_id:
            raise PermissionDeniedError("You may only access your own requests")
    return ok(timeoff_service.to_request_dict(request))


@router.post("/requests/{request_id}/approve")
def approve_request(request_id: int, payload: RequestDecision, db: Session = Depends(get_db),
                     current: CurrentUser = Depends(require_permission(P_TIMEOFF_APPROVE))):
    request = timeoff_service.approve_request(db, request_id, current.id, payload.hr_comment)
    db.commit()
    return ok(timeoff_service.to_request_dict(request))


@router.post("/requests/{request_id}/refuse")
def refuse_request(request_id: int, payload: RequestDecision, db: Session = Depends(get_db),
                    current: CurrentUser = Depends(require_permission(P_TIMEOFF_APPROVE))):
    request = timeoff_service.refuse_request(db, request_id, current.id, payload.hr_comment)
    db.commit()
    return ok(timeoff_service.to_request_dict(request))


@router.get("/allocations/{allocation_id}")
def get_allocation(allocation_id: int, db: Session = Depends(get_db), current: CurrentUser = Depends(get_current_user)):
    from app.models.time_off import TimeOffAllocation
    from app.core.exceptions import NotFoundError
    row = db.get(TimeOffAllocation, allocation_id)
    if not row:
        raise NotFoundError("Allocation not found")
    if not current.has_permission(P_TIMEOFF_READ_ALL):
        employee = db.query(Employee).filter(Employee.user_id == current.id).first()
        if not employee or employee.id != row.employee_id:
            raise PermissionDeniedError("You may only access your own allocations")
    return ok(timeoff_service.to_allocation_dict(row))
