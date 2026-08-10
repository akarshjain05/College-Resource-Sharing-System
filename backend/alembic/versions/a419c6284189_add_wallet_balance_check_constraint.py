"""add_wallet_balance_check_constraint

Revision ID: a419c6284189
Revises: 0319c6284188
Create Date: 2026-08-10 10:25:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'a419c6284189'
down_revision = '0319c6284188'
branch_labels = None
depends_on = None

def upgrade() -> None:
    # Use DO block to safely add constraint if it doesn't exist
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1
                FROM pg_constraint
                WHERE conname = 'ck_user_wallet_balance_positive'
            ) THEN
                ALTER TABLE users ADD CONSTRAINT ck_user_wallet_balance_positive CHECK (wallet_balance >= 0);
            END IF;
        END
        $$;
    """)

def downgrade() -> None:
    op.execute("ALTER TABLE users DROP CONSTRAINT IF EXISTS ck_user_wallet_balance_positive;")
