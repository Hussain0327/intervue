# Coding Challenge Feature Documentation

Comprehensive documentation for the coding challenge feature in Intervue.

## Overview

The coding challenge feature allows candidates to solve LeetCode-style programming problems during interviews. Problems are selected based on the candidate's resume and target role. Candidates write actual code in a Monaco-powered editor while still being able to ask clarifying questions via voice.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Frontend (Next.js)                          │
├─────────────────────────────────────────────────────────────────────┤
│  CodingChallengeLayout                                              │
│  ├── Compact Voice Controls (Recorder + Player)                     │
│  ├── ProblemPanel (40%)                                             │
│  │   └── Problem description, examples, constraints                 │
│  └── CodeEditor (60%)                                               │
│      ├── Monaco Editor with syntax highlighting                     │
│      ├── LanguageSelector dropdown                                  │
│      └── Submit button                                              │
├─────────────────────────────────────────────────────────────────────┤
│                         WebSocket Protocol                          │
├─────────────────────────────────────────────────────────────────────┤
│  request_problem ──────────────────────────► problem                │
│  code_submission ──────────────────────────► code_evaluation        │
│  audio (clarifying questions) ─────────────► transcript + audio     │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         Backend (FastAPI)                           │
├─────────────────────────────────────────────────────────────────────┤
│  services/coding/                                                   │
│  ├── problem_bank.py      → 19 curated problems                     │
│  ├── problem_selector.py  → AI-based problem selection              │
│  └── code_evaluator.py    → AI-powered code evaluation              │
├─────────────────────────────────────────────────────────────────────┤
│  services/orchestrator/                                             │
│  ├── state.py             → Interview state with code fields        │
│  └── evaluator.py         → Round evaluation with code rubric       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## File Structure

### Frontend Files

```
apps/web/
├── components/
│   └── coding/
│       ├── index.ts                    # Component exports
│       ├── CodeEditor.tsx              # Monaco editor wrapper
│       ├── ProblemPanel.tsx            # Problem display
│       ├── LanguageSelector.tsx        # Language dropdown
│       └── CodingChallengeLayout.tsx   # Main layout component
├── lib/
│   ├── types/
│   │   └── coding.ts                   # TypeScript types
│   ├── wsClient.ts                     # WebSocket client (updated)
│   └── rubricConfig.ts                 # Rubric configurations (updated)
└── app/
    └── interview/
        └── [sessionId]/
            └── page.tsx                # Interview page (updated)
```

### Backend Files

```
services/api/app/
├── schemas/
│   ├── coding.py                       # Pydantic models
│   └── ws_messages.py                  # WebSocket messages (updated)
├── services/
│   ├── coding/
│   │   ├── __init__.py                 # Service exports
│   │   ├── problem_bank.py             # Problem definitions
│   │   ├── problem_selector.py         # Problem selection logic
│   │   └── code_evaluator.py           # Code evaluation service
│   └── orchestrator/
│       ├── state.py                    # Interview state (updated)
│       └── evaluator.py                # Round evaluation (updated)
└── routers/
    └── ws_interview.py                 # WebSocket handlers (updated)
```

---

## Problem Bank

### Problem Categories

| Difficulty | Count | Examples |
|------------|-------|----------|
| Easy | 5 | Two Sum, Valid Parentheses, Reverse Linked List |
| Medium | 9 | LRU Cache, Number of Islands, Coin Change |
| Hard | 5 | Merge K Sorted Lists, Trapping Rain Water |

### All Problems

