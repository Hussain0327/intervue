import json
import logging
import uuid

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, WebSocketException, status
from sqlalchemy import select

from app.core.auth import verify_token
from app.core.database import AsyncSessionLocal
from app.models.session import InterviewSession
from app.models.user import User
from app.services.interview_engine import InterviewEngine

logger = logging.getLogger(__name__)

router = APIRouter()


class _ClientDisconnected(Exception):
    """Raised when a send to the client fails, indicating disconnect."""


async def _authenticate_ws(websocket: WebSocket) -> str | None:
    """Authenticate WebSocket via cookie."""
    session_token = websocket.cookies.get("session_token")
    if not session_token:
        return None
    return verify_token(session_token)


@router.websocket("/ws/interview/{session_id}")
async def interview_websocket(websocket: WebSocket, session_id: str):
    # Authenticate BEFORE accepting the connection
    user_id = await _authenticate_ws(websocket)
    if not user_id:
        raise WebSocketException(code=status.WS_1008_POLICY_VIOLATION)

    # Validate session_id format before accepting
    try:
        uuid.UUID(session_id)
    except ValueError:
        raise WebSocketException(code=status.WS_1008_POLICY_VIOLATION)

    await websocket.accept()

    # Create DB session for this connection
    async with AsyncSessionLocal() as db:
        # Verify user owns this session
        result = await db.execute(
            select(InterviewSession).where(
                InterviewSession.id == session_id,
                InterviewSession.user_id == uuid.UUID(user_id),
            )
        )
        session = result.scalar_one_or_none()
        if not session:
            await websocket.send_json({"type": "error", "message": "Session not found"})
            await websocket.close(code=4004)
            return

        # Create interview engine, pass already-loaded session
        engine = InterviewEngine(session_id, db)
        init_info = await engine.initialize(session)

        if not init_info:
            await websocket.send_json({"type": "error", "message": "Failed to initialize"})
            await websocket.close(code=4005)
            return

        # Helper functions for sending data — raise on disconnect
        async def send_json(data: dict):
            try:
                await websocket.send_json(data)
            except Exception:
                raise _ClientDisconnected()

        async def send_bytes(data: bytes):
            try:
                await websocket.send_bytes(data)
            except Exception:
                raise _ClientDisconnected()

        await send_json({"type": "ready", **init_info})

        try:
            while True:
                message = await websocket.receive()

                if "text" in message:
                    try:
                        data = json.loads(message["text"])
                    except json.JSONDecodeError:
                        await send_json({"type": "error", "message": "Invalid JSON"})
                        continue

                    msg_type = data.get("type")

                    if msg_type == "start_interview":
                        await engine.start_interview(send_json, send_bytes)

                    elif msg_type == "speech_end":
                        await engine.handle_speech_end(send_json, send_bytes)

                    elif msg_type == "skip_question":
                        await engine.skip_question(send_json, send_bytes)

                    elif msg_type == "end_interview":
                        await engine.end_early(send_json)
                        break

                elif "bytes" in message:
                    try:
                        await engine.receive_audio_chunk(message["bytes"])
                    except ValueError as e:
                        await send_json({"type": "error", "message": str(e)})
                        await websocket.close(code=1009)
                        break

        except _ClientDisconnected:
            logger.info("Client disconnected (send failed) from session %s", session_id)
        except WebSocketDisconnect:
            logger.info("Client disconnected from session %s", session_id)
        except Exception as e:
            logger.error("WebSocket error for session %s: %s", session_id, e)
            try:
                await websocket.send_json({"type": "error", "message": "Internal server error"})
            except Exception:
                pass

        # Mark as abandoned if not completed
        if engine.state.value not in ("complete", "idle"):
            result = await db.execute(
                select(InterviewSession).where(InterviewSession.id == session_id)
            )
            s = result.scalar_one_or_none()
            if s and s.status == "active":
                s.status = "abandoned"
                await db.commit()
