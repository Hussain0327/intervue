"""Resume parsing service with LLM-native structured extraction."""

import io
import json
import logging
from typing import Any

import pdfplumber

from app.core.config import get_settings
from app.schemas.resume import (
    ContactInfo,
    Education,
    Experience,
    ParsedResume,
)

logger = logging.getLogger(__name__)

# JSON schema for LLM extraction
RESUME_EXTRACTION_SCHEMA = {
    "type": "object",
    "properties": {
        "contact": {
            "type": "object",
            "properties": {
                "name": {"type": "string", "description": "Full name of the candidate"},
                "email": {"type": ["string", "null"], "description": "Email address"},
                "phone": {"type": ["string", "null"], "description": "Phone number"},
                "location": {"type": ["string", "null"], "description": "City, State or location"},
                "linkedin": {"type": ["string", "null"], "description": "LinkedIn profile URL"},
            },
            "required": ["name"],
        },
        "summary": {"type": ["string", "null"], "description": "Professional summary or objective"},
        "experiences": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "company": {"type": "string", "description": "Company name"},
                    "title": {"type": "string", "description": "Job title"},
                    "start_date": {"type": ["string", "null"], "description": "Start date"},
                    "end_date": {"type": ["string", "null"], "description": "End date or 'Present'"},
                    "description": {"type": "string", "description": "Role description"},
                    "highlights": {"type": "array", "items": {"type": "string"}},
                },
                "required": ["company", "title"],
            },
        },
        "education": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "institution": {"type": "string", "description": "School or university"},
                    "degree": {"type": "string", "description": "Degree type"},
                    "field": {"type": ["string", "null"], "description": "Field of study"},
                    "graduation_date": {"type": ["string", "null"], "description": "Graduation date"},
                },
                "required": ["institution", "degree"],
            },
        },
        "skills": {"type": "array", "items": {"type": "string"}, "description": "Technical and soft skills"},
        "certifications": {"type": "array", "items": {"type": "string"}, "description": "Certifications"},
    },
    "required": ["contact", "experiences", "education", "skills"],
}

EXTRACTION_PROMPT = """Extract structured information from this resume. Be accurate and only extract information that is explicitly stated in the resume. Do not infer or make up any information.

RESUME TEXT:
{resume_text}

Extract the following:
1. Contact information (name is required, others if available)
2. Professional summary if present
3. All work experiences with company, title, dates, and key achievements
4. Education history with institution, degree, field, and dates
5. Skills (both technical and soft skills)
6. Certifications if any

Return the extracted information in the requested JSON format."""


