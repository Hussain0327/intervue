import json
import logging
from typing import Any

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.schemas.resume import ParsedResume
from app.schemas.ws_messages import (
    AudioResponseMessage,
    ErrorMessage,
    EvaluationMessage,
    InterviewState as WSState,
    SessionEndedMessage,
    SessionStartedMessage,
    StatusMessage,
    TranscriptMessage,
)
from app.services.orchestrator.evaluator import evaluate_interview
from app.services.llm.client import get_llm_client
from app.services.orchestrator.prompts import (
    build_initial_prompt,
    build_response_prompt,
    get_system_prompt,
)
from app.services.orchestrator.state import SessionPhase, session_manager
from app.services.speech.stt_whisper import get_stt_client
from app.services.speech.tts_client import get_tts_client

logger = logging.getLogger(__name__)

router = APIRouter()


async def send_message(websocket: WebSocket, message: Any) -> None:
    """Send a Pydantic model as JSON through WebSocket."""
    await websocket.send_text(message.model_dump_json())


async def process_audio_turn(
    websocket: WebSocket,
    session_id: str,
    audio_data: str,
    audio_format: str,
) -> None:
    """Process a complete audio turn from the candidate."""
    state = session_manager.get_session(session_id)
    if not state:
        await send_message(
            websocket,
            ErrorMessage(code="SESSION_NOT_FOUND", message="Session not found", recoverable=False),
        )
        return

    stt_client = get_stt_client()
    llm_client = get_llm_client()
    tts_client = get_tts_client()

    try:
        # Step 1: STT - Transcribe candidate audio
        await send_message(websocket, StatusMessage(state=WSState.PROCESSING_STT))

        stt_result = await stt_client.transcribe(audio_data)
        candidate_text = stt_result.text

        if not candidate_text.strip():
            await send_message(
                websocket,
                ErrorMessage(
                    code="EMPTY_TRANSCRIPTION",
                    message="Could not understand audio. Please try again.",
                    recoverable=True,
                ),
            )
            await send_message(websocket, StatusMessage(state=WSState.READY))
            return

        # Send candidate transcript
        seq = state.add_message("candidate", candidate_text)
        await send_message(
            websocket,
            TranscriptMessage(role="candidate", text=candidate_text, sequence=seq),
        )

        # Step 2: LLM - Generate interviewer response
        await send_message(websocket, StatusMessage(state=WSState.GENERATING))

        system_prompt = get_system_prompt(state)
        user_prompt = build_response_prompt(state, candidate_text)

        # Add user prompt as latest message for context
        messages = state.get_conversation_for_llm()

        llm_result = await llm_client.generate(
            messages=messages,
            system_prompt=system_prompt + "\n\n" + user_prompt,
        )

        interviewer_text = llm_result.text

        # Update state
        seq = state.add_message("interviewer", interviewer_text)
        state.questions_asked += 1

        # Advance phase if needed
        if state.phase == SessionPhase.INTRODUCTION:
            state.advance_phase()  # Move to warmup
        elif state.phase == SessionPhase.WARMUP:
            state.advance_phase()  # Move to main questions
        elif state.should_wrap_up() and state.phase != SessionPhase.WRAP_UP:
            state.phase = SessionPhase.WRAP_UP

        # Send interviewer transcript
        await send_message(
            websocket,
            TranscriptMessage(role="interviewer", text=interviewer_text, sequence=seq),
        )

        # Step 3: TTS - Synthesize interviewer voice
        await send_message(websocket, StatusMessage(state=WSState.SPEAKING))

        tts_result = await tts_client.synthesize(interviewer_text)

        # Send audio response
        await send_message(
            websocket,
            AudioResponseMessage(data=tts_result.audio_base64, format=tts_result.format),
        )

    except Exception as e:
        logger.exception("Error processing audio turn")
        await send_message(
            websocket,
            ErrorMessage(
                code="PROCESSING_ERROR",
                message=f"An error occurred: {str(e)}",
                recoverable=True,
            ),
        )
        await send_message(websocket, StatusMessage(state=WSState.READY))


async def start_interview(websocket: WebSocket, session_id: str) -> None:
    """Start the interview with an introduction from the interviewer."""
    state = session_manager.get_session(session_id)
    if not state:
        return

    llm_client = get_llm_client()
    tts_client = get_tts_client()

    try:
        # Generate introduction
        await send_message(websocket, StatusMessage(state=WSState.GENERATING))

        system_prompt = get_system_prompt(state)
        initial_prompt = build_initial_prompt(state)

        llm_result = await llm_client.generate(
            messages=[],
            system_prompt=system_prompt + "\n\n" + initial_prompt,
        )

        interviewer_text = llm_result.text
        seq = state.add_message("interviewer", interviewer_text)

        # Send transcript
        await send_message(
            websocket,
            TranscriptMessage(role="interviewer", text=interviewer_text, sequence=seq),
        )

        # Generate TTS
        await send_message(websocket, StatusMessage(state=WSState.SPEAKING))

        tts_result = await tts_client.synthesize(interviewer_text)

        await send_message(
            websocket,
            AudioResponseMessage(data=tts_result.audio_base64, format=tts_result.format),
        )

    except Exception as e:
        logger.exception("Error starting interview")
        await send_message(
            websocket,
            ErrorMessage(
                code="START_ERROR",
                message=f"Failed to start interview: {str(e)}",
                recoverable=False,
            ),
        )


