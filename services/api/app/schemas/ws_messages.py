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


class EvaluationMessage(BaseModel):
    """Interview round evaluation result."""

    type: Literal["evaluation"] = "evaluation"
    round: int
    score: float
    passed: bool
    feedback: str


class RequestEvaluationMessage(BaseModel):
    """Client requests evaluation of the interview round."""

    type: Literal["request_evaluation"] = "request_evaluation"


# Coding challenge messages


class RequestProblemMessage(BaseModel):
    """Client requests a coding problem."""

    type: Literal["request_problem"] = "request_problem"


class CodeSubmissionMessage(BaseModel):
    """Code submission from client."""

    type: Literal["code_submission"] = "code_submission"
    code: str
    language: str
    problem_id: str


class ProblemExample(BaseModel):
    """Example for a coding problem."""

    input: str
    output: str
    explanation: str | None = None


class ProblemMessage(BaseModel):
    """Coding problem sent to client."""

    type: Literal["problem"] = "problem"
    problem: dict  # Contains id, title, difficulty, description, examples, constraints, starter_code, tags


class CodeEvaluationAnalysis(BaseModel):
    """Detailed analysis of code evaluation."""

    correctness: int
    edge_case_handling: int
    code_quality: int
    complexity: int


class CodeEvaluationMessage(BaseModel):
    """Code evaluation result sent to client."""

    type: Literal["code_evaluation"] = "code_evaluation"
    correct: bool
    score: float
    feedback: str
    analysis: CodeEvaluationAnalysis | None = None


# Streaming messages


class TranscriptDeltaMessage(BaseModel):
    """Incremental transcript update for streaming."""

    type: Literal["transcript_delta"] = "transcript_delta"
    role: Literal["candidate", "interviewer"]
    delta: str
    is_final: bool
    sequence: int


class AudioChunkMessage(BaseModel):
    """Audio chunk for streaming playback."""

    type: Literal["audio_chunk"] = "audio_chunk"
    data: str  # Base64 encoded audio chunk
    format: str = "mp3"
    sequence: int
    is_final: bool


class StreamingStatusMessage(BaseModel):
    """Status update during streaming processing."""

    type: Literal["streaming_status"] = "streaming_status"
    stage: Literal["transcribing", "thinking", "speaking"]
    latency_ms: int | None = None
