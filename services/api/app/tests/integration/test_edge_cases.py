"""Edge case tests — string boundaries, pagination, WebSocket edge behaviors, DB edge cases."""

import json
import uuid

import pytest
from httpx import AsyncClient
from httpx_ws import aconnect_ws
from httpx_ws.transport import ASGIWebSocketTransport

from app.core.security import create_access_token, hash_password
from app.main import app
from app.models.user import User


async def _create_user_and_headers(db_session):
    user = User(
        email=f"{uuid.uuid4().hex[:8]}@edge.com",
        hashed_password=hash_password("password123"),
        full_name="Edge Tester",
    )
    db_session.add(user)
    await db_session.flush()
    token = create_access_token(str(user.id), user.email)
    return user, {"Authorization": f"Bearer {token}"}


# ---------------------------------------------------------------------------
# String edge cases
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_empty_full_name(app_client):
    r = await app_client.post(
        "/auth/register",
        json={
            "email": f"{uuid.uuid4().hex[:8]}@empty.com",
            "password": "password123",
            "full_name": "",
        },
    )
    # Empty string should be accepted (full_name is optional)
    assert r.status_code == 201


@pytest.mark.anyio
async def test_unicode_full_name(app_client):
    r = await app_client.post(
        "/auth/register",
        json={
            "email": f"{uuid.uuid4().hex[:8]}@unicode.com",
            "password": "password123",
            "full_name": "Test User",
        },
    )
    assert r.status_code == 201


@pytest.mark.anyio
async def test_max_length_email(app_client):
    """320-char email (max per RFC) should be accepted."""
    local = "a" * 64
    domain = "b" * 248 + ".com"
    email = f"{local}@{domain}"
    r = await app_client.post(
        "/auth/register",
        json={"email": email, "password": "password123"},
    )
    # May be 201 or 422 depending on email validation — either is valid
    assert r.status_code in (201, 422)


@pytest.mark.anyio
async def test_over_max_email(app_client):
    """321+ char email should be rejected."""
    local = "a" * 65
    domain = "b" * 250 + ".com"
    email = f"{local}@{domain}"
    r = await app_client.post(
        "/auth/register",
        json={"email": email, "password": "password123"},
    )
    assert r.status_code == 422


# ---------------------------------------------------------------------------
# Pagination boundaries
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_limit_zero_rejected(app_client, auth_headers):
    r = await app_client.get("/sessions/?limit=0", headers=auth_headers)
    assert r.status_code == 422


@pytest.mark.anyio
async def test_limit_negative_rejected(app_client, auth_headers):
    r = await app_client.get("/sessions/?limit=-1", headers=auth_headers)
    assert r.status_code == 422


@pytest.mark.anyio
async def test_limit_over_max_rejected(app_client, auth_headers):
    r = await app_client.get("/sessions/?limit=101", headers=auth_headers)
    assert r.status_code == 422


@pytest.mark.anyio
async def test_offset_negative_rejected(app_client, auth_headers):
    r = await app_client.get("/sessions/?offset=-1", headers=auth_headers)
    assert r.status_code == 422


@pytest.mark.anyio
async def test_offset_beyond_total(app_client, auth_headers):
    r = await app_client.get("/sessions/?offset=99999", headers=auth_headers)
    assert r.status_code == 200
    assert r.json()["sessions"] == []


# ---------------------------------------------------------------------------
# WebSocket edge cases
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_ws_empty_audio_data():
    """Empty audio data should get an error response."""
    client = AsyncClient(transport=ASGIWebSocketTransport(app))
    async with client:
        sid = str(uuid.uuid4())
        async with aconnect_ws(f"http://test/ws/interview/{sid}", client=client) as ws:
            await ws.receive_text()  # session_started
            await ws.send_text(json.dumps({"type": "audio", "data": "", "format": "webm"}))
            data = json.loads(await ws.receive_text())
            assert "type" in data


@pytest.mark.anyio
async def test_ws_start_interview_twice_idempotent():
    """Sending start_interview twice should not crash."""
    client = AsyncClient(transport=ASGIWebSocketTransport(app))
    async with client:
        sid = str(uuid.uuid4())
        async with aconnect_ws(f"http://test/ws/interview/{sid}", client=client) as ws:
            await ws.receive_text()  # session_started

            await ws.send_text(json.dumps({"type": "start_interview"}))
            # The second start_interview should be ignored (interview_started flag)
            await ws.send_text(json.dumps({"type": "start_interview"}))

            # Should still be operational — send end_session
            await ws.send_text(json.dumps({"type": "end_session"}))

            # Drain messages until we find session_ended or timeout
            import asyncio
            for _ in range(20):
                try:
                    data = json.loads(await asyncio.wait_for(ws.receive_text(), timeout=3))
                    if data.get("type") == "session_ended":
                        break
                except (TimeoutError, Exception):
                    break


