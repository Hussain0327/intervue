"""Integration tests for /sessions REST endpoints."""

import uuid

import pytest

from app.core.security import create_access_token
from app.models.interview_session import InterviewSession
from app.models.user import User


async def _create_user_and_token(db_session):
    """Create a user directly in DB and return (user, token, headers)."""
    from app.core.security import hash_password

    user = User(
        email=f"{uuid.uuid4().hex[:8]}@test.com",
        hashed_password=hash_password("password123"),
        full_name="Test User",
    )
    db_session.add(user)
    await db_session.flush()
    token = create_access_token(str(user.id), user.email)
    return user, token, {"Authorization": f"Bearer {token}"}


async def _seed_sessions(db_session, user_id, count=3):
    """Create `count` interview sessions for a user."""
    sessions = []
    for _ in range(count):
        s = InterviewSession(
            id=uuid.uuid4(),
            user_id=user_id,
            interview_type="behavioral",
            interview_mode="full",
            difficulty="medium",
            phase="introduction",
        )
        db_session.add(s)
        sessions.append(s)
    await db_session.flush()
    return sessions


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_list_sessions_empty(app_client, db_engine):
    """User with no sessions should get empty list."""
    from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

    factory = async_sessionmaker(db_engine, class_=AsyncSession, expire_on_commit=False)
    async with factory() as session:
        user, token, headers = await _create_user_and_token(session)
        await session.commit()

    r = await app_client.get("/sessions/", headers=headers)
    assert r.status_code == 200
    body = r.json()
    assert body["sessions"] == []
    assert body["total"] == 0


@pytest.mark.anyio
async def test_list_sessions_pagination(app_client, db_engine):
    from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

    factory = async_sessionmaker(db_engine, class_=AsyncSession, expire_on_commit=False)
    async with factory() as session:
        user, token, headers = await _create_user_and_token(session)
        await _seed_sessions(session, user.id, count=25)
        await session.commit()

    r = await app_client.get("/sessions/?limit=10&offset=0", headers=headers)
    assert r.status_code == 200
    body = r.json()
    assert len(body["sessions"]) == 10
    assert body["total"] == 25


@pytest.mark.anyio
async def test_list_sessions_auth_required(app_client):
    r = await app_client.get("/sessions/")
    assert r.status_code in (401, 403)


@pytest.mark.anyio
async def test_session_detail(app_client, db_engine):
    from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

    factory = async_sessionmaker(db_engine, class_=AsyncSession, expire_on_commit=False)
    async with factory() as session:
        user, token, headers = await _create_user_and_token(session)
        sessions = await _seed_sessions(session, user.id, count=1)
        await session.commit()
        sid = sessions[0].id

    r = await app_client.get(f"/sessions/{sid}", headers=headers)
    assert r.status_code == 200
    body = r.json()
    assert body["id"] == str(sid)
    assert "transcripts" in body


@pytest.mark.anyio
async def test_session_detail_not_found(app_client, db_engine):
    from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

    factory = async_sessionmaker(db_engine, class_=AsyncSession, expire_on_commit=False)
    async with factory() as session:
        user, token, headers = await _create_user_and_token(session)
        await session.commit()

    fake_id = uuid.uuid4()
    r = await app_client.get(f"/sessions/{fake_id}", headers=headers)
    assert r.status_code == 404


@pytest.mark.anyio
async def test_session_detail_forbidden(app_client, db_engine):
    """User cannot access another user's session."""
    from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

    factory = async_sessionmaker(db_engine, class_=AsyncSession, expire_on_commit=False)
    async with factory() as session:
        user1, _, _ = await _create_user_and_token(session)
        user2, _, headers2 = await _create_user_and_token(session)
        sessions = await _seed_sessions(session, user1.id, count=1)
        await session.commit()
        sid = sessions[0].id

    r = await app_client.get(f"/sessions/{sid}", headers=headers2)
    assert r.status_code == 403


@pytest.mark.anyio
async def test_session_detail_anonymous_session(app_client, db_engine):
    """Sessions with null user_id can be accessed by authenticated users."""
    from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

    factory = async_sessionmaker(db_engine, class_=AsyncSession, expire_on_commit=False)
    async with factory() as session:
        user, token, headers = await _create_user_and_token(session)
        anon = InterviewSession(
            id=uuid.uuid4(),
            user_id=None,
            interview_type="behavioral",
            interview_mode="full",
            difficulty="medium",
            phase="introduction",
        )
        session.add(anon)
        await session.commit()
        sid = anon.id

    r = await app_client.get(f"/sessions/{sid}", headers=headers)
    # user_id is None, so ownership check passes (no user_id means public)
    assert r.status_code == 200
