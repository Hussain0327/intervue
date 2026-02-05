"""Unit tests for Pydantic schemas — auth and WS messages."""

import pytest
from pydantic import ValidationError

from app.schemas.auth import (
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
    TokenResponse,
)
from app.schemas.ws_messages import (
    AudioMessage,
    ErrorMessage,
    InterviewState,
    PlaybackCompleteMessage,
    TranscriptMessage,
)

# ---------------------------------------------------------------------------
# Auth schemas
# ---------------------------------------------------------------------------


def test_register_request_valid():
    r = RegisterRequest(email="a@b.com", password="12345678", full_name="Test")
    assert r.email == "a@b.com"


def test_register_request_password_too_short():
    with pytest.raises(ValidationError):
        RegisterRequest(email="a@b.com", password="short")


def test_register_request_password_max_length():
    long_pw = "a" * 128
    r = RegisterRequest(email="a@b.com", password=long_pw)
    assert len(r.password) == 128


def test_register_request_password_too_long():
    with pytest.raises(ValidationError):
        RegisterRequest(email="a@b.com", password="a" * 129)


def test_register_request_invalid_email():
    with pytest.raises(ValidationError):
        RegisterRequest(email="not-an-email", password="12345678")


def test_login_request_valid():
    r = LoginRequest(email="a@b.com", password="pw")
    assert r.email == "a@b.com"


def test_token_response_defaults():
    t = TokenResponse(access_token="a", refresh_token="r")
    assert t.token_type == "bearer"
    assert t.expires_in == 3600


def test_refresh_request():
    r = RefreshRequest(refresh_token="xyz")
    assert r.refresh_token == "xyz"


# ---------------------------------------------------------------------------
# WS message schemas
# ---------------------------------------------------------------------------


def test_audio_message_defaults():
    m = AudioMessage(data="base64audio")
    assert m.type == "audio"
    assert m.format == "webm"


def test_playback_complete_type_literal():
    m = PlaybackCompleteMessage()
    assert m.type == "playback_complete"


def test_transcript_message_role_literals():
    m = TranscriptMessage(role="candidate", text="hi", sequence=1)
    assert m.role == "candidate"
    m2 = TranscriptMessage(role="interviewer", text="hello", sequence=2)
    assert m2.role == "interviewer"


def test_error_message_recoverable_default():
    m = ErrorMessage(code="E1", message="oops")
    assert m.recoverable is True


def test_interview_state_enum_values():
    assert InterviewState.READY == "ready"
    assert InterviewState.GENERATING == "generating"
    assert InterviewState.SPEAKING == "speaking"
    assert InterviewState.ERROR == "error"
