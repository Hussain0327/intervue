import { useEffect, useRef } from 'react'
import { User, Bot } from 'lucide-react'
import type { TranscriptEntry } from '../../types'

interface Props {
  entries: TranscriptEntry[]
}

export default function TranscriptView({ entries }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [entries.length])

  if (entries.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-gray-500">
        Transcript will appear here as the interview progresses
      </div>
    )
  }

  return (
    <div className="space-y-4 overflow-y-auto">
      {entries.map((entry, i) => (
        <div
          key={i}
          className={`flex gap-3 ${
            entry.role === 'interviewer' ? '' : 'flex-row-reverse'
          }`}
        >
          <div
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
              entry.role === 'interviewer'
                ? 'bg-brand-600/20 text-brand-400'
                : 'bg-green-600/20 text-green-400'
            }`}
          >
            {entry.role === 'interviewer' ? (
              <Bot className="h-4 w-4" />
            ) : (
              <User className="h-4 w-4" />
            )}
          </div>

          <div
            className={`max-w-[80%] rounded-2xl px-4 py-3 ${
              entry.role === 'interviewer'
                ? 'rounded-tl-sm bg-gray-800/70'
                : 'rounded-tr-sm bg-brand-600/10'
            }`}
          >
            {entry.type === 'follow_up' && (
              <span className="mb-1 block text-xs font-medium text-amber-400">
                Follow-up
              </span>
            )}
            <p className="text-sm leading-relaxed">{entry.content}</p>
          </div>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  )
}
