"use client";

import { useState } from "react";
import Link from "next/link";

interface SessionItem {
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

interface SessionHistoryTableProps {
  sessions: SessionItem[];
  total: number;
  limit: number;
  offset: number;
  onPageChange: (newOffset: number) => void;
}

export function SessionHistoryTable({ sessions, total, limit, offset, onPageChange }: SessionHistoryTableProps) {
  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  const formatDate = (iso: string | null) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const roundLabel: Record<number, string> = {
    1: "Behavioral",
    2: "Coding",
    3: "System Design",
  };

  if (sessions.length === 0) {
    return (
      <div className="bg-white/80 border border-teal-100 rounded-xl p-6 shadow-card">
        <h3 className="font-display font-semibold text-lg text-teal-900 mb-4">Session History</h3>
        <p className="text-teal-500 text-sm">No interview sessions yet. Start your first interview!</p>
      </div>
    );
  }

  return (
    <div className="bg-white/80 border border-teal-100 rounded-xl shadow-card overflow-hidden">
      <div className="p-6 pb-4">
        <h3 className="font-display font-semibold text-lg text-teal-900">Session History</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-t border-b border-teal-100 bg-teal-50/50">
              <th className="px-6 py-3 text-left text-teal-600 font-medium">Date</th>
              <th className="px-6 py-3 text-left text-teal-600 font-medium">Type</th>
              <th className="px-6 py-3 text-left text-teal-600 font-medium">Round</th>
              <th className="px-6 py-3 text-left text-teal-600 font-medium">Role</th>
              <th className="px-6 py-3 text-left text-teal-600 font-medium">Score</th>
              <th className="px-6 py-3 text-left text-teal-600 font-medium">Result</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s) => (
              <tr key={s.id} className="border-b border-teal-50 hover:bg-teal-50/30 transition-colors">
                <td className="px-6 py-3 text-teal-800">
                  <Link href={`/dashboard/session/${s.id}`} className="hover:text-teal-600 hover:underline">
                    {formatDate(s.started_at)}
                  </Link>
                </td>
                <td className="px-6 py-3 text-teal-700 capitalize">{s.interview_mode}</td>
                <td className="px-6 py-3 text-teal-700">{roundLabel[s.current_round] || `Round ${s.current_round}`}</td>
                <td className="px-6 py-3 text-teal-700">{s.target_role || "—"}</td>
                <td className="px-6 py-3 text-teal-800 font-medium">
                  {s.score !== null ? `${Math.round(s.score)}%` : "—"}
                </td>
                <td className="px-6 py-3">
                  {s.passed === true && (
                    <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-green-100 text-green-700">PASSED</span>
                  )}
                  {s.passed === false && (
                    <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-red-100 text-red-700">FAILED</span>
                  )}
                  {s.passed === null && (
                    <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-gray-100 text-gray-500">N/A</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-6 py-4 border-t border-teal-100">
          <span className="text-sm text-teal-500">
            Page {currentPage} of {totalPages} ({total} total)
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => onPageChange(Math.max(0, offset - limit))}
              disabled={offset === 0}
              className="px-3 py-1.5 text-sm rounded-lg border border-teal-200 text-teal-700 hover:bg-teal-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => onPageChange(offset + limit)}
              disabled={offset + limit >= total}
              className="px-3 py-1.5 text-sm rounded-lg border border-teal-200 text-teal-700 hover:bg-teal-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
