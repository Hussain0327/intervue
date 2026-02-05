"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ResumeUpload } from "@/components/ResumeUpload";
import { ParsedResume } from "@/lib/api";
import { useAuth } from "@/lib/AuthProvider";
import {
  INTERVIEW_MODES,
  INTERVIEW_ROUNDS,
  InterviewModeId,
  RoundStatus,
  useInterviewProgress,
} from "@/lib/useInterviewProgress";

const CS_ROLES = [
  {
    id: "software-engineer",
    title: "Software Engineer",
    description: "General SWE, algorithms, system design",
    icon: "code",
  },
  {
    id: "frontend-developer",
    title: "Frontend Developer",
    description: "React, CSS, web performance",
    icon: "layout",
  },
  {
    id: "backend-developer",
    title: "Backend Developer",
    description: "APIs, databases, scalability",
    icon: "server",
  },
  {
    id: "fullstack-developer",
    title: "Full Stack Developer",
    description: "End-to-end application development",
    icon: "layers",
  },
] as const;

export default function Home() {
  const router = useRouter();
  const { user } = useAuth();
  const [isStarting, setIsStarting] = useState(false);
  const [parsedResume, setParsedResume] = useState<ParsedResume | null>(null);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [selectedMode, setSelectedMode] = useState<InterviewModeId>("full");

  const {
    progress,
    isLoaded,
    initProgress,
    hasExistingProgress,
    hasCompletedAllRounds,
    getNextAvailableRound,
    resetProgress,
  } = useInterviewProgress();

  const handleResumeExtracted = useCallback((resume: ParsedResume | null) => {
    setParsedResume(resume);
  }, []);

  // Load saved role and mode from progress
  useEffect(() => {
    if (progress?.targetRole && !selectedRole) {
      setSelectedRole(progress.targetRole);
    }
    if (progress?.interviewMode && progress.interviewMode in INTERVIEW_MODES) {
      setSelectedMode(progress.interviewMode as InterviewModeId);
    }
  }, [progress, selectedRole]);

  const startInterview = () => {
    setIsStarting(true);

    // Use saved mode if continuing, otherwise use selected mode
    const modeToUse = hasExistingProgress() ? (progress?.interviewMode || selectedMode) : selectedMode;
    const modeConfig = INTERVIEW_MODES[modeToUse];

    // For new progress, start with first round of mode; for existing, get next available
    const nextRound = hasExistingProgress()
      ? (getNextAvailableRound() || modeConfig.rounds[0])
      : modeConfig.rounds[0];

    // Store parsed resume in sessionStorage for the interview page to access
    if (parsedResume) {
      sessionStorage.setItem("parsed_resume", JSON.stringify(parsedResume));
    } else if (progress?.resume) {
      sessionStorage.setItem("parsed_resume", JSON.stringify(progress.resume));
    } else {
      sessionStorage.removeItem("parsed_resume");
    }
    // Store selected role in sessionStorage
    if (selectedRole) {
      sessionStorage.setItem("selected_role", selectedRole);
    } else {
      sessionStorage.removeItem("selected_role");
    }

    // Store the current round and mode
    sessionStorage.setItem("current_round", String(nextRound));
    sessionStorage.setItem("interview_mode", modeToUse);

    const sessionId = crypto.randomUUID();

    // Initialize or update progress with mode
    initProgress(sessionId, selectedRole || "", parsedResume || progress?.resume, modeToUse);

    router.push(`/interview/${sessionId}`);
  };

  const handleReset = () => {
    if (confirm("Are you sure you want to reset all progress? This cannot be undone.")) {
      resetProgress();
      setParsedResume(null);
      setSelectedRole(null);
      setSelectedMode("full");
    }
  };

  const allPassed = hasCompletedAllRounds();
  const nextRound = getNextAvailableRound();

  return (
    <main className="min-h-screen relative overflow-hidden bg-valtric-gradient">
      {/* Neural network mesh background */}
      <div className="absolute inset-0 bg-neural-mesh" />

      {/* Animated neural particles */}
      <NeuralParticles />

      {/* Decorative gradient orbs */}
      <div className="absolute top-20 left-10 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl animate-float-particle" />
      <div className="absolute bottom-32 right-16 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl animate-float-particle stagger-2" />
      <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-teal-400/5 rounded-full blur-3xl animate-float-particle stagger-4" />

      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Header - visible immediately */}
        <header className="px-6 py-5 flex items-center justify-between animate-fade-in-down">
          <div className="flex items-center gap-3">
            <ValtricLogo />
            <div className="flex flex-col">
              <span className="font-body font-semibold text-lg text-teal-900">Valtric</span>
              <span className="text-xs text-teal-600 -mt-0.5">AI for Everyone</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <Link
                  href="/dashboard"
                  className="px-4 py-2.5 text-sm font-medium text-teal-700 hover:text-teal-900 transition-colors"
                >
                  Dashboard
                </Link>
                <button
                  onClick={startInterview}
                  disabled={isStarting}
                  className="px-5 py-2.5 text-sm font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-xl transition-all hover:shadow-lg"
                >
                  Start Interview
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-4 py-2.5 text-sm font-medium text-teal-700 hover:text-teal-900 transition-colors"
                >
                  Sign In
                </Link>
                <button
                  onClick={startInterview}
                  disabled={isStarting}
                  className="px-5 py-2.5 text-sm font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-xl transition-all hover:shadow-lg"
                >
                  Start Interview
                </button>
              </>
            )}
          </div>
        </header>

        {/* Hero */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 pb-32">
          <div className="max-w-3xl text-center">
            {/* Headline with serif font - NO opacity-0 for instant LCP */}
            <h1 className="font-display font-semibold text-5xl md:text-6xl lg:text-7xl text-teal-950 leading-tight">
              <span className="block animate-text-reveal">Practice Interviews</span>
              <span className="block animate-text-reveal stagger-1">That Actually</span>
              <span className="block animate-text-reveal stagger-2 text-teal-600">
                Feel Real.
              </span>
            </h1>

            {/* Subtext - visible immediately for better LCP */}
            <p className="mt-8 text-lg md:text-xl text-teal-700 max-w-xl mx-auto animate-fade-in-up stagger-3">
              AI-powered voice interviews that adapt to your responses.
              Built for everyone, accessible to all.
            </p>

            {/* Role Selector */}
            <div className="mt-10 opacity-0 animate-fade-in-up-opacity stagger-3">
              <p className="text-sm text-teal-600 mb-4">Select your target role</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-2xl mx-auto">
                {CS_ROLES.map((role) => (
                  <RoleCard
                    key={role.id}
                    title={role.title}
                    description={role.description}
                    icon={role.icon}
                    selected={selectedRole === role.title}
                    onClick={() => setSelectedRole(selectedRole === role.title ? null : role.title)}
                  />
                ))}
              </div>
            </div>

            {/* Mode Selector - only show if no existing progress */}
            {!hasExistingProgress() && (
              <div className="mt-8 opacity-0 animate-fade-in-up-opacity stagger-3">
                <p className="text-sm text-teal-600 mb-4">Choose interview type</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-2xl mx-auto">
                  {(Object.keys(INTERVIEW_MODES) as InterviewModeId[]).map((modeId) => {
                    const mode = INTERVIEW_MODES[modeId];
                    return (
                      <ModeCard
                        key={modeId}
                        modeId={modeId}
                        title={mode.title}
                        description={mode.description}
                        roundCount={mode.rounds.length}
                        selected={selectedMode === modeId}
                        onClick={() => setSelectedMode(modeId)}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* Resume Upload - only show if no existing progress */}
            {!hasExistingProgress() && (
              <div className="mt-8 opacity-0 animate-fade-in-up-opacity stagger-3">
                <ResumeUpload onResumeExtracted={handleResumeExtracted} />
              </div>
            )}

            {/* Progress Tracker - show if there's existing progress */}
            {isLoaded && hasExistingProgress() && (
              <div className="mt-8 opacity-0 animate-fade-in-up-opacity stagger-3">
                <RoundProgressTracker
                  progress={progress}
                  allPassed={allPassed}
                />
              </div>
            )}

            {/* CTA */}
            <div className="mt-8 flex flex-col items-center gap-4 animate-scale-in stagger-4">
              {allPassed ? (
                // All rounds passed - celebration!
                <div className="text-center">
                  <div className="text-4xl mb-4">🎉</div>
                  <h3 className="font-display font-semibold text-2xl text-teal-900 mb-2">
                    Congratulations!
                  </h3>
                  <p className="text-teal-600 mb-6">
                    You&apos;ve passed all interview rounds. You got the job!
                  </p>
                  <button
                    onClick={handleReset}
                    className="px-6 py-3 bg-teal-700 hover:bg-teal-800 text-white rounded-xl font-body font-semibold transition-all hover:shadow-lg"
                  >
                    Start New Interview
                  </button>
                </div>
              ) : (
                <>
                  <button
                    onClick={startInterview}
                    disabled={isStarting}
                    className={`
                      group relative px-8 py-4 rounded-xl font-body font-semibold text-lg
                      transition-all duration-300 ease-out
                      ${
                        isStarting
                          ? "bg-teal-400 text-white cursor-wait"
                          : "bg-teal-700 text-white hover:bg-teal-800 hover:shadow-glow-teal hover:-translate-y-0.5 active:scale-[0.98]"
                      }
                    `}
                  >
                    <span className="relative z-10 flex items-center gap-2">
                      {isStarting ? (
                        <>
                          <Spinner />
                          Starting...
                        </>
                      ) : hasExistingProgress() ? (
                        <>
                          Continue to Round {nextRound}
                          <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                        </>
                      ) : (
                        <>
                          Begin Practice Session
                          <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                        </>
                      )}
                    </span>
                  </button>

                  {hasExistingProgress() && (
                    <button
                      onClick={handleReset}
                      className="text-sm text-teal-500 hover:text-teal-700 underline transition-colors"
                    >
                      Reset Progress
                    </button>
                  )}

                  <p className="text-sm text-teal-600">
                    {hasExistingProgress()
                      ? `Round ${nextRound} of 3`
                      : "No signup required. Just start talking."}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="px-6 pb-20">
          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FeatureCard
                icon={<MicIcon />}
                title="Voice First"
                description="Natural conversation with an AI interviewer. Hold the button and speak — just like a real call."
                delay="stagger-4"
              />
              <FeatureCard
                icon={<ZapIcon />}
                title="Real-Time"
                description="Get immediate responses. No waiting for scheduling or delayed feedback."
                delay="stagger-5"
              />
              <FeatureCard
                icon={<BrainIcon />}
                title="Adaptive AI"
                description="The interviewer follows up on your answers and adapts to keep the conversation natural."
                delay="stagger-6"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="px-6 py-6 border-t border-teal-200/50">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ValtricLogoSmall />
              <span className="text-sm text-teal-600">Built by Valtric</span>
            </div>
            <p className="text-sm text-teal-500">AI for Everyone</p>
          </div>
        </footer>
      </div>
    </main>
  );
}

function FeatureCard({
  icon,
  title,
  description,
  delay,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  delay: string;
}) {
  return (
    <div className={`animate-fade-in-up ${delay}`}>
      <div className="group p-6 rounded-2xl bg-white/70 hover:bg-white border border-teal-100 shadow-card hover:shadow-card-hover transition-all duration-300">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-100 to-teal-50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
          {icon}
        </div>
        <h3 className="font-display font-semibold text-xl text-teal-900 mb-2">{title}</h3>
        <p className="text-teal-600 text-sm leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

function RoleCard({
  title,
  description,
  icon,
  selected,
  onClick,
}: {
  title: string;
  description: string;
  icon: string;
  selected: boolean;
  onClick: () => void;
}) {
  const IconComponent = {
    code: CodeIcon,
    layout: LayoutIcon,
    server: ServerIcon,
    layers: LayersIcon,
  }[icon] || CodeIcon;

  return (
    <button
      onClick={onClick}
      className={`
        p-4 rounded-xl text-left transition-all duration-200
        ${
          selected
            ? "bg-teal-50 border-2 border-teal-500 shadow-md"
            : "bg-white/70 border border-teal-100 hover:bg-white hover:border-teal-200 hover:shadow-sm"
        }
      `}
    >
      <div
        className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${
          selected ? "bg-teal-500" : "bg-teal-100"
        }`}
      >
        <IconComponent className={`w-4 h-4 ${selected ? "text-white" : "text-teal-600"}`} />
      </div>
      <h4 className={`font-medium text-sm ${selected ? "text-teal-900" : "text-teal-800"}`}>
        {title}
      </h4>
      <p className="text-xs text-teal-500 mt-0.5 line-clamp-2">{description}</p>
    </button>
  );
}

function ModeCard({
  modeId,
  title,
  description,
  roundCount,
  selected,
  onClick,
}: {
  modeId: InterviewModeId;
  title: string;
  description: string;
  roundCount: number;
  selected: boolean;
  onClick: () => void;
}) {
  const IconComponent = {
    full: FullInterviewIcon,
    behavioral: ChatIcon,
    coding: TerminalIcon,
    system_design: DiagramIcon,
  }[modeId] || FullInterviewIcon;

  return (
    <button
      onClick={onClick}
      className={`
        p-4 rounded-xl text-left transition-all duration-200
        ${
          selected
            ? "bg-teal-50 border-2 border-teal-500 shadow-md"
            : "bg-white/70 border border-teal-100 hover:bg-white hover:border-teal-200 hover:shadow-sm"
        }
      `}
    >
      <div
        className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${
          selected ? "bg-teal-500" : "bg-teal-100"
        }`}
      >
        <IconComponent className={`w-4 h-4 ${selected ? "text-white" : "text-teal-600"}`} />
      </div>
      <h4 className={`font-medium text-sm ${selected ? "text-teal-900" : "text-teal-800"}`}>
        {title}
      </h4>
      <p className="text-xs text-teal-500 mt-0.5">{description}</p>
      <p className="text-xs text-teal-400 mt-1">
        {roundCount === 1 ? "1 round" : `${roundCount} rounds`}
      </p>
    </button>
  );
}

function ValtricLogo() {
  return (
    <div className="w-11 h-11 rounded-xl bg-teal-700 flex items-center justify-center shadow-md">
      <span className="text-white font-display font-semibold text-xl">V</span>
    </div>
  );
}

function ValtricLogoSmall() {
  return (
    <div className="w-6 h-6 rounded-md bg-teal-700 flex items-center justify-center">
      <span className="text-white font-display font-semibold text-xs">V</span>
    </div>
  );
}

function NeuralParticles() {
  // Generate positions for neural network nodes
  const nodes = [
    { x: 15, y: 20, delay: 0 },
    { x: 85, y: 15, delay: 0.5 },
    { x: 25, y: 75, delay: 1 },
    { x: 70, y: 60, delay: 1.5 },
    { x: 50, y: 40, delay: 2 },
    { x: 90, y: 80, delay: 0.3 },
    { x: 10, y: 50, delay: 0.8 },
    { x: 60, y: 25, delay: 1.2 },
  ];

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {nodes.map((node, i) => (
        <div
          key={i}
          className="absolute w-2 h-2 rounded-full bg-cyan-500/40 animate-glow-pulse"
          style={{
            left: `${node.x}%`,
            top: `${node.y}%`,
            animationDelay: `${node.delay}s`,
          }}
        />
      ))}
      {/* Neural connection lines */}
      <svg className="absolute inset-0 w-full h-full opacity-20">
        <line x1="15%" y1="20%" x2="50%" y2="40%" stroke="#00CED1" strokeWidth="1" />
        <line x1="85%" y1="15%" x2="50%" y2="40%" stroke="#00CED1" strokeWidth="1" />
        <line x1="50%" y1="40%" x2="70%" y2="60%" stroke="#00CED1" strokeWidth="1" />
        <line x1="25%" y1="75%" x2="50%" y2="40%" stroke="#00CED1" strokeWidth="1" />
        <line x1="70%" y1="60%" x2="90%" y2="80%" stroke="#00CED1" strokeWidth="1" />
        <line x1="10%" y1="50%" x2="25%" y2="75%" stroke="#00CED1" strokeWidth="1" />
        <line x1="60%" y1="25%" x2="85%" y2="15%" stroke="#00CED1" strokeWidth="1" />
      </svg>
    </div>
  );
}

function ArrowRight({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

function MicIcon() {
  return (
    <svg className="w-6 h-6 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
    </svg>
  );
}

function ZapIcon() {
  return (
    <svg className="w-6 h-6 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
    </svg>
  );
}

function BrainIcon() {
  return (
    <svg className="w-6 h-6 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
    </svg>
  );
}

function CodeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
    </svg>
  );
}

function LayoutIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 7.125C2.25 6.504 2.754 6 3.375 6h6c.621 0 1.125.504 1.125 1.125v3.75c0 .621-.504 1.125-1.125 1.125h-6a1.125 1.125 0 01-1.125-1.125v-3.75zM14.25 8.625c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125v8.25c0 .621-.504 1.125-1.125 1.125h-5.25a1.125 1.125 0 01-1.125-1.125v-8.25zM3.75 16.125c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125v2.25c0 .621-.504 1.125-1.125 1.125h-5.25a1.125 1.125 0 01-1.125-1.125v-2.25z" />
    </svg>
  );
}

function ServerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3m3 3a3 3 0 100 6h13.5a3 3 0 100-6m-16.5-3a3 3 0 013-3h13.5a3 3 0 013 3m-19.5 0a4.5 4.5 0 01.9-2.7L5.737 5.1a3.375 3.375 0 012.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 01.9 2.7m0 0a3 3 0 01-3 3m0 3h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008zm-3 6h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008z" />
    </svg>
  );
}

function LayersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.429 9.75L2.25 12l4.179 2.25m0-4.5l5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L21.75 12l-4.179 2.25m0 0l4.179 2.25L12 21.75 2.25 16.5l4.179-2.25m11.142 0l-5.571 3-5.571-3" />
    </svg>
  );
}

