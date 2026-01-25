"""Resume parsing schemas for structured extraction."""

from pydantic import BaseModel, Field


class ContactInfo(BaseModel):
    """Contact information extracted from resume."""

    name: str = Field(description="Full name of the candidate")
    email: str | None = Field(default=None, description="Email address")
    phone: str | None = Field(default=None, description="Phone number")
    location: str | None = Field(default=None, description="City, State or location")
    linkedin: str | None = Field(default=None, description="LinkedIn profile URL")


class Experience(BaseModel):
    """Work experience entry."""

    company: str = Field(description="Company or organization name")
    title: str = Field(description="Job title or role")
    start_date: str | None = Field(default=None, description="Start date (e.g., 'Jan 2020')")
    end_date: str | None = Field(default=None, description="End date (e.g., 'Present' or 'Dec 2023')")
    description: str = Field(default="", description="Role description or responsibilities")
    highlights: list[str] = Field(default_factory=list, description="Key achievements or bullet points")


class Education(BaseModel):
    """Education entry."""

    institution: str = Field(description="School, university, or institution name")
    degree: str = Field(description="Degree type (e.g., 'Bachelor of Science')")
    field: str | None = Field(default=None, description="Field of study or major")
    graduation_date: str | None = Field(default=None, description="Graduation date or expected graduation")


class ParsedResume(BaseModel):
    """Complete parsed resume with structured data."""

    contact: ContactInfo = Field(description="Contact information")
    summary: str | None = Field(default=None, description="Professional summary or objective")
    experiences: list[Experience] = Field(default_factory=list, description="Work experience entries")
    education: list[Education] = Field(default_factory=list, description="Education entries")
    skills: list[str] = Field(default_factory=list, description="Technical and soft skills")
    certifications: list[str] = Field(default_factory=list, description="Certifications and licenses")
    raw_text: str = Field(description="Original raw text from PDF for fallback context")

    def to_interview_context(self) -> str:
        """Format resume data for interview prompts."""
        sections = []

        # Name and contact
        sections.append(f"CANDIDATE: {self.contact.name}")
        if self.contact.location:
            sections.append(f"Location: {self.contact.location}")

        # Summary
        if self.summary:
            sections.append(f"\nPROFESSIONAL SUMMARY:\n{self.summary}")

        # Experience
        if self.experiences:
            sections.append("\nWORK EXPERIENCE:")
            for exp in self.experiences:
                date_range = ""
                if exp.start_date:
                    date_range = f" ({exp.start_date} - {exp.end_date or 'Present'})"
                sections.append(f"- {exp.title} at {exp.company}{date_range}")
                if exp.description:
                    sections.append(f"  {exp.description}")
                for highlight in exp.highlights[:3]:  # Limit to top 3 highlights
                    sections.append(f"  * {highlight}")

        # Education
        if self.education:
            sections.append("\nEDUCATION:")
            for edu in self.education:
                field_str = f" in {edu.field}" if edu.field else ""
                date_str = f" ({edu.graduation_date})" if edu.graduation_date else ""
                sections.append(f"- {edu.degree}{field_str} from {edu.institution}{date_str}")

        # Skills
        if self.skills:
            sections.append(f"\nSKILLS: {', '.join(self.skills[:15])}")  # Limit to top 15

        # Certifications
        if self.certifications:
            sections.append(f"\nCERTIFICATIONS: {', '.join(self.certifications)}")

        return "\n".join(sections)
