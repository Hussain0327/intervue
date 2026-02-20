import asyncio
import os
import re
import uuid

import pdfplumber
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import load_only

from app.core.auth import get_current_user
from app.core.config import settings
from app.core.database import get_db
from app.core.redis import cache_resume, compute_file_hash, get_cached_resume
from app.models.resume import Resume
from app.models.user import User
from app.schemas.resume import ResumeResponse
from app.services.resume_parser import parse_resume_with_llm

import logging

logger = logging.getLogger(__name__)

router = APIRouter()

_PDF_MAGIC = b"%PDF"


def _sanitize_filename(filename: str) -> str:
    """Remove unsafe characters from filename and truncate."""
    return re.sub(r"[^\w\s\-.]", "", filename)[:255]


def _write_file(file_path: str, content: bytes) -> None:
    with open(file_path, "wb") as f:
        f.write(content)


def _extract_pdf_text(file_path: str) -> str:
    raw_text = ""
    with pdfplumber.open(file_path) as pdf:
        for page in pdf.pages:
            text = page.extract_text()
            if text:
                raw_text += text + "\n"
    return raw_text


@router.post("/upload", response_model=ResumeResponse)
async def upload_resume(
    file: UploadFile,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted")

    content = await file.read()

    if len(content) > settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large")

    # PDF magic-bytes validation
    if not content[:4].startswith(_PDF_MAGIC):
        raise HTTPException(status_code=400, detail="File does not appear to be a valid PDF")

    # Sanitize filename
    safe_filename = _sanitize_filename(file.filename)
    if not safe_filename:
        safe_filename = "upload.pdf"

    # Check Redis cache (graceful degradation on Redis failure)
    file_hash = compute_file_hash(content)
    cached = None
    try:
        cached = await get_cached_resume(file_hash)
    except Exception:
        logger.warning("Redis unavailable for resume cache read, proceeding without cache")

    # Save file to disk (non-blocking)
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    file_id = str(uuid.uuid4())
    file_path = os.path.join(settings.UPLOAD_DIR, f"{file_id}.pdf")
    await asyncio.to_thread(_write_file, file_path, content)

    # Extract text from PDF (non-blocking)
    try:
        raw_text = await asyncio.to_thread(_extract_pdf_text, file_path)
    except Exception:
        raise HTTPException(status_code=400, detail="Could not parse PDF")

    if not raw_text.strip():
        raise HTTPException(status_code=400, detail="No text found in PDF")

    # Structure with LLM (or use cache)
    if cached:
        structured_data = cached
    else:
        structured_data = await parse_resume_with_llm(raw_text)
        try:
            await cache_resume(file_hash, structured_data)
        except Exception:
            logger.warning("Redis unavailable for resume cache write")

    resume = Resume(
        user_id=user.id,
        filename=safe_filename,
        raw_text=raw_text,
        structured_data=structured_data,
        file_path=file_path,
    )
    db.add(resume)
    await db.commit()
    await db.refresh(resume)

    return ResumeResponse.from_resume(resume)


@router.get("", response_model=list[ResumeResponse])
async def list_resumes(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    result = await db.execute(
        select(Resume)
        .where(Resume.user_id == user.id)
        .options(load_only(Resume.id, Resume.filename, Resume.structured_data, Resume.created_at))
        .order_by(Resume.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    resumes = result.scalars().all()
    return [ResumeResponse.from_resume(r) for r in resumes]


@router.get("/{resume_id}", response_model=ResumeResponse)
async def get_resume(
    resume_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Resume).where(Resume.id == resume_id, Resume.user_id == user.id)
    )
    resume = result.scalar_one_or_none()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    return ResumeResponse.from_resume(resume)
