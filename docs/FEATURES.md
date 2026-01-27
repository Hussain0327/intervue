# Features

Feature documentation for the Intervue AI voice interview platform.

## Feature Status Overview

| Category | Feature | Status |
|----------|---------|--------|
| Core | Voice Interview Loop | Complete |
| Core | Resume Upload & Parsing | Complete |
| Core | Real-time Transcription | Complete |
| Core | Interview State Machine | Complete |
| LLM | Multi-provider Support | Complete |
| Interview | Behavioral Interviews | Complete |
| Interview | Technical Interviews | Scaffolded |
| Interview | Coding Interviews | Complete |
| Interview | Difficulty Levels | Scaffolded |
| Platform | User Authentication | Planned |
| Platform | Database Persistence | Planned |
| Platform | Interview History | Planned |
| Evaluation | Scoring & Feedback | Complete |
| Infrastructure | Code Execution Sandbox | Planned |
| Infrastructure | Production Deployment | Planned |

---

## Implemented Features

### Voice Interview Loop

**Status:** Complete

Real-time voice-based conversation between candidates and the AI interviewer.

**How it works:**
1. Candidate holds a button to record their response
2. Audio is captured using the browser's MediaRecorder API (WebM/Opus codec)
3. Audio is sent to the backend via WebSocket
4. Backend transcribes audio using OpenAI Whisper
5. LLM generates a contextual response
6. Response is converted to speech using OpenAI TTS
7. Audio is sent back and played in the browser

**Key capabilities:**
- Hold-to-talk recording interface
- Real-time status indicators (processing, generating, speaking)
- Natural conversation flow with follow-up questions
- Graceful error handling with recovery

**Configuration:**
- Audio format: WebM/Opus (client) / MP3 (server response)
- Max recording time: Unlimited (while button held)

---

### Resume Upload & Parsing

**Status:** Complete

Upload a PDF resume to personalize the interview experience.

**How it works:**
1. User uploads a PDF file through the web interface
2. Backend extracts raw text using `pdfplumber`
3. LLM (Claude or GPT-4) extracts structured data using tool/function calling
4. Structured resume data is returned and stored in the session
5. Interview questions are personalized based on resume content

**Extracted data:**
- Contact information (name, email, phone, location, LinkedIn)
- Professional summary
- Work experiences with dates, titles, and accomplishments
- Education history
- Skills (technical and soft)
- Certifications

**Constraints:**
- PDF files only
- Maximum file size: 10MB
- Best results with text-based PDFs (not scanned images)

**Integration:**
- Resume data is sent via WebSocket before starting the interview
- The AI interviewer references specific experiences and skills from the resume
- Questions are tailored to the candidate's background

---

### Real-time Transcription

**Status:** Complete

Live display of the conversation as it happens.

**How it works:**
1. Each transcription is sent as a `transcript` message via WebSocket
2. Messages include role (interviewer/candidate) and sequence number
3. Frontend displays messages in a scrolling chat-like interface
4. Visual indicators show who is speaking

**Features:**
- Immediate display of candidate's transcribed speech
- Immediate display of interviewer's generated responses
- Sequential ordering with sequence numbers
- Auto-scroll to latest message

---

### Interview State Machine

**Status:** Complete

Structured interview flow with distinct phases.

**Phases:**

| Phase | Description | Behavior |
|-------|-------------|----------|
| INTRODUCTION | Greeting and format explanation | Interviewer introduces themselves |
| WARMUP | Icebreaker questions | Light questions about background |
| MAIN_QUESTIONS | Core interview content | Substantive questions based on type |
| FOLLOW_UP | Deeper exploration | Follow-up on interesting answers |
| WRAP_UP | Closing the interview | Thank candidate, offer Q&A |
| COMPLETED | Session ended | Interview concluded |

**Phase transitions:**
- Automatic progression based on conversation flow
- Question counter tracks main questions
- Configurable `max_questions` before wrap-up (default: 5)

**State tracking:**
- Current phase
- Questions asked count
- Conversation history
- Session metadata

---

### Multi-provider LLM Support

**Status:** Complete

Support for multiple LLM providers for response generation.

**Supported providers:**

| Provider | Models | Use Case |
|----------|--------|----------|
| Anthropic | Claude Sonnet 4, Claude Opus 4 | Primary (recommended) |
| OpenAI | GPT-4, GPT-4 Turbo | Alternative |

