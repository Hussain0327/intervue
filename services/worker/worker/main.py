"""Worker service: Redis queue consumer for code execution tasks."""

import json
import logging
import signal
import sys

import redis

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

REDIS_URL = "redis://localhost:6379"
QUEUE_KEY = "code_execution_queue"

_shutdown = False


def _handle_signal(signum, frame):
    global _shutdown
    logger.info("Received signal %s — shutting down", signum)
    _shutdown = True


def main() -> None:
    signal.signal(signal.SIGTERM, _handle_signal)
    signal.signal(signal.SIGINT, _handle_signal)

    import os
    redis_url = os.environ.get("REDIS_URL", REDIS_URL)
    r = redis.from_url(redis_url)

    logger.info("Worker started. Listening on queue: %s", QUEUE_KEY)

    while not _shutdown:
        try:
            # BRPOP blocks for up to 5 seconds waiting for a task
            item = r.brpop(QUEUE_KEY, timeout=5)
            if item is None:
                continue

            _, raw = item
            task = json.loads(raw)
            task_id = task.get("task_id", "unknown")
            logger.info("Received task: %s", task_id)

            from worker.tasks.run_code import execute_code_task

            result = execute_code_task(
                task_id=task_id,
                code=task.get("code", ""),
                language=task.get("language", "python"),
                stdin_data=task.get("stdin", ""),
            )

            # Publish result to a task-specific channel
            result_channel = f"code_result:{task_id}"
            r.publish(result_channel, json.dumps(result))
            logger.info("Published result for task %s", task_id)

        except Exception:
            logger.exception("Error processing task")

    logger.info("Worker shutdown complete")


if __name__ == "__main__":
    main()
