interface StrengthData {
  round_type: string;
  avg_score: number;
  count: number;
}

interface StrengthsChartProps {
  data: StrengthData[];
}

export function StrengthsChart({ data }: StrengthsChartProps) {
  if (data.length === 0) {
    return (
      <div className="bg-white/80 border border-teal-100 rounded-xl p-6 shadow-card">
        <h3 className="font-display font-semibold text-lg text-teal-900 mb-4">Strengths by Round</h3>
        <p className="text-teal-500 text-sm">Complete some interviews to see your strengths.</p>
      </div>
    );
  }

  const maxScore = 100;

  return (
    <div className="bg-white/80 border border-teal-100 rounded-xl p-6 shadow-card">
      <h3 className="font-display font-semibold text-lg text-teal-900 mb-4">Strengths by Round</h3>
      <div className="space-y-4">
        {data.map((item) => {
          const pct = (item.avg_score / maxScore) * 100;
          const color = item.avg_score >= 70 ? "bg-green-500" : item.avg_score >= 50 ? "bg-yellow-500" : "bg-red-500";
          return (
            <div key={item.round_type}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-teal-800 font-medium">{item.round_type}</span>
                <span className="text-teal-600">{item.avg_score}% ({item.count} sessions)</span>
              </div>
              <div className="h-3 bg-teal-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