**Configuration:**
```bash
LLM_PROVIDER=anthropic  # or "openai"
LLM_MODEL=claude-sonnet-4-20250514
```

**Features:**
- Unified interface for both providers
- Automatic fallback handling
- Consistent response formatting
- Tool/function calling support for resume parsing

---

### Coding Interviews (Code Editor Mode)

**Status:** Complete

Real coding challenges with an embedded Monaco code editor where candidates write actual code.

**How it works:**
1. When interview mode is "coding", the UI switches to a split-panel layout
2. AI selects a problem based on the candidate's resume skills and target role
3. Problem is displayed with description, examples, and constraints
4. Candidate writes code in a Monaco-powered editor with syntax highlighting
5. Candidate can still ask clarifying questions via voice during coding
6. On submission, AI evaluates code for correctness, edge cases, and quality
7. AI announces results via voice and provides detailed feedback

**Problem Selection Logic:**
- Extracts skills from parsed resume (Python, JavaScript, React, databases, etc.)
- Maps skills to problem tags (arrays, trees, strings, SQL, etc.)
- Considers target role (Frontend → DOM/array problems, Backend → system/DB problems)
- Selects appropriate difficulty based on experience level from resume
- Uses weighted random selection favoring tag matches

**Problem Bank:**
- 19 curated LeetCode-style problems
- 5 easy, 9 medium, 5 hard difficulty levels
- Each problem includes starter code for 6 languages
- Problems cover: arrays, hash tables, linked lists, trees, dynamic programming, graphs

**Supported Languages:**
| Language | Syntax Highlighting | Starter Code |
|----------|-------------------|--------------|
| Python | Yes | Yes |
| JavaScript | Yes | Yes |
| TypeScript | Yes | Yes |
| Java | Yes | Yes |
| C++ | Yes | Yes |
| Go | Yes | Yes |

**Code Evaluation Criteria:**
| Criterion | Weight | Description |
|-----------|--------|-------------|
| Correctness | 40% | Does the solution solve the problem? |
| Edge Case Handling | 20% | Handles boundary conditions |
| Code Quality | 20% | Readability, naming, structure |
| Complexity | 20% | Time and space complexity analysis |

**UI Layout:**
- Top: Compact interviewer info with voice controls (record/play)
- Left (40%): Problem panel with description, examples, constraints
- Right (60%): Monaco code editor with language selector and submit button
- Bottom: Evaluation results when available

**Voice Integration:**
- Clarification questions via voice during coding
- AI announces evaluation results via voice
- Follow-up questions about complexity and alternatives

**Files involved:**
- Frontend: `components/coding/` (5 components)
- Backend: `services/coding/` (3 services)
- Types: `lib/types/coding.ts`, `schemas/coding.py`

See [Coding Challenge Documentation](./CODING_CHALLENGE.md) for implementation details.

---

### Interview Evaluation & Scoring

**Status:** Complete

Automated assessment and feedback after each interview round.

**How it works:**
1. After a round completes, client sends `request_evaluation` message
2. Backend analyzes the full conversation transcript
3. For coding rounds, submitted code is also evaluated
4. LLM scores candidate on rubric criteria (0-100)
5. Pass/fail determination (70+ = pass)
6. Detailed feedback with strengths and areas for improvement

**Rubrics by Round Type:**

**Behavioral (Round 1):**
| Criterion | Points | Description |
|-----------|--------|-------------|
| STAR Method Usage | 25 | Situation, Task, Action, Result structure |
| Communication Skills | 25 | Clear and articulate responses |
| Self-Awareness | 25 | Reflection and growth mindset |
| Culture Fit | 25 | Teamwork and collaboration |

**Coding (Round 2):**
| Criterion | Points | Description |
|-----------|--------|-------------|
| Problem Understanding | 15 | Clarifies requirements, identifies edge cases |
| Approach | 20 | Explains strategy before coding |
| Code Correctness | 25 | Solution works correctly |
| Complexity Analysis | 20 | Accurate time/space analysis |
| Communication | 20 | Explains thought process |

**System Design (Round 3):**
| Criterion | Points | Description |
|-----------|--------|-------------|
| System Design | 40 | Architecture, scalability, trade-offs |
| Coding Implementation | 35 | Problem understanding, solution correctness |
| Communication | 25 | Clear articulation of ideas |

