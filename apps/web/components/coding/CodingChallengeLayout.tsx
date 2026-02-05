"use client";

import { useCallback, useState, useEffect } from "react";
import {
  CodingProblem,
  CodeEvaluationResult,
  SupportedLanguage,
  DEFAULT_LANGUAGE,
} from "@/lib/types/coding";
import { CodeEditor } from "./CodeEditor";
import { ProblemPanel } from "./ProblemPanel";
import { InterviewerCard } from "@/components/interview/InterviewerCard";
import { LatencyIndicator } from "@/components/interview/LatencyIndicator";
import { LatencyStage } from "@/lib/types/interview";
import { Recorder } from "@/components/audio/Recorder";
import { Player } from "@/components/audio/Player";

interface CodeExecutionResult {
  stdout: string;
  stderr: string;
  exit_code: number;
  timed_out: boolean;
  execution_time_ms: number;
}

interface CodingChallengeLayoutProps {
  problem: CodingProblem | null;
  isProblemLoading: boolean;
  onCodeSubmit: (code: string, language: string) => void;
  onRunCode?: (code: string, language: string) => void;
  isSubmitting: boolean;
  isRunning?: boolean;
  executionResult?: CodeExecutionResult | null;
  evaluationResult: CodeEvaluationResult | null;
  // Voice interaction props
  interviewerName: string;
  interviewerRole: string;
  currentQuestion: string | null;
  latencyStage: LatencyStage;
  isConnected: boolean;
  currentAudio: string | null;
  audioFormat: string;
  onPlaybackEnd: () => void;
  onRecordingComplete: (audioBase64: string, format: string) => void;
  isRecordingDisabled: boolean;
}

