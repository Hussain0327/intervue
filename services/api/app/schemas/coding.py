"""Schemas for coding challenge feature."""

from typing import Literal

from pydantic import BaseModel, Field


class Example(BaseModel):
    """Example test case for a coding problem."""

    input: str
    output: str
    explanation: str | None = None


class CodingProblem(BaseModel):
    """A coding challenge problem."""

    id: str
    title: str
    difficulty: Literal["easy", "medium", "hard"]
    description: str
    examples: list[Example]
    constraints: list[str]
    starter_code: dict[str, str]  # language -> starter code
    tags: list[str]


class CodeSubmission(BaseModel):
    """Code submission from the candidate."""

    problem_id: str
    code: str
    language: str


class CodeEvaluationAnalysis(BaseModel):
    """Detailed analysis of code evaluation."""

    correctness: int = Field(ge=0, le=100)
    edge_case_handling: int = Field(ge=0, le=100)
    code_quality: int = Field(ge=0, le=100)
    complexity: int = Field(ge=0, le=100)


class CodeEvaluationResult(BaseModel):
    """Result of evaluating submitted code."""

    correct: bool
    score: float
    feedback: str
    analysis: CodeEvaluationAnalysis | None = None
