export type InterviewState =
  | "ready"
  | "processing_stt"
  | "generating"
  | "speaking"
  | "error";

export type MessageType =
  | "status"
  | "transcript"
  | "transcript_delta"
  | "audio"
  | "audio_chunk"
  | "streaming_status"
  | "error"
  | "session_started"
  | "session_ended"
  | "evaluation"
  | "problem"
  | "code_evaluation";

export interface StatusMessage {
  type: "status";
  state: InterviewState;
}

export interface TranscriptMessage {
  type: "transcript";
  role: "candidate" | "interviewer";
  text: string;
  sequence: number;
}

export interface AudioMessage {
  type: "audio";
  data: string;
  format: string;
}

export interface ErrorMessage {
  type: "error";
  code: string;
  message: string;
  recoverable: boolean;
}

export interface SessionStartedMessage {
  type: "session_started";
  session_id: string;
}

export interface SessionEndedMessage {
  type: "session_ended";
  session_id: string;
  total_turns: number;
}

export interface EvaluationMessage {
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

export interface ProblemMessage {
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

export interface CodeEvaluationMessage {
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

// Streaming message types
export interface TranscriptDeltaMessage {
  type: "transcript_delta";
  role: "candidate" | "interviewer";
  delta: string;
  is_final: boolean;
  sequence: number;
}

export interface AudioChunkMessage {
  type: "audio_chunk";
  data: string; // Base64 encoded audio chunk
  format: string;
  sequence: number;
  is_final: boolean;
}

export type StreamingStage = "transcribing" | "thinking" | "speaking";

export interface StreamingStatusMessage {
  type: "streaming_status";
  stage: StreamingStage;
  latency_ms?: number;
}

export type ServerMessage =
  | StatusMessage
  | TranscriptMessage
  | TranscriptDeltaMessage
  | AudioMessage
  | AudioChunkMessage
  | StreamingStatusMessage
  | ErrorMessage
  | SessionStartedMessage
  | SessionEndedMessage
  | EvaluationMessage
  | ProblemMessage
  | CodeEvaluationMessage;

const VALID_MESSAGE_TYPES = new Set<string>([
  "status",
  "transcript",
  "transcript_delta",
  "audio",
  "audio_chunk",
  "streaming_status",
  "error",
  "session_started",
  "session_ended",
  "evaluation",
  "problem",
  "code_evaluation",
]);

function isServerMessage(data: unknown): data is ServerMessage {
  return (
    typeof data === "object" &&
    data !== null &&
    "type" in data &&
    typeof (data as Record<string, unknown>).type === "string" &&
    VALID_MESSAGE_TYPES.has((data as Record<string, unknown>).type as string)
  );
}

export interface WSClientOptions {
  url: string;
  onStatusChange?: (state: InterviewState) => void;
  onTranscript?: (role: "candidate" | "interviewer", text: string, sequence: number) => void;
  onTranscriptDelta?: (role: "candidate" | "interviewer", delta: string, isFinal: boolean, sequence: number) => void;
  onAudio?: (audioBase64: string, format: string) => void;
  onAudioChunk?: (audioBase64: string, format: string, sequence: number, isFinal: boolean) => void;
  onStreamingStatus?: (stage: StreamingStage, latencyMs?: number) => void;
  onError?: (code: string, message: string, recoverable: boolean) => void;
  onSessionStart?: (sessionId: string) => void;
  onSessionEnd?: (sessionId: string, totalTurns: number) => void;
  onConnectionChange?: (connected: boolean) => void;
  onEvaluation?: (round: number, score: number, passed: boolean, feedback: string) => void;
  onProblem?: (problem: ProblemMessage["problem"]) => void;
  onCodeEvaluation?: (result: CodeEvaluationMessage) => void;
}

export class WSClient {
  private ws: WebSocket | null = null;
  private options: WSClientOptions;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 8;
  private reconnectDelay = 2000;
  private intentionalDisconnect = false;

  constructor(options: WSClientOptions) {
    this.options = options;
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN || this.ws?.readyState === WebSocket.CONNECTING) {
      return;
    }

    this.intentionalDisconnect = false;
    this.ws = new WebSocket(this.options.url);

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.options.onConnectionChange?.(true);
    };

    this.ws.onclose = () => {
      this.options.onConnectionChange?.(false);
      this.attemptReconnect();
    };

    this.ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      this.options.onError?.("CONNECTION_ERROR", "WebSocket connection error", true);
    };

    this.ws.onmessage = (event) => {
      try {
        const parsed: unknown = JSON.parse(event.data);
        if (!isServerMessage(parsed)) {
          console.warn("Received unknown or malformed WebSocket message:", parsed);
          return;
        }
        this.handleMessage(parsed);
      } catch (error) {
        console.error("Failed to parse WebSocket message:", error);
        this.options.onError?.("PARSE_ERROR", "Failed to parse server message", true);
      }
    };
  }

