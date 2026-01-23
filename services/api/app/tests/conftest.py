import pytest


@pytest.fixture(scope="session")
def anyio_backend():
    """Use asyncio as the async backend for tests."""
    return "asyncio"
