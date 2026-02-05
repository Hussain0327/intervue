import asyncio
import base64
import json
import uuid

import pytest
from httpx import ASGITransport, AsyncClient
from httpx_ws import aconnect_ws
from httpx_ws.transport import ASGIWebSocketTransport

from app.main import app

# Timeout for receiving messages that depend on external AI services
_ORCHESTRATOR_TIMEOUT = 5  # seconds


@pytest.fixture
def anyio_backend():
    return "asyncio"


def _ws_url(session_id: str | None = None, token: str | None = None) -> str:
    """Build a WebSocket URL with optional session ID and token."""
    sid = session_id or str(uuid.uuid4())
    url = f"http://test/ws/interview/{sid}"
    if token is not None:
        url += f"?token={token}"
    return url


@pytest.fixture
def ws_client():
    """Provide an async HTTPX client configured for ASGI WebSocket testing."""
    return AsyncClient(transport=ASGIWebSocketTransport(app))


async def _recv(ws, timeout: float = _ORCHESTRATOR_TIMEOUT) -> dict:
    """Receive a JSON message with a timeout."""
    data = await asyncio.wait_for(ws.receive_text(), timeout=timeout)
    return json.loads(data)


async def _drain(ws, count: int = 5, timeout: float = _ORCHESTRATOR_TIMEOUT) -> list[dict]:
    """Receive up to *count* messages, stopping on timeout or error."""
    messages = []
    for _ in range(count):
        try:
            messages.append(await _recv(ws, timeout=timeout))
        except (TimeoutError, Exception):
            break
    return messages


