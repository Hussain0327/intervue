import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Mic,
  LogOut,
  FileText,
  Clock,
  ChevronRight,
  Plus,
  Settings,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import ResumeUpload from '../components/resume/ResumeUpload'
import { listResumes, listSessions, createSession } from '../lib/api'
import type { Resume, InterviewSession } from '../types'

const VOICES = [
  { id: 'alloy', label: 'Alloy', desc: 'Neutral & balanced' },
  { id: 'nova', label: 'Nova', desc: 'Warm & friendly' },
  { id: 'onyx', label: 'Onyx', desc: 'Deep & authoritative' },
  { id: 'echo', label: 'Echo', desc: 'Clear & direct' },
  { id: 'fable', label: 'Fable', desc: 'Expressive & dynamic' },
  { id: 'shimmer', label: 'Shimmer', desc: 'Bright & energetic' },
]

export default function Dashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [resumes, setResumes] = useState<Resume[]>([])
  const [sessions, setSessions] = useState<InterviewSession[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  // New session config
  const [selectedResumeId, setSelectedResumeId] = useState<string | null>(null)
  const [selectedVoice, setSelectedVoice] = useState('nova')
  const [questionCount, setQuestionCount] = useState(4)
  const [creating, setCreating] = useState(false)
  const [showConfig, setShowConfig] = useState(false)
  const [avatarError, setAvatarError] = useState(false)

  useEffect(() => {
    Promise.all([listResumes(), listSessions()])
      .then(([r, s]) => {
        setResumes(r)
        setSessions(s)
        if (r.length > 0) setSelectedResumeId(r[0].id)
      })
      .catch((err) => {
        setFetchError(err instanceof Error ? err.message : 'Failed to load data')
      })
      .finally(() => setLoading(false))
  }, [])

  const handleStartInterview = async () => {
    if (!selectedResumeId) return
    setCreating(true)
    try {
      const session = await createSession({
        resume_id: selectedResumeId,
        voice: selectedVoice,
        target_questions: questionCount,
      })
      navigate(`/interview/${session.id}`)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create session')
    } finally {
      setCreating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {/* Error Banner */}
      {fetchError && (
        <div className="border-b border-red-800/50 bg-red-900/20 px-6 py-3 text-center text-sm text-red-400">
          {fetchError}
        </div>
      )}

      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600">
              <Mic className="h-4 w-4 text-white" />
            </div>
            <span className="font-display text-lg font-bold">Intervue</span>
          </div>
          <div className="flex items-center gap-4">
            {user?.avatar_url && !avatarError && (
              <img
                src={user.avatar_url}
                alt=""
                className="h-8 w-8 rounded-full"
                referrerPolicy="no-referrer"
                crossOrigin="anonymous"
                onError={() => setAvatarError(true)}
              />
            )}
            <span className="text-sm text-gray-400">{user?.name || user?.email}</span>
            <button
              onClick={logout}
              aria-label="Log out"
              className="text-gray-500 transition-colors hover:text-gray-300"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Left: Resumes + Upload */}
          <div className="lg:col-span-1">
            <h2 className="mb-4 font-display text-lg font-semibold">
              Your Resumes
            </h2>
            <ResumeUpload
              onUploaded={(r) => {
                setResumes((prev) => [r, ...prev])
                setSelectedResumeId(r.id)
              }}
            />

            <div className="mt-4 space-y-2">
              {resumes.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setSelectedResumeId(r.id)}
                  className={`card flex w-full items-center gap-3 p-3 text-left transition-colors ${
                    selectedResumeId === r.id
                      ? 'border-brand-500/50 bg-brand-500/5'
                      : 'hover:border-gray-700'
                  }`}
                >
                  <FileText className="h-5 w-5 shrink-0 text-gray-400" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{r.filename}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(r.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Right: Start Interview + History */}
          <div className="lg:col-span-2">
            {/* Start Interview Card */}
            <div className="card mb-8 p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-display text-lg font-semibold">
                  Start New Interview
                </h2>
                <button
                  onClick={() => setShowConfig(!showConfig)}
                  aria-label="Toggle interview settings"
                  aria-expanded={showConfig}
                  className="text-gray-400 transition-colors hover:text-gray-200"
                >
                  <Settings className="h-5 w-5" />
                </button>
              </div>

              {!selectedResumeId ? (
                <p className="text-sm text-gray-400">
                  Upload a resume first to start practicing
                </p>
              ) : (
                <>
                  {showConfig && (
                    <div className="mb-6 space-y-4">
                      {/* Voice selector */}
                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-300">
                          Interviewer Voice
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          {VOICES.map((v) => (
                            <button
                              key={v.id}
                              onClick={() => setSelectedVoice(v.id)}
                              className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                                selectedVoice === v.id
                                  ? 'border-brand-500 bg-brand-500/10 text-brand-300'
                                  : 'border-gray-700 hover:border-gray-600'
                              }`}
                            >
                              <div className="font-medium">{v.label}</div>
                              <div className="text-xs text-gray-500">{v.desc}</div>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Question count */}
                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-300">
                          Number of Questions
                        </label>
                        <div className="flex gap-2">
                          {[3, 4, 5].map((n) => (
                            <button
                              key={n}
                              onClick={() => setQuestionCount(n)}
                              className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                                questionCount === n
                                  ? 'border-brand-500 bg-brand-500/10 text-brand-300'
                                  : 'border-gray-700 hover:border-gray-600'
                              }`}
                            >
                              {n}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleStartInterview}
                    disabled={creating}
                    className="btn-primary w-full py-3"
                  >
                    {creating ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Generating questions...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4" />
                        Start Interview
                      </>
                    )}
                  </button>
                </>
              )}
            </div>

            {/* Session History */}
            <h2 className="mb-4 font-display text-lg font-semibold">
              Interview History
            </h2>
            {sessions.length === 0 ? (
              <div className="card p-8 text-center">
                <Clock className="mx-auto mb-3 h-8 w-8 text-gray-600" />
                <p className="text-sm text-gray-400">
                  No interviews yet. Start your first one above!
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {sessions.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      if (s.status === 'completed') {
                        navigate(`/scorecard/${s.id}`)
                      } else if (s.status === 'active' || s.status === 'pending') {
                        navigate(`/interview/${s.id}`)
                      }
                    }}
                    className="card flex w-full items-center justify-between p-4 text-left transition-colors hover:border-gray-700"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-2.5 w-2.5 rounded-full ${
                          s.status === 'completed'
                            ? 'bg-green-500'
                            : s.status === 'active'
                              ? 'bg-yellow-500'
                              : s.status === 'abandoned'
                                ? 'bg-red-500'
                                : 'bg-gray-500'
                        }`}
                      />
                      <div>
                        <p className="text-sm font-medium capitalize">
                          {s.status} — {s.questions?.length || 0} questions
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(s.created_at).toLocaleString()}
                          {s.config?.voice && ` — Voice: ${s.config.voice}`}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-600" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
