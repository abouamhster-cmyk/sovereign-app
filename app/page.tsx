"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Crown, Settings, Sparkles, Target, DollarSign, Heart, Sprout, Brain,
  Calendar, AlertCircle, ArrowRight, Loader2, Edit2, Inbox, CheckSquare, 
  Briefcase, Globe, Trophy, Users, Zap, ShieldAlert, Map, Mail, FileText, 
  TrendingUp, CalendarDays, FolderOpen, Star, Sun, Moon, BarChart3,
  PieChart, LineChart, Activity, CreditCard, Wallet, Clock, MessageCircle,
  WifiOff
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
import { Line, Bar, Doughnut } from 'react-chartjs-2';

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

// =====================================================
// TYPES (alignés avec le backend)
// =====================================================

type Priority = { 
  id: string; 
  title: string; 
  priority_reason: string;
  score: number;
  source: string;
  source_id: string;
};

type Task = { 
  id: string; 
  title: string; 
  due_date: string | null; 
  status: string; 
  priority: string 
};

type Mission = { 
  id: string; 
  name: string; 
  status: string; 
  priority: string 
};

type Spending = { id: string; title: string; amount: number; category: string; date: string };
type Revenue = { id: string; source: string; amount: number; date: string };
type Memory = { id: string; key: string; value: string; category: string };

const chartColors = {
  gold: '#D4AF37',
  red: '#EF4444',
  redLight: 'rgba(239, 68, 68, 0.2)',
  green: '#10B981',
  greenLight: 'rgba(16, 185, 129, 0.2)',
  blue: '#3B82F6',
  orange: '#F59E0B',
  purple: '#8B5CF6',
  cyan: '#06B6D4'
};

// Phrases interdites (filtrage)
const FORBIDDEN_PATTERNS = [
  /prends soin de toi/i,
  /une chose à la fois/i,
  /tu es (formidable|incroyable|géniale)/i,
  /je suis là pour toi/i,
  /n'hésite pas/i,
  /courage/i,
  /tout va bien se passer/i,
  /respire profondément/i,
  /chaque pas compte/i,
  /je comprends ce que tu ressens/i,
  /sois fière/i
];

