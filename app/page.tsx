"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { 
  Crown, Settings, Bell, User, Sparkles, 
  Target, DollarSign, Heart, Sprout, Brain,
  Calendar, AlertCircle, ArrowRight, Smile, Meh, Frown, Sun, Moon
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

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-24">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-serif text-ivory">
            {greeting}, {userName}. <Crown className="inline w-5 h-5 text-gold-500" />
          </h1>
          <p className="text-gray-500 text-sm">Becks est là pour t'aider</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/settings" className="p-2 text-gray-400 hover:text-gold-500">
            <Settings className="w-5 h-5" />
          </Link>
          <Link href="/profile" className="p-2 text-gray-400 hover:text-gold-500">
            <User className="w-5 h-5" />
          </Link>
        </div>
      </div>

      {/* HUMEUR DU JOUR */}
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
              className="text-xs text-gray-500 hover:text-gold-400"
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

      {/* TOP 3 PRIORITÉS */}
      <DashboardCard title="🎯 CETTE SEMAINE" icon={<Target className="w-4 h-4 text-gold-500" />}>
        {priorities.length > 0 ? (
          <div className="space-y-3">
            {priorities.slice(0, 3).map((priority, idx) => (
              <div key={priority.id} className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-gold-500/20 text-gold-500 flex items-center justify-center text-xs font-bold">
                  {idx + 1}
                </div>
                <div>
                  <p className="text-sm text-ivory">{priority.title}</p>
                  <p className="text-xs text-gray-500">{priority.priority_reason}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 text-center py-4">Aucune priorité pour le moment</p>
        )}
      </DashboardCard>

      {/* 4 MOVES (Argent, Famille, Ferme, Stabilisation) */}
      <div className="grid grid-cols-2 gap-3">
        <DashboardCard title="💰 UN MOVE ARGENT" icon={<DollarSign className="w-4 h-4 text-emerald-400" />} accentColor="emerald">
          <p className="text-sm text-ivory">{moneyMove}</p>
          <button className="text-xs text-gold-500 mt-2 hover:underline">→ Je prépare l'email</button>
        </DashboardCard>

        <DashboardCard title="👨‍👩‍👧‍👦 UN MOVE FAMILLE" icon={<Heart className="w-4 h-4 text-pink-400" />} accentColor="pink">
          <p className="text-sm text-ivory">{familyMove}</p>
          <button className="text-xs text-gold-500 mt-2 hover:underline">→ Je note</button>
        </DashboardCard>

        <DashboardCard title="🌾 UN MOVE FERME" icon={<Sprout className="w-4 h-4 text-green-400" />} accentColor="green">
          <p className="text-sm text-ivory">{farmNextAction}</p>
          <button className="text-xs text-gold-500 mt-2 hover:underline">→ Voir détails</button>
        </DashboardCard>

        <DashboardCard title="🧘 UN MOVE STABILISATION" icon={<Sun className="w-4 h-4 text-yellow-400" />} accentColor="gold">
          <p className="text-sm text-ivory">{stabilizationMove}</p>
        </DashboardCard>
      </div>

      {/* RAPPELS IMPORTANTS */}
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

      {/* BOUTON D'AIDE */}
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

      {/* MESSAGE DE BECKS */}
      <div className="text-center text-xs text-gray-500 italic">
        <p>✨ "Une chose à la fois. Tu gères, Rebecca." ✨</p>
      </div>
    </div>
  );
}
