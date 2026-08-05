"""Add damage_evidence_url

Revision ID: 4c3b7d72d197
Revises: df2fc5e9a4c8
Create Date: 2026-08-05 13:13:02.457771

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4c3b7d72d197'
down_revision: Union[str, None] = 'df2fc5e9a4c8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('damage_claims', sa.Column('damage_evidence_url', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('damage_claims', 'damage_evidence_url')
