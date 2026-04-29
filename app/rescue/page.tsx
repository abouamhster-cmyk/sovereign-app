"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import LoadingSpinner from "@/components/LoadingSpinner";
import { motion } from "framer-motion";
import { 
  ShieldAlert, Heart, CheckCircle, Clock, 
  Target, Sparkles, RefreshCw, Loader2,
  Moon, Sun, AlertCircle, TrendingUp, Calendar,
  Briefcase, DollarSign, Users, Sprout, FileText
} from "lucide-react";
import Link from "next/link";

type Task = {
  id: string;
  title: string;
  status: string;
  due_date: string | null;
  area: string;
};

type Mission = {
  id: string;
  name: string;
  status: string;
};

type Document = {
  id: string;
  name: string;
  status: string;
  due_date: string | null;
};

type Win = {
  id: string;
  title: string;
  celebration_emoji: string | null;
  date: string;
};

type LoadAnalysis = {
  level: "low" | "medium" | "high" | "critical";
  score: number;
  message: string;
  recommendations: string[];
  quickWins: string[];
};

export default function RescuePage() {
  const [urgentTasks, setUrgentTasks] = useState<Task[]>([]);
  const [todayTasks, setTodayTasks] = useState<Task[]>([]);
  const [activeMissions, setActiveMissions] = useState<Mission[]>([]);
  const [pendingDocs, setPendingDocs] = useState<Document[]>([]);
  const [recentWins, setRecentWins] = useState<Win[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadAnalysis, setLoadAnalysis] = useState<LoadAnalysis | null>(null);
  const [releaseNote, setReleaseNote] = useState("");
  const [savedRelease, setSavedRelease] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setIsLoading(true);
    await Promise.all([
      fetchUrgentTasks(),
      fetchTodayTasks(),
      fetchActiveMissions(),
      fetchPendingDocs(),
      fetchRecentWins(),
      analyzeLoad()
    ]);
    setIsLoading(false);
  }

  async function fetchUrgentTasks() {
    // Remplacer priority par status pour les tâches urgentes
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("status", "today")
      .limit(10);
    
    if (error) console.error("Erreur fetchUrgentTasks:", error);
    setUrgentTasks(data || []);
  }

  async function fetchTodayTasks() {
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("status", "today")
      .limit(5);
    
    if (error) console.error("Erreur fetchTodayTasks:", error);
    setTodayTasks(data || []);
  }

  async function fetchActiveMissions() {
    const { data, error } = await supabase
      .from("missions")
      .select("*")
      .eq("status", "active");
    
    if (error) console.error("Erreur fetchActiveMissions:", error);
    setActiveMissions(data || []);
  }

  async function fetchPendingDocs() {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .neq("status", "approved")
      .not("due_date", "is", null)
      .lt("due_date", today);
    
    if (error) console.error("Erreur fetchPendingDocs:", error);
    setPendingDocs(data || []);
  }

  async function fetchRecentWins() {
    const { data, error } = await supabase
      .from("wins")
      .select("*")
      .order("date", { ascending: false })
      .limit(3);
    
    if (error) console.error("Erreur fetchRecentWins:", error);
    setRecentWins(data || []);
  }

  async function analyzeLoad() {
    setIsAnalyzing(true);
    
    try {
      // Récupérer les données pour l'analyse
      const [tasksRes, missionsRes, docsRes] = await Promise.all([
        supabase.from("tasks").select("*").neq("status", "done"),
        supabase.from("missions").select("*").eq("status", "active"),
        supabase.from("documents").select("*").neq("status", "approved")
      ]);
      
      const allTasks = tasksRes.data || [];
      const missions = missionsRes.data || [];
      const docs = docsRes.data || [];
      
      // Calcul du score de charge (simplifié)
      let score = 0;
      score += (allTasks.filter(t => t.status === "today").length * 10);
      score += (allTasks.filter(t => t.status === "in_progress").length * 5);
      score += (missions.length * 3);
      score += (docs.filter(d => d.due_date && new Date(d.due_date) < new Date()).length * 8);
      score += (urgentTasks.length * 5);
      
      // Déterminer le niveau
      let level: "low" | "medium" | "high" | "critical";
      let message = "";
      let recommendations: string[] = [];
      let quickWins: string[] = [];
      
      if (score >= 50) {
        level = "critical";
        message = "⚠️⚠️⚠️ CHARGE CRITIQUE ⚠️⚠️⚠️\n\nTu es en surcharge sévère. Active immédiatement le mode survie. Ralentis. Respire. Rien n'est aussi urgent que ta santé mentale.";
        recommendations = [
          "Annule ou reporte TOUT ce qui n'est pas vital",
          "Délègue ce que tu peux déléguer",
          "Prends 30 minutes pour toi MAINTENANT",
          "Ne réponds à aucun message non urgent"
        ];
        quickWins = [
          "Identifier la VRAIE urgence",
          "Prendre 5 respirations profondes",
          "Boire un verre d'eau",
          "Écrire ce qui te stresse"
        ];
      } else if (score >= 30) {
        level = "high";
        message = "🟡 Charge élevée. Tu portes beaucoup. Ralentis, priorise, respire. Une chose à la fois.";
        recommendations = [
          "Identifie les 3 tâches VRAIMENT critiques du jour",
          "Ignore le reste pour l'instant",
          "Fais une pause de 10 minutes"
        ];
        quickWins = [
          "Faire la tâche la plus rapide",
          "Prendre 5 minutes pour toi",
          "Répondre à l'email urgent"
        ];
      } else if (score >= 15) {
        level = "medium";
        message = "🟢 Charge modérée. Tu gères, mais reste vigilante. Priorise et avance sereinement.";
        recommendations = [
          "Avance sur tes 3 priorités du jour",
          "Garde une tâche de backup",
          "Prends une micro-pause toutes les heures"
        ];
        quickWins = [
          "Faire la tâche la plus satisfaisante",
          "Envoyer ce message en attente",
          "Ranger un dossier"
        ];
      } else {
        level = "low";
        message = "🌿 Charge légère. Profite-en pour avancer sereinement sur ce qui compte vraiment.";
        recommendations = [
          "Utilise cette énergie pour avancer sur un projet important",
          "Prends de l'avance sur la semaine",
          "Fais une victoire rapide"
        ];
        quickWins = [
          "Démarrer le projet important",
          "Faire une tâche satisfaisante",
          "Planifier la semaine"
        ];
      }
      
      setLoadAnalysis({ level, score, message, recommendations, quickWins });
    } catch (error) {
      console.error("Erreur analyzeLoad:", error);
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function saveReleaseNote() {
    if (!releaseNote.trim()) return;
    
    setIsSaving(true);
    const { error } = await supabase.from("resets").insert({
      notes: releaseNote,
      type: "release_note",
      state: loadAnalysis?.level || "unknown",
      what_helped: "Écriture de libération mentale"
    });
    
    if (!error) {
      setSavedRelease(releaseNote);
      setReleaseNote("");
    }
    setIsSaving(false);
  }

  const getLevelColor = () => {
    switch(loadAnalysis?.level) {
      case "critical": return "border-red-500 bg-red-950/20";
      case "high": return "border-orange-500 bg-orange-950/20";
      case "medium": return "border-yellow-500 bg-yellow-950/20";
      default: return "border-emerald-500 bg-emerald-950/20";
    }
  };

  const getLevelIcon = () => {
    switch(loadAnalysis?.level) {
      case "critical": return <AlertCircle className="w-8 h-8 text-red-400" />;
      case "high": return <TrendingUp className="w-8 h-8 text-orange-400" />;
      case "medium": return <Clock className="w-8 h-8 text-yellow-400" />;
      default: return <CheckCircle className="w-8 h-8 text-emerald-400" />;
    }
  };

  return (
    <div className="h-full flex flex-col overflow-y-auto bg-midnight">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
  <div>
    <div className="flex items-center gap-3 mb-2">
      <ShieldAlert className="w-8 h-8 text-red-400" />
      <h1 className="text-3xl md:text-4xl font-serif text-red-400 tracking-tight">Rescue Mode</h1>
    </div>
    <p className="text-gray-500 text-sm">
      Analyse de charge et recentrage stratégique
    </p>
  </div>
  <button
    onClick={analyzeLoad}
    disabled={isAnalyzing}
    className="bg-white/5 border border-white/10 px-4 py-2 rounded-full text-sm flex items-center justify-center gap-2 hover:bg-white/10 transition-colors disabled:opacity-50 w-full md:w-auto"
  >
    {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
    Réanalyser
  </button>
</div>

      {/* ANALYSE DE CHARGE */}
      {loadAnalysis && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`border-2 rounded-3xl p-6 mb-8 ${getLevelColor()}`}
        >
          <div className="flex items-start gap-4">
            {getLevelIcon()}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <span className="text-sm font-mono bg-white/10 px-2 py-1 rounded">
                  Score: {loadAnalysis.score}/100
                </span>
                <span className={`text-sm px-3 py-1 rounded-full ${
                  loadAnalysis.level === "critical" ? "bg-red-500/20 text-red-400" :
                  loadAnalysis.level === "high" ? "bg-orange-500/20 text-orange-400" :
                  loadAnalysis.level === "medium" ? "bg-yellow-500/20 text-yellow-400" :
                  "bg-emerald-500/20 text-emerald-400"
                }`}>
                  {loadAnalysis.level === "critical" ? "⚠️ CRITIQUE" :
                   loadAnalysis.level === "high" ? "🔴 CHARGE ÉLEVÉE" :
                   loadAnalysis.level === "medium" ? "🟡 CHARGE MODÉRÉE" :
                   "🟢 CHARGE LÉGÈRE"}
                </span>
              </div>
              <p className="text-ivory whitespace-pre-line">{loadAnalysis.message}</p>
              
              <div className="mt-4">
                <p className="text-sm text-gold-500 mb-2">📋 Recommandations :</p>
                <ul className="space-y-1">
                  {loadAnalysis.recommendations.map((rec, i) => (
                    <li key={i} className="text-sm text-gray-300 flex items-center gap-2">
                      <span className="text-gold-500">•</span> {rec}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </motion.div>
      )}

       {isLoading ? (
        <LoadingSpinner />
      ) : (
        <>
          {/* STATS DE CHARGE */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
              <AlertCircle className="w-5 h-5 text-red-400 mx-auto mb-2" />
              <div className="text-2xl font-serif text-red-400">{urgentTasks.length}</div>
              <div className="text-xs text-gray-500">Tâches du jour</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
              <Target className="w-5 h-5 text-blue-400 mx-auto mb-2" />
              <div className="text-2xl font-serif text-blue-400">{activeMissions.length}</div>
              <div className="text-xs text-gray-500">Missions actives</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
              <FileText className="w-5 h-5 text-orange-400 mx-auto mb-2" />
              <div className="text-2xl font-serif text-orange-400">{pendingDocs.length}</div>
              <div className="text-xs text-gray-500">Documents en retard</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
              <Clock className="w-5 h-5 text-yellow-400 mx-auto mb-2" />
              <div className="text-2xl font-serif text-yellow-400">{todayTasks.length}</div>
              <div className="text-xs text-gray-500">Tâches aujourd'hui</div>
            </div>
          </div>

          {/* TÂCHES URGENTES */}
          {urgentTasks.length > 0 && (
            <div className="bg-red-950/20 border border-red-500/30 rounded-2xl p-6 mb-8">
              <h2 className="text-lg font-serif text-red-400 mb-4 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                ⚠️ TÂCHES DU JOUR ({urgentTasks.length})
              </h2>
              <div className="space-y-3">
                {urgentTasks.map(task => (
                  <div key={task.id} className="flex items-center justify-between p-3 bg-midnight rounded-xl border border-red-500/30">
                    <div>
                      <span className="text-ivory text-sm">{task.title}</span>
                      {task.area && (
                        <span className="text-xs text-gray-500 ml-2">({task.area})</span>
                      )}
                    </div>
                    {task.due_date && (
                      <span className="text-xs text-red-400">
                        ⚠️ {new Date(task.due_date).toLocaleDateString('fr-FR')}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* QUICK WINS */}
          {loadAnalysis?.quickWins && (
            <div className="bg-gold-500/10 border border-gold-500/20 rounded-2xl p-6 mb-8">
              <h2 className="text-lg font-serif text-gold-500 mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                Quick wins (moins de 5 min)
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {loadAnalysis.quickWins.map((win, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 hover:bg-white/5 rounded-lg transition-colors">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <span className="text-gray-300 text-sm">{win}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* LIBÉRATION MENTALE */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8">
            <h2 className="text-lg font-serif text-gold-500 mb-3 flex items-center gap-2">
              <Heart className="w-5 h-5" />
              Libère ce que tu portes
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Écris ce que tu veux lâcher pour ce soir. Cela ne disparaîtra pas, mais tu arrêtes de le porter mentalement.
            </p>
            
            <div className="flex flex-col gap-3">
              <textarea
                value={releaseNote}
                onChange={(e) => setReleaseNote(e.target.value)}
                placeholder="Je libère... la culpabilité de ne pas avoir fini X... l'inquiétude pour Y... la pression de Z..."
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-gold-500 text-ivory placeholder:text-gray-600 resize-none"
                rows={3}
              />
              <button
                onClick={saveReleaseNote}
                disabled={!releaseNote.trim() || isSaving}
                className="self-end bg-gold-500 text-midnight px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 hover:bg-gold-400 transition-colors disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Heart className="w-4 h-4" />}
                Libérer
              </button>
            </div>
            
            {savedRelease && (
              <div className="mt-4 p-3 bg-midnight/50 rounded-xl">
                <p className="text-xs text-gold-500 mb-1">✍️ Dernière libération :</p>
                <p className="text-sm text-gray-400 italic">{savedRelease}</p>
              </div>
            )}
          </div>

          {/* VICTOIRES RÉCENTES */}
          {recentWins.length > 0 && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8">
              <h2 className="text-lg font-serif text-gold-500 mb-4 flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Ce que tu as déjà accompli
              </h2>
              <div className="space-y-2">
                {recentWins.map(win => (
                  <div key={win.id} className="flex items-center gap-2 p-2 bg-midnight/30 rounded-lg">
                    <span className="text-xl">{win.celebration_emoji || "🎉"}</span>
                    <span className="text-gray-300 text-sm">{win.title}</span>
                    {win.date && (
                      <span className="text-xs text-gray-500 ml-auto">{new Date(win.date).toLocaleDateString('fr-FR')}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* BOUTON RETOUR */}
          <div className="text-center">
            <Link 
              href="/" 
              className="inline-flex items-center gap-2 px-6 py-3 bg-gold-500 text-midnight rounded-full font-medium hover:bg-gold-400 transition-colors"
            >
              <Sun className="w-4 h-4" />
              Retour au commandement
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
