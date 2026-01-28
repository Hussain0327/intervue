"""Streaming pipeline orchestrator for real-time voice interviews.

This module orchestrates the full streaming pipeline:
Audio → Deepgram STT → Anthropic LLM → ElevenLabs TTS → Audio

The pipeline processes audio with minimal latency by streaming
at each stage rather than waiting for complete results.
"""

import asyncio
import base64
import logging
import time
from collections.abc import Awaitable, Callable
from dataclasses import dataclass

from app.core.config import get_settings
from app.services.llm.client import LLMClient, LLMMessage, get_llm_client
from app.services.speech.sentence_buffer import SentenceBuffer
from app.services.speech.stt_deepgram import DeepgramStreamingSTT, get_deepgram_client
from app.services.speech.stt_whisper import WhisperSTT, get_stt_client as get_whisper_client
from app.services.speech.tts_client import OpenAITTS, get_tts_client as get_openai_tts_client
from app.services.speech.tts_elevenlabs import ElevenLabsStreamingTTS, get_elevenlabs_client

logger = logging.getLogger(__name__)


@dataclass
class StreamingPipelineResult:
    """Result from streaming pipeline processing."""

    transcript: str
    response_text: str
    total_latency_ms: int
    stt_latency_ms: int
    llm_first_token_ms: int
    tts_first_chunk_ms: int
    audio_chunks_sent: int


