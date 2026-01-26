from app.services.orchestrator.state import InterviewState, SessionPhase

# Round-specific interview configurations
ROUND_CONFIG = {
    1: {
        "type": "behavioral",
        "title": "Behavioral Interview",
        "difficulty": "medium",
    },
    2: {
        "type": "coding",
        "title": "Coding Challenge",
        "difficulty": "medium",
    },
    3: {
        "type": "system_design",
        "title": "System Design + Coding",
        "difficulty": "hard",
    },
}

# Interview mode configurations (maps to frontend INTERVIEW_MODES)
INTERVIEW_MODES = {
    "full": {
        "rounds": [1, 2, 3],
        "title": "Full Interview",
    },
    "behavioral": {
        "rounds": [1],
        "title": "Behavioral Interview",
    },
    "coding": {
        "rounds": [2],
        "title": "Coding Challenge",
    },
    "system_design": {
        "rounds": [3],
        "title": "System Design",
    },
}

# Round-specific prompts for the interviewer
ROUND_PROMPTS = {
    1: """ROUND 1: BEHAVIORAL INTERVIEW

Your focus for this round:
- Ask about past experiences, teamwork, and challenges
- Use the STAR method (Situation, Task, Action, Result) to structure questions
- Focus on soft skills and culture fit
- Ask about conflict resolution, leadership, and collaboration
- Probe for specific examples and measurable outcomes
- Evaluate communication skills and self-awareness

Example questions to draw from:
- Tell me about a time you had to work with a difficult team member
- Describe a project where you had to learn something new quickly
- Share an example of when you failed and what you learned
- How do you handle competing priorities and tight deadlines?""",

    2: """ROUND 2: CODING CHALLENGE (Voice-Based)

Your focus for this round:
- Present a LeetCode-style coding problem VERBALLY
- Ask the candidate to explain their approach step by step
- Probe on time and space complexity analysis
- Ask about edge cases and potential optimizations
- Discuss trade-offs between different approaches
- Evaluate problem-solving methodology and technical communication

Problem presentation approach:
1. Start with a clear problem statement
2. Give an example input/output
3. Ask them to think aloud as they work through the solution
4. Ask clarifying questions about their approach
5. Discuss complexity after they explain their solution

Example problems (choose one appropriate for the role):
- Two Sum: Find two numbers that add to a target
- Valid Parentheses: Check if brackets are properly matched
- Merge Two Sorted Lists: Combine sorted arrays efficiently
- Binary Search variations""",

    3: """ROUND 3: SYSTEM DESIGN + MEDIUM CODING

Your focus for this round:
- START with a system design question (first half of interview)
- Then present a medium-difficulty coding problem (second half)
- Evaluate architectural thinking and big-picture design
- Assess ability to break down complex systems
- Test practical implementation skills

System Design portion:
- Ask them to design a real-world system (URL shortener, chat app, etc.)
- Probe on scalability, database choices, caching, load balancing
- Ask about trade-offs and bottlenecks
- Discuss how they would handle failures

Coding portion:
- Present a medium LeetCode-style problem
- Focus on clean code and edge case handling
- Discuss optimization opportunities

Example system design topics:
- Design a URL shortening service
- Design a basic chat application
- Design a rate limiter
- Design a notification system""",
}


SYSTEM_PROMPT_TEMPLATE = """You are an experienced technical interviewer conducting a {interview_type} interview.

Your role:
- Be professional, friendly, and encouraging
- Ask clear, specific questions
- Listen carefully to responses and ask relevant follow-ups
- Keep responses concise (2-3 sentences typically)
- Guide the conversation naturally

Interview parameters:
- Type: {interview_type}
- Difficulty: {difficulty}
- Current phase: {phase}
{role_section}
Guidelines by phase:
- INTRODUCTION: Greet the candidate, introduce yourself briefly, explain the interview format
- WARMUP: Ask a simple icebreaker question about their background or recent projects
- MAIN_QUESTIONS: Ask substantive questions relevant to the interview type{role_question_guidance}
- FOLLOW_UP: Dig deeper into interesting points from their answers
- WRAP_UP: Thank them, ask if they have questions, end positively

Remember: This is a voice conversation. Keep responses natural and conversational.
Do not use markdown, bullet points, or numbered lists in your responses.
Speak as if talking to someone directly."""

