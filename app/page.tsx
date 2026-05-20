"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Crown, Settings, Sparkles, Target, DollarSign, Heart, Sprout, Brain,
  Calendar, AlertCircle, ArrowRight, Loader2, Edit2, Inbox, CheckSquare, 
  Briefcase, Globe, Trophy, Users, Zap, ShieldAlert, Map, Mail, FileText, 
  TrendingUp, CalendarDays, FolderOpen, Star, Sun, Moon
} from "lucide-react";
import { toast } from "sonner";

const API_URL = "https://sovereign-bridge.onrender.com";

// Types
type Priority = { id: string; title: string; priority_reason: string; score: number };
type Task = { id: string; title: string; due_date: string | null; status: string };
type Mission = { id: string; name: string; status: string };
type Memory = {
  id: string;
  key: string;
  value: string;
  category: string;
  created_at: string;
};

export default function DashboardPage() {
  const router = useRouter();
  const [greeting, setGreeting] = useState("");
  const [userName, setUserName] = useState("Rebecca");
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  
  // Données
  const [priorities, setPriorities] = useState<Priority[]>([]);
  const [urgentTasks, setUrgentTasks] = useState<Task[]>([]);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState<{ title: string; date: string; type: string }[]>([]);
  const [mood, setMood] = useState<string | null>(null);
  const [activeMissions, setActiveMissions] = useState<Mission[]>([]);
  const [recentMemories, setRecentMemories] = useState<Memory[]>([]);
  const [overloadData, setOverloadData] = useState<any>(null);
  const [isLoadingMemories, setIsLoadingMemories] = useState(true);
  
  // Suggestion prochaine action
  const [nextActionSuggestion, setNextActionSuggestion] = useState("");
  const [showSuggestion, setShowSuggestion] = useState(false);
  
  // Message personnalisé de Becks
  const [becksMessage, setBecksMessage] = useState("");
  const [isLoadingMessage, setIsLoadingMessage] = useState(true);
  const [todaySummary, setTodaySummary] = useState<{
    tasks_count: number;
    missions_count: number;
    docs_count: number;
  } | null>(null);
  
  // Stats pour les moves
  const [farmNextAction, setFarmNextAction] = useState("Vérifier l'avancement");
  const [moneyMove, setMoneyMove] = useState("Vérifier les finances");
  const [familyMove, setFamilyMove] = useState("Prendre des nouvelles des enfants");
  const [businessMove, setBusinessMove] = useState("Avancer sur une mission");
  const [stabilizationMove, setStabilizationMove] = useState("Prendre 5 minutes");

  // Récupérer l'utilisateur au chargement
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };
    fetchUser();
  }, []);

  // Afficher la suggestion
  useEffect(() => {
    if (nextActionSuggestion && showSuggestion) {
      toast.info(nextActionSuggestion, {
        duration: 8000,
        icon: "💡",
        position: "bottom-right",
        style: {
          background: "rgba(212, 175, 55, 0.1)",
          border: "1px solid rgba(212, 175, 55, 0.3)",
          color: "#D4AF37"
        }
      });
    }
  }, [nextActionSuggestion, showSuggestion]);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Bonjour");
    else if (hour < 18) setGreeting("Bon après-midi");
    else setGreeting("Bonsoir");
    
    fetchNextActionSuggestion();
    
    const savedMood = localStorage.getItem("todayMood");
    const savedDate = localStorage.getItem("todayMoodDate");
    const today = new Date().toISOString().split('T')[0];
    
    if (savedMood && savedDate === today) {
      setMood(savedMood);
    }
    
    if (userId) {
      fetchAllData();
    }
  }, [userId]);


    // Recharger le nom quand le profil est mis à jour
useEffect(() => {
  const handleProfileUpdate = () => {
    if (userId) {
      fetchUserName();
    }
  };
  
  window.addEventListener('profileUpdated', handleProfileUpdate);
  return () => window.removeEventListener('profileUpdated', handleProfileUpdate);
}, [userId]);
  
  async function fetchAllData() {
    if (!userId) return;
    setIsLoading(true);
    await Promise.all([
      fetchUserName(),
      fetchDashboardData(),
      fetchFarmStatus(),
      fetchRecentMemories(),
      fetchOverloadDetection(), 
    ]);
    setIsLoading(false);
  }

