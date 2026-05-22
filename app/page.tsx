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
  TrendingUp, CalendarDays, FolderOpen, Star, Sun, Moon, BarChart3,
  PieChart, LineChart, Activity, CreditCard, Wallet, Clock
} from "lucide-react";
import { toast } from "sonner";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Bar, Pie, Doughnut } from 'react-chartjs-2';

// Enregistrement des composants Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const API_URL = "https://sovereign-bridge.onrender.com";

// Types
type Priority = { id: string; title: string; priority_reason: string; score: number };
type Task = { id: string; title: string; due_date: string | null; status: string; priority: string };
type Mission = { id: string; name: string; status: string; priority: string };
type Spending = { 
  id: string; 
  title: string; 
  amount: number; 
  category: string; 
  date: string; 
  notes?: string; 
  project?: string;
};

type Revenue = { 
  id: string; 
  source: string; 
  amount: number; 
  date: string; 
  notes?: string; 
  project?: string;
};
type Memory = { id: string; key: string; value: string; category: string; created_at: string };

// Configuration des couleurs
const chartColors = {
  gold: '#D4AF37',
  goldLight: 'rgba(212, 175, 55, 0.2)',
  red: '#EF4444',
  redLight: 'rgba(239, 68, 68, 0.2)',
  green: '#10B981',
  greenLight: 'rgba(16, 185, 129, 0.2)',
  blue: '#3B82F6',
  blueLight: 'rgba(59, 130, 246, 0.2)',
  purple: '#8B5CF6',
  orange: '#F59E0B',
  pink: '#EC4899',
  cyan: '#06B6D4'
};

