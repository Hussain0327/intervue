"""Evaluation service for scoring interview rounds."""

import logging
from dataclasses import dataclass

from app.services.llm.client import LLMClient, LLMMessage, get_llm_client
from app.services.orchestrator.state import InterviewState

logger = logging.getLogger(__name__)

# Rubrics for each interview round
ROUND_RUBRICS = {
    1: """BEHAVIORAL INTERVIEW EVALUATION RUBRIC

Score the candidate on a scale of 0-100 based on these criteria:

1. STAR Method Usage (25 points)
   - Clearly describes Situation and Task
   - Explains specific Actions taken
   - Provides measurable Results

2. Communication Skills (25 points)
   - Clear and articulate responses
   - Appropriate level of detail
   - Good listening and comprehension

3. Self-Awareness & Growth Mindset (25 points)
   - Acknowledges mistakes and learning
   - Shows reflection on experiences
   - Demonstrates adaptability

4. Culture Fit & Soft Skills (25 points)
   - Teamwork and collaboration
   - Leadership potential
   - Conflict resolution ability

PASSING SCORE: 70/100""",

    2: """CODING CHALLENGE EVALUATION RUBRIC

Score the candidate on a scale of 0-100 based on these criteria:

1. Problem Understanding (15 points)
   - Correctly understood the problem
   - Asked clarifying questions
   - Identified edge cases

2. Approach & Strategy (20 points)
   - Explained strategy before coding
   - Logical problem breakdown
   - Appropriate data structure selection

3. Code Correctness (25 points)
   - Solution actually works
   - Handles edge cases correctly
   - No logical errors or bugs

4. Complexity Analysis (20 points)
   - Accurate time complexity analysis
   - Accurate space complexity analysis
   - Understands trade-offs

5. Communication (20 points)
   - Clear explanation of thought process
   - Articulates reasoning while coding
   - Handles hints/feedback constructively

PASSING SCORE: 70/100""",

    3: """SYSTEM DESIGN + CODING EVALUATION RUBRIC

Score the candidate on a scale of 0-100 based on these criteria:

1. System Design (40 points)
   - Requirements clarification (5 pts)
   - High-level architecture (10 pts)
   - Component design (10 pts)
   - Scalability considerations (10 pts)
   - Trade-off discussion (5 pts)

2. Coding Implementation (35 points)
   - Problem understanding (10 pts)
   - Solution correctness (15 pts)
   - Code quality/clarity (10 pts)

3. Communication & Collaboration (25 points)
   - Clear articulation of ideas
   - Response to feedback
   - Technical depth

PASSING SCORE: 70/100""",
}


@dataclass
class EvaluationResult:
    """Result from evaluating an interview round."""

    round: int
    score: float
    passed: bool
    feedback: str


EVALUATION_PROMPT_TEMPLATE = """You are an expert technical interviewer evaluator. Analyze the following interview transcript and provide an objective evaluation.

INTERVIEW ROUND: {round_number} - {round_title}

RUBRIC:
{rubric}

INTERVIEW TRANSCRIPT:
{transcript}
{code_section}
EVALUATION INSTRUCTIONS:
1. Carefully review the entire conversation{code_instruction}
2. Score each rubric criterion objectively
3. Calculate the total score (0-100)
4. Determine if the candidate passed (70+ = pass)
5. Provide constructive feedback

Respond in EXACTLY this format:
SCORE: [number 0-100]
PASSED: [true/false]
FEEDBACK: [2-4 sentences of constructive feedback highlighting strengths and areas for improvement]"""


async def evaluate_interview(state: InterviewState) -> EvaluationResult:
    """Evaluate an interview session and return scores.

    Args:
        state: The current interview state with conversation history

    Returns:
        EvaluationResult with score, pass/fail, and feedback
    """
    current_round = state.current_round
    rubric = ROUND_RUBRICS.get(current_round, ROUND_RUBRICS[1])

    # Get round title
    from app.services.orchestrator.prompts import ROUND_CONFIG
    round_config = ROUND_CONFIG.get(current_round, ROUND_CONFIG[1])
    round_title = round_config["title"]

    # Format transcript for evaluation
    transcript_lines = []
    for msg in state.conversation_history:
        role = "Interviewer" if msg.role == "assistant" else "Candidate"
        transcript_lines.append(f"{role}: {msg.content}")

    transcript = "\n\n".join(transcript_lines)

    if not transcript.strip():
        return EvaluationResult(
            round=current_round,
            score=0,
            passed=False,
            feedback="No interview content to evaluate. The interview appears to have ended without any meaningful conversation.",
        )

    # Add code section for coding rounds
    code_section = ""
    code_instruction = ""
    if current_round == 2 and state.submitted_code:
        code_section = f"""

SUBMITTED CODE ({state.submitted_language or 'unknown'}):
```
{state.submitted_code}
```

CODING PROBLEM: {state.current_problem.title if state.current_problem else 'Unknown'}
"""
        code_instruction = " and the submitted code"

    # Build evaluation prompt
    evaluation_prompt = EVALUATION_PROMPT_TEMPLATE.format(
        round_number=current_round,
        round_title=round_title,
        rubric=rubric,
        transcript=transcript,
        code_section=code_section,
        code_instruction=code_instruction,
    )

    # Get LLM client and generate evaluation
    llm_client = get_llm_client()

    try:
        result = await llm_client.generate(
            messages=[LLMMessage(role="user", content=evaluation_prompt)],
            system_prompt="You are an objective interview evaluator. Always respond in the exact format requested.",
            max_tokens=500,
            temperature=0.3,  # Lower temperature for more consistent scoring
        )

        response_text = result.text

        # Parse the response
        score = 0.0
        passed = False
        feedback = "Unable to generate feedback."

        lines = response_text.strip().split("\n")
        for line in lines:
            line = line.strip()
            if line.startswith("SCORE:"):
                try:
                    score_str = line.replace("SCORE:", "").strip()
                    score = float(score_str.split()[0])  # Handle "85/100" format
                except (ValueError, IndexError):
                    score = 0.0
            elif line.startswith("PASSED:"):
                passed_str = line.replace("PASSED:", "").strip().lower()
                passed = passed_str in ("true", "yes", "pass")
            elif line.startswith("FEEDBACK:"):
                feedback = line.replace("FEEDBACK:", "").strip()
                # Get any continuation lines
                idx = lines.index(line)
                for continuation in lines[idx + 1:]:
                    if not continuation.strip().startswith(("SCORE:", "PASSED:")):
                        feedback += " " + continuation.strip()
                    else:
                        break

        # Ensure passed status matches score threshold
        passed = score >= 70

        logger.info(
            f"Evaluation complete for round {current_round}: "
            f"score={score}, passed={passed}"
        )

        return EvaluationResult(
            round=current_round,
            score=score,
            passed=passed,
            feedback=feedback.strip(),
        )

    except Exception as e:
        logger.exception("Error during interview evaluation")
        return EvaluationResult(
            round=current_round,
            score=0,
            passed=False,
            feedback=f"Evaluation failed due to an error: {str(e)}",
        )
