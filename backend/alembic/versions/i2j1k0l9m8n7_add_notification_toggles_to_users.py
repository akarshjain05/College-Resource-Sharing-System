"""add notification toggles to users

Revision ID: i2j1k0l9m8n7
Revises: i1j0k9l8m7n6
Create Date: 2026-08-09 11:30:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'i2j1k0l9m8n7'
down_revision = 'i1j0k9l8m7n6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    from sqlalchemy.engine.reflection import Inspector
    inspector = Inspector.from_engine(bind)
    columns = [c['name'] for c in inspector.get_columns('users')]
    if 'notif_resource_listing' not in columns:
        op.add_column('users', sa.Column('notif_resource_listing', sa.Boolean(), server_default='true', nullable=False))
    if 'notif_campus_needs' not in columns:
        op.add_column('users', sa.Column('notif_campus_needs', sa.Boolean(), server_default='true', nullable=False))


def downgrade() -> None:
    op.drop_column('users', 'notif_resource_listing')
    op.drop_column('users', 'notif_campus_needs')