| ID | Title | Difficulty | Tags |
|----|-------|------------|------|
| `two-sum` | Two Sum | Easy | arrays, hash-table |
| `valid-parentheses` | Valid Parentheses | Easy | strings, stack |
| `reverse-linked-list` | Reverse Linked List | Easy | linked-list |
| `max-subarray` | Maximum Subarray | Easy | arrays, dynamic-programming |
| `merge-sorted-arrays` | Merge Sorted Arrays | Easy | arrays, two-pointers |
| `longest-substring` | Longest Substring Without Repeating | Medium | strings, hash-table |
| `add-two-numbers` | Add Two Numbers | Medium | linked-list, math |
| `three-sum` | 3Sum | Medium | arrays, two-pointers |
| `binary-tree-level-order` | Binary Tree Level Order Traversal | Medium | trees, bfs |
| `coin-change` | Coin Change | Medium | dynamic-programming |
| `lru-cache` | LRU Cache | Medium | hash-table, linked-list |
| `number-of-islands` | Number of Islands | Medium | graphs, dfs, bfs |
| `word-search` | Word Search | Medium | graphs, dfs |
| `product-except-self` | Product of Array Except Self | Medium | arrays |
| `merge-k-sorted-lists` | Merge K Sorted Lists | Hard | linked-list, heap |
| `trapping-rain-water` | Trapping Rain Water | Hard | arrays, two-pointers |
| `word-ladder` | Word Ladder | Hard | graphs, bfs |
| `median-two-arrays` | Median of Two Sorted Arrays | Hard | arrays, binary-search |
| `serialize-binary-tree` | Serialize and Deserialize Binary Tree | Hard | trees, bfs, dfs |

### Adding New Problems

To add a new problem, edit `services/api/app/services/coding/problem_bank.py`:

```python
CodingProblem(
    id="new-problem-id",
    title="New Problem Title",
    difficulty="medium",  # "easy", "medium", or "hard"
    description="""Problem description here.

Supports **markdown** formatting.""",
    examples=[
        Example(
            input="[1, 2, 3]",
            output="6",
            explanation="1 + 2 + 3 = 6"
        )
    ],
    constraints=[
        "1 <= arr.length <= 10^5",
        "-10^9 <= arr[i] <= 10^9"
    ],
    starter_code={
        "python": "def solution(arr):\n    pass",
        "javascript": "function solution(arr) {\n    \n}",
        "typescript": "function solution(arr: number[]): number {\n    \n}",
        "java": "class Solution {\n    public int solution(int[] arr) {\n        \n    }\n}",
        "cpp": "class Solution {\npublic:\n    int solution(vector<int>& arr) {\n        \n    }\n};",
        "go": "func solution(arr []int) int {\n    \n}"
    },
    tags=["arrays", "math"]  # Use existing tags
)
```

---

## Problem Selection Algorithm

The problem selector (`services/coding/problem_selector.py`) uses a weighted algorithm:

### 1. Skill-to-Tag Mapping

Resume skills are mapped to problem tags:

```python
SKILL_TAG_MAPPING = {
    "python": ["arrays", "hash-table", "strings"],
    "javascript": ["arrays", "strings", "hash-table"],
    "react": ["arrays", "trees"],
    "sql": ["hash-table", "sorting"],
    "algorithms": ["dynamic-programming", "graphs", "binary-search"],
    "data structures": ["trees", "linked-list", "graphs", "heap"],
    ...
}
```

### 2. Role-to-Tag Mapping

Target roles influence problem selection:

```python
ROLE_TAG_MAPPING = {
    "frontend": ["arrays", "strings", "trees"],
    "backend": ["arrays", "hash-table", "graphs", "dynamic-programming"],
    "fullstack": ["arrays", "hash-table", "strings"],
    "data": ["arrays", "sorting", "hash-table", "dynamic-programming"],
    ...
}
```

### 3. Difficulty Selection

Based on years of experience:

| Experience | Difficulty |
|------------|------------|
| 0-2 years | Easy |
| 3-5 years | Medium |
| 6+ years | Hard |

### 4. Weighted Random Selection

Problems matching candidate's tags get higher weights:

```python
weight = 3 if any(tag in candidate_tags for tag in problem.tags) else 1
```

---

## Code Evaluation

The code evaluator (`services/coding/code_evaluator.py`) uses AI to analyze submissions.

### Evaluation Criteria

| Criterion | Weight | Description |
|-----------|--------|-------------|
| Correctness | 40% | Does the solution work? |
| Edge Cases | 20% | Handles boundary conditions |
| Code Quality | 20% | Readability, naming, structure |
| Complexity | 20% | Time/space complexity |

### Evaluation Prompt

The evaluator sends the following to the LLM:

```
PROBLEM: {title}
{description}

EXAMPLES:
{examples}

CONSTRAINTS:
{constraints}

SUBMITTED CODE ({language}):
{code}

Score each criterion 0-100 and provide feedback.
```

### Response Format

