"use client";

import { getRubricForRound } from "@/lib/rubricConfig";

interface RubricPanelProps {
  roundType: "behavioral" | "coding" | "system_design";
  score?: number | null;
}

export function RubricPanel({ roundType, score }: RubricPanelProps) {
  const rubric = getRubricForRound(roundType);

  return (
    <div className="flex flex-col h-full overflow-y-auto custom-scrollbar">
      {/* Header */}
      <div className="px-4 py-3 border-b border-teal-100 bg-teal-50/30">
        <h3 className="text-sm font-medium text-teal-800">
          Evaluation Criteria
        </h3>
        <p className="text-xs text-teal-500 mt-0.5">
          {formatRoundType(roundType)} Round
        </p>
      </div>

      {/* Score display (if available) */}
      {score !== undefined && score !== null && (
        <div className="px-4 py-4 border-b border-teal-100 bg-gradient-to-r from-teal-50 to-cyan-50">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-teal-700">Total Score</span>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-display font-bold text-teal-800">
                {Math.round(score)}
              </div>
              <span className="text-sm text-teal-500">/100</span>
            </div>
          </div>
          <ScoreBar score={score} />
        </div>
      )}

      {/* Dimensions */}
      <div className="flex-1 p-4 space-y-4">
        {rubric.dimensions.map((dimension) => (
          <DimensionCard key={dimension.id} dimension={dimension} />
        ))}
      </div>

      {/* Note */}
      <div className="px-4 py-3 border-t border-teal-100 bg-gray-50">
        <p className="text-xs text-gray-500 italic">
          Note: Individual dimension scores are not provided. The total score reflects overall performance across all criteria.
        </p>
      </div>
    </div>
  );
}

interface DimensionCardProps {
  dimension: {
    id: string;
    name: string;
    description: string;
    weight: number;
  };
}

function DimensionCard({ dimension }: DimensionCardProps) {
  return (
    <div className="p-3 rounded-lg border border-teal-200/50 bg-white/50 hover:bg-white/80 transition-colors">
      <div className="flex items-start justify-between mb-1">
        <h4 className="text-sm font-medium text-teal-800">
          {dimension.name}
        </h4>
        <span className="text-xs px-2 py-0.5 rounded-full bg-teal-100 text-teal-600 font-medium">
          {dimension.weight}%
        </span>
      </div>
      <p className="text-xs text-teal-600 leading-relaxed">
        {dimension.description}
      </p>
    </div>
  );
}

function ScoreBar({ score }: { score: number }) {
  const percentage = Math.min(100, Math.max(0, score));
  const barColor = score >= 70 ? "bg-green-500" : score >= 50 ? "bg-amber-500" : "bg-red-500";

  return (
    <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
      <div
        className={`h-full ${barColor} transition-all duration-500 ease-out`}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}

function formatRoundType(type: string): string {
  return type
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