export function CodingChallengeLayout({
  problem,
  isProblemLoading,
  onCodeSubmit,
  onRunCode,
  isSubmitting,
  isRunning,
  executionResult,
  evaluationResult,
  interviewerName,
  interviewerRole,
  currentQuestion,
  latencyStage,
  isConnected,
  currentAudio,
  audioFormat,
  onPlaybackEnd,
  onRecordingComplete,
  isRecordingDisabled,
}: CodingChallengeLayoutProps) {
  const [code, setCode] = useState<string>("");
  const [language, setLanguage] = useState<SupportedLanguage>(DEFAULT_LANGUAGE);

  // Initialize starter code when problem changes - moved to useEffect to prevent re-render loop
  useEffect(() => {
    if (problem && problem.starterCode[language] && !code) {
      setCode(problem.starterCode[language]);
    }
  }, [problem, language, code]);

  // Update code when problem changes (load starter code)
  const handleLanguageChange = useCallback(
    (newLanguage: SupportedLanguage) => {
      setLanguage(newLanguage);
      // Load starter code for new language if available
      if (problem?.starterCode[newLanguage]) {
        setCode(problem.starterCode[newLanguage]);
      }
    },
    [problem]
  );

  const handleSubmit = useCallback(() => {
    if (code.trim()) {
      onCodeSubmit(code, language);
    }
  }, [code, language, onCodeSubmit]);

  const handleRunCode = useCallback(() => {
    if (code.trim() && onRunCode) {
      onRunCode(code, language);
    }
  }, [code, language, onRunCode]);

  // Show skeleton state while connecting
  const isLoading = !isConnected;

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Top section: Interviewer + Voice Controls (compact) */}
      <div className="flex-shrink-0 bg-gradient-to-r from-teal-50 to-white rounded-xl border border-teal-100 p-4">
        <div className="flex items-start gap-4">
          {/* Compact Interviewer Info */}
          <div className="flex items-center gap-3 flex-1">
            <div className={`w-10 h-10 rounded-full bg-teal-600 flex items-center justify-center text-white font-semibold text-lg flex-shrink-0 ${isLoading ? "animate-pulse" : ""}`}>
              {interviewerName.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                {isLoading ? (
                  <div className="h-4 w-32 bg-teal-100 rounded animate-pulse" />
                ) : (
                  <span className="font-medium text-gray-900 truncate">
                    {interviewerName}
                  </span>
                )}
                <span
                  className={`w-2 h-2 rounded-full ${
                    isConnected ? "bg-green-500" : "bg-amber-500 animate-pulse"
                  }`}
                />
              </div>
              {isLoading ? (
                <div className="h-3 w-24 bg-teal-50 rounded animate-pulse mt-1" />
              ) : (
                <p className="text-sm text-gray-500">{interviewerRole}</p>
              )}
            </div>
          </div>

          {/* Current question or status */}
          <div className="flex-1 min-w-0">
            {isLoading ? (
              <div className="flex items-center gap-2">
                <ConnectingSpinner />
                <span className="text-sm text-amber-600">Connecting...</span>
              </div>
            ) : currentQuestion ? (
              <p className="text-sm text-gray-700 line-clamp-2">{currentQuestion}</p>
            ) : null}
            {!isLoading && latencyStage !== "idle" && (
              <LatencyIndicator stage={latencyStage} variant="compact" />
            )}
          </div>

          {/* Voice controls */}
          <div className="flex-shrink-0">
            {currentAudio ? (
              <Player
                audioBase64={currentAudio}
                format={audioFormat}
                onPlaybackEnd={onPlaybackEnd}
                variant="compact"
              />
            ) : (
              <Recorder
                onRecordingComplete={onRecordingComplete}
                disabled={isRecordingDisabled}
                variant="compact"
              />
            )}
          </div>
        </div>
      </div>

      {/* Main content: Problem + Editor (split view) */}
      <div className="flex-1 min-h-0 flex gap-4">
        {/* Left: Problem description */}
        <div className="w-2/5 min-w-[300px]">
          <ProblemPanel problem={problem} isLoading={isProblemLoading} />
        </div>

        {/* Right: Code editor */}
        <div className="flex-1 flex flex-col gap-4">
          <div className="flex-1 min-h-0">
            <CodeEditor
              code={code}
              language={language}
              onChange={setCode}
              onLanguageChange={handleLanguageChange}
              onSubmit={handleSubmit}
              disabled={!problem}
              isSubmitting={isSubmitting}
            />
          </div>

          {/* Action buttons */}
          <div className="flex-shrink-0 flex gap-3">
            {onRunCode && (
              <button
                onClick={handleRunCode}
                disabled={!problem || !code.trim() || isRunning}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  isRunning
                    ? "bg-gray-100 text-gray-400 cursor-wait"
                    : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                }`}
              >
                {isRunning ? (
                  <span className="flex items-center gap-2">
                    <RunSpinner />
                    Running...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <PlayIcon className="w-4 h-4" />
                    Run Code
                  </span>
                )}
              </button>
            )}
            <button
              onClick={handleSubmit}
              disabled={!problem || !code.trim() || isSubmitting}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                isSubmitting
                  ? "bg-teal-300 text-white cursor-wait"
                  : "bg-teal-600 hover:bg-teal-700 text-white"
              }`}
            >
              {isSubmitting ? "Submitting..." : "Submit for Review"}
            </button>
          </div>

          {/* Execution output */}
          {executionResult && (
            <div className="flex-shrink-0 rounded-xl border border-gray-200 bg-gray-900 text-gray-100 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
                <span className="text-xs font-medium text-gray-300">Output</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400">
                    {executionResult.execution_time_ms}ms
                  </span>
                  {executionResult.timed_out ? (
                    <span className="text-xs text-amber-400 font-medium">Timed Out</span>
                  ) : executionResult.exit_code === 0 ? (
                    <span className="text-xs text-green-400 font-medium">Exit: 0</span>
                  ) : (
                    <span className="text-xs text-red-400 font-medium">Exit: {executionResult.exit_code}</span>
                  )}
                </div>
              </div>
              <pre className="p-4 text-sm font-mono whitespace-pre-wrap max-h-48 overflow-y-auto">
                {executionResult.stdout || executionResult.stderr || "(no output)"}
                {executionResult.stdout && executionResult.stderr && (
                  <>
                    {"\n"}
                    <span className="text-red-400">{executionResult.stderr}</span>
                  </>
                )}
              </pre>
            </div>
          )}

          {/* Evaluation result */}
          {evaluationResult && (
            <div
              className={`flex-shrink-0 rounded-xl p-4 ${
                evaluationResult.correct
                  ? "bg-green-50 border border-green-200"
                  : "bg-red-50 border border-red-200"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    evaluationResult.correct ? "bg-green-100" : "bg-red-100"
                  }`}
                >
                  {evaluationResult.correct ? (
                    <CheckIcon className="w-5 h-5 text-green-600" />
                  ) : (
                    <XIcon className="w-5 h-5 text-red-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`font-semibold ${
                        evaluationResult.correct ? "text-green-800" : "text-red-800"
                      }`}
                    >
                      {evaluationResult.correct ? "Solution Accepted" : "Try Again"}
                    </span>
                    <span
                      className={`text-sm ${
                        evaluationResult.correct ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      Score: {Math.round(evaluationResult.score)}/100
                    </span>
                  </div>
                  <p
                    className={`text-sm ${
                      evaluationResult.correct ? "text-green-700" : "text-red-700"
                    }`}
                  >
                    {evaluationResult.feedback}
                  </p>
                  {evaluationResult.analysis && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <ScoreBadge
                        label="Correctness"
                        score={evaluationResult.analysis.correctness}
                      />
                      <ScoreBadge
                        label="Edge Cases"
                        score={evaluationResult.analysis.edgeCaseHandling}
                      />
                      <ScoreBadge
                        label="Code Quality"
                        score={evaluationResult.analysis.codeQuality}
                      />
                      <ScoreBadge
                        label="Complexity"
                        score={evaluationResult.analysis.complexity}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ScoreBadge({ label, score }: { label: string; score: number }) {
  const getColor = (score: number) => {
    if (score >= 80) return "bg-green-100 text-green-700";
    if (score >= 60) return "bg-yellow-100 text-yellow-700";
    return "bg-red-100 text-red-700";
  };

  return (
    <span className={`px-2 py-0.5 text-xs rounded-full ${getColor(score)}`}>
      {label}: {score}
    </span>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
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

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.986V5.653z" />
    </svg>
  );
}

function RunSpinner() {
  return (
    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

function ConnectingSpinner() {
  return (
    <svg className="w-4 h-4 animate-spin text-amber-500" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}
