"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { ResumeUpload } from "@/components/ResumeUpload";
import { ParsedResume } from "@/lib/api";

export default function Home() {
  const router = useRouter();
  const [isStarting, setIsStarting] = useState(false);
  const [parsedResume, setParsedResume] = useState<ParsedResume | null>(null);

  const handleResumeExtracted = useCallback((resume: ParsedResume | null) => {
    setParsedResume(resume);
  }, []);

  const startInterview = () => {
    setIsStarting(true);
    // Store parsed resume in sessionStorage for the interview page to access
    if (parsedResume) {
      sessionStorage.setItem("parsed_resume", JSON.stringify(parsedResume));
    } else {
      sessionStorage.removeItem("parsed_resume");
    }
    const sessionId = crypto.randomUUID();
    router.push(`/interview/${sessionId}`);
  };

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
        {/* Header */}
        <header className="px-6 py-5 flex items-center justify-between opacity-0 animate-fade-in-down">
          <div className="flex items-center gap-3">
            <ValtricLogo />
            <div className="flex flex-col">
              <span className="font-body font-semibold text-lg text-teal-900">Valtric</span>
              <span className="text-xs text-teal-600 -mt-0.5">AI for Everyone</span>
            </div>
          </div>
          <button
            onClick={startInterview}
            disabled={isStarting}
            className="px-5 py-2.5 text-sm font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-xl transition-all hover:shadow-lg"
          >
            Start Interview
          </button>
        </header>

        {/* Hero */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 pb-32">
          <div className="max-w-3xl text-center">
            {/* Headline with serif font */}
            <h1 className="font-display font-semibold text-5xl md:text-6xl lg:text-7xl text-teal-950 leading-tight">
              <span className="block opacity-0 animate-text-reveal">Practice Interviews</span>
              <span className="block opacity-0 animate-text-reveal stagger-1">That Actually</span>
              <span className="block opacity-0 animate-text-reveal stagger-2 text-teal-600">
                Feel Real.
              </span>
            </h1>

            {/* Subtext */}
            <p className="mt-8 text-lg md:text-xl text-teal-700 max-w-xl mx-auto opacity-0 animate-fade-in-up stagger-3">
              AI-powered voice interviews that adapt to your responses.
              Built for everyone, accessible to all.
            </p>

            {/* Resume Upload */}
            <div className="mt-10 opacity-0 animate-fade-in-up stagger-3">
              <ResumeUpload onResumeExtracted={handleResumeExtracted} />
            </div>

            {/* CTA */}
            <div className="mt-8 flex flex-col items-center gap-4 opacity-0 animate-scale-in stagger-4">
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
                  ) : (
                    <>
                      Begin Practice Session
                      <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </span>
              </button>

              <p className="text-sm text-teal-600">
                No signup required. Just start talking.
              </p>
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
    <div className={`opacity-0 animate-fade-in-up ${delay}`}>
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
