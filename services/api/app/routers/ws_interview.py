import json
import logging
import uuid as uuid_mod
from typing import Any

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from pydantic import ValidationError

from app.core.security import verify_token_or_none
from app.schemas.coding import CodeSubmission
from app.schemas.resume import ParsedResume
from app.schemas.ws_messages import (
    AudioChunkMessage,
    AudioResponseMessage,
    CodeEvaluationAnalysis,
    CodeEvaluationMessage,
    ErrorMessage,
    EvaluationMessage,
    ProblemMessage,
    SessionEndedMessage,
    SessionStartedMessage,
    StatusMessage,
    StreamingStatusMessage,
    TranscriptDeltaMessage,
    TranscriptMessage,
)
from app.schemas.ws_messages import (
    InterviewState as WSState,
)
from app.services.coding.code_evaluator import evaluate_code
from app.services.coding.problem_selector import select_problem_for_candidate
from app.services.llm.client import get_llm_client
from app.services.orchestrator.evaluator import evaluate_interview
from app.services.orchestrator.prompts import (
    build_initial_prompt,
    build_response_prompt,
    get_system_prompt,
)
from app.services.orchestrator.state import SessionPhase, session_manager
from app.services.orchestrator.streaming_pipeline import get_streaming_pipeline
from app.services.speech.audio_utils import decode_base64_audio
from app.services.speech.stt_whisper import get_stt_client
from app.services.speech.tts_client import get_tts_client

logger = logging.getLogger(__name__)

router = APIRouter()

# --- Constants ---
MAX_AUDIO_DATA_BYTES = 10 * 1024 * 1024  # 10 MB
MAX_CODE_LENGTH = 50_000
ALLOWED_LANGUAGES = {
    "python", "javascript", "typescript", "java", "c", "cpp", "c++",
    "csharp", "c#", "go", "rust", "ruby", "swift", "kotlin", "scala",
    "php", "r", "sql",
}


# --- Helpers ---

def _validate_session_id(session_id: str) -> bool:
    """Validate that session_id is a valid UUID."""
    try:
        uuid_mod.UUID(session_id)
        return True
    except (ValueError, AttributeError):
        return False


