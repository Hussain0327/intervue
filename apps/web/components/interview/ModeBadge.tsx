"use client";

import { InterviewModeId, INTERVIEW_MODES } from "@/lib/useInterviewProgress";

interface ModeBadgeProps {
  mode: InterviewModeId;
}

const MODE_ICONS: Record<InterviewModeId, React.ReactNode> = {
  full: <FullIcon />,
  behavioral: <BehavioralIcon />,
  coding: <CodingIcon />,
  system_design: <SystemDesignIcon />,
};

const MODE_COLORS: Record<InterviewModeId, { bg: string; text: string; border: string }> = {
  full: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  behavioral: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  coding: { bg: "bg-green-50", text: "text-green-700", border: "border-green-200" },
  system_design: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
};

export function ModeBadge({ mode }: ModeBadgeProps) {
  const modeConfig = INTERVIEW_MODES[mode];
  const colors = MODE_COLORS[mode];

  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${colors.bg} ${colors.border}`}
    >
      <span className={colors.text}>{MODE_ICONS[mode]}</span>
      <div className="flex flex-col">
        <span className={`text-sm font-medium ${colors.text}`}>
          {modeConfig.title}
        </span>
        <span className="text-xs text-gray-500">
          {modeConfig.rounds.length} round{modeConfig.rounds.length > 1 ? "s" : ""}
        </span>
      </div>
    </div>
  );
}

function FullIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
      />
    </svg>
  );
}

function BehavioralIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
      />
    </svg>
  );
}

function CodingIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5"
      />
    </svg>
  );
}

function SystemDesignIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3m3 3a3 3 0 100 6h13.5a3 3 0 100-6m-16.5-3a3 3 0 013-3h13.5a3 3 0 013 3m-19.5 0a4.5 4.5 0 01.9-2.7L5.737 5.1a3.375 3.375 0 012.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 01.9 2.7m0 0a3 3 0 01-3 3m0 3h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008zm-3 6h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008z"
      />
    </svg>
  );
}