class ResumeParser:
    """Parse PDF resumes with LLM-powered structured extraction."""

    def __init__(self) -> None:
        self.settings = get_settings()

    def extract_text_from_pdf(self, pdf_bytes: bytes) -> str:
        """Extract raw text from PDF using pdfplumber.

        Handles multi-column layouts and preserves structure where possible.
        """
        text_parts: list[str] = []

        with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text_parts.append(page_text)

        return "\n\n".join(text_parts).strip()

    async def parse(self, pdf_bytes: bytes) -> ParsedResume:
        """Parse a PDF resume and extract structured data.

        Args:
            pdf_bytes: Raw PDF file bytes

        Returns:
            ParsedResume with structured data and raw text fallback
        """
        # Step 1: Extract raw text from PDF
        raw_text = self.extract_text_from_pdf(pdf_bytes)

        if not raw_text:
            raise ValueError("Could not extract text from PDF")

        # Step 2: Use LLM to extract structured data
        try:
            extracted_data = await self._llm_extract(raw_text)
        except Exception as e:
            logger.warning(f"LLM extraction failed, using fallback: {e}")
            # Fallback: return minimal parsed resume with raw text
            return ParsedResume(
                contact=ContactInfo(name="Unknown Candidate"),
                raw_text=raw_text,
            )

        # Step 3: Validate and build ParsedResume
        return self._build_parsed_resume(extracted_data, raw_text)

    async def _llm_extract(self, resume_text: str) -> dict[str, Any]:
        """Extract structured data from resume text using LLM with tool use."""
        settings = self.settings

        if settings.llm_provider == "anthropic":
            return await self._extract_with_anthropic(resume_text)
        else:
            return await self._extract_with_openai(resume_text)

    async def _extract_with_anthropic(self, resume_text: str) -> dict[str, Any]:
        """Extract using Anthropic Claude with tool use."""
        from anthropic import AsyncAnthropic

        client = AsyncAnthropic(api_key=self.settings.anthropic_api_key)

        # Define extraction tool
        tool = {
            "name": "extract_resume_data",
            "description": "Extract structured data from a resume",
            "input_schema": RESUME_EXTRACTION_SCHEMA,
        }

        response = await client.messages.create(
            model=self.settings.llm_model,
            max_tokens=4096,
            tools=[tool],
            tool_choice={"type": "tool", "name": "extract_resume_data"},
            messages=[
                {
                    "role": "user",
                    "content": EXTRACTION_PROMPT.format(resume_text=resume_text),
                }
            ],
        )

        # Extract tool use result
        for block in response.content:
            if block.type == "tool_use" and block.name == "extract_resume_data":
                return block.input  # type: ignore

        raise ValueError("LLM did not return tool use result")

    async def _extract_with_openai(self, resume_text: str) -> dict[str, Any]:
        """Extract using OpenAI with function calling."""
        from openai import AsyncOpenAI

        client = AsyncOpenAI(api_key=self.settings.openai_api_key)

        # Define function for extraction
        function = {
            "name": "extract_resume_data",
            "description": "Extract structured data from a resume",
            "parameters": RESUME_EXTRACTION_SCHEMA,
        }

        response = await client.chat.completions.create(
            model=self.settings.llm_model,
            max_tokens=4096,
            tools=[{"type": "function", "function": function}],
            tool_choice={"type": "function", "function": {"name": "extract_resume_data"}},
            messages=[
                {
                    "role": "user",
                    "content": EXTRACTION_PROMPT.format(resume_text=resume_text),
                }
            ],
        )

        # Extract function call result
        if response.choices[0].message.tool_calls:
            tool_call = response.choices[0].message.tool_calls[0]
            return json.loads(tool_call.function.arguments)

        raise ValueError("LLM did not return function call result")

    def _build_parsed_resume(
        self, extracted: dict[str, Any], raw_text: str
    ) -> ParsedResume:
        """Build a validated ParsedResume from extracted data."""
        # Build contact info
        contact_data = extracted.get("contact", {})
        contact = ContactInfo(
            name=contact_data.get("name", "Unknown"),
            email=contact_data.get("email"),
            phone=contact_data.get("phone"),
            location=contact_data.get("location"),
            linkedin=contact_data.get("linkedin"),
        )

        # Build experiences
        experiences = []
        for exp_data in extracted.get("experiences", []):
            experiences.append(
                Experience(
                    company=exp_data.get("company", "Unknown"),
                    title=exp_data.get("title", "Unknown"),
                    start_date=exp_data.get("start_date"),
                    end_date=exp_data.get("end_date"),
                    description=exp_data.get("description", ""),
                    highlights=exp_data.get("highlights") or [],
                )
            )

        # Build education
        education = []
        for edu_data in extracted.get("education", []):
            education.append(
                Education(
                    institution=edu_data.get("institution", "Unknown"),
                    degree=edu_data.get("degree", "Unknown"),
                    field=edu_data.get("field"),
                    graduation_date=edu_data.get("graduation_date"),
                )
            )

        return ParsedResume(
            contact=contact,
            summary=extracted.get("summary"),
            experiences=experiences,
            education=education,
            skills=extracted.get("skills") or [],
            certifications=extracted.get("certifications") or [],
            raw_text=raw_text,
        )
