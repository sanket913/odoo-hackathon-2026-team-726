import datetime
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.api.deps import require_permission, get_current_user, CurrentUser
from app.core.permissions import P_CONTRACT_READ, P_CONTRACT_CREATE, P_CONTRACT_UPDATE, P_EMPLOYEE_READ_ALL

from app.schemas.contract import ContractCreate, ContractUpdate
from app.services import contract_service
from app.utils.response import ok, paginated

router = APIRouter(prefix="/contracts", tags=["contracts"])


@router.get("")
def list_contracts(employee_id: int | None = None, status: str | None = None, page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=100),
                    search: str | None = None, db: Session = Depends(get_db), current: CurrentUser = Depends(get_current_user)):
    if not current.has_permission(P_EMPLOYEE_READ_ALL):
        # Employee role: force scope to self
        from app.models.employee import Employee
        emp = db.query(Employee).filter(Employee.user_id == current.id).first()
        employee_id = emp.id if emp else -1
    items, total = contract_service.list_contracts(db, employee_id, status, page, limit, search=search)
    return paginated([contract_service.to_out_dict(c) for c in items], page, limit, total)


@router.post("")
def create_contract(payload: ContractCreate, db: Session = Depends(get_db),
                     _=Depends(require_permission(P_CONTRACT_CREATE))):
    contract = contract_service.create_contract(db, payload)
    db.commit()
    return ok(contract_service.to_out_dict(contract))


@router.get("/applicable")
def applicable_contract(employeeId: int, periodStart: datetime.date, periodEnd: datetime.date,
                         db: Session = Depends(get_db), _=Depends(require_permission(P_CONTRACT_READ))):
    contract = contract_service.applicable_contract(db, employeeId, periodStart, periodEnd)
    return ok(contract_service.to_out_dict(contract) if contract else None)


@router.get("/{contract_id}")
def get_contract(contract_id: int, db: Session = Depends(get_db), _=Depends(require_permission(P_CONTRACT_READ))):
    contract = contract_service.get_contract(db, contract_id)
    return ok(contract_service.to_out_dict(contract))


@router.patch("/{contract_id}")
def update_contract(contract_id: int, payload: ContractUpdate, db: Session = Depends(get_db),
                     _=Depends(require_permission(P_CONTRACT_UPDATE))):
    contract = contract_service.update_contract(db, contract_id, payload)
    db.commit()
    return ok(contract_service.to_out_dict(contract))
