"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import LoadingSpinner from "@/components/LoadingSpinner";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ShieldAlert, Heart, CheckCircle, Clock, 
  Target, Sparkles, RefreshCw, Loader2,
  Moon, Sun, AlertCircle, TrendingUp, Calendar,
  Briefcase, DollarSign, Users, Sprout, FileText, Brain,
  ArrowRight, X, Trophy, Plus, Trash2, Edit2,
  Star, Award, LayoutGrid, ListTodo, Smile
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { exportWinsToPDF } from "@/lib/exportPDF";

const API_URL = "https://sovereign-bridge.onrender.com";

// =====================================================
// TYPES
// =====================================================

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
  category: "business" | "family" | "personal" | "money" | "health" | "farm" | "other";
  date: string;
  celebration_emoji: string | null;
  notes: string | null;
  created_at: string;
};

type LoadAnalysis = {
  level: "low" | "medium" | "high" | "critical";
  score: number;
  message: string;
  recommendations: string[];
  quickWins: string[];
};

type OverloadData = {
  overload_score: number;
  level: string;
  message: string;
  reasons: string[];
  rescue_actions: {
    type: string;
    title: string;
    task_id?: string;
    task_title?: string;
    duration?: number;
    url?: string;
  }[];
  stats: {
    urgent_tasks: number;
    overdue_tasks: number;
    overdue_docs: number;
    stale_missions: number;
    pending_brain_dumps: number;
  };
  current_mood: string | null;
};

// =====================================================
// CONFIGURATIONS
// =====================================================

const categoryConfig = {
  business: { label: "💼 Business", icon: Briefcase, color: "bg-blue-500/20 text-blue-400", emoji: "🚀" },
  family: { label: "👨‍👩‍👧‍👦 Famille", icon: Heart, color: "bg-pink-500/20 text-pink-400", emoji: "💖" },
  personal: { label: "🧘 Personnel", icon: Smile, color: "bg-purple-500/20 text-purple-400", emoji: "✨" },
  money: { label: "💰 Argent", icon: DollarSign, color: "bg-emerald-500/20 text-emerald-400", emoji: "💵" },
  health: { label: "🏥 Santé", icon: Heart, color: "bg-red-500/20 text-red-400", emoji: "💪" },
  farm: { label: "🌾 Ferme", icon: Sprout, color: "bg-green-500/20 text-green-400", emoji: "🌱" },
  other: { label: "🎉 Autre", icon: Star, color: "bg-gray-500/20 text-gray-400", emoji: "🎯" }
};

const celebrationEmojis = [
  "🎉", "👑", "⭐", "🌟", "💪", "🔥", "✨", "🏆", 
  "💖", "🚀", "🌱", "🦋", "🌈", "⚡", "🎯", "🏅"
];

