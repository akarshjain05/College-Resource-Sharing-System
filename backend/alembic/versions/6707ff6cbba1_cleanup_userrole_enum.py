"""cleanup_userrole_enum

Revision ID: 6707ff6cbba1
Revises: ccfdde066d57
Create Date: 2026-08-11 00:13:27.500482

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6707ff6cbba1'
down_revision: Union[str, None] = 'ccfdde066d57'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Rename old enum type
    op.execute("ALTER TYPE userrole RENAME TO userrole_old")
    
    # Create new enum type with only student and admin
    op.execute("CREATE TYPE userrole AS ENUM ('student', 'admin')")
    
    # Alter the users table column to use the new enum type
    # Since we already ran an UPDATE to change all faculty/club to student in a previous migration,
    # all current rows will cast correctly to the new userrole.
    op.execute("ALTER TABLE users ALTER COLUMN role DROP DEFAULT")
    op.execute("ALTER TABLE users ALTER COLUMN role TYPE userrole USING role::text::userrole")
    op.execute("ALTER TABLE users ALTER COLUMN role SET DEFAULT 'student'::userrole")
    
    # Drop the old enum type
    op.execute("DROP TYPE userrole_old")


def downgrade() -> None:
    pass
