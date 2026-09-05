import datetime
from sqlalchemy import and_, or_
from sqlalchemy.orm import Session

from app.models.contract import Contract, ContractStatus
from app.core.exceptions import ConflictError


def _overlaps(period_start: datetime.date, period_end: datetime.date):
    """SQLAlchemy filter: contract [start_date, end_date-or-open] overlaps [period_start, period_end]."""
    return and_(
        Contract.start_date <= period_end,
        or_(Contract.end_date.is_(None), Contract.end_date >= period_start),
    )


def get_applicable_contract(db: Session, employee_id: int, period_start: datetime.date,
                             period_end: datetime.date) -> Contract | None:
    """
    Resolve the single contract that applies to `employee_id` for the given
    payroll/reporting period. Active contracts and dated expired contracts are eligible for their historical period.

    If more than one ACTIVE contract overlaps the same period, that is a
    data-integrity problem (overlapping active contracts should never be
    allowed to exist) and we raise a blocking ConflictError rather than
    silently picking one.
    """
    candidates = (
        db.query(Contract)
        .filter(
            Contract.employee_id == employee_id,
            or_(Contract.status == ContractStatus.ACTIVE,
                and_(Contract.status == ContractStatus.EXPIRED, Contract.end_date.is_not(None))),
            _overlaps(period_start, period_end),
        )
        .order_by(Contract.start_date.desc())
        .all()
    )
    if len(candidates) == 0:
        return None
    if len(candidates) > 1:
        raise ConflictError(
            f"Data integrity error: employee {employee_id} has {len(candidates)} overlapping "
            f"eligible contracts for period {period_start}..{period_end}",
            code="CONTRACT_CONFLICT",
        )
    return candidates[0]


def find_overlapping_active_contracts(db: Session, employee_id: int, start_date: datetime.date,
                                       end_date: datetime.date | None, exclude_contract_id: int | None = None):
    """Used on create/update to block overlapping ACTIVE contracts for the same employee."""
    query = db.query(Contract).filter(
        Contract.employee_id == employee_id,
        Contract.status == ContractStatus.ACTIVE,
        Contract.start_date <= (end_date or datetime.date.max),
        or_(Contract.end_date.is_(None), Contract.end_date >= start_date),
    )
    if exclude_contract_id is not None:
        query = query.filter(Contract.id != exclude_contract_id)
    return query.all()
