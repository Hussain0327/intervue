"""Unit tests for SessionManager and InterviewState in-memory state."""

import uuid as uuid_mod
from datetime import datetime, timedelta

import pytest

from app.services.orchestrator.state import (
    MAX_CONVERSATION_MESSAGES,
    MAX_SESSIONS,
    SESSION_TTL_MINUTES,
    InterviewState,
    SessionManager,
    SessionPhase,
)


def _uuid() -> str:
    """Generate a random UUID string."""
    return str(uuid_mod.uuid4())


# ---------------------------------------------------------------------------
# InterviewState
# ---------------------------------------------------------------------------


def test_add_message_increments_sequence():
    state = InterviewState()
    seq1 = state.add_message("candidate", "Hello")
    seq2 = state.add_message("interviewer", "Hi")
    assert seq1 == 1
    assert seq2 == 2


def test_add_message_appends_to_history():
    state = InterviewState()
    state.add_message("candidate", "Hello")
    assert len(state.conversation_history) == 1
    assert state.conversation_history[0].role == "user"
    assert state.conversation_history[0].content == "Hello"


def test_conversation_capping():
    state = InterviewState()
    for i in range(MAX_CONVERSATION_MESSAGES + 10):
        state.add_message("candidate", f"msg-{i}")
    capped = state.get_conversation_for_llm()
    assert len(capped) == MAX_CONVERSATION_MESSAGES


def test_should_wrap_up_false():
    state = InterviewState(questions_asked=0, max_questions=5)
    assert state.should_wrap_up() is False


def test_should_wrap_up_true():
    state = InterviewState(questions_asked=5, max_questions=5)
    assert state.should_wrap_up() is True


def test_advance_phase_order():
    state = InterviewState(phase=SessionPhase.INTRODUCTION)
    state.advance_phase()
    assert state.phase == SessionPhase.WARMUP
    state.advance_phase()
    assert state.phase == SessionPhase.MAIN_QUESTIONS
    state.advance_phase()
    assert state.phase == SessionPhase.FOLLOW_UP
    state.advance_phase()
    assert state.phase == SessionPhase.WRAP_UP
    state.advance_phase()
    assert state.phase == SessionPhase.COMPLETED


def test_advance_phase_stays_at_completed():
    state = InterviewState(phase=SessionPhase.COMPLETED)
    state.advance_phase()
    assert state.phase == SessionPhase.COMPLETED


# ---------------------------------------------------------------------------
# SessionManager
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_create_and_get_session():
    mgr = SessionManager()
    sid = _uuid()
    state = await mgr.create_session(sid)
    assert mgr.get_session(sid) is state


@pytest.mark.anyio
async def test_get_session_nonexistent():
    mgr = SessionManager()
    assert mgr.get_session(_uuid()) is None


@pytest.mark.anyio
async def test_remove_session():
    mgr = SessionManager()
    sid = _uuid()
    await mgr.create_session(sid)
    await mgr.remove_session(sid)
    assert mgr.get_session(sid) is None


@pytest.mark.anyio
async def test_ttl_expiration():
    mgr = SessionManager()
    sid = _uuid()
    state = await mgr.create_session(sid)
    # Backdate started_at beyond TTL
    state.started_at = datetime.utcnow() - timedelta(minutes=SESSION_TTL_MINUTES + 1)
    assert mgr.get_session(sid) is None


@pytest.mark.anyio
async def test_max_sessions_eviction():
    mgr = SessionManager()
    # Create MAX_SESSIONS sessions
    sids = []
    for _ in range(MAX_SESSIONS):
        sid = _uuid()
        sids.append(sid)
        await mgr.create_session(sid)
    assert len(mgr._sessions) == MAX_SESSIONS

    # Creating one more should evict the oldest
    overflow_sid = _uuid()
    await mgr.create_session(overflow_sid)
    assert len(mgr._sessions) == MAX_SESSIONS
    assert mgr.get_session(overflow_sid) is not None
    # sids[0] should have been evicted (it was the oldest)
    assert mgr.get_session(sids[0]) is None
