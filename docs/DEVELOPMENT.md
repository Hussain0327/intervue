# Development Guide

Comprehensive guide for developing and extending Intervue.

## Current Status

**MVP Voice Interview Loop — COMPLETE**

The core voice interview experience is functional: users can have a real-time conversation with an AI interviewer using voice.

## Implementation Progress

### Completed Features

| Feature | Status | Description |
|---------|--------|-------------|
| Infrastructure | Done | Docker Compose with PostgreSQL 16 and Redis 7 |
| Backend API | Done | FastAPI with async support and WebSocket |
| Speech-to-Text | Done | OpenAI Whisper integration |
| Text-to-Speech | Done | OpenAI TTS with streaming audio |
| LLM Integration | Done | Claude (Anthropic) and GPT-4 (OpenAI) support |
| Frontend | Done | Next.js 14 with React 18 and TypeScript |
| Voice Recording | Done | Browser MediaRecorder with WebM/Opus encoding |
| Real-time Transcription | Done | Live transcript display during interviews |
| WebSocket Protocol | Done | Full-duplex communication for voice loop |
| Interview State Machine | Done | Phase management (intro, warmup, main, wrap-up) |

### Pending Features

| Feature | Priority | Description |
|---------|----------|-------------|
| User Authentication | High | JWT-based auth with session management |
| Database Persistence | High | Save interview sessions and transcripts |
| Interview Planning | Medium | Resume/JD parsing for personalized interviews |
| Evaluation & Scoring | Medium | Rubric-based assessment with feedback |
| Code Execution Sandbox | Medium | Secure code running for coding interviews |
| Production Deployment | Low | Kubernetes manifests and CI/CD |

## Environment Setup

### Prerequisites

- **Node.js** 18.0+ (recommend 20.x LTS)
- **Python** 3.11+
- **Docker** & Docker Compose
- **pnpm** 8.15+ (`npm install -g pnpm`)

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

**Required variables:**

```bash
# API Keys (required)
OPENAI_API_KEY=sk-...          # For Whisper STT and TTS
ANTHROPIC_API_KEY=sk-ant-...   # For Claude LLM

# Database (defaults work for local Docker)
DATABASE_URL=postgresql+asyncpg://intervue:intervue_dev@localhost:5432/intervue

# Redis (defaults work for local Docker)
REDIS_URL=redis://localhost:6379

# Frontend (defaults work for local development)
NEXT_PUBLIC_WS_URL=ws://localhost:8000
NEXT_PUBLIC_API_URL=http://localhost:8000

# Server
HOST=0.0.0.0
PORT=8000
DEBUG=true
```

### Initial Setup

```bash
# Full setup with Docker
make setup

# Setup without Docker (if running PostgreSQL/Redis separately)
make setup-no-docker
```

This will:
1. Copy `.env.example` to `.env` (if not exists)
2. Start PostgreSQL and Redis containers
3. Create Python virtual environment
4. Install Python dependencies
5. Install Node.js dependencies via pnpm

## Development Commands

### Essential Commands

```bash
make dev           # Start full development environment (API + Web)
make api           # Start API server only (localhost:8000)
make web           # Start web frontend only (localhost:3000)
```

### Docker Commands

```bash
make docker-up     # Start PostgreSQL and Redis
make docker-down   # Stop Docker containers
make docker-logs   # Follow Docker container logs
```

### Testing & Quality

```bash
make test          # Run Python tests
make test-cov      # Run tests with coverage report
make lint          # Run linters (Ruff for Python, ESLint for JS)
make lint-fix      # Auto-fix linting issues
```

### Database

```bash
make migrate       # Run Alembic migrations
make migrate-new   # Create new migration (prompts for message)
```

### Cleanup

```bash
make clean         # Remove all build artifacts and caches
```

## API Reference

### WebSocket Protocol

**Endpoint:** `ws://localhost:8000/ws/interview/{session_id}`

