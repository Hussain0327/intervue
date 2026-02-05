interface SummaryCardsProps {
  totalSessions: number;
  avgScore: number | null;
  passRate: number | null;
  totalEvaluations: number;
}

export function SummaryCards({ totalSessions, avgScore, passRate, totalEvaluations }: SummaryCardsProps) {
  const cards = [
    { label: "Total Sessions", value: totalSessions, color: "text-teal-700" },
    { label: "Avg Score", value: avgScore !== null ? `${avgScore}%` : "—", color: "text-teal-700" },
    { label: "Pass Rate", value: passRate !== null ? `${passRate}%` : "—", color: passRate && passRate >= 70 ? "text-green-600" : "text-teal-700" },
    { label: "Evaluations", value: totalEvaluations, color: "text-teal-700" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="bg-white/80 border border-teal-100 rounded-xl p-5 shadow-card"
        >
          <p className="text-sm text-teal-500 mb-1">{card.label}</p>
          <p className={`text-2xl font-semibold ${card.color}`}>{card.value}</p>
        </div>
      ))}
    </div>
  );
}
