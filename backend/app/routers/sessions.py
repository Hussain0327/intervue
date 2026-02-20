import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.core.database import get_db
from app.models.evaluation import Evaluation
from app.models.resume import Resume
from app.models.session import InterviewSession
from app.models.user import User
from app.schemas.session import ScorecardResponse, SessionCreate, SessionResponse
from app.services.question_generator import generate_questions

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("", response_model=SessionResponse)
async def create_session(
    body: SessionCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Verify resume belongs to user
    result = await db.execute(
        select(Resume).where(Resume.id == body.resume_id, Resume.user_id == user.id)
    )
    resume = result.scalar_one_or_none()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    if not resume.structured_data:
        raise HTTPException(status_code=400, detail="Resume not yet parsed")

    # Generate questions
    try:
        questions = await generate_questions(
            resume.structured_data,
            num_questions=body.target_questions,
        )
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception:
        logger.exception("Question generation failed")
        raise HTTPException(status_code=500, detail="Failed to generate interview questions")

    session = InterviewSession(
        user_id=user.id,
        resume_id=resume.id,
        config={"voice": body.voice, "target_questions": body.target_questions},
        questions=questions,
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)

    return SessionResponse.from_session(session)


@router.get("", response_model=list[SessionResponse])
async def list_sessions(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    result = await db.execute(
        select(InterviewSession)
        .where(InterviewSession.user_id == user.id)
        .order_by(InterviewSession.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    sessions = result.scalars().all()
    return [SessionResponse.from_session(s) for s in sessions]


@router.get("/{session_id}", response_model=SessionResponse)
async def get_session(
    session_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(InterviewSession).where(
            InterviewSession.id == session_id, InterviewSession.user_id == user.id
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return SessionResponse.from_session(session)


@router.get("/{session_id}/scorecard", response_model=ScorecardResponse)
async def get_scorecard(
    session_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(InterviewSession).where(
            InterviewSession.id == session_id, InterviewSession.user_id == user.id
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if session.status != "completed":
        raise HTTPException(status_code=400, detail="Interview not yet completed")

    # Get evaluations
    result = await db.execute(
        select(Evaluation)
        .where(Evaluation.session_id == session_id)
        .order_by(Evaluation.question_index)
    )
    evaluations = result.scalars().all()

    # Find overall evaluation (question_index is None)
    overall = next((e for e in evaluations if e.question_index is None), None)
    per_question = [e for e in evaluations if e.question_index is not None]

    if not overall:
        raise HTTPException(status_code=404, detail="Scorecard not yet generated")

    return ScorecardResponse(
        session_id=str(session_id),
        overall_score=float(overall.overall_score),
        scores=overall.scores,
        feedback=overall.feedback,
        strengths=overall.strengths or [],
        areas_for_improvement=overall.areas_for_improvement or [],
        recommendation=overall.scores.get("recommendation"),
        recommendation_reasoning=overall.scores.get("recommendation_reasoning"),
        per_question=[
            {
                "question_index": e.question_index,
                "question_text": e.question_text,
                "answer_summary": e.answer_summary,
                "scores": e.scores,
                "overall_score": float(e.overall_score),
                "feedback": e.feedback,
                "strengths": e.strengths or [],
                "areas_for_improvement": e.areas_for_improvement or [],
            }
            for e in per_question
        ],
    )
