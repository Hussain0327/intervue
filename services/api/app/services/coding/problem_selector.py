"""Problem selector that chooses appropriate problems based on resume and role."""

import logging
import random

from app.schemas.coding import CodingProblem
from app.schemas.resume import ParsedResume
from app.services.coding.problem_bank import (
    get_all_problems,
    get_problems_by_difficulty,
    get_problems_by_tags,
)

logger = logging.getLogger(__name__)

# Mapping of skills to problem tags
SKILL_TO_TAGS: dict[str, list[str]] = {
    # Programming languages
    "python": ["arrays", "strings", "hash-table", "dynamic-programming"],
    "javascript": ["arrays", "strings", "hash-table", "design"],
    "typescript": ["arrays", "strings", "hash-table", "design"],
    "java": ["arrays", "linked-list", "trees", "design"],
    "c++": ["arrays", "two-pointers", "binary-search", "dynamic-programming"],
    "go": ["arrays", "strings", "hash-table", "design"],
    # Concepts
    "data structures": ["arrays", "linked-list", "trees", "stack", "hash-table"],
    "algorithms": ["dynamic-programming", "binary-search", "bfs", "dfs", "backtracking"],
    "sql": ["arrays", "hash-table"],  # Map to simpler problems
    "databases": ["design", "hash-table"],
    "react": ["arrays", "strings", "hash-table"],  # Frontend → simpler algorithmic
    "node": ["arrays", "strings", "design"],
    "api": ["design", "hash-table"],
    "system design": ["design", "hash-table", "linked-list"],
    "machine learning": ["arrays", "dynamic-programming", "matrix"],
    "backend": ["design", "hash-table", "linked-list", "trees"],
    "frontend": ["arrays", "strings", "stack"],
    "full stack": ["arrays", "hash-table", "design"],
}

# Role-based tag preferences
ROLE_TO_TAGS: dict[str, list[str]] = {
    "software engineer": ["arrays", "hash-table", "strings", "linked-list"],
    "backend engineer": ["design", "hash-table", "linked-list", "trees"],
    "frontend engineer": ["arrays", "strings", "stack", "hash-table"],
    "full stack engineer": ["arrays", "hash-table", "design", "strings"],
    "data engineer": ["arrays", "hash-table", "dynamic-programming"],
    "ml engineer": ["arrays", "dynamic-programming", "matrix"],
    "devops engineer": ["arrays", "strings", "hash-table"],
    "sre": ["design", "hash-table", "arrays"],
}

# Experience level to difficulty mapping
EXPERIENCE_TO_DIFFICULTY: dict[str, str] = {
    "entry": "easy",
    "junior": "easy",
    "mid": "medium",
    "senior": "medium",
    "staff": "hard",
    "principal": "hard",
}


def _extract_skills_from_resume(resume: ParsedResume | None) -> list[str]:
    """Extract relevant skills from a parsed resume."""
    if not resume or not resume.skills:
        return []

    # Normalize skills to lowercase
    return [skill.lower() for skill in resume.skills]


def _determine_experience_level(resume: ParsedResume | None) -> str:
    """Determine experience level from resume."""
    if not resume or not resume.experiences:
        return "entry"

    # Count years of experience (rough estimate)
    total_experiences = len(resume.experiences)

    if total_experiences >= 5:
        return "senior"
    elif total_experiences >= 3:
        return "mid"
    elif total_experiences >= 1:
        return "junior"
    else:
        return "entry"


def _get_tags_for_skills(skills: list[str]) -> list[str]:
    """Convert skills to problem tags."""
    tags = set()
    for skill in skills:
        skill_lower = skill.lower()
        for keyword, tag_list in SKILL_TO_TAGS.items():
            if keyword in skill_lower:
                tags.update(tag_list)
    return list(tags)


def _get_tags_for_role(role: str | None) -> list[str]:
    """Get preferred tags for a role."""
    if not role:
        return []

    role_lower = role.lower()
    for role_key, tags in ROLE_TO_TAGS.items():
        if role_key in role_lower:
            return tags
    return []


def select_problem_for_candidate(
    resume: ParsedResume | None = None,
    target_role: str | None = None,
    exclude_ids: list[str] | None = None,
) -> CodingProblem:
    """Select an appropriate coding problem based on candidate profile.

    Args:
        resume: Parsed resume with skills and experience
        target_role: Target job role
        exclude_ids: Problem IDs to exclude (already seen)

    Returns:
        A coding problem appropriate for the candidate
    """
    exclude_ids = exclude_ids or []

    # 1. Determine difficulty based on experience
    experience_level = _determine_experience_level(resume)
    target_difficulty = EXPERIENCE_TO_DIFFICULTY.get(experience_level, "medium")

    logger.info(
        f"Selecting problem: experience={experience_level}, "
        f"difficulty={target_difficulty}, role={target_role}"
    )

    # 2. Collect relevant tags from skills and role
    skills = _extract_skills_from_resume(resume)
    skill_tags = _get_tags_for_skills(skills)
    role_tags = _get_tags_for_role(target_role)

    # Combine tags with role tags having higher priority
    all_tags = list(set(role_tags + skill_tags))

    logger.info(f"Problem tags: skills={skill_tags}, role={role_tags}, combined={all_tags}")

    # 3. Find matching problems
    candidates: list[CodingProblem] = []

    # First try: match both difficulty and tags
    if all_tags:
        tag_matches = get_problems_by_tags(all_tags)
        candidates = [
            p for p in tag_matches
            if p.difficulty == target_difficulty and p.id not in exclude_ids
        ]

    # Second try: just difficulty
    if not candidates:
        difficulty_matches = get_problems_by_difficulty(target_difficulty)
        candidates = [p for p in difficulty_matches if p.id not in exclude_ids]

    # Third try: any problem not excluded
    if not candidates:
        all_problems = get_all_problems()
        candidates = [p for p in all_problems if p.id not in exclude_ids]

    # Final fallback: any problem
    if not candidates:
        candidates = get_all_problems()

    # 4. Select randomly from candidates (with weighting for tag matches)
    if all_tags and len(candidates) > 1:
        # Weight problems by number of matching tags
        weighted = []
        for problem in candidates:
            match_count = sum(1 for tag in problem.tags if tag in all_tags)
            weight = max(1, match_count * 2)  # Higher weight for more matches
            weighted.extend([problem] * weight)
        selected = random.choice(weighted)
    else:
        selected = random.choice(candidates)

    logger.info(f"Selected problem: {selected.id} ({selected.title}, {selected.difficulty})")
    return selected
