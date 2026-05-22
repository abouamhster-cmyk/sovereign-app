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
  TrendingUp, CalendarDays, FolderOpen, Star, Sun, Moon, TrendingDown,
  Activity, Clock, Award, PieChart, BarChart3, LineChart, Wallet
} from "lucide-react";
import { toast } from "sonner";
import { Line, Bar, Doughnut } from "react-chartjs-2";
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
type Spending = { id: string; title: string; amount: number; category: string; date: string };
type Revenue = { id: string; source: string; amount: number; date: string };
type Memory = { id: string; key: string; value: string; category: string; created_at: string };

export default function DashboardPage() {
  const router = useRouter();
  const [greeting, setGreeting] = useState("");
  const [userName, setUserName] = useState("Rebecca");
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  
  // Données Dashboard
  const [priorities, setPriorities] = useState<Priority[]>([]);
  const [recentTasks, setRecentTasks] = useState<Task[]>([]);
  const [upcomingTasks, setUpcomingTasks] = useState<Task[]>([]);
  const [mood, setMood] = useState<string | null>(null);
  const [activeMissions, setActiveMissions] = useState<Mission[]>([]);
  const [recentMemories, setRecentMemories] = useState<Memory[]>([]);
  
  // Données financières
  const [weeklySpending, setWeeklySpending] = useState<Spending[]>([]);
  const [weeklyRevenue, setWeeklyRevenue] = useState<Revenue[]>([]);
  const [monthlySpending, setMonthlySpending] = useState<Spending[]>([]);
  const [monthlyRevenue, setMonthlyRevenue] = useState<Revenue[]>([]);
  const [spendingByCategory, setSpendingByCategory] = useState<{ category: string; total: number }[]>([]);
  
  // Stats globales
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalSpending, setTotalSpending] = useState(0);
  const [balance, setBalance] = useState(0);
  const [completionRate, setCompletionRate] = useState(0);
  const [overdueCount, setOverdueCount] = useState(0);
  const [winsThisWeek, setWinsThisWeek] = useState(0);
  
  // Suggestion
  const [nextActionSuggestion, setNextActionSuggestion] = useState("");
  const [showSuggestion, setShowSuggestion] = useState(false);
  const [becksMessage, setBecksMessage] = useState("");
  const [isLoadingMessage, setIsLoadingMessage] = useState(true);
  
  // États pour les graphs
  const [selectedPeriod, setSelectedPeriod] = useState<"week" | "month">("week");

  // Récupérer l'utilisateur
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);
    };
    fetchUser();
  }, []);

  // Suggestion toast
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
    
    const savedMood = localStorage.getItem("todayMood");
    const savedDate = localStorage.getItem("todayMoodDate");
    const today = new Date().toISOString().split('T')[0];
    if (savedMood && savedDate === today) setMood(savedMood);
    
    if (userId) fetchAllData();
  }, [userId]);

  // Recharger le nom quand le profil est mis à jour
  useEffect(() => {
    const handleProfileUpdate = () => { if (userId) fetchUserName(); };
    window.addEventListener('profileUpdated', handleProfileUpdate);
    return () => window.removeEventListener('profileUpdated', handleProfileUpdate);
  }, [userId]);

  // Chargement du nom
  useEffect(() => {
    if (userId) fetchUserName();
  }, [userId]);

  async function fetchAllData() {
    if (!userId) return;
    setIsLoading(true);
    await Promise.all([
      fetchUserName(),
      fetchDashboardData(),
      fetchFinancialData(),
      fetchStats()
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
        
        setRecentTasks(data.tasks_today?.slice(0, 3) || []);
        setActiveMissions(data.active_missions || []);
        
        if (data.stats) {
          setCompletionRate(data.stats.completion_rate || 0);
          setOverdueCount(data.stats.overdue_count || 0);
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

  async function fetchFinancialData() {
    if (!userId) return;
    
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(now.getDate() - 7);
    const monthAgo = new Date(now);
    monthAgo.setMonth(now.getMonth() - 1);
    
    const weekAgoStr = weekAgo.toISOString().split('T')[0];
    const monthAgoStr = monthAgo.toISOString().split('T')[0];
    
    // Dépenses
    const { data: allSpending } = await supabase
      .from("spending")
      .select("*")
      .eq("user_id", userId)
      .gte("date", monthAgoStr);
    
    // Revenus
    const { data: allRevenue } = await supabase
      .from("revenue")
      .select("*")
      .eq("user_id", userId)
      .gte("date", monthAgoStr);
    
    const spendingData = allSpending || [];
    const revenueData = allRevenue || [];
    
    // Filtres par période
    setWeeklySpending(spendingData.filter(s => s.date >= weekAgoStr));
    setWeeklyRevenue(revenueData.filter(r => r.date >= weekAgoStr));
    setMonthlySpending(spendingData);
    setMonthlyRevenue(revenueData);
    
    // Totaux
    const totalRev = revenueData.reduce((sum, r) => sum + r.amount, 0);
    const totalSpend = spendingData.reduce((sum, s) => sum + s.amount, 0);
    setTotalRevenue(totalRev);
    setTotalSpending(totalSpend);
    setBalance(totalRev - totalSpend);
    
    // Dépenses par catégorie - Version corrigée sans Map
    const categoriesTotal: { [key: string]: number } = {};
    spendingData.forEach((s: Spending) => {
      const cat = s.category || "other";
      categoriesTotal[cat] = (categoriesTotal[cat] || 0) + s.amount;
    });
    const categoriesArray = Object.entries(categoriesTotal).map(([category, total]) => ({ 
      category: category, 
      total: total 
    }));
    setSpendingByCategory(categoriesArray);
  }

  async function fetchStats() {
    if (!userId) return;
    
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoStr = weekAgo.toISOString().split('T')[0];
    
    // Victoires cette semaine
    const { data: wins } = await supabase
      .from("wins")
      .select("title")
      .eq("user_id", userId)
      .gte("date", weekAgoStr);
    setWinsThisWeek(wins?.length || 0);
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
    const naturalGreetings = [`${greetingText} ${userName}. Rien de prévu aujourd'hui. Tu veux qu'on avance sur un projet ou tu préfères souffler ? 🌱`, `${greetingText} ${userName}. Journée calme. Profites-en pour respirer ou pour prendre de l'avance. 🌸`, `${greetingText} ${userName}. Tout est calme. Besoin de quoi ? 💫`];
    return naturalGreetings[Math.floor(Math.random() * naturalGreetings.length)];
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

  // Préparation des données pour les graphiques
  const getChartData = () => {
    const spendingData = selectedPeriod === "week" ? weeklySpending : monthlySpending;
    const revenueData = selectedPeriod === "week" ? weeklyRevenue : monthlyRevenue;
    
    // Grouper par jour/semaine
    const dateMap = new Map<string, { spending: number; revenue: number }>();
    
    [...spendingData, ...revenueData].forEach(item => {
      const date = item.date;
      if (!dateMap.has(date)) dateMap.set(date, { spending: 0, revenue: 0 });
      const entry = dateMap.get(date)!;
      if ('amount' in item) {
        if ('category' in item) entry.spending += item.amount;
        else entry.revenue += item.amount;
      }
    });
    
    const sortedDates = Array.from(dateMap.keys()).sort();
    const labels = sortedDates.map(d => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }));
    const spendingAmounts = sortedDates.map(d => dateMap.get(d)?.spending || 0);
    const revenueAmounts = sortedDates.map(d => dateMap.get(d)?.revenue || 0);
    
    return { labels, spendingAmounts, revenueAmounts };
  };

  const getCategoryChartData = () => {
    const categories = spendingByCategory.slice(0, 6);
    const categoryNames: Record<string, string> = {
      materials: "Matériaux", construction: "Construction", labor: "Main d'œuvre",
      livestock: "Élevage", crops: "Cultures", transport: "Transport",
      equipment: "Équipement", food: "Alimentation", other: "Autre"
    };
    
    return {
      labels: categories.map(c => categoryNames[c.category] || c.category),
      datasets: [{
        data: categories.map(c => c.total),
        backgroundColor: ['#D4AF37', '#10B981', '#3B82F6', '#EF4444', '#8B5CF6', '#F59E0B'],
        borderWidth: 0
      }]
    };
  };

  const chartData = getChartData();
  const categoryChartData = getCategoryChartData();

  const moods = [
    { value: "excellent", emoji: "🌟", label: "Excellent", color: "text-emerald-400" },
    { value: "bien", emoji: "😊", label: "Bien", color: "text-green-400" },
    { value: "neutre", emoji: "😐", label: "Neutre", color: "text-gray-400" },
    { value: "fatiguée", emoji: "😴", label: "Fatiguée", color: "text-yellow-400" },
    { value: "stressée", emoji: "😰", label: "Stressée", color: "text-red-400" }
  ];
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

      {/* STATS CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-emerald-500/10 to-transparent border border-emerald-500/20 rounded-xl p-4">
          <div className="flex items-center justify-between"><DollarSign className="w-5 h-5 text-emerald-400" /><TrendingUp className="w-4 h-4 text-emerald-400/50" /></div>
          <p className="text-2xl font-serif text-ivory mt-2">{totalRevenue.toLocaleString()} <span className="text-xs text-gray-500">CFA</span></p>
          <p className="text-xs text-gray-500">Revenus (30j)</p>
        </div>
        <div className="bg-gradient-to-br from-red-500/10 to-transparent border border-red-500/20 rounded-xl p-4">
          <div className="flex items-center justify-between"><TrendingDown className="w-5 h-5 text-red-400" /><Activity className="w-4 h-4 text-red-400/50" /></div>
          <p className="text-2xl font-serif text-ivory mt-2">{totalSpending.toLocaleString()} <span className="text-xs text-gray-500">CFA</span></p>
          <p className="text-xs text-gray-500">Dépenses (30j)</p>
        </div>
        <div className={`bg-gradient-to-br ${balance >= 0 ? 'from-emerald-500/10' : 'from-red-500/10'} to-transparent border ${balance >= 0 ? 'border-emerald-500/20' : 'border-red-500/20'} rounded-xl p-4`}>
          <div className="flex items-center justify-between"><Wallet className="w-5 h-5 text-gold-500" /><Target className="w-4 h-4 text-gold-500/50" /></div>
          <p className={`text-2xl font-serif mt-2 ${balance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{balance.toLocaleString()} <span className="text-xs text-gray-500">CFA</span></p>
          <p className="text-xs text-gray-500">Solde net</p>
        </div>
        <div className="bg-gradient-to-br from-gold-500/10 to-transparent border border-gold-500/20 rounded-xl p-4">
          <div className="flex items-center justify-between"><Target className="w-5 h-5 text-gold-500" /><CheckSquare className="w-4 h-4 text-gold-500/50" /></div>
          <p className="text-2xl font-serif text-ivory mt-2">{completionRate}%</p>
          <p className="text-xs text-gray-500">Taux complétion</p>
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

      {/* GRAPHIQUE DES FLUX FINANCIERS */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2"><BarChart3 className="w-4 h-4 text-gold-500" /><h2 className="text-sm font-serif text-gold-500">FLUX FINANCIERS</h2></div>
          <div className="flex gap-2"><button onClick={() => setSelectedPeriod("week")} className={`px-3 py-1 rounded-full text-xs transition-colors ${selectedPeriod === "week" ? "bg-gold-500 text-midnight" : "bg-white/5 text-gray-400"}`}>Semaine</button><button onClick={() => setSelectedPeriod("month")} className={`px-3 py-1 rounded-full text-xs transition-colors ${selectedPeriod === "month" ? "bg-gold-500 text-midnight" : "bg-white/5 text-gray-400"}`}>Mois</button></div>
        </div>
        {chartData.labels.length > 0 ? (
          <div className="h-64">
            <Line data={{ labels: chartData.labels, datasets: [{ label: 'Revenus', data: chartData.revenueAmounts, borderColor: '#10B981', backgroundColor: 'rgba(16, 185, 129, 0.1)', fill: true, tension: 0.4 }, { label: 'Dépenses', data: chartData.spendingAmounts, borderColor: '#EF4444', backgroundColor: 'rgba(239, 68, 68, 0.1)', fill: true, tension: 0.4 }] }} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top', labels: { color: '#9CA3AF' } }, tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${ctx.raw.toLocaleString()} CFA` } } }, scales: { x: { ticks: { color: '#9CA3AF' } }, y: { ticks: { color: '#9CA3AF', callback: (value) => `${value.toLocaleString()} CFA` } } } }} />
          </div>
        ) : (<div className="h-64 flex items-center justify-center text-gray-500">Aucune donnée financière récente</div>)}
      </div>

      {/* TOP 3 PRIORITÉS */}
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        <div className="px-5 pt-4 pb-2 flex items-center justify-between"><h2 className="text-sm font-serif text-gold-500 flex items-center gap-2"><Target className="w-4 h-4" />🎯 TES 3 PRIORITÉS</h2>{priorities.length > 0 && <span className="text-[10px] text-gray-500">Basé sur l'IA</span>}</div>
        <div className="p-5 pt-2">
          {priorities.length > 0 ? (
            <div className="space-y-4">{priorities.slice(0, 3).map((priority, idx) => (<div key={priority.id} className="group"><div className="flex items-start gap-3"><div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${idx === 0 ? "bg-red-500/20 text-red-400" : idx === 1 ? "bg-orange-500/20 text-orange-400" : "bg-gold-500/20 text-gold-500"}`}>{idx + 1}</div><div className="flex-1"><p className="text-ivory text-sm font-medium">{priority.title}</p><p className="text-xs text-gray-500 mt-0.5">{priority.priority_reason}</p></div></div>{idx < priorities.length - 1 && idx < 2 && <div className="ml-9 mt-3 h-px bg-white/10" />}</div>))}</div>
          ) : (<div className="text-center py-6"><Target className="w-8 h-8 mx-auto mb-2 opacity-30" /><p className="text-sm text-gray-500">Aucune priorité pour le moment</p><button onClick={() => router.push("/agenda")} className="text-xs text-gold-500 mt-2 hover:underline">+ Créer une tâche</button></div>)}
        </div>
      </div>

      {/* RÉPARTITION DES DÉPENSES + GRAPHIQUE */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4"><PieChart className="w-4 h-4 text-gold-500" /><h2 className="text-sm font-serif text-gold-500">DÉPENSES PAR CATÉGORIE</h2></div>
          {categoryChartData.labels.length > 0 ? (
            <div className="h-48"><Doughnut data={categoryChartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: '#9CA3AF', font: { size: 10 } } } } }} /></div>
          ) : (<div className="h-48 flex items-center justify-center text-gray-500">Aucune dépense enregistrée</div>)}
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4"><Activity className="w-4 h-4 text-gold-500" /><h2 className="text-sm font-serif text-gold-500">ACTIVITÉ RÉCENTE</h2></div>
          <div className="space-y-3">
            <div className="flex justify-between items-center"><div className="flex items-center gap-2"><CheckSquare className="w-4 h-4 text-emerald-400" /><span className="text-sm text-gray-300">Tâches aujourd'hui</span></div><span className="text-ivory font-medium">{recentTasks.length}</span></div>
            <div className="flex justify-between items-center"><div className="flex items-center gap-2"><Target className="w-4 h-4 text-blue-400" /><span className="text-sm text-gray-300">Missions actives</span></div><span className="text-ivory font-medium">{activeMissions.length}</span></div>
            <div className="flex justify-between items-center"><div className="flex items-center gap-2"><AlertCircle className="w-4 h-4 text-red-400" /><span className="text-sm text-gray-300">Tâches en retard</span></div><span className="text-ivory font-medium">{overdueCount}</span></div>
            <div className="flex justify-between items-center"><div className="flex items-center gap-2"><Award className="w-4 h-4 text-yellow-400" /><span className="text-sm text-gray-300">Victoires (7j)</span></div><span className="text-ivory font-medium">{winsThisWeek}</span></div>
          </div>
          <div className="mt-4 pt-3 border-t border-white/10"><div className="w-full bg-white/10 rounded-full h-1.5"><div className="bg-gold-500 h-1.5 rounded-full" style={{ width: `${Math.min(100, (recentTasks.length / Math.max(1, recentTasks.length + overdueCount)) * 100)}%` }} /></div><p className="text-xs text-gray-500 text-center mt-2">Progression du jour</p></div>
        </div>
      </div>

      {/* TÂCHES À VENIR */}
      {upcomingTasks.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3"><Clock className="w-4 h-4 text-gold-500" /><h3 className="text-sm font-medium text-ivory">📋 TÂCHES À VENIR</h3></div>
          <div className="space-y-2">{upcomingTasks.map((task) => (<div key={task.id} className="flex items-center justify-between text-sm"><span className="text-gray-300">{task.title}</span>{task.due_date && <span className="text-xs text-gray-500">📅 {new Date(task.due_date).toLocaleDateString('fr-FR')}</span>}</div>))}</div>
        </div>
      )}

      {/* BOUTON D'AIDE */}
      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => router.push("/chat?mode=fais-le-avec-moi")} className="w-full py-4 bg-gradient-to-r from-gold-500/20 to-gold-500/5 border border-gold-500/30 rounded-xl text-gold-500 font-medium flex items-center justify-center gap-3 hover:bg-gold-500/30 transition-all"><Sparkles className="w-5 h-5" /><span>🧠 Aide-moi à avancer maintenant</span><ArrowRight className="w-4 h-4" /></motion.button>

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

      {/* BOUTON BRAIN DUMP RAPIDE */}
      <button onClick={() => router.push("/inbox")} className="fixed bottom-6 right-6 z-40 bg-gold-500 text-midnight p-4 rounded-full shadow-lg hover:scale-105 transition-transform"><Brain className="w-6 h-6" /></button>
    </div>
  );
}
