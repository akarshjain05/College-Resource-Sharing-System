"""merge heads

Revision ID: df2fc5e9a4c8
Revises: a036c860d125, f3633793aa35
Create Date: 2026-08-03 09:26:07.625415

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'df2fc5e9a4c8'
down_revision: Union[str, None] = ('a036c860d125', 'f3633793aa35')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
