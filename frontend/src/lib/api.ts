import type { InterviewSession, Resume, Scorecard, User } from '../types'

const API_BASE = '/api'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail || `Request failed: ${res.status}`)
  }

  return res.json()
}

// Auth
export const getMe = () => request<User>('/auth/me')

export const logout = () =>
  request<{ ok: boolean }>('/auth/logout', { method: 'POST' })

// Resumes
export const uploadResume = async (file: File): Promise<Resume> => {
  const formData = new FormData()
  formData.append('file', file)

  const res = await fetch(`${API_BASE}/resumes/upload`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail || 'Upload failed')
  }

  return res.json()
}

export const listResumes = () => request<Resume[]>('/resumes')

export const getResume = (id: string) => request<Resume>(`/resumes/${id}`)

// Sessions
export const createSession = (data: {
  resume_id: string
  voice?: string
  target_questions?: number
}) =>
  request<InterviewSession>('/sessions', {
    method: 'POST',
    body: JSON.stringify(data),
  })

export const listSessions = () => request<InterviewSession[]>('/sessions')

export const getSession = (id: string) =>
  request<InterviewSession>(`/sessions/${id}`)

export const getScorecard = (sessionId: string) =>
  request<Scorecard>(`/sessions/${sessionId}/scorecard`)
