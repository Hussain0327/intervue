"""Unit tests for ORM model enums and defaults."""


from app.models.interview_session import Difficulty, InterviewType, SessionStatus
from app.models.transcript import TranscriptRole


def test_session_status_values():
    assert SessionStatus.PENDING == "pending"
    assert SessionStatus.ACTIVE == "active"
    assert SessionStatus.PAUSED == "paused"
    assert SessionStatus.COMPLETED == "completed"
    assert SessionStatus.CANCELLED == "cancelled"


def test_interview_type_values():
    assert InterviewType.BEHAVIORAL == "behavioral"
    assert InterviewType.TECHNICAL == "technical"
    assert InterviewType.CODING == "coding"
    assert InterviewType.SYSTEM_DESIGN == "system_design"


def test_difficulty_values():
    assert Difficulty.EASY == "easy"
    assert Difficulty.MEDIUM == "medium"
    assert Difficulty.HARD == "hard"


def test_transcript_role_values():
    assert TranscriptRole.CANDIDATE == "candidate"
    assert TranscriptRole.INTERVIEWER == "interviewer"
    assert TranscriptRole.SYSTEM == "system"


def test_session_status_membership():
    all_values = {s.value for s in SessionStatus}
    assert all_values == {"pending", "active", "paused", "completed", "cancelled"}


def test_interview_type_membership():
    all_values = {t.value for t in InterviewType}
    assert all_values == {"behavioral", "technical", "coding", "system_design"}
