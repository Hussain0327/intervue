from datetime import datetime
from enum import Enum
from typing import TYPE_CHECKING, Any
from uuid import UUID

from sqlalchemy import JSON, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
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
    """Model for interview sessions."""

    __tablename__ = "interview_sessions"

    user_id: Mapped[UUID | None] = mapped_column(nullable=True)
    status: Mapped[str] = mapped_column(
        String(50),
        default=SessionStatus.PENDING.value,
        nullable=False,
    )
    interview_type: Mapped[str] = mapped_column(
        String(50),
        default=InterviewType.BEHAVIORAL.value,
        nullable=False,
    )
    difficulty: Mapped[str] = mapped_column(
        String(20),
        default=Difficulty.MEDIUM.value,
        nullable=False,
    )
    current_stage: Mapped[str | None] = mapped_column(String(100), nullable=True)
    stage_metadata: Mapped[dict[str, Any]] = mapped_column(
        JSON,
        default=dict,
        nullable=False,
    )
    started_at: Mapped[datetime | None] = mapped_column(nullable=True)
    ended_at: Mapped[datetime | None] = mapped_column(nullable=True)

    # Relationships
    transcripts: Mapped[list["Transcript"]] = relationship(
        "Transcript",
        back_populates="session",
        cascade="all, delete-orphan",
        order_by="Transcript.sequence_number",
    )

    def __repr__(self) -> str:
        return f"<InterviewSession {self.id} status={self.status}>"
