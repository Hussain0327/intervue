"""Sandbox code execution via Redis queue + worker."""

import asyncio
import json
import logging
import uuid

import redis.asyncio as aioredis

from app.core.config import get_settings

logger = logging.getLogger(__name__)

QUEUE_KEY = "code_execution_queue"


async def execute_code_sandbox(
    code: str,
    language: str,
    stdin_data: str = "",
    timeout: int = 30,
) -> dict:
    """Push a code execution task to Redis and wait for the result.

    Args:
        code: Source code to execute.
        language: Programming language.
        stdin_data: Optional stdin input.
        timeout: Max seconds to wait for result.

    Returns:
        dict with stdout, stderr, exit_code, timed_out, execution_time_ms.
    """
    settings = get_settings()
    r = aioredis.from_url(settings.redis_url)

    task_id = str(uuid.uuid4())
    task = {
        "task_id": task_id,
        "code": code,
        "language": language,
        "stdin": stdin_data,
    }

    result_channel = f"code_result:{task_id}"

    try:
        # Subscribe to result channel before pushing task
        pubsub = r.pubsub()
        await pubsub.subscribe(result_channel)

        # Push task to queue
        await r.lpush(QUEUE_KEY, json.dumps(task))

        # Wait for result with timeout
        deadline = asyncio.get_event_loop().time() + timeout
        while asyncio.get_event_loop().time() < deadline:
            msg = await pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
            if msg and msg["type"] == "message":
                result = json.loads(msg["data"])
                return result
            await asyncio.sleep(0.1)

        return {
            "stdout": "",
            "stderr": "Execution timed out waiting for worker",
            "exit_code": -1,
            "timed_out": True,
            "execution_time_ms": timeout * 1000,
        }
    finally:
        await pubsub.unsubscribe(result_channel)
        await r.aclose()
