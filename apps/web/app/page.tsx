"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function Home() {
  const router = useRouter();
  const [isStarting, setIsStarting] = useState(false);

  const startInterview = () => {
    setIsStarting(true);
    // Generate a random session ID
    const sessionId = crypto.randomUUID();
    router.push(`/interview/${sessionId}`);
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="max-w-2xl text-center">
        <h1 className="text-5xl font-bold mb-6 text-gray-900">
          Intervue
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Practice your interview skills with our AI-powered voice interviewer.
          Get real-time feedback and improve your responses.
        </p>

        <div className="flex flex-col gap-4 items-center">
          <button
            onClick={startInterview}
            disabled={isStarting}
            className={`
              px-8 py-4 rounded-xl text-lg font-semibold
              transition-all duration-200
              ${
                isStarting
                  ? "bg-gray-400 cursor-wait"
                  : "bg-blue-500 hover:bg-blue-600 active:scale-95"
              }
              text-white shadow-lg hover:shadow-xl
            `}
          >
            {isStarting ? "Starting..." : "Start Practice Interview"}
          </button>

          <p className="text-sm text-gray-500">
            No sign-up required. Just click and start talking.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          <FeatureCard
            title="Voice-First"
            description="Natural conversation with an AI interviewer. Just hold the button and speak."
          />
          <FeatureCard
            title="Real-Time"
            description="Get immediate responses. No waiting for feedback or scheduling calls."
          />
          <FeatureCard
            title="Adaptive"
            description="The interviewer follows up on your answers and adapts to your responses."
          />
        </div>
      </div>
    </main>
  );
}

function FeatureCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="p-6 rounded-xl bg-white shadow-md">
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 text-sm">{description}</p>
    </div>
  );
}
