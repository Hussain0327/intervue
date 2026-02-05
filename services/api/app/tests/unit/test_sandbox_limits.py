"""Unit tests for sandbox limits configuration."""

import dataclasses

import pytest

# The worker package lives in a separate service — skip if not importable
pytest.importorskip("worker", reason="worker package not on sys.path")

from worker.sandbox.limits import DEFAULT_LIMITS


def test_sandbox_limits_defaults():
    assert DEFAULT_LIMITS.timeout_seconds == 10
    assert DEFAULT_LIMITS.memory_bytes == 128 * 1024 * 1024
    assert DEFAULT_LIMITS.network_disabled is True
    assert DEFAULT_LIMITS.read_only_rootfs is True
    assert DEFAULT_LIMITS.pids_limit == 32


def test_sandbox_limits_frozen():
    with pytest.raises(dataclasses.FrozenInstanceError):
        DEFAULT_LIMITS.timeout_seconds = 999
