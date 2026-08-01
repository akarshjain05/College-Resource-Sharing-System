"""Merge multiple heads

Revision ID: 8714e7d81d09
Revises: 7a8b9c0d1e2f, f920f3acb3c2
Create Date: 2026-08-02 01:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8714e7d81d09'
down_revision: Union[str, None] = ('7a8b9c0d1e2f', 'f920f3acb3c2')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
