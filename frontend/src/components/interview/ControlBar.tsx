import { Play, Square, SkipForward, Mic, MicOff } from 'lucide-react'
import type { InterviewPhase } from '../../types'

interface Props {
  phase: InterviewPhase
  currentIndex: number
  totalQuestions: number
  onStart: () => void
  onSkip: () => void
  onEnd: () => void
}

export default function ControlBar({
  phase,
  currentIndex,
  totalQuestions,
  onStart,
  onSkip,
  onEnd,
}: Props) {
  return (
    <div className="flex items-center justify-between">
      {/* Progress */}
      <div className="flex items-center gap-3">
        <div className="text-sm text-gray-400">
          {phase === 'ready'
            ? 'Ready'
            : phase === 'complete'
              ? 'Done'
              : `Question ${currentIndex + 1} of ${totalQuestions}`}
        </div>

        {totalQuestions > 0 && phase !== 'ready' && phase !== 'complete' && (
          <div className="flex gap-1">
            {Array.from({ length: totalQuestions }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 w-6 rounded-full transition-colors ${
                  i < currentIndex
                    ? 'bg-brand-500'
                    : i === currentIndex
                      ? 'bg-brand-400'
                      : 'bg-gray-700'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2">
        {phase === 'ready' && (
          <button onClick={onStart} className="btn-primary">
            <Play className="h-4 w-4" />
            Start Interview
          </button>
        )}

        {phase === 'listening' && (
          <div className="flex items-center gap-2 rounded-full bg-green-500/10 px-4 py-2 text-sm text-green-400">
            <Mic className="h-4 w-4 animate-pulse" />
            Recording — speak naturally
          </div>
        )}

        {phase !== 'ready' && phase !== 'complete' && phase !== 'connecting' && (
          <>
            <button
              onClick={onSkip}
              className="btn-secondary text-xs"
              disabled={phase === 'thinking'}
            >
              <SkipForward className="h-3.5 w-3.5" />
              Skip
            </button>

            <button
              onClick={onEnd}
              className="inline-flex items-center gap-1.5 rounded-xl border border-red-800/50 bg-red-900/20 px-4 py-2 text-xs font-medium text-red-400 transition-colors hover:bg-red-900/40"
            >
              <Square className="h-3.5 w-3.5" />
              End
            </button>
          </>
        )}
      </div>
    </div>
  )
}