export default function RescueWinsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"rescue" | "wins">("rescue");
  
  // ========== ÉTATS RESCUE ==========
  const [urgentTasks, setUrgentTasks] = useState<Task[]>([]);
  const [todayTasks, setTodayTasks] = useState<Task[]>([]);
  const [activeMissions, setActiveMissions] = useState<Mission[]>([]);
  const [pendingDocs, setPendingDocs] = useState<Document[]>([]);
  const [recentWins, setRecentWins] = useState<Win[]>([]);
  const [isRescueLoading, setIsRescueLoading] = useState(true);
  const [loadAnalysis, setLoadAnalysis] = useState<LoadAnalysis | null>(null);
  const [overloadData, setOverloadData] = useState<OverloadData | null>(null);
  const [releaseNote, setReleaseNote] = useState("");
  const [savedRelease, setSavedRelease] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showRescueActions, setShowRescueActions] = useState(true);

  // ========== ÉTATS WINS ==========
  const [wins, setWins] = useState<Win[]>([]);
  const [isWinsLoading, setIsWinsLoading] = useState(true);
  const [showWinForm, setShowWinForm] = useState(false);
  const [editingWinId, setEditingWinId] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterMonth, setFilterMonth] = useState<string>("all");
  
  const [winFormData, setWinFormData] = useState({
    title: "",
    category: "personal" as Win["category"],
    date: new Date().toISOString().split('T')[0],
    celebration_emoji: "🎉",
    notes: ""
  });

  const scrollToForm = () => {
    setTimeout(() => {
      const formElement = document.getElementById('form-container');
      if (formElement) {
        formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 150);
  };

  // ========== CHARGEMENT DONNÉES RESCUE ==========
  useEffect(() => {
    fetchAllData();
  }, []);

  async function fetchAllData() {
    setIsRescueLoading(true);
    setIsWinsLoading(true);
    await Promise.all([
      fetchUrgentTasks(),
      fetchTodayTasks(),
      fetchActiveMissions(),
      fetchPendingDocs(),
      fetchRecentWinsForRescue(),
      analyzeLoad(),
      fetchOverloadDetection(),
      fetchWins()
    ]);
    setIsRescueLoading(false);
    setIsWinsLoading(false);
  }

  async function fetchUrgentTasks() {
    const { data } = await supabase.from("tasks").select("*").eq("status", "today").limit(10);
    setUrgentTasks(data || []);
  }

  async function fetchTodayTasks() {
    const { data } = await supabase.from("tasks").select("*").eq("status", "today").limit(5);
    setTodayTasks(data || []);
  }

  async function fetchActiveMissions() {
    const { data } = await supabase.from("missions").select("*").eq("status", "active");
    setActiveMissions(data || []);
  }

  async function fetchPendingDocs() {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase.from("documents").select("*").neq("status", "approved").not("due_date", "is", null).lt("due_date", today);
    setPendingDocs(data || []);
  }

  async function fetchRecentWinsForRescue() {
    const { data } = await supabase.from("wins").select("*").order("date", { ascending: false }).limit(3);
    setRecentWins(data || []);
  }

  async function fetchOverloadDetection() {
    try {
      const response = await fetch(`${API_URL}/api/rescue/detect-overload`);
      const data = await response.json();
      if (data.success) setOverloadData(data);
    } catch (error) {
      console.error("Erreur détection surcharge:", error);
    }
  }

  async function analyzeLoad() {
    setIsAnalyzing(true);
    try {
      const [tasksRes, missionsRes, docsRes] = await Promise.all([
        supabase.from("tasks").select("*").neq("status", "done"),
        supabase.from("missions").select("*").eq("status", "active"),
        supabase.from("documents").select("*").neq("status", "approved")
      ]);
      
      const allTasks = tasksRes.data || [];
      const missions = missionsRes.data || [];
      const docs = docsRes.data || [];
      
      let score = 0;
      score += (allTasks.filter(t => t.status === "today").length * 10);
      score += (allTasks.filter(t => t.status === "in_progress").length * 5);
      score += (missions.length * 3);
      score += (docs.filter(d => d.due_date && new Date(d.due_date) < new Date()).length * 8);
      score += (urgentTasks.length * 5);
      
      let level: "low" | "medium" | "high" | "critical";
      let message = "";
      let recommendations: string[] = [];
      let quickWins: string[] = [];
      
      if (score >= 50) {
        level = "critical";
        message = "⚠️⚠️⚠️ CHARGE CRITIQUE ⚠️⚠️⚠️\n\nTu es en surcharge sévère. Active immédiatement le mode survie.";
        recommendations = ["Annule ou reporte TOUT ce qui n'est pas vital", "Délègue ce que tu peux déléguer", "Prends 30 minutes pour toi MAINTENANT"];
        quickWins = ["Identifier la VRAIE urgence", "Prendre 5 respirations profondes", "Boire un verre d'eau"];
      } else if (score >= 30) {
        level = "high";
        message = "🟡 Charge élevée. Tu portes beaucoup. Ralentis, priorise, respire.";
        recommendations = ["Identifie les 3 tâches VRAIMENT critiques du jour", "Ignore le reste pour l'instant", "Fais une pause de 10 minutes"];
        quickWins = ["Faire la tâche la plus rapide", "Prendre 5 minutes pour toi", "Répondre à l'email urgent"];
      } else if (score >= 15) {
        level = "medium";
        message = "🟢 Charge modérée. Tu gères, mais reste vigilante.";
        recommendations = ["Avance sur tes 3 priorités du jour", "Garde une tâche de backup", "Prends une micro-pause toutes les heures"];
        quickWins = ["Faire la tâche la plus satisfaisante", "Envoyer ce message en attente", "Ranger un dossier"];
      } else {
        level = "low";
        message = "🌿 Charge légère. Profite-en pour avancer sereinement.";
        recommendations = ["Utilise cette énergie pour avancer sur un projet important", "Prends de l'avance sur la semaine", "Fais une victoire rapide"];
        quickWins = ["Démarrer le projet important", "Faire une tâche satisfaisante", "Planifier la semaine"];
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
      toast.success("✨ Libération enregistrée");
    } else {
      toast.error("Erreur lors de l'enregistrement");
    }
    setIsSaving(false);
  }

  async function handleIAmBetter() {
    await fetch(`${API_URL}/api/mood/save`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mood: "bien" })
    });
    toast.success("🌿 Content de te sentir mieux. Retour au commandement.", { duration: 5000 });
    setTimeout(() => router.push("/"), 1500);
  }

  async function executeAction(action: OverloadData["rescue_actions"][0]) {
    switch (action.type) {
      case "focus_task":
        router.push(action.task_id ? `/tasks?highlight=${action.task_id}` : "/tasks");
        break;
      case "breathing":
        toast.info("🌬️ Respire profondément... Inspire (4s) → Retiens (4s) → Expire (6s).", { duration: 10000 });
        break;
      case "reset":
        toast.info(`⏰ Pause de ${action.duration} minutes recommandée`, { duration: 8000 });
        break;
      case "brain_dump":
        router.push("/inbox");
        break;
      case "chat":
        router.push("/chat?mode=parle-moi");
        break;
      default:
        if (action.url) router.push(action.url);
    }
  }

  // ========== FONCTIONS WINS ==========
  async function fetchWins() {
    const { data } = await supabase.from("wins").select("*").order("date", { ascending: false });
    setWins(data || []);
  }

  async function saveWin() {
    const data = {
      title: winFormData.title,
      category: winFormData.category,
      date: winFormData.date,
      celebration_emoji: winFormData.celebration_emoji,
      notes: winFormData.notes || null
    };
    
    let error;
    if (editingWinId) {
      const result = await supabase.from("wins").update(data).eq("id", editingWinId);
      error = result.error;
    } else {
      const result = await supabase.from("wins").insert(data);
      error = result.error;
    }
    
    if (!error) {
      resetWinForm();
      fetchWins();
      fetchRecentWinsForRescue();
      toast.success(editingWinId ? "Victoire modifiée" : "Victoire ajoutée");
    } else {
      toast.error("Erreur: " + error.message);
    }
  }

  async function deleteWin(id: string) {
    if (confirm("Supprimer cette victoire ?")) {
      const { error } = await supabase.from("wins").delete().eq("id", id);
      if (!error) {
        fetchWins();
        fetchRecentWinsForRescue();
        toast.success("Victoire supprimée");
      }
    }
  }

  function editWin(win: Win) {
    setWinFormData({
      title: win.title,
      category: win.category,
      date: win.date,
      celebration_emoji: win.celebration_emoji || "🎉",
      notes: win.notes || ""
    });
    setEditingWinId(win.id);
    setShowWinForm(true);
    setActiveTab("wins");
    scrollToForm();
  }

  function resetWinForm() {
    setShowWinForm(false);
    setEditingWinId(null);
    setWinFormData({
      title: "",
      category: "personal",
      date: new Date().toISOString().split('T')[0],
      celebration_emoji: "🎉",
      notes: ""
    });
  }

  // ========== FILTRES WINS ==========
  const availableMonths = [...new Set(wins.map(w => 
    new Date(w.date).toLocaleString('fr-FR', { month: 'long', year: 'numeric' })
  ))];

  const filteredWins = wins.filter(w => {
    if (filterCategory !== "all" && w.category !== filterCategory) return false;
    if (filterMonth !== "all") {
      const month = new Date(w.date).toLocaleString('fr-FR', { month: 'long', year: 'numeric' });
      if (month !== filterMonth) return false;
    }
    return true;
  });

  const winStats = {
    total: wins.length,
    thisMonth: wins.filter(w => {
      const now = new Date();
      const winDate = new Date(w.date);
      return winDate.getMonth() === now.getMonth() && winDate.getFullYear() === now.getFullYear();
    }).length,
    byCategory: Object.keys(categoryConfig).map(cat => ({
      category: cat,
      count: wins.filter(w => w.category === cat).length,
      label: categoryConfig[cat as keyof typeof categoryConfig].label
    })).filter(c => c.count > 0)
  };

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

  if (isRescueLoading && isWinsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-gold-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-y-auto bg-midnight p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto w-full">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <ShieldAlert className="w-8 h-8 text-red-400" />
              <Trophy className="w-8 h-8 text-gold-500" />
              <h1 className="text-3xl md:text-4xl font-serif text-gold-500 tracking-tight">
                Rescue & Wins
              </h1>
            </div>
            <p className="text-gray-500 text-sm">
              Gestion de crise et célébration des victoires
            </p>
          </div>
          <div className="flex gap-3">
            {activeTab === "wins" && (
              <button
                onClick={() => exportWinsToPDF(filteredWins)}
                className="bg-white/10 p-2 rounded-full hover:bg-white/20 transition-colors"
                title="Exporter les victoires en PDF"
              >
                <Download className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* TABS */}
        <div className="flex flex-wrap gap-2 border-b border-white/10 mb-6 overflow-x-auto pb-2">
          <button
            onClick={() => setActiveTab("rescue")}
            className={`px-4 py-2 text-sm flex items-center gap-2 transition-colors rounded-lg ${
              activeTab === "rescue" ? "bg-gold-500/20 text-gold-500" : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <ShieldAlert className="w-4 h-4" /> Rescue Mode
          </button>
          <button
            onClick={() => setActiveTab("wins")}
            className={`px-4 py-2 text-sm flex items-center gap-2 transition-colors rounded-lg ${
              activeTab === "wins" ? "bg-gold-500/20 text-gold-500" : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Trophy className="w-4 h-4" /> Wins & Truths
          </button>
        </div>

        {/* ==================== ONGLET RESCUE MODE ==================== */}
        {activeTab === "rescue" && (
          <div>
            {/* ALERTE SURCHARGE */}
            {overloadData && overloadData.level !== "low" && showRescueActions && (
              <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className={`rounded-xl p-5 mb-6 border-2 ${overloadData.level === "critical" ? "bg-red-950/30 border-red-500/50" : "bg-orange-950/30 border-orange-500/50"}`}>
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <AlertCircle className={`w-5 h-5 ${overloadData.level === "critical" ? "text-red-400" : "text-orange-400"}`} />
                    <h3 className="text-sm font-medium text-ivory">{overloadData.level === "critical" ? "⚠️ SURCHARGE DÉTECTÉE" : "🟡 CHARGE ÉLEVÉE DÉTECTÉE"}</h3>
                  </div>
                  <button onClick={() => setShowRescueActions(false)} className="text-gray-500 hover:text-gray-400"><X className="w-4 h-4" /></button>
                </div>
                <p className="text-sm text-ivory mb-3">{overloadData.message}</p>
                {overloadData.reasons && overloadData.reasons.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {overloadData.reasons.map((reason, idx) => <span key={idx} className="text-xs px-2 py-1 bg-white/5 rounded-full text-gray-400">{reason}</span>)}
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  {overloadData.rescue_actions?.map((action, idx) => (
                    <button key={idx} onClick={() => executeAction(action)} className="px-3 py-1.5 bg-white/10 rounded-full text-xs text-gray-300 hover:bg-white/20">{action.title}</button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ANALYSE DE CHARGE */}
            {loadAnalysis && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={`border-2 rounded-3xl p-6 mb-8 ${getLevelColor()}`}>
                <div className="flex items-start gap-4">
                  {getLevelIcon()}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <span className="text-sm font-mono bg-white/10 px-2 py-1 rounded">Score: {loadAnalysis.score}/100</span>
                      <span className={`text-sm px-3 py-1 rounded-full ${loadAnalysis.level === "critical" ? "bg-red-500/20 text-red-400" : loadAnalysis.level === "high" ? "bg-orange-500/20 text-orange-400" : loadAnalysis.level === "medium" ? "bg-yellow-500/20 text-yellow-400" : "bg-emerald-500/20 text-emerald-400"}`}>
                        {loadAnalysis.level === "critical" ? "⚠️ CRITIQUE" : loadAnalysis.level === "high" ? "🔴 CHARGE ÉLEVÉE" : loadAnalysis.level === "medium" ? "🟡 CHARGE MODÉRÉE" : "🟢 CHARGE LÉGÈRE"}
                      </span>
                    </div>
                    <p className="text-ivory whitespace-pre-line">{loadAnalysis.message}</p>
                    <div className="mt-4">
                      <p className="text-sm text-gold-500 mb-2">📋 Recommandations :</p>
                      <ul className="space-y-1">{loadAnalysis.recommendations.map((rec, i) => <li key={i} className="text-sm text-gray-300 flex items-center gap-2"><span className="text-gold-500">•</span> {rec}</li>)}</ul>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* STATS DE CHARGE */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center"><AlertCircle className="w-5 h-5 text-red-400 mx-auto mb-2" /><div className="text-2xl font-serif text-red-400">{urgentTasks.length}</div><div className="text-xs text-gray-500">Tâches du jour</div></div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center"><Target className="w-5 h-5 text-blue-400 mx-auto mb-2" /><div className="text-2xl font-serif text-blue-400">{activeMissions.length}</div><div className="text-xs text-gray-500">Missions actives</div></div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center"><FileText className="w-5 h-5 text-orange-400 mx-auto mb-2" /><div className="text-2xl font-serif text-orange-400">{pendingDocs.length}</div><div className="text-xs text-gray-500">Documents en retard</div></div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center"><Clock className="w-5 h-5 text-yellow-400 mx-auto mb-2" /><div className="text-2xl font-serif text-yellow-400">{todayTasks.length}</div><div className="text-xs text-gray-500">Tâches aujourd'hui</div></div>
              {overloadData && <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center"><Brain className="w-5 h-5 text-purple-400 mx-auto mb-2" /><div className="text-2xl font-serif text-purple-400">{overloadData.stats?.pending_brain_dumps || 0}</div><div className="text-xs text-gray-500">Idées non traitées</div></div>}
            </div>

            {/* TÂCHES URGENTES */}
            {urgentTasks.length > 0 && (
              <div className="bg-red-950/20 border border-red-500/30 rounded-2xl p-6 mb-8">
                <h2 className="text-lg font-serif text-red-400 mb-4 flex items-center gap-2"><AlertCircle className="w-5 h-5" />⚠️ TÂCHES DU JOUR ({urgentTasks.length})</h2>
                <div className="space-y-3">{urgentTasks.map(task => <div key={task.id} className="flex items-center justify-between p-3 bg-midnight rounded-xl border border-red-500/30"><div><span className="text-ivory text-sm">{task.title}</span>{task.area && <span className="text-xs text-gray-500 ml-2">({task.area})</span>}</div>{task.due_date && <span className="text-xs text-red-400">⚠️ {new Date(task.due_date).toLocaleDateString('fr-FR')}</span>}</div>)}</div>
              </div>
            )}

            {/* QUICK WINS */}
            {loadAnalysis?.quickWins && (
              <div className="bg-gold-500/10 border border-gold-500/20 rounded-2xl p-6 mb-8">
                <h2 className="text-lg font-serif text-gold-500 mb-4 flex items-center gap-2"><Sparkles className="w-5 h-5" />Quick wins (moins de 5 min)</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">{loadAnalysis.quickWins.map((win, i) => <div key={i} className="flex items-center gap-2 p-2 hover:bg-white/5 rounded-lg"><CheckCircle className="w-4 h-4 text-emerald-400" /><span className="text-gray-300 text-sm">{win}</span></div>)}</div>
              </div>
            )}

            {/* LIBÉRATION MENTALE */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8">
              <h2 className="text-lg font-serif text-gold-500 mb-3 flex items-center gap-2"><Heart className="w-5 h-5" />Libère ce que tu portes</h2>
              <p className="text-sm text-gray-500 mb-4">Écris ce que tu veux lâcher pour ce soir.</p>
              <div className="flex flex-col gap-3">
                <textarea value={releaseNote} onChange={(e) => setReleaseNote(e.target.value)} placeholder="Je libère..." className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-sm text-ivory placeholder:text-gray-600 resize-none" rows={3} />
                <button onClick={saveReleaseNote} disabled={!releaseNote.trim() || isSaving} className="self-end bg-gold-500 text-midnight px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2">{isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Heart className="w-4 h-4" />}Libérer</button>
              </div>
              {savedRelease && <div className="mt-4 p-3 bg-midnight/50 rounded-xl"><p className="text-xs text-gold-500 mb-1">✍️ Dernière libération :</p><p className="text-sm text-gray-400 italic">{savedRelease}</p></div>}
            </div>

            {/* BOUTONS D'ACTION */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button onClick={handleIAmBetter} className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-emerald-500/20 text-emerald-400 rounded-full font-medium hover:bg-emerald-500/30 transition-colors"><Sparkles className="w-4 h-4" />Je vais mieux ✨</button>
              <Link href="/chat?mode=parle-moi" className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white/10 text-gray-300 rounded-full font-medium hover:bg-white/20"><Heart className="w-4 h-4" />Parler à Becks</Link>
            </div>
          </div>
        )}

        {/* ==================== ONGLET WINS & TRUTHS ==================== */}
        {activeTab === "wins" && (
          <div>
            {/* STATS VICTOIRES */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <div className="bg-gradient-to-br from-gold-500/10 to-transparent border border-gold-500/20 rounded-2xl p-6 text-center"><Trophy className="w-8 h-8 text-gold-500 mx-auto mb-2" /><div className="text-3xl font-serif text-ivory">{winStats.total}</div><div className="text-xs text-gray-500">Victoires totales</div></div>
              <div className="bg-gradient-to-br from-emerald-500/10 to-transparent border border-emerald-500/20 rounded-2xl p-6 text-center"><Star className="w-8 h-8 text-emerald-400 mx-auto mb-2" /><div className="text-3xl font-serif text-emerald-400">{winStats.thisMonth}</div><div className="text-xs text-gray-500">Ce mois-ci</div></div>
              <div className="bg-gradient-to-br from-purple-500/10 to-transparent border border-purple-500/20 rounded-2xl p-6 text-center"><Sparkles className="w-8 h-8 text-purple-400 mx-auto mb-2" /><div className="text-3xl font-serif text-purple-400">{winStats.byCategory.length}</div><div className="text-xs text-gray-500">Catégories touchées</div></div>
            </div>

            {/* STATS PAR CATÉGORIE */}
            {winStats.byCategory.length > 0 && (
              <div className="flex flex-wrap gap-3 mb-8">{winStats.byCategory.map(cat => <div key={cat.category} className="px-4 py-2 bg-white/5 rounded-full text-sm">{categoryConfig[cat.category as keyof typeof categoryConfig].label} : {cat.count}</div>)}</div>
            )}

            {/* FILTRES */}
            <div className="flex flex-wrap gap-3 mb-6">
              <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm">
                <option value="all">📁 Toutes les catégories</option>
                {Object.entries(categoryConfig).map(([key, conf]) => <option key={key} value={key}>{conf.label}</option>)}
              </select>
              <select value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} className="bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm">
                <option value="all">📅 Tous les mois</option>
                {availableMonths.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <button onClick={() => { setShowWinForm(true); setEditingWinId(null); scrollToForm(); }} className="bg-gold-500 text-midnight px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2"><Plus className="w-4 h-4" /> Ajouter une victoire</button>
            </div>

            {/* FORMULAIRE VICTOIRE */}
            <AnimatePresence>
              {showWinForm && (
                <motion.div id="form-container" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 mb-6">
                  <div className="flex justify-between items-center mb-4"><h3 className="text-lg font-serif text-ivory">{editingWinId ? "Modifier" : "Nouvelle"} victoire</h3><button onClick={resetWinForm} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button></div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="text" placeholder="Quelle est ta victoire ?" value={winFormData.title} onChange={(e) => setWinFormData({ ...winFormData, title: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-ivory md:col-span-2" />
                    <select value={winFormData.category} onChange={(e) => setWinFormData({ ...winFormData, category: e.target.value as Win["category"] })} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-ivory">
                      {Object.entries(categoryConfig).map(([key, conf]) => <option key={key} value={key}>{conf.emoji} {conf.label}</option>)}
                    </select>
                    <div className="flex gap-2">
                      <select value={winFormData.celebration_emoji} onChange={(e) => setWinFormData({ ...winFormData, celebration_emoji: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-ivory flex-1">
                        {celebrationEmojis.map(emoji => <option key={emoji} value={emoji}>{emoji}</option>)}
                      </select>
                      <input type="date" value={winFormData.date} onChange={(e) => setWinFormData({ ...winFormData, date: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-ivory" />
                    </div>
                    <textarea placeholder="Notes" value={winFormData.notes} onChange={(e) => setWinFormData({ ...winFormData, notes: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-ivory md:col-span-2" rows={2} />
                  </div>
                  <div className="flex gap-3 mt-6"><button onClick={saveWin} className="bg-gold-500 text-midnight px-6 py-2 rounded-full font-medium">{editingWinId ? "Mettre à jour" : "Enregistrer"}</button><button onClick={resetWinForm} className="bg-white/10 px-6 py-2 rounded-full">Annuler</button></div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* LISTE DES VICTOIRES */}
            <div className="space-y-3">
              {isWinsLoading ? <LoadingSpinner /> : filteredWins.length === 0 ? (
                <div className="text-center py-12 text-gray-500"><Trophy className="w-12 h-12 mx-auto mb-4 opacity-30" /><p>Pas encore de victoires enregistrées</p></div>
              ) : (
                filteredWins.map((win, index) => {
                  const CategoryIcon = categoryConfig[win.category].icon;
                  return (
                    <motion.div key={win.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} className="group bg-gradient-to-r from-gold-500/5 to-transparent border border-gold-500/20 rounded-xl p-5 hover:border-gold-500/40">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 flex-wrap mb-2">
                            <span className="text-2xl">{win.celebration_emoji || "🎉"}</span>
                            <h3 className="text-ivory font-medium text-lg">{win.title}</h3>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${categoryConfig[win.category].color}`}><CategoryIcon className="w-3 h-3 inline mr-1" /> {categoryConfig[win.category].label}</span>
                          </div>
                          <div className="flex flex-wrap gap-4 text-xs text-gray-500"><span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(win.date).toLocaleDateString('fr-FR')}</span></div>
                          {win.notes && <p className="text-xs text-gray-600 mt-2 italic">{win.notes}</p>}
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100">
                          <button onClick={() => editWin(win)} className="text-gray-500 hover:text-gold-500"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => deleteWin(win.id)} className="text-gray-500 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>

            {/* MESSAGE DE MOTIVATION */}
            {wins.length > 0 && (
              <div className="mt-8 p-5 bg-gradient-to-r from-gold-500/10 to-transparent rounded-2xl border border-gold-500/20 text-center">
                <Sparkles className="w-6 h-6 text-gold-500 mx-auto mb-2" />
                <p className="text-sm text-gray-400">{winStats.total} victoire(s) célébrée(s) • Continue sur cette lancée ! 👑</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