async def _ws_error_response(
    websocket: WebSocket,
    code: str,
    message: str,
    recoverable: bool = True,
    set_ready: bool = True,
) -> None:
    """Send an error message and optionally set status to READY."""
    await send_message(
        websocket,
        ErrorMessage(code=code, message=message, recoverable=recoverable),
    )
    if set_ready:
        await send_message(websocket, StatusMessage(state=WSState.READY))


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
        await _ws_error_response(
            websocket, "SESSION_NOT_FOUND", "Session not found",
            recoverable=False, set_ready=False,
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
            await _ws_error_response(
                websocket,
                "EMPTY_TRANSCRIPTION",
                "Could not understand audio. Please try again.",
            )
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

    except (ConnectionError, TimeoutError) as e:
        logger.error("Network error processing audio turn: %s", e)
        await _ws_error_response(
            websocket,
            "PROCESSING_ERROR",
            "A network error occurred while processing your audio. Please try again.",
        )
    except Exception:
        logger.exception("Error processing audio turn")
        await _ws_error_response(
            websocket,
            "PROCESSING_ERROR",
            "An error occurred while processing your audio. Please try again.",
        )


async def process_audio_turn_streaming(
    websocket: WebSocket,
    session_id: str,
    audio_data: str,
    audio_format: str,
) -> None:
    """Process audio with streaming pipeline for low-latency response.

    Uses the streaming pipeline to process audio with real-time
    callbacks for transcript, LLM text, and audio chunks.
    """
    import base64

    state = session_manager.get_session(session_id)
    if not state:
        await _ws_error_response(
            websocket, "SESSION_NOT_FOUND", "Session not found",
            recoverable=False, set_ready=False,
        )
        return

    pipeline = get_streaming_pipeline()

    # Track sequence numbers for streaming messages
    transcript_seq = 0
    audio_chunk_seq = 0
    full_transcript = ""
    full_response = ""

    async def on_transcript(text: str, is_final: bool) -> None:
        """Handle transcript updates from STT."""
        nonlocal transcript_seq, full_transcript

        if is_final:
            full_transcript = text

        await send_message(
            websocket,
            TranscriptDeltaMessage(
                role="candidate",
                delta=text if not is_final else "",
                is_final=is_final,
                sequence=transcript_seq,
            ),
        )
        transcript_seq += 1

        if is_final:
            # Also send full transcript message for compatibility
            seq = state.add_message("candidate", text)
            await send_message(
                websocket,
                TranscriptMessage(role="candidate", text=text, sequence=seq),
            )

    async def on_llm_text(text: str) -> None:
        """Handle LLM text chunks."""
        nonlocal full_response

        full_response += text

        # Send text delta for real-time display
        await send_message(
            websocket,
            TranscriptDeltaMessage(
                role="interviewer",
                delta=text,
                is_final=False,
                sequence=transcript_seq,
            ),
        )

    async def on_audio_chunk(chunk: bytes, is_final: bool) -> None:
        """Handle audio chunks from TTS."""
        nonlocal audio_chunk_seq

        if chunk:
            audio_base64 = base64.b64encode(chunk).decode("utf-8")
            await send_message(
                websocket,
                AudioChunkMessage(
                    data=audio_base64,
                    format="mp3",
                    sequence=audio_chunk_seq,
                    is_final=is_final,
                ),
            )
            audio_chunk_seq += 1
        elif is_final:
            # Send empty final marker
            await send_message(
                websocket,
                AudioChunkMessage(
                    data="",
                    format="mp3",
                    sequence=audio_chunk_seq,
                    is_final=True,
                ),
            )

    try:
        # Send streaming status
        await send_message(
            websocket,
            StreamingStatusMessage(stage="transcribing"),
        )

        # Decode audio data
        audio_bytes = decode_base64_audio(audio_data)

        # Build prompt callback - called after STT produces the transcript
        messages = state.get_conversation_for_llm()

        def build_prompt(transcript: str) -> str:
            return get_system_prompt(state) + "\n\n" + build_response_prompt(state, transcript)

        # Process with streaming pipeline
        result = await pipeline.process_audio_streaming(
            audio_data=audio_bytes,
            messages=messages,
            build_system_prompt=build_prompt,
            on_transcript=on_transcript,
            on_llm_text=on_llm_text,
            on_audio_chunk=on_audio_chunk,
        )

        if not result.transcript.strip():
            await _ws_error_response(
                websocket,
                "EMPTY_TRANSCRIPTION",
                "Could not understand audio. Please try again.",
            )
            return

        # Update state with final response
        seq = state.add_message("interviewer", result.response_text)
        state.questions_asked += 1

        # Advance phase if needed
        if state.phase == SessionPhase.INTRODUCTION:
            state.advance_phase()
        elif state.phase == SessionPhase.WARMUP:
            state.advance_phase()
        elif state.should_wrap_up() and state.phase != SessionPhase.WRAP_UP:
            state.phase = SessionPhase.WRAP_UP

        # Send final transcript for compatibility
        await send_message(
            websocket,
            TranscriptDeltaMessage(
                role="interviewer",
                delta="",
                is_final=True,
                sequence=transcript_seq,
            ),
        )
        await send_message(
            websocket,
            TranscriptMessage(role="interviewer", text=result.response_text, sequence=seq),
        )

        logger.info(
            f"Streaming turn completed for {session_id}: "
            f"stt={result.stt_latency_ms}ms, "
            f"llm_first={result.llm_first_token_ms}ms, "
            f"tts_first={result.tts_first_chunk_ms}ms, "
            f"total={result.total_latency_ms}ms, "
            f"chunks={result.audio_chunks_sent}"
        )

    except (ConnectionError, TimeoutError) as e:
        logger.error("Network error in streaming audio turn: %s", e)
        await _ws_error_response(
            websocket,
            "STREAMING_ERROR",
            "A network error occurred during streaming. Please try again.",
        )
    except Exception:
        logger.exception("Error in streaming audio turn")
        await _ws_error_response(
            websocket,
            "STREAMING_ERROR",
            "An error occurred during streaming. Please try again.",
        )


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

    except Exception:
        logger.exception("Error starting interview")
        await _ws_error_response(
            websocket,
            "START_ERROR",
            "Failed to start interview. Please refresh and try again.",
            recoverable=False,
            set_ready=False,
        )


@router.websocket("/ws/interview/{session_id}")
async def websocket_interview(
    websocket: WebSocket,
    session_id: str,
    token: str = Query(default=""),
) -> None:
    """WebSocket endpoint for voice interview sessions.

    Optionally accepts a JWT via `token` query parameter:
        ws://host/ws/interview/{session_id}?token=<jwt>
    """
    await websocket.accept()

    # --- Optional authentication ---
    user = verify_token_or_none(token)

    if token and not user:
        # Token was provided but failed verification — reject
        logger.warning("WebSocket auth failed for session %s", session_id)
        await _ws_error_response(
            websocket,
            "AUTH_FAILED",
            "Invalid or expired authentication token.",
            recoverable=False,
            set_ready=False,
        )
        await websocket.close(code=1008)
        return

    if user:
        logger.info("WebSocket authenticated: user=%s session=%s", user.sub, session_id)
    else:
        logger.info("WebSocket anonymous session: %s", session_id)

    # Validate session ID is a UUID
    if not _validate_session_id(session_id):
        await _ws_error_response(
            websocket,
            "INVALID_SESSION_ID",
            "Session ID must be a valid UUID.",
            recoverable=False,
            set_ready=False,
        )
        await websocket.close(code=1008)
        return

    # Create or get session
    state = session_manager.get_session(session_id)
    if not state:
        state = await session_manager.create_session(session_id)

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
                    except (ValueError, ValidationError) as e:
                        logger.warning(f"Failed to parse resume data: {e}")
                        # Fall back to raw text if available
                        if "raw_text" in parsed_resume_data:
                            state.resume_context = parsed_resume_data["raw_text"]
                    except Exception as e:
                        logger.warning("Unexpected error parsing resume: %s", e)
                        is_dict = isinstance(parsed_resume_data, dict)
                        if is_dict and "raw_text" in parsed_resume_data:
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
                        logger.info("Interview mode set for %s: %s", session_id, interview_mode)
                    await start_interview(websocket, session_id)
                    await send_message(websocket, StatusMessage(state=WSState.READY))

            elif msg_type == "audio":
                # Validate audio data size
                audio_data = message.get("data", "")
                if len(audio_data) > MAX_AUDIO_DATA_BYTES:
                    await _ws_error_response(
                        websocket,
                        "AUDIO_TOO_LARGE",
                        f"Audio data exceeds {MAX_AUDIO_DATA_BYTES // (1024 * 1024)}MB limit.",
                    )
                    continue

                # Check if streaming is enabled
                from app.core.config import get_settings
                settings = get_settings()

                if settings.streaming_enabled:
                    # Use streaming pipeline for low-latency response
                    await process_audio_turn_streaming(
                        websocket,
                        session_id,
                        audio_data,
                        message.get("format", "webm"),
                    )
                else:
                    # Use batch processing
                    await process_audio_turn(
                        websocket,
                        session_id,
                        audio_data,
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
                except Exception:
                    logger.exception(f"Evaluation error for session {session_id}")
                    await send_message(
                        websocket,
                        EvaluationMessage(
                            round=state.current_round,
                            score=0,
                            passed=False,
                            feedback="Evaluation could not be completed. Please try again.",
                        ),
                    )

                await send_message(websocket, StatusMessage(state=WSState.READY))

            elif msg_type == "request_problem":
                # Select and send a coding problem based on candidate's resume
                logger.info(f"Problem requested for session {session_id}")

                try:
                    problem = select_problem_for_candidate(
                        resume=state.parsed_resume,
                        target_role=state.target_role,
                    )
                    state.current_problem = problem

                    # Convert problem to dict for JSON serialization
                    problem_dict = {
                        "id": problem.id,
                        "title": problem.title,
                        "difficulty": problem.difficulty,
                        "description": problem.description,
                        "examples": [
                            {"input": ex.input, "output": ex.output, "explanation": ex.explanation}
                            for ex in problem.examples
                        ],
                        "constraints": problem.constraints,
                        "starterCode": problem.starter_code,
                        "tags": problem.tags,
                    }

                    await send_message(
                        websocket,
                        ProblemMessage(problem=problem_dict),
                    )
                    logger.info(f"Sent problem {problem.id} to session {session_id}")

                except Exception:
                    logger.exception(f"Failed to select problem for session {session_id}")
                    await _ws_error_response(
                        websocket,
                        "PROBLEM_SELECTION_ERROR",
                        "Failed to select a coding problem. Please try again.",
                    )

            elif msg_type == "code_submission":
                # Validate code submission
                code = message.get("code", "")
                language = message.get("language", "python")
                problem_id = message.get("problem_id", "")

                if len(code) > MAX_CODE_LENGTH:
                    await _ws_error_response(
                        websocket,
                        "CODE_TOO_LARGE",
                        f"Code exceeds maximum length of {MAX_CODE_LENGTH} characters.",
                    )
                    continue

                if language.lower() not in ALLOWED_LANGUAGES:
                    await _ws_error_response(
                        websocket,
                        "INVALID_LANGUAGE",
                        f"Language '{language}' is not supported.",
                    )
                    continue

                logger.info(f"Code submission for session {session_id}, problem {problem_id}")

                if not state.current_problem:
                    await _ws_error_response(
                        websocket,
                        "NO_PROBLEM",
                        "No problem has been assigned yet",
                    )
                    continue

                # Store submission in state
                state.submitted_code = code
                state.submitted_language = language

                await send_message(websocket, StatusMessage(state=WSState.GENERATING))

                try:
                    submission = CodeSubmission(
                        problem_id=problem_id,
                        code=code,
                        language=language,
                    )

                    eval_result = await evaluate_code(state.current_problem, submission)

                    # Build analysis if available
                    analysis = None
                    if eval_result.analysis:
                        analysis = CodeEvaluationAnalysis(
                            correctness=eval_result.analysis.correctness,
                            edge_case_handling=eval_result.analysis.edge_case_handling,
                            code_quality=eval_result.analysis.code_quality,
                            complexity=eval_result.analysis.complexity,
                        )

                    await send_message(
                        websocket,
                        CodeEvaluationMessage(
                            correct=eval_result.correct,
                            score=eval_result.score,
                            feedback=eval_result.feedback,
                            analysis=analysis,
                        ),
                    )
                    logger.info(
                        f"Code evaluation for session {session_id}: "
                        f"correct={eval_result.correct}, score={eval_result.score}"
                    )

                except Exception:
                    logger.exception(f"Code evaluation error for session {session_id}")
                    await send_message(
                        websocket,
                        CodeEvaluationMessage(
                            correct=False,
                            score=0,
                            feedback="Code evaluation failed. Check your code and try again.",
                            analysis=None,
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
    except Exception:
        logger.exception(f"WebSocket error: {session_id}")
        try:
            await _ws_error_response(
                websocket,
                "WEBSOCKET_ERROR",
                "A connection error occurred. Please refresh and try again.",
                recoverable=False,
                set_ready=False,
            )
        except Exception:
            logger.debug(
                "Failed to send error on closing WebSocket: %s", session_id,
            )
    finally:
        await session_manager.remove_session(session_id)
        logger.info(f"Interview session ended: {session_id}")
