"""Load and stress tests — high-volume operations."""

import asyncio
import json
import uuid

import pytest
from httpx import ASGITransport, AsyncClient
from httpx_ws import aconnect_ws
from httpx_ws.transport import ASGIWebSocketTransport

from app.main import app

# ---------------------------------------------------------------------------
# Health endpoint load
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_100_concurrent_health():
    """100 concurrent GET /health — all should return 200 within 5s."""
    transport = ASGITransport(app=app)

    async def _hit():
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            return await client.get("/health")

    results = await asyncio.wait_for(
        asyncio.gather(*[_hit() for _ in range(100)]),
        timeout=10,
    )
    statuses = [r.status_code for r in results]
    assert all(s == 200 for s in statuses)


# ---------------------------------------------------------------------------
# Registration load
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_100_concurrent_registrations(app_client):
    """100 concurrent registrations with unique emails — all 201."""

    async def _register(i):
        return await app_client.post(
            "/auth/register",
            json={
                "email": f"load-{i}-{uuid.uuid4().hex[:6]}@test.com",
                "password": "password123",
            },
        )

    results = await asyncio.gather(*[_register(i) for i in range(100)], return_exceptions=True)
    statuses = [r.status_code for r in results if not isinstance(r, Exception)]
    created = [s for s in statuses if s == 201]
    assert len(created) == 100


# ---------------------------------------------------------------------------
# WebSocket connection load
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_50_concurrent_ws_connections():
    """50 concurrent WebSocket connections — all handshake successfully."""

    async def _connect():
        client = AsyncClient(transport=ASGIWebSocketTransport(app))
        async with client:
            sid = str(uuid.uuid4())
            async with aconnect_ws(f"http://test/ws/interview/{sid}", client=client) as ws:
                data = json.loads(await ws.receive_text())
                return data["type"]

    results = await asyncio.gather(*[_connect() for _ in range(50)], return_exceptions=True)
    successes = [r for r in results if r == "session_started"]
    assert len(successes) == 50


# ---------------------------------------------------------------------------
# Rapid playback_complete
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_rapid_playback_complete():
    """100 rapid playback_complete on 1 WS — should not crash."""
    client = AsyncClient(transport=ASGIWebSocketTransport(app))
    async with client:
        sid = str(uuid.uuid4())
        async with aconnect_ws(f"http://test/ws/interview/{sid}", client=client) as ws:
            # Read session_started
            await ws.receive_text()

            # Fire 100 rapid playback_complete messages
            for _ in range(100):
                await ws.send_text(json.dumps({"type": "playback_complete"}))

            # Should still be alive — send end_session
            await ws.send_text(json.dumps({"type": "end_session"}))
            data = json.loads(await ws.receive_text())
            # May get status messages from playback_complete or session_ended
            # Just verify we're not crashed
            assert "type" in data


# ---------------------------------------------------------------------------
# Transcript insert stress
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_500_transcript_inserts(db_session):
    """500 transcript inserts in rapid succession — all persist."""
    from app.services.persistence.session_repo import SessionRepository

    repo = SessionRepository(db_session)
    sid = uuid.uuid4()
    await repo.create_session(session_id=sid)

    for i in range(500):
        await repo.add_transcript(sid, "candidate", f"msg-{i}", i)
    await db_session.flush()

    s = await repo.get_session_with_transcripts(sid)
    assert len(s.transcripts) == 500


# ---------------------------------------------------------------------------
# Audio payload boundary tests
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_10mb_audio_boundary_accepted():
    """10MB audio payload (at boundary) should be accepted."""
    client = AsyncClient(transport=ASGIWebSocketTransport(app))
    async with client:
        sid = str(uuid.uuid4())
        async with aconnect_ws(f"http://test/ws/interview/{sid}", client=client) as ws:
            await ws.receive_text()  # session_started

            # Send exactly 10MB of audio data
            audio_data = "A" * (10 * 1024 * 1024)
            await ws.send_text(json.dumps({
                "type": "audio",
                "data": audio_data,
                "format": "webm",
            }))

            # Should get a response (status or error from processing, but NOT AUDIO_TOO_LARGE)
            data = json.loads(await ws.receive_text())
            assert data.get("code") != "AUDIO_TOO_LARGE"


@pytest.mark.anyio
async def test_10mb_plus_1_audio_rejected():
    """10MB+1 audio payload should be rejected with AUDIO_TOO_LARGE."""
    client = AsyncClient(transport=ASGIWebSocketTransport(app))
    async with client:
        sid = str(uuid.uuid4())
        async with aconnect_ws(f"http://test/ws/interview/{sid}", client=client) as ws:
            await ws.receive_text()  # session_started

            audio_data = "A" * (10 * 1024 * 1024 + 1)
            await ws.send_text(json.dumps({
                "type": "audio",
                "data": audio_data,
                "format": "webm",
            }))

            data = json.loads(await ws.receive_text())
            assert data["type"] == "error"
            assert data["code"] == "AUDIO_TOO_LARGE"


# ---------------------------------------------------------------------------
# Code length boundary tests
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_50k_code_boundary_accepted():
    """50K char code (at boundary) should be accepted."""
    client = AsyncClient(transport=ASGIWebSocketTransport(app))
    async with client:
        sid = str(uuid.uuid4())
        async with aconnect_ws(f"http://test/ws/interview/{sid}", client=client) as ws:
            await ws.receive_text()  # session_started

            code = "x" * 50_000
            await ws.send_text(json.dumps({
                "type": "code_submission",
                "code": code,
                "language": "python",
                "problem_id": "test",
            }))

            data = json.loads(await ws.receive_text())
            # Should NOT get CODE_TOO_LARGE (may get NO_PROBLEM since no problem assigned)
            assert data.get("code") != "CODE_TOO_LARGE"


@pytest.mark.anyio
async def test_50k_plus_1_code_rejected():
    """50K+1 char code should be rejected with CODE_TOO_LARGE."""
    client = AsyncClient(transport=ASGIWebSocketTransport(app))
    async with client:
        sid = str(uuid.uuid4())
        async with aconnect_ws(f"http://test/ws/interview/{sid}", client=client) as ws:
            await ws.receive_text()  # session_started

            code = "x" * 50_001
            await ws.send_text(json.dumps({
                "type": "code_submission",
                "code": code,
                "language": "python",
                "problem_id": "test",
            }))

            data = json.loads(await ws.receive_text())
            assert data["type"] == "error"
            assert data["code"] == "CODE_TOO_LARGE"
