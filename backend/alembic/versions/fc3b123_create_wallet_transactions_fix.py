"""create_wallet_transactions_fix

Revision ID: fc3b123
Revises: fb2af07cae5c
Create Date: 2026-08-10 09:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from sqlalchemy.exc import ProgrammingError


# revision identifiers, used by Alembic.
revision: str = 'fc3b123'
down_revision: Union[str, None] = 'fb2af07cae5c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    
    # In the previous migration, op.create_table failed because the Enum type already existed.
    # We create the table again, but this time we set create_type=False for the Enum to prevent DuplicateObject errors.
    try:
        with bind.begin_nested():
            op.create_table(
                'wallet_transactions',
                sa.Column('id', sa.UUID(), nullable=False),
                sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
                sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
                sa.Column('user_id', sa.UUID(), nullable=False),
                sa.Column('amount', sa.Integer(), nullable=False),
                sa.Column('type', sa.Enum('TOP_UP', 'BORROW_DEDUCTION', 'REFUND', 'EARNING', name='wallettransactiontype', create_type=False), nullable=False),
                sa.Column('reference_id', sa.String(length=255), nullable=True),
                sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
                sa.PrimaryKeyConstraint('id')
            )
            op.create_index(op.f('ix_wallet_transactions_id'), 'wallet_transactions', ['id'], unique=False)
            op.create_index(op.f('ix_wallet_transactions_user_id'), 'wallet_transactions', ['user_id'], unique=False)
    except ProgrammingError as e:
        # If it already exists for some reason, ignore it
        print("Table wallet_transactions might already exist:", e)
        pass


def downgrade() -> None:
    op.drop_index(op.f('ix_wallet_transactions_user_id'), table_name='wallet_transactions')
    op.drop_index(op.f('ix_wallet_transactions_id'), table_name='wallet_transactions')
    op.drop_table('wallet_transactions')