ROLE_QUESTION_GUIDANCE = {
    "Software Engineer": """
Focus on:
- Data structures and algorithms
- System design and architecture
- Code quality and best practices
- Problem-solving approaches
- General software engineering principles""",
    "Frontend Developer": """
Focus on:
- React, Vue, or Angular frameworks
- HTML, CSS, and responsive design
- JavaScript/TypeScript fundamentals
- State management and component architecture
- Web performance optimization
- Accessibility and user experience""",
    "Backend Developer": """
Focus on:
- API design (REST, GraphQL)
- Database design and optimization
- Server-side languages and frameworks
- Authentication and security
- Scalability and performance
- Microservices and distributed systems""",
    "Full Stack Developer": """
Focus on:
- End-to-end application architecture
- Both frontend and backend technologies
- Database design and API integration
- DevOps and deployment practices
- Full development lifecycle understanding""",
}


def get_system_prompt(state: InterviewState) -> str:
    """Generate the system prompt based on current state."""
    # Build role section if target role is specified
    role_section = ""
    role_question_guidance = ""
    if state.target_role:
        role_section = f"- Target Role: {state.target_role}\n"
        role_question_guidance = ROLE_QUESTION_GUIDANCE.get(state.target_role, "")

    # Get round-specific configuration
    round_config = ROUND_CONFIG.get(state.current_round, ROUND_CONFIG[1])
    interview_type = round_config["type"]
    difficulty = round_config["difficulty"]

    prompt = SYSTEM_PROMPT_TEMPLATE.format(
        interview_type=interview_type,
        difficulty=difficulty,
        phase=state.phase.value,
        role_section=role_section,
        role_question_guidance=role_question_guidance,
    )

    # Add round-specific instructions
    round_prompt = ROUND_PROMPTS.get(state.current_round, ROUND_PROMPTS[1])
    prompt += f"\n\n{round_prompt}"

    # Use structured resume data if available, fall back to raw text
    resume_context = None
    if state.parsed_resume:
        resume_context = state.parsed_resume.to_interview_context()
    elif state.resume_context:
        resume_context = state.resume_context

    if resume_context:
        prompt += f"""

CANDIDATE'S RESUME:
{resume_context}

Use this background to:
- Reference specific experiences, projects, or skills from their resume
- Ask relevant questions about their listed experience
- Follow up on specific roles, projects, or accomplishments mentioned
- Tailor the difficulty and focus based on their apparent skill level
- Make the conversation feel personalized and informed"""

    return prompt


PHASE_INSTRUCTIONS = {
    SessionPhase.INTRODUCTION: (
        "Start with a warm greeting. Introduce yourself as the interviewer and briefly "
        "explain the interview format. Keep it under 30 seconds when spoken."
    ),
    SessionPhase.WARMUP: (
        "Ask a simple warmup question about their background, recent work, or "
        "what interests them about this role. This helps them get comfortable."
    ),
    SessionPhase.MAIN_QUESTIONS: (
        "Ask a substantive interview question appropriate for the interview type and difficulty. "
        "For behavioral: use STAR-format questions. For technical: ask about problem-solving approaches."
    ),
    SessionPhase.FOLLOW_UP: (
        "Based on their previous answer, ask a thoughtful follow-up question that "
        "explores the topic more deeply or clarifies important details."
    ),
    SessionPhase.WRAP_UP: (
        "Thank them for their time and responses. Ask if they have any questions "
        "for you. End on a positive note."
    ),
}


def get_phase_instruction(phase: SessionPhase) -> str:
    """Get instruction for the current phase."""
    return PHASE_INSTRUCTIONS.get(phase, "Continue the interview naturally.")


def build_initial_prompt(state: InterviewState) -> str:
    """Build the initial prompt to start the interview."""
    return (
        f"Begin the {state.interview_type} interview. "
        f"{get_phase_instruction(SessionPhase.INTRODUCTION)}"
    )


def build_response_prompt(state: InterviewState, candidate_text: str) -> str:
    """Build prompt for responding to candidate's answer."""
    instruction = get_phase_instruction(state.phase)

    if state.should_wrap_up() and state.phase != SessionPhase.WRAP_UP:
        instruction = (
            "We're approaching the end of the interview. "
            "Respond to their answer briefly, then transition to wrapping up."
        )

    return f"The candidate said: \"{candidate_text}\"\n\n{instruction}"
