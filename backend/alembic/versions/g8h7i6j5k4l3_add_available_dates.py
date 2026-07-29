"""add available_from and available_to

Revision ID: g8h7i6j5k4l3
Revises: f9g6c9b0d3f6
Create Date: 2026-07-29 01:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.exc import ProgrammingError


# revision identifiers, used by Alembic.
revision: str = 'g8h7i6j5k4l3'
down_revision: Union[str, None] = 'f9g6c9b0d3f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    try:
        with op.get_bind().begin_nested():
            op.add_column('resources', sa.Column('available_from', sa.Date(), nullable=True))
            op.add_column('resources', sa.Column('available_to', sa.Date(), nullable=True))
    except ProgrammingError:
        pass


def downgrade() -> None:
    try:
        with op.get_bind().begin_nested():
            op.drop_column('resources', 'available_to')
            op.drop_column('resources', 'available_from')
    except ProgrammingError:
        pass
