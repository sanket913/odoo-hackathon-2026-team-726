"""add unique features

Revision ID: 6d14a9eee3b8
Revises: 7fa34af897cf
Create Date: 2026-09-05 15:54:13.124302

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6d14a9eee3b8'
down_revision: Union[str, None] = '7fa34af897cf'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # UNIQUE FEATURE - reviewed additive schema; leave balance uses existing allocated/taken.
    op.create_table('employee_audit_log',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('employee_id', sa.Integer(), nullable=False),
    sa.Column('changed_by', sa.Integer(), nullable=False),
    sa.Column('field_name', sa.String(length=100), nullable=False),
    sa.Column('old_value', sa.Text(), nullable=True),
    sa.Column('new_value', sa.Text(), nullable=True),
    sa.Column('changed_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['changed_by'], ['users.id'], ),
    sa.ForeignKeyConstraint(['employee_id'], ['employees.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_employee_audit_log_employee_id'), 'employee_audit_log', ['employee_id'], unique=False)
    op.create_table('notification_logs',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('employee_id', sa.Integer(), nullable=False),
    sa.Column('payslip_id', sa.Integer(), nullable=False),
    sa.Column('phone', sa.String(length=32), nullable=True),
    sa.Column('message', sa.Text(), nullable=False),
    sa.Column('twilio_sid', sa.String(length=64), nullable=True),
    sa.Column('status', sa.String(length=20), nullable=False),
    sa.Column('error_message', sa.String(length=255), nullable=True),
    sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['employee_id'], ['employees.id'], ),
    sa.ForeignKeyConstraint(['payslip_id'], ['payslips.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('payslip_id')
    )
    op.create_index(op.f('ix_notification_logs_employee_id'), 'notification_logs', ['employee_id'], unique=False)
    op.add_column('attendances', sa.Column('latitude', sa.Float(), nullable=True))
    op.add_column('attendances', sa.Column('longitude', sa.Float(), nullable=True))
    op.add_column('attendances', sa.Column('location_tag', sa.String(length=20), nullable=True))
    op.add_column('attendances', sa.Column('auto_status_note', sa.String(length=100), nullable=True))
    # ### end Alembic commands ###


def downgrade() -> None:
    # UNIQUE FEATURE - reviewed additive schema; leave balance uses existing allocated/taken.
    op.drop_column('attendances', 'auto_status_note')
    op.drop_column('attendances', 'location_tag')
    op.drop_column('attendances', 'longitude')
    op.drop_column('attendances', 'latitude')
    op.drop_index(op.f('ix_notification_logs_employee_id'), table_name='notification_logs')
    op.drop_table('notification_logs')
    op.drop_index(op.f('ix_employee_audit_log_employee_id'), table_name='employee_audit_log')
    op.drop_table('employee_audit_log')
    # ### end Alembic commands ###
