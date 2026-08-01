"""add_email_verification

Revision ID: 8f2a5c1e9b3d
Revises: f9g6c9b0d3f6
Create Date: 2026-07-29 00:48:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.exc import ProgrammingError

# revision identifiers, used by Alembic.
revision: str = '8f2a5c1e9b3d'
down_revision: Union[str, None] = 'f9g6c9b0d3f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    try:
        with bind.begin_nested():
            op.add_column('users', sa.Column('email_verified_at', sa.DateTime(timezone=True), nullable=True))
    except ProgrammingError:
        pass


def downgrade() -> None:
    op.drop_column('users', 'email_verified_at')
