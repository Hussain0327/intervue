"""Initial schema migration

Revision ID: 001_initial
Revises:
Create Date: 2024-01-28

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '001_initial'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create interview_sessions table
    op.create_table(
        'interview_sessions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('interview_type', sa.String(50), nullable=False, default='behavioral'),
        sa.Column('interview_mode', sa.String(50), nullable=False, default='full'),
        sa.Column('difficulty', sa.String(20), nullable=False, default='medium'),
        sa.Column('current_round', sa.Integer, nullable=False, default=1),
        sa.Column('phase', sa.String(50), nullable=False, default='introduction'),
        sa.Column('questions_asked', sa.Integer, nullable=False, default=0),
        sa.Column('max_questions', sa.Integer, nullable=False, default=5),
        sa.Column('target_role', sa.String(200), nullable=True),
        sa.Column('resume_data', postgresql.JSONB, nullable=True),
        sa.Column('started_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('ended_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    # Create index on user_id for faster lookups
    op.create_index('ix_interview_sessions_user_id', 'interview_sessions', ['user_id'])
    op.create_index('ix_interview_sessions_started_at', 'interview_sessions', ['started_at'])

    # Create transcripts table
    op.create_table(
        'transcripts',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('session_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('interview_sessions.id', ondelete='CASCADE'), nullable=False),
        sa.Column('sequence', sa.Integer, nullable=False),
        sa.Column('role', sa.String(20), nullable=False),  # 'candidate' or 'interviewer'
        sa.Column('content', sa.Text, nullable=False),
        sa.Column('audio_url', sa.String(500), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # Create index for efficient transcript retrieval
    op.create_index('ix_transcripts_session_id', 'transcripts', ['session_id'])
    op.create_index('ix_transcripts_session_sequence', 'transcripts', ['session_id', 'sequence'])

    # Create evaluations table
    op.create_table(
        'evaluations',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('session_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('interview_sessions.id', ondelete='CASCADE'), nullable=False),
        sa.Column('round', sa.Integer, nullable=False),
        sa.Column('score', sa.Float, nullable=False),
        sa.Column('passed', sa.Boolean, nullable=False),
        sa.Column('feedback', sa.Text, nullable=True),
        sa.Column('detailed_scores', postgresql.JSONB, nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_index('ix_evaluations_session_id', 'evaluations', ['session_id'])

    # Create code_submissions table
    op.create_table(
        'code_submissions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('session_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('interview_sessions.id', ondelete='CASCADE'), nullable=False),
        sa.Column('problem_id', sa.String(100), nullable=False),
        sa.Column('code', sa.Text, nullable=False),
        sa.Column('language', sa.String(50), nullable=False),
        sa.Column('correct', sa.Boolean, nullable=True),
        sa.Column('score', sa.Float, nullable=True),
        sa.Column('feedback', sa.Text, nullable=True),
        sa.Column('analysis', postgresql.JSONB, nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_index('ix_code_submissions_session_id', 'code_submissions', ['session_id'])


def downgrade() -> None:
    op.drop_table('code_submissions')
    op.drop_table('evaluations')
    op.drop_table('transcripts')
    op.drop_table('interview_sessions')
