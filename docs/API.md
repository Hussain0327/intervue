# API Reference

Complete API documentation for the Intervue backend services.

## Base URL

- **Development**: `http://localhost:8000`
- **WebSocket**: `ws://localhost:8000`

## REST Endpoints

### Health Check

Check if the API server is running.

```
GET /health
```

**Response:**
```json
{
  "status": "healthy"
}
```

---

### Parse Resume

Parse a PDF resume and extract structured candidate data.

```
POST /resume/parse
```

**Request:**
- Content-Type: `multipart/form-data`
- Body: `file` (PDF file)

**Constraints:**
- Maximum file size: 10MB
- Accepted formats: PDF only (`application/pdf`)

**Success Response (200):**

```json
{
  "contact": {
    "name": "Jane Doe",
    "email": "jane.doe@example.com",
    "phone": "+1-555-123-4567",
    "location": "San Francisco, CA",
    "linkedin": "https://linkedin.com/in/janedoe"
  },
  "summary": "Senior software engineer with 8+ years of experience in distributed systems and cloud architecture.",
  "experiences": [
    {
      "company": "Tech Corp",
      "title": "Senior Software Engineer",
      "start_date": "Jan 2020",
      "end_date": "Present",
      "description": "Lead backend development for core platform services.",
      "highlights": [
        "Led migration to microservices architecture",
        "Improved API latency by 40%",
        "Mentored team of 5 junior engineers"
      ]
    },
    {
      "company": "StartupXYZ",
      "title": "Software Engineer",
      "start_date": "Jun 2017",
      "end_date": "Dec 2019",
      "description": "Full-stack development for B2B SaaS platform.",
      "highlights": [
        "Built real-time notification system",
        "Implemented CI/CD pipeline"
      ]
    }
  ],
  "education": [
    {
      "institution": "Stanford University",
      "degree": "Master of Science",
      "field": "Computer Science",
      "graduation_date": "2017"
    },
    {
      "institution": "UC Berkeley",
      "degree": "Bachelor of Science",
      "field": "Computer Science",
      "graduation_date": "2015"
    }
  ],
  "skills": [
    "Python",
    "TypeScript",
    "Go",
    "AWS",
    "Kubernetes",
    "PostgreSQL",
    "Redis",
    "GraphQL",
    "System Design"
  ],
  "certifications": [
    "AWS Solutions Architect Professional",
    "Kubernetes Administrator (CKA)"
  ],
  "raw_text": "Original extracted text from PDF..."
}
```

**Error Responses:**

| Status | Code | Description |
|--------|------|-------------|
| 400 | Bad Request | Invalid file type (not PDF) |
| 400 | Bad Request | File size exceeds 10MB |
| 400 | Bad Request | Empty file uploaded |
| 500 | Internal Server Error | Resume parsing failed |

**Example Error Response:**
```json
{
  "detail": "Only PDF files are supported. Please upload a PDF resume."
}
```

---

## WebSocket Protocol

### Connection

```
WebSocket /ws/interview/{session_id}
```

Connect to start or resume an interview session. The `session_id` can be any unique string (UUID recommended).

**Connection Flow:**
1. Client connects to WebSocket endpoint
2. Server sends `session_started` message
3. Client optionally sends `resume_context` with parsed resume
4. Client sends `start_interview` to begin
5. Server generates introduction and sends audio
6. Voice loop begins

---

## Client Messages

Messages sent from the client (browser) to the server.

### audio

Send recorded audio from the candidate.

