"""Snapshot scheduled break deductions without rewriting historical worked hours."""
from alembic import op
import sqlalchemy as sa

revision = '827attendancebreaks'
down_revision = '826seedscale'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('attendances', sa.Column('break_allowance_hours', sa.Numeric(6, 2), nullable=False, server_default='0'))
    op.add_column('attendances', sa.Column('break_hours', sa.Numeric(6, 2), nullable=False, server_default='0'))
    op.add_column('attendances', sa.Column('break_source', sa.String(20), nullable=False, server_default='Legacy'))


def downgrade():
    for name in ['break_source', 'break_hours', 'break_allowance_hours']:
        op.drop_column('attendances', name)