# ---------------------------------------------------------------------------
# Health endpoint
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_health_endpoint():
    """Test the health check endpoint."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/health")
        assert response.status_code == 200
        assert response.json() == {"status": "healthy"}


# ---------------------------------------------------------------------------
# Auth: anonymous access (no token)
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_websocket_anonymous_connection(ws_client):
    """Anonymous connections (no token) should be accepted."""
    async with ws_client:
        async with aconnect_ws(_ws_url(), client=ws_client) as ws:
            message = await _recv(ws)
            assert message["type"] == "session_started"
            assert "session_id" in message


# ---------------------------------------------------------------------------
# Auth: invalid token rejected
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_websocket_invalid_token_rejected(ws_client):
    """An invalid JWT should be rejected with AUTH_FAILED."""
    async with ws_client:
        async with aconnect_ws(
            _ws_url(token="bogus.invalid.token"), client=ws_client
        ) as ws:
            message = await _recv(ws)
            assert message["type"] == "error"
            assert message["code"] == "AUTH_FAILED"


# ---------------------------------------------------------------------------
# Auth: empty token treated as anonymous
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_websocket_empty_token_is_anonymous(ws_client):
    """Explicitly passing an empty token should behave like anonymous."""
    async with ws_client:
        async with aconnect_ws(_ws_url(token=""), client=ws_client) as ws:
            message = await _recv(ws)
            assert message["type"] == "session_started"


# ---------------------------------------------------------------------------
# Invalid session ID
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_websocket_invalid_session_id(ws_client):
    """Non-UUID session IDs should be rejected."""
    async with ws_client:
        async with aconnect_ws(
            _ws_url(session_id="not-a-uuid"), client=ws_client
        ) as ws:
            message = await _recv(ws)
            assert message["type"] == "error"
            assert message["code"] == "INVALID_SESSION_ID"


# ---------------------------------------------------------------------------
# WebSocket connection + initial handshake (requires orchestrator / AI APIs)
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_websocket_connection(ws_client):
    """Test WebSocket connection and initial handshake.

    After session_started the orchestrator calls external AI APIs to produce
    the first interviewer turn.  If those APIs are unavailable we only verify
    the handshake and bail out gracefully.
    """
    async with ws_client:
        async with aconnect_ws(_ws_url(), client=ws_client) as ws:
            # Should always receive session_started
            message = await _recv(ws)
            assert message["type"] == "session_started"
            assert "session_id" in message

            # Second message depends on AI services — accept whatever arrives
            # within the timeout or skip gracefully.
            try:
                message = await _recv(ws)
                assert message["type"] in ["status", "transcript", "error"]
            except TimeoutError:
                pytest.skip("Orchestrator did not respond (no API keys?)")


# ---------------------------------------------------------------------------
# Protocol messages (requires orchestrator / AI APIs)
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_websocket_protocol_messages(ws_client):
    """Test WebSocket message protocol with the orchestrator."""
    async with ws_client:
        async with aconnect_ws(_ws_url(), client=ws_client) as ws:
            messages_received = await _drain(ws)

            message_types = [m["type"] for m in messages_received]
            assert "session_started" in message_types

            if len(messages_received) < 2:
                pytest.skip("Orchestrator did not respond (no API keys?)")

            # Send playback_complete
            await ws.send_text(json.dumps({"type": "playback_complete"}))

            try:
                message = await _recv(ws)
                assert message["type"] == "status"
            except TimeoutError:
                pytest.skip("No status response (no API keys?)")

            # Send end_session
            await ws.send_text(json.dumps({"type": "end_session"}))

            message = await _recv(ws)
            assert message["type"] == "session_ended"


# ---------------------------------------------------------------------------
# Error handling
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_websocket_error_handling(ws_client):
    """Test WebSocket error handling for invalid messages."""
    async with ws_client:
        async with aconnect_ws(_ws_url(), client=ws_client) as ws:
            # Drain whatever the orchestrator sends initially
            await _drain(ws, timeout=2)

            # Send invalid JSON — server should not crash
            await ws.send_text("not-valid-json")

            # Give the server a moment to process and confirm it stays up
            try:
                msg = await _recv(ws, timeout=2)
                # If we get anything back (error or otherwise), that's fine
                assert "type" in msg
            except TimeoutError:
                # No crash, just no response — acceptable
                pass


# ---------------------------------------------------------------------------
# Full conversation turn (requires API keys)
# ---------------------------------------------------------------------------


@pytest.mark.skip(reason="Requires actual OpenAI/Anthropic API keys")
@pytest.mark.anyio
async def test_full_conversation_turn(ws_client):
    """Test a full conversation turn with actual API calls."""
    silence_webm = base64.b64encode(b"\x00" * 1000).decode()

    async with ws_client:
        async with aconnect_ws(_ws_url(), client=ws_client) as ws:
            await _drain(ws)

            await ws.send_text(
                json.dumps({"type": "audio", "data": silence_webm, "format": "webm"})
            )

            responses = await _drain(ws, count=10)
            types_received = [r["type"] for r in responses]
            assert "status" in types_received


# ---------------------------------------------------------------------------
# Additional WebSocket tests
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_end_session_flow(ws_client):
    """end_session should return session_ended with total_turns."""
    async with ws_client:
        async with aconnect_ws(_ws_url(), client=ws_client) as ws:
            msg = await _recv(ws)
            assert msg["type"] == "session_started"

            await ws.send_text(json.dumps({"type": "end_session"}))
            msg = await _recv(ws)
            assert msg["type"] == "session_ended"
            assert "total_turns" in msg


@pytest.mark.anyio
async def test_start_interview_with_options(ws_client):
    """start_interview accepts role, round, and mode options."""
    async with ws_client:
        async with aconnect_ws(_ws_url(), client=ws_client) as ws:
            await _recv(ws)  # session_started
            await ws.send_text(json.dumps({
                "type": "start_interview",
                "role": "Software Engineer",
                "round": 2,
                "mode": "coding",
            }))
            # Should get some response (status/transcript/error depending on APIs)
            try:
                msg = await _recv(ws, timeout=3)
                assert "type" in msg
            except TimeoutError:
                pytest.skip("No API response")


@pytest.mark.anyio
async def test_audio_too_large_rejected(ws_client):
    """Audio data exceeding 10MB should be rejected."""
    async with ws_client:
        async with aconnect_ws(_ws_url(), client=ws_client) as ws:
            await _recv(ws)  # session_started
            large_audio = "A" * (10 * 1024 * 1024 + 1)
            await ws.send_text(json.dumps({
                "type": "audio",
                "data": large_audio,
                "format": "webm",
            }))
            msg = await _recv(ws)
            assert msg["type"] == "error"
            assert msg["code"] == "AUDIO_TOO_LARGE"


@pytest.mark.anyio
async def test_code_too_large_rejected(ws_client):
    """Code exceeding 50K chars should be rejected."""
    async with ws_client:
        async with aconnect_ws(_ws_url(), client=ws_client) as ws:
            await _recv(ws)  # session_started
            large_code = "x" * 50_001
            await ws.send_text(json.dumps({
                "type": "code_submission",
                "code": large_code,
                "language": "python",
                "problem_id": "test",
            }))
            msg = await _recv(ws)
            assert msg["type"] == "error"
            assert msg["code"] == "CODE_TOO_LARGE"


@pytest.mark.anyio
async def test_invalid_language_rejected(ws_client):
    """Unsupported language should be rejected."""
    async with ws_client:
        async with aconnect_ws(_ws_url(), client=ws_client) as ws:
            await _recv(ws)  # session_started
            await ws.send_text(json.dumps({
                "type": "code_submission",
                "code": "print('hi')",
                "language": "brainfuck",
                "problem_id": "test",
            }))
            msg = await _recv(ws)
            assert msg["type"] == "error"
            assert msg["code"] == "INVALID_LANGUAGE"


@pytest.mark.anyio
async def test_code_submission_without_problem(ws_client):
    """code_submission without a problem assigned should error."""
    async with ws_client:
        async with aconnect_ws(_ws_url(), client=ws_client) as ws:
            await _recv(ws)  # session_started
            await ws.send_text(json.dumps({
                "type": "code_submission",
                "code": "print('hi')",
                "language": "python",
                "problem_id": "test",
            }))
            msg = await _recv(ws)
            assert msg["type"] == "error"
            assert msg["code"] == "NO_PROBLEM"


@pytest.mark.anyio
async def test_malformed_json(ws_client):
    """Malformed JSON should not crash the server."""
    async with ws_client:
        async with aconnect_ws(_ws_url(), client=ws_client) as ws:
            await _recv(ws)  # session_started
            await ws.send_text("{invalid json!!!")
            # Server may or may not send a response — just verify it's still alive
            await ws.send_text(json.dumps({"type": "playback_complete"}))
            try:
                msg = await _recv(ws, timeout=2)
                assert "type" in msg
            except TimeoutError:
                pass


@pytest.mark.anyio
async def test_unknown_message_type(ws_client):
    """Unknown message types should be silently ignored."""
    async with ws_client:
        async with aconnect_ws(_ws_url(), client=ws_client) as ws:
            await _recv(ws)  # session_started
            await ws.send_text(json.dumps({"type": "nonexistent_type"}))
            # Verify server is still operational
            await ws.send_text(json.dumps({"type": "end_session"}))
            msg = await _recv(ws)
            assert msg["type"] == "session_ended"


@pytest.mark.anyio
async def test_resume_context_before_start(ws_client):
    """resume_context before start_interview should be accepted."""
    async with ws_client:
        async with aconnect_ws(_ws_url(), client=ws_client) as ws:
            await _recv(ws)  # session_started
            await ws.send_text(json.dumps({
                "type": "resume_context",
                "parsed_resume": {"raw_text": "Test resume content"},
            }))
            # Should not crash — verify by ending session
            await ws.send_text(json.dumps({"type": "end_session"}))
            msg = await _recv(ws)
            assert msg["type"] == "session_ended"


@pytest.mark.anyio
async def test_binary_message_handling(ws_client):
    """Binary messages should not crash the server."""
    async with ws_client:
        async with aconnect_ws(_ws_url(), client=ws_client) as ws:
            await _recv(ws)  # session_started
            # Send binary data
            await ws.send_bytes(b"\x00\x01\x02\x03")
            # Verify server is still running
            await ws.send_text(json.dumps({"type": "end_session"}))
            try:
                msg = await _recv(ws, timeout=3)
                assert "type" in msg
            except TimeoutError:
                pass
