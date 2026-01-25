# AI Interviewer Prompts

Documentation for the AI interviewer's prompt system, conversation management, and customization options.

## Overview

The AI interviewer uses a structured prompt system to maintain consistent behavior while adapting to different interview types, difficulty levels, and candidate backgrounds. The system combines a base persona with dynamic context injection.

## System Architecture

```
┌─────────────────────────────────────────────────────┐
│                  System Prompt                       │
├─────────────────────────────────────────────────────┤
│  Base Template                                       │
│  - Interviewer persona                              │
│  - Role guidelines                                   │
│  - Response formatting rules                         │
├─────────────────────────────────────────────────────┤
│  Dynamic Parameters                                  │
│  - Interview type (behavioral, technical, etc.)     │
│  - Difficulty level                                  │
│  - Current phase                                     │
├─────────────────────────────────────────────────────┤
│  Resume Context (if provided)                        │
│  - Candidate name and location                       │
│  - Work experience summary                           │
│  - Education and skills                              │
│  - Personalization instructions                      │
├─────────────────────────────────────────────────────┤
│  Phase Instructions                                  │
│  - Phase-specific behavior                           │
│  - Current action directive                          │
└─────────────────────────────────────────────────────┘
```

## System Prompt Template

The base system prompt establishes the interviewer's persona and guidelines:

```
You are an experienced technical interviewer conducting a {interview_type} interview.

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
Speak as if talking to someone directly.
```

### Key Design Principles

1. **Conversational Tone**: Optimized for text-to-speech output
2. **Concise Responses**: 2-3 sentences to maintain natural pacing
3. **No Formatting**: Plain text only (no markdown, bullets, lists)
4. **Phase Awareness**: Behavior adapts to interview stage
5. **Encouraging**: Professional but warm demeanor

## Interview Phases

### Phase Definitions

| Phase | Purpose | Duration | Key Behavior |
|-------|---------|----------|--------------|
| INTRODUCTION | Set the stage | 1 turn | Greet, introduce self, explain format |
| WARMUP | Build rapport | 1-2 turns | Light questions, ease nerves |
| MAIN_QUESTIONS | Core assessment | 3-5 turns | Substantive interview questions |
| FOLLOW_UP | Deep dive | Variable | Explore interesting responses |
| WRAP_UP | Conclude | 1-2 turns | Thank, Q&A, positive close |

### Phase-Specific Instructions

Each phase has tailored instructions injected into the prompt:

**INTRODUCTION:**
```
Start with a warm greeting. Introduce yourself as the interviewer and briefly
explain the interview format. Keep it under 30 seconds when spoken.
```

**WARMUP:**
```
Ask a simple warmup question about their background, recent work, or
what interests them about this role. This helps them get comfortable.
```

**MAIN_QUESTIONS:**
```
Ask a substantive interview question appropriate for the interview type and difficulty.
For behavioral: use STAR-format questions. For technical: ask about problem-solving approaches.
```

**FOLLOW_UP:**
```
Based on their previous answer, ask a thoughtful follow-up question that
explores the topic more deeply or clarifies important details.
```

**WRAP_UP:**
```
Thank them for their time and responses. Ask if they have any questions
for you. End on a positive note.
```

## Resume Integration

When a parsed resume is available, it's formatted and appended to the system prompt:

### Resume Context Format

```
CANDIDATE'S RESUME:
CANDIDATE: {name}
Location: {location}

PROFESSIONAL SUMMARY:
{summary}

WORK EXPERIENCE:
- {title} at {company} ({start_date} - {end_date})
  {description}
  * {highlight_1}
  * {highlight_2}
  * {highlight_3}

EDUCATION:
- {degree} in {field} from {institution} ({graduation_date})

SKILLS: {skill_1}, {skill_2}, {skill_3}, ...

CERTIFICATIONS: {cert_1}, {cert_2}, ...
```

### Resume Usage Instructions

After the resume context, these instructions guide personalization:

```
Use this background to:
- Reference specific experiences, projects, or skills from their resume
- Ask relevant questions about their listed experience
- Follow up on specific roles, projects, or accomplishments mentioned
- Tailor the difficulty and focus based on their apparent skill level
- Make the conversation feel personalized and informed
```

### Personalization Examples

**Without Resume:**
> "Tell me about a time when you had to deal with a challenging team situation."

**With Resume (senior engineer background):**
> "I see you led the migration to microservices at Tech Corp. Tell me about a specific challenge you faced during that transition and how you handled it."

## Interview Types

### Behavioral Interviews

Focus on past experiences using the STAR method (Situation, Task, Action, Result).

**Sample questions:**
- Tell me about a time when you had to meet a tight deadline
- Describe a situation where you disagreed with a colleague
- Give me an example of when you took initiative

**Prompt behavior:**
- Probe for specific examples
- Ask about measurable outcomes
- Explore decision-making process

### Technical Interviews

Focus on problem-solving approaches and technical knowledge.

