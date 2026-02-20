export interface User {
  id: string
  email: string
  name: string | null
  avatar_url: string | null
  provider: string
}

export interface Resume {
  id: string
  filename: string
  structured_data: StructuredResume | null
  created_at: string
}

export interface StructuredResume {
  summary: string
  roles: ResumeRole[]
  skills: string[]
  projects: ResumeProject[]
  education: ResumeEducation[]
}

export interface ResumeRole {
  title: string
  company: string
  duration: string
  highlights: string[]
}

export interface ResumeProject {
  name: string
  description: string
  technologies: string[]
}

export interface ResumeEducation {
  degree: string
  institution: string
  year: string
}

export interface InterviewSession {
  id: string
  resume_id: string
  status: 'pending' | 'active' | 'completed' | 'abandoned'
  config: SessionConfig
  questions: InterviewQuestion[]
  started_at: string | null
  completed_at: string | null
  created_at: string
}

export interface SessionConfig {
  voice: string
  target_questions: number
}

export interface InterviewQuestion {
  text: string
  competency: string
  context: string
  difficulty: string
}

export interface Scorecard {
  session_id: string
  overall_score: number
  scores: Record<string, number>
  feedback: string
  strengths: string[]
  areas_for_improvement: string[]
  recommendation: string | null
  recommendation_reasoning: string | null
  per_question: QuestionEvaluation[]
}

export interface QuestionEvaluation {
  question_index: number
  question_text: string
  answer_summary: string
  scores: Record<string, number>
  overall_score: number
  feedback: string
  strengths: string[]
  areas_for_improvement: string[]
}

// WebSocket message types
export type WSServerMessage =
  | { type: 'ready'; total_questions: number; current_index: number; state: string }
  | { type: 'interview_started'; total_questions: number }
  | { type: 'question'; text: string; index: number }
  | { type: 'follow_up'; text: string; index: number }
  | { type: 'tts_done' }
  | { type: 'listening' }
  | { type: 'transcription'; text: string }
  | { type: 'thinking' }
  | { type: 'interview_complete' }
  | { type: 'error'; message: string }

export type InterviewPhase =
  | 'connecting'
  | 'ready'
  | 'speaking'
  | 'listening'
  | 'thinking'
  | 'complete'

export interface TranscriptEntry {
  role: 'interviewer' | 'candidate'
  content: string
  type: 'question' | 'answer' | 'follow_up' | 'follow_up_answer'
}
