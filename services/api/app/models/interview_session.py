from datetime import datetime
from enum import Enum
from typing import TYPE_CHECKING, Any
from uuid import UUID

from sqlalchemy import Integer, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from app.models.code_submission import CodeSubmission
    from app.models.evaluation import Evaluation
    from app.models.transcript import Transcript


class SessionStatus(str, Enum):
    PENDING = "pending"
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class InterviewType(str, Enum):
    BEHAVIORAL = "behavioral"
    TECHNICAL = "technical"
    CODING = "coding"
    SYSTEM_DESIGN = "system_design"


class Difficulty(str, Enum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"


class InterviewSession(Base, UUIDMixin, TimestampMixin):
    """Model for interview sessions — aligned with 001_initial_schema migration."""

    __tablename__ = "interview_sessions"

    user_id: Mapped[UUID | None] = mapped_column(nullable=True, index=True)
    interview_type: Mapped[str] = mapped_column(
        String(50),
        default=InterviewType.BEHAVIORAL.value,
        nullable=False,
    )
    interview_mode: Mapped[str] = mapped_column(
        String(50),
        default="full",
        nullable=False,
    )
    difficulty: Mapped[str] = mapped_column(
        String(20),
        default=Difficulty.MEDIUM.value,
        nullable=False,
    )
    current_round: Mapped[int] = mapped_column(
        Integer,
        default=1,
        nullable=False,
    )
    phase: Mapped[str] = mapped_column(
        String(50),
        default="introduction",
        nullable=False,
    )
    questions_asked: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )
    max_questions: Mapped[int] = mapped_column(
        Integer,
        default=5,
        nullable=False,
    )
    target_role: Mapped[str | None] = mapped_column(String(200), nullable=True)
    resume_data: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    started_at: Mapped[datetime | None] = mapped_column(nullable=True)
    ended_at: Mapped[datetime | None] = mapped_column(nullable=True)

    # Relationships
    transcripts: Mapped[list["Transcript"]] = relationship(
        "Transcript",
        back_populates="session",
        cascade="all, delete-orphan",
        order_by="Transcript.sequence",
    )
    evaluations: Mapped[list["Evaluation"]] = relationship(
        "Evaluation",
        back_populates="session",
        cascade="all, delete-orphan",
    )
    code_submissions: Mapped[list["CodeSubmission"]] = relationship(
        "CodeSubmission",
        back_populates="session",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<InterviewSession {self.id} phase={self.phase}>"
