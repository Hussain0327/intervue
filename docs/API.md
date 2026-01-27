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
  "type": "start_interview",
  "role": "Software Engineer",
  "round": 2,
  "mode": "coding"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | string | Yes | Must be `"start_interview"` |
| `role` | string | No | Target role (e.g., "Software Engineer", "Frontend Developer") |
| `round` | number | No | Interview round (1=behavioral, 2=coding, 3=system_design) |
| `mode` | string | No | Interview mode: `"full"`, `"behavioral"`, `"coding"`, `"system_design"` |

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

### request_problem

Request a coding problem for the coding challenge round. The server will select a problem based on the candidate's resume skills and target role.

```json
{
  "type": "request_problem"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | string | Yes | Must be `"request_problem"` |

**Note:** Send this when starting a coding round. The server will respond with a `problem` message.

---

### code_submission

Submit code for evaluation during a coding challenge.

```json
{
  "type": "code_submission",
  "code": "def two_sum(nums, target):\n    seen = {}\n    for i, n in enumerate(nums):\n        if target - n in seen:\n            return [seen[target - n], i]\n        seen[n] = i\n    return []",
  "language": "python",
  "problem_id": "two-sum"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | string | Yes | Must be `"code_submission"` |
| `code` | string | Yes | The submitted source code |
| `language` | string | Yes | Programming language (`python`, `javascript`, `typescript`, `java`, `cpp`, `go`) |
| `problem_id` | string | Yes | ID of the problem being solved |

**Note:** The server will evaluate the code and respond with a `code_evaluation` message.

---

### request_evaluation

Request evaluation of the current interview round.

```json
{
  "type": "request_evaluation"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | string | Yes | Must be `"request_evaluation"` |

**Note:** The server will analyze the conversation (and submitted code for coding rounds) and respond with an `evaluation` message.

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

### problem

Sent in response to `request_problem`. Contains the coding problem to solve.

```json
{
  "type": "problem",
  "problem": {
    "id": "two-sum",
    "title": "Two Sum",
    "difficulty": "easy",
    "description": "Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.\n\nYou can return the answer in any order.",
    "examples": [
      {
        "input": "nums = [2,7,11,15], target = 9",
        "output": "[0,1]",
        "explanation": "Because nums[0] + nums[1] == 9, we return [0, 1]."
      }
    ],
    "constraints": [
      "2 <= nums.length <= 10^4",
      "-10^9 <= nums[i] <= 10^9",
      "-10^9 <= target <= 10^9",
      "Only one valid answer exists."
    ],
    "starterCode": {
      "python": "def two_sum(nums: list[int], target: int) -> list[int]:\n    pass",
      "javascript": "function twoSum(nums, target) {\n    \n}",
      "typescript": "function twoSum(nums: number[], target: number): number[] {\n    \n}",
      "java": "class Solution {\n    public int[] twoSum(int[] nums, int target) {\n        \n    }\n}",
      "cpp": "class Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        \n    }\n};",
      "go": "func twoSum(nums []int, target int) []int {\n    \n}"
    },
    "tags": ["arrays", "hash-table"]
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `type` | string | Always `"problem"` |
| `problem.id` | string | Unique problem identifier |
| `problem.title` | string | Problem title |
| `problem.difficulty` | string | `"easy"`, `"medium"`, or `"hard"` |
| `problem.description` | string | Full problem description (markdown) |
| `problem.examples` | array | Input/output examples with explanations |
| `problem.constraints` | array | Problem constraints |
| `problem.starterCode` | object | Starter code templates by language |
| `problem.tags` | array | Problem category tags |

---

### code_evaluation

Sent in response to `code_submission`. Contains evaluation results.

```json
{
  "type": "code_evaluation",
  "correct": true,
  "score": 85,
  "feedback": "Your solution correctly solves the problem using a hash map approach with O(n) time complexity. The code is clean and readable. Consider adding comments for complex logic.",
  "analysis": {
    "correctness": 90,
    "edgeCaseHandling": 80,
    "codeQuality": 85,
    "complexity": 85
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `type` | string | Always `"code_evaluation"` |
| `correct` | boolean | Whether the solution is functionally correct |
| `score` | number | Overall score (0-100) |
| `feedback` | string | Detailed feedback on the solution |
| `analysis` | object | Breakdown by evaluation criterion (optional) |
| `analysis.correctness` | number | Score for solution correctness (0-100) |
| `analysis.edgeCaseHandling` | number | Score for handling edge cases (0-100) |
| `analysis.codeQuality` | number | Score for code quality (0-100) |
| `analysis.complexity` | number | Score for complexity analysis (0-100) |

---

### evaluation

Sent in response to `request_evaluation`. Contains interview round evaluation.

```json
{
  "type": "evaluation",
  "round": 2,
  "score": 78,
  "passed": true,
  "feedback": "Strong problem-solving skills demonstrated. Clearly explained approach before coding. Good communication throughout. Could improve edge case identification."
}
```

| Field | Type | Description |
|-------|------|-------------|
| `type` | string | Always `"evaluation"` |
| `round` | number | Interview round number (1, 2, or 3) |
| `score` | number | Overall score (0-100) |
| `passed` | boolean | Whether candidate passed (score >= 70) |
| `feedback` | string | Detailed feedback with strengths and improvement areas |

---

## Schemas

### CodingProblem

Complete coding problem structure.

```typescript
interface CodingProblem {
  id: string;                    // Unique identifier (e.g., "two-sum")
  title: string;                 // Display title
  difficulty: "easy" | "medium" | "hard";
  description: string;           // Problem description (markdown)
  examples: Example[];           // Input/output examples
  constraints: string[];         // Problem constraints
  starterCode: Record<string, string>;  // Starter code by language
  tags: string[];                // Category tags
}

interface Example {
  input: string;                 // Example input
  output: string;                // Expected output
  explanation?: string;          // Optional explanation
}
```

**Available Problem Tags:**
- `arrays`, `hash-table`, `linked-list`, `stack`
- `trees`, `binary-search`, `graphs`, `bfs`, `dfs`
- `dynamic-programming`, `greedy`, `two-pointers`
- `strings`, `math`, `sorting`, `heap`

---

### CodeEvaluationResult

Result from evaluating submitted code.

```typescript
interface CodeEvaluationResult {
  correct: boolean;              // Solution is functionally correct
  score: number;                 // Overall score (0-100)
  feedback: string;              // Detailed feedback
  analysis?: {
    correctness: number;         // Correctness score (0-100)
    edgeCaseHandling: number;    // Edge case handling (0-100)
    codeQuality: number;         // Code quality (0-100)
    complexity: number;          // Complexity analysis (0-100)
  };
}
```

---

### EvaluationResult

Result from evaluating an interview round.

```typescript
interface EvaluationResult {
  round: number;                 // Round number (1, 2, or 3)
  score: number;                 // Overall score (0-100)
  passed: boolean;               // Score >= 70
  feedback: string;              // Detailed feedback
}
```

---

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
