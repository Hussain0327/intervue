"use client";

import { useEffect, useRef } from "react";

export interface TranscriptEntry {
  role: "candidate" | "interviewer";
  text: string;
  sequence: number;
  timestamp?: Date;
}

export interface TranscriptProps {
  entries: TranscriptEntry[];
  isProcessing?: boolean;
}

export function Transcript({ entries, isProcessing = false }: TranscriptProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new entries are added
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [entries, isProcessing]);

  return (
    <div
      ref={containerRef}
      className="flex flex-col gap-4 h-full overflow-y-auto p-6 custom-scrollbar"
    >
      {entries.length === 0 && !isProcessing && (
        <EmptyState />
      )}

      {entries.map((entry, index) => (
        <TranscriptBubble
          key={entry.sequence}
          entry={entry}
          isLatest={index === entries.length - 1}
        />
      ))}

      {isProcessing && <ProcessingIndicator />}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8">
      <div className="w-16 h-16 rounded-2xl bg-teal-100 flex items-center justify-center mb-4">
        <ChatIcon className="w-8 h-8 text-teal-500" />
      </div>
      <p className="text-teal-700 font-medium">Ready to begin</p>
      <p className="text-teal-500 text-sm mt-1">
        Your conversation will appear here
      </p>
    </div>
  );
}

function TranscriptBubble({
  entry,
  isLatest,
}: {
  entry: TranscriptEntry;
  isLatest: boolean;
}) {
  const isInterviewer = entry.role === "interviewer";

  return (
    <div
      className={`
        flex gap-3 max-w-[85%]
        ${isInterviewer ? "self-start" : "self-end flex-row-reverse"}
        ${isLatest ? (isInterviewer ? "animate-slide-in-left" : "animate-slide-in-right") : ""}
      `}
    >
      {/* Avatar */}
      <div className="flex-shrink-0">
        {isInterviewer ? (
          <InterviewerAvatar />
        ) : (
          <CandidateAvatar />
        )}
      </div>

      {/* Message bubble */}
      <div
        className={`
          relative rounded-2xl px-4 py-3
          ${
            isInterviewer
              ? "bg-teal-50 border-l-2 border-teal-400 rounded-tl-md"
              : "bg-teal-700 text-white rounded-tr-md"
          }
        `}
      >
        {/* Role label */}
        <p
          className={`
            text-xs font-medium mb-1.5
            ${isInterviewer ? "text-teal-600" : "text-teal-200"}
          `}
        >
          {isInterviewer ? "Interviewer" : "You"}
        </p>

        {/* Message text */}
        <p
          className={`
            text-sm leading-relaxed whitespace-pre-wrap
            ${isInterviewer ? "text-teal-800" : "text-white"}
          `}
        >
          {entry.text}
        </p>

        {/* Timestamp (optional) */}
        {entry.timestamp && (
          <p
            className={`
              text-xs mt-2 font-mono
              ${isInterviewer ? "text-teal-400" : "text-teal-300"}
            `}
          >
            {formatTime(entry.timestamp)}
          </p>
        )}
      </div>
    </div>
  );
}

function InterviewerAvatar() {
  return (
    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center shadow-sm">
      <span className="text-white text-sm font-semibold">AI</span>
    </div>
  );
}

function CandidateAvatar() {
  return (
    <div className="w-10 h-10 rounded-xl bg-teal-800 flex items-center justify-center shadow-sm">
      <UserIcon className="w-5 h-5 text-teal-200" />
    </div>
  );
}

function ProcessingIndicator() {
  return (
    <div className="flex gap-3 max-w-[85%] self-start animate-slide-in-left">
      <InterviewerAvatar />
      <div className="bg-teal-50 rounded-2xl rounded-tl-md px-4 py-4 border-l-2 border-teal-400">
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-2 h-2 bg-teal-500 rounded-full animate-bounce-dot"
              style={{ animationDelay: `${i * 0.16}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function ChatIcon({ className }: { className?: string }) {
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
        d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
      />
    </svg>
  );
}

function UserIcon({ className }: { className?: string }) {
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
        d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
      />
    </svg>
  );
}
