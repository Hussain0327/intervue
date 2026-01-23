import base64
import json
import pytest
from httpx import AsyncClient, ASGITransport
from httpx_ws import aconnect_ws
from httpx_ws.transport import ASGIWebSocketTransport

from app.main import app


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.mark.anyio
async def test_health_endpoint():
    """Test the health check endpoint."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/health")
        assert response.status_code == 200
        assert response.json() == {"status": "healthy"}


@pytest.mark.anyio
async def test_websocket_connection():
    """Test WebSocket connection and initial handshake."""
    async with aconnect_ws(
        "http://test/ws/interview/test-session-123",
        transport=ASGIWebSocketTransport(app),
    ) as ws:
        # Should receive session_started message
        data = await ws.receive_text()
        message = json.loads(data)
        assert message["type"] == "session_started"
        assert "session_id" in message

        # Should receive initial interviewer transcript
        data = await ws.receive_text()
        message = json.loads(data)
        # Could be status or transcript depending on timing
        assert message["type"] in ["status", "transcript"]


@pytest.mark.anyio
async def test_websocket_protocol_messages():
    """Test WebSocket message protocol."""
    async with aconnect_ws(
        "http://test/ws/interview/test-session-456",
        transport=ASGIWebSocketTransport(app),
    ) as ws:
        # Consume initial messages
        messages_received = []
        for _ in range(5):  # Expect a few initial messages
            try:
                data = await ws.receive_text()
                messages_received.append(json.loads(data))
            except Exception:
                break

        # Verify we got expected message types
        message_types = [m["type"] for m in messages_received]
        assert "session_started" in message_types

        # Send playback_complete
        await ws.send_text(json.dumps({"type": "playback_complete"}))

        # Should receive status ready
        data = await ws.receive_text()
        message = json.loads(data)
        assert message["type"] == "status"

        # Send end_session
        await ws.send_text(json.dumps({"type": "end_session"}))

        # Should receive session_ended
        data = await ws.receive_text()
        message = json.loads(data)
        assert message["type"] == "session_ended"


@pytest.mark.anyio
async def test_websocket_error_handling():
    """Test WebSocket error handling for invalid messages."""
    async with aconnect_ws(
        "http://test/ws/interview/test-session-789",
        transport=ASGIWebSocketTransport(app),
    ) as ws:
        # Consume initial messages
        for _ in range(5):
            try:
                await ws.receive_text()
            except Exception:
                break

        # Send invalid JSON
        await ws.send_text("not-valid-json")

        # Connection should handle gracefully (may close or send error)
        # This tests that the server doesn't crash


# Integration test that requires actual API keys
@pytest.mark.skip(reason="Requires actual OpenAI/Anthropic API keys")
@pytest.mark.anyio
async def test_full_conversation_turn():
    """Test a full conversation turn with actual API calls."""
    # This would need actual API keys and audio data
    # Create a simple audio test file (silence in WebM format)
    silence_webm = base64.b64encode(b"\x00" * 1000).decode()

    async with aconnect_ws(
        "http://test/ws/interview/test-full-turn",
        transport=ASGIWebSocketTransport(app),
    ) as ws:
        # Wait for initial setup
        for _ in range(5):
            await ws.receive_text()

        # Send audio
        await ws.send_text(
            json.dumps({"type": "audio", "data": silence_webm, "format": "webm"})
        )

        # Should receive processing status, transcript, and audio
        responses = []
        for _ in range(10):
            try:
                data = await ws.receive_text()
                responses.append(json.loads(data))
            except Exception:
                break

        # Verify we got expected responses
        types_received = [r["type"] for r in responses]
        assert "status" in types_received
        # In a real test with API keys, we'd also check for transcript and audio
