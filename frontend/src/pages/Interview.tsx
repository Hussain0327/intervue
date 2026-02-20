import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Mic } from 'lucide-react'
import { useWebSocket } from '../hooks/useWebSocket'
import VoiceIndicator from '../components/audio/VoiceIndicator'
import AudioRecorder from '../components/audio/AudioRecorder'
import TranscriptView from '../components/interview/TranscriptView'
import ControlBar from '../components/interview/ControlBar'
import InterviewerAvatar from '../components/interview/InterviewerAvatar'

export default function Interview() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()

  const {
    phase,
    transcript,
    totalQuestions,
    currentIndex,
    error,
    startInterview,
    sendAudioChunk,
    signalSpeechEnd,
    skipQuestion,
    endInterview,
  } = useWebSocket(sessionId)

  if (phase === 'complete') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-green-500/10">
          <Mic className="h-10 w-10 text-green-400" />
        </div>
        <h1 className="font-display text-2xl font-bold">Interview Complete!</h1>
        <p className="text-gray-400">Your scorecard is being generated...</p>
        <button
          onClick={() => navigate(`/scorecard/${sessionId}`)}
          className="btn-primary"
        >
          View Scorecard
        </button>
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between border-b border-gray-800 px-6 py-3">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-sm text-gray-400 transition-colors hover:text-gray-200"
        >
          <ArrowLeft className="h-4 w-4" />
          Dashboard
        </button>
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-600">
            <Mic className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="font-display text-sm font-bold">Intervue</span>
        </div>
        <div className="w-20" />
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel — Visual feedback */}
        <div className="flex w-1/2 flex-col items-center justify-center border-r border-gray-800 p-8">
          <InterviewerAvatar phase={phase} />
          <div className="mt-8">
            <VoiceIndicator phase={phase} />
          </div>

          {error && (
            <div className="mt-6 rounded-xl border border-red-800/50 bg-red-900/20 px-4 py-2 text-sm text-red-400">
              {error}
            </div>
          )}
        </div>

        {/* Right panel — Transcript */}
        <div className="flex w-1/2 flex-col">
          <div className="flex-1 overflow-y-auto p-6">
            <TranscriptView entries={transcript} />
          </div>
        </div>
      </div>

      {/* Bottom control bar */}
      <div className="border-t border-gray-800 px-6 py-4">
        <ControlBar
          phase={phase}
          currentIndex={currentIndex}
          totalQuestions={totalQuestions}
          onStart={startInterview}
          onSkip={skipQuestion}
          onEnd={endInterview}
        />
      </div>

      {/* Invisible audio recorder */}
      <AudioRecorder
        phase={phase}
        onAudioChunk={sendAudioChunk}
        onSpeechEnd={signalSpeechEnd}
      />
    </div>
  )
}