```json
{
  "type": "audio",
  "data": "<base64-encoded-audio>",
  "format": "webm"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | string | Yes | Must be `"audio"` |
| `data` | string | Yes | Base64-encoded audio data |
| `format` | string | No | Audio format (default: `"webm"`) |

---

### resume_context

Send parsed resume data before starting the interview. This personalizes the interview questions.

```json
{
  "type": "resume_context",
  "parsed_resume": {
    "contact": {
      "name": "Jane Doe",
      "email": "jane@example.com",
      "phone": null,
      "location": "San Francisco, CA",
      "linkedin": null
    },
    "summary": "Senior engineer with...",
    "experiences": [...],
    "education": [...],
    "skills": ["Python", "TypeScript"],
    "certifications": [],
    "raw_text": "Full resume text..."
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | string | Yes | Must be `"resume_context"` |
| `parsed_resume` | object | Yes | Full `ParsedResume` object from `/resume/parse` |

**Note:** Send this message after `session_started` but before `start_interview`.

---

### start_interview

Signal that the client is ready to begin the interview.

```json
{
  "type": "start_interview"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | string | Yes | Must be `"start_interview"` |

**Note:** The server will generate an introduction and start the interview after receiving this message.

---

### playback_complete

Notify the server that audio playback has finished.

```json
{
  "type": "playback_complete"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | string | Yes | Must be `"playback_complete"` |

**Note:** Send this after the browser finishes playing the interviewer's audio response.

---

### end_session

Request to end the interview session.

```json
{
  "type": "end_session"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | string | Yes | Must be `"end_session"` |

---

## Server Messages

Messages sent from the server to the client.

### session_started

Sent immediately after WebSocket connection is established.

```json
{
  "type": "session_started",
  "session_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `type` | string | Always `"session_started"` |
| `session_id` | string | UUID of the interview session |

---

### status

Indicates the current state of the interview session.

```json
{
  "type": "status",
  "state": "ready"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `type` | string | Always `"status"` |
| `state` | string | Current state (see States below) |

**States:**

| State | Description |
|-------|-------------|
| `ready` | Waiting for candidate input |
| `processing_stt` | Transcribing candidate audio |
| `generating` | LLM generating response |
| `speaking` | TTS synthesizing audio |
| `error` | An error occurred |

---

### transcript

A transcript entry for the conversation.

```json
{
  "type": "transcript",
  "role": "interviewer",
  "text": "Hello! I'm excited to meet you today. Let's start with a brief introduction.",
  "sequence": 1
}
```

| Field | Type | Description |
|-------|------|-------------|
| `type` | string | Always `"transcript"` |
| `role` | string | `"interviewer"` or `"candidate"` |
| `text` | string | Transcribed or generated text |
| `sequence` | number | Sequential message number |

---

### audio

Audio response from the interviewer (TTS output).

```json
{
  "type": "audio",
  "data": "<base64-encoded-mp3>",
  "format": "mp3"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `type` | string | Always `"audio"` |
| `data` | string | Base64-encoded audio data |
| `format` | string | Audio format (typically `"mp3"`) |

---

### error

An error occurred during processing.

```json
{
  "type": "error",
  "code": "EMPTY_TRANSCRIPTION",
  "message": "Could not understand audio. Please try again.",
  "recoverable": true
}
```

| Field | Type | Description |
|-------|------|-------------|
| `type` | string | Always `"error"` |
| `code` | string | Error code identifier |
| `message` | string | Human-readable error message |
| `recoverable` | boolean | Whether the session can continue |

**Error Codes:**

| Code | Recoverable | Description |
|------|-------------|-------------|
| `EMPTY_TRANSCRIPTION` | Yes | Audio could not be transcribed |
| `PROCESSING_ERROR` | Yes | Error during STT/LLM/TTS processing |
| `SESSION_NOT_FOUND` | No | Session ID not found |
| `START_ERROR` | No | Failed to start interview |
| `WEBSOCKET_ERROR` | No | WebSocket connection error |

---

### session_ended

Sent when the interview session has ended.

```json
{
  "type": "session_ended",
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "total_turns": 12
}
```

| Field | Type | Description |
|-------|------|-------------|
| `type` | string | Always `"session_ended"` |
| `session_id` | string | UUID of the ended session |
| `total_turns` | number | Total number of conversation turns |

---

## Schemas

### ParsedResume

Complete parsed resume data structure.

```typescript
interface ParsedResume {
  contact: ContactInfo;
  summary: string | null;
  experiences: Experience[];
  education: Education[];
  skills: string[];
  certifications: string[];
  raw_text: string;
}

interface ContactInfo {
  name: string;           // Required
  email: string | null;
  phone: string | null;
  location: string | null;
  linkedin: string | null;
}

interface Experience {
  company: string;        // Required
  title: string;          // Required
  start_date: string | null;
  end_date: string | null;
  description: string;
  highlights: string[];
}

interface Education {
  institution: string;    // Required
  degree: string;         // Required
  field: string | null;
  graduation_date: string | null;
}
```

---

## Message Flow Example

Complete example of a typical interview session:

```
1. Client connects to ws://localhost:8000/ws/interview/abc123

2. Server -> Client:
   {"type": "session_started", "session_id": "abc123"}

3. Client -> Server: (optional)
   {"type": "resume_context", "parsed_resume": {...}}

4. Client -> Server:
   {"type": "start_interview"}

5. Server -> Client:
   {"type": "status", "state": "generating"}

6. Server -> Client:
   {"type": "transcript", "role": "interviewer", "text": "Hello! Welcome...", "sequence": 1}

7. Server -> Client:
   {"type": "status", "state": "speaking"}

8. Server -> Client:
   {"type": "audio", "data": "...", "format": "mp3"}

9. Server -> Client:
   {"type": "status", "state": "ready"}

10. Client -> Server: (after playing audio)
    {"type": "playback_complete"}

11. Client -> Server: (user speaks)
    {"type": "audio", "data": "...", "format": "webm"}

12. Server -> Client:
    {"type": "status", "state": "processing_stt"}

13. Server -> Client:
    {"type": "transcript", "role": "candidate", "text": "Hi, thank you...", "sequence": 2}

... (loop continues)

N. Client -> Server:
   {"type": "end_session"}

N+1. Server -> Client:
     {"type": "session_ended", "session_id": "abc123", "total_turns": 12}
```

---

## Rate Limits

Currently, no rate limits are enforced (development environment).

**Planned:**
- REST endpoints: 100 requests/minute
- WebSocket messages: 10 messages/second
- File uploads: 10 uploads/minute

---

## Authentication

Currently, no authentication is required (development environment).

**Planned:**
- JWT Bearer tokens for REST endpoints
- Session tokens for WebSocket connections
- API key support for programmatic access
