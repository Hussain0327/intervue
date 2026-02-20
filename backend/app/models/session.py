import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class InterviewSession(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "interview_sessions"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    resume_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("resumes.id"), nullable=False
    )
    status: Mapped[str] = mapped_column(String(50), default="pending", index=True)
    config: Mapped[dict] = mapped_column(JSONB, default=dict)
    questions: Mapped[list] = mapped_column(JSONB, default=list)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    user = relationship("User", back_populates="sessions")
    resume = relationship("Resume", back_populates="sessions")
    transcript_entries = relationship(
        "TranscriptEntry", back_populates="session", cascade="all, delete-orphan"
    )
    evaluations = relationship(
        "Evaluation", back_populates="session", cascade="all, delete-orphan"
    )
