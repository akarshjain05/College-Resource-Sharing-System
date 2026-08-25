"""add indexes to fks

Revision ID: 99999999999a
Revises: 999999999999
Create Date: 2026-08-25 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '99999999999a'
down_revision: Union[str, None] = '999999999999'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # borrow_requests
    op.create_index(op.f('ix_borrow_requests_borrower_id'), 'borrow_requests', ['borrower_id'], unique=False)
    op.create_index(op.f('ix_borrow_requests_lender_id'), 'borrow_requests', ['lender_id'], unique=False)
    # complaints
    op.create_index(op.f('ix_complaints_filed_by_id'), 'complaints', ['filed_by_id'], unique=False)
    op.create_index(op.f('ix_complaints_against_user_id'), 'complaints', ['against_user_id'], unique=False)
    # damage_claims
    op.create_index(op.f('ix_damage_claims_filed_by_id'), 'damage_claims', ['filed_by_id'], unique=False)
    # chat_messages
    op.create_index(op.f('ix_chat_messages_sender_id'), 'chat_messages', ['sender_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_chat_messages_sender_id'), table_name='chat_messages')
    op.drop_index(op.f('ix_damage_claims_filed_by_id'), table_name='damage_claims')
    op.drop_index(op.f('ix_complaints_against_user_id'), table_name='complaints')
    op.drop_index(op.f('ix_complaints_filed_by_id'), table_name='complaints')
    op.drop_index(op.f('ix_borrow_requests_lender_id'), table_name='borrow_requests')
    op.drop_index(op.f('ix_borrow_requests_borrower_id'), table_name='borrow_requests')
