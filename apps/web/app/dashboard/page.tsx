"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/AuthProvider";
import { apiFetch } from "@/lib/apiClient";
import { SummaryCards } from "@/components/dashboard/SummaryCards";
import { ScoreTrendChart } from "@/components/dashboard/ScoreTrendChart";
import { StrengthsChart } from "@/components/dashboard/StrengthsChart";
import { SessionHistoryTable } from "@/components/dashboard/SessionHistoryTable";

interface Summary {
  total_sessions: number;
  avg_score: number | null;
  pass_rate: number | null;
  total_evaluations: number;
}

interface HistorySession {
  id: string;
  interview_type: string;
  interview_mode: string;
  current_round: number;
  target_role: string | null;
  started_at: string | null;
  ended_at: string | null;
  score: number | null;
  passed: boolean | null;
}

interface ScoreTrend {
  date: string;
  score: number;
  round: number;
}

interface Strength {
  round_type: string;
  avg_score: number;
  count: number;
}

export default function DashboardPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [summary, setSummary] = useState<Summary | null>(null);
  const [history, setHistory] = useState<HistorySession[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyOffset, setHistoryOffset] = useState(0);
  const [scoreTrend, setScoreTrend] = useState<ScoreTrend[]>([]);
  const [strengths, setStrengths] = useState<Strength[]>([]);
  const [loading, setLoading] = useState(true);

  const LIMIT = 10;

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (!user) return;

    setLoading(true);
    Promise.all([
      apiFetch<Summary>("/dashboard/summary"),
      apiFetch<{ sessions: HistorySession[]; total: number }>(`/dashboard/history?limit=${LIMIT}&offset=${historyOffset}`),
      apiFetch<ScoreTrend[]>("/dashboard/score-trend"),
      apiFetch<Strength[]>("/dashboard/strengths"),
    ])
      .then(([sum, hist, trend, str]) => {
        setSummary(sum);
        setHistory(hist.sessions);
        setHistoryTotal(hist.total);
        setScoreTrend(trend);
        setStrengths(str);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user, historyOffset]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-valtric-gradient flex items-center justify-center">
        <div className="animate-pulse text-teal-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-valtric-gradient">
      <header className="px-6 py-5 flex items-center justify-between border-b border-teal-100/50 bg-white/50 backdrop-blur">
        <div className="flex items-center gap-3">
          <Link href="/">
            <div className="w-9 h-9 rounded-lg bg-teal-700 flex items-center justify-center shadow-sm">
              <span className="text-white font-display font-semibold text-lg">V</span>
            </div>
          </Link>
          <span className="font-body font-semibold text-teal-900">Dashboard</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-teal-600">{user.full_name || user.email}</span>
          <Link
            href="/"
            className="px-4 py-2 text-sm font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-all"
          >
            Start Interview
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-white/50 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {summary && (
              <SummaryCards
                totalSessions={summary.total_sessions}
                avgScore={summary.avg_score}
                passRate={summary.pass_rate}
                totalEvaluations={summary.total_evaluations}
              />
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ScoreTrendChart data={scoreTrend} />
              <StrengthsChart data={strengths} />
            </div>

            <SessionHistoryTable
              sessions={history}
              total={historyTotal}
              limit={LIMIT}
              offset={historyOffset}
              onPageChange={setHistoryOffset}
            />
          </>
        )}
      </main>
    </div>
  );
}
