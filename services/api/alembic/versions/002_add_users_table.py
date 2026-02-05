"""Add users table and FK from interview_sessions

Revision ID: 002_add_users
Revises: 001_initial
Create Date: 2024-02-05

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '002_add_users'
down_revision: Union[str, None] = '001_initial'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'users',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('email', sa.String(320), nullable=False, unique=True),
        sa.Column('hashed_password', sa.String(128), nullable=False),
        sa.Column('full_name', sa.String(200), nullable=True),
        sa.Column('is_active', sa.Boolean, nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(),
                  onupdate=sa.func.now()),
    )

    op.create_index('ix_users_email', 'users', ['email'], unique=True)

    # Add FK constraint from interview_sessions.user_id to users.id
    op.create_foreign_key(
        'fk_interview_sessions_user_id',
        'interview_sessions',
        'users',
        ['user_id'],
        ['id'],
        ondelete='SET NULL',
    )


def downgrade() -> None:
    op.drop_constraint('fk_interview_sessions_user_id', 'interview_sessions', type_='foreignkey')
    op.drop_table('users')
