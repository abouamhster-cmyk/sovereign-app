"use client";
import { useEffect, useState } from "react";
import LoadingSpinner from "@/components/LoadingSpinner";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";
import { 
  Calendar, Sparkles, TrendingUp, AlertCircle, 
  CheckCircle, Clock, FileText, RefreshCw, Loader2,
  Target, Heart, DollarSign, Briefcase, Sprout
} from "lucide-react";

type WeeklyReview = {
  id: string;
  week_start: string;
  what_moved: string;
  what_stalled: string;
  closest_to_cash: string;
  pending_documents: string;
  next_week_priorities: string[];
  created_at: string;
};

type Mission = {
  id: string;
  name: string;
  status: string;
  revenue_potential: number;
};

type Task = {
  id: string;
  title: string;
  status: string;
  completed_date: string | null;
};

type Spending = {
  id: string;
  amount: number;
  date: string;
};

export default function WeeklyPage() {
  const [lastReview, setLastReview] = useState<WeeklyReview | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    tasksCompleted: 0,
    tasksTotal: 0,
    totalSpent: 0,
    activeMissions: 0,
    winsThisWeek: 0
  });

  useEffect(() => {
    fetchLastReview();
    fetchStats();
  }, []);

  async function fetchLastReview() {
    const { data } = await supabase
      .from("weekly_reviews")
      .select("*")
      .order("week_start", { ascending: false })
      .limit(1)
      .maybeSingle();
    
    setLastReview(data);
    setIsLoading(false);
  }

  async function fetchStats() {
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const startOfWeekStr = startOfWeek.toISOString().split('T')[0];
    
    const [tasksRes, spendingRes, missionsRes, winsRes] = await Promise.all([
      supabase.from("tasks").select("*"),
      supabase.from("spending").select("amount, date").gte("date", startOfWeekStr),
      supabase.from("missions").select("*").eq("status", "active"),
      supabase.from("wins").select("*").gte("date", startOfWeekStr)
    ]);
    
    const tasks = tasksRes.data || [];
    const completed = tasks.filter(t => t.status === "done" || t.completed_date);
    const spending = spendingRes.data || [];
    const missions = missionsRes.data || [];
    const wins = winsRes.data || [];
    
    setStats({
      tasksCompleted: completed.length,
      tasksTotal: tasks.length,
      totalSpent: spending.reduce((sum, s) => sum + (s.amount || 0), 0),
      activeMissions: missions.length,
      winsThisWeek: wins.length
    });
  }

  async function generateReview() {
    setIsGenerating(true);
    
    try {
      // Récupérer les données de la semaine
      const startOfWeek = new Date();
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
      const startOfWeekStr = startOfWeek.toISOString().split('T')[0];
      
      const [tasksRes, missionsRes, docsRes, spendingRes, winsRes] = await Promise.all([
        supabase.from("tasks").select("*"),
        supabase.from("missions").select("*"),
        supabase.from("documents").select("*").neq("status", "approved"),
        supabase.from("spending").select("amount").gte("date", startOfWeekStr),
        supabase.from("wins").select("*").gte("date", startOfWeekStr)
      ]);
      
      const tasks = tasksRes.data || [];
      const missions = missionsRes.data || [];
      const pendingDocs = docsRes.data || [];
      const spending = spendingRes.data || [];
      const wins = winsRes.data || [];
      
      const completedTasks = tasks.filter(t => t.status === "done" || t.completed_date);
      const stalledTasks = tasks.filter(t => t.status === "waiting");
      
      // Trouver la mission la plus proche de générer du cash
      const closestToCash = missions
        .filter(m => m.revenue_potential > 3)
        .sort((a, b) => (b.revenue_potential || 0) - (a.revenue_potential || 0))[0];
      
      const context = {
        completedTasksCount: completedTasks.length,
        totalTasks: tasks.length,
        stalledTasksCount: stalledTasks.length,
        totalSpent: spending.reduce((sum, s) => sum + (s.amount || 0), 0),
        winsCount: wins.length,
        pendingDocsCount: pendingDocs.length,
        closestToCashName: closestToCash?.name || "Aucune"
      };
      
      // Appel à l'IA
      const response = await fetch("https://sovereign-bridge.onrender.com/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            { 
              role: "user", 
              content: `Génère une revue hebdomadaire pour Rebecca avec ces données: ${JSON.stringify(context)}. 
              Retourne au format JSON avec: what_moved (string), what_stalled (string), closest_to_cash (string), pending_documents (string), next_week_priorities (array de 3 strings).`
            }
          ]
        })
      });
      
      const data = await response.json();
      let parsed;
      try {
        parsed = JSON.parse(data.reply);
      } catch {
        parsed = {
          what_moved: `${completedTasks.length} tâches complétées cette semaine`,
          what_stalled: `${stalledTasks.length} tâches en attente`,
          closest_to_cash: context.closestToCashName,
          pending_documents: `${pendingDocs.length} documents en attente`,
          next_week_priorities: ["Finaliser les tâches prioritaires", "Revue financière", "Suivi ferme"]
        };
      }
      
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const weekStartStr = weekStart.toISOString().split('T')[0];
      
      const { error } = await supabase.from("weekly_reviews").upsert({
        week_start: weekStartStr,
        what_moved: parsed.what_moved,
        what_stalled: parsed.what_stalled,
        closest_to_cash: parsed.closest_to_cash,
        pending_documents: parsed.pending_documents,
        next_week_priorities: parsed.next_week_priorities
      });
      
      if (!error) {
        fetchLastReview();
      }
    } catch (error) {
      console.error("Erreur génération review:", error);
    } finally {
      setIsGenerating(false);
    }
  }

  const weekRange = (() => {
    const start = new Date();
    start.setDate(start.getDate() - start.getDay());
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return `${start.toLocaleDateString('fr-FR')} - ${end.toLocaleDateString('fr-FR')}`;
  })();

  return (
    <div className="p-8 lg:p-12 h-full flex flex-col overflow-y-auto bg-midnight">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-serif text-gold-500 tracking-tight">Weekly Review</h1>
          <p className="text-gray-500 mt-1 text-sm">{weekRange}</p>
        </div>
        <button
          onClick={generateReview}
          disabled={isGenerating}
          className="bg-gold-500/20 text-gold-500 px-5 py-2 rounded-full text-sm font-medium flex items-center justify-center gap-2 hover:bg-gold-500/30 transition-colors disabled:opacity-50 w-full md:w-auto"
        >
          {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          {isGenerating ? "Génération..." : "Générer la review"}
        </button>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
          <CheckCircle className="w-5 h-5 text-emerald-400 mx-auto mb-2" />
          <div className="text-2xl font-serif text-ivory">{stats.tasksCompleted}</div>
          <div className="text-xs text-gray-500">Tâches faites</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
          <Target className="w-5 h-5 text-blue-400 mx-auto mb-2" />
          <div className="text-2xl font-serif text-ivory">{stats.activeMissions}</div>
          <div className="text-xs text-gray-500">Missions actives</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
          <DollarSign className="w-5 h-5 text-red-400 mx-auto mb-2" />
          <div className="text-2xl font-serif text-red-400">{stats.totalSpent.toLocaleString()} CFA</div>
          <div className="text-xs text-gray-500">Dépenses semaine</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
          <Sparkles className="w-5 h-5 text-yellow-400 mx-auto mb-2" />
          <div className="text-2xl font-serif text-yellow-400">{stats.winsThisWeek}</div>
          <div className="text-xs text-gray-500">Victoires</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
          <Clock className="w-5 h-5 text-orange-400 mx-auto mb-2" />
          <div className="text-2xl font-serif text-orange-400">{stats.tasksTotal - stats.tasksCompleted}</div>
          <div className="text-xs text-gray-500">Restantes</div>
        </div>
      </div>

          {isLoading ? (
            <LoadingSpinner />
          ) : !lastReview && !isGenerating ? (
        <div className="text-center py-12">
          <Calendar className="w-16 h-16 text-gold-500/30 mx-auto mb-4" />
          <p className="text-gray-500">Aucune revue pour cette semaine</p>
          <button
            onClick={generateReview}
            className="mt-4 bg-gold-500 text-midnight px-6 py-2 rounded-full font-medium"
          >
            Générer ma review
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* CE QUI A AVANCÉ */}
          <div className="bg-gradient-to-r from-emerald-500/10 to-transparent border border-emerald-500/20 rounded-2xl p-6">
            <h2 className="text-sm font-serif text-emerald-400 mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              ✅ CE QUI A AVANCÉ
            </h2>
            <p className="text-ivory">{lastReview?.what_moved || "—"}</p>
          </div>

          {/* CE QUI A BLOQUÉ */}
          <div className="bg-gradient-to-r from-red-500/10 to-transparent border border-red-500/20 rounded-2xl p-6">
            <h2 className="text-sm font-serif text-red-400 mb-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              ⚠️ CE QUI A BLOQUÉ
            </h2>
            <p className="text-ivory">{lastReview?.what_stalled || "—"}</p>
          </div>

          {/* PRIORITÉS SEMAINE PROCHAINE */}
          <div className="bg-gradient-to-r from-gold-500/10 to-transparent border border-gold-500/20 rounded-2xl p-6">
            <h2 className="text-sm font-serif text-gold-500 mb-3 flex items-center gap-2">
              <Target className="w-4 h-4" />
              🎯 TOP 3 PRIORITÉS SEMAINE PROCHAINE
            </h2>
            <div className="space-y-2">
              {lastReview?.next_week_priorities?.map((priority, i) => (
                <div key={i} className="flex items-center gap-3 p-2">
                  <div className="w-5 h-5 rounded-full bg-gold-500/20 text-gold-500 flex items-center justify-center text-xs font-bold">
                    {i + 1}
                  </div>
                  <span className="text-ivory">{priority}</span>
                </div>
              ))}
            </div>
          </div>

          {/* GRILLE INFOS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="bg-white/5 border border-white/10 rounded-xl p-5">
              <div className="flex items-center gap-2 text-emerald-400 mb-2">
                <DollarSign className="w-4 h-4" />
                <span className="text-sm font-medium">Plus proche du cash</span>
              </div>
              <p className="text-ivory">{lastReview?.closest_to_cash || "—"}</p>
            </div>
            
            <div className="bg-white/5 border border-white/10 rounded-xl p-5">
              <div className="flex items-center gap-2 text-orange-400 mb-2">
                <FileText className="w-4 h-4" />
                <span className="text-sm font-medium">Documents en attente</span>
              </div>
              <p className="text-ivory">{lastReview?.pending_documents || "—"}</p>
            </div>
          </div>

          {/* RAPPEL FINAL */}
          <div className="text-center pt-4">
            <p className="text-xs text-gray-500">
              💡 Cette revue a été générée le {lastReview && new Date(lastReview.created_at).toLocaleDateString('fr-FR')}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
