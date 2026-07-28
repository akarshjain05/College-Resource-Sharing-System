"""add_damage_claims_table

Revision ID: d1f3a7b9c2e4
Revises: c7f260b43a82
Create Date: 2026-07-20 08:35:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'd1f3a7b9c2e4'
down_revision: Union[str, None] = 'c7f260b43a82'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create the damageclaimstatus enum type
    damageclaimstatus = sa.Enum(
        'open', 'disputed', 'resolved_valid', 'resolved_invalid', 'resolved_partial',
        name='damageclaimstatus'
    )
    damageclaimstatus.create(op.get_bind(), checkfirst=True)

    # Add new values to notificationtype enum
    op.execute("ALTER TYPE notificationtype ADD VALUE IF NOT EXISTS 'damage_claim_filed'")
    op.execute("ALTER TYPE notificationtype ADD VALUE IF NOT EXISTS 'damage_claim_disputed'")
    op.execute("ALTER TYPE notificationtype ADD VALUE IF NOT EXISTS 'damage_claim_resolved'")

    # Create the damage_claims table
    op.create_table(
        'damage_claims',
        sa.Column('id', UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('borrow_request_id', UUID(as_uuid=True), nullable=False),
        sa.Column('filed_by_id', UUID(as_uuid=True), nullable=False),
        sa.Column('against_user_id', UUID(as_uuid=True), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('estimated_cost', sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column('dispute_reason', sa.Text(), nullable=True),
        sa.Column('status', postgresql.ENUM('open', 'disputed', 'resolved_valid', 'resolved_invalid', 'resolved_partial', name='damageclaimstatus', create_type=False), nullable=False),
        sa.Column('admin_resolution', sa.Text(), nullable=True),
        sa.Column('final_cost', sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column('trust_penalty_applied', sa.Integer(), server_default='0', nullable=False),
        sa.ForeignKeyConstraint(['borrow_request_id'], ['borrow_requests.id']),
        sa.ForeignKeyConstraint(['filed_by_id'], ['users.id']),
        sa.ForeignKeyConstraint(['against_user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('borrow_request_id'),
    )
    op.create_index(op.f('ix_damage_claims_status'), 'damage_claims', ['status'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_damage_claims_status'), table_name='damage_claims')
    op.drop_table('damage_claims')

    # Drop the enum type
    sa.Enum(name='damageclaimstatus').drop(op.get_bind(), checkfirst=True)

    # Note: Removing values from a Postgres enum is not straightforward.
    # The notificationtype enum values added in upgrade() are left in place
    # as removing them requires recreating the enum type.
