"""Indexes for enterprise list filters and payroll period lookups."""
from alembic import op

revision = '826seedscale'
down_revision = '6d14a9eee3b8'
branch_labels = None
depends_on = None

INDEXES = [
    ('employees', 'ix_employees_name_id', ['name', 'id']),
    ('attendances', 'ix_attendances_date_status', ['date', 'status']),
    ('time_off_requests', 'ix_requests_status_created', ['status', 'created_at']),
    ('time_off_allocations', 'ix_allocations_employee_type_status', ['employee_id', 'time_off_type_id', 'status']),
    ('payruns', 'ix_payruns_period_status', ['period_start', 'status']),
    ('payslips', 'ix_payslips_period_status', ['period_start', 'status']),
    ('payslips', 'ix_payslips_employee_period', ['employee_id', 'period_start', 'period_end']),
]


def upgrade():
    for table, name, columns in INDEXES:
        op.create_index(name, table, columns)


def downgrade():
    for table, name, _ in reversed(INDEXES):
        op.drop_index(name, table_name=table)
