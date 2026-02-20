import enum
import json
import logging
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.redis import delete_session_state, get_session_state, save_session_state
from app.models.evaluation import Evaluation
from app.models.session import InterviewSession
from app.models.transcript import TranscriptEntry
from app.services.evaluator import evaluate_answer, generate_scorecard
from app.services.speech.stt import transcribe_audio
from app.services.speech.tts import stream_tts

logger = logging.getLogger(__name__)

MAX_AUDIO_BUFFER_BYTES = 10 * 1024 * 1024  # 10 MB ≈ ~5 min audio
MAX_HISTORY = 50


class InterviewState(str, enum.Enum):
    IDLE = "idle"
    GENERATING_QUESTION = "generating_question"
    SPEAKING_QUESTION = "speaking_question"
    LISTENING = "listening"
    TRANSCRIBING = "transcribing"
    EVALUATING = "evaluating"
    COMPLETE = "complete"


class InterviewEngine:
    """Per-session interview state machine. One instance per active WebSocket."""

    def __init__(self, session_id: str, db: AsyncSession):
        self.session_id = session_id
        self.db = db
        self.state = InterviewState.IDLE
        self.questions: list[dict] = []
        self.current_question_index: int = 0
        self.follow_up_count: int = 0
        self.max_follow_ups: int = 1
        self.voice: str = "nova"
        self.audio_buffer: bytearray = bytearray()
        self.conversation_history: list[dict] = []
        self._session: InterviewSession | None = None

    async def initialize(self, session: InterviewSession | None = None) -> dict | None:
        """Load session from DB and optionally restore state from Redis."""
        if session is None:
            result = await self.db.execute(
                select(InterviewSession).where(InterviewSession.id == self.session_id)
            )
            session = result.scalar_one_or_none()
        if not session:
            return None

        self._session = session
        self.questions = session.questions or []
        self.voice = (session.config or {}).get("voice", "nova")

        # Try to restore state from Redis
        saved = await get_session_state(self.session_id)
        if saved:
            self.current_question_index = saved.get("current_question_index", 0)
            self.follow_up_count = saved.get("follow_up_count", 0)
            self.conversation_history = saved.get("conversation_history", [])
            self.state = InterviewState(saved.get("state", "idle"))

        return {
            "total_questions": len(self.questions),
            "current_index": self.current_question_index,
            "state": self.state.value,
        }

    async def _save_state(self) -> None:
        """Persist current state to Redis."""
        # Cap conversation history to prevent unbounded growth
        if len(self.conversation_history) > MAX_HISTORY:
            self.conversation_history = self.conversation_history[-MAX_HISTORY:]

        await save_session_state(self.session_id, {
            "current_question_index": self.current_question_index,
            "follow_up_count": self.follow_up_count,
            "conversation_history": self.conversation_history,
            "state": self.state.value,
        })

    async def _update_session_status(self, status: str, **kwargs) -> None:
        if self._session:
            self._session.status = status
            for k, v in kwargs.items():
                setattr(self._session, k, v)
            await self.db.commit()
            return

        result = await self.db.execute(
            select(InterviewSession).where(InterviewSession.id == self.session_id)
        )
        session = result.scalar_one_or_none()
        if session:
            session.status = status
            for k, v in kwargs.items():
                setattr(session, k, v)
            await self.db.commit()

    async def _save_transcript(
        self, role: str, content: str, entry_type: str, question_index: int
    ) -> None:
        entry = TranscriptEntry(
            session_id=self.session_id,
            role=role,
            content=content,
            entry_type=entry_type,
            question_index=question_index,
        )
        self.db.add(entry)
        await self.db.flush()

        self.conversation_history.append({
            "role": role,
            "content": content,
            "type": entry_type,
            "question_index": question_index,
        })

    async def _save_evaluation(self, eval_data: dict, question_index: int, question_text: str) -> None:
        evaluation = Evaluation(
            session_id=self.session_id,
            question_index=question_index,
            question_text=question_text,
            answer_summary=eval_data.get("answer_summary", ""),
            scores=eval_data.get("scores", {}),
            feedback=eval_data.get("feedback", ""),
            strengths=eval_data.get("strengths", []),
            areas_for_improvement=eval_data.get("areas_for_improvement", []),
            overall_score=eval_data.get("overall_score", 3.0),
        )
        self.db.add(evaluation)
        await self.db.flush()

    def get_current_question(self) -> dict | None:
        if self.current_question_index < len(self.questions):
            return self.questions[self.current_question_index]
        return None

    async def start_interview(self, send_json, send_bytes):
        """Begin the interview — send first question."""
        self.state = InterviewState.GENERATING_QUESTION
        await self._update_session_status("active", started_at=datetime.now(timezone.utc))
        await self._save_state()

        await send_json({
            "type": "interview_started",
            "total_questions": len(self.questions),
        })

        await self._ask_current_question(send_json, send_bytes)

    async def _ask_current_question(self, send_json, send_bytes):
        """Speak the current question via TTS."""
        question = self.get_current_question()
        if not question:
            await self._complete_interview(send_json)
            return

        question_text = question["text"]

        # Save transcript
        entry_type = "question" if self.follow_up_count == 0 else "follow_up"
        await self._save_transcript(
            "interviewer", question_text, entry_type, self.current_question_index
        )

        # Send question text for transcript display
        await send_json({
            "type": "question" if self.follow_up_count == 0 else "follow_up",
            "text": question_text,
            "index": self.current_question_index,
        })

        # Stream TTS audio
        self.state = InterviewState.SPEAKING_QUESTION
        await self._save_state()

        async for chunk in stream_tts(question_text, voice=self.voice):
            await send_bytes(chunk)

        await send_json({"type": "tts_done"})

        # Now listen
        self.state = InterviewState.LISTENING
        self.audio_buffer = bytearray()
        await self._save_state()
        await send_json({"type": "listening"})

    async def receive_audio_chunk(self, data: bytes):
        """Accumulate audio data from client."""
        if len(self.audio_buffer) + len(data) > MAX_AUDIO_BUFFER_BYTES:
            raise ValueError(
                f"Audio buffer exceeds {MAX_AUDIO_BUFFER_BYTES // (1024 * 1024)}MB limit"
            )
        self.audio_buffer.extend(data)

    async def handle_speech_end(self, send_json, send_bytes):
        """Client-side VAD detected silence. Transcribe + evaluate."""
        if not self.audio_buffer:
            await send_json({"type": "listening"})
            return

        # Transcribe
        self.state = InterviewState.TRANSCRIBING
        await self._save_state()
        await send_json({"type": "thinking"})

        audio_data = bytes(self.audio_buffer)
        self.audio_buffer = bytearray()

        try:
            transcription = await transcribe_audio(audio_data)
        except Exception as e:
            logger.error("Transcription failed: %s", e)
            await send_json({"type": "error", "message": "Failed to transcribe audio"})
            self.state = InterviewState.LISTENING
            await self._save_state()
            await send_json({"type": "listening"})
            return

        if not transcription.strip():
            await send_json({"type": "error", "message": "No speech detected"})
            self.state = InterviewState.LISTENING
            await self._save_state()
            await send_json({"type": "listening"})
            return

        # Send transcription to client
        await send_json({"type": "transcription", "text": transcription})

        # Save transcript
        entry_type = "answer" if self.follow_up_count == 0 else "follow_up_answer"
        await self._save_transcript(
            "candidate", transcription, entry_type, self.current_question_index
        )

        # Evaluate
        self.state = InterviewState.EVALUATING
        await self._save_state()

        question = self.get_current_question()
        question_text = question["text"] if question else ""

        context = "\n".join(
            f"{h['role']}: {h['content']}" for h in self.conversation_history[-6:]
        )

        try:
            eval_result = await evaluate_answer(question_text, transcription, context)
        except Exception as e:
            logger.error("Evaluation failed: %s", e)
            eval_result = {
                "scores": {"situation": 3, "task": 3, "action": 3, "result": 3, "communication": 3},
                "overall_score": 3.0,
                "feedback": "Evaluation unavailable",
                "needs_follow_up": False,
                "answer_summary": transcription[:200],
            }

        # Save evaluation
        await self._save_evaluation(eval_result, self.current_question_index, question_text)

        # Commit all pending transcript + evaluation writes at state boundary
        await self.db.commit()

        # Decide: follow-up, next question, or complete
        needs_follow_up = eval_result.get("needs_follow_up", False)

        if needs_follow_up and self.follow_up_count < self.max_follow_ups:
            # Ask follow-up
            follow_up_text = eval_result.get("follow_up_question", "")
            if follow_up_text:
                self.follow_up_count += 1
                # Temporarily replace question for speaking
                original_question = self.questions[self.current_question_index]
                self.questions[self.current_question_index] = {
                    **original_question,
                    "text": follow_up_text,
                }
                await self._ask_current_question(send_json, send_bytes)
                # Restore original
                self.questions[self.current_question_index] = original_question
                return

        # Move to next question
        self.current_question_index += 1
        self.follow_up_count = 0

        if self.current_question_index >= len(self.questions):
            await self._complete_interview(send_json)
        else:
            await self._ask_current_question(send_json, send_bytes)

    async def skip_question(self, send_json, send_bytes):
        """Skip the current question."""
        self.current_question_index += 1
        self.follow_up_count = 0

        if self.current_question_index >= len(self.questions):
            await self._complete_interview(send_json)
        else:
            await self._ask_current_question(send_json, send_bytes)

    async def _complete_interview(self, send_json):
        """Generate scorecard and mark complete."""
        self.state = InterviewState.COMPLETE

        # Get all per-question evaluations
        result = await self.db.execute(
            select(Evaluation)
            .where(
                Evaluation.session_id == self.session_id,
                Evaluation.question_index.isnot(None),
            )
            .order_by(Evaluation.question_index)
        )
        per_question_evals = result.scalars().all()

        if per_question_evals:
            eval_dicts = [
                {
                    "question_text": e.question_text,
                    "answer_summary": e.answer_summary,
                    "scores": e.scores,
                    "overall_score": float(e.overall_score),
                    "feedback": e.feedback,
                }
                for e in per_question_evals
            ]

            try:
                scorecard = await generate_scorecard(eval_dicts)
            except Exception as e:
                logger.error("Scorecard generation failed: %s", e)
                scorecard = {
                    "overall_score": 3.0,
                    "scores": {},
                    "feedback": "Scorecard generation failed",
                    "strengths": [],
                    "areas_for_improvement": [],
                }

            # Save overall evaluation
            overall = Evaluation(
                session_id=self.session_id,
                question_index=None,
                scores={
                    **scorecard.get("scores", {}),
                    "recommendation": scorecard.get("recommendation"),
                    "recommendation_reasoning": scorecard.get("recommendation_reasoning"),
                },
                feedback=scorecard.get("feedback", ""),
                strengths=scorecard.get("strengths", []),
                areas_for_improvement=scorecard.get("areas_for_improvement", []),
                overall_score=scorecard.get("overall_score", 3.0),
            )
            self.db.add(overall)
            await self.db.commit()

        await self._update_session_status(
            "completed", completed_at=datetime.now(timezone.utc)
        )
        await delete_session_state(self.session_id)

        await send_json({"type": "interview_complete"})

    async def end_early(self, send_json):
        """User ends interview early."""
        await self._update_session_status("abandoned")
        await delete_session_state(self.session_id)
        await send_json({"type": "interview_complete"})
