from app.prompts.resume_parser import RESUME_PARSE_SYSTEM, RESUME_PARSE_USER
from app.services.llm import chat_completion_json


async def parse_resume_with_llm(raw_text: str) -> dict:
    messages = [
        {"role": "system", "content": RESUME_PARSE_SYSTEM},
        {"role": "user", "content": RESUME_PARSE_USER.format(resume_text=raw_text[:8000])},
    ]
    return await chat_completion_json(messages)
