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
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [entries]);

  return (
    <div
      ref={containerRef}
      className="flex flex-col gap-4 h-full overflow-y-auto p-4"
    >
      {entries.length === 0 && !isProcessing && (
        <div className="flex items-center justify-center h-full text-gray-400">
          <p>The interview will appear here...</p>
        </div>
      )}

      {entries.map((entry) => (
        <TranscriptBubble key={entry.sequence} entry={entry} />
      ))}

      {isProcessing && (
        <div className="flex items-center gap-2 text-gray-400 animate-pulse">
          <span className="w-2 h-2 bg-gray-400 rounded-full" />
          <span className="w-2 h-2 bg-gray-400 rounded-full animation-delay-150" />
          <span className="w-2 h-2 bg-gray-400 rounded-full animation-delay-300" />
        </div>
      )}
    </div>
  );
}

function TranscriptBubble({ entry }: { entry: TranscriptEntry }) {
  const isInterviewer = entry.role === "interviewer";

  return (
    <div
      className={`flex ${isInterviewer ? "justify-start" : "justify-end"}`}
    >
      <div
        className={`
          max-w-[80%] rounded-2xl px-4 py-3
          ${
            isInterviewer
              ? "bg-gray-100 text-gray-800 rounded-bl-md"
              : "bg-blue-500 text-white rounded-br-md"
          }
        `}
      >
        <p className="text-xs font-medium mb-1 opacity-70">
          {isInterviewer ? "Interviewer" : "You"}
        </p>
        <p className="text-sm leading-relaxed whitespace-pre-wrap">
          {entry.text}
        </p>
      </div>
    </div>
  );
}