  private handleMessage(message: ServerMessage): void {
    switch (message.type) {
      case "status":
        this.options.onStatusChange?.(message.state);
        break;
      case "transcript":
        this.options.onTranscript?.(message.role, message.text, message.sequence);
        break;
      case "transcript_delta":
        this.options.onTranscriptDelta?.(message.role, message.delta, message.is_final, message.sequence);
        break;
      case "audio":
        this.options.onAudio?.(message.data, message.format);
        break;
      case "audio_chunk":
        this.options.onAudioChunk?.(message.data, message.format, message.sequence, message.is_final);
        break;
      case "streaming_status":
        this.options.onStreamingStatus?.(message.stage, message.latency_ms);
        break;
      case "error":
        this.options.onError?.(message.code, message.message, message.recoverable);
        break;
      case "session_started":
        this.options.onSessionStart?.(message.session_id);
        break;
      case "session_ended":
        this.options.onSessionEnd?.(message.session_id, message.total_turns);
        break;
      case "evaluation":
        this.options.onEvaluation?.(message.round, message.score, message.passed, message.feedback);
        break;
      case "problem":
        this.options.onProblem?.(message.problem);
        break;
      case "code_evaluation":
        this.options.onCodeEvaluation?.(message);
        break;
    }
  }

  private attemptReconnect(): void {
    if (this.intentionalDisconnect) return;

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.options.onError?.(
        "MAX_RECONNECT",
        "Failed to reconnect after multiple attempts",
        false
      );
      return;
    }

    this.reconnectAttempts++;
    setTimeout(() => {
      this.connect();
    }, this.reconnectDelay * this.reconnectAttempts);
  }

  sendAudio(audioBase64: string, format: string = "webm"): void {
    if (this.ws?.readyState !== WebSocket.OPEN) {
      this.options.onError?.("NOT_CONNECTED", "WebSocket not connected", true);
      return;
    }

    this.ws.send(
      JSON.stringify({
        type: "audio",
        data: audioBase64,
        format,
      })
    );
  }

  sendResumeContext(resumeData: object): void {
    if (this.ws?.readyState !== WebSocket.OPEN) {
      this.options.onError?.("NOT_CONNECTED", "WebSocket not connected", true);
      return;
    }

    this.ws.send(
      JSON.stringify({
        type: "resume_context",
        parsed_resume: resumeData,
      })
    );
  }

  sendStartInterview(role?: string, round?: number, mode?: string): void {
    if (this.ws?.readyState !== WebSocket.OPEN) {
      this.options.onError?.("NOT_CONNECTED", "WebSocket not connected", true);
      return;
    }

    const message: { type: string; role?: string; round?: number; mode?: string } = { type: "start_interview" };
    if (role) {
      message.role = role;
    }
    if (round) {
      message.round = round;
    }
    if (mode) {
      message.mode = mode;
    }
    this.ws.send(JSON.stringify(message));
  }

  requestEvaluation(): void {
    if (this.ws?.readyState !== WebSocket.OPEN) {
      this.options.onError?.("NOT_CONNECTED", "WebSocket not connected", true);
      return;
    }

    this.ws.send(JSON.stringify({ type: "request_evaluation" }));
  }

  sendPlaybackComplete(): void {
    if (this.ws?.readyState !== WebSocket.OPEN) return;

    this.ws.send(JSON.stringify({ type: "playback_complete" }));
  }

  endSession(): void {
    if (this.ws?.readyState !== WebSocket.OPEN) return;

    this.ws.send(JSON.stringify({ type: "end_session" }));
  }

  requestProblem(): void {
    if (this.ws?.readyState !== WebSocket.OPEN) {
      this.options.onError?.("NOT_CONNECTED", "WebSocket not connected", true);
      return;
    }

    this.ws.send(JSON.stringify({ type: "request_problem" }));
  }

  sendCodeSubmission(code: string, language: string, problemId: string): void {
    if (this.ws?.readyState !== WebSocket.OPEN) {
      this.options.onError?.("NOT_CONNECTED", "WebSocket not connected", true);
      return;
    }

    this.ws.send(
      JSON.stringify({
        type: "code_submission",
        code,
        language,
        problem_id: problemId,
      })
    );
  }

  disconnect(): void {
    this.intentionalDisconnect = true;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

export function createWSClient(sessionId: string, options: Omit<WSClientOptions, "url">): WSClient {
  const wsUrl = (process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000").trim();
  if (!process.env.NEXT_PUBLIC_WS_URL && typeof window !== "undefined" && window.location.hostname !== "localhost") {
    console.warn("NEXT_PUBLIC_WS_URL is not set and hostname is not localhost — WebSocket may fail to connect.");
  }
  return new WSClient({
    url: `${wsUrl}/ws/interview/${sessionId}`,
    ...options,
  });
}
