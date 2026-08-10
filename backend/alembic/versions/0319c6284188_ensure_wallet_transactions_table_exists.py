"""ensure_wallet_transactions_table_exists

Revision ID: 0319c6284188
Revises: fc3b123
Create Date: 2026-08-10 09:37:41.135249

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector


# revision identifiers, used by Alembic.
revision: str = '0319c6284188'
down_revision: Union[str, None] = 'fc3b123'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = Inspector.from_engine(bind)
    
    # 1. Ensure the enum exists safely using raw SQL
    bind.execute(sa.text("""
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'wallettransactiontype') THEN
                CREATE TYPE wallettransactiontype AS ENUM ('top_up', 'borrow_deduction', 'refund', 'earning');
            END IF;
        END
        $$;
    """))
    
    # 2. Ensure the table exists
    if not inspector.has_table('wallet_transactions'):
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


def downgrade() -> None:
    bind = op.get_bind()
    inspector = Inspector.from_engine(bind)
    if inspector.has_table('wallet_transactions'):
        op.drop_index(op.f('ix_wallet_transactions_user_id'), table_name='wallet_transactions')
        op.drop_index(op.f('ix_wallet_transactions_id'), table_name='wallet_transactions')
        op.drop_table('wallet_transactions')