@router.websocket("/ws/interview/{session_id}")
async def websocket_interview(websocket: WebSocket, session_id: str) -> None:
    """WebSocket endpoint for voice interview sessions."""
    await websocket.accept()

    # Create or get session
    state = session_manager.get_session(session_id)
    if not state:
        state = session_manager.create_session(session_id)

    logger.info(f"Interview session started: {session_id}")

    # Send session started message - client will send resume_context (optional) then start_interview
    await send_message(websocket, SessionStartedMessage(session_id=str(state.session_id)))

    interview_started = False

    try:
        while True:
            # Receive message from client
            raw_message = await websocket.receive_text()
            message = json.loads(raw_message)

            msg_type = message.get("type")

            if msg_type == "resume_context":
                # Store parsed resume before interview starts
                parsed_resume_data = message.get("parsed_resume")
                if parsed_resume_data:
                    try:
                        state.parsed_resume = ParsedResume(**parsed_resume_data)
                        logger.info(
                            f"Parsed resume received for session: {session_id}, "
                            f"candidate: {state.parsed_resume.contact.name}"
                        )
                    except Exception as e:
                        logger.warning(f"Failed to parse resume data: {e}")
                        # Fall back to raw text if available
                        if "raw_text" in parsed_resume_data:
                            state.resume_context = parsed_resume_data["raw_text"]

            elif msg_type == "start_interview":
                # Client is ready to start the interview
                if not interview_started:
                    interview_started = True
                    # Handle optional target role
                    target_role = message.get("role")
                    if target_role and state:
                        state.target_role = target_role
                        logger.info(f"Target role set for session {session_id}: {target_role}")
                    # Handle optional round number
                    round_num = message.get("round")
                    if round_num and state:
                        state.current_round = int(round_num)
                        logger.info(f"Interview round set for session {session_id}: {round_num}")
                    # Handle optional interview mode
                    interview_mode = message.get("mode")
                    if interview_mode and state:
                        state.interview_mode = interview_mode
                        logger.info(f"Interview mode set for session {session_id}: {interview_mode}")
                    await start_interview(websocket, session_id)
                    await send_message(websocket, StatusMessage(state=WSState.READY))

            elif msg_type == "audio":
                # Process candidate audio
                await process_audio_turn(
                    websocket,
                    session_id,
                    message.get("data", ""),
                    message.get("format", "webm"),
                )
                # Ready for next turn
                await send_message(websocket, StatusMessage(state=WSState.READY))

            elif msg_type == "playback_complete":
                # Client finished playing audio, ready for next input
                await send_message(websocket, StatusMessage(state=WSState.READY))

            elif msg_type == "request_evaluation":
                # Evaluate the interview round
                logger.info(f"Evaluation requested for session {session_id}")
                await send_message(websocket, StatusMessage(state=WSState.GENERATING))

                try:
                    evaluation_result = await evaluate_interview(state)
                    await send_message(
                        websocket,
                        EvaluationMessage(
                            round=evaluation_result.round,
                            score=evaluation_result.score,
                            passed=evaluation_result.passed,
                            feedback=evaluation_result.feedback,
                        ),
                    )
                    logger.info(
                        f"Evaluation sent for session {session_id}: "
                        f"round={evaluation_result.round}, score={evaluation_result.score}"
                    )
                except Exception as e:
                    logger.exception(f"Evaluation error for session {session_id}")
                    await send_message(
                        websocket,
                        EvaluationMessage(
                            round=state.current_round,
                            score=0,
                            passed=False,
                            feedback=f"Evaluation failed: {str(e)}",
                        ),
                    )

                await send_message(websocket, StatusMessage(state=WSState.READY))

            elif msg_type == "end_session":
                # End the session
                await send_message(
                    websocket,
                    SessionEndedMessage(
                        session_id=session_id,
                        total_turns=state.sequence_number,
                    ),
                )
                break

    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected: {session_id}")
    except Exception as e:
        logger.exception(f"WebSocket error: {session_id}")
        try:
            await send_message(
                websocket,
                ErrorMessage(
                    code="WEBSOCKET_ERROR",
                    message=str(e),
                    recoverable=False,
                ),
            )
        except Exception:
            pass
    finally:
        session_manager.remove_session(session_id)
        logger.info(f"Interview session ended: {session_id}")
