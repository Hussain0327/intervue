"""Docker-based sandbox for code execution."""

import logging
import tempfile
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from worker.sandbox.limits import DEFAULT_LIMITS, SandboxLimits

logger = logging.getLogger(__name__)

LANGUAGE_CONFIG: dict[str, dict[str, str]] = {
    "python": {"image": "intervue-sandbox-python", "filename": "solution.py"},
    "javascript": {"image": "intervue-sandbox-node", "filename": "solution.js"},
    "java": {"image": "intervue-sandbox-java", "filename": "Solution.java"},
}


@dataclass
class ExecutionResult:
    """Result of a sandbox code execution."""

    stdout: str
    stderr: str
    exit_code: int
    timed_out: bool
    execution_time_ms: int


def run_code(
    code: str,
    language: str,
    stdin_data: str = "",
    limits: SandboxLimits = DEFAULT_LIMITS,
) -> ExecutionResult:
    """Run code in a Docker sandbox container.

    Args:
        code: Source code to execute.
        language: Programming language (python, javascript, java).
        stdin_data: Optional stdin input.
        limits: Resource limits for the container.

    Returns:
        ExecutionResult with stdout, stderr, exit_code, timing info.
    """
    import docker

    lang_config = LANGUAGE_CONFIG.get(language)
    if not lang_config:
        return ExecutionResult(
            stdout="",
            stderr=f"Unsupported language: {language}",
            exit_code=1,
            timed_out=False,
            execution_time_ms=0,
        )

    client = docker.from_env()
    container = None

    with tempfile.TemporaryDirectory() as tmpdir:
        code_dir = Path(tmpdir) / "code"
        code_dir.mkdir()

        # Write source code
        (code_dir / lang_config["filename"]).write_text(code)
        # Write stdin
        (code_dir / "stdin.txt").write_text(stdin_data)

        start_time = time.monotonic()
        timed_out = False

        try:
            container = client.containers.run(
                image=lang_config["image"],
                volumes={str(code_dir): {"bind": "/sandbox/code", "mode": "ro"}},
                mem_limit=limits.memory_bytes,
                cpu_period=limits.cpu_period,
                cpu_quota=limits.cpu_quota,
                pids_limit=limits.pids_limit,
                network_disabled=limits.network_disabled,
                read_only=limits.read_only_rootfs,
                tmpfs={"/tmp": "size=64M"},
                detach=True,
                stdout=True,
                stderr=True,
            )

            exit_info = container.wait(timeout=limits.timeout_seconds + 2)
            exit_code = exit_info.get("StatusCode", -1)

            stdout = container.logs(stdout=True, stderr=False).decode("utf-8", errors="replace")
            stderr = container.logs(stdout=False, stderr=True).decode("utf-8", errors="replace")

            # Check if it was killed by timeout (exit code 124 from timeout command)
            if exit_code == 124:
                timed_out = True

        except Exception as e:
            if "timed out" in str(e).lower() or "timeout" in str(e).lower():
                timed_out = True
                stdout = ""
                stderr = "Execution timed out"
                exit_code = 124
            else:
                logger.exception("Docker execution error")
                stdout = ""
                stderr = f"Execution error: {e}"
                exit_code = -1
        finally:
            elapsed_ms = int((time.monotonic() - start_time) * 1000)
            if container:
                try:
                    container.remove(force=True)
                except Exception:
                    pass

    return ExecutionResult(
        stdout=stdout[:10_000],  # Cap output size
        stderr=stderr[:10_000],
        exit_code=exit_code,
        timed_out=timed_out,
        execution_time_ms=elapsed_ms,
    )
