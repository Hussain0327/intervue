"""Integration tests for /dashboard analytics endpoints."""

import uuid

import pytest

from app.core.security import create_access_token, hash_password
from app.models.interview_session import InterviewSession
from app.models.user import User


async def _create_user_and_headers(db_session):
    user = User(
        email=f"{uuid.uuid4().hex[:8]}@dash.com",
        hashed_password=hash_password("password123"),
        full_name="Dashboard Tester",
    )
    db_session.add(user)
    await db_session.flush()
    token = create_access_token(str(user.id), user.email)
    return user, {"Authorization": f"Bearer {token}"}


async def _seed_data(db_session, user_id, n_sessions=3, n_per=1, base_score=80.0):
    """Seed sessions and scoring records for a user."""
    from app.models.evaluation import Evaluation

    for i in range(n_sessions):
        sid = uuid.uuid4()
        s = InterviewSession(
            id=sid,
            user_id=user_id,
            interview_type="behavioral",
            interview_mode="full",
            difficulty="medium",
            phase="completed",
        )
        db_session.add(s)
        await db_session.flush()
        for j in range(n_per):
            record = Evaluation(
                session_id=sid,
                round=j + 1,
                score=base_score + i * 5,
                passed=(base_score + i * 5) >= 70,
                feedback=f"Feedback {i}-{j}",
            )
            db_session.add(record)
    await db_session.flush()


# ---------------------------------------------------------------------------
# /dashboard/summary
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_summary_no_data(app_client, db_engine):
    from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

    factory = async_sessionmaker(db_engine, class_=AsyncSession, expire_on_commit=False)
    async with factory() as session:
        user, headers = await _create_user_and_headers(session)
        await session.commit()

    r = await app_client.get("/dashboard/summary", headers=headers)
    assert r.status_code == 200
    body = r.json()
    assert body["total_sessions"] == 0
    assert body["total_evaluations"] == 0


@pytest.mark.anyio
async def test_summary_with_data(app_client, db_engine):
    from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

    factory = async_sessionmaker(db_engine, class_=AsyncSession, expire_on_commit=False)
    async with factory() as session:
        user, headers = await _create_user_and_headers(session)
        await _seed_data(session, user.id, n_sessions=3, n_per=1, base_score=80.0)
        await session.commit()

    r = await app_client.get("/dashboard/summary", headers=headers)
    assert r.status_code == 200
    body = r.json()
    assert body["total_sessions"] == 3
    assert body["total_evaluations"] == 3
    assert body["avg_score"] is not None
    assert body["pass_rate"] == 100.0


@pytest.mark.anyio
async def test_summary_auth_required(app_client):
    r = await app_client.get("/dashboard/summary")
    assert r.status_code in (401, 403)


# ---------------------------------------------------------------------------
# /dashboard/history
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_history_ordering(app_client, db_engine):
    from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

    factory = async_sessionmaker(db_engine, class_=AsyncSession, expire_on_commit=False)
    async with factory() as session:
        user, headers = await _create_user_and_headers(session)
        await _seed_data(session, user.id, n_sessions=5, n_per=1)
        await session.commit()

    r = await app_client.get("/dashboard/history", headers=headers)
    assert r.status_code == 200
    body = r.json()
    assert body["total"] == 5
    assert len(body["sessions"]) == 5


@pytest.mark.anyio
async def test_history_includes_scoring(app_client, db_engine):
    from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

    factory = async_sessionmaker(db_engine, class_=AsyncSession, expire_on_commit=False)
    async with factory() as session:
        user, headers = await _create_user_and_headers(session)
        await _seed_data(session, user.id, n_sessions=1, n_per=1, base_score=90.0)
        await session.commit()

    r = await app_client.get("/dashboard/history", headers=headers)
    body = r.json()
    assert body["sessions"][0]["score"] is not None


# ---------------------------------------------------------------------------
# /dashboard/score-trend
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_score_trend(app_client, db_engine):
    from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

    factory = async_sessionmaker(db_engine, class_=AsyncSession, expire_on_commit=False)
    async with factory() as session:
        user, headers = await _create_user_and_headers(session)
        await _seed_data(session, user.id, n_sessions=3, n_per=1)
        await session.commit()

    r = await app_client.get("/dashboard/score-trend", headers=headers)
    assert r.status_code == 200
    items = r.json()
    assert len(items) == 3


# ---------------------------------------------------------------------------
# /dashboard/strengths
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_strengths(app_client, db_engine):
    from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

    factory = async_sessionmaker(db_engine, class_=AsyncSession, expire_on_commit=False)
    async with factory() as session:
        user, headers = await _create_user_and_headers(session)
        await _seed_data(session, user.id, n_sessions=2, n_per=2, base_score=75.0)
        await session.commit()

    r = await app_client.get("/dashboard/strengths", headers=headers)
    assert r.status_code == 200
    items = r.json()
    assert len(items) >= 1


@pytest.mark.anyio
async def test_strengths_auth_required(app_client):
    r = await app_client.get("/dashboard/strengths")
    assert r.status_code in (401, 403)
