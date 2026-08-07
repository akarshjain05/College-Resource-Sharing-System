"""add_unverified_email_to_users

Revision ID: 81b381f6c9a7
Revises: b3cde32ad125
Create Date: 2026-08-07 22:06:32.043026

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '81b381f6c9a7'
down_revision: Union[str, None] = 'b3cde32ad125'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('unverified_email', sa.String(length=255), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'unverified_email')