class StreamingPipeline:
    """Orchestrates the full streaming audio pipeline.

    Coordinates STT, LLM, and TTS services to process audio
    with minimal end-to-end latency by streaming at each stage.

    Features:
    - Streaming STT with Deepgram (fallback to Whisper)
    - Streaming LLM responses with Anthropic
    - Streaming TTS with ElevenLabs (fallback to OpenAI)
    - Sentence buffering for natural TTS output
    - Comprehensive latency tracking
    """

    def __init__(self) -> None:
        settings = get_settings()
        self.streaming_enabled = settings.streaming_enabled
        self.stt_provider = settings.stt_provider
        self.tts_provider = settings.tts_provider

        # Initialize clients based on provider settings
        self._deepgram: DeepgramStreamingSTT | None = None
        self._whisper: WhisperSTT | None = None
        self._elevenlabs: ElevenLabsStreamingTTS | None = None
        self._openai_tts: OpenAITTS | None = None
        self._llm: LLMClient | None = None

    @property
    def deepgram(self) -> DeepgramStreamingSTT:
        """Get Deepgram client."""
        if self._deepgram is None:
            self._deepgram = get_deepgram_client()
        return self._deepgram

    @property
    def whisper(self) -> WhisperSTT:
        """Get Whisper client (fallback)."""
        if self._whisper is None:
            self._whisper = get_whisper_client()
        return self._whisper

    @property
    def elevenlabs(self) -> ElevenLabsStreamingTTS:
        """Get ElevenLabs client."""
        if self._elevenlabs is None:
            self._elevenlabs = get_elevenlabs_client()
        return self._elevenlabs

    @property
    def openai_tts(self) -> OpenAITTS:
        """Get OpenAI TTS client (fallback)."""
        if self._openai_tts is None:
            self._openai_tts = get_openai_tts_client()
        return self._openai_tts

    @property
    def llm(self) -> LLMClient:
        """Get LLM client."""
        if self._llm is None:
            self._llm = get_llm_client()
        return self._llm

    async def process_audio_streaming(
        self,
        audio_data: bytes,
        messages: list[LLMMessage],
        system_prompt: str,
        on_transcript: Callable[[str, bool], Awaitable[None]],
        on_llm_text: Callable[[str], Awaitable[None]],
        on_audio_chunk: Callable[[bytes, bool], Awaitable[None]],
    ) -> StreamingPipelineResult:
        """Process audio with full streaming pipeline.

        Orchestrates STT → LLM → TTS with streaming at each stage.
        Callbacks are invoked as data becomes available.

        Args:
            audio_data: Raw audio bytes from user
            messages: Conversation history for LLM context
            system_prompt: System prompt for LLM
            on_transcript: Callback for transcript updates (text, is_final)
            on_llm_text: Callback for LLM text chunks
            on_audio_chunk: Callback for audio chunks (data, is_final)

        Returns:
            StreamingPipelineResult with complete data and latency metrics
        """
        start_time = time.perf_counter()

        # Track latencies
        stt_start = start_time
        stt_latency_ms = 0
        llm_first_token_ms = 0
        tts_first_chunk_ms = 0
        audio_chunks_sent = 0

        # Step 1: STT - Transcribe audio
        transcript = ""
        try:
            if self.stt_provider == "deepgram":
                transcript = await self._transcribe_with_deepgram(
                    audio_data, on_transcript
                )
            else:
                transcript = await self._transcribe_with_whisper(
                    audio_data, on_transcript
                )
        except Exception as e:
            logger.warning(f"Primary STT failed, falling back: {e}")
            # Fallback to Whisper
            transcript = await self._transcribe_with_whisper(
                audio_data, on_transcript
            )

        stt_latency_ms = int((time.perf_counter() - stt_start) * 1000)

        if not transcript.strip():
            # No transcript, return early
            return StreamingPipelineResult(
                transcript="",
                response_text="",
                total_latency_ms=int((time.perf_counter() - start_time) * 1000),
                stt_latency_ms=stt_latency_ms,
                llm_first_token_ms=0,
                tts_first_chunk_ms=0,
                audio_chunks_sent=0,
            )

        # Step 2 & 3: Stream LLM → TTS in parallel
        llm_start = time.perf_counter()
        response_text = ""
        sentence_buffer = SentenceBuffer()
        first_token_received = False
        first_audio_sent = False

        # Queue for sentences to be converted to speech
        sentence_queue: asyncio.Queue[str | None] = asyncio.Queue()

        async def process_llm_stream():
            """Process LLM stream and buffer into sentences."""
            nonlocal response_text, first_token_received, llm_first_token_ms

            async for token in self.llm.generate_stream(
                messages=messages,
                system_prompt=system_prompt,
            ):
                if not first_token_received:
                    first_token_received = True
                    llm_first_token_ms = int((time.perf_counter() - llm_start) * 1000)

                response_text += token
                await on_llm_text(token)

                # Try to extract a complete sentence
                sentence = sentence_buffer.add_token(token)
                if sentence:
                    await sentence_queue.put(sentence)

            # Flush any remaining content
            remaining = sentence_buffer.flush()
            if remaining:
                await sentence_queue.put(remaining)

            # Signal end of sentences
            await sentence_queue.put(None)

        async def process_tts_stream():
            """Convert sentences to speech and stream audio."""
            nonlocal first_audio_sent, tts_first_chunk_ms, audio_chunks_sent

            tts_start = time.perf_counter()

            while True:
                sentence = await sentence_queue.get()
                if sentence is None:
                    break

                try:
                    if self.tts_provider == "elevenlabs":
                        # Use ElevenLabs streaming TTS
                        async for chunk in self.elevenlabs.client.text_to_speech.convert_as_stream(
                            voice_id=self.elevenlabs.voice_id,
                            text=sentence,
                            model_id=self.elevenlabs.model_id,
                            output_format="mp3_44100_128",
                        ):
                            if not first_audio_sent:
                                first_audio_sent = True
                                tts_first_chunk_ms = int(
                                    (time.perf_counter() - tts_start) * 1000
                                )

                            await on_audio_chunk(chunk, False)
                            audio_chunks_sent += 1
                    else:
                        # Use OpenAI TTS (batch per sentence)
                        result = await self.openai_tts.synthesize(sentence)
                        if not first_audio_sent:
                            first_audio_sent = True
                            tts_first_chunk_ms = int(
                                (time.perf_counter() - tts_start) * 1000
                            )

                        await on_audio_chunk(result.audio_bytes, False)
                        audio_chunks_sent += 1

                except Exception as e:
                    logger.warning(f"TTS failed for sentence, trying fallback: {e}")
                    # Fallback to OpenAI TTS
                    try:
                        result = await self.openai_tts.synthesize(sentence)
                        await on_audio_chunk(result.audio_bytes, False)
                        audio_chunks_sent += 1
                    except Exception as fallback_error:
                        logger.error(f"TTS fallback also failed: {fallback_error}")

            # Send final marker
            await on_audio_chunk(b"", True)

        # Run LLM and TTS processing concurrently
        await asyncio.gather(
            process_llm_stream(),
            process_tts_stream(),
        )

        total_latency_ms = int((time.perf_counter() - start_time) * 1000)

        return StreamingPipelineResult(
            transcript=transcript,
            response_text=response_text,
            total_latency_ms=total_latency_ms,
            stt_latency_ms=stt_latency_ms,
            llm_first_token_ms=llm_first_token_ms,
            tts_first_chunk_ms=tts_first_chunk_ms,
            audio_chunks_sent=audio_chunks_sent,
        )

    async def _transcribe_with_deepgram(
        self,
        audio_data: bytes,
        on_transcript: Callable[[str, bool], Awaitable[None]],
    ) -> str:
        """Transcribe audio using Deepgram.

        Uses batch mode for simplicity with uploaded audio.
        Streaming mode would require WebSocket connection from client.
        """
        result = await self.deepgram.transcribe(audio_data)

        # Send final transcript
        if result.text:
            await on_transcript(result.text, True)

        return result.text

    async def _transcribe_with_whisper(
        self,
        audio_data: bytes,
        on_transcript: Callable[[str, bool], Awaitable[None]],
    ) -> str:
        """Transcribe audio using Whisper (fallback)."""
        result = await self.whisper.transcribe(audio_data)

        # Send final transcript
        if result.text:
            await on_transcript(result.text, True)

        return result.text

    async def process_audio_batch(
        self,
        audio_data: bytes,
        messages: list[LLMMessage],
        system_prompt: str,
    ) -> tuple[str, str, bytes]:
        """Process audio in batch mode (non-streaming fallback).

        Used when streaming is disabled or for fallback scenarios.

        Args:
            audio_data: Raw audio bytes from user
            messages: Conversation history for LLM context
            system_prompt: System prompt for LLM

        Returns:
            Tuple of (transcript, response_text, audio_bytes)
        """
        # STT
        if self.stt_provider == "deepgram":
            stt_result = await self.deepgram.transcribe(audio_data)
        else:
            stt_result = await self.whisper.transcribe(audio_data)

        transcript = stt_result.text

        if not transcript.strip():
            return "", "", b""

        # LLM (non-streaming)
        llm_result = await self.llm.generate(
            messages=messages,
            system_prompt=system_prompt,
        )
        response_text = llm_result.text

        # TTS
        if self.tts_provider == "elevenlabs":
            tts_result = await self.elevenlabs.synthesize(response_text)
        else:
            tts_result = await self.openai_tts.synthesize(response_text)

        return transcript, response_text, tts_result.audio_bytes


_pipeline: StreamingPipeline | None = None


def get_streaming_pipeline() -> StreamingPipeline:
    """Get or create the streaming pipeline instance."""
    global _pipeline
    if _pipeline is None:
        _pipeline = StreamingPipeline()
    return _pipeline
