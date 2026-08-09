"""merge akarsh and vikash heads

Revision ID: 85bdecb1b36b
Revises: a1b2c3d4e5f6, i3j2k1l0m9n8
Create Date: 2026-08-10 00:50:45.714705

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '85bdecb1b36b'
down_revision: Union[str, None] = ('a1b2c3d4e5f6', 'i3j2k1l0m9n8')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
