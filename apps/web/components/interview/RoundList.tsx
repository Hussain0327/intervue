"use client";

import { INTERVIEW_ROUNDS } from "@/lib/useInterviewProgress";
import { RoundStatus } from "@/lib/types/interview";

interface RoundListProps {
  rounds: readonly (1 | 2 | 3)[];
  currentRound: number;
  roundStatuses: Record<number, RoundStatus>;
}

export function RoundList({
  rounds,
  currentRound,
  roundStatuses,
}: RoundListProps) {
  return (
    <div className="flex flex-col gap-2 flex-1">
      {rounds.map((round) => {
        const roundInfo = INTERVIEW_ROUNDS.find((r) => r.round === round);
        const status = roundStatuses[round] || "locked";
        const isCurrent = round === currentRound;

        return (
          <RoundItem
            key={round}
            roundNumber={round}
            title={roundInfo?.title || `Round ${round}`}
            type={roundInfo?.type || "behavioral"}
            status={status}
            isCurrent={isCurrent}
          />
        );
      })}
    </div>
  );
}

interface RoundItemProps {
  roundNumber: number;
  title: string;
  type: string;
  status: RoundStatus;
  isCurrent: boolean;
}

function RoundItem({
  roundNumber,
  title,
  type,
  status,
  isCurrent,
}: RoundItemProps) {
  return (
    <div
      className={`
        p-3 rounded-lg border transition-all duration-200
        ${isCurrent
          ? "bg-teal-50 border-teal-300 shadow-sm"
          : status === "locked"
          ? "bg-gray-50 border-gray-200 opacity-60"
          : status === "passed"
          ? "bg-green-50 border-green-200"
          : status === "failed"
          ? "bg-red-50 border-red-200"
          : "bg-white border-gray-200"
        }
      `}
    >
      <div className="flex items-center justify-between mb-1">
        <span
          className={`
            text-xs font-medium uppercase tracking-wide
            ${isCurrent ? "text-teal-600" : "text-gray-500"}
          `}
        >
          Round {roundNumber}
        </span>
        <StatusBadge status={status} isCurrent={isCurrent} />
      </div>
      <p
        className={`
          text-sm font-medium
          ${isCurrent ? "text-teal-900" : "text-gray-700"}
        `}
      >
        {title}
      </p>
    </div>
  );
}

function StatusBadge({
  status,
  isCurrent,
}: {
  status: RoundStatus;
  isCurrent: boolean;
}) {
  if (isCurrent) {
    return (
      <span className="flex items-center gap-1 text-xs font-medium text-teal-600">
        <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
        In Progress
      </span>
    );
  }

  switch (status) {
    case "passed":
      return (
        <span className="flex items-center gap-1 text-xs font-medium text-green-600">
          <CheckIcon className="w-3.5 h-3.5" />
          Passed
        </span>
      );
    case "failed":
      return (
        <span className="flex items-center gap-1 text-xs font-medium text-red-600">
          <XIcon className="w-3.5 h-3.5" />
          Failed
        </span>
      );
    case "locked":
      return (
        <span className="flex items-center gap-1 text-xs font-medium text-gray-400">
          <LockIcon className="w-3.5 h-3.5" />
          Locked
        </span>
      );
    default:
      return null;
  }
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

function LockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
      />
    </svg>
  );
}
