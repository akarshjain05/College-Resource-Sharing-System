"""merge_main_and_vikash

Revision ID: a11a7a660097
Revises: f3a4c9d2e1f5, i0j9k8l7m6n5
Create Date: 2026-08-03 10:00:27.141766

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a11a7a660097'
down_revision: Union[str, None] = ('f3a4c9d2e1f5', 'i0j9k8l7m6n5')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
