import asyncio
import logging
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from uuid import UUID, uuid4

from app.schemas.coding import CodingProblem
from app.schemas.resume import ParsedResume
from app.services.llm.client import LLMMessage

logger = logging.getLogger(__name__)

MAX_SESSIONS = 500
SESSION_TTL_MINUTES = 120
MAX_CONVERSATION_MESSAGES = 50


class SessionPhase(str, Enum):
    """Interview session phases."""

    INTRODUCTION = "introduction"
    WARMUP = "warmup"
    MAIN_QUESTIONS = "main_questions"
    FOLLOW_UP = "follow_up"
    WRAP_UP = "wrap_up"
    COMPLETED = "completed"


@dataclass
class InterviewState:
    """State for an active interview session."""

    session_id: UUID = field(default_factory=uuid4)
    phase: SessionPhase = SessionPhase.INTRODUCTION
    conversation_history: list[LLMMessage] = field(default_factory=list)
    sequence_number: int = 0
    questions_asked: int = 0
    max_questions: int = 5
    started_at: datetime = field(default_factory=datetime.utcnow)
    interview_type: str = "behavioral"
    difficulty: str = "medium"
    resume_context: str = ""
    parsed_resume: ParsedResume | None = None
    target_role: str | None = None
    current_round: int = 1  # 1=behavioral, 2=coding, 3=system_design
    interview_mode: str = "full"  # full, behavioral, coding, system_design
    # Coding challenge state
    current_problem: CodingProblem | None = None
    submitted_code: str | None = None
    submitted_language: str | None = None

    def add_message(self, role: str, content: str) -> int:
        """Add a message to conversation history and return sequence number."""
        self.conversation_history.append(
            LLMMessage(role="user" if role == "candidate" else "assistant", content=content)
        )
        self.sequence_number += 1
        return self.sequence_number

    def get_conversation_for_llm(self) -> list[LLMMessage]:
        """Get conversation history formatted for LLM (capped to last N messages)."""
        return self.conversation_history[-MAX_CONVERSATION_MESSAGES:]

    def should_wrap_up(self) -> bool:
        """Check if interview should wrap up."""
        return self.questions_asked >= self.max_questions

    def advance_phase(self) -> None:
        """Advance to the next interview phase."""
        phase_order = [
            SessionPhase.INTRODUCTION,
            SessionPhase.WARMUP,
            SessionPhase.MAIN_QUESTIONS,
            SessionPhase.FOLLOW_UP,
            SessionPhase.WRAP_UP,
            SessionPhase.COMPLETED,
        ]

        current_idx = phase_order.index(self.phase)
        if current_idx < len(phase_order) - 1:
            self.phase = phase_order[current_idx + 1]


class SessionManager:
    """Manages active interview sessions."""

    def __init__(self) -> None:
        self._sessions: dict[str, InterviewState] = {}
        self._lock = asyncio.Lock()

    def _is_expired(self, state: InterviewState) -> bool:
        """Check if a session has exceeded the TTL."""
        return datetime.utcnow() - state.started_at > timedelta(minutes=SESSION_TTL_MINUTES)

    async def create_session(
        self,
        session_id: str | None = None,
        interview_type: str = "behavioral",
        difficulty: str = "medium",
        current_round: int = 1,
        interview_mode: str = "full",
    ) -> InterviewState:
        """Create a new interview session."""
        async with self._lock:
            # Evict expired sessions first
            expired_keys = [
                sid for sid, s in self._sessions.items() if self._is_expired(s)
            ]
            for sid in expired_keys:
                logger.info("Evicting expired session: %s", sid)
                del self._sessions[sid]

            # Enforce MAX_SESSIONS by evicting oldest
            while len(self._sessions) >= MAX_SESSIONS:
                oldest_key = min(
                    self._sessions, key=lambda k: self._sessions[k].started_at
                )
                logger.warning(
                    "MAX_SESSIONS (%d) reached — evicting oldest session: %s",
                    MAX_SESSIONS,
                    oldest_key,
                )
                del self._sessions[oldest_key]

            state = InterviewState(
                session_id=UUID(session_id) if session_id else uuid4(),
                interview_type=interview_type,
                difficulty=difficulty,
                current_round=current_round,
                interview_mode=interview_mode,
            )
            self._sessions[str(state.session_id)] = state
            return state

    def get_session(self, session_id: str) -> InterviewState | None:
        """Get an existing session by ID (lazy-evicts expired sessions)."""
        state = self._sessions.get(session_id)
        if state is not None and self._is_expired(state):
            logger.info("Session %s expired on access — removing", session_id)
            self._sessions.pop(session_id, None)
            return None
        return state

    async def remove_session(self, session_id: str) -> None:
        """Remove a session."""
        async with self._lock:
            self._sessions.pop(session_id, None)


# Global session manager
session_manager = SessionManager()