async function fetchUserName() {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    setUserName("Rebecca");
    return;
  }
  
  const userId = user.id;
  
  // 🔥 Utiliser maybeSingle() au lieu de single() pour éviter l'erreur 406
  const { data: profile, error } = await supabase
    .from("user_profile")
    .select("preferred_name")
    .eq("user_id", userId)
    .maybeSingle();
  
  if (error) {
    console.error("Erreur chargement profil:", error);
    setUserName("Rebecca");
    return;
  }
  
  if (profile?.preferred_name) {
    setUserName(profile.preferred_name);
    console.log("✅ Nom chargé:", profile.preferred_name);
  } else {
    setUserName("Rebecca");
  }
}

  // Suggestion prochaine action
  async function fetchNextActionSuggestion() {
    if (!userId) return;
    
    const lastCompleted = localStorage.getItem("lastCompletedTask");
    const lastArea = localStorage.getItem("lastArea");
    
    const { data: recentTasksData } = await supabase
      .from("tasks")
      .select("title")
      .eq("user_id", userId)
      .eq("status", "done")
      .order("updated_at", { ascending: false })
      .limit(3);
    
    const recentTasks = recentTasksData?.map(t => t.title) || [];
    
    const { data: missionsData } = await supabase
      .from("missions")
      .select("name")
      .eq("user_id", userId)
      .eq("status", "active")
      .limit(3);
    
    const activeMissionsList = missionsData?.map(m => m.name) || [];
    
    try {
      const response = await fetch(`${API_URL}/api/suggest-next-action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          current_page: "dashboard",
          last_completed_task: lastCompleted,
          recent_tasks: recentTasks,
          active_missions: activeMissionsList,
          hour: new Date().getHours(),
          last_area: lastArea,
          user_id: userId
        })
      });
      
      const data = await response.json();
      if (data.success && data.suggestion) {
        setNextActionSuggestion(data.suggestion);
        setShowSuggestion(true);
        setTimeout(() => setShowSuggestion(false), 10000);
      }
    } catch (error) {
      console.error("Erreur suggestion:", error);
    }
  }

  async function fetchDashboardData() {
    if (!userId) return;
    try {
      const response = await fetch(`${API_URL}/api/dashboard/today?user_id=${userId}`);
      const data = await response.json();
      
      if (data.success) {
        if (data.greeting) {
          setBecksMessage(data.greeting);
        } else {
          await generateDynamicGreeting();
        }
        setIsLoadingMessage(false);
        
        const formattedPriorities = data.top_priorities?.map((p: any) => ({
          id: p.id,
          title: p.title,
          priority_reason: p.reason,
          score: p.score
        })) || [];
        setPriorities(formattedPriorities);
        
        const allTasks = [...(data.overdue_tasks || []), ...(data.tasks_today || [])];
        setUrgentTasks(allTasks.slice(0, 5));
        
        if (data.overdue_tasks?.length > 0 || data.tasks_today?.length > 0) {
          const deadlines = [
            ...(data.overdue_tasks || []).map((t: any) => ({ 
              title: t.title, 
              date: t.due_date, 
              type: "task" 
            })),
            ...(data.tasks_today || []).map((t: any) => ({ 
              title: t.title, 
              date: t.due_date, 
              type: "task" 
            }))
          ];
          setUpcomingDeadlines(deadlines.slice(0, 3));
        }
        
        setActiveMissions(data.active_missions || []);
        
        if (data.suggestions) {
          if (data.suggestions.money_move) setMoneyMove(data.suggestions.money_move);
          if (data.suggestions.family_move) setFamilyMove(data.suggestions.family_move);
          if (data.suggestions.business_move) setBusinessMove(data.suggestions.business_move);
          if (data.suggestions.stabilization_move) setStabilizationMove(data.suggestions.stabilization_move);
        }
        
        if (data.stats) {
          setTodaySummary({
            tasks_count: data.stats.tasks_count || 0,
            missions_count: data.stats.missions_count || 0,
            docs_count: data.stats.docs_count || 0
          });
        }
        
        if (data.load_analysis?.level === "critical" || data.load_analysis?.score >= 50) {
          toast.error("⚠️ Charge critique détectée", {
            description: "Active le Rescue Mode pour recentrer tes priorités.",
            action: {
              label: "Activer",
              onClick: () => router.push("/rescue-wins")
            },
            duration: 10000
          });
        } else if (data.load_analysis?.level === "high" || data.load_analysis?.score >= 30) {
          toast.warning("🟡 Charge élevée", {
            description: "Tu as beaucoup de choses. Une chose à la fois.",
            duration: 5000
          });
        }
      } else {
        await generateDynamicGreeting();
        setIsLoadingMessage(false);
      }
    } catch (error) {
      console.error("Erreur dashboard:", error);
      await generateDynamicGreeting();
      setIsLoadingMessage(false);
    }
  }

  async function generateDynamicGreeting() {
    if (!userId) return;
    
    const today = new Date().toISOString().split('T')[0];
    
    const [tasksRes, overdueRes, winsRes, missionsRes, moodRes] = await Promise.all([
      supabase.from("tasks").select("*").eq("user_id", userId).eq("due_date", today).neq("status", "done"),
      supabase.from("tasks").select("*").eq("user_id", userId).lt("due_date", today).neq("status", "done"),
      supabase.from("wins").select("*").eq("user_id", userId).gte("date", today),
      supabase.from("missions").select("*").eq("user_id", userId).eq("status", "active"),
      supabase.from("mood_entries").select("mood").eq("user_id", userId).eq("date", today).maybeSingle()
    ]);
    
    const tasksCount = tasksRes.data?.length || 0;
    const overdueCount = overdueRes.data?.length || 0;
    const winsCount = winsRes.data?.length || 0;
    const missionsCount = missionsRes.data?.length || 0;
    const currentMood = moodRes.data?.mood || null;
    
    try {
      const response = await fetch(`${API_URL}/api/generate-greeting`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tasks_count: tasksCount,
          overdue_count: overdueCount,
          wins_count: winsCount,
          missions_count: missionsCount,
          mood: currentMood,
          hour: new Date().getHours(),
          user_id: userId,
        })
      });
      
      const data = await response.json();
      if (data.success && data.greeting) {
        setBecksMessage(data.greeting);
      } else {
        setBecksMessage(fallbackGreeting(tasksCount, overdueCount, winsCount, missionsCount, currentMood));
      }
    } catch (error) {
      console.error("Erreur génération greeting:", error);
      setBecksMessage(fallbackGreeting(0, 0, 0, 0, null));
    }
  }

  function fallbackGreeting(tasksCount: number, overdueCount: number, winsCount: number, missionsCount: number, mood: string | null): string {
    const hour = new Date().getHours();
    let greetingText = hour < 12 ? "Bonjour" : hour < 18 ? "Bon après-midi" : "Bonsoir";
    
    if (mood === "fatiguée") {
      return `${greetingText} ${userName}. Je sens que tu es fatiguée. On y va doucement aujourd'hui. 🌿`;
    }
    if (mood === "stressée") {
      return `${greetingText} ${userName}. Je sens que tu es stressée. On respire et on priorise l'essentiel. 💖`;
    }
    if (overdueCount > 0) {
      return `${greetingText} ${userName}. Tu as ${overdueCount} tâche(s) en retard. On regarde ça ensemble ? 👑`;
    }
    if (tasksCount > 0) {
      return `${greetingText} ${userName}. Tu as ${tasksCount} chose(s) à faire aujourd'hui. Je suis là si tu veux. ✨`;
    }
    if (winsCount > 0) {
      return `${greetingText} ${userName}. ${winsCount} victoire(s) récente(s) ! C'est bien. Continue comme ça. 🏆`;
    }
    if (missionsCount > 0) {
      return `${greetingText} ${userName}. ${missionsCount} mission(s) active(s). Tu veux qu'on avance sur l'une d'elles ? 🎯`;
    }
    
    const naturalGreetings = [
      `${greetingText} ${userName}. Rien de prévu aujourd'hui. Tu veux qu'on avance sur un projet ou tu préfères souffler ? 🌱`,
      `${greetingText} ${userName}. Journée calme. Profites-en pour respirer ou pour prendre de l'avance. 🌸`,
      `${greetingText} ${userName}. Tout est calme. Besoin de quoi ? 💫`
    ];
    return naturalGreetings[Math.floor(Math.random() * naturalGreetings.length)];
  }

  async function fetchFarmStatus() {
    if (!userId) return;
    try {
      const [infraResult, productionResult] = await Promise.all([
        supabase.from("farm_infrastructure").select("*").in("status", ["in_progress", "setup"]).eq("user_id", userId),
        supabase.from("farm_production_units").select("*").in("status", ["setup", "in_progress"]).eq("user_id", userId)
      ]);
      
      const infra = infraResult.data || [];
      const production = productionResult.data || [];
      const pendingCount = infra.length + production.length;
      
      if (pendingCount > 0) {
        const nextItem = production[0] || infra[0];
        if (nextItem) {
          setFarmNextAction(`Finaliser ${nextItem.name}`);
        }
      } else {
        setFarmNextAction("Vérifier l'avancement");
      }
    } catch (error) {
      console.error("Erreur farm status:", error);
    }
  }

  async function fetchOverloadDetection() {
    if (!userId) return;
    try {
      const response = await fetch(`${API_URL}/api/rescue/detect-overload`, {  
        method: "POST",   
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId })  
      });
      const data = await response.json();
      if (data.success) {
        setOverloadData(data);
      }
    } catch (error) {
      console.error("Erreur détection surcharge:", error);
    }
  }
  
  async function fetchRecentMemories() {
    if (!userId) return;
    setIsLoadingMemories(true);
    try {
      const response = await fetch(`${API_URL}/api/memory/get?user_id=${userId}&limit=5`);
      const data = await response.json();
      if (data.success && data.data) {
        setRecentMemories(data.data.slice(0, 5));
      }
    } catch (error) {
      console.error("Erreur fetch memories:", error);
    } finally {
      setIsLoadingMemories(false);
    }
  }

  async function saveMood(selectedMood: string) {
    if (!userId) return;
    
    const today = new Date().toISOString().split('T')[0];
    setMood(selectedMood);
    localStorage.setItem("todayMood", selectedMood);
    localStorage.setItem("todayMoodDate", today);
    
    await fetch(`${API_URL}/api/mood/save`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mood: selectedMood, user_id: userId })
    });

    window.dispatchEvent(new CustomEvent('moodChange', { detail: { mood: selectedMood } }));

    if (selectedMood === "fatiguée") {
      setStabilizationMove("Repose-toi. Rien n'est plus important que ton énergie.");
      toast.info("🌿 Prends soin de toi aujourd'hui", { duration: 5000 });
    } else if (selectedMood === "stressée") {
      setStabilizationMove("On respire. Une seule priorité pour commencer.");
      toast.info("🌬️ Une respiration profonde peut tout changer", { duration: 5000 });
    } else if (selectedMood === "excellent") {
      setStabilizationMove("C'est le moment d'attaquer les gros dossiers !");
      toast.success("🔥 C'est ton jour !", { duration: 3000 });
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
    router.push("/chat?mode=fais-le-avec-moi");
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
      
        {/* Message Becks */}
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
            <span className="px-2 py-1 bg-white/5 rounded-full">📋 {todaySummary.tasks_count} tâche(s)</span>
            <span className="px-2 py-1 bg-white/5 rounded-full">🎯 {todaySummary.missions_count} mission(s)</span>
            <span className="px-2 py-1 bg-white/5 rounded-full">📄 {todaySummary.docs_count} document(s)</span>
          </div>
        )}
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
            <button onClick={() => { setMood(null); localStorage.removeItem("todayMood"); }} className="text-xs text-gray-500 hover:text-gold-400 transition-colors">
              Modifier
            </button>
          </div>
        ) : (
          <div>
            <p className="text-sm text-gray-400 mb-3">😊 Comment te sens-tu aujourd'hui ?</p>
            <div className="flex justify-between">
              {moods.map((m) => (
                <button key={m.value} onClick={() => saveMood(m.value)} className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-white/10 transition-colors">
                  <span className="text-xl">{m.emoji}</span>
                  <span className="text-[10px] text-gray-500">{m.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* TOP 3 PRIORITÉS */}
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        <div className="px-5 pt-4 pb-2 flex items-center justify-between">
          <h2 className="text-sm font-serif text-gold-500 flex items-center gap-2">
            <Target className="w-4 h-4" /> 🎯 TES 3 PRIORITÉS
          </h2>
          {priorities.length > 0 && <span className="text-[10px] text-gray-500">Basé sur l'IA</span>}
        </div>
        <div className="p-5 pt-2">
          {priorities.length > 0 ? (
            <div className="space-y-4">
              {priorities.slice(0, 3).map((priority, idx) => (
                <div key={priority.id} className="group">
                  <div className="flex items-start gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                      idx === 0 ? "bg-red-500/20 text-red-400" : 
                      idx === 1 ? "bg-orange-500/20 text-orange-400" : 
                      "bg-gold-500/20 text-gold-500"
                    }`}>
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <p className="text-ivory text-sm font-medium">{priority.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{priority.priority_reason}</p>
                    </div>
                  </div>
                  {idx < priorities.length - 1 && idx < 2 && <div className="ml-9 mt-3 h-px bg-white/10" />}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <Target className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm text-gray-500">Aucune priorité pour le moment</p>
              <button onClick={() => router.push("/agenda")} className="text-xs text-gold-500 mt-2 hover:underline">
                + Créer une tâche
              </button>
            </div>
          )}
        </div>
      </div>

      {/* TÂCHES URGENTES */}
      {urgentTasks.length > 0 && (
        <div className="bg-red-950/20 border border-red-500/30 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="w-4 h-4 text-red-400" />
            <h3 className="text-sm font-medium text-ivory">⚠️ TÂCHES URGENTES</h3>
          </div>
          <div className="space-y-2">
            {urgentTasks.map((task) => (
              <div key={task.id} className="flex items-center justify-between text-sm">
                <span className="text-gray-300">{task.title}</span>
                {task.due_date && <span className="text-xs text-red-400">📅 {new Date(task.due_date).toLocaleDateString('fr-FR')}</span>}
              </div>
            ))}
          </div>
          <Link href="/agenda" className="text-xs text-gold-500 hover:underline block text-center mt-3">Voir toutes les tâches →</Link>
        </div>
      )}

      {/* 4 MOVES */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/money-opportunities" className="block">
          <div className="bg-gradient-to-br from-emerald-500/5 to-transparent border border-emerald-500/20 rounded-xl p-4 hover:border-emerald-500/40 transition-all group">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <span className="text-xs text-emerald-400/70 uppercase tracking-wider">Move Argent</span>
            </div>
            <p className="text-sm text-ivory">{moneyMove}</p>
            <span className="text-xs text-gold-500 opacity-0 group-hover:opacity-100 transition-opacity mt-2 inline-block">Voir les finances →</span>
          </div>
        </Link>

        <Link href="/family" className="block">
          <div className="bg-gradient-to-br from-pink-500/5 to-transparent border border-pink-500/20 rounded-xl p-4 hover:border-pink-500/40 transition-all group">
            <div className="flex items-center gap-2 mb-2">
              <Heart className="w-4 h-4 text-pink-400" />
              <span className="text-xs text-pink-400/70 uppercase tracking-wider">Move Famille</span>
            </div>
            <p className="text-sm text-ivory">{familyMove}</p>
            <span className="text-xs text-gold-500 opacity-0 group-hover:opacity-100 transition-opacity mt-2 inline-block">Voir famille →</span>
          </div>
        </Link>

        <Link href="/farm" className="block">
          <div className="bg-gradient-to-br from-green-500/5 to-transparent border border-green-500/20 rounded-xl p-4 hover:border-green-500/40 transition-all group">
            <div className="flex items-center gap-2 mb-2">
              <Sprout className="w-4 h-4 text-green-400" />
              <span className="text-xs text-green-400/70 uppercase tracking-wider">Move Ferme</span>
            </div>
            <p className="text-sm text-ivory">{farmNextAction}</p>
            <span className="text-xs text-gold-500 opacity-0 group-hover:opacity-100 transition-opacity mt-2 inline-block">Voir ferme →</span>
          </div>
        </Link>

        <Link href="/rescue-wins" className="block">
          <div className="bg-gradient-to-br from-yellow-500/5 to-transparent border border-yellow-500/20 rounded-xl p-4 hover:border-yellow-500/40 transition-all group">
            <div className="flex items-center gap-2 mb-2">
              <Sun className="w-4 h-4 text-yellow-400" />
              <span className="text-xs text-yellow-400/70 uppercase tracking-wider">Move Stabilisation</span>
            </div>
            <p className="text-sm text-ivory">{stabilizationMove}</p>
            <span className="text-xs text-gold-500 opacity-0 group-hover:opacity-100 transition-opacity mt-2 inline-block">S'aligner →</span>
          </div>
        </Link>
      </div>

      {/* CE QUE BECKS SAIT DE TOI */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-gold-500" />
            <h3 className="text-xs font-medium text-ivory">🧠 Becks se souvient de toi</h3>
          </div>
          <Link href="/memory" className="text-[10px] text-gold-500 hover:underline">Voir tout →</Link>
        </div>
        
        {isLoadingMemories ? (
          <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 text-gold-500 animate-spin" /></div>
        ) : recentMemories.length > 0 ? (
          <div className="space-y-2">
            {recentMemories.map((mem, idx) => (
              <div key={idx} className="flex items-center justify-between group">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-gold-500 text-xs">✨</span>
                  <div className="flex-1 min-w-0">
                    <span className="text-gray-400 text-xs">{mem.key}:</span>
                    <span className="text-ivory text-xs ml-1 truncate block sm:inline">
                      {mem.value.length > 40 ? mem.value.substring(0, 40) + "..." : mem.value}
                    </span>
                  </div>
                </div>
                <button onClick={() => router.push(`/memory?edit=${mem.id}`)} className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-500 hover:text-gold-500">
                  <Edit2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-xs text-gray-500">Aucun souvenir pour l'instant</p>
            <button onClick={() => router.push("/memory")} className="text-xs text-gold-500 mt-2 hover:underline">+ Ajouter un souvenir</button>
          </div>
        )}
      </div>

      {/* MISSIONS ACTIVES */}
      {activeMissions.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-4 h-4 text-gold-500" />
            <h3 className="text-sm font-medium text-ivory">🎯 Missions actives</h3>
          </div>
          <div className="space-y-2">
            {activeMissions.map((mission) => (
              <Link key={mission.id} href="/missions-business" className="flex items-center justify-between p-2 hover:bg-white/5 rounded-lg transition-colors">
                <span className="text-sm text-gray-300">{mission.name}</span>
                <ArrowRight className="w-3 h-3 text-gray-500" />
              </Link>
            ))}
          </div>
          <Link href="/missions-business" className="text-xs text-gold-500 hover:underline block text-center mt-3">Voir toutes les missions →</Link>
        </div>
      )}

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

      {/* WIDGET RESCUE MODE */}
      {overloadData && overloadData.level !== "low" && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className={`rounded-xl p-4 border-2 ${
          overloadData.level === "critical" ? "bg-red-950/30 border-red-500/50" : "bg-orange-950/30 border-orange-500/50"
        }`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <AlertCircle className={`w-5 h-5 ${overloadData.level === "critical" ? "text-red-400" : "text-orange-400"}`} />
              <h3 className="text-sm font-medium text-ivory">
                {overloadData.level === "critical" ? "⚠️ RESCUE MODE RECOMMANDÉ" : "🟡 CHARGE ÉLEVÉE"}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${overloadData.level === "critical" ? "bg-red-500" : "bg-orange-500"}`} style={{ width: `${overloadData.overload_score}%` }} />
              </div>
              <span className="text-xs text-gray-400">{overloadData.overload_score}%</span>
            </div>
          </div>
          <p className="text-sm text-ivory mb-3">{overloadData.message}</p>
          {overloadData.reasons && overloadData.reasons.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {overloadData.reasons.slice(0, 3).map((reason: string, idx: number) => (
                <span key={idx} className="text-xs px-2 py-1 bg-white/5 rounded-full text-gray-400">{reason}</span>
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {overloadData.rescue_actions?.map((action: { type: string; title: string; task_id?: string; duration?: number; url?: string }, idx: number) => (
              <button key={idx} onClick={() => {
                if (action.type === "focus_task" && action.task_id) router.push(`/agenda?highlight=${action.task_id}`);
                else if (action.type === "breathing") toast.info("🌬️ Respire profondément... inspire, expire. 3 fois.", { duration: 10000 });
                else if (action.type === "reset") toast.info(`⏰ Pause de ${action.duration} minutes recommandée`, { duration: 5000 });
                else if (action.url) router.push(action.url);
                else router.push("/rescue-wins");
              }} className="px-3 py-1.5 bg-white/10 rounded-full text-xs text-gray-300 hover:bg-white/20 transition-colors">
                {action.title}
              </button>
            ))}
            <Link href="/rescue-wins" className="px-3 py-1.5 bg-gold-500/20 text-gold-500 rounded-full text-xs hover:bg-gold-500/30 transition-colors">Voir Rescue Mode →</Link>
          </div>
        </motion.div>
      )}
      
      {/* BOUTON D'AIDE - MODE EXÉCUTION */}
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

      {/* MESSAGE DE CLÔTURE DE BECKS */}
      <div className="text-center text-xs text-gray-500 italic">
        <p>✨ "Une chose à la fois. Tu gères." ✨</p>
      </div>

      {/* ========== SECTION ACCÈS RAPIDE ========== */}
      <div className="pt-4 border-t border-white/10">
        <div className="flex items-center gap-2 mb-4">
          <Star className="w-4 h-4 text-gold-500" />
          <h2 className="text-xs font-serif text-gold-500 tracking-wider">ACCÈS RAPIDE</h2>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          <Link href="/inbox" className="flex items-center gap-2 p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all">
            <Inbox className="w-4 h-4 text-blue-400" />
            <span className="text-xs text-gray-300">Brain Dump</span>
          </Link>
          <Link href="/agenda" className="flex items-center gap-2 p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all">
            <CheckSquare className="w-4 h-4 text-blue-400" />
            <span className="text-xs text-gray-300">Agenda</span>
          </Link>
          <Link href="/money-opportunities" className="flex items-center gap-2 p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            <span className="text-xs text-gray-300">Money</span>
          </Link>
          <Link href="/communications" className="flex items-center gap-2 p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all">
            <FolderOpen className="w-4 h-4 text-orange-400" />
            <span className="text-xs text-gray-300">Documents</span>
          </Link>
          <Link href="/missions-business" className="flex items-center gap-2 p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all">
            <Target className="w-4 h-4 text-gold-500" />
            <span className="text-xs text-gray-300">Missions</span>
          </Link>
          <Link href="/farm" className="flex items-center gap-2 p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all">
            <Sprout className="w-4 h-4 text-green-400" />
            <span className="text-xs text-gray-300">Ifè Farm</span>
          </Link>
          <Link href="/family" className="flex items-center gap-2 p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all">
            <Users className="w-4 h-4 text-pink-400" />
            <span className="text-xs text-gray-300">Family</span>
          </Link>
          <Link href="/rescue-wins" className="flex items-center gap-2 p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all">
            <Trophy className="w-4 h-4 text-yellow-400" />
            <span className="text-xs text-gray-300">Wins</span>
          </Link>
          <Link href="/settings" className="flex items-center gap-2 p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all">
            <Settings className="w-4 h-4 text-gray-400" />
            <span className="text-xs text-gray-300">Settings</span>
          </Link>
        </div>
      </div>

      {/* BOUTON BRAIN DUMP RAPIDE */}
      <button
        onClick={() => router.push("/inbox")}
        className="fixed bottom-6 right-6 z-40 bg-gold-500 text-midnight p-4 rounded-full shadow-lg hover:scale-105 transition-transform"
      >
        <Brain className="w-6 h-6" />
      </button>
    </div>
  );
}
