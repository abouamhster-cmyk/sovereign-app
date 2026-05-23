// lib/priorities.ts

export type PriorityScores = {
  urgency: 1 | 2 | 3 | 4 | 5;      // Urgence (5 = à faire maintenant)
  revenueImpact: 1 | 2 | 3 | 4 | 5; // Impact sur le revenu (5 = rapporte beaucoup)
  strategicValue: 1 | 2 | 3 | 4 | 5; // Valeur stratégique (5 = crucial pour l'avenir)
  familyImpact: 1 | 2 | 3 | 4 | 5;   // Impact sur la famille (5 = affecte les enfants)
  energyCost: 1 | 2 | 3 | 4 | 5;     // Coût énergétique (5 = très fatigant)
};

export type PriorityLevel = "critical" | "high" | "normal" | "low";

export type ScoredTask = {
  id: string;
  title: string;
  scores: PriorityScores;
  totalScore: number;
  level: PriorityLevel;
  estimatedTime?: number;
  dueDate?: string | null;
  status?: string;        
  priority?: string;      
  project?: string;       
};

/**
 * Calcule le score total selon la formule SOVEREIGN
 * Score = Urgence + Revenu + Stratégique + Famille - Énergie
 */
export function calculateTotalScore(scores: PriorityScores): number {
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
  bg: string;
} {
  const styles = {
    critical: {
      badge: "bg-red-500/20 text-red-400",
      border: "border-l-red-500",
      text: "text-red-400",
      bg: "bg-red-950/20"
    },
    high: {
      badge: "bg-orange-500/20 text-orange-400",
      border: "border-l-orange-500",
      text: "text-orange-400",
      bg: "bg-orange-950/20"
    },
    normal: {
      badge: "bg-blue-500/20 text-blue-400",
      border: "border-l-blue-500",
      text: "text-blue-400",
      bg: "bg-blue-950/20"
    },
    low: {
      badge: "bg-gray-500/20 text-gray-400",
      border: "border-l-gray-500",
      text: "text-gray-400",
      bg: "bg-gray-950/20"
    }
  };
  return styles[level];
}

/**
 * Évalue automatiquement une tâche basée sur ses propriétés
 */
export function autoScoreTask(
  title: string,
  dueDate: string | null,
  priority: string,
  hasRevenuePotential: boolean = false,
  isFamilyRelated: boolean = false,
  estimatedMinutes: number = 30
): PriorityScores {
  // 1. Urgence basée sur la date d'échéance
  let urgency: 1 | 2 | 3 | 4 | 5 = 3;
  if (dueDate) {
    const daysUntil = Math.ceil((new Date(dueDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
    if (daysUntil < 0) urgency = 5;      // Déjà en retard
    else if (daysUntil === 0) urgency = 5; // Aujourd'hui
    else if (daysUntil <= 2) urgency = 4;
    else if (daysUntil <= 5) urgency = 3;
    else if (daysUntil <= 10) urgency = 2;
    else urgency = 1;
  }
  
  // 2. Impact revenu basé sur le titre et les mots-clés
  let revenueImpact: 1 | 2 | 3 | 4 | 5 = 2;
  const revenueKeywords = ["argent", "revenu", "client", "vente", "contrat", "grant", "facture", "paiement", "offre"];
  if (revenueKeywords.some(k => title.toLowerCase().includes(k))) {
    revenueImpact = hasRevenuePotential ? 5 : 4;
  } else if (hasRevenuePotential) {
    revenueImpact = 4;
  }
  
  // 3. Valeur stratégique basée sur la priorité
  let strategicValue: 1 | 2 | 3 | 4 | 5 = 3;
  if (priority === "critical") strategicValue = 5;
  else if (priority === "high") strategicValue = 4;
  else if (priority === "normal") strategicValue = 3;
  else strategicValue = 2;
  
  // 4. Impact famille
  let familyImpact: 1 | 2 | 3 | 4 | 5 = 1;
  const familyKeywords = ["enfant", "fille", "école", "médecin", "rendez-vous", "famille", "maison", "routine"];
  if (isFamilyRelated || familyKeywords.some(k => title.toLowerCase().includes(k))) {
    familyImpact = 5;
  }
  
  // 5. Coût énergie basé sur le temps estimé
  let energyCost: 1 | 2 | 3 | 4 | 5 = 3;
  if (estimatedMinutes <= 5) energyCost = 1;
  else if (estimatedMinutes <= 15) energyCost = 2;
  else if (estimatedMinutes <= 45) energyCost = 3;
  else if (estimatedMinutes <= 120) energyCost = 4;
  else energyCost = 5;
  
  return { urgency, revenueImpact, strategicValue, familyImpact, energyCost };
}

/**
 * Trie un tableau de tâches par score (du plus prioritaire au moins prioritaire)
 */
export function sortTasksByPriority<T extends { scores?: PriorityScores; totalScore?: number }>(
  tasks: T[],
  getScores?: (task: T) => PriorityScores
): T[] {
  return [...tasks].sort((a, b) => {
    let scoreA: number;
    let scoreB: number;
    
    if (getScores) {
      scoreA = calculateTotalScore(getScores(a));
      scoreB = calculateTotalScore(getScores(b));
    } else if (a.totalScore !== undefined && b.totalScore !== undefined) {
      scoreA = a.totalScore;
      scoreB = b.totalScore;
    } else if (a.scores && b.scores) {
      scoreA = calculateTotalScore(a.scores);
      scoreB = calculateTotalScore(b.scores);
    } else {
      return 0;
    }
    
    return scoreB - scoreA;
  });
}

/**
 * Retourne une recommandation textuelle basée sur le score
 */
export function getPriorityRecommendation(score: number, level: PriorityLevel): string {
  if (level === "critical") {
    return "⚠️ À faire IMMÉDIATEMENT. Cette tâche est critique.";
  }
  if (level === "high") {
    return "🔴 Priorité haute. À faire aujourd'hui ou demain.";
  }
  if (level === "normal") {
    return "🟡 Priorité normale. Planifie cette semaine.";
  }
  return "🟢 Priorité basse. Peut attendre ou être déléguée.";
}
