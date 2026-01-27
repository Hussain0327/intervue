"use client";

import { ReactNode } from "react";

interface InterviewLayoutProps {
  leftRail: ReactNode;
  centerPanel: ReactNode;
  rightPanel: ReactNode;
}

export function InterviewLayout({
  leftRail,
  centerPanel,
  rightPanel,
}: InterviewLayoutProps) {
  return (
    <div className="min-h-screen bg-valtric-gradient">
      {/* Desktop 3-column layout */}
      <div className="hidden lg:grid grid-cols-interview min-h-screen">
        {/* Left Rail */}
        <aside className="border-r border-teal-200/50 bg-white/80 backdrop-blur-sm flex flex-col">
          {leftRail}
        </aside>

        {/* Center Panel */}
        <main className="flex flex-col min-h-screen overflow-hidden">
          {centerPanel}
        </main>

        {/* Right Panel */}
        <aside className="border-l border-teal-200/50 bg-white/90 backdrop-blur-sm flex flex-col overflow-hidden">
          {rightPanel}
        </aside>
      </div>

      {/* Mobile/Tablet single column layout */}
      <div className="lg:hidden flex flex-col min-h-screen">
        {centerPanel}
      </div>
    </div>
  );
}
