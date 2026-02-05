"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/AuthProvider";
import { apiFetch } from "@/lib/apiClient";

interface TranscriptEntry {
  role: string;
  content: string;
  sequence: number;
}

interface EvaluationEntry {
  round: number;
  score: number;
  passed: boolean;
  feedback: string | null;
}

interface CodeSubmissionEntry {
  problem_id: string;
  language: string;
  correct: boolean | null;
  score: number | null;
  feedback: string | null;
}

interface SessionDetail {
  id: string;
  interview_type: string;
  interview_mode: string;
  difficulty: string;
  current_round: number;
  phase: string;
  target_role: string | null;
  started_at: string | null;
  ended_at: string | null;
  transcripts: TranscriptEntry[];
  evaluations: EvaluationEntry[];
  code_submissions: CodeSubmissionEntry[];
}

export default function SessionDetailPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [session, setSession] = useState<SessionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user || !sessionId) return;
    apiFetch<SessionDetail>(`/sessions/${sessionId}`)
      .then(setSession)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [user, sessionId]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-valtric-gradient flex items-center justify-center">
        <div className="animate-pulse text-teal-600">Loading...</div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-valtric-gradient flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || "Session not found"}</p>
          <Link href="/dashboard" className="text-teal-600 hover:underline">Back to Dashboard</Link>
        </div>
      </div>
    );
  }

  const roundLabel: Record<number, string> = {
    1: "Behavioral",
    2: "Coding",
    3: "System Design",
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleString();
  };

  return (
    <div className="min-h-screen bg-valtric-gradient">
      <header className="px-6 py-5 flex items-center gap-4 border-b border-teal-100/50 bg-white/50 backdrop-blur">
        <Link href="/dashboard" className="text-teal-600 hover:text-teal-800">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <span className="font-body font-semibold text-teal-900">
          Session Detail — {roundLabel[session.current_round] || `Round ${session.current_round}`}
        </span>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* Meta */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white/80 border border-teal-100 rounded-xl p-4">
            <p className="text-xs text-teal-500">Mode</p>
            <p className="font-medium text-teal-800 capitalize">{session.interview_mode}</p>
          </div>
          <div className="bg-white/80 border border-teal-100 rounded-xl p-4">
            <p className="text-xs text-teal-500">Difficulty</p>
            <p className="font-medium text-teal-800 capitalize">{session.difficulty}</p>
          </div>
          <div className="bg-white/80 border border-teal-100 rounded-xl p-4">
            <p className="text-xs text-teal-500">Started</p>
            <p className="font-medium text-teal-800 text-sm">{formatDate(session.started_at)}</p>
          </div>
          <div className="bg-white/80 border border-teal-100 rounded-xl p-4">
            <p className="text-xs text-teal-500">Role</p>
            <p className="font-medium text-teal-800">{session.target_role || "—"}</p>
          </div>
        </div>

        {/* Evaluations */}
        {session.evaluations.length > 0 && (
          <div className="bg-white/80 border border-teal-100 rounded-xl p-6 shadow-card">
            <h3 className="font-display font-semibold text-lg text-teal-900 mb-4">Evaluations</h3>
            <div className="space-y-4">
              {session.evaluations.map((ev, i) => (
                <div key={i} className={`p-4 rounded-xl border ${ev.passed ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`text-lg font-semibold ${ev.passed ? "text-green-700" : "text-red-700"}`}>
                      {Math.round(ev.score)}%
                    </span>
                    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${ev.passed ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                      {ev.passed ? "PASSED" : "FAILED"}
                    </span>
                  </div>
                  {ev.feedback && <p className="text-sm text-gray-700">{ev.feedback}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Transcript */}
        {session.transcripts.length > 0 && (
          <div className="bg-white/80 border border-teal-100 rounded-xl p-6 shadow-card">
            <h3 className="font-display font-semibold text-lg text-teal-900 mb-4">Transcript</h3>
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {session.transcripts.map((t, i) => (
                <div key={i} className={`flex ${t.role === "candidate" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] px-4 py-2.5 rounded-xl text-sm ${
                    t.role === "candidate"
                      ? "bg-teal-600 text-white"
                      : "bg-gray-100 text-gray-800"
                  }`}>
                    <p className="text-xs opacity-70 mb-1 capitalize">{t.role}</p>
                    <p className="whitespace-pre-wrap">{t.content}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Code Submissions */}
        {session.code_submissions.length > 0 && (
          <div className="bg-white/80 border border-teal-100 rounded-xl p-6 shadow-card">
            <h3 className="font-display font-semibold text-lg text-teal-900 mb-4">Code Submissions</h3>
            <div className="space-y-4">
              {session.code_submissions.map((cs, i) => (
                <div key={i} className="p-4 rounded-xl border border-teal-100 bg-teal-50/30">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium text-teal-800">{cs.problem_id}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-teal-100 text-teal-600">{cs.language}</span>
                    {cs.correct !== null && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${cs.correct ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                        {cs.correct ? "Correct" : "Incorrect"}
                      </span>
                    )}
                    {cs.score !== null && (
                      <span className="text-xs text-teal-600">{Math.round(cs.score)}%</span>
                    )}
                  </div>
                  {cs.feedback && <p className="text-sm text-gray-700">{cs.feedback}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
