import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class SessionCreate(BaseModel):
    resume_id: uuid.UUID
    voice: Literal["alloy", "echo", "fable", "onyx", "nova", "shimmer"] = "nova"
    target_questions: int = Field(default=4, ge=1, le=10)


class SessionConfig(BaseModel):
    voice: str = "nova"
    target_questions: int = 4


class QuestionItem(BaseModel):
    text: str
    topic: str = ""
    difficulty: str = ""


class SessionResponse(BaseModel):
    id: str
    resume_id: str
    status: str
    config: SessionConfig | dict
    questions: list[QuestionItem | dict]
    started_at: datetime | None
    completed_at: datetime | None
    created_at: datetime

    @classmethod
    def from_session(cls, session):
        return cls(
            id=str(session.id),
            resume_id=str(session.resume_id),
            status=session.status,
            config=session.config or {},
            questions=session.questions or [],
            started_at=session.started_at,
            completed_at=session.completed_at,
            created_at=session.created_at,
        )


class ScorecardResponse(BaseModel):
    session_id: str
    overall_score: float
    scores: dict
    feedback: str
    strengths: list[str]
    areas_for_improvement: list[str]
    recommendation: str | None = None
    recommendation_reasoning: str | None = None
    per_question: list[dict]
