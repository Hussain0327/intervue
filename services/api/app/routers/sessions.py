"""Session history REST endpoints."""

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.core.security import AuthenticatedUser
from app.db.session import get_db
from app.services.persistence.session_repo import SessionRepository

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/sessions", tags=["sessions"])


class TranscriptItem(BaseModel):
    role: str
    content: str
    sequence: int

    model_config = {"from_attributes": True}


class EvaluationItem(BaseModel):
    round: int
    score: float
    passed: bool
    feedback: str | None

    model_config = {"from_attributes": True}


class CodeSubmissionItem(BaseModel):
    problem_id: str
    language: str
    correct: bool | None
    score: float | None
    feedback: str | None

    model_config = {"from_attributes": True}


class SessionSummary(BaseModel):
    id: UUID
    interview_type: str
    interview_mode: str
    difficulty: str
    current_round: int
    phase: str
    target_role: str | None
    started_at: str | None
    ended_at: str | None
    evaluations: list[EvaluationItem]

    model_config = {"from_attributes": True}


class SessionDetail(BaseModel):
    id: UUID
    interview_type: str
    interview_mode: str
    difficulty: str
    current_round: int
    phase: str
    target_role: str | None
    started_at: str | None
    ended_at: str | None
    transcripts: list[TranscriptItem]
    evaluations: list[EvaluationItem]
    code_submissions: list[CodeSubmissionItem]

    model_config = {"from_attributes": True}


class SessionListResponse(BaseModel):
    sessions: list[SessionSummary]
    total: int
    limit: int
    offset: int


@router.get("/", response_model=SessionListResponse)
async def list_sessions(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SessionListResponse:
    repo = SessionRepository(db)
    user_id = UUID(current_user.sub)
    sessions = await repo.get_user_sessions(user_id, limit=limit, offset=offset)
    total = await repo.get_user_session_count(user_id)

    items = []
    for s in sessions:
        items.append(SessionSummary(
            id=s.id,
            interview_type=s.interview_type,
            interview_mode=s.interview_mode,
            difficulty=s.difficulty,
            current_round=s.current_round,
            phase=s.phase,
            target_role=s.target_role,
            started_at=s.started_at.isoformat() if s.started_at else None,
            ended_at=s.ended_at.isoformat() if s.ended_at else None,
            evaluations=[EvaluationItem.model_validate(e) for e in s.evaluations],
        ))

    return SessionListResponse(sessions=items, total=total, limit=limit, offset=offset)


@router.get("/{session_id}", response_model=SessionDetail)
async def get_session(
    session_id: UUID,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SessionDetail:
    repo = SessionRepository(db)
    session = await repo.get_session_with_transcripts(session_id)

    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    # Ownership check
    if session.user_id and str(session.user_id) != current_user.sub:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    return SessionDetail(
        id=session.id,
        interview_type=session.interview_type,
        interview_mode=session.interview_mode,
        difficulty=session.difficulty,
        current_round=session.current_round,
        phase=session.phase,
        target_role=session.target_role,
        started_at=session.started_at.isoformat() if session.started_at else None,
        ended_at=session.ended_at.isoformat() if session.ended_at else None,
        transcripts=[TranscriptItem.model_validate(t) for t in session.transcripts],
        evaluations=[EvaluationItem.model_validate(e) for e in session.evaluations],
        code_submissions=[CodeSubmissionItem.model_validate(c) for c in session.code_submissions],
    )