```json
{
  "correct": true,
  "score": 85,
  "feedback": "Well-structured solution with O(n) time complexity...",
  "analysis": {
    "correctness": 90,
    "edgeCaseHandling": 80,
    "codeQuality": 85,
    "complexity": 85
  }
}
```

---

## Frontend Components

### CodingChallengeLayout

Main layout component that orchestrates the coding challenge UI.

**Props:**
```typescript
interface CodingChallengeLayoutProps {
  problem: CodingProblem | null;
  isProblemLoading: boolean;
  evaluationResult: CodeEvaluationResult | null;
  isSubmitting: boolean;
  onCodeSubmit: (code: string, language: SupportedLanguage) => void;
  // Audio control props for voice interaction
  isRecording: boolean;
  isPlaying: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  // Interviewer state
  interviewerName: string;
  currentState: string;
}
```

### CodeEditor

Monaco-based code editor with language selection.

**Features:**
- Syntax highlighting for 6 languages
- Keyboard shortcut (Ctrl/Cmd + Enter) for submission
- Language selector dropdown
- Submit button with loading state
- Dynamic import to avoid SSR issues

**Props:**
```typescript
interface CodeEditorProps {
  initialCode?: string;
  language: SupportedLanguage;
  onLanguageChange: (lang: SupportedLanguage) => void;
  onSubmit: (code: string) => void;
  isSubmitting?: boolean;
}
```

### ProblemPanel

Displays the problem description, examples, and constraints.

**Props:**
```typescript
interface ProblemPanelProps {
  problem: CodingProblem;
}
```

**Sections:**
1. Title with difficulty badge (color-coded)
2. Description (markdown support)
3. Examples with input/output/explanation
4. Constraints list

---

## WebSocket Protocol

### Client Messages

#### request_problem
```json
{ "type": "request_problem" }
```

#### code_submission
```json
{
  "type": "code_submission",
  "code": "def solution(): ...",
  "language": "python",
  "problem_id": "two-sum"
}
```

### Server Messages

#### problem
```json
{
  "type": "problem",
  "problem": {
    "id": "two-sum",
    "title": "Two Sum",
    "difficulty": "easy",
    "description": "...",
    "examples": [...],
    "constraints": [...],
    "starterCode": {...},
    "tags": [...]
  }
}
```

#### code_evaluation
```json
{
  "type": "code_evaluation",
  "correct": true,
  "score": 85,
  "feedback": "...",
  "analysis": {...}
}
```

---

## Interview Flow

### Coding Round Sequence

```
1. Client selects "Coding Challenge" mode
2. Client connects to WebSocket
3. Server sends session_started
4. Client sends start_interview with mode="coding"
5. Server generates introduction via voice
6. Client sends request_problem
7. Server selects problem based on resume + role
8. Server sends problem message
9. Client displays problem + code editor
10. [Clarification Loop]
    - Candidate asks questions via voice
    - AI responds via voice
11. Candidate writes code
12. Candidate clicks "Submit Solution"
13. Client sends code_submission
14. Server evaluates code via AI
15. Server sends code_evaluation
16. AI announces result via voice
17. [Follow-up discussion via voice]
18. Client sends request_evaluation for round score
19. Server sends evaluation message
```

---

## State Management

### InterviewState (Backend)

New fields added for coding challenges:

```python
@dataclass
class InterviewState:
    # ... existing fields ...

    # Coding challenge state
    current_problem: CodingProblem | None = None
    submitted_code: str | None = None
    submitted_language: str | None = None
```

### Frontend State

In `app/interview/[sessionId]/page.tsx`:

```typescript
// Coding challenge state
const [codingProblem, setCodingProblem] = useState<CodingProblem | null>(null);
const [isProblemLoading, setIsProblemLoading] = useState(false);
const [codeEvaluationResult, setCodeEvaluationResult] = useState<CodeEvaluationResult | null>(null);
const [isCodeSubmitting, setIsCodeSubmitting] = useState(false);
```

---

## Rubric Configuration

### Coding Round Rubric

Updated in `lib/rubricConfig.ts`:

```typescript
coding: {
  roundType: "coding",
  dimensions: [
    { id: "problem-understanding", name: "Problem Understanding", weight: 15 },
    { id: "approach", name: "Approach", weight: 20 },
    { id: "code-correctness", name: "Code Correctness", weight: 25 },
    { id: "complexity", name: "Complexity Analysis", weight: 20 },
    { id: "communication", name: "Communication", weight: 20 },
  ],
}
```

