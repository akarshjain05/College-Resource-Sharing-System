"""merge ojash and akarsh migrations

Revision ID: 2d993a09ff55
Revises: 8f2a5c1e9b3d, h9i8j7k6l5m4
Create Date: 2026-07-29 12:28:38.686894

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2d993a09ff55'
down_revision: Union[str, None] = ('8f2a5c1e9b3d', 'h9i8j7k6l5m4')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
