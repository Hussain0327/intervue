# Architecture

Technical architecture overview for the Intervue AI voice interview platform.

## System Overview

Intervue is a real-time voice interview platform that enables natural conversation between candidates and an AI interviewer. The system processes voice input, generates intelligent responses, and synthesizes speech output in a continuous loop.

### High-Level Architecture

```
                                    External Services
                              ┌─────────────────────────────┐
                              │  OpenAI API                 │
                              │  - Whisper (STT)            │
                              │  - TTS (Speech Synthesis)   │
                              ├─────────────────────────────┤
                              │  Anthropic API              │
                              │  - Claude (LLM)             │
                              └──────────────▲──────────────┘
                                             │
┌─────────────────┐    WebSocket    ┌────────┴────────┐    SQL/Cache    ┌─────────────────┐
│                 │◄──────────────►│                 │◄───────────────►│                 │
│   Next.js Web   │                │   FastAPI API   │                 │   PostgreSQL    │
│   (Browser)     │    REST API    │   (Python)      │                 │   Redis         │
│                 │◄──────────────►│                 │                 │                 │
└─────────────────┘                └─────────────────┘                 └─────────────────┘
```

## Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| Frontend | Next.js 14, React 18, TypeScript | User interface and audio capture |
| Backend | FastAPI, Python 3.11+ | API server, WebSocket handling |
| Speech-to-Text | OpenAI Whisper | Transcribe candidate voice |
| Text-to-Speech | OpenAI TTS | Synthesize interviewer voice |
| LLM | Claude (Anthropic), GPT-4 (OpenAI) | Generate interviewer responses |
| Database | PostgreSQL 16 | Persistent data storage |
| Cache | Redis 7 | Session cache, pub/sub |
| Build | Turborepo, pnpm | Monorepo management |
| Containerization | Docker Compose | Local development environment |

## Monorepo Structure

```
intervue/
├── apps/
│   └── web/                    # Next.js frontend application
│       ├── app/                # App Router pages
│       ├── components/         # React components
│       │   ├── audio/          # Audio recording/playback
│       │   └── interview/      # Interview UI components
│       └── lib/                # Utilities, API client
│
├── services/
│   └── api/                    # FastAPI backend service
│       └── app/
│           ├── routers/        # HTTP & WebSocket endpoints
│           ├── services/       # Business logic
│           │   ├── llm/        # LLM client abstraction
│           │   ├── speech/     # STT & TTS services
│           │   ├── orchestrator/  # Interview state management
│           │   └── resume/     # Resume parsing service
│           ├── schemas/        # Pydantic models
│           └── core/           # Configuration, utilities
│
├── packages/
│   └── shared/                 # Shared TypeScript types
│
├── infra/
│   ├── postgres/               # Database init scripts
│   └── k8s/                    # Kubernetes manifests (future)
│
├── docker-compose.yml          # Local development services
├── Makefile                    # Development commands
└── turbo.json                  # Turborepo configuration
```

## Frontend Architecture (apps/web)

### Component Hierarchy

```
app/
├── page.tsx                    # Home page (interview start)
├── interview/
│   └── [sessionId]/
│       └── page.tsx            # Interview session page
└── layout.tsx                  # Root layout

components/
├── audio/
│   ├── Recorder.tsx            # Voice recording (hold-to-talk)
│   └── Player.tsx              # Audio playback (interviewer voice)
├── interview/
│   └── Transcript.tsx          # Live conversation display
└── ResumeUpload.tsx            # PDF upload component
```

### State Management

- **Local React State**: Component-level state for UI interactions
- **Session Storage**: Parsed resume data persisted during interview
- **WebSocket State**: Connection status, interview state from server

### Audio Pipeline

```
User Microphone
      │
      ▼
┌─────────────────┐
│ MediaRecorder   │  (WebM/Opus codec)
│ getUserMedia()  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Base64 Encode   │
└────────┬────────┘
         │
         ▼
   WebSocket Send
```

### Key Technologies

- **MediaRecorder API**: Browser audio capture with WebM/Opus encoding
- **Web Audio API**: Audio playback for TTS responses
- **WebSocket**: Real-time bidirectional communication

## Backend Architecture (services/api)

### Application Structure

```
FastAPI Application
      │
      ├── Middleware (CORS)
      │
      ├── Routers
      │   ├── ws_interview.py   # WebSocket endpoint
      │   └── resume.py         # REST endpoint
      │
      └── Services
          ├── LLM Client        # Claude/GPT-4 abstraction
          ├── STT (Whisper)     # Speech transcription
          ├── TTS (OpenAI)      # Speech synthesis
          ├── Orchestrator      # Interview state machine
          └── Resume Parser     # PDF parsing + LLM extraction
```

### Service Layer Patterns

**LLM Client (`services/llm/client.py`)**
- Provider abstraction (Anthropic/OpenAI)
- Conversation message formatting
- Response streaming support

**Speech Services (`services/speech/`)**
- `stt_whisper.py`: OpenAI Whisper transcription
- `tts_client.py`: OpenAI TTS synthesis
- `audio_utils.py`: Audio format conversion

**Orchestrator (`services/orchestrator/`)**
- `state.py`: InterviewState dataclass, SessionManager
- `prompts.py`: System prompts, phase instructions

**Resume Parser (`services/resume/parser.py`)**
- PDF text extraction (pdfplumber)
- LLM-powered structured extraction (tool use)
- Schema validation (Pydantic)