**Sample areas:**
- System design scenarios
- Technical decision trade-offs
- Debugging and troubleshooting approaches
- Architecture patterns

**Prompt behavior:**
- Ask about reasoning behind choices
- Explore scalability considerations
- Probe edge cases and failure modes

### Coding Interviews (Scaffolded)

Focus on programming problem-solving.

**Note:** Full coding interview support requires the code execution sandbox feature.

## Difficulty Levels

### Easy
- Entry-level positions
- Simpler scenarios
- More guidance in questions
- Generous follow-up hints

### Medium (Default)
- Mid-level positions
- Standard complexity
- Balanced probing
- Normal expectations

### Hard
- Senior positions
- Complex scenarios
- Deep technical probing
- High expectations for depth

## Prompt Building Functions

### `get_system_prompt(state)`

Constructs the complete system prompt from state.

```python
def get_system_prompt(state: InterviewState) -> str:
    # 1. Format base template with parameters
    prompt = SYSTEM_PROMPT_TEMPLATE.format(
        interview_type=state.interview_type,
        difficulty=state.difficulty,
        phase=state.phase.value,
    )

    # 2. Add resume context if available
    if state.parsed_resume:
        resume_context = state.parsed_resume.to_interview_context()
    elif state.resume_context:
        resume_context = state.resume_context

    if resume_context:
        prompt += f"\n\nCANDIDATE'S RESUME:\n{resume_context}\n\n..."

    return prompt
```

### `build_initial_prompt(state)`

Creates the prompt to start the interview.

```python
def build_initial_prompt(state: InterviewState) -> str:
    return (
        f"Begin the {state.interview_type} interview. "
        f"{get_phase_instruction(SessionPhase.INTRODUCTION)}"
    )
```

### `build_response_prompt(state, candidate_text)`

Creates the prompt for responding to candidate input.

```python
def build_response_prompt(state: InterviewState, candidate_text: str) -> str:
    instruction = get_phase_instruction(state.phase)

    # Check for wrap-up transition
    if state.should_wrap_up() and state.phase != SessionPhase.WRAP_UP:
        instruction = (
            "We're approaching the end of the interview. "
            "Respond to their answer briefly, then transition to wrapping up."
        )

    return f'The candidate said: "{candidate_text}"\n\n{instruction}'
```

## Conversation History

The LLM maintains context through conversation history:

```python
conversation_history: list[LLMMessage]

# Format:
# {"role": "user", "content": "candidate's transcribed response"}
# {"role": "assistant", "content": "interviewer's generated response"}
```

**History management:**
- All exchanges are recorded
- History is passed to LLM for context
- Enables coherent follow-up questions
- Prevents repetition

## Customization Options

### Adjusting Interview Length

```python
state.max_questions = 5  # Default
# Increase for longer interviews
state.max_questions = 10
```

### Changing Interview Type

```python
state.interview_type = "behavioral"  # Default
state.interview_type = "technical"
state.interview_type = "coding"
```

### Adjusting Difficulty

```python
state.difficulty = "medium"  # Default
state.difficulty = "easy"
state.difficulty = "hard"
```

## Best Practices

### For Natural Conversations

1. **Keep responses short** - 2-3 sentences optimal for voice
2. **Avoid lists** - Bullets don't translate well to speech
3. **Use conversational language** - "Let's talk about..." not "Question 3:"
4. **Include transitions** - "That's interesting. Building on that..."

### For Effective Assessment

1. **Reference specifics** - Use names, dates, technologies from resume
2. **Ask open-ended questions** - Encourage detailed responses
3. **Probe thoughtfully** - Follow up on vague answers
4. **Stay on topic** - Don't let conversation drift too far

### For Candidate Experience

1. **Be encouraging** - Acknowledge good points
2. **Don't interrupt** - Wait for complete responses
3. **Manage time** - Don't let any section run too long
4. **End positively** - Always thank and close warmly

## Extending the Prompt System

### Adding New Interview Types

1. Define type-specific behaviors in `prompts.py`
2. Add type to valid options in state
3. Create appropriate question guidance
4. Test conversation flow

### Adding Custom Phase Instructions

```python
PHASE_INSTRUCTIONS = {
    SessionPhase.CUSTOM_PHASE: (
        "Custom instruction for this phase..."
    ),
}
```

### Modifying Persona

Edit `SYSTEM_PROMPT_TEMPLATE` in `services/api/app/services/orchestrator/prompts.py`:

```python
SYSTEM_PROMPT_TEMPLATE = """You are {your custom persona}...
```

## Troubleshooting

### Responses Too Long
- Reduce max_tokens in LLM call
- Add explicit length constraint to prompt
- Use more direct phase instructions

### Repetitive Questions
- Check conversation history is being passed
- Ensure LLM sees previous exchanges
- Add "avoid repeating" instruction

### Off-Topic Responses
- Strengthen phase instructions
- Add guardrails to system prompt
- Reduce temperature parameter

### Missing Resume Context
- Verify resume_context message sent before start_interview
- Check parsed_resume object structure
- Log resume context in backend
