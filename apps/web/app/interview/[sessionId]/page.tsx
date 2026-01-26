"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Recorder } from "@/components/audio/Recorder";
import { Player } from "@/components/audio/Player";
import { Transcript, TranscriptEntry } from "@/components/interview/Transcript";
import { createWSClient, InterviewState, WSClient } from "@/lib/wsClient";
import { useInterviewProgress, INTERVIEW_ROUNDS, INTERVIEW_MODES, InterviewModeId } from "@/lib/useInterviewProgress";

interface EvaluationResult {
  round: number;
  score: number;
  passed: boolean;
  feedback: string;
}

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
  const [currentRound, setCurrentRound] = useState<number>(1);
  const [interviewMode, setInterviewMode] = useState<InterviewModeId>("full");
  const [evaluationResult, setEvaluationResult] = useState<EvaluationResult | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);

  const wsClientRef = useRef<WSClient | null>(null);
  const resumeSentRef = useRef(false);

  const { updateRound, hasCompletedAllRounds, getNextAvailableRound } = useInterviewProgress();

  // Get current round and mode from sessionStorage on mount
  useEffect(() => {
    const storedRound = sessionStorage.getItem("current_round");
    if (storedRound) {
      setCurrentRound(parseInt(storedRound, 10));
    }
    const storedMode = sessionStorage.getItem("interview_mode");
    if (storedMode && storedMode in INTERVIEW_MODES) {
      setInterviewMode(storedMode as InterviewModeId);
    }
  }, []);

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
          // Get selected role from sessionStorage
          const selectedRole = sessionStorage.getItem("selected_role") || undefined;
          if (selectedRole) {
            sessionStorage.removeItem("selected_role");
          }
          // Get current round from sessionStorage
          const storedRound = sessionStorage.getItem("current_round");
          const round = storedRound ? parseInt(storedRound, 10) : 1;
          // Get interview mode from sessionStorage
          const interviewMode = sessionStorage.getItem("interview_mode") || undefined;
          if (interviewMode) {
            sessionStorage.removeItem("interview_mode");
          }
          // Signal the backend to start the interview with role, round, and mode
          wsClientRef.current.sendStartInterview(selectedRole, round, interviewMode);
        }
      },
      onSessionEnd: (_, totalTurns) => {
        setSessionEnded(true);
        console.log(`Session ended with ${totalTurns} turns`);
      },
      onEvaluation: (round, score, passed, feedback) => {
        setIsEvaluating(false);
        const result = { round, score, passed, feedback };
        setEvaluationResult(result);
        // Update localStorage with result
        updateRound(round, { score, passed, feedback });
        // NOW end the session and close WebSocket (after evaluation is received)
        wsClientRef.current?.endSession();
        setSessionEnded(true);
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
      // Request evaluation - the onEvaluation callback will handle ending the session
      setIsEvaluating(true);
      wsClientRef.current.requestEvaluation();
      // DON'T call endSession() here - wait for onEvaluation callback
    } else {
      setSessionEnded(true);
    }
  }, []);

  const handleReturnHome = useCallback(() => {
    router.push("/");
  }, [router]);

  const handleContinueToNextRound = useCallback(() => {
    // Get next round and store it
    const nextRound = getNextAvailableRound();
    if (nextRound) {
      sessionStorage.setItem("current_round", String(nextRound));
    }
    // Generate new session ID and navigate
    const newSessionId = crypto.randomUUID();
    router.push(`/interview/${newSessionId}`);
  }, [router, getNextAvailableRound]);

  const handleTryAgain = useCallback(() => {
    // Keep the same round and try again
    sessionStorage.setItem("current_round", String(currentRound));
    // Generate new session ID and navigate
    const newSessionId = crypto.randomUUID();
    router.push(`/interview/${newSessionId}`);
  }, [router, currentRound]);

  // Get round and mode info
  const roundInfo = INTERVIEW_ROUNDS.find((r) => r.round === currentRound);
  const modeConfig = INTERVIEW_MODES[interviewMode];

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

        {/* Round indicator */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-50 border border-teal-200">
          {modeConfig.rounds.length > 1 ? (
            <>
              <span className="text-xs font-semibold text-teal-700">
                Round {modeConfig.rounds.indexOf(currentRound as 1 | 2 | 3) + 1}/{modeConfig.rounds.length}
              </span>
              <span className="text-xs text-teal-500">
                {roundInfo?.title || "Interview"}
              </span>
            </>
          ) : (
            <span className="text-xs font-semibold text-teal-700">
              {modeConfig.title}
            </span>
          )}
        </div>

        <div className="flex items-center gap-6">
          <StatusIndicator state={interviewState} isConnected={isConnected} isEvaluating={isEvaluating} />
          {!sessionEnded && (
            <button
              onClick={handleEndSession}
              disabled={isEvaluating}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                isEvaluating
                  ? "text-gray-400 cursor-not-allowed"
                  : "text-red-600 hover:text-red-700 hover:bg-red-50"
              }`}
            >
              {isEvaluating ? "Evaluating..." : "End Session"}
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
            <SessionEndedCard
              onReturnHome={handleReturnHome}
              onContinue={handleContinueToNextRound}
              onTryAgain={handleTryAgain}
              evaluationResult={evaluationResult}
              currentRound={currentRound}
              modeConfig={modeConfig}
              isEvaluating={isEvaluating}
              allRoundsPassed={hasCompletedAllRounds()}
            />
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
  isEvaluating,
}: {
  state: InterviewState;
  isConnected: boolean;
  isEvaluating?: boolean;
}) {
  let statusText: string;
  let statusColor: string;
  let bgColor: string;

  if (isEvaluating) {
    statusText = "Evaluating";
    statusColor = "bg-purple-500";
    bgColor = "bg-purple-50";
  } else if (!isConnected) {
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

function SessionEndedCard({
  onReturnHome,
  onContinue,
  onTryAgain,
  evaluationResult,
  currentRound,
  modeConfig,
  isEvaluating,
  allRoundsPassed,
}: {
  onReturnHome: () => void;
  onContinue: () => void;
  onTryAgain: () => void;
  evaluationResult: EvaluationResult | null;
  currentRound: number;
  modeConfig: { id: string; title: string; description: string; rounds: readonly (1 | 2 | 3)[] };
  isEvaluating: boolean;
  allRoundsPassed: boolean;
}) {
  // Still evaluating
  if (isEvaluating || (!evaluationResult && !allRoundsPassed)) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 rounded-2xl bg-purple-100 flex items-center justify-center mx-auto mb-4">
          <EvaluatingSpinner />
        </div>
        <h3 className="font-display font-semibold text-xl text-teal-900 mb-2">
          Evaluating Your Performance
        </h3>
        <p className="text-teal-600">
          Please wait while we analyze your interview...
        </p>
      </div>
    );
  }

  // All rounds passed - celebration!
  if (allRoundsPassed) {
    return (
      <div className="text-center py-4">
        <div className="text-5xl mb-4">🎉</div>
        <h3 className="font-display font-semibold text-2xl text-teal-900 mb-2">
          Congratulations!
        </h3>
        <p className="text-teal-600 mb-4">
          You've passed all interview rounds!
        </p>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 max-w-md mx-auto">
          <p className="text-green-700 font-medium">You got the job! 🚀</p>
        </div>
        <button
          onClick={onReturnHome}
          className="px-6 py-3 bg-teal-700 hover:bg-teal-800 text-white rounded-xl font-body font-semibold transition-all hover:shadow-lg"
        >
          Start New Interview
        </button>
      </div>
    );
  }

  // Show evaluation result
  if (evaluationResult) {
    const roundInfo = INTERVIEW_ROUNDS.find((r) => r.round === currentRound);
    const passed = evaluationResult.passed;
    const roundIndex = modeConfig.rounds.indexOf(currentRound as 1 | 2 | 3);
    const isLastRound = roundIndex === modeConfig.rounds.length - 1;

    return (
      <div className="text-center py-4">
        <div
          className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${
            passed ? "bg-green-100" : "bg-red-100"
          }`}
        >
          {passed ? (
            <CheckIcon className="w-8 h-8 text-green-600" />
          ) : (
            <XIcon className="w-8 h-8 text-red-600" />
          )}
        </div>

        <h3 className="font-display font-semibold text-xl text-teal-900 mb-1">
          {modeConfig.rounds.length > 1 ? `Round ${roundIndex + 1} Complete` : "Interview Complete"}
        </h3>
        <p className="text-sm text-teal-500 mb-4">{roundInfo?.title}</p>

        {/* Score display */}
        <div
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4 ${
            passed ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
          }`}
        >
          <span className="font-semibold text-lg">
            {Math.round(evaluationResult.score)}/100
          </span>
          <span className="font-medium">{passed ? "PASSED" : "NOT PASSED"}</span>
        </div>

        {/* Feedback */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6 max-w-lg mx-auto text-left">
          <p className="text-sm font-medium text-gray-700 mb-1">Feedback:</p>
          <p className="text-gray-600 text-sm">{evaluationResult.feedback}</p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {passed && !isLastRound ? (
            <button
              onClick={onContinue}
              className="px-6 py-3 bg-teal-700 hover:bg-teal-800 text-white rounded-xl font-body font-semibold transition-all hover:shadow-glow-teal hover:-translate-y-0.5 active:scale-[0.98]"
            >
              Continue to Round {roundIndex + 2} →
            </button>
          ) : !passed ? (
            <button
              onClick={onTryAgain}
              className="px-6 py-3 bg-teal-700 hover:bg-teal-800 text-white rounded-xl font-body font-semibold transition-all hover:shadow-lg"
            >
              Try Again
            </button>
          ) : null}
          <button
            onClick={onReturnHome}
            className="px-6 py-3 border border-teal-300 text-teal-700 hover:bg-teal-50 rounded-xl font-body font-medium transition-all"
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }

  // Fallback - basic session ended card
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
        Return Home
      </button>
    </div>
  );
}

function EvaluatingSpinner() {
  return (
    <svg className="w-8 h-8 animate-spin text-purple-600" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
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
