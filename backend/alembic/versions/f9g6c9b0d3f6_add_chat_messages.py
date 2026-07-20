"""add chat messages

Revision ID: f9g6c9b0d3f6
Revises: e8f5b8a9c2e5
Create Date: 2026-07-20 10:37:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'f9g6c9b0d3f6'
down_revision = 'e8f5b8a9c2e5'
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.create_table(
        'chat_messages',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('borrow_request_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('sender_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('body', sa.String(length=1000), nullable=False),
        sa.Column('read_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['borrow_request_id'], ['borrow_requests.id'], ),
        sa.ForeignKeyConstraint(['sender_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_chat_messages_borrow_request_id'), 'chat_messages', ['borrow_request_id'], unique=False)

def downgrade() -> None:
    op.drop_index(op.f('ix_chat_messages_borrow_request_id'), table_name='chat_messages')
    op.drop_table('chat_messages')
