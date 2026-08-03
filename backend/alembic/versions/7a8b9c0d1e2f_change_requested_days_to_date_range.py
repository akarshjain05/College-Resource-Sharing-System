"""change requested_days to date range

Revision ID: 7a8b9c0d1e2f
Revises: 52a1b9c9d0e1
Create Date: 2026-08-01 23:40:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '7a8b9c0d1e2f'
down_revision = '52a1b9c9d0e1'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('wanted_requests', sa.Column('start_date', sa.Date(), nullable=True))
    op.add_column('wanted_requests', sa.Column('end_date', sa.Date(), nullable=True))
    
    conn = op.get_bind()
    conn.execute(sa.text("UPDATE wanted_requests SET start_date = CURRENT_DATE, end_date = CURRENT_DATE + requested_days"))
    
    op.drop_column('wanted_requests', 'requested_days')


def downgrade():
    op.add_column('wanted_requests', sa.Column('requested_days', sa.Integer(), server_default='1', nullable=False))
    
    op.drop_column('wanted_requests', 'start_date')
    op.drop_column('wanted_requests', 'end_date')
