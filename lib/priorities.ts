export type PriorityScore = {
  urgency: 1 | 2 | 3 | 4 | 5;
  revenueImpact: 1 | 2 | 3 | 4 | 5;
  strategicValue: 1 | 2 | 3 | 4 | 5;
  familyImpact: 1 | 2 | 3 | 4 | 5;
  energyCost: 1 | 2 | 3 | 4 | 5;
};

export function calculatePriorityScore(scores: PriorityScore): number {
  return scores.urgency + scores.revenueImpact + scores.strategicValue + scores.familyImpact - scores.energyCost;
}

export function getPriorityLevel(score: number): "critical" | "high" | "normal" | "low" {
  if (score >= 15) return "critical";
  if (score >= 12) return "high";
  if (score >= 8) return "normal";
  return "low";
}

export function getPriorityColor(level: string): string {
  switch (level) {
    case "critical": return "bg-red-500/20 text-red-400 border-red-500/30";
    case "high": return "bg-orange-500/20 text-orange-400 border-orange-500/30";
    case "normal": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    default: return "bg-gray-500/20 text-gray-400 border-gray-500/30";
  }
}
