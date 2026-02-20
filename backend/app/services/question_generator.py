import logging

from app.prompts.question_generator import QUESTION_GEN_SYSTEM, QUESTION_GEN_USER
from app.services.llm import chat_completion_json

logger = logging.getLogger(__name__)


def _format_roles(roles: list[dict]) -> str:
    lines = []
    for r in roles:
        highlights = ", ".join(r.get("highlights", []))
        lines.append(f"- {r.get('title', 'N/A')} at {r.get('company', 'N/A')} ({r.get('duration', '')}): {highlights}")
    return "\n".join(lines) or "No work experience listed"


def _format_projects(projects: list[dict]) -> str:
    lines = []
    for p in projects:
        techs = ", ".join(p.get("technologies", []))
        lines.append(f"- {p.get('name', 'N/A')}: {p.get('description', '')} [{techs}]")
    return "\n".join(lines) or "No projects listed"


async def generate_questions(structured_resume: dict, num_questions: int = 4) -> list[dict]:
    roles = structured_resume.get("roles", [])
    skills = structured_resume.get("skills", [])
    projects = structured_resume.get("projects", [])
    summary = structured_resume.get("summary", "")

    messages = [
        {
            "role": "system",
            "content": QUESTION_GEN_SYSTEM.format(num_questions=num_questions),
        },
        {
            "role": "user",
            "content": QUESTION_GEN_USER.format(
                summary=summary,
                roles=_format_roles(roles),
                skills=", ".join(skills) if skills else "Not specified",
                projects=_format_projects(projects),
            ),
        },
    ]

    result = await chat_completion_json(messages)
    questions = result.get("questions", [])

    if not questions:
        raise ValueError("LLM returned no questions — cannot start interview")

    if len(questions) < num_questions:
        logger.warning(
            "Requested %d questions but LLM returned %d", num_questions, len(questions)
        )

    # Ensure we have the right number
    return questions[:num_questions]
