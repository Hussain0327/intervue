import asyncio
import time
from collections.abc import AsyncIterator
from dataclasses import dataclass
from typing import Literal, TYPE_CHECKING

import httpx

from app.core.config import get_settings

if TYPE_CHECKING:
    from anthropic import AsyncAnthropic
    from openai import AsyncOpenAI

LLMProvider = Literal["anthropic", "openai"]


@dataclass
class LLMMessage:
    """A message in the conversation."""

    role: Literal["user", "assistant", "system"]
    content: str


@dataclass
class LLMResult:
    """Result from LLM generation."""

    text: str
    latency_ms: int
    provider: str
    model: str


class LLMClient:
    """Unified LLM client supporting Anthropic and OpenAI."""

    def __init__(
        self,
        provider: LLMProvider | None = None,
        model: str | None = None,
    ) -> None:
        # Get fresh settings each time
        settings = get_settings()

        self.provider = provider or settings.llm_provider
        self.model = model or settings.llm_model
        self.max_tokens = settings.llm_max_tokens
        self.temperature = settings.llm_temperature
        self.timeout = settings.llm_timeout

        self.anthropic: "AsyncAnthropic | None" = None
        self.openai: "AsyncOpenAI | None" = None

        # Only import and initialize the client we need with timeout
        if self.provider == "anthropic":
            from anthropic import AsyncAnthropic
            self.anthropic = AsyncAnthropic(
                api_key=settings.anthropic_api_key,
                timeout=httpx.Timeout(self.timeout, connect=10.0),
            )
        else:
            from openai import AsyncOpenAI
            self.openai = AsyncOpenAI(
                api_key=settings.openai_api_key,
                timeout=httpx.Timeout(self.timeout, connect=10.0),
            )

    async def generate(
        self,
        messages: list[LLMMessage],
        system_prompt: str | None = None,
        max_tokens: int | None = None,
        temperature: float | None = None,
    ) -> LLMResult:
        """Generate a response from the LLM.

        Args:
            messages: Conversation history
            system_prompt: System prompt (optional)
            max_tokens: Override default max tokens
            temperature: Override default temperature

        Returns:
            LLMResult with generated text and metadata
        """
        max_tokens = max_tokens or self.max_tokens
        temperature = temperature or self.temperature

        start_time = time.perf_counter()

        if self.provider == "anthropic":
            text = await self._generate_anthropic(
                messages, system_prompt, max_tokens, temperature
            )
        else:
            text = await self._generate_openai(
                messages, system_prompt, max_tokens, temperature
            )

        latency_ms = int((time.perf_counter() - start_time) * 1000)

        return LLMResult(
            text=text,
            latency_ms=latency_ms,
            provider=self.provider,
            model=self.model,
        )

    async def _generate_anthropic(
        self,
        messages: list[LLMMessage],
        system_prompt: str | None,
        max_tokens: int,
        temperature: float,
    ) -> str:
        """Generate using Anthropic Claude API."""
        # Convert messages to Anthropic format
        anthropic_messages = [
            {"role": m.role if m.role != "system" else "user", "content": m.content}
            for m in messages
            if m.role != "system"
        ]

        response = await self.anthropic.messages.create(  # type: ignore
            model=self.model,
            max_tokens=max_tokens,
            temperature=temperature,
            system=system_prompt or "",
            messages=anthropic_messages,
        )

        return response.content[0].text

    async def _generate_openai(
        self,
        messages: list[LLMMessage],
        system_prompt: str | None,
        max_tokens: int,
        temperature: float,
    ) -> str:
        """Generate using OpenAI API."""
        # Convert messages to OpenAI format
        openai_messages = []
        if system_prompt:
            openai_messages.append({"role": "system", "content": system_prompt})

        for m in messages:
            openai_messages.append({"role": m.role, "content": m.content})

        response = await self.openai.chat.completions.create(  # type: ignore
            model=self.model,
            messages=openai_messages,
            max_tokens=max_tokens,
            temperature=temperature,
        )

        return response.choices[0].message.content or ""

    async def generate_stream(
        self,
        messages: list[LLMMessage],
        system_prompt: str | None = None,
        max_tokens: int | None = None,
        temperature: float | None = None,
    ) -> AsyncIterator[str]:
        """Stream LLM response token by token.

        Args:
            messages: Conversation history
            system_prompt: System prompt (optional)
            max_tokens: Override default max tokens
            temperature: Override default temperature

        Yields:
            Text chunks as they're generated
        """
        max_tokens = max_tokens or self.max_tokens
        temperature = temperature or self.temperature

        if self.provider == "anthropic":
            async for chunk in self._generate_stream_anthropic(
                messages, system_prompt, max_tokens, temperature
            ):
                yield chunk
        else:
            async for chunk in self._generate_stream_openai(
                messages, system_prompt, max_tokens, temperature
            ):
                yield chunk

    async def _generate_stream_anthropic(
        self,
        messages: list[LLMMessage],
        system_prompt: str | None,
        max_tokens: int,
        temperature: float,
    ) -> AsyncIterator[str]:
        """Stream using Anthropic Claude API."""
        # Convert messages to Anthropic format
        anthropic_messages = [
            {"role": m.role if m.role != "system" else "user", "content": m.content}
            for m in messages
            if m.role != "system"
        ]

        async with self.anthropic.messages.stream(  # type: ignore
            model=self.model,
            max_tokens=max_tokens,
            temperature=temperature,
            system=system_prompt or "",
            messages=anthropic_messages,
        ) as stream:
            async for text in stream.text_stream:
                yield text

    async def _generate_stream_openai(
        self,
        messages: list[LLMMessage],
        system_prompt: str | None,
        max_tokens: int,
        temperature: float,
    ) -> AsyncIterator[str]:
        """Stream using OpenAI API."""
        # Convert messages to OpenAI format
        openai_messages = []
        if system_prompt:
            openai_messages.append({"role": "system", "content": system_prompt})

        for m in messages:
            openai_messages.append({"role": m.role, "content": m.content})

        stream = await self.openai.chat.completions.create(  # type: ignore
            model=self.model,
            messages=openai_messages,
            max_tokens=max_tokens,
            temperature=temperature,
            stream=True,
        )

        async for chunk in stream:
            if chunk.choices and chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content


def get_llm_client() -> LLMClient:
    """Create a new LLM client (not cached to respect config changes)."""
    return LLMClient()
