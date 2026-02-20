import uuid
from decimal import Decimal

from sqlalchemy import ARRAY, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class Evaluation(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "evaluations"

    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("interview_sessions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    question_index: Mapped[int | None] = mapped_column(Integer)
    question_text: Mapped[str | None] = mapped_column(Text)
    answer_summary: Mapped[str | None] = mapped_column(Text)
    scores: Mapped[dict] = mapped_column(JSONB, nullable=False)
    feedback: Mapped[str] = mapped_column(Text, nullable=False)
    strengths: Mapped[list[str] | None] = mapped_column(ARRAY(String))
    areas_for_improvement: Mapped[list[str] | None] = mapped_column(ARRAY(String))
    overall_score: Mapped[Decimal] = mapped_column(Numeric(3, 1), nullable=False)

    session = relationship("InterviewSession", back_populates="evaluations")
