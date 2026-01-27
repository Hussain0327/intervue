"use client";

import { useCallback, useState } from "react";
import { ModeBadge } from "../ModeBadge";
import { ProgressLine } from "../ProgressLine";
import { RoundList } from "../RoundList";
import { InterviewModeId, INTERVIEW_MODES } from "@/lib/useInterviewProgress";
import { RoundStatus } from "@/lib/types/interview";

interface LeftRailProps {
  interviewMode: InterviewModeId;
  currentRound: number;
  roundStatuses: Record<number, RoundStatus>;
  hasResumeContext: boolean;
  onEndSession: () => void;
  onExitInterview: () => void;
  isSessionEnded: boolean;
  isEvaluating: boolean;
}

export function LeftRail({
  interviewMode,
  currentRound,
  roundStatuses,
  hasResumeContext,
  onEndSession,
  onExitInterview,
  isSessionEnded,
  isEvaluating,
}: LeftRailProps) {
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const modeConfig = INTERVIEW_MODES[interviewMode];

  const handleExitClick = useCallback(() => {
    setShowExitConfirm(true);
  }, []);

  const handleConfirmExit = useCallback(() => {
    setShowExitConfirm(false);
    onExitInterview();
  }, [onExitInterview]);

  const handleCancelExit = useCallback(() => {
    setShowExitConfirm(false);
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Logo & Title */}
      <div className="p-4 border-b border-teal-200/50">
        <div className="flex items-center gap-3">
          <ValtricLogo />
          <div className="flex flex-col">
            <span className="font-body font-semibold text-base text-teal-900">
              Intervue
            </span>
            <span className="text-xs text-teal-500 -mt-0.5">
              AI Interview
            </span>
          </div>
        </div>
      </div>

      {/* Mode Badge */}
      <div className="px-4 py-3 border-b border-teal-200/50">
        <ModeBadge mode={interviewMode} />
      </div>

      {/* Progress & Rounds */}
      <div className="flex-1 p-4 overflow-y-auto custom-scrollbar">
        <div className="flex gap-3">
          <ProgressLine
            rounds={modeConfig.rounds}
            currentRound={currentRound}
            roundStatuses={roundStatuses}
          />
          <RoundList
            rounds={modeConfig.rounds}
            currentRound={currentRound}
            roundStatuses={roundStatuses}
          />
        </div>

        {/* Resume Status */}
        <div className="mt-6 pt-4 border-t border-teal-200/50">
          <div className="flex items-center gap-2 text-sm">
            <DocumentIcon className="w-4 h-4 text-teal-500" />
            <span className="text-teal-700">Resume</span>
            {hasResumeContext ? (
              <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                Loaded
              </span>
            ) : (
              <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                Not provided
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Exit Controls */}
      <div className="p-4 border-t border-teal-200/50 space-y-2">
        {!isSessionEnded && (
          <button
            onClick={onEndSession}
            disabled={isEvaluating}
            className={`w-full px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${
              isEvaluating
                ? "text-gray-400 bg-gray-100 cursor-not-allowed"
                : "text-red-600 bg-red-50 hover:bg-red-100"
            }`}
          >
            {isEvaluating ? "Evaluating..." : "End Interview"}
          </button>
        )}

        <button
          onClick={handleExitClick}
          className="w-full px-4 py-2.5 text-sm font-medium text-teal-600 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition-colors"
        >
          Exit to Home
        </button>
      </div>

      {/* Exit Confirmation Modal */}
      {showExitConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm mx-4 shadow-xl animate-scale-in">
            <h3 className="font-display font-semibold text-lg text-teal-900 mb-2">
              Exit Interview?
            </h3>
            <p className="text-sm text-teal-600 mb-4">
              Your progress will be lost. Are you sure you want to exit?
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleCancelExit}
                className="flex-1 px-4 py-2 text-sm font-medium text-teal-700 border border-teal-300 rounded-lg hover:bg-teal-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmExit}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors"
              >
                Exit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ValtricLogo() {
  return (
    <div className="w-9 h-9 rounded-xl bg-teal-700 flex items-center justify-center shadow-sm">
      <span className="text-white font-display font-semibold text-lg">V</span>
    </div>
  );
}

function DocumentIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
      />
    </svg>
  );
}
