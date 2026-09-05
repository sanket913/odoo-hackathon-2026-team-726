import datetime
from decimal import Decimal
from dateutil.relativedelta import relativedelta
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func

from app.models.employee import Employee
from app.models.organization import Department
from app.models.payroll import Payslip, PayslipStatus
from app.models.attendance import Attendance, AttendanceStatus
from app.models.time_off import TimeOffRequest, TimeOffAllocation, RequestStatus, AllocationStatus


# Live Salary Burn
def salary_burn_live(db, department_id=None, employee_type_id=None):
    from app.models.contract import Contract, ContractStatus
    from app.repositories.contract_repository import _overlaps
    from app.utils.attendance_rules import business_time, utc_now
    today = business_time(utc_now()).date()
    query = db.query(Employee.department_id, Department.name, func.sum(Contract.wage)).join(
        Contract, Contract.employee_id == Employee.id
    ).outerjoin(Department, Department.id == Employee.department_id).filter(
        Contract.status == ContractStatus.ACTIVE, _overlaps(today, today)
    )
    if department_id:
        query = query.filter(Employee.department_id == department_id)
    if employee_type_id:
        query = query.filter(Employee.employee_type_id == employee_type_id)
    rows = query.group_by(Employee.department_id, Department.name).all()
    return {"total_monthly_burn": sum((r[2] for r in rows), Decimal("0.00")),
            "dept_burn": [{"department_id": r[0], "department_name": r[1], "monthly_burn": r[2]} for r in rows]}


def _default_period():
    today = datetime.date.today()
    start = today.replace(day=1)
    if start.month == 12:
        end = start.replace(year=start.year + 1, month=1, day=1) - datetime.timedelta(days=1)
    else:
        end = start.replace(month=start.month + 1, day=1) - datetime.timedelta(days=1)
    return start, end


