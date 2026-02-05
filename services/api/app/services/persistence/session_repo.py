"""Repository for persisting interview session data to the database."""

from datetime import datetime
from typing import Any
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.code_submission import CodeSubmission
from app.models.evaluation import Evaluation
from app.models.interview_session import InterviewSession
from app.models.transcript import Transcript


class SessionRepository:
    """Data access layer for interview sessions and related entities."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create_session(
        self,
        session_id: UUID,
        user_id: UUID | None = None,
        interview_type: str = "behavioral",
        interview_mode: str = "full",
        difficulty: str = "medium",
        current_round: int = 1,
        target_role: str | None = None,
        resume_data: dict[str, Any] | None = None,
    ) -> InterviewSession:
        session = InterviewSession(
            id=session_id,
            user_id=user_id,
            interview_type=interview_type,
            interview_mode=interview_mode,
            difficulty=difficulty,
            current_round=current_round,
            target_role=target_role,
            resume_data=resume_data,
            started_at=datetime.utcnow(),
        )
        self.db.add(session)
        await self.db.flush()
        return session

    async def get_session(self, session_id: UUID) -> InterviewSession | None:
        result = await self.db.execute(
            select(InterviewSession).where(InterviewSession.id == session_id)
        )
        return result.scalar_one_or_none()

    async def update_session_phase(
        self,
        session_id: UUID,
        phase: str,
        questions_asked: int | None = None,
    ) -> None:
        session = await self.get_session(session_id)
        if session:
            session.phase = phase
            if questions_asked is not None:
                session.questions_asked = questions_asked

    async def end_session(self, session_id: UUID) -> None:
        session = await self.get_session(session_id)
        if session:
            session.ended_at = datetime.utcnow()

    async def add_transcript(
        self,
        session_id: UUID,
        role: str,
        content: str,
        sequence: int,
    ) -> Transcript:
        transcript = Transcript(
            session_id=session_id,
            role=role,
            content=content,
            sequence=sequence,
        )
        self.db.add(transcript)
        await self.db.flush()
        return transcript

    async def add_evaluation(
        self,
        session_id: UUID,
        round: int,
        score: float,
        passed: bool,
        feedback: str,
        detailed_scores: dict[str, Any] | None = None,
    ) -> Evaluation:
        evaluation = Evaluation(
            session_id=session_id,
            round=round,
            score=score,
            passed=passed,
            feedback=feedback,
            detailed_scores=detailed_scores,
        )
        self.db.add(evaluation)
        await self.db.flush()
        return evaluation

    async def add_code_submission(
        self,
        session_id: UUID,
        problem_id: str,
        code: str,
        language: str,
        correct: bool | None = None,
        score: float | None = None,
        feedback: str | None = None,
        analysis: dict[str, Any] | None = None,
    ) -> CodeSubmission:
        submission = CodeSubmission(
            session_id=session_id,
            problem_id=problem_id,
            code=code,
            language=language,
            correct=correct,
            score=score,
            feedback=feedback,
            analysis=analysis,
        )
        self.db.add(submission)
        await self.db.flush()
        return submission

    async def get_session_with_transcripts(
        self, session_id: UUID
    ) -> InterviewSession | None:
        result = await self.db.execute(
            select(InterviewSession)
            .where(InterviewSession.id == session_id)
            .options(
                selectinload(InterviewSession.transcripts),
                selectinload(InterviewSession.evaluations),
                selectinload(InterviewSession.code_submissions),
            )
        )
        return result.scalar_one_or_none()

    async def get_user_sessions(
        self,
        user_id: UUID,
        limit: int = 20,
        offset: int = 0,
    ) -> list[InterviewSession]:
        result = await self.db.execute(
            select(InterviewSession)
            .where(InterviewSession.user_id == user_id)
            .options(selectinload(InterviewSession.evaluations))
            .order_by(InterviewSession.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        return list(result.scalars().all())

    async def get_user_session_count(self, user_id: UUID) -> int:
        result = await self.db.execute(
            select(func.count()).where(InterviewSession.user_id == user_id)
        )
        return result.scalar_one()

    async def get_user_evaluations(
        self,
        user_id: UUID,
    ) -> list[Evaluation]:
        result = await self.db.execute(
            select(Evaluation)
            .join(InterviewSession)
            .where(InterviewSession.user_id == user_id)
            .order_by(Evaluation.created_at.desc())
        )
        return list(result.scalars().all())
