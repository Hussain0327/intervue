"use client";

import { RoundStatus } from "@/lib/types/interview";

interface ProgressLineProps {
  rounds: readonly (1 | 2 | 3)[];
  currentRound: number;
  roundStatuses: Record<number, RoundStatus>;
}

export function ProgressLine({
  rounds,
  currentRound,
  roundStatuses,
}: ProgressLineProps) {
  return (
    <div className="flex flex-col items-center py-2">
      {rounds.map((round, index) => {
        const status = roundStatuses[round] || "locked";
        const isCurrent = round === currentRound;
        const isLast = index === rounds.length - 1;

        return (
          <div key={round} className="flex flex-col items-center">
            {/* Checkpoint dot */}
            <div
              className={`
                w-3 h-3 rounded-full transition-all duration-300
                ${getCheckpointColor(status, isCurrent)}
                ${isCurrent ? "ring-2 ring-offset-2 ring-teal-400" : ""}
              `}
            />

            {/* Connecting line */}
            {!isLast && (
              <div
                className={`
                  w-0.5 h-12 transition-all duration-300
                  ${getLineColor(status, roundStatuses[rounds[index + 1]])}
                `}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function getCheckpointColor(status: RoundStatus, isCurrent: boolean): string {
  if (isCurrent) {
    return "bg-teal-500";
  }

  switch (status) {
    case "passed":
      return "bg-green-500";
    case "failed":
      return "bg-red-500";
    case "in_progress":
      return "bg-teal-500 animate-pulse";
    case "locked":
    default:
      return "bg-gray-300";
  }
}

function getLineColor(
  currentStatus: RoundStatus,
  nextStatus?: RoundStatus
): string {
  if (currentStatus === "passed") {
    return "bg-green-300";
  }
  if (currentStatus === "failed") {
    return "bg-red-200";
  }
  return "bg-gray-200";
}
