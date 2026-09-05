"""Make legacy basic-wage defaults explicit without changing calculated pay."""
from alembic import op
import sqlalchemy as sa

revision = '829basicwage'
down_revision = '828identifiers'
branch_labels = None
depends_on = None


def upgrade():
    op.execute(sa.text("UPDATE salary_rules SET computation_type = 'FORMULA', formula_text = 'WAGE' "
                       "WHERE category = 'BASIC' AND computation_type = 'FIXED' AND fixed_amount = 0"))


def downgrade():
    # Explicit WAGE formulas are valid in the previous engine as well.
    pass
