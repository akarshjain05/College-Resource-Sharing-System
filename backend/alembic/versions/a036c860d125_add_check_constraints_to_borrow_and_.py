"""add check constraints to borrow and wanted requests

Revision ID: a036c860d125
Revises: a11a7a660097
Create Date: 2026-08-03 12:40:03.176748

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a036c860d125'
down_revision: Union[str, None] = 'a11a7a660097'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Use raw SQL to add check constraints since they might fail on existing bad data
    # (If there is bad data, the user has to fix it manually)
    op.execute(
        "ALTER TABLE borrow_requests ADD CONSTRAINT check_borrow_valid_dates "
        "CHECK (requested_end_date >= requested_start_date);"
    )
    op.execute(
        "ALTER TABLE wanted_requests ADD CONSTRAINT check_wanted_valid_dates "
        "CHECK (end_date >= start_date);"
    )


def downgrade() -> None:
    op.execute("ALTER TABLE borrow_requests DROP CONSTRAINT check_borrow_valid_dates;")
    op.execute("ALTER TABLE wanted_requests DROP CONSTRAINT check_wanted_valid_dates;")
