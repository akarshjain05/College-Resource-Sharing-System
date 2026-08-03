"""add payments table

Revision ID: b749d1e2f3a5
Revises: 8714e7d81d09
Create Date: 2026-08-02 23:05:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'b749d1e2f3a5'
down_revision: Union[str, None] = '8714e7d81d09'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if not inspector.has_table("payments"):
        op.create_table(
            "payments",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("borrow_request_id", postgresql.UUID(as_uuid=True),
                       sa.ForeignKey("borrow_requests.id"), nullable=False),
            sa.Column("payer_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
            sa.Column("razorpay_order_id", sa.String(64), nullable=False),
            sa.Column("razorpay_payment_id", sa.String(64), nullable=True),
            sa.Column("razorpay_signature", sa.String(256), nullable=True),
            sa.Column("rent_amount", sa.Integer, nullable=False),
            sa.Column("deposit_amount", sa.Integer, nullable=False),
            sa.Column("total_amount", sa.Integer, nullable=False),
            sa.Column("currency", sa.String(3), server_default="INR"),
            sa.Column("status", sa.String(30), server_default="created", nullable=False),
            sa.Column("refund_id", sa.String(64), nullable=True),
            sa.Column("refunded_amount", sa.Integer, server_default="0"),
            sa.Column("failure_reason", sa.Text, nullable=True),
            sa.Column("last_webhook_event_id", sa.String(64), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
        )
        op.create_unique_constraint("uq_payment_borrow_request", "payments", ["borrow_request_id"])
        op.create_unique_constraint("uq_payment_order_id", "payments", ["razorpay_order_id"])
        op.create_unique_constraint("uq_payment_payment_id", "payments", ["razorpay_payment_id"])
        op.create_index("ix_payments_status", "payments", ["status"])

def downgrade() -> None:
    op.drop_index("ix_payments_status", table_name="payments")
    op.drop_table("payments")
