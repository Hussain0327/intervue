from sqlalchemy import String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, FullTimestampMixin, UUIDMixin


class User(UUIDMixin, FullTimestampMixin, Base):
    __tablename__ = "users"
    __table_args__ = (UniqueConstraint("provider", "provider_id"),)

    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    name: Mapped[str | None] = mapped_column(String(255))
    avatar_url: Mapped[str | None] = mapped_column(String(512))
    provider: Mapped[str] = mapped_column(String(50), nullable=False)
    provider_id: Mapped[str] = mapped_column(String(255), nullable=False)

    resumes = relationship("Resume", back_populates="user", cascade="all, delete-orphan")
    sessions = relationship(
        "InterviewSession", back_populates="user", cascade="all, delete-orphan"
    )
