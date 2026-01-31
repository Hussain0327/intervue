"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Recorder } from "@/components/audio/Recorder";
import { TranscriptEntry } from "@/components/interview/Transcript";
import { createWSClient, InterviewState, WSClient, CodeEvaluationMessage, ProblemMessage, StreamingStage } from "@/lib/wsClient";
import { StreamingAudioPlayer } from "@/lib/audio/streamPlayer";
import { useInterviewProgress, INTERVIEW_ROUNDS, INTERVIEW_MODES, InterviewModeId } from "@/lib/useInterviewProgress";
import { useInterviewNotes } from "@/lib/useInterviewNotes";
import { InterviewLayout, LeftRail, CenterPanel, RightPanel } from "@/components/interview/layout";
import { InterviewTab, LatencyStage, ParsedResumeContext, RoundStatus } from "@/lib/types/interview";
import { CodingProblem, CodeEvaluationResult } from "@/lib/types/coding";
import { CodingChallengeLayout } from "@/components/coding/CodingChallengeLayout";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// SessionStorage key constants
const SK_CURRENT_ROUND = "current_round";
const SK_INTERVIEW_MODE = "interview_mode";
const SK_PARSED_RESUME = "parsed_resume";
const SK_SELECTED_ROLE = "selected_role";

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

  // Core interview state
  const [isConnected, setIsConnected] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
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

  // New state for 3-column layout
  const [activeTab, setActiveTab] = useState<InterviewTab>("transcript");
  const [currentQuestion, setCurrentQuestion] = useState<string | null>(null);
  const [latencyStage, setLatencyStage] = useState<LatencyStage>("idle");
  const [resumeContext, setResumeContext] = useState<ParsedResumeContext | null>(null);
  const [roundStatuses, setRoundStatuses] = useState<Record<number, RoundStatus>>({});

  // Coding challenge state
  const [codingProblem, setCodingProblem] = useState<CodingProblem | null>(null);
  const [isProblemLoading, setIsProblemLoading] = useState(false);
  const [codeEvaluationResult, setCodeEvaluationResult] = useState<CodeEvaluationResult | null>(null);
  const [isCodeSubmitting, setIsCodeSubmitting] = useState(false);
  const problemRequestedRef = useRef(false);

  const wsClientRef = useRef<WSClient | null>(null);
  const resumeSentRef = useRef(false);
  const streamingPlayerRef = useRef<StreamingAudioPlayer | null>(null);
  const streamingTranscriptRef = useRef<string>("");

  const { updateRound, hasCompletedAllRounds, getNextAvailableRound, getProgress } = useInterviewProgress();
  const { notes, updateNotes, addHighlight } = useInterviewNotes({ sessionId });

  // Stable refs so the WS effect doesn't re-run when these change
  const updateRoundRef = useRef(updateRound);
  useEffect(() => { updateRoundRef.current = updateRound; }, [updateRound]);

  const sessionEndedRef = useRef(sessionEnded);
  useEffect(() => { sessionEndedRef.current = sessionEnded; }, [sessionEnded]);

  // Get current round and mode from sessionStorage on mount
  useEffect(() => {
    const storedRound = sessionStorage.getItem(SK_CURRENT_ROUND);
    if (storedRound) {
      setCurrentRound(parseInt(storedRound, 10));
    }
    const storedMode = sessionStorage.getItem(SK_INTERVIEW_MODE);
    if (storedMode && storedMode in INTERVIEW_MODES) {
      setInterviewMode(storedMode as InterviewModeId);
    }
    // Load resume context if available
    const parsedResumeJson = sessionStorage.getItem(SK_PARSED_RESUME);
    if (parsedResumeJson) {
      try {
        const parsed = JSON.parse(parsedResumeJson);
        setResumeContext(parsed);
      } catch (e) {
        console.error("Failed to parse stored resume:", e);
      }
    }
    // Load round statuses from progress
    const progress = getProgress();
    if (progress?.rounds) {
      const statuses: Record<number, RoundStatus> = {};
      Object.entries(progress.rounds).forEach(([roundNum, roundData]) => {
        statuses[parseInt(roundNum)] = roundData.status;
      });
      setRoundStatuses(statuses);
    }
  }, [getProgress]);

  // Extract current question from transcript
  useEffect(() => {
    const lastInterviewerEntry = transcriptEntries
      .filter((e) => e.role === "interviewer")
      .at(-1);
    if (lastInterviewerEntry) {
      setCurrentQuestion(lastInterviewerEntry.text);
    }
  }, [transcriptEntries]);

  // Map interview state to latency stage
  useEffect(() => {
    switch (interviewState) {
      case "processing_stt":
        setLatencyStage("transcribing");
        break;
      case "generating":
        setLatencyStage("generating");
        break;
      case "speaking":
        setLatencyStage("speaking");
        break;
      default:
        setLatencyStage("idle");
    }
  }, [interviewState]);

  // Initialize WebSocket connection - deferred to allow first paint
  useEffect(() => {
    // Defer WebSocket connection to after initial paint for better LCP
    const timeoutId = setTimeout(() => {
      setIsInitializing(false);
    }, 0);

    const client = createWSClient(sessionId, {
      onConnectionChange: (connected) => {
        setIsConnected(connected);
        if (!connected && !sessionEndedRef.current) {
          setError("Connection lost. Attempting to reconnect...");
        } else {
          setError(null);
        }
      },
      onStatusChange: (state) => {
        setInterviewState(state);
      },
      onTranscript: (role, text, sequence) => {
        setTranscriptEntries((prev) => {
          // If this is the final interviewer transcript, replace any streaming entry
          if (role === "interviewer") {
            const lastIdx = prev.length - 1;
            if (lastIdx >= 0 && prev[lastIdx].role === "interviewer" && prev[lastIdx].streaming) {
              const updated = [...prev];
              updated[lastIdx] = { role, text, sequence, timestamp: new Date() };
              return updated;
            }
          }
          return [
            ...prev,
            { role, text, sequence, timestamp: new Date() },
          ];
        });
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
          const parsedResumeJson = sessionStorage.getItem(SK_PARSED_RESUME);
          if (parsedResumeJson) {
            try {
              const parsedResume = JSON.parse(parsedResumeJson);
              wsClientRef.current.sendResumeContext(parsedResume);
            } catch (e) {
              console.error("Failed to parse stored resume:", e);
            }
            // Clear from sessionStorage after sending
            sessionStorage.removeItem(SK_PARSED_RESUME);
          }
          // Get selected role from sessionStorage
          const selectedRole = sessionStorage.getItem(SK_SELECTED_ROLE) || undefined;
          if (selectedRole) {
            sessionStorage.removeItem(SK_SELECTED_ROLE);
          }
          // Get current round from sessionStorage
          const storedRound = sessionStorage.getItem(SK_CURRENT_ROUND);
          const round = storedRound ? parseInt(storedRound, 10) : 1;
          // Get interview mode from sessionStorage
          const interviewMode = sessionStorage.getItem(SK_INTERVIEW_MODE) || undefined;
          if (interviewMode) {
            sessionStorage.removeItem(SK_INTERVIEW_MODE);
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
        updateRoundRef.current(round, { score, passed, feedback });
        // Update local round statuses
        setRoundStatuses((prev) => ({
          ...prev,
          [round]: passed ? "passed" : "failed",
        }));
        // NOW end the session and close WebSocket (after evaluation is received)
        wsClientRef.current?.endSession();
        setSessionEnded(true);
      },
      onProblem: (problem) => {
        setIsProblemLoading(false);
        setCodingProblem(problem);
      },
      onCodeEvaluation: (result) => {
        setIsCodeSubmitting(false);
        setCodeEvaluationResult({
          correct: result.correct,
          score: result.score,
          feedback: result.feedback,
          analysis: result.analysis,
        });
      },
      // Streaming callbacks
      onTranscriptDelta: (role, delta, isFinal, sequence) => {
        if (role === "interviewer") {
          if (isFinal) {
            // Finalize the streaming entry — the batch onTranscript will add the full entry
            streamingTranscriptRef.current = "";
          } else {
            // Accumulate delta into a streaming transcript entry
            streamingTranscriptRef.current += delta;
            const streamingText = streamingTranscriptRef.current;
            setTranscriptEntries((prev) => {
              // Sequence guard: only update if incoming sequence >= current
              const lastIdx = prev.length - 1;
              if (lastIdx >= 0 && prev[lastIdx].role === "interviewer" && prev[lastIdx].streaming) {
                if (sequence < prev[lastIdx].sequence) {
                  return prev; // Out-of-order delta, skip
                }
                const updated = [...prev];
                updated[lastIdx] = { ...updated[lastIdx], text: streamingText, sequence };
                return updated;
              }
              return [
                ...prev,
                { role: "interviewer", text: streamingText, sequence, timestamp: new Date(), streaming: true },
              ];
            });
          }
        }
        // Candidate deltas are handled by the batch onTranscript for simplicity
      },
      onAudioChunk: (audioBase64, format, sequence, isFinal) => {
        // Lazily create the streaming audio player
        if (!streamingPlayerRef.current) {
          streamingPlayerRef.current = new StreamingAudioPlayer({
            onPlaybackEnd: () => {
              setCurrentAudio(null);
              wsClientRef.current?.sendPlaybackComplete();
              streamingPlayerRef.current = null;
            },
            onError: (error) => {
              console.error("Streaming audio playback error:", error);
            },
          });
        }
        streamingPlayerRef.current.addChunk(audioBase64, isFinal, sequence, format);
      },
      onStreamingStatus: (stage, _latencyMs) => {
        // Map streaming stages to latency stage state
        const stageMap: Record<StreamingStage, LatencyStage> = {
          transcribing: "transcribing",
          thinking: "generating",
          speaking: "speaking",
        };
        setLatencyStage(stageMap[stage] || "idle");
      },
    });

    wsClientRef.current = client;

    // Connect after a microtask to let React render the skeleton first
    const connectTimeoutId = setTimeout(() => {
      client.connect();
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      clearTimeout(connectTimeoutId);
      client.disconnect();
      streamingPlayerRef.current?.destroy();
      streamingPlayerRef.current = null;
    };
  }, [sessionId]);

  const handleRecordingComplete = useCallback((audioBase64: string, format: string) => {
    if (wsClientRef.current?.isConnected) {
      setLatencyStage("uploading");
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
      sessionStorage.setItem(SK_CURRENT_ROUND, String(nextRound));
    }
    // Generate new session ID and navigate
    const newSessionId = crypto.randomUUID();
    router.push(`/interview/${newSessionId}`);
  }, [router, getNextAvailableRound]);

  const handleTryAgain = useCallback(() => {
    // Keep the same round and try again
    sessionStorage.setItem(SK_CURRENT_ROUND, String(currentRound));
    // Generate new session ID and navigate
    const newSessionId = crypto.randomUUID();
    router.push(`/interview/${newSessionId}`);
  }, [router, currentRound]);

  // Handle code submission for coding challenges
  const handleCodeSubmit = useCallback((code: string, language: string) => {
    if (wsClientRef.current?.isConnected && codingProblem) {
      setIsCodeSubmitting(true);
      setCodeEvaluationResult(null);
      wsClientRef.current.sendCodeSubmission(code, language, codingProblem.id);
    }
  }, [codingProblem]);

  // Get round and mode info
  const roundInfo = INTERVIEW_ROUNDS.find((r) => r.round === currentRound);
  const modeConfig = INTERVIEW_MODES[interviewMode];

  // Request coding problem when round is coding and interview has started
  useEffect(() => {
    if (
      roundInfo?.type === "coding" &&
      isConnected &&
      !problemRequestedRef.current &&
      wsClientRef.current
    ) {
      // Small delay to ensure the interview has started
      const timer = setTimeout(() => {
        if (!problemRequestedRef.current && wsClientRef.current?.isConnected) {
          problemRequestedRef.current = true;
          setIsProblemLoading(true);
          wsClientRef.current.requestProblem();
        }
      }, 2000); // Wait 2 seconds for interview intro to play first

      return () => clearTimeout(timer);
    }
  }, [roundInfo?.type, isConnected]);

  const isRecordingDisabled =
    !isConnected ||
    interviewState !== "ready" ||
    currentAudio !== null ||
    sessionEnded;

  const isProcessing =
    interviewState === "processing_stt" || interviewState === "generating";

  // Derive interviewer role based on round
  const interviewerRole = useMemo(() => {
    switch (roundInfo?.type) {
      case "behavioral":
        return "Behavioral Interviewer";
      case "coding":
        return "Technical Interviewer";
      case "system_design":
        return "System Design Interviewer";
      default:
        return "Interviewer";
    }
  }, [roundInfo?.type]);

  // Set current round as in_progress
  useEffect(() => {
    setRoundStatuses((prev) => ({
      ...prev,
      [currentRound]: prev[currentRound] || "in_progress",
    }));
  }, [currentRound]);

  // Determine if we should show the coding challenge layout
  const isCodingRound = roundInfo?.type === "coding";

  // For coding rounds, show a different layout
  if (isCodingRound && !sessionEnded) {
    return (
      <ErrorBoundary>
      <InterviewLayout
        leftRail={
          <LeftRail
            interviewMode={interviewMode}
            currentRound={currentRound}
            roundStatuses={roundStatuses}
            hasResumeContext={resumeContext !== null}
            onEndSession={handleEndSession}
            onExitInterview={handleReturnHome}
            isSessionEnded={sessionEnded}
            isEvaluating={isEvaluating}
          />
        }
        centerPanel={
          <CodingChallengeLayout
            problem={codingProblem}
            isProblemLoading={isProblemLoading}
            onCodeSubmit={handleCodeSubmit}
            isSubmitting={isCodeSubmitting}
            evaluationResult={codeEvaluationResult}
            interviewerName="Intervue Interviewer"
            interviewerRole={interviewerRole}
            currentQuestion={currentQuestion}
            latencyStage={latencyStage}
            isConnected={isConnected}
            currentAudio={currentAudio}
            audioFormat={audioFormat}
            onPlaybackEnd={handlePlaybackEnd}
            onRecordingComplete={handleRecordingComplete}
            isRecordingDisabled={isRecordingDisabled}
          />
        }
        rightPanel={
          <RightPanel
            activeTab={activeTab}
            onTabChange={setActiveTab}
            transcriptEntries={transcriptEntries}
            isProcessing={isProcessing}
            notes={notes}
            onNotesChange={updateNotes}
            onAddHighlight={addHighlight}
            roundType={roundInfo?.type || "behavioral"}
            resumeContext={resumeContext}
            evaluationScore={evaluationResult?.score}
          />
        }
      />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
    <InterviewLayout
      leftRail={
        <LeftRail
          interviewMode={interviewMode}
          currentRound={currentRound}
          roundStatuses={roundStatuses}
          hasResumeContext={resumeContext !== null}
          onEndSession={handleEndSession}
          onExitInterview={handleReturnHome}
          isSessionEnded={sessionEnded}
          isEvaluating={isEvaluating}
        />
      }
      centerPanel={
        <CenterPanel
          interviewerName="Intervue Interviewer"
          interviewerRole={interviewerRole}
          currentQuestion={currentQuestion}
          latencyStage={latencyStage}
          isConnected={isConnected}
          interviewState={interviewState}
          currentAudio={currentAudio}
          audioFormat={audioFormat}
          onPlaybackEnd={handlePlaybackEnd}
          recorderElement={
            <Recorder
              onRecordingComplete={handleRecordingComplete}
              disabled={isRecordingDisabled}
            />
          }
          sessionEndedElement={
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
          }
          isSessionEnded={sessionEnded}
          error={error}
          isLoading={isInitializing || !isConnected}
        />
      }
      rightPanel={
        <RightPanel
          activeTab={activeTab}
          onTabChange={setActiveTab}
          transcriptEntries={transcriptEntries}
          isProcessing={isProcessing}
          notes={notes}
          onNotesChange={updateNotes}
          onAddHighlight={addHighlight}
          roundType={roundInfo?.type || "behavioral"}
          resumeContext={resumeContext}
          evaluationScore={evaluationResult?.score}
        />
      }
    />
    </ErrorBoundary>
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
          You&apos;ve passed all interview rounds!
        </p>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 max-w-md mx-auto">
          <p className="text-green-700 font-medium">You got the job!</p>
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
