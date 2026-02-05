"""Task for executing code in sandbox and publishing results."""

import json
import logging

from worker.sandbox.docker_runner import run_code

logger = logging.getLogger(__name__)


def execute_code_task(
    task_id: str,
    code: str,
    language: str,
    stdin_data: str = "",
) -> dict:
    """Execute code in sandbox and return results.

    Args:
        task_id: Unique task identifier.
        code: Source code to execute.
        language: Programming language.
        stdin_data: Optional stdin input.

    Returns:
        dict with stdout, stderr, exit_code, timed_out, execution_time_ms.
    """
    logger.info("Executing code task %s (language=%s)", task_id, language)

    result = run_code(code=code, language=language, stdin_data=stdin_data)

    return {
        "task_id": task_id,
        "stdout": result.stdout,
        "stderr": result.stderr,
        "exit_code": result.exit_code,
        "timed_out": result.timed_out,
        "execution_time_ms": result.execution_time_ms,
    }
