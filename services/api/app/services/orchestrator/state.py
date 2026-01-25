from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from uuid import UUID, uuid4

from app.schemas.resume import ParsedResume
from app.services.llm.client import LLMMessage


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

    def add_message(self, role: str, content: str) -> int:
        """Add a message to conversation history and return sequence number."""
        self.conversation_history.append(
            LLMMessage(role="user" if role == "candidate" else "assistant", content=content)
        )
        self.sequence_number += 1
        return self.sequence_number

    def get_conversation_for_llm(self) -> list[LLMMessage]:
        """Get conversation history formatted for LLM."""
        return self.conversation_history.copy()

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

    def create_session(
        self,
        session_id: str | None = None,
        interview_type: str = "behavioral",
        difficulty: str = "medium",
    ) -> InterviewState:
        """Create a new interview session."""
        state = InterviewState(
            session_id=UUID(session_id) if session_id else uuid4(),
            interview_type=interview_type,
            difficulty=difficulty,
        )
        self._sessions[str(state.session_id)] = state
        return state

    def get_session(self, session_id: str) -> InterviewState | None:
        """Get an existing session by ID."""
        return self._sessions.get(session_id)

    def remove_session(self, session_id: str) -> None:
        """Remove a session."""
        self._sessions.pop(session_id, None)


# Global session manager
session_manager = SessionManager()
