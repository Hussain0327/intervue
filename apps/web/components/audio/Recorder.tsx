"use client";

import { useCallback, useRef, useState } from "react";
import { blobToBase64, getSupportedMimeType } from "@/lib/audio/encode";

export interface RecorderProps {
  onRecordingComplete: (audioBase64: string, format: string) => void;
  onRecordingStart?: () => void;
  onRecordingStop?: () => void;
  disabled?: boolean;
}

export type RecordingState = "idle" | "recording" | "processing";

export function Recorder({
  onRecordingComplete,
  onRecordingStart,
  onRecordingStop,
  disabled = false,
}: RecorderProps) {
  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const startRecording = useCallback(async () => {
    if (disabled) return;

    try {
      setError(null);

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = stream;

      // Create MediaRecorder with supported format
      const mimeType = getSupportedMimeType();
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        setRecordingState("processing");

        // Combine chunks into single blob
        const blob = new Blob(chunksRef.current, { type: mimeType });

        // Convert to base64
        const base64 = await blobToBase64(blob);

        // Determine format from mime type
        const format = mimeType.includes("webm") ? "webm" : "ogg";

        onRecordingComplete(base64, format);
        setRecordingState("idle");
        onRecordingStop?.();

        // Clean up stream
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      };

      mediaRecorder.start();
      setRecordingState("recording");
      onRecordingStart?.();
    } catch (err) {
      console.error("Failed to start recording:", err);
      setError("Failed to access microphone. Please check permissions.");
      setRecordingState("idle");
    }
  }, [disabled, onRecordingComplete, onRecordingStart, onRecordingStop]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const handleMouseDown = useCallback(() => {
    startRecording();
  }, [startRecording]);

  const handleMouseUp = useCallback(() => {
    stopRecording();
  }, [stopRecording]);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      startRecording();
    },
    [startRecording]
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      stopRecording();
    },
    [stopRecording]
  );

  return (
    <div className="flex flex-col items-center gap-4">
      <button
        type="button"
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        disabled={disabled || recordingState === "processing"}
        className={`
          w-24 h-24 rounded-full flex items-center justify-center
          transition-all duration-200 select-none
          ${
            recordingState === "recording"
              ? "bg-red-500 scale-110 shadow-lg shadow-red-500/50"
              : recordingState === "processing"
              ? "bg-gray-400 cursor-wait"
              : disabled
              ? "bg-gray-300 cursor-not-allowed"
              : "bg-blue-500 hover:bg-blue-600 active:scale-95"
          }
        `}
      >
        {recordingState === "recording" ? (
          <MicOnIcon className="w-10 h-10 text-white animate-pulse" />
        ) : recordingState === "processing" ? (
          <SpinnerIcon className="w-10 h-10 text-white animate-spin" />
        ) : (
          <MicOffIcon className="w-10 h-10 text-white" />
        )}
      </button>

      <p className="text-sm text-gray-600">
        {recordingState === "recording"
          ? "Release to send"
          : recordingState === "processing"
          ? "Processing..."
          : disabled
          ? "Wait for interviewer"
          : "Hold to talk"}
      </p>

      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}

function MicOnIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
      />
    </svg>
  );
}

function MicOffIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
      />
    </svg>
  );
}

function SpinnerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}
