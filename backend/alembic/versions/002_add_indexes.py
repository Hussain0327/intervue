"""Add indexes on FK and query columns

Revision ID: 002
Revises: 001
Create Date: 2026-02-20
"""

from typing import Sequence, Union

from alembic import op

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_index("ix_resumes_user_id", "resumes", ["user_id"])
    op.create_index("ix_interview_sessions_user_id", "interview_sessions", ["user_id"])
    op.create_index("ix_interview_sessions_status", "interview_sessions", ["status"])
    op.create_index("ix_transcript_entries_session_id", "transcript_entries", ["session_id"])
    op.create_index("ix_evaluations_session_id", "evaluations", ["session_id"])


def downgrade() -> None:
    op.drop_index("ix_evaluations_session_id", table_name="evaluations")
    op.drop_index("ix_transcript_entries_session_id", table_name="transcript_entries")
    op.drop_index("ix_interview_sessions_status", table_name="interview_sessions")
    op.drop_index("ix_interview_sessions_user_id", table_name="interview_sessions")
    op.drop_index("ix_resumes_user_id", table_name="resumes")
