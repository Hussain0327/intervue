import json
import logging

import httpx
from openai import AsyncOpenAI

from app.core.config import settings

logger = logging.getLogger(__name__)

openai_client = AsyncOpenAI(
    api_key=settings.OPENAI_API_KEY,
    timeout=httpx.Timeout(connect=5.0, read=60.0, write=10.0, pool=5.0),
    max_retries=1,
)


async def chat_completion(
    messages: list[dict],
    model: str = "gpt-4o",
    temperature: float = 0.7,
    max_tokens: int = 2000,
) -> str:
    response = await openai_client.chat.completions.create(
        model=model,
        messages=messages,
        temperature=temperature,
        max_tokens=max_tokens,
    )
    return response.choices[0].message.content or ""


async def chat_completion_json(
    messages: list[dict],
    model: str = "gpt-4o",
    temperature: float = 0.3,
    max_tokens: int = 3000,
) -> dict:
    response = await openai_client.chat.completions.create(
        model=model,
        messages=messages,
        temperature=temperature,
        max_tokens=max_tokens,
        response_format={"type": "json_object"},
    )
    content = response.choices[0].message.content or "{}"
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        logger.error("Failed to parse JSON from LLM: %s", content[:200])
        return {}