#### Client → Server Messages

**Send Audio:**
```json
{
  "type": "audio",
  "data": "<base64-encoded-audio>",
  "format": "webm"
}
```

**Playback Complete:**
```json
{
  "type": "playback_complete"
}
```

**End Session:**
```json
{
  "type": "end_session"
}
```

#### Server → Client Messages

**Session Started:**
```json
{
  "type": "session_started",
  "session_id": "uuid"
}
```

**Status Update:**
```json
{
  "type": "status",
  "state": "ready|processing_stt|generating|speaking"
}
```

**Transcript:**
```json
{
  "type": "transcript",
  "role": "interviewer|candidate",
  "text": "...",
  "sequence": 1
}
```

**Audio Response:**
```json
{
  "type": "audio_response",
  "data": "<base64-encoded-mp3>",
  "format": "mp3"
}
```

**Error:**
```json
{
  "type": "error",
  "code": "ERROR_CODE",
  "message": "Human-readable message",
  "recoverable": true
}
```

**Session Ended:**
```json
{
  "type": "session_ended",
  "session_id": "uuid",
  "total_turns": 10
}
```

### Interview States

| State | Description |
|-------|-------------|
| `ready` | Waiting for candidate input |
| `processing_stt` | Transcribing candidate audio |
| `generating` | LLM generating response |
| `speaking` | TTS synthesizing audio |

### REST Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |

## Troubleshooting

### Common Issues

**"Could not connect to database"**
```bash
# Ensure Docker containers are running
make docker-up
docker compose ps  # Should show postgres and redis as "running"
```

**"OPENAI_API_KEY not set"**
```bash
# Check your .env file has valid API keys
cat .env | grep API_KEY
```

**"WebSocket connection failed"**
```bash
# Ensure API server is running
make api

# Check browser console for CORS errors
# API allows localhost:3000 by default
```

**"Audio not recording"**
- Ensure browser has microphone permission
- Check browser console for MediaRecorder errors
- Try Chrome/Edge (best WebM/Opus support)

**Python virtual environment issues**
```bash
# Recreate the virtual environment
cd services/api
rm -rf .venv
python3 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
```

**Port already in use**
```bash
# Find and kill process on port 8000 or 3000
lsof -i :8000
kill -9 <PID>
```

### Logs

**API Server:**
```bash
# Logs appear in terminal when running `make api`
# Or check uvicorn output for errors
```

**Docker Services:**
```bash
make docker-logs
# Or for specific service:
docker compose logs -f postgres
docker compose logs -f redis
```

## Architecture Details

### Service Communication

```
Browser ←──WebSocket──→ FastAPI ←──HTTP──→ OpenAI/Anthropic APIs
                           │
                           ├──→ PostgreSQL (sessions, users)
                           └──→ Redis (cache, pub/sub)
```

### Interview Session Flow

1. **Connection** — Client connects via WebSocket
2. **Session Start** — Server creates session, sends intro
3. **Voice Loop:**
   - Client records audio (hold to talk)
   - Client sends audio as base64 WebM
   - Server transcribes with Whisper
   - Server generates response with LLM
   - Server synthesizes speech with TTS
   - Server sends audio back
   - Client plays audio
4. **Session End** — Client sends end message, server cleans up

### State Machine Phases

```
INTRODUCTION → WARMUP → MAIN_QUESTIONS → WRAP_UP
```

- **Introduction** — Interviewer greets candidate
- **Warmup** — Light questions to ease in
- **Main Questions** — Core technical/behavioral questions
- **Wrap Up** — Closing and next steps

## Contributing

1. Create a feature branch from `main`
2. Make changes with tests
3. Run `make lint` and `make test`
4. Submit a pull request

### Code Style

- **Python:** Ruff for linting, Black-compatible formatting
- **TypeScript:** ESLint with Next.js rules
- **Commits:** Conventional commits preferred
