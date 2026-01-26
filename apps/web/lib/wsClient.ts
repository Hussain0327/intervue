export type InterviewState =
  | "ready"
  | "processing_stt"
  | "generating"
  | "speaking"
  | "error";

export type MessageType =
  | "status"
  | "transcript"
  | "audio"
  | "error"
  | "session_started"
  | "session_ended"
  | "evaluation";

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

export type ServerMessage =
  | StatusMessage
  | TranscriptMessage
  | AudioMessage
  | ErrorMessage
  | SessionStartedMessage
  | SessionEndedMessage
  | EvaluationMessage;

export interface WSClientOptions {
  url: string;
  onStatusChange?: (state: InterviewState) => void;
  onTranscript?: (role: "candidate" | "interviewer", text: string, sequence: number) => void;
  onAudio?: (audioBase64: string, format: string) => void;
  onError?: (code: string, message: string, recoverable: boolean) => void;
  onSessionStart?: (sessionId: string) => void;
  onSessionEnd?: (sessionId: string, totalTurns: number) => void;
  onConnectionChange?: (connected: boolean) => void;
  onEvaluation?: (round: number, score: number, passed: boolean, feedback: string) => void;
}

export class WSClient {
  private ws: WebSocket | null = null;
  private options: WSClientOptions;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private reconnectDelay = 1000;

  constructor(options: WSClientOptions) {
    this.options = options;
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

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
        const message: ServerMessage = JSON.parse(event.data);
        this.handleMessage(message);
      } catch (error) {
        console.error("Failed to parse message:", error);
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
      case "audio":
        this.options.onAudio?.(message.data, message.format);
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
    }
  }

  private attemptReconnect(): void {
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

  disconnect(): void {
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
  const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000";
  return new WSClient({
    url: `${wsUrl}/ws/interview/${sessionId}`,
    ...options,
  });
}