function RoundProgressTracker({
  progress,
  allPassed,
}: {
  progress: ReturnType<typeof useInterviewProgress>["progress"];
  allPassed: boolean;
}) {
  if (!progress) return null;

  const modeConfig = INTERVIEW_MODES[progress.interviewMode || "full"];
  const modeRounds = INTERVIEW_ROUNDS.filter((r) =>
    modeConfig.rounds.includes(r.round as 1 | 2 | 3)
  );

  return (
    <div className="w-full max-w-xl mx-auto p-6 rounded-2xl bg-white/80 border border-teal-100 shadow-card">
      <h3 className="font-display font-semibold text-lg text-teal-900 mb-4 text-center">
        Your Interview Progress
      </h3>
      <p className="text-sm text-teal-500 text-center mb-4">{modeConfig.title}</p>
      <div className="space-y-3">
        {modeRounds.map((round, index) => {
          const roundProgress = progress.rounds[round.round];
          const status = roundProgress?.status || "locked";
          const score = roundProgress?.score;

          return (
            <RoundProgressItem
              key={round.round}
              round={modeRounds.length > 1 ? index + 1 : 0}
              title={round.title}
              status={status}
              score={score}
              showRoundNumber={modeRounds.length > 1}
            />
          );
        })}
      </div>
      {allPassed && (
        <div className="mt-4 pt-4 border-t border-teal-100 text-center">
          <span className="text-teal-600 font-medium">All rounds completed!</span>
        </div>
      )}
    </div>
  );
}

