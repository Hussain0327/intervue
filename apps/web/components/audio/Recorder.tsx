"use client";

import { useCallback, useRef, useState } from "react";
import { blobToBase64, getSupportedMimeType } from "@/lib/audio/encode";

export interface RecorderProps {
  onRecordingComplete: (audioBase64: string, format: string) => void;
  onRecordingStart?: () => void;
  onRecordingStop?: () => void;
  disabled?: boolean;
  variant?: "default" | "compact";
}

export type RecordingState = "idle" | "recording" | "processing";

export function Recorder({
  onRecordingComplete,
  onRecordingStart,
  onRecordingStop,
  disabled = false,
  variant = "default",
}: RecorderProps) {
  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const startRecording = useCallback(async () => {
    if (disabled) return;

    try {
      setError(null);

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = stream;

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

        const blob = new Blob(chunksRef.current, { type: mimeType });
        const base64 = await blobToBase64(blob);
        const format = mimeType.includes("webm") ? "webm" : "ogg";

        onRecordingComplete(base64, format);
        setRecordingState("idle");
        onRecordingStop?.();

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

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      // Remove the onstop handler to prevent sending
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();

      // Clean up stream
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      chunksRef.current = [];

      setRecordingState("idle");
      onRecordingStop?.();
    }
  }, [onRecordingStop]);

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

  // Compact variant for coding challenge layout
  if (variant === "compact") {
    return (
      <div className="flex items-center gap-2">
        <button
          type="button"
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          disabled={disabled || recordingState === "processing"}
          className={`
            relative w-10 h-10 rounded-full flex items-center justify-center
            transition-all duration-200 ease-out select-none
            ${
              recordingState === "recording"
                ? "bg-red-500 animate-pulse"
                : recordingState === "processing"
                ? "bg-teal-400 cursor-wait"
                : disabled
                ? "bg-gray-200 cursor-not-allowed"
                : "bg-teal-600 hover:bg-teal-700"
            }
          `}
        >
          {recordingState === "recording" ? (
            <div className="flex items-center gap-0.5">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-0.5 bg-white rounded-full animate-waveform-bar"
                  style={{ height: "12px", animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          ) : recordingState === "processing" ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <MicIconSmall disabled={disabled} />
          )}
        </button>
        <span className="text-xs text-gray-500">
          {recordingState === "recording"
            ? "Release"
            : recordingState === "processing"
            ? "..."
            : disabled
            ? "Wait"
            : "Hold"}
        </span>
        {error && <span className="text-xs text-red-500">{error}</span>}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Recording button with waveform rings */}
      <div className="relative">
        {/* Animated pulse rings (only when recording) */}
        {recordingState === "recording" && (
          <>
            <div className="absolute inset-0 rounded-full bg-red-500 animate-pulse-ring" />
            <div className="absolute inset-0 rounded-full bg-red-500 animate-pulse-ring-2" />
            <div className="absolute inset-0 rounded-full bg-red-500 animate-pulse-ring-3" />
          </>
        )}

        {/* Hover glow effect - Valtric cyan */}
        {isHovered && recordingState === "idle" && !disabled && (
          <div className="absolute -inset-2 rounded-full bg-cyan-400/20 blur-xl transition-opacity" />
        )}

        {/* Processing spinner ring */}
        {recordingState === "processing" && (
          <div className="absolute -inset-2">
            <svg className="w-full h-full animate-process-spin" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="46"
                fill="none"
                stroke="url(#teal-gradient)"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray="60 200"
              />
              <defs>
                <linearGradient id="teal-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#00CED1" />
                  <stop offset="100%" stopColor="#1A7A7A" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        )}

        {/* Main button */}
        <button
          type="button"
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={(e) => {
            handleMouseUp();
            setIsHovered(false);
          }}
          onMouseEnter={() => setIsHovered(true)}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          disabled={disabled || recordingState === "processing"}
          className={`
            relative w-[120px] h-[120px] rounded-full flex items-center justify-center
            transition-all duration-200 ease-out select-none
            shadow-inner-soft
            ${
              recordingState === "recording"
                ? "bg-red-500 scale-95 shadow-glow-recording"
                : recordingState === "processing"
                ? "bg-teal-500 cursor-wait shadow-glow-cyan"
                : disabled
                ? "bg-teal-200 cursor-not-allowed"
                : "bg-teal-700 hover:bg-teal-600 hover:scale-105 active:scale-95 shadow-lg hover:shadow-glow-teal"
            }
          `}
        >
          {/* Inner content */}
          <div className="relative z-10">
            {recordingState === "recording" ? (
              <RecordingWaveform />
            ) : recordingState === "processing" ? (
              <ProcessingIcon />
            ) : (
              <MicIcon disabled={disabled} />
            )}
          </div>

          {/* Subtle inner gradient */}
          {recordingState === "idle" && !disabled && (
            <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/10 to-transparent" />
          )}
        </button>
      </div>

      {/* Status text and secondary controls */}
      <div className="flex flex-col items-center gap-2">
        <p className="font-mono text-sm text-teal-600 tracking-wide">
          {recordingState === "recording"
            ? "Release to send"
            : recordingState === "processing"
            ? "Processing..."
            : disabled
            ? "Wait for interviewer"
            : "Hold to speak"}
        </p>

        {/* Cancel button - only visible during recording */}
        {recordingState === "recording" && (
          <button
            type="button"
            onClick={cancelRecording}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-full transition-colors animate-fade-in-up"
          >
            <CancelIcon className="w-3.5 h-3.5" />
            Cancel
          </button>
        )}
      </div>

      {/* Error message */}
      {error && (
        <p className="text-sm text-red-500 bg-red-50 px-4 py-2 rounded-lg">{error}</p>
      )}
    </div>
  );
}

function RecordingWaveform() {
  return (
    <div className="flex items-center justify-center gap-1.5">
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="w-1.5 bg-white rounded-full animate-waveform-bar"
          style={{
            height: "32px",
            animationDelay: `${i * 0.15}s`,
          }}
        />
      ))}
    </div>
  );
}

function MicIcon({ disabled }: { disabled: boolean }) {
  return (
    <svg
      className={`w-12 h-12 ${disabled ? "text-teal-400" : "text-white"}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"
      />
    </svg>
  );
}

function ProcessingIcon() {
  return (
    <svg
      className="w-10 h-10 text-white"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
      />
    </svg>
  );
}

function CancelIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function MicIconSmall({ disabled }: { disabled: boolean }) {
  return (
    <svg
      className={`w-5 h-5 ${disabled ? "text-gray-400" : "text-white"}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"
      />
    </svg>
  );
}