def get_payroll_dashboard(db: Session, period_start: datetime.date | None, period_end: datetime.date | None,
                           department_id: int | None, employee_type_id: int | None) -> dict:
    if not period_start or not period_end:
        period_start, period_end = _default_period()

    employee_query = db.query(Employee).filter(Employee.active.is_(True))
    if department_id:
        employee_query = employee_query.filter(Employee.department_id == department_id)
    if employee_type_id:
        employee_query = employee_query.filter(Employee.employee_type_id == employee_type_id)
    employee_ids = [e.id for e in employee_query.all()]

    payslip_query = db.query(Payslip).filter(
        Payslip.period_start >= period_start, Payslip.period_end <= period_end,
        Payslip.employee_id.in_(employee_ids) if employee_ids else Payslip.id.is_(None),
    )
    payslips = payslip_query.options(joinedload(Payslip.employee)).all()

    total_net_paid = sum((p.net_amount for p in payslips if p.status == PayslipStatus.PAID), Decimal("0.00"))
    payslips_generated = len([p for p in payslips if p.status != PayslipStatus.DRAFT])
    avg_salary = (sum((p.net_amount for p in payslips), Decimal("0.00")) / len(payslips)) if payslips else Decimal("0.00")

    approved_timeoff = db.query(TimeOffRequest).filter(
        TimeOffRequest.status == RequestStatus.APPROVED,
        TimeOffRequest.from_date <= period_end,
        TimeOffRequest.to_date >= period_start,
        TimeOffRequest.employee_id.in_(employee_ids) if employee_ids else TimeOffRequest.id.is_(None),
    ).count()

    attendance_rows = db.query(Attendance).filter(
        Attendance.date >= period_start, Attendance.date <= period_end,
        Attendance.employee_id.in_(employee_ids) if employee_ids else Attendance.id.is_(None),
    ).all()
    total_attendance = len(attendance_rows)
    present_like = len([a for a in attendance_rows if a.status in (
        AttendanceStatus.PRESENT, AttendanceStatus.LATE, AttendanceStatus.OVERTIME, AttendanceStatus.HALF_DAY,
    )])
    attendance_health = round((present_like / total_attendance) * 100, 1) if total_attendance else 0.0

    # ---- Charts ----
    dept_rows = db.query(Department).all()
    salary_by_department = []
    for dept in dept_rows:
        dept_employee_ids = [e.id for e in employee_query.filter(Employee.department_id == dept.id).all()]
        cost = sum((p.net_amount for p in payslips if p.employee_id in dept_employee_ids), Decimal("0.00"))
        headcount = len(dept_employee_ids)
        salary_by_department.append({
            "department": dept.name,
            "cost": float(cost),
            "headcount": headcount,
        })

    monthly_trend = []
    cursor = (period_end.replace(day=1)) - relativedelta(months=5)
    for _ in range(6):
        month_start = cursor.replace(day=1)
        next_month = month_start + relativedelta(months=1)
        month_end = next_month - datetime.timedelta(days=1)
        month_payslips = db.query(Payslip).filter(
            Payslip.period_start >= month_start, Payslip.period_start <= month_end,
            Payslip.status.in_([PayslipStatus.VALIDATED, PayslipStatus.PAID]),
            Payslip.employee_id.in_(employee_ids),
        ).all()
        total = sum((p.net_amount for p in month_payslips), Decimal("0.00"))
        monthly_trend.append({"month": month_start.strftime("%b %Y"), "net_salary": float(total)})
        cursor = next_month

    # ---- Payroll alerts ----
    alerts = []
    for p in payslips:
        for w in (p.warning_messages or []):
            alerts.append({
                "employee": p.employee.name if p.employee else None,
                "payslip_id": p.id,
                "code": w.get("code"),
                "message": w.get("message"),
                "severity": w.get("severity"),
            })

    # ---- Attendance overview ----
    status_counts = {}
    for status in AttendanceStatus:
        status_counts[status.value] = len([a for a in attendance_rows if a.status == status])
    manual_edits = len([a for a in attendance_rows if a.is_manual_correction])

    # ---- Time off overview ----
    leave_rows = db.query(TimeOffRequest).filter(
        TimeOffRequest.status == RequestStatus.APPROVED,
        TimeOffRequest.from_date <= period_end, TimeOffRequest.to_date >= period_start,
        TimeOffRequest.employee_id.in_(employee_ids),
    ).all()
    approved_days = sum((Decimal((min(r.to_date, period_end) - max(r.from_date, period_start)).days + 1)
                         for r in leave_rows), Decimal("0"))
    pending_requests = db.query(TimeOffRequest).filter(
        TimeOffRequest.status == RequestStatus.TO_APPROVE,
        TimeOffRequest.from_date <= period_end, TimeOffRequest.to_date >= period_start,
        TimeOffRequest.employee_id.in_(employee_ids) if employee_ids else TimeOffRequest.id.is_(None),
    ).count()
    allocations = db.query(TimeOffAllocation).filter(
        TimeOffAllocation.status == AllocationStatus.APPROVED,
        TimeOffAllocation.valid_from <= period_end, TimeOffAllocation.valid_to >= period_start,
        TimeOffAllocation.employee_id.in_(employee_ids) if employee_ids else TimeOffAllocation.id.is_(None),
    ).all()
    leave_balance_total = sum((a.remaining for a in allocations), Decimal("0.00"))

    today = datetime.date.today()
    present_today = db.query(Attendance).filter(
        Attendance.employee_id.in_(employee_ids),
        Attendance.date == today,
        Attendance.status.in_([AttendanceStatus.PRESENT, AttendanceStatus.LATE, AttendanceStatus.OVERTIME]),
    ).count()
    late_today = db.query(Attendance).filter(Attendance.employee_id.in_(employee_ids), Attendance.date == today, Attendance.status == AttendanceStatus.LATE).count()
    on_leave_today = db.query(TimeOffRequest).filter(
        TimeOffRequest.status == RequestStatus.APPROVED,
        TimeOffRequest.employee_id.in_(employee_ids),
        TimeOffRequest.from_date <= today, TimeOffRequest.to_date >= today,
    ).count()

    return {
        "filters": {
            "period_start": period_start, "period_end": period_end,
            "department_id": department_id, "employee_type_id": employee_type_id,
        },
        "kpis": {
            "total_net_salary_paid": float(total_net_paid),
            "payslips_generated": payslips_generated,
            "average_salary": float(avg_salary),
            "approved_time_off": approved_timeoff,
            "attendance_health_pct": attendance_health,
            "present_today": present_today,
            "late_today": late_today,
            "on_leave_today": on_leave_today,
        },
        "charts": {
            "salary_cost_by_department": salary_by_department,
            "monthly_net_salary_trend": monthly_trend,
        },
        "payslip_status": {status.value: sum(1 for slip in payslips if slip.status == status) for status in PayslipStatus},
        "payroll_alerts": alerts[:50],
        "attendance_overview": {
            "by_status": status_counts,
            "manual_edits": manual_edits,
            "coverage_pct": attendance_health,
        },
        "time_off_overview": {
            "approved_days": float(approved_days),
            "pending_requests": pending_requests,
            "leave_balance_total": float(leave_balance_total),
        },
        "department_breakdown": salary_by_department,
    }
