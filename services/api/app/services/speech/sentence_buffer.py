"""Sentence buffer for converting token streams to sentence streams."""

import re
from collections.abc import AsyncIterator

from app.core.config import get_settings


class SentenceBuffer:
    """Buffer LLM tokens into complete sentences for natural TTS.

    Accumulates tokens from the LLM and yields complete sentences
    based on punctuation and minimum character thresholds. This
    ensures TTS gets natural-sounding sentence chunks rather than
    single tokens.
    """

    # Sentence-ending punctuation patterns
    SENTENCE_ENDINGS = re.compile(r'[.!?]+["\')\]]*\s*$')

    # Patterns that look like sentence endings but aren't
    ABBREVIATIONS = {
        "mr.", "mrs.", "ms.", "dr.", "prof.", "sr.", "jr.",
        "vs.", "etc.", "i.e.", "e.g.", "a.m.", "p.m.",
        "inc.", "ltd.", "corp.", "co.", "st.", "ave.",
        "jan.", "feb.", "mar.", "apr.", "jun.", "jul.",
        "aug.", "sep.", "oct.", "nov.", "dec.",
    }

    def __init__(self, min_chars: int | None = None) -> None:
        """Initialize the sentence buffer.

        Args:
            min_chars: Minimum characters before yielding a sentence.
                      Uses config default if not specified.
        """
        settings = get_settings()
        self.min_chars = min_chars or settings.streaming_sentence_min_chars
        self.buffer = ""

    def _is_sentence_end(self, text: str) -> bool:
        """Check if text ends with a complete sentence.

        Args:
            text: Text to check

        Returns:
            True if text ends with sentence-ending punctuation
        """
        if not self.SENTENCE_ENDINGS.search(text):
            return False

        # Check for abbreviations
        text_lower = text.lower().rstrip()
        for abbrev in self.ABBREVIATIONS:
            if text_lower.endswith(abbrev):
                return False

        return True

    def _extract_sentences(self) -> list[str]:
        """Extract complete sentences from the buffer.

        Returns:
            List of complete sentences, buffer is updated to contain
            only the remaining incomplete text
        """
        sentences = []

        # Find sentence boundaries
        # This regex captures sentences ending with .!? followed by whitespace
        pattern = re.compile(r'([^.!?]*[.!?]+["\')\]]*)\s+')

        while True:
            match = pattern.search(self.buffer)
            if not match:
                break

            potential_sentence = match.group(1).strip()

            # Skip if it's an abbreviation
            is_abbreviation = False
            for abbrev in self.ABBREVIATIONS:
                if potential_sentence.lower().endswith(abbrev):
                    is_abbreviation = True
                    break

            if is_abbreviation:
                # Move past this match and continue looking
                # Find the next sentence boundary after this abbreviation
                next_start = match.end()
                next_match = pattern.search(self.buffer, next_start)
                if next_match:
                    # Include everything up to the next sentence end
                    potential_sentence = self.buffer[:next_match.end()].strip()
                    self.buffer = self.buffer[next_match.end():]
                    sentences.append(potential_sentence)
                else:
                    break
            else:
                sentences.append(potential_sentence)
                self.buffer = self.buffer[match.end():]

        return sentences

    async def process_stream(
        self,
        token_stream: AsyncIterator[str],
    ) -> AsyncIterator[str]:
        """Convert token stream to sentence stream.

        Buffers incoming tokens and yields complete sentences
        when detected. Ensures sentences meet minimum character
        requirements for natural TTS output.

        Args:
            token_stream: Async iterator yielding LLM tokens

        Yields:
            Complete sentences suitable for TTS
        """
        self.buffer = ""

        async for token in token_stream:
            self.buffer += token

            # Try to extract complete sentences
            sentences = self._extract_sentences()

            for sentence in sentences:
                # Only yield if we have enough characters
                if len(sentence) >= self.min_chars:
                    yield sentence
                elif sentences:
                    # If sentence is too short, prepend to next
                    self.buffer = sentence + " " + self.buffer

        # Yield any remaining content at the end
        if self.buffer.strip():
            yield self.buffer.strip()

    def add_token(self, token: str) -> str | None:
        """Add a token and return a sentence if complete.

        Synchronous version for callback-based processing.

        Args:
            token: Token to add to buffer

        Returns:
            Complete sentence if one is ready, None otherwise
        """
        self.buffer += token

        sentences = self._extract_sentences()

        if sentences:
            # Return first sentence if it meets minimum length
            sentence = sentences[0]
            if len(sentence) >= self.min_chars:
                # Put remaining sentences back in buffer
                if len(sentences) > 1:
                    self.buffer = " ".join(sentences[1:]) + " " + self.buffer
                return sentence
            else:
                # Sentence too short, put it back
                self.buffer = " ".join(sentences) + " " + self.buffer

        return None

    def flush(self) -> str | None:
        """Flush any remaining content from the buffer.

        Returns:
            Remaining buffer content, or None if empty
        """
        if self.buffer.strip():
            result = self.buffer.strip()
            self.buffer = ""
            return result
        return None

    def reset(self) -> None:
        """Reset the buffer to empty state."""
        self.buffer = ""
