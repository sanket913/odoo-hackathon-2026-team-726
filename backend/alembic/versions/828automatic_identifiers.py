"""Transactional numbering and unique contract references."""
from alembic import op
import sqlalchemy as sa
revision = '828identifiers'
down_revision = '827attendancebreaks'
branch_labels = None
depends_on = None


def upgrade():
    connection = op.get_bind()
    duplicates = connection.execute(sa.text("SELECT reference FROM contracts GROUP BY reference HAVING COUNT(*) > 1 LIMIT 1")).first()
    if duplicates:
        raise RuntimeError("Duplicate contract references exist. Resolve duplicates before applying unique references; no existing references were changed.")
    op.create_table('identifier_sequences', sa.Column('name', sa.String(64), primary_key=True), sa.Column('value', sa.Integer(), nullable=False))
    op.create_index('uq_contracts_reference', 'contracts', ['reference'], unique=True)


def downgrade():
    op.drop_index('uq_contracts_reference', table_name='contracts')
    op.drop_table('identifier_sequences')