function RoundProgressItem({
  round,
  title,
  status,
  score,
  showRoundNumber = true,
}: {
  round: number;
  title: string;
  status: RoundStatus;
  score?: number;
  showRoundNumber?: boolean;
}) {
  const getStatusIcon = () => {
    switch (status) {
      case "passed":
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case "failed":
        return <XCircleIcon className="w-5 h-5 text-red-500" />;
      case "in_progress":
        return <PlayCircleIcon className="w-5 h-5 text-teal-500" />;
      case "locked":
      default:
        return <LockIcon className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case "passed":
        return `${score}% PASSED`;
      case "failed":
        return `${score}% FAILED`;
      case "in_progress":
        return "READY";
      case "locked":
      default:
        return "LOCKED";
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case "passed":
        return "text-green-600 bg-green-50";
      case "failed":
        return "text-red-600 bg-red-50";
      case "in_progress":
        return "text-teal-600 bg-teal-50";
      case "locked":
      default:
        return "text-gray-500 bg-gray-50";
    }
  };

  return (
    <div
      className={`flex items-center justify-between p-3 rounded-xl border ${
        status === "locked"
          ? "border-gray-200 bg-gray-50/50"
          : "border-teal-100 bg-white"
      }`}
    >
      <div className="flex items-center gap-3">
        {getStatusIcon()}
        <div>
          {showRoundNumber && <span className="font-medium text-teal-900">Round {round}: </span>}
          <span className={showRoundNumber ? "text-teal-600" : "font-medium text-teal-900"}>{title}</span>
        </div>
      </div>
      <span
        className={`text-xs font-semibold px-2 py-1 rounded-full ${getStatusColor()}`}
      >
        {getStatusText()}
      </span>
    </div>
  );
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function XCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function PlayCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.91 11.672a.375.375 0 010 .656l-5.603 3.113a.375.375 0 01-.557-.328V8.887c0-.286.307-.466.557-.327l5.603 3.112z" />
    </svg>
  );
}

function LockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
    </svg>
  );
}

// Mode selector icons
function FullInterviewIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    </svg>
  );
}

function ChatIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
    </svg>
  );
}

function TerminalIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z" />
    </svg>
  );
}

function DiagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />
    </svg>
  );
}
