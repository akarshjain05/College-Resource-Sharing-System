"""add fcm_token to users

Revision ID: i0j9k8l7m6n5
Revises: h9i8j7k6l5m4
Create Date: 2026-08-03 02:32:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'i0j9k8l7m6n5'
down_revision = 'h9i8j7k6l5m4'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('users', sa.Column('fcm_token', sa.String(500), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'fcm_token')
