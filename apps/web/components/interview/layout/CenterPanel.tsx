"use client";

import { ReactNode } from "react";
import { InterviewerCard } from "../InterviewerCard";
import { VoiceControlDock } from "../VoiceControlDock";
import { LatencyIndicator } from "../LatencyIndicator";
import { Player } from "@/components/audio/Player";
import { InterviewState } from "@/lib/wsClient";
import { LatencyStage } from "@/lib/types/interview";

interface CenterPanelProps {
  interviewerName: string;
  interviewerRole: string;
  currentQuestion: string | null;
  latencyStage: LatencyStage;
  isConnected: boolean;
  interviewState: InterviewState;
  currentAudio: string | null;
  audioFormat: string;
  onPlaybackEnd: () => void;
  recorderElement: ReactNode;
  sessionEndedElement: ReactNode;
  isSessionEnded: boolean;
  error: string | null;
}

export function CenterPanel({
  interviewerName,
  interviewerRole,
  currentQuestion,
  latencyStage,
  isConnected,
  interviewState,
  currentAudio,
  audioFormat,
  onPlaybackEnd,
  recorderElement,
  sessionEndedElement,
  isSessionEnded,
  error,
}: CenterPanelProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Error banner */}
      {error && (
        <div className="bg-red-50 border-b border-red-200 px-6 py-3">
          <p className="text-sm text-red-600 flex items-center gap-2">
            <AlertIcon className="w-4 h-4" />
            {error}
          </p>
        </div>
      )}

      {/* Main content area */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 overflow-y-auto">
        {/* Interviewer Card */}
        <div className="w-full max-w-lg">
          <InterviewerCard
            name={interviewerName}
            role={interviewerRole}
            currentQuestion={currentQuestion}
            isConnected={isConnected}
            interviewState={interviewState}
          />
        </div>

        {/* Audio Player */}
        {currentAudio && (
          <div className="w-full max-w-lg mt-6">
            <Player
              audioBase64={currentAudio}
              format={audioFormat}
              autoPlay={true}
              onPlaybackEnd={onPlaybackEnd}
            />
          </div>
        )}

        {/* Latency Indicator */}
        <div className="mt-6">
          <LatencyIndicator stage={latencyStage} />
        </div>
      </div>

      {/* Voice Control Dock - sticky at bottom */}
      <VoiceControlDock isSessionEnded={isSessionEnded}>
        {isSessionEnded ? sessionEndedElement : recorderElement}
      </VoiceControlDock>
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
