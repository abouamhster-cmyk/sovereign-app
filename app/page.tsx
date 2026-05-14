"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { 
  Crown, Settings, Bell, User, Sparkles, 
  Target, DollarSign, Heart, Sprout, Brain,
  Calendar, AlertCircle, ArrowRight, Smile, Meh, Frown, Sun, Moon,
  Loader2
} from "lucide-react";
import { DashboardCard } from "@/components/DashboardCard";

const API_URL = "https://sovereign-bridge.onrender.com";

// Types
type Priority = { id: string; title: string; priority_reason: string; score: number };
type Task = { id: string; title: string; due_date: string | null; status: string };
type Mission = { id: string; name: string; status: string };

export default function DashboardPage() {
  const [greeting, setGreeting] = useState("");
  const [userName, setUserName] = useState("Rebecca");
  const [isLoading, setIsLoading] = useState(true);
  
  // Données
  const [priorities, setPriorities] = useState<Priority[]>([]);
  const [urgentTasks, setUrgentTasks] = useState<Task[]>([]);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState<{ title: string; date: string; type: string }[]>([]);
  const [mood, setMood] = useState<string | null>(null);
  const [activeMissions, setActiveMissions] = useState<Mission[]>([]);
  
  // Message personnalisé de Becks
  const [becksMessage, setBecksMessage] = useState("");
  const [isLoadingMessage, setIsLoadingMessage] = useState(true);
  const [todaySummary, setTodaySummary] = useState<{
    tasks_count: number;
    missions_count: number;
    docs_count: number;
  } | null>(null);
  
  // Stats pour les moves
  const [farmStatus, setFarmStatus] = useState("En cours");
  const [farmNextAction, setFarmNextAction] = useState("Vérifier installation poissons");
  const [moneyMove, setMoneyMove] = useState("Relancer le client à 350k CFA");
  const [familyMove, setFamilyMove] = useState("Vaccins Nylah cette semaine");
  const [stabilizationMove, setStabilizationMove] = useState("Prends 10 minutes pour toi");

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Bonjour");
    else if (hour < 18) setGreeting("Bon après-midi");
    else setGreeting("Bonsoir");
    
    const savedMood = localStorage.getItem("todayMood");
    const savedDate = localStorage.getItem("todayMoodDate");
    const today = new Date().toISOString().split('T')[0];
    
    if (savedMood && savedDate === today) {
      setMood(savedMood);
    }
    
    fetchAllData();
  }, []);

  async function fetchAllData() {
    setIsLoading(true);
    await Promise.all([
      fetchUserName(),
      fetchPriorities(),
      fetchUrgentTasks(),
      fetchUpcomingDeadlines(),
      fetchFarmStatus(),
      fetchMorningGreeting(),
      fetchTodaySummary(),
      fetchActiveMissions(),
    ]);
    setIsLoading(false);
  }

  async function fetchUserName() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email) {
      const name = user.email.split('@')[0];
      setUserName(name.charAt(0).toUpperCase() + name.slice(1));
    }
  }

  async function fetchPriorities() {
    try {
      const response = await fetch(`${API_URL}/api/ai-priorities`);
      const data = await response.json();
      setPriorities(data.priorities || []);
    } catch (error) {
      console.error("Erreur priorités:", error);
    }
  }

  async function fetchUrgentTasks() {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from("tasks")
      .select("*")
      .in("status", ["today", "in_progress"])
      .limit(3);
    setUrgentTasks(data || []);
  }

  async function fetchUpcomingDeadlines() {
    const today = new Date().toISOString().split('T')[0];
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const [tasksRes, docsRes] = await Promise.all([
      supabase.from("tasks").select("*").gte("due_date", today).lte("due_date", nextWeek).neq("status", "done"),
      supabase.from("documents").select("*").gte("due_date", today).lte("due_date", nextWeek).neq("status", "approved")
    ]);
    
    const deadlines = [
      ...(tasksRes.data || []).map(t => ({ title: t.title, date: t.due_date!, type: "task" })),
      ...(docsRes.data || []).map(d => ({ title: d.name, date: d.due_date!, type: "document" }))
    ];
    setUpcomingDeadlines(deadlines.slice(0, 3));
  }

  async function fetchFarmStatus() {
    const { data } = await supabase
      .from("farm_production_units")
      .select("*")
      .eq("status", "setup");
    
    if (data && data.length > 0) {
      setFarmNextAction(`Finaliser ${data[0].name}`);
    }
  }

  async function fetchMorningGreeting() {
    try {
      const response = await fetch(`${API_URL}/api/morning-greeting`);
      const data = await response.json();
      if (data.success && data.message) {
        setBecksMessage(data.message);
      } else {
        setBecksMessage("Salut Rebecca. Je suis là si tu as besoin.");
      }
    } catch (error) {
      console.error("Erreur message:", error);
      setBecksMessage("Salut Rebecca. Je suis là.");
    }
    setIsLoadingMessage(false);
  }

  async function fetchTodaySummary() {
    try {
      const [tasksRes, missionsRes, docsRes] = await Promise.all([
        supabase.from("tasks").select("*", { count: "exact", head: true }).eq("status", "today"),
        supabase.from("missions").select("*", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("documents").select("*", { count: "exact", head: true }).neq("status", "approved")
      ]);
      
      setTodaySummary({
        tasks_count: tasksRes.count || 0,
        missions_count: missionsRes.count || 0,
        docs_count: docsRes.count || 0
      });
    } catch (error) {
      console.error("Erreur summary:", error);
    }
  }

  async function fetchActiveMissions() {
    const { data } = await supabase
      .from("missions")
      .select("*")
      .eq("status", "active")
      .limit(3);
    setActiveMissions(data || []);
  }

  async function saveMood(selectedMood: string) {
    const today = new Date().toISOString().split('T')[0];
    setMood(selectedMood);
    localStorage.setItem("todayMood", selectedMood);
    localStorage.setItem("todayMoodDate", today);
    
    await fetch(`${API_URL}/api/mood/save`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mood: selectedMood })
    });
    
    // Message d'encouragement personnalisé
    if (selectedMood === "fatiguée") {
      setStabilizationMove("Repose-toi. Rien n'est plus important que ton énergie.");
    } else if (selectedMood === "stressée") {
      setStabilizationMove("On respire. Une seule priorité pour commencer.");
    } else if (selectedMood === "excellent") {
      setStabilizationMove("C'est le moment d'attaquer les gros dossiers !");
    }
  }

  const moods = [
    { value: "excellent", emoji: "🌟", label: "Excellent", color: "text-emerald-400" },
    { value: "bien", emoji: "😊", label: "Bien", color: "text-green-400" },
    { value: "neutre", emoji: "😐", label: "Neutre", color: "text-gray-400" },
    { value: "fatiguée", emoji: "😴", label: "Fatiguée", color: "text-yellow-400" },
    { value: "stressée", emoji: "😰", label: "Stressée", color: "text-red-400" }
  ];

  const handleHelpMeMoveForward = () => {
    window.location.href = "/chat?mode=fais-le-avec-moi";
  };

  const currentMood = moods.find(m => m.value === mood);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-24">
     {/* HEADER avec message personnalisé de Becks */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-serif text-ivory">
                  {greeting}, {userName}. <Crown className="inline w-5 h-5 text-gold-500" />
                </h1>
              </div>
              <Link href="/settings" className="p-2 text-gray-400 hover:text-gold-500 transition-colors">
                <Settings className="w-5 h-5" />
              </Link>
            </div>
          
            {/* Message personnalisé de Becks */}
            <div className="bg-gradient-to-r from-gold-500/10 to-transparent border-l-4 border-gold-500 rounded-xl p-4">
              {isLoadingMessage ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-gold-500 animate-spin" />
                  <span className="text-sm text-gray-400">Becks réfléchit...</span>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-gold-500 mt-0.5 flex-shrink-0" />
                  <p className="text-ivory text-sm leading-relaxed">{becksMessage}</p>
                </div>
              )}
            </div>
          
            {/* Petit résumé visuel */}
            {todaySummary && (
              <div className="flex gap-2 text-xs">
                <span className="px-2 py-1 bg-white/5 rounded-full">
                  📋 {todaySummary.tasks_count} tâche(s)
                </span>
                <span className="px-2 py-1 bg-white/5 rounded-full">
                  🎯 {todaySummary.missions_count} mission(s)
                </span>
                <span className="px-2 py-1 bg-white/5 rounded-full">
                  📄 {todaySummary.docs_count} document(s)
                </span>
              </div>
            )}
          </div>

      {/* ============================================================ */}
      {/* HUMEUR DU JOUR */}
      {/* ============================================================ */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        {mood ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{currentMood?.emoji}</span>
              <div>
                <p className="text-xs text-gray-500">Humeur du jour</p>
                <p className={`text-sm ${currentMood?.color}`}>{currentMood?.label}</p>
              </div>
            </div>
            <button
              onClick={() => { setMood(null); localStorage.removeItem("todayMood"); }}
              className="text-xs text-gray-500 hover:text-gold-400 transition-colors"
            >
              Modifier
            </button>
          </div>
        ) : (
          <div>
            <p className="text-sm text-gray-400 mb-3">😊 Comment te sens-tu aujourd'hui ?</p>
            <div className="flex justify-between">
              {moods.map((m) => (
                <button
                  key={m.value}
                  onClick={() => saveMood(m.value)}
                  className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <span className="text-xl">{m.emoji}</span>
                  <span className="text-[10px] text-gray-500">{m.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* TOP 3 PRIORITÉS - Version améliorée */}
      {/* ============================================================ */}
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        <div className="px-5 pt-4 pb-2 flex items-center justify-between">
          <h2 className="text-sm font-serif text-gold-500 flex items-center gap-2">
            <Target className="w-4 h-4" />
            🎯 TES 3 PRIORITÉS
          </h2>
          {priorities.length > 0 && (
            <span className="text-[10px] text-gray-500">Basé sur l'IA</span>
          )}
        </div>
        <div className="p-5 pt-2">
          {priorities.length > 0 ? (
            <div className="space-y-4">
              {priorities.slice(0, 3).map((priority, idx) => (
                <div key={priority.id} className="group">
                  <div className="flex items-start gap-3">
                    <div className={`
                      w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0
                      ${idx === 0 ? "bg-red-500/20 text-red-400" : 
                        idx === 1 ? "bg-orange-500/20 text-orange-400" : 
                        "bg-gold-500/20 text-gold-500"}
                    `}>
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <p className="text-ivory text-sm font-medium">{priority.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{priority.priority_reason}</p>
                    </div>
                  </div>
                  {idx < priorities.length - 1 && idx < 2 && (
                    <div className="ml-9 mt-3 h-px bg-white/10" />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <Target className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm text-gray-500">Aucune priorité pour le moment</p>
              <button 
                onClick={() => window.location.href = "/tasks"}
                className="text-xs text-gold-500 mt-2 hover:underline"
              >
                + Créer une tâche
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* TÂCHES URGENTES (optionnel, si existantes) */}
      {/* ============================================================ */}
      {urgentTasks.length > 0 && (
        <div className="bg-red-950/20 border border-red-500/30 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="w-4 h-4 text-red-400" />
            <h3 className="text-sm font-medium text-ivory">⚠️ TÂCHES DU JOUR</h3>
          </div>
          <div className="space-y-2">
            {urgentTasks.map((task) => (
              <div key={task.id} className="flex items-center justify-between text-sm">
                <span className="text-gray-300">{task.title}</span>
                {task.due_date && (
                  <span className="text-xs text-red-400">
                    📅 {new Date(task.due_date).toLocaleDateString('fr-FR')}
                  </span>
                )}
              </div>
            ))}
          </div>
          <Link href="/tasks" className="text-xs text-gold-500 hover:underline block text-center mt-3">
            Voir toutes les tâches →
          </Link>
        </div>
      )}

      {/* ============================================================ */}
      {/* 4 MOVES - Version améliorée avec liens */}
      {/* ============================================================ */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/money" className="block">
          <div className="bg-gradient-to-br from-emerald-500/5 to-transparent border border-emerald-500/20 rounded-xl p-4 hover:border-emerald-500/40 transition-all group">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <span className="text-xs text-emerald-400/70 uppercase tracking-wider">Move Argent</span>
            </div>
            <p className="text-sm text-ivory">{moneyMove}</p>
            <span className="text-xs text-gold-500 opacity-0 group-hover:opacity-100 transition-opacity mt-2 inline-block">
              Voir les finances →
            </span>
          </div>
        </Link>

        <Link href="/family" className="block">
          <div className="bg-gradient-to-br from-pink-500/5 to-transparent border border-pink-500/20 rounded-xl p-4 hover:border-pink-500/40 transition-all group">
            <div className="flex items-center gap-2 mb-2">
              <Heart className="w-4 h-4 text-pink-400" />
              <span className="text-xs text-pink-400/70 uppercase tracking-wider">Move Famille</span>
            </div>
            <p className="text-sm text-ivory">{familyMove}</p>
            <span className="text-xs text-gold-500 opacity-0 group-hover:opacity-100 transition-opacity mt-2 inline-block">
              Voir famille →
            </span>
          </div>
        </Link>

        <Link href="/farm" className="block">
          <div className="bg-gradient-to-br from-green-500/5 to-transparent border border-green-500/20 rounded-xl p-4 hover:border-green-500/40 transition-all group">
            <div className="flex items-center gap-2 mb-2">
              <Sprout className="w-4 h-4 text-green-400" />
              <span className="text-xs text-green-400/70 uppercase tracking-wider">Move Ferme</span>
            </div>
            <p className="text-sm text-ivory">{farmNextAction}</p>
            <span className="text-xs text-gold-500 opacity-0 group-hover:opacity-100 transition-opacity mt-2 inline-block">
              Voir ferme →
            </span>
          </div>
        </Link>

        <Link href="/alignment" className="block">
          <div className="bg-gradient-to-br from-yellow-500/5 to-transparent border border-yellow-500/20 rounded-xl p-4 hover:border-yellow-500/40 transition-all group">
            <div className="flex items-center gap-2 mb-2">
              <Sun className="w-4 h-4 text-yellow-400" />
              <span className="text-xs text-yellow-400/70 uppercase tracking-wider">Move Stabilisation</span>
            </div>
            <p className="text-sm text-ivory">{stabilizationMove}</p>
            <span className="text-xs text-gold-500 opacity-0 group-hover:opacity-100 transition-opacity mt-2 inline-block">
              S'aligner →
            </span>
          </div>
        </Link>
      </div>

      {/* ============================================================ */}
      {/* MISSIONS ACTIVES - Petit aperçu */}
      {/* ============================================================ */}
      {activeMissions.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-4 h-4 text-gold-500" />
            <h3 className="text-sm font-medium text-ivory">🎯 Missions actives</h3>
          </div>
          <div className="space-y-2">
            {activeMissions.map((mission) => (
              <Link 
                key={mission.id} 
                href="/missions" 
                className="flex items-center justify-between p-2 hover:bg-white/5 rounded-lg transition-colors"
              >
                <span className="text-sm text-gray-300">{mission.name}</span>
                <ArrowRight className="w-3 h-3 text-gray-500" />
              </Link>
            ))}
          </div>
          <Link href="/missions" className="text-xs text-gold-500 hover:underline block text-center mt-3">
            Voir toutes les missions →
          </Link>
        </div>
      )}

      {/* ============================================================ */}
      {/* RAPPELS IMPORTANTS */}
      {/* ============================================================ */}
      {upcomingDeadlines.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="w-4 h-4 text-gold-500" />
            <h3 className="text-sm font-medium text-ivory">📋 RAPPELS IMPORTANTS</h3>
          </div>
          <div className="space-y-2">
            {upcomingDeadlines.map((deadline, idx) => (
              <div key={idx} className="flex justify-between items-center text-sm">
                <span className="text-gray-300">{deadline.title}</span>
                <span className="text-xs text-red-400">
                  {Math.ceil((new Date(deadline.date).getTime() - new Date().getTime()) / (1000 * 3600 * 24)) <= 3 
                    ? `⚠️ ${new Date(deadline.date).toLocaleDateString('fr-FR')}`
                    : `📅 ${new Date(deadline.date).toLocaleDateString('fr-FR')}`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* BOUTON D'AIDE - MODE EXÉCUTION */}
      {/* ============================================================ */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleHelpMeMoveForward}
        className="w-full py-4 bg-gradient-to-r from-gold-500/20 to-gold-500/5 border border-gold-500/30 rounded-xl text-gold-500 font-medium flex items-center justify-center gap-3 hover:bg-gold-500/30 transition-all"
      >
        <Sparkles className="w-5 h-5" />
        <span>🧠 Aide-moi à avancer maintenant</span>
        <ArrowRight className="w-4 h-4" />
      </motion.button>

      {/* ============================================================ */}
      {/* MESSAGE DE CLÔTURE DE BECKS */}
      {/* ============================================================ */}
      <div className="text-center text-xs text-gray-500 italic">
        <p>✨ "Une chose à la fois. Tu gères, Rebecca." ✨</p>
      </div>
    </div>
  );
}
