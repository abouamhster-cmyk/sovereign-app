// lib/priorities.ts

export type PriorityScores = {
  urgency: 1 | 2 | 3 | 4 | 5;
  revenueImpact: 1 | 2 | 3 | 4 | 5;
  strategicValue: 1 | 2 | 3 | 4 | 5;
  familyImpact: 1 | 2 | 3 | 4 | 5;
  energyCost: 1 | 2 | 3 | 4 | 5;
};

export type PriorityLevel = "critical" | "high" | "normal" | "low";

/**
 * Calcule le score de priorité selon la formule SOVEREIGN
 * Score = Urgence + ImpactRevenu + ValeurStratégique + ImpactFamille - CoûtÉnergie
 */
export function calculatePriorityScore(scores: PriorityScores): number {
  return scores.urgency + scores.revenueImpact + scores.strategicValue + scores.familyImpact - scores.energyCost;
}

/**
 * Retourne le niveau de priorité basé sur le score
 */
export function getPriorityLevel(score: number): PriorityLevel {
  if (score >= 15) return "critical";
  if (score >= 12) return "high";
  if (score >= 8) return "normal";
  return "low";
}

/**
 * Retourne les classes CSS pour le niveau de priorité
 */
export function getPriorityStyles(level: PriorityLevel): {
  badge: string;
  border: string;
  text: string;
} {
  const styles = {
    critical: {
      badge: "bg-red-500/20 text-red-400",
      border: "border-l-red-500",
      text: "text-red-400"
    },
    high: {
      badge: "bg-orange-500/20 text-orange-400",
      border: "border-l-orange-500",
      text: "text-orange-400"
    },
    normal: {
      badge: "bg-blue-500/20 text-blue-400",
      border: "border-l-blue-500",
      text: "text-blue-400"
    },
    low: {
      badge: "bg-gray-500/20 text-gray-400",
      border: "border-l-gray-500",
      text: "text-gray-400"
    }
  };
  return styles[level];
}

/**
 * Calcule automatiquement les scores pour une tâche ou opportunité
 */
export function autoScoreTask(
  dueDate: string | null,
  priority: string,
  projectValue: "high" | "medium" | "low" = "medium",
  hasRevenue: boolean = false,
  isFamilyRelated: boolean = false
): PriorityScores {
  // Urgence basée sur la date d'échéance
  let urgency: 1 | 2 | 3 | 4 | 5 = 3;
  if (dueDate) {
    const daysUntil = Math.ceil((new Date(dueDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
    if (daysUntil < 0) urgency = 5;
    else if (daysUntil === 0) urgency = 5;
    else if (daysUntil <= 2) urgency = 4;
    else if (daysUntil <= 5) urgency = 3;
    else if (daysUntil <= 10) urgency = 2;
    else urgency = 1;
  }
  
  // Impact revenu
  let revenueImpact: 1 | 2 | 3 | 4 | 5 = hasRevenue ? 4 : 2;
  
  // Valeur stratégique basée sur la priorité
  let strategicValue: 1 | 2 | 3 | 4 | 5 = 3;
  if (priority === "critical") strategicValue = 5;
  else if (priority === "high") strategicValue = 4;
  else if (priority === "normal") strategicValue = 3;
  else strategicValue = 2;
  
  // Impact famille
  let familyImpact: 1 | 2 | 3 | 4 | 5 = isFamilyRelated ? 5 : 1;
  
  // Coût énergie basé sur la valeur du projet
  let energyCost: 1 | 2 | 3 | 4 | 5 = 3;
  if (projectValue === "high") energyCost = 4;
  else if (projectValue === "low") energyCost = 2;
  
  return { urgency, revenueImpact, strategicValue, familyImpact, energyCost };
}
