"use client";

import { InterviewState } from "@/lib/wsClient";

interface InterviewerCardProps {
  name: string;
  role: string;
  currentQuestion: string | null;
  isConnected: boolean;
  interviewState: InterviewState;
}

export function InterviewerCard({
  name,
  role,
  currentQuestion,
  isConnected,
  interviewState,
}: InterviewerCardProps) {
  const isThinking = interviewState === "generating" || interviewState === "processing_stt";
  const isSpeaking = interviewState === "speaking";

  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-teal-200/50 shadow-card overflow-hidden">
      {/* Header with avatar and info */}
      <div className="p-6 flex items-center gap-4 border-b border-teal-100">
        {/* AI Avatar */}
        <div className="relative">
          <div
            className={`
              w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500 to-teal-700
              flex items-center justify-center shadow-md
              ${isSpeaking ? "animate-pulse" : ""}
            `}
          >
            <AIIcon className="w-8 h-8 text-white" />
          </div>
          {/* Status indicator */}
          <div
            className={`
              absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white
              ${isConnected ? "bg-green-500" : "bg-amber-500"}
            `}
          />
        </div>

        {/* Info */}
        <div className="flex-1">
          <h2 className="font-display font-semibold text-lg text-teal-900">
            {name}
          </h2>
          <p className="text-sm text-teal-600">{role}</p>
          <StatusText state={interviewState} isConnected={isConnected} />
        </div>
      </div>

      {/* Current Question */}
      <div className="p-6">
        {currentQuestion ? (
          <div>
            <p className="text-xs font-medium text-teal-500 uppercase tracking-wide mb-2">
              Current Question
            </p>
            <p className="text-teal-800 leading-relaxed">
              {isThinking ? (
                <span className="flex items-center gap-2">
                  <ThinkingDots />
                  <span className="text-teal-500 italic">Thinking...</span>
                </span>
              ) : (
                currentQuestion
              )}
            </p>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-teal-500 text-sm">
              {isConnected ? "Waiting to start..." : "Connecting..."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusText({
  state,
  isConnected,
}: {
  state: InterviewState;
  isConnected: boolean;
}) {
  let text: string;
  let color: string;

  if (!isConnected) {
    text = "Connecting...";
    color = "text-amber-500";
  } else {
    switch (state) {
      case "ready":
        text = "Ready to listen";
        color = "text-teal-500";
        break;
      case "processing_stt":
        text = "Listening...";
        color = "text-cyan-500";
        break;
      case "generating":
        text = "Thinking...";
        color = "text-cyan-500";
        break;
      case "speaking":
        text = "Speaking...";
        color = "text-teal-600";
        break;
      default:
        text = "Ready";
        color = "text-teal-500";
    }
  }

  return (
    <p className={`text-xs font-mono mt-1 ${color}`}>
      {text}
    </p>
  );
}

function ThinkingDots() {
  return (
    <span className="flex items-center gap-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-bounce-dot"
          style={{ animationDelay: `${i * 0.16}s` }}
        />
      ))}
    </span>
  );
}

function AIIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
      />
    </svg>
  );
}
