# Intervue

AI-powered voice interview platform for technical hiring practice.

## What is Intervue?

Real-time voice-based mock interviews powered by AI. Speak naturally, receive instant feedback, and improve your interview skills.

Practice technical interviews with an AI interviewer that listens, responds, and adapts—just like a real conversation.

## Features

- **Voice-based interviews** — Hold-to-talk recording with natural conversation flow
- **Real-time transcription** — Whisper-powered speech-to-text
- **AI interviewer** — Claude/GPT-4 powered responses with text-to-speech
- **Multiple interview types** — Behavioral, technical, and coding interviews
- **Live transcript** — See the conversation as it happens

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14, React 18, TypeScript, Tailwind CSS |
| Backend | FastAPI, Python 3.11+, WebSocket |
| Speech | OpenAI Whisper (STT), OpenAI TTS |
| AI | Claude (Anthropic), GPT-4 (OpenAI) |
| Database | PostgreSQL 16, Redis 7 |
| Infrastructure | Docker, pnpm, Turborepo |

## Quick Start

### Prerequisites

- Node.js 18+
- Python 3.11+
- Docker & Docker Compose
- pnpm 8+
- OpenAI API key
- Anthropic API key

### Setup

```bash
# Clone and enter the directory
git clone https://github.com/your-org/intervue.git
cd intervue

# Run setup (creates .env, starts Docker, installs deps)
make setup

# Configure your API keys
# Edit .env and add OPENAI_API_KEY and ANTHROPIC_API_KEY
```

### Run

```bash
# Start the full development environment
make dev

# Or run services individually:
make docker-up  # Start PostgreSQL + Redis
make api        # Start backend (localhost:8000)
make web        # Start frontend (localhost:3000)
```

Open [http://localhost:3000](http://localhost:3000) and start an interview.

## Architecture

```
┌─────────────────┐     WebSocket      ┌─────────────────┐
│                 │◄──────────────────►│                 │
│   Next.js Web   │                    │   FastAPI API   │
│   (React UI)    │                    │   (Python)      │
│                 │                    │                 │
└─────────────────┘                    └────────┬────────┘
        │                                       │
        │ getUserMedia                          │
        ▼                                       ▼
┌─────────────────┐                    ┌─────────────────┐
│  Browser Audio  │                    │  Speech + LLM   │
│  (WebM/Opus)    │                    │  Services       │
└─────────────────┘                    └─────────────────┘
                                                │
                              ┌─────────────────┼─────────────────┐
                              ▼                 ▼                 ▼
                       ┌───────────┐     ┌───────────┐     ┌───────────┐
                       │  Whisper  │     │  Claude/  │     │  OpenAI   │
                       │   (STT)   │     │   GPT-4   │     │   (TTS)   │
                       └───────────┘     └───────────┘     └───────────┘
```

**Interview Flow:**
1. User holds button and speaks into microphone
2. Browser captures audio as WebM/Opus
3. Audio sent to backend via WebSocket
4. Whisper transcribes speech to text
5. LLM generates interviewer response
6. TTS converts response to speech
7. Audio streamed back to browser for playback

## Project Structure

```
intervue/
├── apps/
│   └── web/                 # Next.js frontend
│       ├── app/             # App Router pages
│       ├── components/      # React components
│       │   ├── audio/       # Recorder, Player, VAD
│       │   └── interview/   # Transcript, controls
│       └── lib/             # API client, WebSocket
│
├── services/
│   ├── api/                 # FastAPI backend
│   │   ├── app/
│   │   │   ├── routers/     # HTTP + WebSocket endpoints
│   │   │   ├── services/    # Core business logic
│   │   │   │   ├── llm/     # Claude/GPT client
│   │   │   │   ├── speech/  # STT + TTS
│   │   │   │   └── orchestrator/  # Interview state
│   │   │   └── models/      # SQLAlchemy models
│   │   └── pyproject.toml
│   │
│   ├── worker/              # Background job processor
│   └── sandbox/             # Code execution containers
│
├── packages/
│   └── shared/              # Shared TypeScript types
│
├── infra/
│   ├── postgres/            # Database init scripts
│   └── k8s/                 # Kubernetes manifests
│
├── docker-compose.yml       # Local development services
├── Makefile                 # Development commands
└── turbo.json               # Monorepo configuration
```

## Documentation

- **[Development Guide](docs/DEVELOPMENT.md)** — Setup, architecture, and API reference

## License

MIT
