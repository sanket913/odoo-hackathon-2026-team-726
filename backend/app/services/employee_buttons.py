# Role-aware smart buttons; authorization stays in route dependencies.
BUTTONS = {
    "ADMIN": ["contract", "attendance", "timeoff", "payrun", "rules", "payslip"],
    "HR": ["employee", "contract", "attendance", "timeoff"],
    "PAYROLL_MANAGER": ["payrun", "rules", "payslip"],
    "EMPLOYEE": ["my_profile", "my_payslip"],
}
ALIASES = {"HR_MANAGER": "HR", "HR_PAYROLL_MANAGER": "PAYROLL_MANAGER", "HR_PAYROLL_USER": "PAYROLL_MANAGER"}


def get_visible_buttons(roles):
    if isinstance(roles, str):
        roles = [roles]
    normalized = [str(getattr(r, "value", r)).strip().upper().replace(" ", "_") for r in roles]
    normalized = [ALIASES.get(r, r) for r in normalized]
    if "ADMIN" in normalized:
        return BUTTONS["ADMIN"][:]
    return list(dict.fromkeys(button for role in normalized for button in BUTTONS.get(role, [])))
