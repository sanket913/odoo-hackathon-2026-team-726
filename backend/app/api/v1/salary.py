from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.api.deps import require_permission
from app.core.permissions import P_SALARY_STRUCTURE_READ, P_SALARY_STRUCTURE_MANAGE, P_SALARY_RULE_READ, P_SALARY_RULE_MANAGE
from app.schemas.salary import SalaryStructureCreate, SalaryStructureUpdate, SalaryRuleCreate, SalaryRuleUpdate
from app.services import salary_service
from app.utils.response import ok

router = APIRouter(tags=["salary"])


@router.get("/salary-structures")
def list_structures(active: bool | None = None, db: Session = Depends(get_db),
                     _=Depends(require_permission(P_SALARY_STRUCTURE_READ))):
    rows = salary_service.list_structures(db, active)
    return ok([salary_service.structure_to_dict(db, s) for s in rows])


@router.post("/salary-structures")
def create_structure(payload: SalaryStructureCreate, db: Session = Depends(get_db),
                      _=Depends(require_permission(P_SALARY_STRUCTURE_MANAGE))):
    s = salary_service.create_structure(db, payload)
    db.commit()
    return ok(salary_service.structure_to_dict(db, s))


@router.get("/salary-structures/{structure_id}")
def get_structure(structure_id: int, db: Session = Depends(get_db),
                   _=Depends(require_permission(P_SALARY_STRUCTURE_READ))):
    s = salary_service.get_structure(db, structure_id)
    return ok(salary_service.structure_to_dict(db, s))


@router.patch("/salary-structures/{structure_id}")
def update_structure(structure_id: int, payload: SalaryStructureUpdate, db: Session = Depends(get_db),
                      _=Depends(require_permission(P_SALARY_STRUCTURE_MANAGE))):
    s = salary_service.update_structure(db, structure_id, payload)
    db.commit()
    return ok(salary_service.structure_to_dict(db, s))


@router.get("/salary-rules")
def list_rules(structure_id: int | None = None, db: Session = Depends(get_db),
                _=Depends(require_permission(P_SALARY_RULE_READ))):
    rows = salary_service.list_rules(db, structure_id)
    return ok([salary_service.rule_to_dict(r) for r in rows])


@router.post("/salary-rules")
def create_rule(payload: SalaryRuleCreate, db: Session = Depends(get_db),
                 _=Depends(require_permission(P_SALARY_RULE_MANAGE))):
    r = salary_service.create_rule(db, payload)
    db.commit()
    return ok(salary_service.rule_to_dict(r))


@router.get("/salary-rules/{rule_id}")
def get_rule(rule_id: int, db: Session = Depends(get_db), _=Depends(require_permission(P_SALARY_RULE_READ))):
    r = salary_service.get_rule(db, rule_id)
    return ok(salary_service.rule_to_dict(r))


@router.patch("/salary-rules/{rule_id}")
def update_rule(rule_id: int, payload: SalaryRuleUpdate, db: Session = Depends(get_db),
                 _=Depends(require_permission(P_SALARY_RULE_MANAGE))):
    r = salary_service.update_rule(db, rule_id, payload)
    db.commit()
    return ok(salary_service.rule_to_dict(r))
