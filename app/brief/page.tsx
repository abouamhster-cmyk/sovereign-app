"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";
import { 
  Calendar, Sparkles, Target, Heart, DollarSign, 
  Briefcase, Shield, RefreshCw, Loader2, CheckCircle,
  Clock, AlertCircle, Download
} from "lucide-react";
import { exportToPDF } from "@/lib/exportPDF";

type DailyBrief = {
  id: string;
  date: string;
  top_priorities: string[];
  family_focus: string;
  money_move: string;
  business_move: string;
  stabilization_action: string;
  calm_guidance: string;
  created_at: string;
};

type Task = {
  id: string;
  title: string;
  status: string;
  due_date: string | null;
  priority: string;
};

export default function BriefPage() {
  const [todayBrief, setTodayBrief] = useState<DailyBrief | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [wins, setWins] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchTodayBrief();
    fetchTasks();
    fetchWins();
  }, []);

  async function fetchTodayBrief() {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from("daily_briefs")
      .select("*")
      .eq("date", today)
      .maybeSingle();
    
    setTodayBrief(data);
    setIsLoading(false);
  }

  async function fetchTasks() {
    const { data } = await supabase
      .from("tasks")
      .select("*")
      .eq("status", "today")
      .limit(5);
    setTasks(data || []);
  }

  async function fetchWins() {
    const { data } = await supabase
      .from("wins")
      .select("*")
      .order("date", { ascending: false })
      .limit(3);
    setWins(data || []);
  }

  async function generateBrief() {
    setIsGenerating(true);
    
    try {
      // Récupérer les données contextuelles
      const [missionsRes, tasksRes, spendingRes, familyRes] = await Promise.all([
        supabase.from("missions").select("*").eq("status", "active"),
        supabase.from("tasks").select("*").neq("status", "done").limit(10),
        supabase.from("spending").select("amount").limit(50),
        supabase.from("family_events").select("*").gte("date", new Date().toISOString().split('T')[0])
      ]);
      
      const context = {
        missions: missionsRes.data || [],
        tasks: tasksRes.data || [],
        totalSpending: (spendingRes.data || []).reduce((sum, s) => sum + (s.amount || 0), 0),
        familyEvents: familyRes.data || []
      };
      
      // Appel à l'IA pour générer le brief
      const response = await fetch("https://sovereign-bridge.onrender.com/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            { 
              role: "user", 
              content: `Génère un brief quotidien pour Rebecca avec ces données: ${JSON.stringify(context)}. 
              Retourne au format JSON avec: top_priorities (3 strings), family_focus, money_move, business_move, stabilization_action, calm_guidance.`
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
          top_priorities: ["Vérifier les tâches du jour", "Contacter l'équipe ferme", "Revue financière"],
          family_focus: "Temps avec les enfants ce soir",
          money_move: "Vérifier les dépenses du mois",
          business_move: "Avancer sur Love & Fire",
          stabilization_action: "Pause de 10 minutes",
          calm_guidance: "Une chose à la fois. Respire."
        };
      }
      
      const today = new Date().toISOString().split('T')[0];
      const { error } = await supabase.from("daily_briefs").upsert({
        date: today,
        top_priorities: parsed.top_priorities,
        family_focus: parsed.family_focus,
        money_move: parsed.money_move,
        business_move: parsed.business_move,
        stabilization_action: parsed.stabilization_action,
        calm_guidance: parsed.calm_guidance
      });
      
      if (!error) {
        fetchTodayBrief();
      }
    } catch (error) {
      console.error("Erreur génération brief:", error);
    } finally {
      setIsGenerating(false);
    }
  }

  const today = new Date().toLocaleDateString('fr-FR', { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  });

  return (
    <div className="p-8 lg:p-12 h-full flex flex-col overflow-y-auto bg-midnight">
      {/* HEADER AVEC BOUTON EXPORT */}
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-4xl font-serif text-gold-500 tracking-tight">Daily Brief</h1>
            <p className="text-gray-500 mt-2 italic font-light">{today}</p>
          </div>
          {todayBrief && (
            <button
              onClick={() => exportToPDF("daily-brief-content", `brief-${new Date().toISOString().split('T')[0]}`)}
              className="bg-white/10 p-2 rounded-full hover:bg-white/20 transition-colors"
              title="Exporter en PDF"
            >
              <Download className="w-5 h-5" />
            </button>
          )}
        </div>
        <button
          onClick={generateBrief}
          disabled={isGenerating}
          className="bg-gold-500/20 text-gold-500 px-5 py-2 rounded-full text-sm font-medium flex items-center gap-2 hover:bg-gold-500/30 transition-colors disabled:opacity-50"
        >
          {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          {isGenerating ? "Génération..." : "Rafraîchir"}
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-500">Chargement...</div>
      ) : !todayBrief && !isGenerating ? (
        <div className="text-center py-12">
          <Calendar className="w-16 h-16 text-gold-500/30 mx-auto mb-4" />
          <p className="text-gray-500">Aucun brief pour aujourd'hui</p>
          <button
            onClick={generateBrief}
            className="mt-4 bg-gold-500 text-midnight px-6 py-2 rounded-full font-medium"
          >
            Générer mon brief
          </button>
        </div>
      ) : (
        /* ZONE À EXPORTER EN PDF */
        <div id="daily-brief-content">
          <div className="space-y-6">
            {/* TOP 3 PRIORITÉS */}
            <div className="bg-gradient-to-r from-gold-500/10 to-transparent border border-gold-500/20 rounded-2xl p-6">
              <h2 className="text-sm font-serif text-gold-500 mb-4 flex items-center gap-2">
                <Target className="w-4 h-4" />
                🎯 TOP 3 PRIORITÉS AUJOURD'HUI
              </h2>
              <div className="space-y-3">
                {todayBrief?.top_priorities?.map((priority, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-midnight/50 rounded-xl">
                    <div className="w-6 h-6 rounded-full bg-gold-500/20 text-gold-500 flex items-center justify-center text-sm font-bold">
                      {i + 1}
                    </div>
                    <span className="text-ivory">{priority}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* GRILLE ACTIONS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                <div className="flex items-center gap-2 text-pink-400 mb-3">
                  <Heart className="w-5 h-5" />
                  <span className="text-sm font-medium">Famille</span>
                </div>
                <p className="text-ivory">{todayBrief?.family_focus || "—"}</p>
              </div>
              
              <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                <div className="flex items-center gap-2 text-emerald-400 mb-3">
                  <DollarSign className="w-5 h-5" />
                  <span className="text-sm font-medium">Argent</span>
                </div>
                <p className="text-ivory">{todayBrief?.money_move || "—"}</p>
              </div>
              
              <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                <div className="flex items-center gap-2 text-blue-400 mb-3">
                  <Briefcase className="w-5 h-5" />
                  <span className="text-sm font-medium">Business</span>
                </div>
                <p className="text-ivory">{todayBrief?.business_move || "—"}</p>
              </div>
              
              <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                <div className="flex items-center gap-2 text-purple-400 mb-3">
                  <Shield className="w-5 h-5" />
                  <span className="text-sm font-medium">Stabilisation</span>
                </div>
                <p className="text-ivory">{todayBrief?.stabilization_action || "—"}</p>
              </div>
            </div>

            {/* CALM GUIDANCE */}
            <div className="bg-gold-500/5 border border-gold-500/20 rounded-2xl p-6 text-center">
              <Sparkles className="w-6 h-6 text-gold-500 mx-auto mb-3" />
              <p className="text-ivory italic">"{todayBrief?.calm_guidance || "Respire. Une chose à la fois."}"</p>
            </div>

            {/* TÂCHES DU JOUR & VICTOIRES RÉCENTES */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                <h3 className="text-sm font-serif text-gold-500 mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Tâches programmées aujourd'hui
                </h3>
                {tasks.length > 0 ? (
                  <div className="space-y-2">
                    {tasks.map(task => (
                      <div key={task.id} className="flex items-center gap-2 p-2 bg-midnight/50 rounded-lg">
                        <div className={`w-2 h-2 rounded-full ${task.priority === "critical" ? "bg-red-500" : task.priority === "high" ? "bg-orange-500" : "bg-gold-500"}`} />
                        <span className="text-sm text-gray-300">{task.title}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">Aucune tâche planifiée</p>
                )}
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                <h3 className="text-sm font-serif text-gold-500 mb-3 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Dernières victoires
                </h3>
                {wins.length > 0 ? (
                  <div className="space-y-2">
                    {wins.map(win => (
                      <div key={win.id} className="flex items-center gap-2 p-2 bg-midnight/50 rounded-lg">
                        <span className="text-lg">{win.celebration_emoji || "🎉"}</span>
                        <span className="text-sm text-gray-300">{win.title}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">Ajoute tes premières victoires ✨</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}