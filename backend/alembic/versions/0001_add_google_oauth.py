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
from sqlalchemy.engine.reflection import Inspector
from sqlalchemy.exc import NoSuchTableError

def upgrade() -> None:
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)
    try:
        columns = [col['name'] for col in inspector.get_columns('users')]
    except NoSuchTableError:
        columns = []

    if 'google_id' not in columns and inspector.has_table('users'):
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
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)
    try:
        columns = [col['name'] for col in inspector.get_columns('users')]
    except NoSuchTableError:
        columns = []

    if 'google_id' in columns and inspector.has_table('users'):
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
