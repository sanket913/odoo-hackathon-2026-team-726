from fastapi import APIRouter

from app.api.v1 import (
    auth, users, master_data, employees, contracts, schedules, attendance, timeoff, salary, payroll,
    dashboard, notifications, audit,
)

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(master_data.router)
api_router.include_router(employees.router)
api_router.include_router(contracts.router)
api_router.include_router(schedules.router)
api_router.include_router(attendance.router)
api_router.include_router(timeoff.router)
api_router.include_router(salary.router)
api_router.include_router(payroll.router)
api_router.include_router(dashboard.router)
api_router.include_router(notifications.router)
api_router.include_router(audit.router)
