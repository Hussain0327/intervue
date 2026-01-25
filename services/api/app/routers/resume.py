"""Resume upload and parsing endpoints."""

import logging

from fastapi import APIRouter, HTTPException, UploadFile

from app.schemas.resume import ParsedResume
from app.services.resume.parser import ResumeParser

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/resume", tags=["resume"])

# Maximum file size: 10MB
MAX_FILE_SIZE = 10 * 1024 * 1024


@router.post("/parse", response_model=ParsedResume)
async def parse_resume(file: UploadFile) -> ParsedResume:
    """Parse a PDF resume and extract structured data.

    Accepts a PDF file upload and returns structured resume data
    extracted using LLM-powered parsing.

    Args:
        file: Uploaded PDF file

    Returns:
        ParsedResume with structured contact, experience, education, skills data

    Raises:
        HTTPException: If file is not PDF, too large, or parsing fails
    """
    # Validate content type
    if file.content_type != "application/pdf":
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are supported. Please upload a PDF resume.",
        )

    # Read file bytes
    pdf_bytes = await file.read()

    # Validate file size
    if len(pdf_bytes) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail="File size must be less than 10MB.",
        )

    if len(pdf_bytes) == 0:
        raise HTTPException(
            status_code=400,
            detail="Uploaded file is empty.",
        )

    try:
        parser = ResumeParser()
        parsed = await parser.parse(pdf_bytes)
        logger.info(f"Successfully parsed resume for: {parsed.contact.name}")
        return parsed
    except ValueError as e:
        logger.warning(f"Resume parsing validation error: {e}")
        raise HTTPException(
            status_code=400,
            detail=str(e),
        )
    except Exception as e:
        logger.exception(f"Resume parsing failed: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to parse resume. Please try again or use a different file.",
        )
