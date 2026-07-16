"""Add text reviews to BorrowRequest

Revision ID: 65ced69fc265
Revises: b0e53ea6347d
Create Date: 2026-07-16 17:11:56.952467

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '65ced69fc265'
down_revision: Union[str, None] = 'b0e53ea6347d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('borrow_requests', sa.Column('borrower_review', sa.Text(), nullable=True))
    op.add_column('borrow_requests', sa.Column('lender_review', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('borrow_requests', 'lender_review')
    op.drop_column('borrow_requests', 'borrower_review')