**Files involved:**
- Backend: `services/orchestrator/evaluator.py`
- Frontend: `lib/rubricConfig.ts`

---

## Partially Implemented Features

### Interview Types

**Status:** Scaffolded (behavioral works, others have structure)

Different interview formats for various purposes.

| Type | Status | Description |
|------|--------|-------------|
| Behavioral | Complete | STAR-format questions about past experiences |
| Technical | Scaffolded | System design and problem-solving |
| Coding | Complete | Real code editor with AI evaluation |

**Current limitations:**
- Technical interviews work but don't have specialized question banks
- Code execution sandbox planned for runtime testing (currently AI-evaluated only)

---

### Difficulty Levels

**Status:** Scaffolded

Adjustable interview difficulty.

| Level | Description |
|-------|-------------|
| Easy | Entry-level, simpler questions |
| Medium | Mid-level, standard complexity |
| Hard | Senior-level, complex scenarios |

**Current state:**
- Difficulty parameter exists in state
- Prompts include difficulty level
- Question complexity varies somewhat by difficulty
- Not fully tuned for distinct experiences

---

## Planned Features

### User Authentication

**Priority:** High

Secure user accounts and session management.

**Planned capabilities:**
- Email/password registration and login
- OAuth integration (Google, GitHub)
- JWT-based session tokens
- Password reset flow
- Account management

**Technical approach:**
- FastAPI security utilities
- Password hashing with bcrypt
- JWT token generation and validation
- Secure cookie handling

---

### Database Persistence

**Priority:** High

Store interviews, transcripts, and user data.

**Planned storage:**
- User accounts and profiles
- Interview sessions with metadata
- Full conversation transcripts
- Resume data linked to users
- Performance metrics over time

**Technical approach:**
- PostgreSQL with SQLAlchemy ORM
- Alembic for migrations
- Redis for session caching
- Async database operations

---

### Code Execution Sandbox

**Priority:** Medium

Secure environment for running candidate code with actual test cases.

**Note:** Code evaluation currently uses AI analysis. This feature would add actual code execution.

**Planned capabilities:**
- Actual code execution for submitted solutions
- Automated test case validation
- Support for multiple languages (Python, JavaScript, Java, etc.)
- Safe execution with resource limits
- Output comparison against expected results
- Performance benchmarking

**Technical approach:**
- Docker-based isolation
- Resource limits (CPU, memory, time)
- Input/output streaming
- Security hardening
- Integration with existing code evaluation for hybrid scoring

---

### Interview History & Analytics

**Priority:** Medium

Track progress and performance over time.

**Planned capabilities:**
- Dashboard with past interviews
- Performance trends and charts
- Session replay with transcripts
- Comparison across sessions
- Export functionality

---

### Production Deployment

**Priority:** Low

Infrastructure for production use.

**Planned capabilities:**
- Kubernetes manifests
- Horizontal scaling
- Load balancing
- Monitoring and alerting
- CI/CD pipelines

**Technical approach:**
- Container images
- Helm charts
- Prometheus/Grafana monitoring
- GitHub Actions CI/CD

---

## Configuration Options

### Interview Session Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `interview_type` | string | `"behavioral"` | Type of interview |
| `difficulty` | string | `"medium"` | Difficulty level |
| `max_questions` | int | `5` | Questions before wrap-up |

### Environment Configuration

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Yes | OpenAI API key for STT/TTS |
| `ANTHROPIC_API_KEY` | Yes | Anthropic API key for Claude |
| `LLM_PROVIDER` | No | `anthropic` or `openai` |
| `LLM_MODEL` | No | Model identifier |
| `DEBUG` | No | Enable debug mode |

---

## Feature Requests

Have a feature idea? Open an issue on GitHub with:
- Clear description of the feature
- Use case and benefits
- Any technical considerations
- Priority suggestion

---

## Roadmap

**Phase 1 (Current):** Core Interview Experience
- Voice interview loop
- Resume integration
- Basic state machine

**Phase 2 (Next):** Platform Foundation
- User authentication
- Database persistence
- Interview history

**Phase 3 (Future):** Advanced Features
- Evaluation and scoring
- Code execution
- Analytics dashboard

**Phase 4 (Later):** Production Ready
- Production deployment
- Scaling infrastructure
- Enterprise features
