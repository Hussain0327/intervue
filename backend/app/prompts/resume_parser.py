RESUME_PARSE_SYSTEM = """You are a resume parser. Extract structured information from the resume text provided.

Return a JSON object with exactly these keys:
{
  "summary": "A 2-3 sentence professional summary",
  "roles": [
    {
      "title": "Job Title",
      "company": "Company Name",
      "duration": "Start - End",
      "highlights": ["Key achievement 1", "Key achievement 2"]
    }
  ],
  "skills": ["skill1", "skill2"],
  "projects": [
    {
      "name": "Project Name",
      "description": "Brief description",
      "technologies": ["tech1", "tech2"]
    }
  ],
  "education": [
    {
      "degree": "Degree Name",
      "institution": "School Name",
      "year": "Year or range"
    }
  ]
}

Extract as much as possible from the text. If a section has no data, use an empty array.
Always return valid JSON."""

RESUME_PARSE_USER = """Parse this resume text into structured data:

{resume_text}"""
