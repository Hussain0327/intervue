import { useEffect, useRef, useCallback } from 'react'
import type { InterviewPhase } from '../../types'

interface Props {
  phase: InterviewPhase
  onAudioChunk: (data: Blob) => void
  onSpeechEnd: () => void
}

export default function AudioRecorder({ phase, onAudioChunk, onSpeechEnd }: Props) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const silenceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const isRecordingRef = useRef(false)

  const stopRecording = useCallback(() => {
    isRecordingRef.current = false

    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current)
      silenceTimeoutRef.current = null
    }

    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
    }

    streamRef.current?.getTracks().forEach((t) => t.stop())
    audioContextRef.current?.close()

    mediaRecorderRef.current = null
    streamRef.current = null
    analyserRef.current = null
    audioContextRef.current = null
  }, [])

  const startSilenceDetection = useCallback(() => {
    const analyser = analyserRef.current
    if (!analyser) return

    const dataArray = new Uint8Array(analyser.frequencyBinCount)
    let silentFrames = 0
    const SILENCE_THRESHOLD = 15
    const SILENCE_FRAMES_NEEDED = 12 // ~2 seconds at ~6fps check rate

    const check = () => {
      if (!isRecordingRef.current) return

      analyser.getByteFrequencyData(dataArray)
      const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length

      if (avg < SILENCE_THRESHOLD) {
        silentFrames++
        if (silentFrames >= SILENCE_FRAMES_NEEDED) {
          // Silence detected — stop and signal
          stopRecording()
          onSpeechEnd()
          return
        }
      } else {
        silentFrames = 0
      }

      silenceTimeoutRef.current = setTimeout(check, 300)
    }

    check()
  }, [onSpeechEnd, stopRecording])

  const startRecording = useCallback(async () => {
    if (isRecordingRef.current) return

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        },
      })
      streamRef.current = stream

      // Set up audio analysis for simple VAD
      const audioCtx = new AudioContext()
      audioContextRef.current = audioCtx
      const source = audioCtx.createMediaStreamSource(stream)
      const analyser = audioCtx.createAnalyser()
      analyser.fftSize = 512
      source.connect(analyser)
      analyserRef.current = analyser

      const recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm',
      })

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          onAudioChunk(e.data)
        }
      }

      recorder.start(250) // Send chunks every 250ms
      mediaRecorderRef.current = recorder
      isRecordingRef.current = true

      // Simple silence detection using amplitude
      startSilenceDetection()
    } catch (err) {
      console.error('Failed to start recording:', err)
    }
  }, [onAudioChunk, startSilenceDetection])

  useEffect(() => {
    if (phase === 'listening') {
      startRecording()
      return () => stopRecording()
    }
  }, [phase, startRecording, stopRecording])

  // This component is invisible — just manages recording
  return null
}
