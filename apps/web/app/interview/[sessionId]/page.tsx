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
    <main className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b bg-white px-4 py-3 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Interview Session</h1>
        <div className="flex items-center gap-4">
          <StatusIndicator state={interviewState} isConnected={isConnected} />
          {!sessionEnded && (
            <button
              onClick={handleEndSession}
              className="px-4 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
            >
              End Session
            </button>
          )}
        </div>
      </header>

      {/* Error banner */}
      {error && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-2">
          <p className="text-sm text-red-600">{error}</p>
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
          <div className="px-4 py-2 border-t bg-white">
            <Player
              audioBase64={currentAudio}
              format={audioFormat}
              autoPlay={true}
              onPlaybackEnd={handlePlaybackEnd}
            />
          </div>
        )}

        {/* Controls */}
        <div className="border-t bg-white p-6">
          {sessionEnded ? (
            <div className="text-center">
              <p className="text-gray-600 mb-4">Session has ended.</p>
              <button
                onClick={handleReturnHome}
                className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-semibold transition-colors"
              >
                Start New Interview
              </button>
            </div>
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

function StatusIndicator({
  state,
  isConnected,
}: {
  state: InterviewState;
  isConnected: boolean;
}) {
  let statusText: string;
  let statusColor: string;

  if (!isConnected) {
    statusText = "Connecting...";
    statusColor = "bg-yellow-400";
  } else {
    switch (state) {
      case "ready":
        statusText = "Ready";
        statusColor = "bg-green-400";
        break;
      case "processing_stt":
        statusText = "Listening...";
        statusColor = "bg-blue-400";
        break;
      case "generating":
        statusText = "Thinking...";
        statusColor = "bg-purple-400";
        break;
      case "speaking":
        statusText = "Speaking";
        statusColor = "bg-indigo-400";
        break;
      default:
        statusText = "Ready";
        statusColor = "bg-green-400";
    }
  }

  return (
    <div className="flex items-center gap-2">
      <span className={`w-2 h-2 rounded-full ${statusColor} animate-pulse`} />
      <span className="text-sm text-gray-600">{statusText}</span>
    </div>
  );
}
