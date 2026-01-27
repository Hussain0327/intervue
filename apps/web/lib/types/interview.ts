// Interview-related type definitions

export type InterviewTab = "transcript" | "notes" | "rubric" | "resume";

export type RoundStatus = "locked" | "in_progress" | "passed" | "failed";

export interface RoundInfo {
  round: 1 | 2 | 3;
  type: "behavioral" | "coding" | "system_design";
  title: string;
  passScore: number;
}

export interface InterviewModeConfig {
  id: string;
  title: string;
  description: string;
  rounds: readonly (1 | 2 | 3)[];
}

export interface RubricDimension {
  id: string;
  name: string;
  description: string;
  weight: number;
}

export interface RubricConfig {
  roundType: "behavioral" | "coding" | "system_design";
  dimensions: RubricDimension[];
}

export interface ParsedResumeContext {
  contact?: {
    name?: string;
    email?: string;
    phone?: string;
    location?: string;
    linkedin?: string;
  };
  summary?: string;
  experiences?: Array<{
    company: string;
    title: string;
    start_date?: string;
    end_date?: string;
    description?: string;
    highlights?: string[];
  }>;
  education?: Array<{
    institution: string;
    degree?: string;
    field?: string;
    graduation_date?: string;
  }>;
  skills?: string[];
  certifications?: string[];
}

export interface InterviewNote {
  id: string;
  content: string;
  timestamp: Date;
  highlightedText?: string;
}

export type LatencyStage = "idle" | "uploading" | "transcribing" | "generating" | "speaking";
