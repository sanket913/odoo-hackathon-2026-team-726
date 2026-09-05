from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.api.deps import require_permission, get_current_user, CurrentUser
from app.core.permissions import P_MASTER_DATA_MANAGE
from app.models.organization import Department, JobPosition, EmployeeType
from app.schemas.master_data import DepartmentCreate, JobPositionCreate, EmployeeTypeCreate
from app.utils.response import ok

router = APIRouter(tags=["master-data"])


def _dump(rows):
    return [{"id": r.id, "name": r.name, "active": r.active} for r in rows]


@router.get("/departments")
def list_departments(db: Session = Depends(get_db), _: CurrentUser = Depends(get_current_user)):
    return ok(_dump(db.query(Department).order_by(Department.name).all()))


@router.post("/departments")
def create_department(payload: DepartmentCreate, db: Session = Depends(get_db),
                       _=Depends(require_permission(P_MASTER_DATA_MANAGE))):
    d = Department(name=payload.name)
    db.add(d)
    db.commit()
    return ok({"id": d.id, "name": d.name, "active": d.active})


@router.get("/job-positions")
def list_job_positions(db: Session = Depends(get_db), _: CurrentUser = Depends(get_current_user)):
    return ok(_dump(db.query(JobPosition).order_by(JobPosition.name).all()))


@router.post("/job-positions")
def create_job_position(payload: JobPositionCreate, db: Session = Depends(get_db),
                         _=Depends(require_permission(P_MASTER_DATA_MANAGE))):
    j = JobPosition(name=payload.name)
    db.add(j)
    db.commit()
    return ok({"id": j.id, "name": j.name, "active": j.active})


@router.get("/employee-types")
def list_employee_types(db: Session = Depends(get_db), _: CurrentUser = Depends(get_current_user)):
    return ok(_dump(db.query(EmployeeType).order_by(EmployeeType.name).all()))


@router.post("/employee-types")
def create_employee_type(payload: EmployeeTypeCreate, db: Session = Depends(get_db),
                          _=Depends(require_permission(P_MASTER_DATA_MANAGE))):
    e = EmployeeType(name=payload.name)
    db.add(e)
    db.commit()
    return ok({"id": e.id, "name": e.name, "active": e.active})
