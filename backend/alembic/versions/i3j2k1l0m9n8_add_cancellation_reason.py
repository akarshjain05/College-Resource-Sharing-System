"""add cancellation reason to borrow requests

Revision ID: i3j2k1l0m9n8
Revises: i2j1k0l9m8n7
Create Date: 2026-08-09 11:50:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'i3j2k1l0m9n8'
down_revision = 'i2j1k0l9m8n7'
branch_labels = None
depends_on = None

def upgrade() -> None:
    from sqlalchemy.exc import ProgrammingError
    bind = op.get_bind()
    try:
        with bind.begin_nested():
            op.add_column('borrow_requests', sa.Column('cancellation_reason', sa.Text(), nullable=True))
    except ProgrammingError:
        pass


def downgrade() -> None:
    op.drop_column('borrow_requests', 'cancellation_reason')