export default function DashboardPage() {
  const router = useRouter();
  const [greeting, setGreeting] = useState("");
  const [userName, setUserName] = useState("Rebecca");
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  
  // Données existantes
  const [priorities, setPriorities] = useState<Priority[]>([]);
  const [urgentTasks, setUrgentTasks] = useState<Task[]>([]);
  const [activeMissions, setActiveMissions] = useState<Mission[]>([]);
  const [recentMemories, setRecentMemories] = useState<Memory[]>([]);
  const [overloadData, setOverloadData] = useState<any>(null);
  const [isLoadingMemories, setIsLoadingMemories] = useState(true);
  const [becksMessage, setBecksMessage] = useState("");
  const [isLoadingMessage, setIsLoadingMessage] = useState(true);
  const [mood, setMood] = useState<string | null>(null);
  
  // NOUVELLES DONNÉES POUR GRAPHIQUES
  const [recentSpending, setRecentSpending] = useState<Spending[]>([]);
  const [recentRevenue, setRecentRevenue] = useState<Revenue[]>([]);
  const [weeklyProgress, setWeeklyProgress] = useState<{ day: string; completed: number; created: number }[]>([]);
  const [tasksByStatus, setTasksByStatus] = useState<{ status: string; count: number }[]>([]);
  const [upcomingTasks, setUpcomingTasks] = useState<Task[]>([]);
  const [financialSummary, setFinancialSummary] = useState({ revenue: 0, spending: 0, balance: 0 });
  const [completionRate, setCompletionRate] = useState(0);
  
  // Stats pour les moves
  const [farmNextAction, setFarmNextAction] = useState("Vérifier l'avancement");

  // Récupérer l'utilisateur
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);
    };
    fetchUser();
  }, []);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Bonjour");
    else if (hour < 18) setGreeting("Bon après-midi");
    else setGreeting("Bonsoir");
    
    const savedMood = localStorage.getItem("todayMood");
    const savedDate = localStorage.getItem("todayMoodDate");
    const today = new Date().toISOString().split('T')[0];
    if (savedMood && savedDate === today) setMood(savedMood);
    
    if (userId) fetchAllData();
  }, [userId]);

  async function fetchAllData() {
    if (!userId) return;
    setIsLoading(true);
    await Promise.all([
      fetchUserName(),
      fetchDashboardData(),
      fetchChartData(),
      fetchRecentMemories(),
      fetchOverloadDetection(),
      fetchFarmStatus()
    ]);
    setIsLoading(false);
  }

  async function fetchUserName() {
    const { data: profile } = await supabase
      .from("user_profile")
      .select("preferred_name")
      .eq("user_id", userId)
      .maybeSingle();
    if (profile?.preferred_name) setUserName(profile.preferred_name);
  }

  async function fetchDashboardData() {
    if (!userId) return;
    try {
      const response = await fetch(`${API_URL}/api/dashboard/today?user_id=${userId}`);
      const data = await response.json();
      
      if (data.success) {
        if (data.greeting) setBecksMessage(data.greeting);
        else await generateDynamicGreeting();
        setIsLoadingMessage(false);
        
        const formattedPriorities = data.top_priorities?.map((p: any) => ({
          id: p.id, title: p.title, priority_reason: p.reason, score: p.score
        })) || [];
        setPriorities(formattedPriorities);
        
        const allTasks = [...(data.overdue_tasks || []), ...(data.tasks_today || [])];
        setUrgentTasks(allTasks.slice(0, 5));
        setActiveMissions(data.active_missions || []);
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
        body: JSON.stringify({ tasks_count: tasksCount, overdue_count: overdueCount, wins_count: winsCount, missions_count: missionsCount, mood: currentMood, hour: new Date().getHours(), user_id: userId })
      });
      const data = await response.json();
      if (data.success && data.greeting) setBecksMessage(data.greeting);
      else setBecksMessage(fallbackGreeting(tasksCount, overdueCount, winsCount, missionsCount, currentMood));
    } catch (error) {
      setBecksMessage(fallbackGreeting(0, 0, 0, 0, null));
    }
  }

  function fallbackGreeting(tasksCount: number, overdueCount: number, winsCount: number, missionsCount: number, mood: string | null): string {
    const hour = new Date().getHours();
    let greetingText = hour < 12 ? "Bonjour" : hour < 18 ? "Bon après-midi" : "Bonsoir";
    if (mood === "fatiguée") return `${greetingText} ${userName}. Je sens que tu es fatiguée. On y va doucement aujourd'hui. 🌿`;
    if (mood === "stressée") return `${greetingText} ${userName}. Je sens que tu es stressée. On respire et on priorise l'essentiel. 💖`;
    if (overdueCount > 0) return `${greetingText} ${userName}. Tu as ${overdueCount} tâche(s) en retard. On regarde ça ensemble ? 👑`;
    if (tasksCount > 0) return `${greetingText} ${userName}. Tu as ${tasksCount} chose(s) à faire aujourd'hui. Je suis là si tu veux. ✨`;
    if (winsCount > 0) return `${greetingText} ${userName}. ${winsCount} victoire(s) récente(s) ! C'est bien. Continue comme ça. 🏆`;
    if (missionsCount > 0) return `${greetingText} ${userName}. ${missionsCount} mission(s) active(s). Tu veux qu'on avance sur l'une d'elles ? 🎯`;
    return `${greetingText} ${userName}. Rien de prévu aujourd'hui. Tu veux qu'on avance sur un projet ou tu préfères souffler ? 🌱`;
  }

 async function fetchChartData() {
  if (!userId) return;
  
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  const endOfWeek = new Date(today);
  endOfWeek.setDate(today.getDate() + (6 - today.getDay()));
  
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];
  
  // 1. Dépenses des 7 derniers jours - CORRIGÉ
  const { data: spendingData } = await supabase
    .from("spending")
    .select("id, title, amount, category, date")  // ← Ajout des champs manquants
    .eq("user_id", userId)
    .gte("date", sevenDaysAgoStr);
  setRecentSpending((spendingData || []) as Spending[]);
  
  // 2. Revenus des 7 derniers jours - CORRIGÉ
  const { data: revenueData } = await supabase
    .from("revenue")
    .select("id, source, amount, date")  // ← Ajout des champs
    .eq("user_id", userId)
    .gte("date", sevenDaysAgoStr);
  setRecentRevenue((revenueData || []) as Revenue[]);
  
  // 3. Calcul des totaux financiers
  const totalRevenue = (revenueData || []).reduce((sum, r) => sum + (r.amount || 0), 0);
  const totalSpending = (spendingData || []).reduce((sum, s) => sum + (s.amount || 0), 0);
  setFinancialSummary({ revenue: totalRevenue, spending: totalSpending, balance: totalRevenue - totalSpending });
  
  // 4. Progression hebdomadaire des tâches
  const startOfWeekStr = startOfWeek.toISOString().split('T')[0];
  const { data: tasksData } = await supabase
    .from("tasks")
    .select("title, status, created_at, updated_at")
    .eq("user_id", userId)
    .gte("created_at", startOfWeekStr);
  
  const days = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
  const weekly = days.map((day, i) => {
    const dayDate = new Date(startOfWeek);
    dayDate.setDate(startOfWeek.getDate() + i);
    const dateStr = dayDate.toISOString().split('T')[0];
    
    const completed = (tasksData || []).filter(t => 
      t.status === 'done' && t.updated_at?.startsWith(dateStr)
    ).length;
    const created = (tasksData || []).filter(t => 
      t.created_at?.startsWith(dateStr)
    ).length;
    
    return { day, completed, created };
  });
  setWeeklyProgress(weekly);
  
  // 5. Tâches par statut
  const { data: allTasks } = await supabase
    .from("tasks")
    .select("status")
    .eq("user_id", userId);
  
  const statusCounts: Record<string, number> = {};
  (allTasks || []).forEach(t => {
    statusCounts[t.status] = (statusCounts[t.status] || 0) + 1;
  });
  setTasksByStatus(Object.entries(statusCounts).map(([status, count]) => ({ status, count })));
  
  // 6. Taux de complétion global
  const totalTasks = (allTasks || []).length;
  const completedTasks = (allTasks || []).filter(t => t.status === 'done').length;
  setCompletionRate(totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0);
  
  // 7. Tâches à échéance proche (7 jours)
  const nextWeek = new Date();
  nextWeek.setDate(today.getDate() + 7);
  const nextWeekStr = nextWeek.toISOString().split('T')[0];
  const todayStr = today.toISOString().split('T')[0];
  
  const { data: upcoming } = await supabase
    .from("tasks")
    .select("id, title, due_date, priority")
    .eq("user_id", userId)
    .gte("due_date", todayStr)
    .lte("due_date", nextWeekStr)
    .neq("status", "done")
    .order("due_date", { ascending: true })
    .limit(5);
  setUpcomingTasks((upcoming || []) as Task[]);
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
      if (production[0] || infra[0]) setFarmNextAction(`Finaliser ${(production[0] || infra[0]).name}`);
    } catch (error) { console.error("Erreur farm status:", error); }
  }

  async function fetchOverloadDetection() {
    if (!userId) return;
    try {
      const response = await fetch(`${API_URL}/api/rescue/detect-overload`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ user_id: userId }) });
      const data = await response.json();
      if (data.success) setOverloadData(data);
    } catch (error) { console.error("Erreur détection surcharge:", error); }
  }

  async function fetchRecentMemories() {
    if (!userId) return;
    setIsLoadingMemories(true);
    try {
      const response = await fetch(`${API_URL}/api/memory/get?user_id=${userId}&limit=5`);
      const data = await response.json();
      if (data.success && data.data) setRecentMemories(data.data.slice(0, 5));
    } catch (error) { console.error("Erreur fetch memories:", error); }
    finally { setIsLoadingMemories(false); }
  }

  async function saveMood(selectedMood: string) {
    if (!userId) return;
    const today = new Date().toISOString().split('T')[0];
    setMood(selectedMood);
    localStorage.setItem("todayMood", selectedMood);
    localStorage.setItem("todayMoodDate", today);
    await fetch(`${API_URL}/api/mood/save`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mood: selectedMood, user_id: userId }) });
    window.dispatchEvent(new CustomEvent('moodChange', { detail: { mood: selectedMood } }));
  }

  // Configuration des graphiques
  const spendingChartData = {
    labels: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'],
    datasets: [
      {
        label: 'Dépenses (CFA)',
        data: weeklyProgress.map(w => {
          const daySpending = recentSpending.filter(s => new Date(s.date).getDay() === weeklyProgress.findIndex(w2 => w2.day === w.day));
          return daySpending.reduce((sum, s) => sum + s.amount, 0);
        }),
        borderColor: chartColors.red,
        backgroundColor: chartColors.redLight,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: chartColors.red,
        pointBorderColor: '#fff',
        pointRadius: 4,
        pointHoverRadius: 6
      },
      {
        label: 'Revenus (CFA)',
        data: weeklyProgress.map(w => {
          const dayRevenue = recentRevenue.filter(r => new Date(r.date).getDay() === weeklyProgress.findIndex(w2 => w2.day === w.day));
          return dayRevenue.reduce((sum, r) => sum + r.amount, 0);
        }),
        borderColor: chartColors.green,
        backgroundColor: chartColors.greenLight,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: chartColors.green,
        pointBorderColor: '#fff',
        pointRadius: 4,
        pointHoverRadius: 6
      }
    ]
  };

  const tasksProgressData = {
    labels: weeklyProgress.map(w => w.day),
    datasets: [
      {
        label: 'Tâches créées',
        data: weeklyProgress.map(w => w.created),
        backgroundColor: chartColors.blue,
        borderRadius: 8
      },
      {
        label: 'Tâches terminées',
        data: weeklyProgress.map(w => w.completed),
        backgroundColor: chartColors.green,
        borderRadius: 8
      }
    ]
  };

  const tasksStatusData = {
    labels: tasksByStatus.map(t => {
      const statusMap: Record<string, string> = { not_started: 'À faire', today: 'Aujourd\'hui', in_progress: 'En cours', waiting: 'En attente', done: 'Terminé' };
      return statusMap[t.status] || t.status;
    }),
    datasets: [{
      data: tasksByStatus.map(t => t.count),
      backgroundColor: [chartColors.blue, chartColors.orange, chartColors.purple, chartColors.cyan, chartColors.green],
      borderWidth: 0
    }]
  };

  const moods = [
    { value: "excellent", emoji: "🌟", label: "Excellent", color: "text-emerald-400" },
    { value: "bien", emoji: "😊", label: "Bien", color: "text-green-400" },
    { value: "neutre", emoji: "😐", label: "Neutre", color: "text-gray-400" },
    { value: "fatiguée", emoji: "😴", label: "Fatiguée", color: "text-yellow-400" },
    { value: "stressée", emoji: "😰", label: "Stressée", color: "text-red-400" }
  ];

  const handleHelpMeMoveForward = () => router.push("/chat?mode=fais-le-avec-moi");
  const currentMood = moods.find(m => m.value === mood);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-24 px-4">
      {/* HEADER */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-serif text-ivory">
              {greeting}, {userName}. <Crown className="inline w-5 h-5 text-gold-500" />
            </h1>
            <p className="text-xs text-gray-500 mt-1">{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          </div>
          <Link href="/settings" className="p-2 text-gray-400 hover:text-gold-500 transition-colors">
            <Settings className="w-5 h-5" />
          </Link>
        </div>
      
        {/* Message Becks */}
        <div className="bg-gradient-to-r from-gold-500/10 to-transparent border-l-4 border-gold-500 rounded-xl p-4">
          {isLoadingMessage ? (
            <div className="flex items-center gap-2"><Loader2 className="w-4 h-4 text-gold-500 animate-spin" /><span className="text-sm text-gray-400">Becks réfléchit...</span></div>
          ) : (
            <div className="flex items-start gap-3"><Sparkles className="w-5 h-5 text-gold-500 mt-0.5 flex-shrink-0" /><p className="text-ivory text-sm leading-relaxed">{becksMessage}</p></div>
          )}
        </div>
      </div>

      {/* HUMEUR DU JOUR */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        {mood ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3"><span className="text-2xl">{currentMood?.emoji}</span><div><p className="text-xs text-gray-500">Humeur du jour</p><p className={`text-sm ${currentMood?.color}`}>{currentMood?.label}</p></div></div>
            <button onClick={() => { setMood(null); localStorage.removeItem("todayMood"); }} className="text-xs text-gray-500 hover:text-gold-400">Modifier</button>
          </div>
        ) : (
          <div><p className="text-sm text-gray-400 mb-3">😊 Comment te sens-tu aujourd'hui ?</p><div className="flex justify-between">{moods.map((m) => (<button key={m.value} onClick={() => saveMood(m.value)} className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-white/10"><span className="text-xl">{m.emoji}</span><span className="text-[10px] text-gray-500">{m.label}</span></button>))}</div></div>
        )}
      </div>

      {/* ========== CARTES FINANCIÈRES ========== */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gradient-to-br from-emerald-500/10 to-transparent border border-emerald-500/20 rounded-xl p-3 text-center">
          <Wallet className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
          <p className="text-xs text-gray-500">Revenus (7j)</p>
          <p className="text-lg font-serif text-emerald-400">{financialSummary.revenue.toLocaleString()} CFA</p>
        </div>
        <div className="bg-gradient-to-br from-red-500/10 to-transparent border border-red-500/20 rounded-xl p-3 text-center">
          <CreditCard className="w-4 h-4 text-red-400 mx-auto mb-1" />
          <p className="text-xs text-gray-500">Dépenses (7j)</p>
          <p className="text-lg font-serif text-red-400">{financialSummary.spending.toLocaleString()} CFA</p>
        </div>
        <div className={`bg-gradient-to-br ${financialSummary.balance >= 0 ? 'from-emerald-500/10' : 'from-red-500/10'} to-transparent border ${financialSummary.balance >= 0 ? 'border-emerald-500/20' : 'border-red-500/20'} rounded-xl p-3 text-center`}>
          <Activity className="w-4 h-4 mx-auto mb-1" />
          <p className="text-xs text-gray-500">Solde net</p>
          <p className={`text-lg font-serif ${financialSummary.balance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{financialSummary.balance.toLocaleString()} CFA</p>
        </div>
      </div>

      {/* ========== GRAPHIQUE DES FLUX FINANCIERS ========== */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-serif text-gold-500 flex items-center gap-2"><LineChart className="w-4 h-4" /> Flux financiers (7 jours)</h2>
          <span className="text-[10px] text-gray-500">Revenus vs Dépenses</span>
        </div>
        <div className="h-48">
          <Line data={spendingChartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: '#9CA3AF', font: { size: 10 } } } }, scales: { x: { ticks: { color: '#9CA3AF' } }, y: { ticks: { color: '#9CA3AF' } } } }} />
        </div>
      </div>

      {/* ========== DOUBLE GRAPHIQUE ========== */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Progression des tâches */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-serif text-gold-500 flex items-center gap-2"><BarChart3 className="w-4 h-4" /> Progression hebdo</h2>
            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500" /><span className="text-[10px] text-gray-500">Créées</span><div className="w-2 h-2 rounded-full bg-green-500 ml-2" /><span className="text-[10px] text-gray-500">Terminées</span></div>
          </div>
          <div className="h-40">
            <Bar 
              data={tasksProgressData} 
              options={{ 
                responsive: true, 
                maintainAspectRatio: false, 
                plugins: { legend: { display: false } }, 
                scales: { 
                  x: { ticks: { color: '#9CA3AF', font: { size: 9 } } }, 
                  y: { ticks: { color: '#9CA3AF' } } 
                } 
              }} 
            />
          </div>
        </div>
      
        {/* Répartition des tâches par statut */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-serif text-gold-500 flex items-center gap-2"><PieChart className="w-4 h-4" /> Répartition des tâches</h2>
            <span className="text-[10px] text-gray-500">Taux complétion: {completionRate}%</span>
          </div>
          <div className="h-40 flex items-center justify-center">
            <Doughnut 
              data={tasksStatusData} 
              options={{ 
                responsive: true, 
                maintainAspectRatio: false, 
                plugins: { 
                  legend: { position: 'right', labels: { color: '#9CA3AF', font: { size: 9 } } } 
                } 
              }} 
            />
          </div>
        </div>
      </div>

      {/* ========== TOP 3 PRIORITÉS ========== */}
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        <div className="px-5 pt-4 pb-2 flex items-center justify-between">
          <h2 className="text-sm font-serif text-gold-500 flex items-center gap-2"><Target className="w-4 h-4" /> 🎯 TES 3 PRIORITÉS</h2>
          {priorities.length > 0 && <span className="text-[10px] text-gray-500">Basé sur l'IA</span>}
        </div>
        <div className="p-5 pt-2">
          {priorities.length > 0 ? (
            <div className="space-y-4">
              {priorities.slice(0, 3).map((priority, idx) => (
                <div key={priority.id} className="group">
                  <div className="flex items-start gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${idx === 0 ? "bg-red-500/20 text-red-400" : idx === 1 ? "bg-orange-500/20 text-orange-400" : "bg-gold-500/20 text-gold-500"}`}>{idx + 1}</div>
                    <div className="flex-1"><p className="text-ivory text-sm font-medium">{priority.title}</p><p className="text-xs text-gray-500 mt-0.5">{priority.priority_reason}</p></div>
                  </div>
                  {idx < priorities.length - 1 && idx < 2 && <div className="ml-9 mt-3 h-px bg-white/10" />}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6"><Target className="w-8 h-8 mx-auto mb-2 opacity-30" /><p className="text-sm text-gray-500">Aucune priorité pour le moment</p><button onClick={() => router.push("/agenda")} className="text-xs text-gold-500 mt-2 hover:underline">+ Créer une tâche</button></div>
          )}
        </div>
      </div>

      {/* ========== TÂCHES À ÉCHÉANCE ========== */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3"><Clock className="w-4 h-4 text-orange-400" /><h3 className="text-sm font-medium text-ivory">📅 Tâches à échéance (7 prochains jours)</h3></div>
        {upcomingTasks.length > 0 ? (
          <div className="space-y-2">
            {upcomingTasks.map((task) => (
              <div key={task.id} className="flex items-center justify-between text-sm p-2 hover:bg-white/5 rounded-lg">
                <span className="text-gray-300">{task.title}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${task.priority === 'critical' ? 'bg-red-500/20 text-red-400' : task.priority === 'high' ? 'bg-orange-500/20 text-orange-400' : 'bg-blue-500/20 text-blue-400'}`}>
                  📅 {new Date(task.due_date!).toLocaleDateString('fr-FR')}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 text-center py-4">Aucune tâche à échéance proche</p>
        )}
        <Link href="/agenda" className="text-xs text-gold-500 hover:underline block text-center mt-3">Voir toutes les tâches →</Link>
      </div>

      {/* TÂCHES URGENTES */}
      {urgentTasks.length > 0 && (
        <div className="bg-red-950/20 border border-red-500/30 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3"><AlertCircle className="w-4 h-4 text-red-400" /><h3 className="text-sm font-medium text-ivory">⚠️ TÂCHES URGENTES</h3></div>
          <div className="space-y-2">{urgentTasks.map((task) => (<div key={task.id} className="flex items-center justify-between text-sm"><span className="text-gray-300">{task.title}</span>{task.due_date && <span className="text-xs text-red-400">📅 {new Date(task.due_date).toLocaleDateString('fr-FR')}</span>}</div>))}</div>
          <Link href="/agenda" className="text-xs text-gold-500 hover:underline block text-center mt-3">Voir toutes les tâches →</Link>
        </div>
      )}

      {/* 4 MOVES */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/money-opportunities" className="block"><div className="bg-gradient-to-br from-emerald-500/5 to-transparent border border-emerald-500/20 rounded-xl p-4 hover:border-emerald-500/40"><div className="flex items-center gap-2 mb-2"><DollarSign className="w-4 h-4 text-emerald-400" /><span className="text-xs text-emerald-400/70 uppercase tracking-wider">Move Argent</span></div><p className="text-sm text-ivory">{financialSummary.balance >= 0 ? `Solde positif: ${financialSummary.balance.toLocaleString()} CFA` : `Solde négatif: ${Math.abs(financialSummary.balance).toLocaleString()} CFA`}</p><span className="text-xs text-gold-500 opacity-0 group-hover:opacity-100 transition-opacity mt-2 inline-block">Voir les finances →</span></div></Link>
        <Link href="/family" className="block"><div className="bg-gradient-to-br from-pink-500/5 to-transparent border border-pink-500/20 rounded-xl p-4 hover:border-pink-500/40"><div className="flex items-center gap-2 mb-2"><Heart className="w-4 h-4 text-pink-400" /><span className="text-xs text-pink-400/70 uppercase tracking-wider">Move Famille</span></div><p className="text-sm text-ivory">Prendre des nouvelles des enfants</p><span className="text-xs text-gold-500 opacity-0 group-hover:opacity-100 transition-opacity mt-2 inline-block">Voir famille →</span></div></Link>
        <Link href="/farm" className="block"><div className="bg-gradient-to-br from-green-500/5 to-transparent border border-green-500/20 rounded-xl p-4 hover:border-green-500/40"><div className="flex items-center gap-2 mb-2"><Sprout className="w-4 h-4 text-green-400" /><span className="text-xs text-green-400/70 uppercase tracking-wider">Move Ferme</span></div><p className="text-sm text-ivory">{farmNextAction}</p><span className="text-xs text-gold-500 opacity-0 group-hover:opacity-100 transition-opacity mt-2 inline-block">Voir ferme →</span></div></Link>
        <Link href="/rescue-wins" className="block"><div className="bg-gradient-to-br from-yellow-500/5 to-transparent border border-yellow-500/20 rounded-xl p-4 hover:border-yellow-500/40"><div className="flex items-center gap-2 mb-2"><Sun className="w-4 h-4 text-yellow-400" /><span className="text-xs text-yellow-400/70 uppercase tracking-wider">Move Stabilisation</span></div><p className="text-sm text-ivory">Prendre 5 minutes pour respirer</p><span className="text-xs text-gold-500 opacity-0 group-hover:opacity-100 transition-opacity mt-2 inline-block">S'aligner →</span></div></Link>
      </div>

      {/* CE QUE BECKS SAIT DE TOI */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3"><div className="flex items-center gap-2"><Brain className="w-4 h-4 text-gold-500" /><h3 className="text-xs font-medium text-ivory">🧠 Becks se souvient de toi</h3></div><Link href="/memory" className="text-[10px] text-gold-500 hover:underline">Voir tout →</Link></div>
        {isLoadingMemories ? (<div className="flex justify-center py-4"><Loader2 className="w-4 h-4 text-gold-500 animate-spin" /></div>) : recentMemories.length > 0 ? (<div className="space-y-2">{recentMemories.map((mem, idx) => (<div key={idx} className="flex items-center justify-between group"><div className="flex items-center gap-2 flex-1 min-w-0"><span className="text-gold-500 text-xs">✨</span><div className="flex-1 min-w-0"><span className="text-gray-400 text-xs">{mem.key}:</span><span className="text-ivory text-xs ml-1 truncate block sm:inline">{mem.value.length > 40 ? mem.value.substring(0, 40) + "..." : mem.value}</span></div></div><button onClick={() => router.push(`/memory?edit=${mem.id}`)} className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-500 hover:text-gold-500"><Edit2 className="w-3 h-3" /></button></div>))}</div>) : (<div className="text-center py-4"><p className="text-xs text-gray-500">Aucun souvenir pour l'instant</p><button onClick={() => router.push("/memory")} className="text-xs text-gold-500 mt-2 hover:underline">+ Ajouter un souvenir</button></div>)}
      </div>

      {/* MISSIONS ACTIVES */}
      {activeMissions.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3"><Target className="w-4 h-4 text-gold-500" /><h3 className="text-sm font-medium text-ivory">🎯 Missions actives</h3></div>
          <div className="space-y-2">{activeMissions.map((mission) => (<Link key={mission.id} href="/missions-business" className="flex items-center justify-between p-2 hover:bg-white/5 rounded-lg"><span className="text-sm text-gray-300">{mission.name}</span><ArrowRight className="w-3 h-3 text-gray-500" /></Link>))}</div>
          <Link href="/missions-business" className="text-xs text-gold-500 hover:underline block text-center mt-3">Voir toutes les missions →</Link>
        </div>
      )}

      {/* RESCUE MODE ALERT */}
      {overloadData && overloadData.level !== "low" && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className={`rounded-xl p-4 border-2 ${overloadData.level === "critical" ? "bg-red-950/30 border-red-500/50" : "bg-orange-950/30 border-orange-500/50"}`}>
          <div className="flex items-center justify-between mb-3"><div className="flex items-center gap-2"><AlertCircle className={`w-5 h-5 ${overloadData.level === "critical" ? "text-red-400" : "text-orange-400"}`} /><h3 className="text-sm font-medium text-ivory">{overloadData.level === "critical" ? "⚠️ RESCUE MODE RECOMMANDÉ" : "🟡 CHARGE ÉLEVÉE"}</h3></div><div className="flex items-center gap-2"><div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden"><div className={`h-full rounded-full ${overloadData.level === "critical" ? "bg-red-500" : "bg-orange-500"}`} style={{ width: `${overloadData.overload_score}%` }} /></div><span className="text-xs text-gray-400">{overloadData.overload_score}%</span></div></div>
          <p className="text-sm text-ivory mb-3">{overloadData.message}</p>
          <div className="flex flex-wrap gap-2">{overloadData.rescue_actions?.slice(0, 3).map((action: any, idx: number) => (<button key={idx} onClick={() => { if (action.type === "focus_task" && action.task_id) router.push(`/agenda?highlight=${action.task_id}`); else if (action.type === "breathing") toast.info("🌬️ Respire profondément...", { duration: 10000 }); else if (action.url) router.push(action.url); else router.push("/rescue-wins"); }} className="px-3 py-1.5 bg-white/10 rounded-full text-xs text-gray-300 hover:bg-white/20">{action.title}</button>))}<Link href="/rescue-wins" className="px-3 py-1.5 bg-gold-500/20 text-gold-500 rounded-full text-xs hover:bg-gold-500/30">Voir Rescue Mode →</Link></div>
        </motion.div>
      )}
      
      {/* BOUTON D'AIDE */}
      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleHelpMeMoveForward} className="w-full py-4 bg-gradient-to-r from-gold-500/20 to-gold-500/5 border border-gold-500/30 rounded-xl text-gold-500 font-medium flex items-center justify-center gap-3 hover:bg-gold-500/30"><Sparkles className="w-5 h-5" /><span>🧠 Aide-moi à avancer maintenant</span><ArrowRight className="w-4 h-4" /></motion.button>

      {/* ACCÈS RAPIDE */}
      <div className="pt-4 border-t border-white/10">
        <div className="flex items-center gap-2 mb-4"><Star className="w-4 h-4 text-gold-500" /><h2 className="text-xs font-serif text-gold-500 tracking-wider">ACCÈS RAPIDE</h2></div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          <Link href="/inbox" className="flex items-center gap-2 p-2 rounded-lg bg-white/5 hover:bg-white/10"><Inbox className="w-4 h-4 text-blue-400" /><span className="text-xs text-gray-300">Brain Dump</span></Link>
          <Link href="/agenda" className="flex items-center gap-2 p-2 rounded-lg bg-white/5 hover:bg-white/10"><CheckSquare className="w-4 h-4 text-blue-400" /><span className="text-xs text-gray-300">Agenda</span></Link>
          <Link href="/money-opportunities" className="flex items-center gap-2 p-2 rounded-lg bg-white/5 hover:bg-white/10"><DollarSign className="w-4 h-4 text-emerald-400" /><span className="text-xs text-gray-300">Money</span></Link>
          <Link href="/communications" className="flex items-center gap-2 p-2 rounded-lg bg-white/5 hover:bg-white/10"><FolderOpen className="w-4 h-4 text-orange-400" /><span className="text-xs text-gray-300">Documents</span></Link>
          <Link href="/missions-business" className="flex items-center gap-2 p-2 rounded-lg bg-white/5 hover:bg-white/10"><Target className="w-4 h-4 text-gold-500" /><span className="text-xs text-gray-300">Missions</span></Link>
          <Link href="/farm" className="flex items-center gap-2 p-2 rounded-lg bg-white/5 hover:bg-white/10"><Sprout className="w-4 h-4 text-green-400" /><span className="text-xs text-gray-300">Ifè Farm</span></Link>
          <Link href="/family" className="flex items-center gap-2 p-2 rounded-lg bg-white/5 hover:bg-white/10"><Users className="w-4 h-4 text-pink-400" /><span className="text-xs text-gray-300">Family</span></Link>
          <Link href="/rescue-wins" className="flex items-center gap-2 p-2 rounded-lg bg-white/5 hover:bg-white/10"><Trophy className="w-4 h-4 text-yellow-400" /><span className="text-xs text-gray-300">Wins</span></Link>
        </div>
      </div>

      {/* BOUTON BRAIN DUMP FLOTTANT */}
      <button onClick={() => router.push("/inbox")} className="fixed bottom-6 right-6 z-40 bg-gold-500 text-midnight p-4 rounded-full shadow-lg hover:scale-105 transition-transform"><Brain className="w-6 h-6" /></button>
    </div>
  );
}
