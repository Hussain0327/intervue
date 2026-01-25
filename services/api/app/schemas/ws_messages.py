from enum import Enum
from typing import Literal

from pydantic import BaseModel


class InterviewState(str, Enum):
    """States for the interview session."""

    READY = "ready"
    PROCESSING_STT = "processing_stt"
    GENERATING = "generating"
    SPEAKING = "speaking"
    ERROR = "error"


# Client -> Server messages


class AudioMessage(BaseModel):
    """Audio data from client."""

    type: Literal["audio"] = "audio"
    data: str  # Base64 encoded audio
    format: str = "webm"


class PlaybackCompleteMessage(BaseModel):
    """Client finished playing audio."""

    type: Literal["playback_complete"] = "playback_complete"


class EndSessionMessage(BaseModel):
    """Client wants to end the session."""

    type: Literal["end_session"] = "end_session"


class ResumeContextMessage(BaseModel):
    """Resume context from client."""

    type: Literal["resume_context"] = "resume_context"
    resume_text: str


class StartInterviewMessage(BaseModel):
    """Client signals ready to start the interview."""

    type: Literal["start_interview"] = "start_interview"


# Server -> Client messages


class StatusMessage(BaseModel):
    """Current interview state."""

    type: Literal["status"] = "status"
    state: InterviewState


class TranscriptMessage(BaseModel):
    """Transcript entry."""

    type: Literal["transcript"] = "transcript"
    role: Literal["candidate", "interviewer"]
    text: str
    sequence: int


class AudioResponseMessage(BaseModel):
    """Audio response from interviewer."""

    type: Literal["audio"] = "audio"
    data: str  # Base64 encoded audio
    format: str = "mp3"


class ErrorMessage(BaseModel):
    """Error message."""

    type: Literal["error"] = "error"
    code: str
    message: str
    recoverable: bool = True


class SessionStartedMessage(BaseModel):
    """Session has started."""

    type: Literal["session_started"] = "session_started"
    session_id: str


class SessionEndedMessage(BaseModel):
    """Session has ended."""

    type: Literal["session_ended"] = "session_ended"
    session_id: str
    total_turns: int
