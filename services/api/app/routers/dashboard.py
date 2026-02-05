"""Dashboard analytics endpoints."""

import logging
from uuid import UUID

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.core.security import AuthenticatedUser
from app.db.session import get_db
from app.models.evaluation import Evaluation
from app.models.interview_session import InterviewSession

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


class DashboardSummary(BaseModel):
    total_sessions: int
    avg_score: float | None
    pass_rate: float | None
    total_evaluations: int


class SessionHistoryItem(BaseModel):
    id: str
    interview_type: str
    interview_mode: str
    current_round: int
    target_role: str | None
    started_at: str | None
    ended_at: str | None
    score: float | None
    passed: bool | None

    model_config = {"from_attributes": True}


class SessionHistoryResponse(BaseModel):
    sessions: list[SessionHistoryItem]
    total: int


class ScoreTrendItem(BaseModel):
    date: str
    score: float
    round: int


class StrengthItem(BaseModel):
    round_type: str
    avg_score: float
    count: int


@router.get("/summary", response_model=DashboardSummary)
async def get_summary(
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DashboardSummary:
    user_id = UUID(current_user.sub)

    # Total sessions
    session_count = await db.execute(
        select(func.count()).where(InterviewSession.user_id == user_id)
    )
    total_sessions = session_count.scalar_one()

    # Evaluation stats
    eval_stats = await db.execute(
        select(
            func.count(Evaluation.id),
            func.avg(Evaluation.score),
        )
        .join(InterviewSession)
        .where(InterviewSession.user_id == user_id)
    )
    row = eval_stats.one()
    total_evals = row[0] or 0
    avg_score = round(float(row[1]), 1) if row[1] else None

    # Calculate pass rate manually
    if total_evals > 0:
        passed_count = await db.execute(
            select(func.count())
            .select_from(Evaluation)
            .join(InterviewSession)
            .where(InterviewSession.user_id == user_id, Evaluation.passed.is_(True))
        )
        pass_count = passed_count.scalar_one()
        pass_rate = round(pass_count / total_evals * 100, 1)
    else:
        pass_rate = None

    return DashboardSummary(
        total_sessions=total_sessions,
        avg_score=avg_score,
        pass_rate=pass_rate,
        total_evaluations=total_evals,
    )


@router.get("/history", response_model=SessionHistoryResponse)
async def get_history(
    limit: int = 20,
    offset: int = 0,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SessionHistoryResponse:
    user_id = UUID(current_user.sub)

    total_result = await db.execute(
        select(func.count()).where(InterviewSession.user_id == user_id)
    )
    total = total_result.scalar_one()

    result = await db.execute(
        select(InterviewSession)
        .where(InterviewSession.user_id == user_id)
        .order_by(InterviewSession.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    sessions = result.scalars().all()

    items = []
    for s in sessions:
        # Get latest evaluation for this session
        eval_result = await db.execute(
            select(Evaluation)
            .where(Evaluation.session_id == s.id)
            .order_by(Evaluation.created_at.desc())
            .limit(1)
        )
        evaluation = eval_result.scalar_one_or_none()

        items.append(SessionHistoryItem(
            id=str(s.id),
            interview_type=s.interview_type,
            interview_mode=s.interview_mode,
            current_round=s.current_round,
            target_role=s.target_role,
            started_at=s.started_at.isoformat() if s.started_at else None,
            ended_at=s.ended_at.isoformat() if s.ended_at else None,
            score=evaluation.score if evaluation else None,
            passed=evaluation.passed if evaluation else None,
        ))

    return SessionHistoryResponse(sessions=items, total=total)


@router.get("/score-trend", response_model=list[ScoreTrendItem])
async def get_score_trend(
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[ScoreTrendItem]:
    user_id = UUID(current_user.sub)

    result = await db.execute(
        select(Evaluation)
        .join(InterviewSession)
        .where(InterviewSession.user_id == user_id)
        .order_by(Evaluation.created_at.asc())
    )
    evaluations = result.scalars().all()

    return [
        ScoreTrendItem(
            date=e.created_at.isoformat(),
            score=e.score,
            round=e.round,
        )
        for e in evaluations
    ]


@router.get("/strengths", response_model=list[StrengthItem])
async def get_strengths(
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[StrengthItem]:
    user_id = UUID(current_user.sub)

    # Map round numbers to types
    round_types = {1: "Behavioral", 2: "Coding", 3: "System Design"}

    result = await db.execute(
        select(
            Evaluation.round,
            func.avg(Evaluation.score),
            func.count(Evaluation.id),
        )
        .join(InterviewSession)
        .where(InterviewSession.user_id == user_id)
        .group_by(Evaluation.round)
    )

    return [
        StrengthItem(
            round_type=round_types.get(row[0], f"Round {row[0]}"),
            avg_score=round(float(row[1]), 1),
            count=row[2],
        )
        for row in result.all()
    ]
