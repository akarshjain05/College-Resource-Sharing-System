"""add daily_price to resources

Revision ID: i1j0k9l8m7n6
Revises: i0j9k8l7m6n5
Create Date: 2026-08-09 11:25:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'i1j0k9l8m7n6'
down_revision = 'i0j9k8l7m6n5'
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    from sqlalchemy.engine.reflection import Inspector
    inspector = Inspector.from_engine(bind)
    columns = [c['name'] for c in inspector.get_columns('resources')]
    if 'daily_price' not in columns:
        op.add_column('resources', sa.Column('daily_price', sa.Numeric(10, 2), server_default='0.00', nullable=False))


def downgrade() -> None:
    op.drop_column('resources', 'daily_price')
