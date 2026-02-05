"""Integration tests for /resume/parse endpoint."""

import uuid
from unittest.mock import AsyncMock, patch

import pytest

from app.core.security import create_access_token, hash_password
from app.models.user import User


async def _create_user_and_headers(db_session):
    user = User(
        email=f"{uuid.uuid4().hex[:8]}@resume.com",
        hashed_password=hash_password("password123"),
        full_name="Resume Tester",
    )
    db_session.add(user)
    await db_session.flush()
    token = create_access_token(str(user.id), user.email)
    return user, {"Authorization": f"Bearer {token}"}


@pytest.mark.anyio
async def test_non_pdf_rejected(app_client, db_engine):
    from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

    factory = async_sessionmaker(db_engine, class_=AsyncSession, expire_on_commit=False)
    async with factory() as session:
        user, headers = await _create_user_and_headers(session)
        await session.commit()

    r = await app_client.post(
        "/resume/parse",
        headers=headers,
        files={"file": ("resume.txt", b"plain text", "text/plain")},
    )
    assert r.status_code == 400
    assert "PDF" in r.json()["detail"]


@pytest.mark.anyio
async def test_empty_file_rejected(app_client, db_engine):
    from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

    factory = async_sessionmaker(db_engine, class_=AsyncSession, expire_on_commit=False)
    async with factory() as session:
        user, headers = await _create_user_and_headers(session)
        await session.commit()

    r = await app_client.post(
        "/resume/parse",
        headers=headers,
        files={"file": ("resume.pdf", b"", "application/pdf")},
    )
    assert r.status_code == 400


@pytest.mark.anyio
async def test_oversized_file_rejected(app_client, db_engine):
    from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

    factory = async_sessionmaker(db_engine, class_=AsyncSession, expire_on_commit=False)
    async with factory() as session:
        user, headers = await _create_user_and_headers(session)
        await session.commit()

    big_content = b"X" * (10 * 1024 * 1024 + 1)
    r = await app_client.post(
        "/resume/parse",
        headers=headers,
        files={"file": ("resume.pdf", big_content, "application/pdf")},
    )
    assert r.status_code == 400


@pytest.mark.anyio
async def test_auth_required(app_client):
    r = await app_client.post(
        "/resume/parse",
        files={"file": ("resume.pdf", b"%PDF-1.4 test", "application/pdf")},
    )
    assert r.status_code in (401, 403)


@pytest.mark.anyio
async def test_success_with_mocked_parser(app_client, db_engine):
    from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

    factory = async_sessionmaker(db_engine, class_=AsyncSession, expire_on_commit=False)
    async with factory() as session:
        user, headers = await _create_user_and_headers(session)
        await session.commit()

    mock_resume = {
        "contact": {"name": "Test User", "email": "test@test.com", "phone": None, "location": None, "linkedin": None, "github": None, "website": None},
        "summary": "Test summary",
        "experiences": [],
        "education": [],
        "skills": [],
        "certifications": [],
        "raw_text": "Test resume content",
    }

    with patch("app.routers.resume.ResumeParser") as mock_parser:
        mock_instance = mock_parser.return_value
        mock_instance.parse = AsyncMock()
        from app.schemas.resume import ParsedResume
        mock_instance.parse.return_value = ParsedResume(**mock_resume)

        r = await app_client.post(
            "/resume/parse",
            headers=headers,
            files={"file": ("resume.pdf", b"%PDF-1.4 test content", "application/pdf")},
        )
        assert r.status_code == 200
        body = r.json()
        assert body["contact"]["name"] == "Test User"
