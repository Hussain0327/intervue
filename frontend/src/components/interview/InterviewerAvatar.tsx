import { Bot } from 'lucide-react'
import type { InterviewPhase } from '../../types'

interface Props {
  phase: InterviewPhase
}

export default function InterviewerAvatar({ phase }: Props) {
  const isActive = phase === 'speaking' || phase === 'listening' || phase === 'thinking'

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className={`relative flex h-20 w-20 items-center justify-center rounded-3xl transition-all duration-500 ${
          isActive
            ? 'bg-gradient-to-br from-brand-500 to-purple-600 shadow-lg shadow-brand-500/20'
            : 'bg-gray-800'
        }`}
      >
        <Bot className={`h-10 w-10 ${isActive ? 'text-white' : 'text-gray-500'}`} />

        {phase === 'speaking' && (
          <span className="absolute -bottom-1 -right-1 flex h-5 w-5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-50" />
            <span className="relative inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand-500 text-[10px] font-bold text-white">
              🔊
            </span>
          </span>
        )}
      </div>
      <span className="text-sm font-medium text-gray-400">AI Interviewer</span>
    </div>
  )
}
