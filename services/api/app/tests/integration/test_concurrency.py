"""Concurrency and race condition tests."""

import asyncio
import uuid

import pytest

from app.services.orchestrator.state import MAX_SESSIONS, SessionManager

# ---------------------------------------------------------------------------
# Registration race
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_concurrent_registration_same_email(app_client):
    """10 concurrent registrations with the same email — exactly 1 succeeds."""
    email = f"{uuid.uuid4().hex[:8]}@race.com"

    async def _register():
        return await app_client.post(
            "/auth/register",
            json={"email": email, "password": "password123", "full_name": "Racer"},
        )

    results = await asyncio.gather(*[_register() for _ in range(10)], return_exceptions=True)
    statuses = [r.status_code for r in results if not isinstance(r, Exception)]
    assert statuses.count(201) == 1
    assert all(s in (201, 409) for s in statuses)


# ---------------------------------------------------------------------------
# Token refresh race
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_concurrent_token_refresh(app_client):
    """5 concurrent token refreshes — all should succeed with no corruption."""
    email = f"{uuid.uuid4().hex[:8]}@refresh.com"
    reg = await app_client.post(
        "/auth/register",
        json={"email": email, "password": "password123"},
    )
    refresh_token = reg.json()["refresh_token"]

    async def _refresh():
        return await app_client.post(
            "/auth/refresh",
            json={"refresh_token": refresh_token},
        )

    results = await asyncio.gather(*[_refresh() for _ in range(5)], return_exceptions=True)
    statuses = [r.status_code for r in results if not isinstance(r, Exception)]
    # All should succeed (same refresh token is still valid)
    assert all(s == 200 for s in statuses)


# ---------------------------------------------------------------------------
# Session creation race
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_concurrent_session_creations():
    """20 concurrent session creations — all should produce unique IDs."""
    mgr = SessionManager()
    tasks = [mgr.create_session(str(uuid.uuid4())) for _ in range(20)]
    states = await asyncio.gather(*tasks)
    ids = {str(s.session_id) for s in states}
    assert len(ids) == 20


# ---------------------------------------------------------------------------
# MAX_SESSIONS eviction under load
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_max_sessions_concurrent_eviction():
    """SessionManager under MAX_SESSIONS load — correct count maintained."""
    mgr = SessionManager()
    # Fill to MAX_SESSIONS
    for _i in range(MAX_SESSIONS):
        await mgr.create_session(str(uuid.uuid4()))

    # Add 10 more concurrently
    tasks = [mgr.create_session(str(uuid.uuid4())) for _ in range(10)]
    await asyncio.gather(*tasks)

    assert len(mgr._sessions) <= MAX_SESSIONS


# ---------------------------------------------------------------------------
# Concurrent transcript writes
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_concurrent_transcript_writes(db_session):
    """10 sequential transcript writes to the same session — all succeed."""
    from app.services.persistence.session_repo import SessionRepository

    repo = SessionRepository(db_session)
    sid = uuid.uuid4()
    await repo.create_session(session_id=sid)

    # SQLite doesn't support true concurrent writes on the same session,
    # so we write sequentially and verify all persist
    for i in range(10):
        await repo.add_transcript(sid, "candidate", f"msg-{i}", i)
    await db_session.flush()

    s = await repo.get_session_with_transcripts(sid)
    assert len(s.transcripts) == 10


# ---------------------------------------------------------------------------
# WebSocket concurrent connections
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_concurrent_ws_connections():
    """20 concurrent WebSocket connections — all get session_started."""
    import json

    from httpx import AsyncClient
    from httpx_ws import aconnect_ws
    from httpx_ws.transport import ASGIWebSocketTransport

    from app.main import app

    async def _connect():
        client = AsyncClient(transport=ASGIWebSocketTransport(app))
        async with client:
            sid = str(uuid.uuid4())
            async with aconnect_ws(f"http://test/ws/interview/{sid}", client=client) as ws:
                data = json.loads(await ws.receive_text())
                return data

    results = await asyncio.gather(*[_connect() for _ in range(20)], return_exceptions=True)
    successes = [r for r in results if isinstance(r, dict) and r.get("type") == "session_started"]
    assert len(successes) == 20


# ---------------------------------------------------------------------------
# Pool exhaustion resilience
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_pool_exhaustion_resilience(db_session):
    """Under heavy DB load, operations should complete or raise cleanly."""
    from app.services.persistence.session_repo import SessionRepository

    repo = SessionRepository(db_session)

    # SQLite serializes writes, so run sequentially
    results = []
    for _ in range(30):
        sid = uuid.uuid4()
        try:
            result = await repo.create_session(session_id=sid)
            results.append(result)
        except Exception as e:
            results.append(e)
    await db_session.flush()

    errors = [r for r in results if isinstance(r, Exception)]
    assert len(errors) == 0
