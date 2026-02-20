import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Mic,
  Star,
  TrendingUp,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { getScorecard } from '../lib/api'
import type { Scorecard as ScorecardType } from '../types'

const DIMENSION_LABELS: Record<string, string> = {
  situation: 'Situation',
  task: 'Task',
  action: 'Action',
  result: 'Result',
  communication: 'Communication',
}

const RECOMMENDATION_COLORS: Record<string, string> = {
  strong_hire: 'text-green-400 bg-green-500/10 border-green-500/30',
  hire: 'text-green-300 bg-green-500/10 border-green-500/20',
  lean_hire: 'text-yellow-300 bg-yellow-500/10 border-yellow-500/20',
  lean_no_hire: 'text-orange-300 bg-orange-500/10 border-orange-500/20',
  no_hire: 'text-red-400 bg-red-500/10 border-red-500/30',
}

function ScoreBar({ label, score }: { label: string; score: number }) {
  const pct = (score / 5) * 100

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-gray-300">{label}</span>
        <span className="font-mono text-gray-400">{score.toFixed(1)}/5</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-gray-800">
        <div
          className={`h-full rounded-full transition-all duration-700 ${
            score >= 4
              ? 'bg-green-500'
              : score >= 3
                ? 'bg-brand-500'
                : score >= 2
                  ? 'bg-amber-500'
                  : 'bg-red-500'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export default function Scorecard() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const [scorecard, setScorecard] = useState<ScorecardType | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedQ, setExpandedQ] = useState<number | null>(null)

  useEffect(() => {
    if (!sessionId) return
    getScorecard(sessionId)
      .then(setScorecard)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [sessionId])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
          <p className="text-sm text-gray-400">Loading scorecard...</p>
        </div>
      </div>
    )
  }

  if (error || !scorecard) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="card max-w-md p-8 text-center">
          <AlertTriangle className="mx-auto mb-4 h-10 w-10 text-amber-400" />
          <h2 className="mb-2 font-display text-lg font-bold">
            Scorecard Unavailable
          </h2>
          <p className="mb-4 text-sm text-gray-400">
            {error || 'The scorecard for this session is not ready yet.'}
          </p>
          <Link to="/dashboard" className="btn-primary">
            Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  const recommendation = scorecard.recommendation
  const recClass = recommendation
    ? RECOMMENDATION_COLORS[recommendation] || ''
    : ''

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <Link
            to="/dashboard"
            className="flex items-center gap-2 text-sm text-gray-400 transition-colors hover:text-gray-200"
          >
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </Link>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-600">
              <Mic className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="font-display text-sm font-bold">Intervue</span>
          </div>
          <div className="w-20" />
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8">
        {/* Overall Score */}
        <div className="card mb-8 p-8 text-center">
          <h1 className="mb-6 font-display text-2xl font-bold">
            Interview Scorecard
          </h1>

          <div className="mb-6">
            <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full border-4 border-brand-500/30 bg-brand-500/5">
              <span className="font-display text-4xl font-extrabold text-brand-400">
                {scorecard.overall_score.toFixed(1)}
              </span>
            </div>
            <p className="mt-2 text-sm text-gray-400">out of 5.0</p>
          </div>

          {recommendation && (
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-semibold capitalize ${recClass}`}
            >
              <Star className="h-3.5 w-3.5" />
              {recommendation.replace(/_/g, ' ')}
            </span>
          )}
        </div>

        {/* STAR Dimensions */}
        <div className="card mb-8 p-6">
          <h2 className="mb-4 font-display text-lg font-semibold">
            STAR Framework Breakdown
          </h2>
          <div className="space-y-3">
            {Object.entries(DIMENSION_LABELS).map(([key, label]) => {
              const score = scorecard.scores[key]
              if (score == null) return null
              return <ScoreBar key={key} label={label} score={score} />
            })}
          </div>
        </div>

        {/* Strengths & Improvements */}
        <div className="mb-8 grid gap-6 sm:grid-cols-2">
          <div className="card p-6">
            <h3 className="mb-3 flex items-center gap-2 font-display text-base font-semibold text-green-400">
              <TrendingUp className="h-4 w-4" />
              Strengths
            </h3>
            <ul className="space-y-2">
              {scorecard.strengths.map((s, i) => (
                <li key={i} className="flex gap-2 text-sm text-gray-300">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-green-500" />
                  {s}
                </li>
              ))}
            </ul>
          </div>

          <div className="card p-6">
            <h3 className="mb-3 flex items-center gap-2 font-display text-base font-semibold text-amber-400">
              <AlertTriangle className="h-4 w-4" />
              Areas for Improvement
            </h3>
            <ul className="space-y-2">
              {scorecard.areas_for_improvement.map((a, i) => (
                <li key={i} className="flex gap-2 text-sm text-gray-300">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                  {a}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Overall Feedback */}
        <div className="card mb-8 p-6">
          <h2 className="mb-3 font-display text-lg font-semibold">
            Overall Feedback
          </h2>
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-gray-300">
            {scorecard.feedback}
          </div>
          {scorecard.recommendation_reasoning && (
            <div className="mt-4 rounded-xl bg-gray-800/50 p-4 text-sm text-gray-400">
              <strong className="text-gray-300">Recommendation Reasoning:</strong>{' '}
              {scorecard.recommendation_reasoning}
            </div>
          )}
        </div>

        {/* Per-Question Breakdown */}
        <div className="card p-6">
          <h2 className="mb-4 font-display text-lg font-semibold">
            Per-Question Breakdown
          </h2>
          <div className="space-y-3">
            {scorecard.per_question.map((q) => (
              <div
                key={q.question_index}
                className="rounded-xl border border-gray-800 bg-gray-900/50"
              >
                <button
                  onClick={() =>
                    setExpandedQ(
                      expandedQ === q.question_index ? null : q.question_index,
                    )
                  }
                  className="flex w-full items-center justify-between p-4 text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-800 font-mono text-xs font-bold text-gray-400">
                      Q{q.question_index + 1}
                    </span>
                    <span className="text-sm font-medium">
                      Score: {q.overall_score.toFixed(1)}/5
                    </span>
                  </div>
                  {expandedQ === q.question_index ? (
                    <ChevronUp className="h-4 w-4 text-gray-500" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-gray-500" />
                  )}
                </button>

                {expandedQ === q.question_index && (
                  <div className="border-t border-gray-800 p-4 space-y-4">
                    <div>
                      <p className="mb-1 text-xs font-medium text-gray-500">
                        Question
                      </p>
                      <p className="text-sm text-gray-300">{q.question_text}</p>
                    </div>

                    {q.answer_summary && (
                      <div>
                        <p className="mb-1 text-xs font-medium text-gray-500">
                          Your Answer (Summary)
                        </p>
                        <p className="text-sm text-gray-400">
                          {q.answer_summary}
                        </p>
                      </div>
                    )}

                    <div className="space-y-2">
                      {Object.entries(DIMENSION_LABELS).map(([key, label]) => {
                        const score = q.scores[key]
                        if (score == null) return null
                        return <ScoreBar key={key} label={label} score={score} />
                      })}
                    </div>

                    <div>
                      <p className="mb-1 text-xs font-medium text-gray-500">
                        Feedback
                      </p>
                      <p className="text-sm text-gray-300">{q.feedback}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Back to Dashboard */}
        <div className="mt-8 text-center">
          <Link to="/dashboard" className="btn-primary">
            Back to Dashboard
          </Link>
        </div>
      </main>
    </div>
  )
}
