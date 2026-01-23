// WebSocket event types

export type InterviewState =
  | "ready"
  | "processing_stt"
  | "generating"
  | "speaking"
  | "error";

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

export type ServerEvent =
  | StatusEvent
  | TranscriptEvent
  | AudioEvent
  | ErrorEvent
  | SessionStartedEvent
  | SessionEndedEvent;

// Client messages
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

export type ClientMessage =
  | AudioMessage
  | PlaybackCompleteMessage
  | EndSessionMessage;
