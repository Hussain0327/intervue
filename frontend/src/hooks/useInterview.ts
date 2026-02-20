import { useState, useEffect } from 'react'
import { getSession } from '../lib/api'
import type { InterviewSession } from '../types'

export function useInterview(sessionId: string | undefined) {
  const [session, setSession] = useState<InterviewSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!sessionId) return

    getSession(sessionId)
      .then(setSession)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [sessionId])

  return { session, loading, error }
}
