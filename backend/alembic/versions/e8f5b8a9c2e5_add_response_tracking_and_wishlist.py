"""add_response_tracking_and_wishlist

Revision ID: e8f5b8a9c2e5
Revises: d1f3a7b9c2e4
Create Date: 2026-07-20 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'e8f5b8a9c2e5'
down_revision: Union[str, None] = 'd1f3a7b9c2e4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add response tracking to users
    op.add_column('users', sa.Column('avg_response_seconds', sa.Integer(), nullable=True))
    op.add_column('users', sa.Column('response_count', sa.Integer(), server_default='0', nullable=False))

    # 2. Add decided_at and last_nudged_at to borrow_requests
    op.add_column('borrow_requests', sa.Column('decided_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('borrow_requests', sa.Column('last_nudged_at', sa.DateTime(timezone=True), nullable=True))

    # 3. Create wishlist_items table
    op.create_table(
        'wishlist_items',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('resource_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('resources.id'), nullable=False),
        sa.UniqueConstraint('user_id', 'resource_id', name='uq_wishlist_user_resource')
    )


def downgrade() -> None:
    op.drop_table('wishlist_items')
    op.drop_column('borrow_requests', 'last_nudged_at')
    op.drop_column('borrow_requests', 'decided_at')
    op.drop_column('users', 'response_count')
    op.drop_column('users', 'avg_response_seconds')
