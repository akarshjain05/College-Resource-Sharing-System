"""add google oauth fields to users

Revision ID: 0001_add_google_oauth
Revises:
Create Date: 2026-07-04

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "0001_add_google_oauth"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Existing local-password accounts are unaffected; hashed_password only becomes
    # nullable to allow Google-only accounts going forward.
    op.alter_column(
        "users",
        "hashed_password",
        existing_type=sa.String(length=255),
        nullable=True,
    )

    auth_provider_enum = sa.Enum("local", "google", name="authprovider")
    auth_provider_enum.create(op.get_bind(), checkfirst=True)

    op.add_column(
        "users",
        sa.Column(
            "auth_provider",
            auth_provider_enum,
            nullable=False,
            server_default=sa.text("'local'::authprovider"),
        ),
    )
    op.add_column("users", sa.Column("google_id", sa.String(length=255), nullable=True))
    op.create_unique_constraint("uq_users_google_id", "users", ["google_id"])
    op.create_index("ix_users_google_id", "users", ["google_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_users_google_id", table_name="users")
    op.drop_constraint("uq_users_google_id", "users", type_="unique")
    op.drop_column("users", "google_id")
    op.drop_column("users", "auth_provider")

    auth_provider_enum = sa.Enum("local", "google", name="authprovider")
    auth_provider_enum.drop(op.get_bind(), checkfirst=True)

    op.alter_column(
        "users",
        "hashed_password",
        existing_type=sa.String(length=255),
        nullable=False,
    )
