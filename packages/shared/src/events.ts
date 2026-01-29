// WebSocket event types

export type InterviewState =
  | "ready"
  | "processing_stt"
  | "generating"
  | "speaking"
  | "error";

// --- Server -> Client Events ---

export interface StatusEvent {
  type: "status";
  state: InterviewState;
}

export interface TranscriptEvent {
  type: "transcript";
  role: "candidate" | "interviewer";
  text: string;
  sequence: number;
}

export interface AudioEvent {
  type: "audio";
  data: string;
  format: string;
}

export interface ErrorEvent {
  type: "error";
  code: string;
  message: string;
  recoverable: boolean;
}

export interface SessionStartedEvent {
  type: "session_started";
  session_id: string;
}

export interface SessionEndedEvent {
  type: "session_ended";
  session_id: string;
  total_turns: number;
}

export interface EvaluationEvent {
  type: "evaluation";
  round: number;
  score: number;
  passed: boolean;
  feedback: string;
}

export interface ProblemExample {
  input: string;
  output: string;
  explanation?: string;
}

export interface ProblemEvent {
  type: "problem";
  problem: {
    id: string;
    title: string;
    difficulty: "easy" | "medium" | "hard";
    description: string;
    examples: ProblemExample[];
    constraints: string[];
    starterCode: Record<string, string>;
    tags: string[];
  };
}

export interface CodeEvaluationEvent {
  type: "code_evaluation";
  correct: boolean;
  score: number;
  feedback: string;
  analysis?: {
    correctness: number;
    edgeCaseHandling: number;
    codeQuality: number;
    complexity: number;
  };
}

export interface TranscriptDeltaEvent {
  type: "transcript_delta";
  role: "candidate" | "interviewer";
  delta: string;
  is_final: boolean;
  sequence: number;
}

export interface AudioChunkEvent {
  type: "audio_chunk";
  data: string;
  format: string;
  sequence: number;
  is_final: boolean;
}

export type StreamingStage = "transcribing" | "thinking" | "speaking";

export interface StreamingStatusEvent {
  type: "streaming_status";
  stage: StreamingStage;
  latency_ms?: number;
}

export type ServerEvent =
  | StatusEvent
  | TranscriptEvent
  | AudioEvent
  | ErrorEvent
  | SessionStartedEvent
  | SessionEndedEvent
  | EvaluationEvent
  | ProblemEvent
  | CodeEvaluationEvent
  | TranscriptDeltaEvent
  | AudioChunkEvent
  | StreamingStatusEvent;

// --- Client -> Server Messages ---

export interface AudioMessage {
  type: "audio";
  data: string;
  format: string;
}

export interface PlaybackCompleteMessage {
  type: "playback_complete";
}

export interface EndSessionMessage {
  type: "end_session";
}

export interface ResumeContextMessage {
  type: "resume_context";
  parsed_resume: Record<string, unknown>;
}

export interface StartInterviewMessage {
  type: "start_interview";
  role?: string;
  round?: number;
  mode?: string;
}

export interface RequestEvaluationMessage {
  type: "request_evaluation";
}

export interface RequestProblemMessage {
  type: "request_problem";
}

export interface CodeSubmissionMessage {
  type: "code_submission";
  code: string;
  language: string;
  problem_id: string;
}

export type ClientMessage =
  | AudioMessage
  | PlaybackCompleteMessage
  | EndSessionMessage
  | ResumeContextMessage
  | StartInterviewMessage
  | RequestEvaluationMessage
  | RequestProblemMessage
  | CodeSubmissionMessage;