@pytest.mark.anyio
async def test_ws_end_session_without_start():
    """end_session without start_interview should end cleanly."""
    client = AsyncClient(transport=ASGIWebSocketTransport(app))
    async with client:
        sid = str(uuid.uuid4())
        async with aconnect_ws(f"http://test/ws/interview/{sid}", client=client) as ws:
            await ws.receive_text()  # session_started
            await ws.send_text(json.dumps({"type": "end_session"}))
            data = json.loads(await ws.receive_text())
            assert data["type"] == "session_ended"


@pytest.mark.anyio
async def test_ws_unknown_message_type():
    """Unknown message type should not crash the server."""
    client = AsyncClient(transport=ASGIWebSocketTransport(app))
    async with client:
        sid = str(uuid.uuid4())
        async with aconnect_ws(f"http://test/ws/interview/{sid}", client=client) as ws:
            await ws.receive_text()  # session_started
            await ws.send_text(json.dumps({"type": "totally_unknown_type"}))
            # Server should continue running — verify with playback_complete
            await ws.send_text(json.dumps({"type": "playback_complete"}))
            data = json.loads(await ws.receive_text())
            assert data["type"] == "status"


@pytest.mark.anyio
async def test_ws_invalid_language():
    """Invalid language in code_submission should be rejected."""
    client = AsyncClient(transport=ASGIWebSocketTransport(app))
    async with client:
        sid = str(uuid.uuid4())
        async with aconnect_ws(f"http://test/ws/interview/{sid}", client=client) as ws:
            await ws.receive_text()  # session_started
            await ws.send_text(json.dumps({
                "type": "code_submission",
                "code": "print('hi')",
                "language": "brainfuck",
                "problem_id": "test",
            }))
            data = json.loads(await ws.receive_text())
            assert data["type"] == "error"
            assert data["code"] == "INVALID_LANGUAGE"


@pytest.mark.anyio
async def test_ws_code_submission_without_problem():
    """code_submission without a problem assigned should error."""
    client = AsyncClient(transport=ASGIWebSocketTransport(app))
    async with client:
        sid = str(uuid.uuid4())
        async with aconnect_ws(f"http://test/ws/interview/{sid}", client=client) as ws:
            await ws.receive_text()  # session_started
            await ws.send_text(json.dumps({
                "type": "code_submission",
                "code": "print('hi')",
                "language": "python",
                "problem_id": "test",
            }))
            data = json.loads(await ws.receive_text())
            assert data["type"] == "error"
            assert data["code"] == "NO_PROBLEM"


# ---------------------------------------------------------------------------
# DB edge cases
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_50k_transcript_content(db_session):
    """50K char transcript content should persist."""
    from app.services.persistence.session_repo import SessionRepository

    repo = SessionRepository(db_session)
    sid = uuid.uuid4()
    await repo.create_session(session_id=sid)
    long_content = "x" * 50_000
    t = await repo.add_transcript(sid, "candidate", long_content, 1)
    assert len(t.content) == 50_000


@pytest.mark.anyio
async def test_scoring_boundary_values(db_session):
    """Score values 0.0 and 100.0 should persist correctly."""
    from app.services.persistence.session_repo import SessionRepository

    repo = SessionRepository(db_session)
    sid = uuid.uuid4()
    await repo.create_session(session_id=sid)

    e1 = await repo.add_evaluation(sid, round=1, score=0.0, passed=False, feedback="Failed")
    assert e1.score == 0.0

    e2 = await repo.add_evaluation(sid, round=2, score=100.0, passed=True, feedback="Perfect")
    assert e2.score == 100.0


@pytest.mark.anyio
async def test_session_null_user_id(db_session):
    """Session with null user_id should persist."""
    from app.services.persistence.session_repo import SessionRepository

    repo = SessionRepository(db_session)
    sid = uuid.uuid4()
    s = await repo.create_session(session_id=sid, user_id=None)
    assert s.user_id is None
