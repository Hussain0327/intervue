from app.services.orchestrator.state import InterviewState, SessionPhase

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

Guidelines by phase:
- INTRODUCTION: Greet the candidate, introduce yourself briefly, explain the interview format
- WARMUP: Ask a simple icebreaker question about their background or recent projects
- MAIN_QUESTIONS: Ask substantive questions relevant to the interview type
- FOLLOW_UP: Dig deeper into interesting points from their answers
- WRAP_UP: Thank them, ask if they have questions, end positively

Remember: This is a voice conversation. Keep responses natural and conversational.
Do not use markdown, bullet points, or numbered lists in your responses.
Speak as if talking to someone directly."""


def get_system_prompt(state: InterviewState) -> str:
    """Generate the system prompt based on current state."""
    return SYSTEM_PROMPT_TEMPLATE.format(
        interview_type=state.interview_type,
        difficulty=state.difficulty,
        phase=state.phase.value,
    )


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
