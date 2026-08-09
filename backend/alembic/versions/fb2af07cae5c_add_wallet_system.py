"""add_wallet_system

Revision ID: fb2af07cae5c
Revises: 81b381f6c9a7
Create Date: 2026-08-09 11:49:33.402012

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'fb2af07cae5c'
down_revision: Union[str, None] = '81b381f6c9a7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


from sqlalchemy.dialects import postgresql

def upgrade() -> None:
    from sqlalchemy.exc import ProgrammingError
    bind = op.get_bind()

    # 1. Add wallet_balance to users
    try:
        with bind.begin_nested():
            op.add_column('users', sa.Column('wallet_balance', sa.Integer(), nullable=False, server_default='0'))
    except ProgrammingError:
        pass

    # 2. Enum for WalletTransactionType
    wallet_tx_type = postgresql.ENUM('TOP_UP', 'BORROW_DEDUCTION', 'REFUND', 'EARNING', name='wallettransactiontype')
    try:
        with bind.begin_nested():
            wallet_tx_type.create(bind)
    except ProgrammingError:
        pass

    # 3. Create wallet_transactions table
    try:
        with bind.begin_nested():
            op.create_table(
                'wallet_transactions',
                sa.Column('id', sa.UUID(), nullable=False),
                sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
                sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
                sa.Column('user_id', sa.UUID(), nullable=False),
                sa.Column('amount', sa.Integer(), nullable=False),
                sa.Column('type', sa.Enum('TOP_UP', 'BORROW_DEDUCTION', 'REFUND', 'EARNING', name='wallettransactiontype'), nullable=False),
                sa.Column('reference_id', sa.String(length=255), nullable=True),
                sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
                sa.PrimaryKeyConstraint('id')
            )
            op.create_index(op.f('ix_wallet_transactions_id'), 'wallet_transactions', ['id'], unique=False)
            op.create_index(op.f('ix_wallet_transactions_user_id'), 'wallet_transactions', ['user_id'], unique=False)
    except ProgrammingError:
        pass

    # 4. Make borrow_request_id nullable in payments
    try:
        with bind.begin_nested():
            op.alter_column('payments', 'borrow_request_id',
                       existing_type=sa.UUID(),
                       nullable=True)
    except ProgrammingError:
        pass


def downgrade() -> None:
    # 1. Revert borrow_request_id
    op.alter_column('payments', 'borrow_request_id',
               existing_type=sa.UUID(),
               nullable=False)

    # 2. Drop wallet_transactions table
    op.drop_index(op.f('ix_wallet_transactions_user_id'), table_name='wallet_transactions')
    op.drop_index(op.f('ix_wallet_transactions_id'), table_name='wallet_transactions')
    op.drop_table('wallet_transactions')

    # 3. Drop Enum
    wallet_tx_type = postgresql.ENUM('TOP_UP', 'BORROW_DEDUCTION', 'REFUND', 'EARNING', name='wallettransactiontype')
    wallet_tx_type.drop(op.get_bind())

    # 4. Drop wallet_balance from users
    op.drop_column('users', 'wallet_balance')
