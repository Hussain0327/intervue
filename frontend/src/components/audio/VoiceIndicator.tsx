import type { InterviewPhase } from '../../types'

interface Props {
  phase: InterviewPhase
}

export default function VoiceIndicator({ phase }: Props) {
  const getMessage = () => {
    switch (phase) {
      case 'connecting':
        return 'Connecting...'
      case 'ready':
        return 'Ready to begin'
      case 'speaking':
        return 'Interviewer is speaking'
      case 'listening':
        return 'Listening to you...'
      case 'thinking':
        return 'Evaluating your response...'
      case 'complete':
        return 'Interview complete'
    }
  }

  const getColor = () => {
    switch (phase) {
      case 'speaking':
        return 'bg-brand-500'
      case 'listening':
        return 'bg-green-500'
      case 'thinking':
        return 'bg-amber-500'
      default:
        return 'bg-gray-500'
    }
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Animated orb */}
      <div className="relative flex h-32 w-32 items-center justify-center">
        {/* Outer ring */}
        <div
          className={`absolute inset-0 rounded-full ${getColor()} opacity-10 ${
            phase === 'speaking' || phase === 'listening'
              ? 'animate-ping'
              : ''
          }`}
        />
        {/* Middle ring */}
        <div
          className={`absolute inset-4 rounded-full ${getColor()} opacity-20 ${
            phase === 'speaking' || phase === 'listening'
              ? 'animate-pulse'
              : ''
          }`}
        />
        {/* Inner orb */}
        <div
          className={`relative h-16 w-16 rounded-full ${getColor()} shadow-lg ${
            getColor().replace('bg-', 'shadow-')
          }/30 transition-all duration-500`}
        >
          {/* Bars animation for speaking/listening */}
          {(phase === 'speaking' || phase === 'listening') && (
            <div className="flex h-full items-center justify-center gap-1">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="w-1 rounded-full bg-white/80"
                  style={{
                    animation: `barPulse 0.8s ease-in-out ${i * 0.15}s infinite alternate`,
                    height: '30%',
                  }}
                />
              ))}
            </div>
          )}

          {/* Spinner for thinking */}
          {phase === 'thinking' && (
            <div className="flex h-full items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            </div>
          )}
        </div>
      </div>

      <p className="text-sm font-medium text-gray-300">{getMessage()}</p>

      <style>{`
        @keyframes barPulse {
          from { height: 20%; }
          to { height: 70%; }
        }
      `}</style>
    </div>
  )
}
