"""Deepgram streaming Speech-to-Text client."""

import asyncio
import base64
import logging
import time
from collections.abc import AsyncIterator, Awaitable, Callable
from dataclasses import dataclass
from typing import TYPE_CHECKING

from app.core.config import get_settings

if TYPE_CHECKING:
    from deepgram import DeepgramClient

logger = logging.getLogger(__name__)


@dataclass
class STTResult:
    """Result from speech-to-text transcription."""

    text: str
    latency_ms: int


class DeepgramStreamingSTT:
    """Deepgram streaming speech-to-text client.

    Supports both streaming transcription with real-time callbacks
    and batch transcription for backward compatibility.
    """

    def __init__(self) -> None:
        settings = get_settings()
        self.api_key = settings.deepgram_api_key
        self.model = settings.deepgram_model
        self.timeout = settings.stt_timeout
        self._client: "DeepgramClient | None" = None

    @property
    def client(self) -> "DeepgramClient":
        """Lazy initialization of Deepgram client."""
        if self._client is None:
            from deepgram import DeepgramClient

            self._client = DeepgramClient(self.api_key)
        return self._client

    async def transcribe_stream(
        self,
        audio_stream: AsyncIterator[bytes],
        on_transcript: Callable[[str, bool], Awaitable[None]],
    ) -> str:
        """Stream audio and get real-time transcripts via callback.

        Args:
            audio_stream: Async iterator yielding audio chunks
            on_transcript: Callback for transcript updates (text, is_final)

        Returns:
            Complete final transcript
        """
        from deepgram import LiveOptions, LiveTranscriptionEvents

        final_transcript_parts: list[str] = []
        transcript_complete = asyncio.Event()

        options = LiveOptions(
            model=self.model,
            language="en",
            smart_format=True,
            punctuate=True,
            interim_results=True,
            utterance_end_ms=1000,
            vad_events=True,
        )

        connection = self.client.listen.asynclive.v("1")

        async def on_message(self_conn, result, **kwargs) -> None:  # noqa: ARG001
            """Handle transcript messages from Deepgram."""
            try:
                transcript = result.channel.alternatives[0].transcript
                is_final = result.is_final

                if transcript:
                    await on_transcript(transcript, is_final)

                    if is_final:
                        final_transcript_parts.append(transcript)
            except Exception as e:
                logger.warning(f"Error processing Deepgram message: {e}")

        async def on_utterance_end(self_conn, utterance_end, **kwargs) -> None:  # noqa: ARG001
            """Handle utterance end event."""
            transcript_complete.set()

        async def on_error(self_conn, error, **kwargs) -> None:  # noqa: ARG001
            """Handle errors from Deepgram."""
            logger.error(f"Deepgram error: {error}")
            transcript_complete.set()

        connection.on(LiveTranscriptionEvents.Transcript, on_message)
        connection.on(LiveTranscriptionEvents.UtteranceEnd, on_utterance_end)
        connection.on(LiveTranscriptionEvents.Error, on_error)

        try:
            if not await connection.start(options):
                raise RuntimeError("Failed to start Deepgram connection")

            # Stream audio chunks
            async for chunk in audio_stream:
                await connection.send(chunk)

            # Signal end of audio
            await connection.finish()

            # Wait for final transcript with timeout
            try:
                await asyncio.wait_for(transcript_complete.wait(), timeout=5.0)
            except asyncio.TimeoutError:
                logger.warning("Timeout waiting for utterance end")

        finally:
            await connection.finish()

        return " ".join(final_transcript_parts)

    async def transcribe(self, audio_data: str | bytes) -> STTResult:
        """Transcribe audio data (batch mode for backward compatibility).

        Args:
            audio_data: Base64 encoded audio or raw bytes

        Returns:
            STTResult with transcribed text and latency
        """
        from deepgram import FileSource, PrerecordedOptions

        start_time = time.perf_counter()

        # Handle base64 encoded audio
        if isinstance(audio_data, str):
            # Remove data URL prefix if present
            if "," in audio_data:
                audio_data = audio_data.split(",")[1]
            audio_bytes = base64.b64decode(audio_data)
        else:
            audio_bytes = audio_data

        options = PrerecordedOptions(
            model=self.model,
            language="en",
            smart_format=True,
            punctuate=True,
        )

        source: FileSource = {"buffer": audio_bytes}

        response = await self.client.listen.asyncprerecorded.v("1").transcribe_file(
            source, options, timeout=self.timeout
        )

        text = ""
        if response.results and response.results.channels:
            alternatives = response.results.channels[0].alternatives
            if alternatives:
                text = alternatives[0].transcript

        latency_ms = int((time.perf_counter() - start_time) * 1000)

        return STTResult(text=text, latency_ms=latency_ms)


_deepgram_client: DeepgramStreamingSTT | None = None


def get_deepgram_client() -> DeepgramStreamingSTT:
    """Get or create the Deepgram STT client."""
    global _deepgram_client
    if _deepgram_client is None:
        _deepgram_client = DeepgramStreamingSTT()
    return _deepgram_client