### Backend Rubric

Updated in `services/orchestrator/evaluator.py`:

```
1. Problem Understanding (15 points)
   - Correctly understood the problem
   - Asked clarifying questions
   - Identified edge cases

2. Approach & Strategy (20 points)
   - Explained strategy before coding
   - Logical problem breakdown
   - Appropriate data structure selection

3. Code Correctness (25 points)
   - Solution actually works
   - Handles edge cases correctly
   - No logical errors or bugs

4. Complexity Analysis (20 points)
   - Accurate time complexity analysis
   - Accurate space complexity analysis
   - Understands trade-offs

5. Communication (20 points)
   - Clear explanation of thought process
   - Articulates reasoning while coding
   - Handles hints/feedback constructively
```

---

## Dependencies

### Frontend

```json
{
  "@monaco-editor/react": "^4.6.0"
}
```

Installed via: `pnpm add @monaco-editor/react --filter @intervue/web`

### Backend

No additional dependencies required. Uses existing:
- `pydantic` for data validation
- LLM client for code evaluation

---

## Future Improvements

### Planned Features

1. **Code Execution Sandbox**
   - Actually run submitted code
   - Validate against test cases
   - Return runtime and memory metrics

2. **More Problems**
   - Expand problem bank to 50+ problems
   - Add domain-specific problems (frontend, backend, data)
   - Support problem difficulty progression

3. **Enhanced Editor**
   - Multiple file support
   - Code templates and snippets
   - Integrated documentation

4. **Test Cases**
   - Show hidden test case results
   - Allow custom test case input
   - Display expected vs actual output

### Extension Points

**Adding a new language:**
1. Update `SupportedLanguage` type in `lib/types/coding.ts`
2. Add language to `SUPPORTED_LANGUAGES` array
3. Add starter code for each problem in `problem_bank.py`
4. Monaco automatically supports syntax highlighting for most languages

**Adding evaluation criteria:**
1. Update `CodeEvaluationAnalysis` schema in `schemas/coding.py`
2. Update evaluation prompt in `code_evaluator.py`
3. Update frontend `CodeEvaluationResult` type
4. Update `CodingChallengeLayout` to display new criteria

---

## Testing

### Manual Testing Checklist

1. **Problem Selection**
   - [ ] Upload resume with programming skills
   - [ ] Start coding interview
   - [ ] Verify problem matches resume skills
   - [ ] Verify difficulty matches experience level

2. **Code Editor**
   - [ ] Code editor loads without errors
   - [ ] Syntax highlighting works for all languages
   - [ ] Language selector changes starter code
   - [ ] Ctrl/Cmd+Enter submits code
   - [ ] Submit button shows loading state

3. **Code Evaluation**
   - [ ] Correct solution gets high score
   - [ ] Incorrect solution gets low score
   - [ ] Feedback is specific and helpful
   - [ ] Analysis breakdown is displayed

4. **Voice Integration**
   - [ ] Can ask clarifying questions via voice
   - [ ] AI responds appropriately
   - [ ] Evaluation result announced via voice

### Running the Application

```bash
# Start all services
make dev

# Or individually:
cd services/api && source .venv/bin/activate && python -m uvicorn app.main:app --reload
cd apps/web && pnpm dev

# Access at http://localhost:3000
```

---

## Troubleshooting

### Common Issues

**Monaco editor not loading:**
- Check browser console for errors
- Ensure `@monaco-editor/react` is installed
- Try clearing Next.js cache: `rm -rf .next`

**Problem not appearing:**
- Check WebSocket connection in browser DevTools
- Verify backend is running and responding
- Check for errors in FastAPI logs

**Code evaluation failing:**
- Ensure LLM API keys are configured
- Check backend logs for API errors
- Verify problem_id matches submitted code

**TypeScript errors:**
- Run `pnpm tsc --noEmit` to check types
- Ensure `lib/types/coding.ts` is properly imported

---

## Contributing

When modifying the coding challenge feature:

1. Update types in both frontend (`lib/types/coding.ts`) and backend (`schemas/coding.py`)
2. Keep WebSocket message formats in sync
3. Update this documentation for any API changes
4. Test with multiple problem types and languages
5. Verify voice integration still works
