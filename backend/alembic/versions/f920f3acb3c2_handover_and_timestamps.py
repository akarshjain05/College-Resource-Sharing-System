"""handover and timestamps

Revision ID: f920f3acb3c2
Revises: e8049efbe935
Create Date: 2026-07-18 23:45:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'f920f3acb3c2'
down_revision = '2060cdf0bdda'
branch_labels = None
depends_on = None


def upgrade():
    # Adding to ENUM type in postgres cannot run in a transaction block usually, 
    # but Alembic autocommit block handles this.
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE borrowstatus ADD VALUE IF NOT EXISTS 'handover_requested'")

    op.alter_column('borrow_requests', 'requested_start_date',
               existing_type=sa.Date(),
               type_=sa.DateTime(timezone=True),
               existing_nullable=False,
               postgresql_using='requested_start_date::timestamp with time zone')
    op.alter_column('borrow_requests', 'requested_end_date',
               existing_type=sa.Date(),
               type_=sa.DateTime(timezone=True),
               existing_nullable=False,
               postgresql_using='requested_end_date::timestamp with time zone')
    op.alter_column('borrow_requests', 'actual_return_date',
               existing_type=sa.Date(),
               type_=sa.DateTime(timezone=True),
               existing_nullable=True,
               postgresql_using='actual_return_date::timestamp with time zone')


def downgrade():
    op.alter_column('borrow_requests', 'requested_start_date',
               existing_type=sa.DateTime(timezone=True),
               type_=sa.Date(),
               existing_nullable=False,
               postgresql_using='requested_start_date::date')
    op.alter_column('borrow_requests', 'requested_end_date',
               existing_type=sa.DateTime(timezone=True),
               type_=sa.Date(),
               existing_nullable=False,
               postgresql_using='requested_end_date::date')
    op.alter_column('borrow_requests', 'actual_return_date',
               existing_type=sa.DateTime(timezone=True),
               type_=sa.Date(),
               existing_nullable=True,
               postgresql_using='actual_return_date::date')
