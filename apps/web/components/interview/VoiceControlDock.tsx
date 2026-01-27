"use client";

import { ReactNode } from "react";

interface VoiceControlDockProps {
  children: ReactNode;
  isSessionEnded: boolean;
}

export function VoiceControlDock({ children, isSessionEnded }: VoiceControlDockProps) {
  return (
    <div
      className={`
        sticky bottom-0 border-t border-teal-200/50 bg-white/95 backdrop-blur-sm
        ${isSessionEnded ? "p-6" : "p-8"}
      `}
    >
      <div className="max-w-lg mx-auto">
        {children}
      </div>
    </div>
  );
}
