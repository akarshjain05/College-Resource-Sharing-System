"""add admin permissions

Revision ID: f3a4c9d2e1f5
Revises: b749d1e2f3a5
Create Date: 2026-08-02 23:46:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f3a4c9d2e1f5'
down_revision: Union[str, None] = 'b749d1e2f3a5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('can_moderate_complaints', sa.Boolean(), server_default='false', nullable=False))
    op.add_column('users', sa.Column('can_manage_users', sa.Boolean(), server_default='false', nullable=False))
    op.add_column('users', sa.Column('can_resolve_damage_claims', sa.Boolean(), server_default='false', nullable=False))


def downgrade() -> None:
    op.drop_column('users', 'can_resolve_damage_claims')
    op.drop_column('users', 'can_manage_users')
    op.drop_column('users', 'can_moderate_complaints')
