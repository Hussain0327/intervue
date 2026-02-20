import { useCallback, useEffect, useRef, useState } from 'react'
import type { InterviewPhase, TranscriptEntry, WSServerMessage } from '../types'
import { InterviewWebSocket } from '../lib/ws'

export function useWebSocket(sessionId: string | undefined) {
  const wsRef = useRef<InterviewWebSocket | null>(null)
  const [phase, setPhase] = useState<InterviewPhase>('connecting')
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([])
  const [totalQuestions, setTotalQuestions] = useState(0)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const audioQueueRef = useRef<ArrayBuffer[]>([])
  const audioContextRef = useRef<AudioContext | null>(null)
  const isPlayingRef = useRef(false)

  const playNextChunk = useCallback(async () => {
    if (isPlayingRef.current || audioQueueRef.current.length === 0) return

    isPlayingRef.current = true
    const chunk = audioQueueRef.current.shift()!

    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext()
    }

    const ctx = audioContextRef.current

    try {
      const audioBuffer = await ctx.decodeAudioData(chunk.slice(0))

      // Guard: context may have been closed during the async decode
      if (ctx.state === 'closed') {
        isPlayingRef.current = false
        return
      }

      const source = ctx.createBufferSource()
      source.buffer = audioBuffer
      source.connect(ctx.destination)
      source.onended = () => {
        isPlayingRef.current = false
        playNextChunk()
      }
      source.start()
    } catch {
      // If decode fails, skip chunk and try next
      isPlayingRef.current = false
      playNextChunk()
    }
  }, [])

  const handleMessage = useCallback(
    (msg: WSServerMessage) => {
      switch (msg.type) {
        case 'ready':
          setTotalQuestions(msg.total_questions)
          setCurrentIndex(msg.current_index)
          setPhase('ready')
          break

        case 'interview_started':
          setTotalQuestions(msg.total_questions)
          break

        case 'question':
          setPhase('speaking')
          setCurrentIndex(msg.index)
          setTranscript((t) => [
            ...t,
            { role: 'interviewer', content: msg.text, type: 'question' },
          ])
          break

        case 'follow_up':
          setPhase('speaking')
          setTranscript((t) => [
            ...t,
            { role: 'interviewer', content: msg.text, type: 'follow_up' },
          ])
          break

        case 'tts_done':
          // Audio will finish playing from queue
          break

        case 'listening':
          setPhase('listening')
          break

        case 'transcription':
          setTranscript((t) => [
            ...t,
            { role: 'candidate', content: msg.text, type: 'answer' },
          ])
          break

        case 'thinking':
          setPhase('thinking')
          break

        case 'interview_complete':
          setPhase('complete')
          break

        case 'error':
          setError(msg.message)
          break
      }
    },
    [],
  )

  const handleBinary = useCallback(
    (data: ArrayBuffer) => {
      audioQueueRef.current.push(data)
      playNextChunk()
    },
    [playNextChunk],
  )

  useEffect(() => {
    if (!sessionId) return

    const ws = new InterviewWebSocket(
      handleMessage,
      handleBinary,
      () => setPhase('connecting'),
    )
    ws.connect(sessionId)
    wsRef.current = ws

    return () => {
      ws.close()
      // Drain audio queue to prevent stale playback on reconnect
      audioQueueRef.current = []
      isPlayingRef.current = false
      audioContextRef.current?.close()
      audioContextRef.current = null
    }
  }, [sessionId, handleMessage, handleBinary])

  const startInterview = useCallback(() => {
    wsRef.current?.sendJSON({ type: 'start_interview' })
  }, [])

  const sendAudioChunk = useCallback((data: Blob) => {
    wsRef.current?.sendBinary(data)
  }, [])

  const signalSpeechEnd = useCallback(() => {
    wsRef.current?.sendJSON({ type: 'speech_end' })
  }, [])

  const skipQuestion = useCallback(() => {
    wsRef.current?.sendJSON({ type: 'skip_question' })
  }, [])

  const endInterview = useCallback(() => {
    wsRef.current?.sendJSON({ type: 'end_interview' })
  }, [])

  return {
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
  }
}
