"use client";

import { LatencyStage } from "@/lib/types/interview";

interface LatencyIndicatorProps {
  stage: LatencyStage;
  variant?: "default" | "compact";
}

const STAGES: { id: LatencyStage; label: string }[] = [
  { id: "uploading", label: "Uploading" },
  { id: "transcribing", label: "Transcribing" },
  { id: "generating", label: "Generating" },
  { id: "speaking", label: "Speaking" },
];

export function LatencyIndicator({ stage, variant = "default" }: LatencyIndicatorProps) {
  if (stage === "idle") {
    return null;
  }

  const currentIndex = STAGES.findIndex((s) => s.id === stage);
  const currentStage = STAGES[currentIndex];

  // Compact variant for coding challenge layout
  if (variant === "compact") {
    return (
      <div className="flex items-center gap-2 text-xs text-teal-600">
        <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
        <span className="font-medium">{currentStage?.label || "Processing"}...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-teal-50/80 backdrop-blur-sm rounded-full border border-teal-200/50">
      {STAGES.map((s, index) => {
        const isActive = index === currentIndex;
        const isComplete = index < currentIndex;

        return (
          <div key={s.id} className="flex items-center gap-2">
            {/* Stage dot/icon */}
            <div
              className={`
                flex items-center justify-center transition-all duration-300
                ${isActive
                  ? "text-teal-600"
                  : isComplete
                  ? "text-teal-400"
                  : "text-gray-300"
                }
              `}
            >
              {isActive ? (
                <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
              ) : isComplete ? (
                <CheckIcon className="w-3 h-3" />
              ) : (
                <span className="w-1.5 h-1.5 rounded-full bg-current" />
              )}
            </div>

            {/* Label */}
            <span
              className={`
                text-xs font-mono transition-all duration-300
                ${isActive
                  ? "text-teal-700 font-medium"
                  : isComplete
                  ? "text-teal-500"
                  : "text-gray-400"
                }
              `}
            >
              {s.label}
            </span>

            {/* Connector */}
            {index < STAGES.length - 1 && (
              <div
                className={`
                  w-4 h-px transition-all duration-300
                  ${isComplete ? "bg-teal-300" : "bg-gray-200"}
                `}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}
