"""Integration tests for SessionRepository against a real (SQLite) database."""

import uuid

import pytest

from app.services.persistence.session_repo import SessionRepository


@pytest.fixture
async def repo(db_session):
    return SessionRepository(db_session)


@pytest.fixture
def session_id():
    return uuid.uuid4()


@pytest.fixture
def user_id():
    return uuid.uuid4()


# ---------------------------------------------------------------------------
# create / get
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_create_session(repo, session_id, user_id):
    s = await repo.create_session(session_id=session_id, user_id=user_id)
    assert s.id == session_id
    assert s.user_id == user_id
    assert s.interview_type == "behavioral"


@pytest.mark.anyio
async def test_get_session(repo, session_id):
    await repo.create_session(session_id=session_id)
    fetched = await repo.get_session(session_id)
    assert fetched is not None
    assert fetched.id == session_id


@pytest.mark.anyio
async def test_get_session_not_found(repo):
    assert await repo.get_session(uuid.uuid4()) is None


# ---------------------------------------------------------------------------
# update phase / end session
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_update_session_phase(repo, session_id):
    await repo.create_session(session_id=session_id)
    await repo.update_session_phase(session_id, "main_questions", questions_asked=3)
    s = await repo.get_session(session_id)
    assert s.phase == "main_questions"
    assert s.questions_asked == 3


@pytest.mark.anyio
async def test_end_session(repo, session_id):
    await repo.create_session(session_id=session_id)
    await repo.end_session(session_id)
    s = await repo.get_session(session_id)
    assert s.ended_at is not None


# ---------------------------------------------------------------------------
# Transcripts
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_add_transcript(repo, session_id):
    await repo.create_session(session_id=session_id)
    t = await repo.add_transcript(session_id, "candidate", "Hello", 1)
    assert t.role == "candidate"
    assert t.content == "Hello"
    assert t.sequence == 1


# ---------------------------------------------------------------------------
# Evaluations
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_add_evaluation(repo, session_id):
    await repo.create_session(session_id=session_id)
    e = await repo.add_evaluation(session_id, round=1, score=85.0, passed=True, feedback="Good")
    assert e.score == 85.0
    assert e.passed is True


# ---------------------------------------------------------------------------
# Code submissions
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_add_code_submission(repo, session_id):
    await repo.create_session(session_id=session_id)
    cs = await repo.add_code_submission(
        session_id=session_id,
        problem_id="two-sum",
        code="def solve(): pass",
        language="python",
        correct=True,
        score=90.0,
    )
    assert cs.problem_id == "two-sum"
    assert cs.correct is True


# ---------------------------------------------------------------------------
# Queries
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_get_session_with_transcripts(repo, session_id):
    await repo.create_session(session_id=session_id)
    await repo.add_transcript(session_id, "candidate", "Hi", 1)
    await repo.add_transcript(session_id, "interviewer", "Hello", 2)
    s = await repo.get_session_with_transcripts(session_id)
    assert s is not None
    assert len(s.transcripts) == 2


@pytest.mark.anyio
async def test_get_user_sessions_ordering(repo, user_id):
    for _i in range(3):
        await repo.create_session(session_id=uuid.uuid4(), user_id=user_id)
    sessions = await repo.get_user_sessions(user_id)
    assert len(sessions) == 3


@pytest.mark.anyio
async def test_get_user_session_count(repo, user_id):
    for _i in range(4):
        await repo.create_session(session_id=uuid.uuid4(), user_id=user_id)
    count = await repo.get_user_session_count(user_id)
    assert count == 4
