interface DataPoint {
  date: string;
  score: number;
  round: number;
}

interface ScoreTrendChartProps {
  data: DataPoint[];
}

export function ScoreTrendChart({ data }: ScoreTrendChartProps) {
  if (data.length === 0) {
    return (
      <div className="bg-white/80 border border-teal-100 rounded-xl p-6 shadow-card">
        <h3 className="font-display font-semibold text-lg text-teal-900 mb-4">Score Trend</h3>
        <p className="text-teal-500 text-sm">Complete some interviews to see your score trend.</p>
      </div>
    );
  }

  const maxScore = 100;
  const width = 600;
  const height = 200;
  const padding = { top: 20, right: 20, bottom: 30, left: 40 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const xStep = data.length > 1 ? chartW / (data.length - 1) : chartW / 2;

  const points = data.map((d, i) => ({
    x: padding.left + i * xStep,
    y: padding.top + chartH - (d.score / maxScore) * chartH,
    score: d.score,
  }));

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  return (
    <div className="bg-white/80 border border-teal-100 rounded-xl p-6 shadow-card">
      <h3 className="font-display font-semibold text-lg text-teal-900 mb-4">Score Trend</h3>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
        {/* Y-axis labels */}
        {[0, 25, 50, 75, 100].map((v) => {
          const y = padding.top + chartH - (v / maxScore) * chartH;
          return (
            <g key={v}>
              <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#e2e8f0" strokeWidth="1" />
              <text x={padding.left - 8} y={y + 4} textAnchor="end" fill="#94a3b8" fontSize="11">{v}</text>
            </g>
          );
        })}

        {/* Pass threshold line */}
        <line
          x1={padding.left}
          y1={padding.top + chartH - (70 / maxScore) * chartH}
          x2={width - padding.right}
          y2={padding.top + chartH - (70 / maxScore) * chartH}
          stroke="#22c55e"
          strokeWidth="1"
          strokeDasharray="4 4"
        />

        {/* Line */}
        <path d={linePath} fill="none" stroke="#0d9488" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

        {/* Points */}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="4" fill="#0d9488" stroke="white" strokeWidth="2" />
            <text x={p.x} y={p.y - 10} textAnchor="middle" fill="#0d9488" fontSize="10" fontWeight="600">
              {p.score}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
