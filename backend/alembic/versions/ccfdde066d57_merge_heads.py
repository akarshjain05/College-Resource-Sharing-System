"""merge heads

Revision ID: ccfdde066d57
Revises: 73ef23456789, a419c6284189
Create Date: 2026-08-10 23:50:56.507193

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ccfdde066d57'
down_revision: Union[str, None] = ('73ef23456789', 'a419c6284189')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
