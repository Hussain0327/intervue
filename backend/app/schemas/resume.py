from datetime import datetime

from pydantic import BaseModel


class StructuredResume(BaseModel):
    roles: list[dict] = []
    skills: list[str] = []
    projects: list[dict] = []
    education: list[dict] = []
    summary: str = ""


class ResumeResponse(BaseModel):
    id: str
    filename: str
    structured_data: StructuredResume | dict | None
    created_at: datetime

    @classmethod
    def from_resume(cls, resume):
        return cls(
            id=str(resume.id),
            filename=resume.filename,
            structured_data=resume.structured_data,
            created_at=resume.created_at,
        )
