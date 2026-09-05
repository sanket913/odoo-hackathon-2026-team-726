from sqlalchemy.orm import Session, joinedload, selectinload
from sqlalchemy import or_

from app.models.contract import Contract, ContractStatus
from app.models.employee import Employee
from app.repositories.contract_repository import find_overlapping_active_contracts, get_applicable_contract
from app.core.exceptions import NotFoundError, ConflictError


def to_out_dict(contract: Contract) -> dict:
    return {
        "id": contract.id,
        "employee_id": contract.employee_id,
        "employee_name": contract.employee.name if contract.employee else None,
        "reference": contract.reference,
        "start_date": contract.start_date,
        "end_date": contract.end_date,
        "wage": contract.wage,
        "department_id": contract.department_id,
        "job_position_id": contract.job_position_id,
        "salary_structure_id": contract.salary_structure_id,
        "salary_structure_name": contract.salary_structure.name if contract.salary_structure else None,
        "working_schedule_id": contract.working_schedule_id,
        "status": contract.status.value if hasattr(contract.status, "value") else contract.status,
    }


def list_contracts(db: Session, employee_id: int | None, status: str | None, page: int, limit: int, search=None, date_from=None, date_to=None):
    query = db.query(Contract)
    if employee_id:
        query = query.filter(Contract.employee_id == employee_id)
    if status:
        query = query.filter(Contract.status == status)
    if search:
        like = f"%{search}%"
        query = query.filter(or_(Contract.reference.ilike(like), Contract.employee.has(Employee.name.ilike(like))))
    if date_from:
        query = query.filter(or_(Contract.end_date.is_(None), Contract.end_date >= date_from))
    if date_to:
        query = query.filter(Contract.start_date <= date_to)
    total = query.count()
    items = query.options(joinedload(Contract.employee), joinedload(Contract.salary_structure)).order_by(Contract.start_date.desc(), Contract.id.desc()).offset((page - 1) * limit).limit(limit).all()
    return items, total


def get_contract(db: Session, contract_id: int) -> Contract:
    contract = db.get(Contract, contract_id)
    if not contract:
        raise NotFoundError("Contract not found")
    return contract


def create_contract(db: Session, payload) -> Contract:
    employee = db.get(Employee, payload.employee_id)
    if not employee:
        raise NotFoundError("Employee not found")

    if payload.status == ContractStatus.ACTIVE.value or payload.status == ContractStatus.ACTIVE:
        overlapping = find_overlapping_active_contracts(db, payload.employee_id, payload.start_date, payload.end_date)
        if overlapping:
            raise ConflictError(
                "This employee already has an active contract overlapping the given period.",
                code="CONTRACT_OVERLAP",
            )

    from app.services.identifier_service import next_identifier
    reference = next_identifier(db, f"contract-{payload.start_date.year}",
                                f"CTR-{payload.start_date.year}-", Contract, Contract.reference)
    contract = Contract(
        employee_id=payload.employee_id,
        reference=reference,
        start_date=payload.start_date,
        end_date=payload.end_date,
        wage=payload.wage,
        department_id=payload.department_id,
        job_position_id=payload.job_position_id,
        salary_structure_id=payload.salary_structure_id,
        working_schedule_id=payload.working_schedule_id,
        status=payload.status,
    )
    db.add(contract)
    db.flush()
    return contract


def update_contract(db: Session, contract_id: int, payload) -> Contract:
    contract = get_contract(db, contract_id)
    data = payload.model_dump(exclude_unset=True)
    if data.get("reference") not in (None, contract.reference):
        raise ConflictError("Contract reference is generated automatically and cannot be changed.")
    data.pop("reference", None)

    new_start = data.get("start_date", contract.start_date)
    new_end = data.get("end_date", contract.end_date)
    new_status = data.get("status", contract.status)

    if new_status == ContractStatus.ACTIVE.value or new_status == ContractStatus.ACTIVE:
        overlapping = find_overlapping_active_contracts(
            db, contract.employee_id, new_start, new_end, exclude_contract_id=contract.id
        )
        if overlapping:
            raise ConflictError(
                "Updating this contract would overlap with another active contract for the employee.",
                code="CONTRACT_OVERLAP",
            )

    for field, value in data.items():
        setattr(contract, field, value)
    db.flush()
    return contract


def applicable_contract(db: Session, employee_id: int, period_start, period_end) -> Contract | None:
    return get_applicable_contract(db, employee_id, period_start, period_end)
