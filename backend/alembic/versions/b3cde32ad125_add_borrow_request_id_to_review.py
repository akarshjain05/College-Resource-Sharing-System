"""Add borrow_request_id to Review

Revision ID: b3cde32ad125
Revises: 4c3b7d72d197
Create Date: 2026-08-05 13:16:40.718839

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b3cde32ad125'
down_revision: Union[str, None] = '4c3b7d72d197'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


from sqlalchemy.dialects import postgresql

def upgrade() -> None:
    op.add_column('reviews', sa.Column('borrow_request_id', postgresql.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key('fk_review_borrow_request', 'reviews', 'borrow_requests', ['borrow_request_id'], ['id'])
    op.create_unique_constraint('uq_review_borrow_request_reviewer', 'reviews', ['borrow_request_id', 'reviewer_id'])

def downgrade() -> None:
    op.drop_constraint('uq_review_borrow_request_reviewer', 'reviews', type_='unique')
    op.drop_constraint('fk_review_borrow_request', 'reviews', type_='foreignkey')
    op.drop_column('reviews', 'borrow_request_id')
