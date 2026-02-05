"""Resource limits for sandbox code execution."""

from dataclasses import dataclass


@dataclass(frozen=True)
class SandboxLimits:
    """Resource constraints for code execution containers."""

    timeout_seconds: int = 10
    memory_bytes: int = 128 * 1024 * 1024  # 128 MB
    cpu_period: int = 100_000
    cpu_quota: int = 50_000  # 50% of one core
    pids_limit: int = 32
    network_disabled: bool = True
    read_only_rootfs: bool = True


DEFAULT_LIMITS = SandboxLimits()
