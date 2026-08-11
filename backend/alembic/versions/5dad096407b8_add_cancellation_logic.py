"""add_cancellation_logic

Revision ID: 5dad096407b8
Revises: 6808ff6cbba2
Create Date: 2026-08-12 00:11:25.626270

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5dad096407b8'
down_revision: Union[str, None] = '6808ff6cbba2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add cancellation_requested_by_id column
    op.add_column('borrow_requests', sa.Column('cancellation_requested_by_id', sa.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key('fk_borrow_requests_cancellation_requested_by_id', 'borrow_requests', 'users', ['cancellation_requested_by_id'], ['id'], ondelete='SET NULL')

    # Add ENUM values manually
    # Note: PostgreSQL ALTER TYPE cannot run inside a transaction block, so we commit first if needed, 
    # but Alembic might wrap it. The safe way in Alembic is to just execute it, as modern PG supports it.
    op.execute("ALTER TYPE borrowstatus ADD VALUE IF NOT EXISTS 'cancellation_requested'")
    op.execute("ALTER TYPE notificationtype ADD VALUE IF NOT EXISTS 'cancellation_request'")


def downgrade() -> None:
    op.drop_constraint('fk_borrow_requests_cancellation_requested_by_id', 'borrow_requests', type_='foreignkey')
    op.drop_column('borrow_requests', 'cancellation_requested_by_id')
