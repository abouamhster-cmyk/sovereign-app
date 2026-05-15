"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { 
  Heart, DollarSign, Briefcase, Sprout, FileText, 
  TrendingUp, Shield, Users, Globe, Calendar, Loader2,
  CheckCircle, AlertCircle, Clock, Trophy, Target,
  Sparkles, ArrowRight, Brain, Crown, LayoutGrid
} from "lucide-react";
import { toast } from "sonner";
import { exportToPDF } from "@/lib/exportPDF";

const API_URL = "https://sovereign-bridge.onrender.com";

// =====================================================
// TYPES
// =====================================================

type DomainData = {
  status: string;
  pending_count?: number;
  balance?: number;
  active_missions?: number;
  total_investment?: number;
  urgent_count?: number;
  recent_count?: number;
  score?: number;
  next_action?: string;
  urgency: string;
};

type LifeMapData = {
  family: DomainData;
  money: DomainData;
  business: DomainData;
  farm: DomainData;
  documents: DomainData;
  wins: DomainData;
  relocation: DomainData;
  alignment: DomainData;
};

type WeeklyData = {
  week_range: { start: string; end: string };
  summary: {
    tasks_completed: number;
    tasks_created: number;
    completion_rate: number;
    wins: number;
    total_spending: number;
    total_revenue: number;
    net_balance: number;
  };
  what_moved: {
    completed_tasks: { title: string; project: string }[];
    wins: { title: string; celebration_emoji: string }[];
  };
  what_stalled: {
    overdue_docs: { name: string; due_date: string }[];
    pending_docs_count: number;
    stalled_missions: { name: string }[];
  };
  closest_to_cash: string;
  pending_documents_summary: string;
  next_week_priorities: string[];
  mood_summary: { date: string; mood: string }[];
  insights: string;
};

const domainConfig: Record<string, { label: string; icon: any; color: string; bgColor: string; href: string }> = {
  family: { label: "Famille", icon: Heart, color: "text-pink-400", bgColor: "bg-pink-500/10", href: "/family" },
  money: { label: "Argent", icon: DollarSign, color: "text-emerald-400", bgColor: "bg-emerald-500/10", href: "/money-opportunities" },
  business: { label: "Business", icon: Briefcase, color: "text-blue-400", bgColor: "bg-blue-500/10", href: "/missions-business" },
  farm: { label: "Ferme", icon: Sprout, color: "text-green-400", bgColor: "bg-green-500/10", href: "/farm" },
  documents: { label: "Documents", icon: FileText, color: "text-orange-400", bgColor: "bg-orange-500/10", href: "/communications" },
  wins: { label: "Victoires", icon: TrendingUp, color: "text-yellow-400", bgColor: "bg-yellow-500/10", href: "/rescue-wins" },
  relocation: { label: "Relocalisation", icon: Globe, color: "text-cyan-400", bgColor: "bg-cyan-500/10", href: "/relocation" },
  alignment: { label: "Alignement", icon: Shield, color: "text-purple-400", bgColor: "bg-purple-500/10", href: "/alignment" }
};

const getStatusDisplay = (status: string, urgency: string) => {
  if (status === "🔴") return { icon: AlertCircle, label: "Urgent", color: "text-red-400" };
  if (status === "🟡") return { icon: Clock, label: "À surveiller", color: "text-yellow-400" };
  return { icon: CheckCircle, label: "Stable", color: "text-emerald-400" };
};

// =====================================================
// FONCTION UTILITAIRE POUR SÉCURISER LES AFFICHAGES
// =====================================================

function safeString(value: any, fallback: string = ""): string {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return value.toString();
  if (typeof value === 'object') {
    // Si l'objet a une propriété 'message' (comme dans l'erreur)
    if (value.message) return value.message;
    // Si l'objet a une propriété 'name'
    if (value.name) return value.name;
    // Sinon, retourner une représentation JSON
    return JSON.stringify(value);
  }
  return fallback;
}