function sanitizeMessage(text: string): string {
  if (!text) return "";
  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(text)) {
      return text.replace(pattern, "").trim();
    }
  }
  return text;
}

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const userId = user?.id || null;
  
  const [greeting, setGreeting] = useState("");
  const [userName, setUserName] = useState("Rebecca");
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  
  // Données du dashboard
  const [priorities, setPriorities] = useState<Priority[]>([]);
  const [tasksToday, setTasksToday] = useState<Task[]>([]);
  const [overdueTasks, setOverdueTasks] = useState<Task[]>([]);
  const [activeMissions, setActiveMissions] = useState<Mission[]>([]);
  const [pendingDocs, setPendingDocs] = useState<any[]>([]);
  const [whatsappPending, setWhatsappPending] = useState(0);
  const [whatsappUrgent, setWhatsappUrgent] = useState(0);
  const [recentWinsCount, setRecentWinsCount] = useState(0);
  const [familyEventsCount, setFamilyEventsCount] = useState(0);
  const [suggestions, setSuggestions] = useState<any>({});
  const [calmGuidance, setCalmGuidance] = useState("");
  const [mood, setMood] = useState<string | null>(null);
  
  // Données secondaires
  const [recentSpending, setRecentSpending] = useState<Spending[]>([]);
  const [recentRevenue, setRecentRevenue] = useState<Revenue[]>([]);
  const [weeklyProgress, setWeeklyProgress] = useState<{ day: string; completed: number; created: number }[]>([]);
  const [tasksByStatus, setTasksByStatus] = useState<{ status: string; count: number }[]>([]);
  const [upcomingTasks, setUpcomingTasks] = useState<Task[]>([]);
  const [financialSummary, setFinancialSummary] = useState({ revenue: 0, spending: 0, balance: 0 });
  const [completionRate, setCompletionRate] = useState(0);
  const [farmNextAction, setFarmNextAction] = useState("");
  const [recentMemories, setRecentMemories] = useState<Memory[]>([]);
  const [isLoadingMemories, setIsLoadingMemories] = useState(true);
  const [overloadData, setOverloadData] = useState<any>(null);
  const [specialEvents, setSpecialEvents] = useState<{ type: string; title: string; detail: string }[]>([]);
  const [timeOfDay, setTimeOfDay] = useState<"morning" | "afternoon" | "evening" | "night">("morning");

  // ========== DÉTECTION CONNEXION ==========
  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // ========== SALUTATION ADAPTATIVE ==========
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      setTimeOfDay("morning");
      setGreeting("☀️ Bonjour");
    } else if (hour >= 12 && hour < 18) {
      setTimeOfDay("afternoon");
      setGreeting("🌤️ Bon après-midi");
    } else if (hour >= 18 && hour < 22) {
      setTimeOfDay("evening");
      setGreeting("🌙 Bonsoir");
    } else {
      setTimeOfDay("night");
      setGreeting("🌃 Bonne nuit");
    }
    
    const savedMood = localStorage.getItem("todayMood");
    const savedDate = localStorage.getItem("todayMoodDate");
    const today = new Date().toISOString().split('T')[0];
    if (savedMood && savedDate === today) setMood(savedMood);
  }, []);

  // ========== CHARGEMENT ==========
  useEffect(() => {
    if (!userId) return;
    
    const cachedName = localStorage.getItem("user_preferred_name");
    if (cachedName) setUserName(cachedName);
    
    fetchAllData();
  }, [userId]);

  async function fetchAllData() {
    if (!userId) return;
    setIsLoading(true);
    
    const [profileData, dashboardData, memoriesData] = await Promise.all([
      fetchUserNameOptimized(),
      fetchDashboardDataOptimized(),
      fetchRecentMemoriesOptimized()
    ]);
    
    if (profileData) setUserName(profileData);
    if (dashboardData) {
      setPriorities(sanitizePriorities(dashboardData.top_priorities || []));
      setTasksToday(dashboardData.tasks_today || []);
      setOverdueTasks(dashboardData.overdue_tasks || []);
      setActiveMissions(dashboardData.active_missions || []);
      setPendingDocs(dashboardData.pending_docs || []);
      setWhatsappPending(dashboardData.whatsapp_pending_count || 0);
      setWhatsappUrgent(dashboardData.whatsapp_urgent_count || 0);
      setRecentWinsCount(dashboardData.recent_wins || 0);
      setFamilyEventsCount(dashboardData.family_today_count || 0);
      setSuggestions(dashboardData.suggestions || {});
      setSpecialEvents(dashboardData.special_events || []);
      
      // Guidance calme - uniquement si non générique
      const rawGuidance = dashboardData.calm_guidance || "";
      const cleanGuidance = sanitizeMessage(rawGuidance);
      setCalmGuidance(cleanGuidance);
      
      if (dashboardData.current_mood) setMood(dashboardData.current_mood);
    }
    if (memoriesData) setRecentMemories(memoriesData);
    
    setIsLoading(false);
    
    // Chargement secondaire
    Promise.all([
      fetchChartDataOptimized(),
      fetchOverloadDetectionOptimized(),
      fetchFarmStatusOptimized(),
      detectSpecialEvents()
    ]).catch(console.error);
  }

  function sanitizePriorities(prioritiesList: Priority[]): Priority[] {
    return prioritiesList.filter(p => {
      const isGeneric = FORBIDDEN_PATTERNS.some(pattern => pattern.test(p.title) || pattern.test(p.priority_reason));
      return !isGeneric && p.title && p.title.length > 5;
    });
  }

  async function fetchUserNameOptimized(): Promise<string | null> {
    const { data: profile } = await supabase
      .from("user_profile")
      .select("preferred_name")
      .eq("user_id", userId)
      .maybeSingle();
    
    if (profile?.preferred_name) {
      localStorage.setItem("user_preferred_name", profile.preferred_name);
      return profile.preferred_name;
    }
    return null;
  }

  async function fetchDashboardDataOptimized() {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://sovereign-bridge.onrender.com';
      const response = await fetch(`${API_URL}/api/dashboard/today?user_id=${userId}`);
      const data = await response.json();
      
      if (data.success) {
        return {
          greeting: data.greeting,
          top_priorities: data.top_priorities || [],
          tasks_today: data.tasks_today || [],
          overdue_tasks: data.overdue_tasks || [],
          active_missions: data.active_missions || [],
          pending_docs: data.pending_docs || [],
          whatsapp_pending_count: data.whatsapp_pending_count || 0,
          whatsapp_urgent_count: data.whatsapp_urgent_count || 0,
          recent_wins: data.recent_wins || 0,
          family_today_count: data.family_today_count || 0,
          suggestions: data.suggestions || {},
          calm_guidance: data.calm_guidance || "",
          current_mood: data.current_mood,
          special_events: data.special_events || []
        };
      }
    } catch (error) {
      console.error("Erreur dashboard:", error);
    }
    return null;
  }

  async function fetchRecentMemoriesOptimized(): Promise<Memory[]> {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://sovereign-bridge.onrender.com';
      const response = await fetch(`${API_URL}/api/memory/get?user_id=${userId}&limit=5`);
      const data = await response.json();
      if (data.success && data.data) {
        return data.data.slice(0, 5);
      }
    } catch (error) {
      console.error("Erreur fetch memories:", error);
    } finally {
      setIsLoadingMemories(false);
    }
    return [];
  }

  async function detectSpecialEvents() {
    if (!userId) return;
    
    const today = new Date().toISOString().split('T')[0];
    const events: { type: string; title: string; detail: string }[] = [];
    
    // Vérifier les anniversaires
    const { data: profile } = await supabase
      .from("user_profile")
      .select("children")
      .eq("user_id", userId)
      .maybeSingle();
    
    const todayMD = today.slice(5);
    const children = profile?.children || [];
    for (const child of children) {
      if (child.birthday) {
        const birthdayMD = child.birthday.slice(5);
        if (birthdayMD === todayMD) {
          const age = new Date().getFullYear() - parseInt(child.birthday.slice(0, 4));
          events.push({
            type: "birthday",
            title: `🎂 Anniversaire de ${child.name}`,
            detail: `${child.name} fête ses ${age} ans aujourd'hui !`
          });
        }
      }
    }
    
    // Vérifier les deadlines de grants (Love & Fire)
    const { data: grants } = await supabase
      .from("lf_grants")
      .select("title, deadline, amount")
      .eq("user_id", userId)
      .not("deadline", "is", null);
    
    for (const grant of grants || []) {
      const daysLeft = Math.ceil((new Date(grant.deadline).getTime() - Date.now()) / (1000 * 3600 * 24));
      if (daysLeft >= 0 && daysLeft <= 3) {
        events.push({
          type: "grant_urgent",
          title: `⚠️ Grant urgent : ${grant.title}`,
          detail: `À rendre dans ${daysLeft} jour(s) • ${grant.amount?.toLocaleString()} CFA`
        });
      }
    }
    
    setSpecialEvents(prev => [...prev, ...events]);
  }

  async function fetchChartDataOptimized() {
    if (!userId) return;
    
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];
    const startOfWeekStr = startOfWeek.toISOString().split('T')[0];
    const todayStr = today.toISOString().split('T')[0];
    
    const [spendingResult, revenueResult, tasksResult, upcomingResult] = await Promise.all([
      supabase.from("spending").select("amount, date").eq("user_id", userId).gte("date", sevenDaysAgoStr).limit(100),
      supabase.from("revenue").select("amount, date").eq("user_id", userId).gte("date", sevenDaysAgoStr).limit(100),
      supabase.from("tasks").select("status, created_at, updated_at").eq("user_id", userId).gte("created_at", startOfWeekStr).limit(500),
      supabase.from("tasks").select("id, title, due_date, priority").eq("user_id", userId).gte("due_date", todayStr).lte("due_date", new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]).neq("status", "done").order("due_date", { ascending: true }).limit(5)
    ]);
    
    const totalRevenue = (revenueResult.data || []).reduce((sum, r) => sum + (r.amount || 0), 0);
    const totalSpending = (spendingResult.data || []).reduce((sum, s) => sum + (s.amount || 0), 0);
    setFinancialSummary({ revenue: totalRevenue, spending: totalSpending, balance: totalRevenue - totalSpending });
    setRecentSpending(spendingResult.data || []);
    setRecentRevenue(revenueResult.data || []);
    
    const days = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
    const tasksData = tasksResult.data || [];
    const weekly = days.map((day, i) => {
      const dayDate = new Date(startOfWeek);
      dayDate.setDate(startOfWeek.getDate() + i);
      const dateStr = dayDate.toISOString().split('T')[0];
      return {
        day,
        completed: tasksData.filter(t => t.status === 'done' && t.updated_at?.startsWith(dateStr)).length,
        created: tasksData.filter(t => t.created_at?.startsWith(dateStr)).length
      };
    });
    setWeeklyProgress(weekly);
    
    const statusCounts: Record<string, number> = {};
    tasksData.forEach(t => { statusCounts[t.status] = (statusCounts[t.status] || 0) + 1; });
    setTasksByStatus(Object.entries(statusCounts).map(([status, count]) => ({ status, count })));
    
    const totalTasks = tasksData.length;
    const completedTasks = tasksData.filter(t => t.status === 'done').length;
    setCompletionRate(totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0);
    
    setUpcomingTasks((upcomingResult.data || []) as Task[]);
  }

  async function fetchOverloadDetectionOptimized() {
    if (!userId) return;
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://sovereign-bridge.onrender.com';
      const response = await fetch(`${API_URL}/api/rescue/detect-overload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId })
      });
      const data = await response.json();
      if (data.success) setOverloadData(data);
    } catch (error) {
      console.error("Erreur détection surcharge:", error);
    }
  }

  async function fetchFarmStatusOptimized() {
    if (!userId) return;
    try {
      const [infraResult, productionResult] = await Promise.all([
        supabase.from("farm_infrastructure").select("name, status").in("status", ["in_progress", "setup"]).eq("user_id", userId).limit(5),
        supabase.from("farm_production_units").select("name, status").in("status", ["setup", "in_progress"]).eq("user_id", userId).limit(5)
      ]);
      const infra = infraResult.data || [];
      const production = productionResult.data || [];
      if (production[0] || infra[0]) {
        setFarmNextAction(`Finaliser ${(production[0] || infra[0]).name}`);
      }
    } catch (error) {
      console.error("Erreur farm status:", error);
    }
  }

  const handleSaveMood = useCallback(async (selectedMood: string) => {
    if (!userId) return;
    const today = new Date().toISOString().split('T')[0];
    setMood(selectedMood);
    localStorage.setItem("todayMood", selectedMood);
    localStorage.setItem("todayMoodDate", today);
    
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://sovereign-bridge.onrender.com'}/api/mood/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mood: selectedMood, user_id: userId })
      });
      window.dispatchEvent(new CustomEvent('moodChange', { detail: { mood: selectedMood } }));
    } catch (error) {
      console.error("Erreur save mood:", error);
    }
  }, [userId]);

  const handleHelpMeMoveForward = useCallback(() => {
    router.push("/chat?mode=fais-le-avec-moi");
  }, [router]);

  // ========== GRAPHIQUES ==========
  const spendingChartData = useMemo(() => ({
    labels: weeklyProgress.length ? weeklyProgress.map(w => w.day) : ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'],
    datasets: [
      {
        label: 'Dépenses (CFA)',
        data: weeklyProgress.map((_, i) => {
          const daySpending = recentSpending.filter(s => new Date(s.date).getDay() === i);
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
        data: weeklyProgress.map((_, i) => {
          const dayRevenue = recentRevenue.filter(r => new Date(r.date).getDay() === i);
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
  }), [weeklyProgress, recentSpending, recentRevenue]);

  const tasksProgressData = useMemo(() => ({
    labels: weeklyProgress.map(w => w.day),
    datasets: [
      { label: 'Tâches créées', data: weeklyProgress.map(w => w.created), backgroundColor: chartColors.blue, borderRadius: 8 },
      { label: 'Tâches terminées', data: weeklyProgress.map(w => w.completed), backgroundColor: chartColors.green, borderRadius: 8 }
    ]
  }), [weeklyProgress]);

  const tasksStatusData = useMemo(() => {
    const statusMap: Record<string, string> = { not_started: 'À faire', today: 'Aujourd\'hui', in_progress: 'En cours', waiting: 'En attente', done: 'Terminé' };
    return {
      labels: tasksByStatus.map(t => statusMap[t.status] || t.status),
      datasets: [{
        data: tasksByStatus.map(t => t.count),
        backgroundColor: [chartColors.blue, chartColors.orange, chartColors.purple, chartColors.cyan, chartColors.green],
        borderWidth: 0
      }]
    };
  }, [tasksByStatus]);

  const moodButtons = [
    { value: "excellent", emoji: "🌟", label: "Excellent", color: "text-emerald-400" },
    { value: "bien", emoji: "😊", label: "Bien", color: "text-green-400" },
    { value: "neutre", emoji: "😐", label: "Neutre", color: "text-gray-400" },
    { value: "fatiguée", emoji: "😴", label: "Fatiguée", color: "text-yellow-400" },
    { value: "stressée", emoji: "😰", label: "Stressée", color: "text-red-400" }
  ];

  const currentMood = moodButtons.find(m => m.value === mood);

  // Message de bienvenue adaptatif (non générique)
  const getAdaptiveWelcome = () => {
    if (overdueTasks.length > 0) {
      return `⚠️ ${overdueTasks.length} tâche(s) en retard. La plus ancienne : "${overdueTasks[0].title}".`;
    }
    if (whatsappUrgent > 0) {
      return `📱 ${whatsappUrgent} message(s) WhatsApp urgent(s) en attente.`;
    }
    if (financialSummary.balance < -100000) {
      return `💰 Solde négatif de ${Math.abs(financialSummary.balance).toLocaleString()} CFA.`;
    }
    if (specialEvents.length > 0) {
      return specialEvents[0].detail;
    }
    if (tasksToday.length > 0) {
      return `📋 ${tasksToday.length} tâche(s) aujourd'hui. ${tasksToday[0].title}${tasksToday.length > 1 ? ` et ${tasksToday.length - 1} autre(s)` : ""}.`;
    }
    return "";
  };

  const adaptiveWelcome = getAdaptiveWelcome();

  if (!userId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-gray-500">Veuillez vous connecter</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isOnline) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <WifiOff className="w-12 h-12 text-gray-500 mx-auto mb-4" />
          <p className="text-gray-500">Mode hors ligne</p>
          <p className="text-xs text-gray-600 mt-2">Les données sont en cache</p>
        </div>
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
      
        {/* Message Becks - UNIQUEMENT BASÉ SUR DES DONNÉES RÉELLES */}
        {adaptiveWelcome && (
          <div className="bg-gradient-to-r from-gold-500/10 to-transparent border-l-4 border-gold-500 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-gold-500 mt-0.5 flex-shrink-0" />
              <p className="text-ivory text-sm leading-relaxed">{adaptiveWelcome}</p>
            </div>
          </div>
        )}
      </div>

      {/* ÉVÉNEMENTS SPÉCIAUX */}
      {specialEvents.length > 0 && (
        <div className="space-y-2">
          {specialEvents.slice(0, 2).map((event, idx) => (
            <div key={idx} className="bg-gold-500/10 border border-gold-500/20 rounded-xl p-3">
              <p className="text-gold-400 text-sm">{event.detail}</p>
            </div>
          ))}
        </div>
      )}

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
            <button onClick={() => { setMood(null); localStorage.removeItem("todayMood"); }} className="text-xs text-gray-500 hover:text-gold-400">Modifier</button>
          </div>
        ) : (
          <div>
            <p className="text-sm text-gray-400 mb-3">😊 Comment te sens-tu aujourd'hui ?</p>
            <div className="flex justify-between">
              {moodButtons.map((m) => (
                <button key={m.value} onClick={() => handleSaveMood(m.value)} className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-white/10">
                  <span className="text-xl">{m.emoji}</span>
                  <span className="text-[10px] text-gray-500">{m.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* STATS RAPIDES */}
      {(whatsappPending > 0 || pendingDocs.length > 0 || familyEventsCount > 0) && (
        <div className="grid grid-cols-3 gap-3">
          {whatsappPending > 0 && (
            <div className={`bg-green-500/10 border ${whatsappUrgent > 0 ? 'border-red-500/30' : 'border-green-500/20'} rounded-xl p-3 text-center`}>
              <MessageCircle className="w-4 h-4 text-green-400 mx-auto mb-1" />
              <p className="text-xs text-gray-500">WhatsApp</p>
              <p className="text-lg font-serif text-green-400">{whatsappPending}</p>
              {whatsappUrgent > 0 && <p className="text-[10px] text-red-400">{whatsappUrgent} urgent(s)</p>}
            </div>
          )}
          {pendingDocs.length > 0 && (
            <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-3 text-center">
              <FileText className="w-4 h-4 text-orange-400 mx-auto mb-1" />
              <p className="text-xs text-gray-500">Documents</p>
              <p className="text-lg font-serif text-orange-400">{pendingDocs.length}</p>
              <p className="text-[10px] text-orange-400">en attente</p>
            </div>
          )}
          {familyEventsCount > 0 && (
            <div className="bg-pink-500/10 border border-pink-500/20 rounded-xl p-3 text-center">
              <Heart className="w-4 h-4 text-pink-400 mx-auto mb-1" />
              <p className="text-xs text-gray-500">Famille</p>
              <p className="text-lg font-serif text-pink-400">{familyEventsCount}</p>
              <p className="text-[10px] text-pink-400">aujourd'hui</p>
            </div>
          )}
        </div>
      )}

      {/* TOP 3 PRIORITÉS */}
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        <div className="px-5 pt-4 pb-2 flex items-center justify-between">
          <h2 className="text-sm font-serif text-gold-500 flex items-center gap-2">
            <Target className="w-4 h-4" /> 🎯 PRIORITÉS
          </h2>
          {overdueTasks.length > 0 && (
            <span className="text-[10px] text-red-400">{overdueTasks.length} en retard</span>
          )}
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
                      {priority.source && (
                        <p className="text-[10px] text-gray-600 mt-1">
                          📍 {priority.source === 'task' ? 'Tâche' : priority.source === 'document' ? 'Document' : priority.source === 'whatsapp' ? 'WhatsApp' : 'Mission'}
                        </p>
                      )}
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
              <button onClick={() => router.push("/agenda")} className="text-xs text-gold-500 mt-2 hover:underline">+ Créer une tâche</button>
            </div>
          )}
        </div>
      </div>

      {/* MESSAGES WHATSAPP URGENTS */}
      {whatsappUrgent > 0 && priorities.filter(p => p.source === "whatsapp").length === 0 && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <MessageCircle className="w-4 h-4 text-green-400" />
            <h3 className="text-sm font-medium text-ivory">📱 Messages WhatsApp urgents</h3>
          </div>
          <p className="text-sm text-gray-300">{whatsappUrgent} message(s) non répondus</p>
          <Link href="/chat?mode=whatsapp" className="text-xs text-gold-500 hover:underline inline-block mt-2">Voir et répondre →</Link>
        </div>
      )}

      {/* TÂCHES À ÉCHÉANCE */}
      {upcomingTasks.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-orange-400" />
            <h3 className="text-sm font-medium text-ivory">📅 Tâches à échéance (7 jours)</h3>
          </div>
          <div className="space-y-2">
            {upcomingTasks.slice(0, 4).map((task) => (
              <div key={task.id} className="flex items-center justify-between text-sm p-2 hover:bg-white/5 rounded-lg">
                <span className="text-gray-300">{task.title}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  task.priority === 'critical' ? 'bg-red-500/20 text-red-400' : 
                  task.priority === 'high' ? 'bg-orange-500/20 text-orange-400' : 
                  'bg-blue-500/20 text-blue-400'
                }`}>
                  📅 {new Date(task.due_date!).toLocaleDateString('fr-FR')}
                </span>
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
            <p className="text-sm text-ivory">{suggestions.money_move || (financialSummary.balance >= 0 ? `Solde: ${financialSummary.balance.toLocaleString()} CFA` : `Solde négatif: ${Math.abs(financialSummary.balance).toLocaleString()} CFA`)}</p>
            <span className="text-xs text-gold-500 opacity-0 group-hover:opacity-100 transition-opacity mt-2 inline-block">Voir les finances →</span>
          </div>
        </Link>
        <Link href="/family" className="block">
          <div className="bg-gradient-to-br from-pink-500/5 to-transparent border border-pink-500/20 rounded-xl p-4 hover:border-pink-500/40 transition-all group">
            <div className="flex items-center gap-2 mb-2">
              <Heart className="w-4 h-4 text-pink-400" />
              <span className="text-xs text-pink-400/70 uppercase tracking-wider">Move Famille</span>
            </div>
            <p className="text-sm text-ivory">{suggestions.family_move || (familyEventsCount > 0 ? `${familyEventsCount} événement(s) aujourd'hui` : "Prendre des nouvelles des enfants")}</p>
            <span className="text-xs text-gold-500 opacity-0 group-hover:opacity-100 transition-opacity mt-2 inline-block">Voir famille →</span>
          </div>
        </Link>
        <Link href="/farm" className="block">
          <div className="bg-gradient-to-br from-green-500/5 to-transparent border border-green-500/20 rounded-xl p-4 hover:border-green-500/40 transition-all group">
            <div className="flex items-center gap-2 mb-2">
              <Sprout className="w-4 h-4 text-green-400" />
              <span className="text-xs text-green-400/70 uppercase tracking-wider">Move Ferme</span>
            </div>
            <p className="text-sm text-ivory">{suggestions.business_move || farmNextAction || "Vérifier l'avancement des travaux"}</p>
            <span className="text-xs text-gold-500 opacity-0 group-hover:opacity-100 transition-opacity mt-2 inline-block">Voir ferme →</span>
          </div>
        </Link>
        <Link href="/rescue-wins" className="block">
          <div className="bg-gradient-to-br from-yellow-500/5 to-transparent border border-yellow-500/20 rounded-xl p-4 hover:border-yellow-500/40 transition-all group">
            <div className="flex items-center gap-2 mb-2">
              <Sun className="w-4 h-4 text-yellow-400" />
              <span className="text-xs text-yellow-400/70 uppercase tracking-wider">Move Stabilisation</span>
            </div>
            <p className="text-sm text-ivory">{suggestions.stabilization_move || (recentWinsCount > 0 ? `${recentWinsCount} victoire(s) récente(s) à célébrer` : "Prendre 5 minutes pour respirer")}</p>
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
            {recentMemories.slice(0, 3).map((mem, idx) => (
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

      {/* RESCUE MODE ALERT */}
      {overloadData && overloadData.level !== "low" && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} 
          className={`rounded-xl p-4 border-2 ${overloadData.level === "critical" ? "bg-red-950/30 border-red-500/50" : "bg-orange-950/30 border-orange-500/50"}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <AlertCircle className={`w-5 h-5 ${overloadData.level === "critical" ? "text-red-400" : "text-orange-400"}`} />
              <h3 className="text-sm font-medium text-ivory">{overloadData.level === "critical" ? "⚠️ SURCHARGE DÉTECTÉE" : "🟡 CHARGE ÉLEVÉE"}</h3>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${overloadData.level === "critical" ? "bg-red-500" : "bg-orange-500"}`} style={{ width: `${overloadData.overload_score}%` }} />
              </div>
              <span className="text-xs text-gray-400">{overloadData.overload_score}%</span>
            </div>
          </div>
          <p className="text-sm text-ivory mb-3">{overloadData.message}</p>
          <div className="flex flex-wrap gap-2">
            {overloadData.rescue_actions?.slice(0, 3).map((action: any, idx: number) => (
              <button 
                key={idx} 
                onClick={() => { 
                  if (action.type === "focus_task" && action.task_id) router.push(`/agenda?highlight=${action.task_id}`); 
                  else if (action.type === "breathing") toast.info("🌬️ Respire profondément...", { duration: 10000 }); 
                  else if (action.url) router.push(action.url); 
                  else router.push("/rescue-wins"); 
                }} 
                className="px-3 py-1.5 bg-white/10 rounded-full text-xs text-gray-300 hover:bg-white/20"
              >
                {action.title}
              </button>
            ))}
            <Link href="/rescue-wins" className="px-3 py-1.5 bg-gold-500/20 text-gold-500 rounded-full text-xs hover:bg-gold-500/30">Voir Rescue Mode →</Link>
          </div>
        </motion.div>
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

      {/* ACCÈS RAPIDE */}
      <div className="pt-4 border-t border-white/10">
        <div className="flex items-center gap-2 mb-4">
          <Star className="w-4 h-4 text-gold-500" />
          <h2 className="text-xs font-serif text-gold-500 tracking-wider">ACCÈS RAPIDE</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          <Link href="/inbox" className="flex items-center gap-2 p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
            <Inbox className="w-4 h-4 text-blue-400" />
            <span className="text-xs text-gray-300">Brain Dump</span>
          </Link>
          <Link href="/agenda" className="flex items-center gap-2 p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
            <CheckSquare className="w-4 h-4 text-blue-400" />
            <span className="text-xs text-gray-300">Agenda</span>
          </Link>
          <Link href="/money-opportunities" className="flex items-center gap-2 p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            <span className="text-xs text-gray-300">Money</span>
          </Link>
          <Link href="/communications" className="flex items-center gap-2 p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
            <FolderOpen className="w-4 h-4 text-orange-400" />
            <span className="text-xs text-gray-300">Documents</span>
          </Link>
          <Link href="/missions-business" className="flex items-center gap-2 p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
            <Target className="w-4 h-4 text-gold-500" />
            <span className="text-xs text-gray-300">Missions</span>
          </Link>
          <Link href="/farm" className="flex items-center gap-2 p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
            <Sprout className="w-4 h-4 text-green-400" />
            <span className="text-xs text-gray-300">Ifè Farm</span>
          </Link>
          <Link href="/family" className="flex items-center gap-2 p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
            <Users className="w-4 h-4 text-pink-400" />
            <span className="text-xs text-gray-300">Family</span>
          </Link>
          <Link href="/rescue-wins" className="flex items-center gap-2 p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
            <Trophy className="w-4 h-4 text-yellow-400" />
            <span className="text-xs text-gray-300">Wins</span>
          </Link>
        </div>
      </div>

      {/* BOUTON BRAIN DUMP FLOTTANT */}
      <button 
        onClick={() => router.push("/inbox")} 
        className="fixed bottom-6 right-6 z-40 bg-gold-500 text-midnight p-4 rounded-full shadow-lg hover:scale-105 transition-transform"
      >
        <Brain className="w-6 h-6" />
      </button>
    </div>
  );
}