### Session State Management

Sessions are managed in-memory by `SessionManager`:

```python
@dataclass
class InterviewState:
    session_id: UUID
    phase: SessionPhase              # Current interview phase
    conversation_history: list       # Chat history for LLM
    sequence_number: int             # Message sequence
    questions_asked: int             # Question counter
    max_questions: int               # Session limit
    interview_type: str              # behavioral, technical, etc.
    difficulty: str                  # easy, medium, hard
    resume_context: str              # Raw resume text (fallback)
    parsed_resume: ParsedResume      # Structured resume data
```

## Data Flow

### Interview Voice Loop

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│   Browser   │      │   FastAPI   │      │  External   │
│             │      │             │      │   APIs      │
└──────┬──────┘      └──────┬──────┘      └──────┬──────┘
       │                    │                    │
       │  1. audio (WebM)   │                    │
       │───────────────────>│                    │
       │                    │  2. Whisper STT    │
       │                    │───────────────────>│
       │                    │<───────────────────│
       │                    │     transcription  │
       │  3. transcript     │                    │
       │<───────────────────│                    │
       │     (candidate)    │                    │
       │                    │  4. Claude LLM     │
       │                    │───────────────────>│
       │                    │<───────────────────│
       │                    │     response       │
       │  5. transcript     │                    │
       │<───────────────────│                    │
       │     (interviewer)  │                    │
       │                    │  6. OpenAI TTS     │
       │                    │───────────────────>│
       │                    │<───────────────────│
       │                    │     audio (MP3)    │
       │  7. audio_response │                    │
       │<───────────────────│                    │
       │                    │                    │
       │  8. playback_done  │                    │
       │───────────────────>│                    │
       │                    │                    │
```

### Resume Parsing Pipeline

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│   Browser   │      │   FastAPI   │      │  Anthropic  │
│             │      │             │      │  Claude     │
└──────┬──────┘      └──────┬──────┘      └──────┬──────┘
       │                    │                    │
       │  1. POST /resume   │                    │
       │     (PDF file)     │                    │
       │───────────────────>│                    │
       │                    │                    │
       │                    │  2. pdfplumber     │
       │                    │  extract text      │
       │                    │                    │
       │                    │  3. Claude tool    │
       │                    │     use request    │
       │                    │───────────────────>│
       │                    │                    │
       │                    │<───────────────────│
       │                    │  4. Structured     │
       │                    │     JSON response  │
       │                    │                    │
       │  5. ParsedResume   │                    │
       │<───────────────────│                    │
       │                    │                    │
```

## Interview State Machine

### Session Phases

```
┌───────────────┐
│ INTRODUCTION  │  Greet candidate, explain format
└───────┬───────┘
        │
        ▼
┌───────────────┐
│    WARMUP     │  Icebreaker questions
└───────┬───────┘
        │
        ▼
┌───────────────┐
│ MAIN_QUESTIONS│  Core interview questions (loop)
└───────┬───────┘
        │ (max_questions reached)
        ▼
┌───────────────┐
│   FOLLOW_UP   │  Deeper exploration of answers
└───────┬───────┘
        │
        ▼
┌───────────────┐
│    WRAP_UP    │  Thank candidate, closing
└───────┬───────┘
        │
        ▼
┌───────────────┐
│   COMPLETED   │  Session ended
└───────────────┘
```

### WebSocket States

| State | Description |
|-------|-------------|
| `ready` | Waiting for candidate audio input |
| `processing_stt` | Transcribing audio with Whisper |
| `generating` | LLM generating interviewer response |
| `speaking` | TTS synthesizing audio response |
| `error` | Recoverable or fatal error occurred |

## Security Considerations

### Current Implementation

- CORS restricted to localhost origins
- File upload validation (type, size)
- Input sanitization in WebSocket messages

### Planned Enhancements

- JWT-based authentication
- Rate limiting on API endpoints
- Secure session token handling
- Input validation and sanitization
- API key rotation support

## Scalability Notes

### Current Limitations (MVP)

- In-memory session storage (single server)
- No horizontal scaling
- No persistent interview history

### Future Considerations

- Redis for distributed session storage
- Database persistence for transcripts
- Message queue for async processing
- Kubernetes deployment for scaling
- CDN for static assets

## External Service Dependencies

| Service | Provider | Purpose | Fallback |
|---------|----------|---------|----------|
| STT | OpenAI Whisper | Voice transcription | None (required) |
| TTS | OpenAI TTS | Voice synthesis | None (required) |
| LLM | Anthropic Claude | Response generation | OpenAI GPT-4 |
| LLM | OpenAI GPT-4 | Alternative LLM | Anthropic Claude |

## Configuration

Key environment variables:

```bash
# API Keys
OPENAI_API_KEY=sk-...          # Required for STT/TTS
ANTHROPIC_API_KEY=sk-ant-...   # Required for Claude LLM

# LLM Configuration
LLM_PROVIDER=anthropic         # or "openai"
LLM_MODEL=claude-sonnet-4-20250514  # or gpt-4

# Server Configuration
HOST=0.0.0.0
PORT=8000
DEBUG=true

# Database (for future persistence)
DATABASE_URL=postgresql+asyncpg://...
REDIS_URL=redis://...
```

See `services/api/app/core/config.py` for all configuration options.
