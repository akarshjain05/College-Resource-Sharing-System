"""add available_from and available_to fix

Revision ID: h9i8j7k6l5m4
Revises: g8h7i6j5k4l3
Create Date: 2026-07-29 01:50:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.exc import ProgrammingError


# revision identifiers, used by Alembic.
revision: str = 'h9i8j7k6l5m4'
down_revision: Union[str, None] = 'g8h7i6j5k4l3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # We will use raw SQL to add the columns only if they don't exist
    # to avoid errors if they do.
    conn = op.get_bind()
    conn.execute(sa.text("ALTER TABLE resources ADD COLUMN IF NOT EXISTS available_from DATE;"))
    conn.execute(sa.text("ALTER TABLE resources ADD COLUMN IF NOT EXISTS available_to DATE;"))


def downgrade() -> None:
    conn = op.get_bind()
    conn.execute(sa.text("ALTER TABLE resources DROP COLUMN IF EXISTS available_to;"))
    conn.execute(sa.text("ALTER TABLE resources DROP COLUMN IF EXISTS available_from;"))
