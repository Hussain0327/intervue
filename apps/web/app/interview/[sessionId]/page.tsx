"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Recorder } from "@/components/audio/Recorder";
import { Player } from "@/components/audio/Player";
import { Transcript, TranscriptEntry } from "@/components/interview/Transcript";
import { createWSClient, InterviewState, WSClient } from "@/lib/wsClient";

export default function InterviewSession() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;

  const [isConnected, setIsConnected] = useState(false);
  const [interviewState, setInterviewState] = useState<InterviewState>("ready");
  const [transcriptEntries, setTranscriptEntries] = useState<TranscriptEntry[]>([]);
  const [currentAudio, setCurrentAudio] = useState<string | null>(null);
  const [audioFormat, setAudioFormat] = useState<string>("mp3");
  const [error, setError] = useState<string | null>(null);
  const [sessionEnded, setSessionEnded] = useState(false);

  const wsClientRef = useRef<WSClient | null>(null);
  const resumeSentRef = useRef(false);

  // Initialize WebSocket connection
  useEffect(() => {
    const client = createWSClient(sessionId, {
      onConnectionChange: (connected) => {
        setIsConnected(connected);
        if (!connected && !sessionEnded) {
          setError("Connection lost. Attempting to reconnect...");
        } else {
          setError(null);
        }
      },
      onStatusChange: (state) => {
        setInterviewState(state);
      },
      onTranscript: (role, text, sequence) => {
        setTranscriptEntries((prev) => [
          ...prev,
          { role, text, sequence, timestamp: new Date() },
        ]);
      },
      onAudio: (audioBase64, format) => {
        setCurrentAudio(audioBase64);
        setAudioFormat(format);
      },
      onError: (code, message, recoverable) => {
        setError(message);
        if (!recoverable) {
          setSessionEnded(true);
        }
      },
      onSessionStart: () => {
        setError(null);
        // Send resume context if available, then signal ready to start
        if (!resumeSentRef.current && wsClientRef.current) {
          resumeSentRef.current = true;
          const parsedResumeJson = sessionStorage.getItem("parsed_resume");
          if (parsedResumeJson) {
            try {
              const parsedResume = JSON.parse(parsedResumeJson);
              wsClientRef.current.sendResumeContext(parsedResume);
            } catch (e) {
              console.error("Failed to parse stored resume:", e);
            }
            // Clear from sessionStorage after sending
            sessionStorage.removeItem("parsed_resume");
          }
          // Signal the backend to start the interview
          wsClientRef.current.sendStartInterview();
        }
      },
      onSessionEnd: (_, totalTurns) => {
        setSessionEnded(true);
        console.log(`Session ended with ${totalTurns} turns`);
      },
    });

    wsClientRef.current = client;
    client.connect();

    return () => {
      client.disconnect();
    };
  }, [sessionId, sessionEnded]);

  const handleRecordingComplete = useCallback((audioBase64: string, format: string) => {
    if (wsClientRef.current?.isConnected) {
      wsClientRef.current.sendAudio(audioBase64, format);
    }
  }, []);

  const handlePlaybackEnd = useCallback(() => {
    setCurrentAudio(null);
    if (wsClientRef.current?.isConnected) {
      wsClientRef.current.sendPlaybackComplete();
    }
  }, []);

  const handleEndSession = useCallback(() => {
    if (wsClientRef.current?.isConnected) {
      wsClientRef.current.endSession();
    }
    setSessionEnded(true);
  }, []);

  const handleReturnHome = useCallback(() => {
    router.push("/");
  }, [router]);

  const isRecordingDisabled =
    !isConnected ||
    interviewState !== "ready" ||
    currentAudio !== null ||
    sessionEnded;

  const isProcessing =
    interviewState === "processing_stt" || interviewState === "generating";

  return (
    <main className="min-h-screen flex flex-col bg-valtric-gradient">
      {/* Header */}
      <header className="border-b border-teal-200/50 bg-white/80 backdrop-blur-sm px-6 py-4 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <ValtricLogo />
          <div className="flex flex-col">
            <span className="font-body font-semibold text-base text-teal-900">Valtric</span>
            <span className="text-xs text-teal-500 -mt-0.5">AI for Everyone</span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <StatusIndicator state={interviewState} isConnected={isConnected} />
          {!sessionEnded && (
            <button
              onClick={handleEndSession}
              className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
            >
              End Session
            </button>
          )}
        </div>
      </header>

      {/* Error banner */}
      {error && (
        <div className="bg-red-50 border-b border-red-200 px-6 py-3">
          <p className="text-sm text-red-600 flex items-center gap-2">
            <AlertIcon className="w-4 h-4" />
            {error}
          </p>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full">
        {/* Transcript area */}
        <div className="flex-1 min-h-0">
          <Transcript entries={transcriptEntries} isProcessing={isProcessing} />
        </div>

        {/* Audio player */}
        {currentAudio && (
          <div className="px-6 py-4 border-t border-teal-200/50 bg-white/50 backdrop-blur-sm">
            <Player
              audioBase64={currentAudio}
              format={audioFormat}
              autoPlay={true}
              onPlaybackEnd={handlePlaybackEnd}
            />
          </div>
        )}

        {/* Controls */}
        <div className="border-t border-teal-200/50 bg-white p-8">
          {sessionEnded ? (
            <SessionEndedCard onReturnHome={handleReturnHome} />
          ) : (
            <Recorder
              onRecordingComplete={handleRecordingComplete}
              disabled={isRecordingDisabled}
            />
          )}
        </div>
      </div>
    </main>
  );
}

function ValtricLogo() {
  return (
    <div className="w-9 h-9 rounded-xl bg-teal-700 flex items-center justify-center shadow-sm">
      <span className="text-white font-display font-semibold text-lg">V</span>
    </div>
  );
}

function StatusIndicator({
  state,
  isConnected,
}: {
  state: InterviewState;
  isConnected: boolean;
}) {
  let statusText: string;
  let statusColor: string;
  let bgColor: string;

  if (!isConnected) {
    statusText = "Connecting";
    statusColor = "bg-amber-500";
    bgColor = "bg-amber-50";
  } else {
    switch (state) {
      case "ready":
        statusText = "Ready";
        statusColor = "bg-teal-500";
        bgColor = "bg-teal-50";
        break;
      case "processing_stt":
        statusText = "Listening";
        statusColor = "bg-cyan-500";
        bgColor = "bg-cyan-50";
        break;
      case "generating":
        statusText = "Thinking";
        statusColor = "bg-cyan-500";
        bgColor = "bg-cyan-50";
        break;
      case "speaking":
        statusText = "Speaking";
        statusColor = "bg-teal-600";
        bgColor = "bg-teal-50";
        break;
      default:
        statusText = "Ready";
        statusColor = "bg-teal-500";
        bgColor = "bg-teal-50";
    }
  }

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${bgColor}`}>
      <span className={`w-2 h-2 rounded-full ${statusColor} animate-pulse`} />
      <span className="text-sm font-mono font-medium text-teal-700">{statusText}</span>
    </div>
  );
}

function SessionEndedCard({ onReturnHome }: { onReturnHome: () => void }) {
  return (
    <div className="text-center py-4">
      <div className="w-16 h-16 rounded-2xl bg-teal-100 flex items-center justify-center mx-auto mb-4">
        <CheckIcon className="w-8 h-8 text-teal-600" />
      </div>
      <h3 className="font-display font-semibold text-xl text-teal-900 mb-2">
        Session Complete
      </h3>
      <p className="text-teal-600 mb-6">
        Great practice! Ready for another round?
      </p>
      <button
        onClick={onReturnHome}
        className="px-6 py-3 bg-teal-700 hover:bg-teal-800 text-white rounded-xl font-body font-semibold transition-all hover:shadow-glow-teal hover:-translate-y-0.5 active:scale-[0.98]"
      >
        Start New Interview
      </button>
    </div>
  );
}

function AlertIcon({ className }: { className?: string }) {
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
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
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
        d="M5 13l4 4L19 7"
      />
    </svg>
  );
}