// =====================================================
// COMPOSANT PRINCIPAL
// =====================================================

export default function VisionStrategyPage() {
  const [activeTab, setActiveTab] = useState<"lifemap" | "weekly">("lifemap");
  const [lifeMapData, setLifeMapData] = useState<LifeMapData | null>(null);
  const [weeklyData, setWeeklyData] = useState<WeeklyData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    fetchAllData();
  }, []);

  async function fetchAllData() {
    setIsLoading(true);
    await Promise.all([
      fetchLifeMap(),
      fetchWeeklyData()
    ]);
    setIsLoading(false);
  }

  async function fetchLifeMap() {
    try {
      const response = await fetch(`${API_URL}/api/life-map`);
      const result = await response.json();
      if (result.success) {
        setLifeMapData(result.data);
      }
    } catch (error) {
      console.error("Erreur life map:", error);
    }
  }

  async function fetchWeeklyData() {
    try {
      const response = await fetch(`${API_URL}/api/weekly-ceo`);
      const result = await response.json();
      if (result.success) {
        setWeeklyData({
          week_range: result.week_range || { start: "", end: "" },
          summary: {
            tasks_completed: result.summary?.tasks_completed || 0,
            tasks_created: result.summary?.tasks_created || 0,
            completion_rate: result.summary?.completion_rate || 0,
            wins: result.summary?.wins || 0,
            total_spending: result.summary?.total_spending || 0,
            total_revenue: result.summary?.total_revenue || 0,
            net_balance: result.summary?.net_balance || 0
          },
          what_moved: {
            completed_tasks: result.what_moved?.completed_tasks || [],
            wins: result.what_moved?.wins || []
          },
          what_stalled: {
            overdue_docs: result.what_stalled?.overdue_docs || [],
            pending_docs_count: result.what_stalled?.pending_docs_count || 0,
            stalled_missions: result.what_stalled?.stalled_missions || []
          },
          closest_to_cash: result.closest_to_cash || "Aucune mission identifiée",
          pending_documents_summary: result.pending_documents_summary || "Aucun document en attente",
          next_week_priorities: result.next_week_priorities || [],
          mood_summary: result.mood_summary || [],
          insights: result.insights || "Analyse en cours..."
        });
      }
    } catch (error) {
      console.error("Erreur weekly CEO:", error);
    }
  }

  async function regeneratePriorities() {
    setIsGenerating(true);
    try {
      const response = await fetch(`${API_URL}/api/weekly-ceo/regenerate`, {
        method: "POST"
      });
      const result = await response.json();
      if (result.success && result.next_week_priorities) {
        setWeeklyData(prev => prev ? { ...prev, next_week_priorities: result.next_week_priorities } : null);
        toast.success("Priorités régénérées");
      }
    } catch (error) {
      toast.error("Erreur lors de la régénération");
    } finally {
      setIsGenerating(false);
    }
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  const getMoodEmoji = (mood: string) => {
    switch(mood) {
      case "excellent": return "🌟";
      case "bien": return "😊";
      case "neutre": return "😐";
      case "fatiguée": return "😴";
      case "stressée": return "😰";
      default: return "🤔";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-gold-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Crown className="w-8 h-8 text-gold-500" />
            <h1 className="text-3xl md:text-4xl font-serif text-gold-500 tracking-tight">
              Vision & Stratégie
            </h1>
          </div>
          <p className="text-gray-500 text-sm">
            Vue d'ensemble et pilotage stratégique
          </p>
        </div>
        {activeTab === "weekly" && weeklyData && (
          <button
            onClick={regeneratePriorities}
            disabled={isGenerating}
            className="bg-gold-500/20 text-gold-500 px-4 py-2 rounded-full text-sm flex items-center gap-2 hover:bg-gold-500/30 transition-colors"
          >
            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
            Régénérer priorités
          </button>
        )}
      </div>

      {/* TABS */}
      <div className="flex flex-wrap gap-2 border-b border-white/10 mb-6 overflow-x-auto pb-2">
        <button
          onClick={() => setActiveTab("lifemap")}
          className={`px-4 py-2 text-sm flex items-center gap-2 transition-colors rounded-lg ${
            activeTab === "lifemap" ? "bg-gold-500/20 text-gold-500" : "text-gray-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <LayoutGrid className="w-4 h-4" /> Vue d'ensemble
        </button>
        <button
          onClick={() => setActiveTab("weekly")}
          className={`px-4 py-2 text-sm flex items-center gap-2 transition-colors rounded-lg ${
            activeTab === "weekly" ? "bg-gold-500/20 text-gold-500" : "text-gray-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <Calendar className="w-4 h-4" /> Vue hebdomadaire
        </button>
      </div>

      {/* ==================== ONGLET VUE D'ENSEMBLE (LIFE MAP) ==================== */}
      {activeTab === "lifemap" && lifeMapData && (
        <div>
          {/* GRILLE DES DOMAINES */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(lifeMapData).map(([key, domain]) => {
              const config = domainConfig[key as keyof typeof domainConfig];
              if (!config) return null;
              const Icon = config.icon;
              const statusInfo = getStatusDisplay(domain.status, domain.urgency);
              const StatusIcon = statusInfo.icon;
              
              return (
                <Link key={key} href={config.href}>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ scale: 1.02 }}
                    className={`${config.bgColor} border border-white/10 rounded-2xl p-5 hover:border-gold-500/30 transition-all cursor-pointer h-full`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Icon className={`w-5 h-5 ${config.color}`} />
                        <h2 className="text-ivory font-medium">{config.label}</h2>
                      </div>
                      <div className="flex items-center gap-1">
                        <StatusIcon className={`w-4 h-4 ${statusInfo.color}`} />
                        <span className={`text-xs ${statusInfo.color}`}>{statusInfo.label}</span>
                      </div>
                    </div>
                    
                    {/* Contenu spécifique au domaine */}
                    {key === "money" && domain.balance !== undefined && (
                      <p className={`text-2xl font-serif ${domain.balance >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {domain.balance.toLocaleString()} CFA
                      </p>
                    )}
                    
                    {key === "family" && domain.pending_count !== undefined && (
                      <p className="text-2xl font-serif text-ivory">{domain.pending_count}</p>
                    )}
                    
                    {key === "business" && domain.active_missions !== undefined && (
                      <p className="text-2xl font-serif text-ivory">{domain.active_missions}</p>
                    )}
                    
                    {key === "farm" && domain.total_investment !== undefined && (
                      <p className="text-2xl font-serif text-ivory">{domain.total_investment.toLocaleString()} CFA</p>
                    )}
                    
                    {key === "documents" && domain.urgent_count !== undefined && (
                      <div className="flex items-baseline gap-2">
                        <p className="text-2xl font-serif text-ivory">{domain.pending_count || 0}</p>
                        {domain.urgent_count > 0 && (
                          <span className="text-xs text-red-400">({domain.urgent_count} urgent)</span>
                        )}
                      </div>
                    )}
                    
                    {key === "wins" && domain.recent_count !== undefined && (
                      <p className="text-2xl font-serif text-ivory">{domain.recent_count}</p>
                    )}
                    
                    {key === "alignment" && domain.score !== undefined && (
                      <div className="flex items-center gap-2">
                        <p className="text-2xl font-serif text-ivory">{domain.score}%</p>
                        <div className="flex-1 h-2 bg-white/10 rounded-full">
                          <div className="h-2 bg-gold-500 rounded-full" style={{ width: `${domain.score}%` }} />
                        </div>
                      </div>
                    )}
                    
                    {key === "relocation" && domain.pending_count !== undefined && (
                      <p className="text-2xl font-serif text-ivory">{domain.pending_count}</p>
                    )}
                    
                    {/* Prochaine action */}
                    {domain.next_action && (
                      <p className="text-xs text-gray-500 mt-3 truncate">
                        📍 {domain.next_action}
                      </p>
                    )}
                  </motion.div>
                </Link>
              );
            })}
          </div>

          {/* LÉGENDE */}
          <div className="mt-8 p-4 bg-white/5 rounded-xl">
            <p className="text-xs text-gray-500 mb-2">Légende</p>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-3 h-3 text-emerald-400" />
                <span className="text-xs text-gray-400">Stable</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-3 h-3 text-yellow-400" />
                <span className="text-xs text-gray-400">À surveiller</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertCircle className="w-3 h-3 text-red-400" />
                <span className="text-xs text-gray-400">Urgent</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== ONGLET VUE HEBDOMADAIRE (WEEKLY CEO) ==================== */}
      {activeTab === "weekly" && weeklyData && (
        <div id="weekly-content">
          {/* PÉRIODE */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center mb-6">
            <Calendar className="w-5 h-5 text-gold-500 mx-auto mb-2" />
            <p className="text-sm text-ivory">
              Semaine du {formatDate(weeklyData.week_range?.start)} au {formatDate(weeklyData.week_range?.end)}
            </p>
          </div>

          {/* INSIGHT PRINCIPAL - VERSION SÉCURISÉE */}
          <div className="bg-gradient-to-r from-gold-500/10 to-transparent border-l-4 border-gold-500 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-gold-500 mt-0.5" />
              <p className="text-ivory text-sm leading-relaxed">
                {safeString(weeklyData.insights, "Analyse en cours...")}
              </p>
            </div>
          </div>

          {/* STATS CARTES */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
              <CheckCircle className="w-5 h-5 text-emerald-400 mx-auto mb-2" />
              <div className="text-2xl font-serif text-ivory">{weeklyData.summary.tasks_completed}</div>
              <div className="text-xs text-gray-500">Tâches faites</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
              <Target className="w-5 h-5 text-blue-400 mx-auto mb-2" />
              <div className="text-2xl font-serif text-blue-400">{weeklyData.summary.completion_rate}%</div>
              <div className="text-xs text-gray-500">Taux complétion</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
              <Trophy className="w-5 h-5 text-yellow-400 mx-auto mb-2" />
              <div className="text-2xl font-serif text-yellow-400">{weeklyData.summary.wins}</div>
              <div className="text-xs text-gray-500">Victoires</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
              <DollarSign className="w-5 h-5 text-emerald-400 mx-auto mb-2" />
              <div className={`text-2xl font-serif ${weeklyData.summary.net_balance >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {weeklyData.summary.net_balance.toLocaleString()} CFA
              </div>
              <div className="text-xs text-gray-500">Solde net</div>
            </div>
          </div>

          {/* CE QUI A AVANCÉ */}
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-5 mb-6">
            <h2 className="text-sm font-serif text-emerald-400 mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              ✅ CE QUI A AVANCÉ
            </h2>
            
            {weeklyData.what_moved?.completed_tasks && weeklyData.what_moved.completed_tasks.length > 0 && (
              <div className="mb-4">
                <p className="text-xs text-gray-500 mb-2">Tâches complétées :</p>
                <div className="space-y-1">
                  {weeklyData.what_moved.completed_tasks.slice(0, 5).map((task, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-3 h-3 text-emerald-400" />
                      <span className="text-gray-300">{task.title}</span>
                      <span className="text-xs text-gray-500 ml-auto">{task.project}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {weeklyData.what_moved?.wins && weeklyData.what_moved.wins.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 mb-2">Victoires célébrées :</p>
                <div className="space-y-1">
                  {weeklyData.what_moved.wins.slice(0, 5).map((win, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      <span>{win.celebration_emoji}</span>
                      <span className="text-gray-300">{win.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {(!weeklyData.what_moved?.completed_tasks || weeklyData.what_moved.completed_tasks.length === 0) && 
             (!weeklyData.what_moved?.wins || weeklyData.what_moved.wins.length === 0) && (
              <p className="text-sm text-gray-500">Aucune avancée enregistrée cette semaine.</p>
            )}
          </div>

          {/* CE QUI A BLOQUÉ */}
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-5 mb-6">
            <h2 className="text-sm font-serif text-red-400 mb-4 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              ⚠️ CE QUI A BLOQUÉ
            </h2>
            
            {weeklyData.what_stalled?.overdue_docs && weeklyData.what_stalled.overdue_docs.length > 0 && (
              <div className="mb-4">
                <p className="text-xs text-gray-500 mb-2">Documents en retard :</p>
                <div className="space-y-1">
                  {weeklyData.what_stalled.overdue_docs.slice(0, 5).map((doc, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <span className="text-gray-300">{doc.name}</span>
                      <span className="text-xs text-red-400">📅 {formatDate(doc.due_date)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {weeklyData.what_stalled?.stalled_missions && weeklyData.what_stalled.stalled_missions.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 mb-2">Missions sans activité :</p>
                <div className="space-y-1">
                  {weeklyData.what_stalled.stalled_missions.slice(0, 5).map((mission, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      <Target className="w-3 h-3 text-gray-500" />
                      <span className="text-gray-300">{mission.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {(!weeklyData.what_stalled?.overdue_docs || weeklyData.what_stalled.overdue_docs.length === 0) && 
             (!weeklyData.what_stalled?.stalled_missions || weeklyData.what_stalled.stalled_missions.length === 0) && (
              <p className="text-sm text-gray-500">Rien à signaler, tout roule !</p>
            )}
            
            <p className="text-xs text-gray-500 mt-3 pt-2 border-t border-red-500/20">
              {safeString(weeklyData.pending_documents_summary, "Aucun document en attente")}
            </p>
          </div>

          {/* PLUS PROCHE DU CASH - VERSION SÉCURISÉE */}
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-5 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-serif text-emerald-400">PLUS PROCHE DU CASH</h2>
            </div>
            <p className="text-ivory text-lg font-medium">
              {safeString(weeklyData.closest_to_cash, "Aucune mission identifiée")}
            </p>
            <p className="text-xs text-gray-500 mt-1">Mission avec le plus fort potentiel de revenu immédiat</p>
          </div>

          {/* HUMEURS DE LA SEMAINE */}
          {weeklyData.mood_summary && weeklyData.mood_summary.length > 0 && (
            <div className="bg-white/5 border border-white/10 rounded-xl p-5 mb-6">
              <h2 className="text-sm font-serif text-gold-500 mb-3 flex items-center gap-2">
                <Heart className="w-4 h-4" />
                Humeurs de la semaine
              </h2>
              <div className="flex flex-wrap gap-2">
                {weeklyData.mood_summary.slice(0, 7).map((entry, idx) => (
                  <span key={idx} className="text-xs px-2 py-1 bg-white/10 rounded-full">
                    {getMoodEmoji(entry.mood)} {formatDate(entry.date)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* PRIORITÉS SEMAINE PROCHAINE */}
          {weeklyData.next_week_priorities && weeklyData.next_week_priorities.length > 0 && (
            <div className="bg-gold-500/10 border border-gold-500/20 rounded-xl p-5 mb-6">
              <h2 className="text-sm font-serif text-gold-500 mb-4 flex items-center gap-2">
                <Target className="w-4 h-4" />
                🎯 TOP 3 PRIORITÉS SEMAINE PROCHAINE
              </h2>
              <div className="space-y-3">
                {weeklyData.next_week_priorities.slice(0, 3).map((priority, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-gold-500/20 text-gold-500 flex items-center justify-center text-xs font-bold">
                      {idx + 1}
                    </div>
                    <span className="text-ivory">{priority}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* BOUTON EXPORT */}
          <div className="flex justify-center">
            <button
              onClick={() => exportToPDF("weekly-content", `vision-strategie-${new Date().toISOString().split('T')[0]}`)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 text-gray-300 rounded-full font-medium hover:bg-white/20 transition-colors"
            >
              📄 Exporter cette vue en PDF
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
