// API types

export interface InterviewSession {
  id: string;
  userId?: string;
  status: "pending" | "active" | "paused" | "completed" | "cancelled";
  interviewType: "behavioral" | "technical" | "coding" | "system_design";
  difficulty: "easy" | "medium" | "hard";
  currentStage?: string;
  startedAt?: string;
  endedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Transcript {
  id: string;
  sessionId: string;
  role: "candidate" | "interviewer" | "system";
  content: string;
  sequenceNumber: number;
  sttLatencyMs?: number;
  llmLatencyMs?: number;
  ttsLatencyMs?: number;
  createdAt: string;
}

export interface CreateSessionRequest {
  interviewType?: "behavioral" | "technical" | "coding" | "system_design";
  difficulty?: "easy" | "medium" | "hard";
}

export interface CreateSessionResponse {
  session: InterviewSession;
  wsUrl: string;
}
