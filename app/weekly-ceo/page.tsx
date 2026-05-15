"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { 
  TrendingUp, CheckCircle, Clock, AlertCircle, 
  Target, DollarSign, FileText, Heart, Sparkles,
  Calendar, ArrowRight, Loader2, Trophy, Brain
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { exportToPDF } from "@/lib/exportPDF";

const API_URL = "https://sovereign-bridge.onrender.com";

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

export default function WeeklyCEOPage() {
  const [data, setData] = useState<WeeklyData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/weekly-ceo`);
      const result = await response.json();
      if (result.success) {
        setData(result);
      } else {
        toast.error("Erreur chargement des données");
      }
    } catch (error) {
      console.error("Erreur:", error);
      toast.error("Erreur de connexion");
    } finally {
      setIsLoading(false);
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
        setData(prev => prev ? { ...prev, next_week_priorities: result.next_week_priorities } : null);
        toast.success("Priorités régénérées");
      }
    } catch (error) {
      toast.error("Erreur lors de la régénération");
    } finally {
      setIsGenerating(false);
    }
  }

  const formatDate = (dateStr: string) => {
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
    <div id="weekly-ceo-content" className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Trophy className="w-8 h-8 text-gold-500" />
            <h1 className="text-3xl md:text-4xl font-serif text-gold-500 tracking-tight">
              Weekly CEO View
            </h1>
          </div>
          <p className="text-gray-500 text-sm">
            Vue stratégique hebdomadaire
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => exportToPDF("weekly-ceo-content", `weekly-ceo-${new Date().toISOString().split('T')[0]}`)}
            className="bg-white/10 px-4 py-2 rounded-full text-sm hover:bg-white/20 transition-colors"
          >
            📄 Exporter PDF
          </button>
          <button
            onClick={regeneratePriorities}
            disabled={isGenerating}
            className="bg-gold-500/20 text-gold-500 px-4 py-2 rounded-full text-sm flex items-center gap-2 hover:bg-gold-500/30 transition-colors"
          >
            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
            Régénérer priorités
          </button>
        </div>
      </div>

      {/* PÉRIODE */}
      {data && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
          <Calendar className="w-5 h-5 text-gold-500 mx-auto mb-2" />
          <p className="text-sm text-ivory">
            Semaine du {formatDate(data.week_range.start)} au {formatDate(data.week_range.end)}
          </p>
        </div>
      )}

      {/* INSIGHT PRINCIPAL */}
      {data && (
        <div className="bg-gradient-to-r from-gold-500/10 to-transparent border-l-4 border-gold-500 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-gold-500 mt-0.5" />
            <p className="text-ivory text-sm leading-relaxed">{data.insights}</p>
          </div>
        </div>
      )}

      {/* STATS CARTES */}
      {data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
            <CheckCircle className="w-5 h-5 text-emerald-400 mx-auto mb-2" />
            <div className="text-2xl font-serif text-ivory">{data.summary.tasks_completed}</div>
            <div className="text-xs text-gray-500">Tâches faites</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
            <Target className="w-5 h-5 text-blue-400 mx-auto mb-2" />
            <div className="text-2xl font-serif text-blue-400">{data.summary.completion_rate}%</div>
            <div className="text-xs text-gray-500">Taux complétion</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
            <Trophy className="w-5 h-5 text-yellow-400 mx-auto mb-2" />
            <div className="text-2xl font-serif text-yellow-400">{data.summary.wins}</div>
            <div className="text-xs text-gray-500">Victoires</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
            <DollarSign className="w-5 h-5 text-emerald-400 mx-auto mb-2" />
            <div className={`text-2xl font-serif ${data.summary.net_balance >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {data.summary.net_balance.toLocaleString()} CFA
            </div>
            <div className="text-xs text-gray-500">Solde net</div>
          </div>
        </div>
      )}

      {/* CE QUI A AVANCÉ */}
      {data && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-5">
          <h2 className="text-sm font-serif text-emerald-400 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            ✅ CE QUI A AVANCÉ
          </h2>
          
          {data.what_moved.completed_tasks.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-gray-500 mb-2">Tâches complétées :</p>
              <div className="space-y-1">
                {data.what_moved.completed_tasks.map((task, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-3 h-3 text-emerald-400" />
                    <span className="text-gray-300">{task.title}</span>
                    <span className="text-xs text-gray-500 ml-auto">{task.project}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {data.what_moved.wins.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 mb-2">Victoires célébrées :</p>
              <div className="space-y-1">
                {data.what_moved.wins.map((win, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm">
                    <span>{win.celebration_emoji}</span>
                    <span className="text-gray-300">{win.title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {data.what_moved.completed_tasks.length === 0 && data.what_moved.wins.length === 0 && (
            <p className="text-sm text-gray-500">Aucune avancée enregistrée cette semaine.</p>
          )}
        </div>
      )}

      {/* CE QUI A BLOQUÉ */}
      {data && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-5">
          <h2 className="text-sm font-serif text-red-400 mb-4 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            ⚠️ CE QUI A BLOQUÉ
          </h2>
          
          {data.what_stalled.overdue_docs.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-gray-500 mb-2">Documents en retard :</p>
              <div className="space-y-1">
                {data.what_stalled.overdue_docs.map((doc, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <span className="text-gray-300">{doc.name}</span>
                    <span className="text-xs text-red-400">📅 {formatDate(doc.due_date)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {data.what_stalled.stalled_missions.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 mb-2">Missions sans activité :</p>
              <div className="space-y-1">
                {data.what_stalled.stalled_missions.map((mission, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm">
                    <Target className="w-3 h-3 text-gray-500" />
                    <span className="text-gray-300">{mission.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {data.what_stalled.overdue_docs.length === 0 && data.what_stalled.stalled_missions.length === 0 && (
            <p className="text-sm text-gray-500">Rien à signaler, tout roule !</p>
          )}
          
          <p className="text-xs text-gray-500 mt-3 pt-2 border-t border-red-500/20">
            {data.pending_documents_summary}
          </p>
        </div>
      )}

      {/* PLUS PROCHE DU CASH */}
      {data && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-serif text-emerald-400">PLUS PROCHE DU CASH</h2>
          </div>
          <p className="text-ivory text-lg font-medium">{data.closest_to_cash}</p>
          <p className="text-xs text-gray-500 mt-1">Mission avec le plus fort potentiel de revenu immédiat</p>
        </div>
      )}

      {/* HUMEURS DE LA SEMAINE */}
      {data && data.mood_summary.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-5">
          <h2 className="text-sm font-serif text-gold-500 mb-3 flex items-center gap-2">
            <Heart className="w-4 h-4" />
            Humeurs de la semaine
          </h2>
          <div className="flex flex-wrap gap-2">
            {data.mood_summary.map((entry, idx) => (
              <span key={idx} className="text-xs px-2 py-1 bg-white/10 rounded-full">
                {getMoodEmoji(entry.mood)} {formatDate(entry.date)}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* PRIORITÉS SEMAINE PROCHAINE */}
      {data && (
        <div className="bg-gold-500/10 border border-gold-500/20 rounded-xl p-5">
          <h2 className="text-sm font-serif text-gold-500 mb-4 flex items-center gap-2">
            <Target className="w-4 h-4" />
            🎯 TOP 3 PRIORITÉS SEMAINE PROCHAINE
          </h2>
          <div className="space-y-3">
            {data.next_week_priorities.map((priority, idx) => (
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

      {/* BOUTON RETOUR */}
      <div className="text-center pt-4">
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 px-6 py-3 bg-gold-500 text-midnight rounded-full font-medium hover:bg-gold-400 transition-colors"
        >
          Retour au commandement
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
