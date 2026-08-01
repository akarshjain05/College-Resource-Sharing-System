"""Add requested_days to WantedRequest

Revision ID: 52a1b9c9d0e1
Revises: 2d993a09ff55
Create Date: 2026-08-01 23:07:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '52a1b9c9d0e1'
down_revision: Union[str, None] = '2d993a09ff55'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add column with a default value of 1 for existing rows
    op.add_column('wanted_requests', sa.Column('requested_days', sa.Integer(), server_default='1', nullable=False))


def downgrade() -> None:
    op.drop_column('wanted_requests', 'requested_days')
