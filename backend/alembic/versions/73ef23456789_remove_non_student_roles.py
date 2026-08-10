"""Remove non-student roles

Revision ID: 73ef23456789
Revises: fc3b123
Create Date: 2026-08-10 22:15:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '73ef23456789'
down_revision: Union[str, None] = 'fc3b123'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Update existing users who have 'faculty' or 'club' roles to 'student'
    op.execute("UPDATE users SET role = 'student' WHERE role::text IN ('faculty', 'club')")

def downgrade() -> None:
    pass
