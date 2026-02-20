from app.prompts.evaluator import EVALUATE_ANSWER_SYSTEM, EVALUATE_ANSWER_USER
from app.prompts.scorecard import SCORECARD_SYSTEM, SCORECARD_USER
from app.services.llm import chat_completion_json


async def evaluate_answer(
    question: str,
    answer: str,
    context: str = "",
) -> dict:
    messages = [
        {"role": "system", "content": EVALUATE_ANSWER_SYSTEM},
        {
            "role": "user",
            "content": EVALUATE_ANSWER_USER.format(
                question=question,
                answer=answer,
                context=context or "This is the first question.",
            ),
        },
    ]
    return await chat_completion_json(messages, temperature=0.3)


async def generate_scorecard(evaluations: list[dict]) -> dict:
    eval_text = ""
    for i, ev in enumerate(evaluations):
        eval_text += f"\n--- Question {i + 1} ---\n"
        eval_text += f"Question: {ev.get('question_text', 'N/A')}\n"
        eval_text += f"Answer Summary: {ev.get('answer_summary', 'N/A')}\n"
        eval_text += f"Scores: {ev.get('scores', {})}\n"
        eval_text += f"Overall: {ev.get('overall_score', 'N/A')}\n"
        eval_text += f"Feedback: {ev.get('feedback', 'N/A')}\n"

    messages = [
        {"role": "system", "content": SCORECARD_SYSTEM},
        {"role": "user", "content": SCORECARD_USER.format(evaluations=eval_text)},
    ]
    return await chat_completion_json(messages, temperature=0.3)
