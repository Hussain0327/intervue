"""Code evaluator that uses AI to assess submitted solutions."""

import logging
import re

from app.schemas.coding import (
    CodeEvaluationAnalysis,
    CodeEvaluationResult,
    CodeSubmission,
    CodingProblem,
)
from app.services.llm.client import LLMMessage, get_llm_client

logger = logging.getLogger(__name__)

CODE_EVALUATION_PROMPT = """You are an expert code reviewer evaluating a candidate's solution to a coding problem.

## Problem
**Title:** {title}
**Difficulty:** {difficulty}

**Description:**
{description}

**Examples:**
{examples}

**Constraints:**
{constraints}

## Candidate's Solution
**Language:** {language}

```{language}
{code}
```

## Evaluation Instructions

Carefully analyze the candidate's code and evaluate it on these criteria:

1. **Correctness (0-100)**: Does the solution correctly solve the problem?
   - Handles all examples correctly
   - Handles edge cases (empty input, single element, large input, etc.)
   - No logical errors or bugs

2. **Edge Case Handling (0-100)**: Does the code handle edge cases?
   - Null/undefined inputs
   - Empty arrays/strings
   - Boundary conditions
   - Special cases mentioned in constraints

3. **Code Quality (0-100)**: Is the code well-written?
   - Clean, readable code
   - Good variable naming
   - Appropriate use of language features
   - No unnecessary complexity

4. **Complexity (0-100)**: Is the solution efficient?
   - Optimal or near-optimal time complexity
   - Optimal or near-optimal space complexity
   - Good understanding of algorithmic trade-offs

## Response Format

Respond in EXACTLY this format:

CORRECT: [true/false - does the solution work correctly for the given problem?]
CORRECTNESS_SCORE: [0-100]
EDGE_CASE_SCORE: [0-100]
CODE_QUALITY_SCORE: [0-100]
COMPLEXITY_SCORE: [0-100]
OVERALL_SCORE: [0-100 - weighted average with correctness having highest weight]
FEEDBACK: [2-4 sentences of constructive feedback. Start with what they did well, then mention areas for improvement. Be specific about the code.]"""


def _format_examples(examples: list) -> str:
    """Format examples for the prompt."""
    formatted = []
    for i, example in enumerate(examples, 1):
        formatted.append(f"Example {i}:")
        formatted.append(f"  Input: {example.input}")
        formatted.append(f"  Output: {example.output}")
        if example.explanation:
            formatted.append(f"  Explanation: {example.explanation}")
    return "\n".join(formatted)


def _format_constraints(constraints: list[str]) -> str:
    """Format constraints for the prompt."""
    return "\n".join(f"- {c}" for c in constraints)


async def evaluate_code(
    problem: CodingProblem,
    submission: CodeSubmission,
) -> CodeEvaluationResult:
    """Evaluate a code submission using AI.

    Args:
        problem: The coding problem being solved
        submission: The candidate's code submission

    Returns:
        Evaluation result with correctness, score, and feedback
    """
    llm_client = get_llm_client()

    # Build the evaluation prompt
    prompt = CODE_EVALUATION_PROMPT.format(
        title=problem.title,
        difficulty=problem.difficulty,
        description=problem.description,
        examples=_format_examples(problem.examples),
        constraints=_format_constraints(problem.constraints),
        language=submission.language,
        code=submission.code,
    )

    try:
        result = await llm_client.generate(
            messages=[LLMMessage(role="user", content=prompt)],
            system_prompt="You are an expert code reviewer. Be fair but thorough in your evaluation. Always respond in the exact format requested.",
            max_tokens=800,
            temperature=0.3,  # Lower temperature for consistent scoring
        )

        response_text = result.text

        # Parse the response
        correct = False
        correctness_score = 0
        edge_case_score = 0
        code_quality_score = 0
        complexity_score = 0
        overall_score = 0
        feedback = "Unable to generate feedback."

        lines = response_text.strip().split("\n")
        for line in lines:
            line = line.strip()
            if line.startswith("CORRECT:"):
                correct_str = line.replace("CORRECT:", "").strip().lower()
                correct = correct_str in ("true", "yes")
            elif line.startswith("CORRECTNESS_SCORE:"):
                try:
                    correctness_score = int(re.search(r"\d+", line).group())
                except (AttributeError, ValueError):
                    correctness_score = 0
            elif line.startswith("EDGE_CASE_SCORE:"):
                try:
                    edge_case_score = int(re.search(r"\d+", line).group())
                except (AttributeError, ValueError):
                    edge_case_score = 0
            elif line.startswith("CODE_QUALITY_SCORE:"):
                try:
                    code_quality_score = int(re.search(r"\d+", line).group())
                except (AttributeError, ValueError):
                    code_quality_score = 0
            elif line.startswith("COMPLEXITY_SCORE:"):
                try:
                    complexity_score = int(re.search(r"\d+", line).group())
                except (AttributeError, ValueError):
                    complexity_score = 0
            elif line.startswith("OVERALL_SCORE:"):
                try:
                    overall_score = int(re.search(r"\d+", line).group())
                except (AttributeError, ValueError):
                    overall_score = 0
            elif line.startswith("FEEDBACK:"):
                feedback = line.replace("FEEDBACK:", "").strip()
                # Get continuation lines
                idx = lines.index(line)
                for continuation in lines[idx + 1:]:
                    continuation = continuation.strip()
                    if not any(continuation.startswith(prefix) for prefix in [
                        "CORRECT:", "CORRECTNESS_SCORE:", "EDGE_CASE_SCORE:",
                        "CODE_QUALITY_SCORE:", "COMPLEXITY_SCORE:", "OVERALL_SCORE:"
                    ]):
                        feedback += " " + continuation
                    else:
                        break

        # Calculate overall score if not provided or seems wrong
        if overall_score == 0 and correctness_score > 0:
            # Weighted average: correctness (40%), edge cases (20%), quality (20%), complexity (20%)
            overall_score = int(
                correctness_score * 0.4 +
                edge_case_score * 0.2 +
                code_quality_score * 0.2 +
                complexity_score * 0.2
            )

        # Ensure correct flag matches score
        if overall_score >= 70 and correctness_score >= 60:
            correct = True
        elif correctness_score < 50:
            correct = False

        logger.info(
            f"Code evaluation complete: problem={problem.id}, "
            f"correct={correct}, score={overall_score}"
        )

        return CodeEvaluationResult(
            correct=correct,
            score=float(overall_score),
            feedback=feedback.strip(),
            analysis=CodeEvaluationAnalysis(
                correctness=correctness_score,
                edge_case_handling=edge_case_score,
                code_quality=code_quality_score,
                complexity=complexity_score,
            ),
        )

    except Exception as e:
        logger.exception("Error evaluating code submission")
        return CodeEvaluationResult(
            correct=False,
            score=0,
            feedback=f"Evaluation failed due to an error: {str(e)}",
            analysis=None,
        )
