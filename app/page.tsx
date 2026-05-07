"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";
import LoadingSpinner from "@/components/LoadingSpinner";
import Link from "next/link";
import { 
  LayoutDashboard, Target, Heart, DollarSign, Briefcase,
  Sprout, AlertCircle, CheckCircle, Clock, TrendingUp,
  Calendar, Sparkles, ArrowRight, MessageSquare, Shield,
  FileText, Users, Wallet, Globe, Zap, Lightbulb, 
  PieChart, LineChart, Smile, Meh, Frown, Sun, Moon, Bell,
  Trophy, Loader2, Home, Building2, FileCheck, AlertTriangle, 
  FolderOpen, ChevronDown, ChevronRight
} from "lucide-react";

import { CollapsibleSection } from "@/components/CollapsibleSection";

// =====================================================
// TYPES (garde tous tes types existants)
// =====================================================
type Mission = { id: string; name: string; status: string; priority: string };
type Task = { id: string; title: string; status: string; due_date: string | null };
type Document = { id: string; name: string; status: string };
type Win = { id: string; title: string; celebration_emoji: string };
type FamilyEvent = { id: string; title: string; date: string | null };
type RelocationTask = { id: string; title: string; status: string };
type FarmUnit = { id: string; name: string; status: string };
type Suggestion = { type: string; priority: string; title: string; message: string; action_url: string; action_label: string };
type AiPriority = { id: string; title: string; score: number; due_date: string | null; priority_reason: string };
type Reminder = { id: string; title: string; type: string; due_date: string | null; urgency: string };
type LifeMapData = {
  family: { status: string; pending_count: number; next_action: string; next_date: string | null; urgency: string };
  money: { status: string; balance: number; pending_invoices: number; urgency: string };
  business: { status: string; active_missions: number; high_priority_count: number; urgency: string };
  farm: { status: string; total_investment: number; active_units: number; next_action: string; urgency: string };
  documents: { status: string; pending_count: number; urgent_count: number; urgency: string };
  wins: { status: string; recent_count: number; streak: number; urgency: string };
  relocation: { status: string; pending_tasks: number; critical_count: number; next_deadline: string; urgency: string };
  alignment: { status: string; score: number; recommendation: string; urgency: string };
};

const API_URL = "https://sovereign-bridge.onrender.com";

// =====================================================
// COMPOSANTS (garde tes composants existants)
// =====================================================

// MoodWidget (inchangé)
function MoodWidget() {
  const [mood, setMood] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const savedMood = localStorage.getItem("todayMood");
    const savedDate = localStorage.getItem("todayMoodDate");
    const today = new Date().toISOString().split('T')[0];
    if (savedMood && savedDate === today) setMood(savedMood);
  }, []);

  const saveMood = async (selectedMood: string) => {
    setIsLoading(true);
    const today = new Date().toISOString().split('T')[0];
    setMood(selectedMood);
    localStorage.setItem("todayMood", selectedMood);
    localStorage.setItem("todayMoodDate", today);
    await supabase.from("mood_entries").insert({ mood: selectedMood, date: today });
    setIsLoading(false);
  };

  const moods = [
    { value: "excellent", emoji: "🌟", label: "Excellent" },
    { value: "bien", emoji: "😊", label: "Bien" },
    { value: "neutre", emoji: "😐", label: "Neutre" },
    { value: "fatiguée", emoji: "😴", label: "Fatiguée" },
    { value: "stressée", emoji: "😰", label: "Stressée" }
  ];

  if (mood) {
    const currentMood = moods.find(m => m.value === mood);
    return (
      <div className="bg-gold-500/10 border border-gold-500/20 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{currentMood?.emoji}</span>
            <div>
              <p className="text-xs text-gray-500">Humeur du jour</p>
              <p className="text-sm text-gold-400">{currentMood?.label}</p>
            </div>
          </div>
          <button onClick={() => { setMood(null); localStorage.removeItem("todayMood"); }} className="text-xs text-gray-500 hover:text-gold-400">Modifier</button>
        </div>
        {mood === "fatiguée" && <p className="text-xs text-gold-400 mt-3 pt-2 border-t border-gold-500/20">✨ Prends soin de toi. Une petite chose à la fois.</p>}
        {mood === "stressée" && <p className="text-xs text-gold-400 mt-3 pt-2 border-t border-gold-500/20">🌿 On respire. Une seule priorité pour commencer.</p>}
        {mood === "excellent" && <p className="text-xs text-gold-400 mt-3 pt-2 border-t border-gold-500/20">🔥 C'est le moment d'attaquer les gros dossiers !</p>}
      </div>
    );
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
      <p className="text-xs text-gray-500 mb-3">Comment te sens-tu aujourd'hui ?</p>
      <div className="flex justify-between">
        {moods.map((m) => (
          <button key={m.value} onClick={() => saveMood(m.value)} disabled={isLoading} className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50">
            <span className="text-xl">{m.emoji}</span>
            <span className="text-[10px] text-gray-500">{m.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// LifeMapCard (inchangé)
function LifeMapCard({ title, icon: Icon, data, href }: { title: string; icon: any; data: any; href: string }) {
  const getStatusColor = (status: string) => {
    switch(status) {
      case "🟢": return "bg-emerald-500/20 text-emerald-400";
      case "🟡": return "bg-yellow-500/20 text-yellow-400";
      case "🔴": return "bg-red-500/20 text-red-400";
      default: return "bg-gray-500/20 text-gray-400";
    }
  };
  
  return (
    <Link href={href} className="block">
      <div className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-all hover:border-gold-500/30">
        <div className="flex items-center justify-between mb-2">
          <Icon className="w-5 h-5 text-gold-500" />
          <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(data?.status)}`}>{data?.status}</span>
        </div>
        <h3 className="text-sm font-medium text-ivory">{title}</h3>
        {title === "Famille" && <p className="text-xs text-gray-400 mt-2">{data?.pending_count > 0 ? `${data.pending_count} événement(s)` : "Aucun événement"}</p>}
        {title === "Argent" && <p className={`text-xs font-medium mt-2 ${data?.balance >= 0 ? "text-emerald-400" : "text-red-400"}`}>{data?.balance?.toLocaleString()} CFA</p>}
        {title === "Business" && <p className="text-xs text-gray-400 mt-2">{data?.active_missions} mission(s) active(s){data?.high_priority_count > 0 && <span className="text-red-400 ml-1">({data.high_priority_count} prioritaires)</span>}</p>}
        {title === "Ferme" && <p className="text-xs text-gray-400 mt-2">{data?.active_units} unité(s) active(s)</p>}
        {title === "Documents" && <p className="text-xs text-gray-400 mt-2">{data?.pending_count} en attente{data?.urgent_count > 0 && <span className="text-red-400 ml-1">({data.urgent_count} urgent)</span>}</p>}
        {title === "Victoires" && <p className="text-xs text-gray-400 mt-2">🎉 {data?.recent_count} cette semaine</p>}
        {title === "Relocation" && <p className="text-xs text-gray-400 mt-2">{data?.pending_tasks} tâche(s){data?.critical_count > 0 && <span className="text-red-400 ml-1">({data.critical_count} critiques)</span>}</p>}
        {title === "Alignement" && (
          <div className="mt-2">
            <div className="w-full bg-white/10 rounded-full h-1.5"><div className="bg-gold-500 h-1.5 rounded-full" style={{ width: `${data?.score || 0}%` }} /></div>
            <p className="text-xs text-gray-400 mt-1">{data?.score}%</p>
          </div>
        )}
      </div>
    </Link>
  );
}

function StatCard({ title, value, icon, color }: { title: string; value: string; icon: React.ReactNode; color: string }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
      <div className={`${color} mb-2`}>{icon}</div>
      <div className="text-xl font-serif text-ivory">{value}</div>
      <div className="text-xs text-gray-500 mt-1">{title}</div>
    </div>
  );
}

// =====================================================
// DASHBOARD PRINCIPAL
// =====================================================
export default function DashboardPage() {
  const [greeting, setGreeting] = useState("");
  const [userName, setUserName] = useState("Rebecca");
  const [isLoading, setIsLoading] = useState(true);
  const [proactiveSuggestions, setProactiveSuggestions] = useState<Suggestion[]>([]);
  const [aiPriorities, setAiPriorities] = useState<AiPriority[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [lifeMapData, setLifeMapData] = useState<LifeMapData | null>(null);
  const [isLifeMapLoading, setIsLifeMapLoading] = useState(true);
  
  const [missions, setMissions] = useState<Mission[]>([]);
  const [todayTasks, setTodayTasks] = useState<Task[]>([]);
  const [pendingDocs, setPendingDocs] = useState<Document[]>([]);
  const [recentWins, setRecentWins] = useState<Win[]>([]);
  const [familyEvents, setFamilyEvents] = useState<FamilyEvent[]>([]);
  const [relocationTasks, setRelocationTasks] = useState<RelocationTask[]>([]);
  const [financials, setFinancials] = useState({ revenue: 0, spending: 0, balance: 0 });

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Bonjour");
    else if (hour < 18) setGreeting("Bon après-midi");
    else setGreeting("Bonsoir");
    fetchUserName();
    fetchAllData();
    fetchLifeMap();
  }, []);

  async function fetchUserName() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email) setUserName(user.email.split('@')[0].charAt(0).toUpperCase() + user.email.split('@')[0].slice(1));
  }

  async function fetchLifeMap() {
    try {
      const response = await fetch(`${API_URL}/api/life-map`);
      const data = await response.json();
      if (data.success) setLifeMapData(data.data);
    } catch (error) { console.error("Erreur life map:", error); } 
    finally { setIsLifeMapLoading(false); }
  }

  async function fetchAllData() {
    setIsLoading(true);
    await Promise.all([
      (async () => { const { data } = await supabase.from("missions").select("*").eq("status", "active"); setMissions(data || []); })(),
      (async () => { const { data } = await supabase.from("tasks").select("*").eq("status", "today").limit(5); setTodayTasks(data || []); })(),
      (async () => { const { data } = await supabase.from("documents").select("*").neq("status", "approved").limit(3); setPendingDocs(data || []); })(),
      (async () => { const { data } = await supabase.from("wins").select("*").order("date", { ascending: false }).limit(3); setRecentWins(data || []); })(),
      (async () => {
        const [revenueRes, spendingRes] = await Promise.all([supabase.from("revenue").select("amount"), supabase.from("spending").select("amount")]);
        const revenue = (revenueRes.data || []).reduce((sum, r) => sum + (r.amount || 0), 0);
        const spending = (spendingRes.data || []).reduce((sum, s) => sum + (s.amount || 0), 0);
        setFinancials({ revenue, spending, balance: revenue - spending });
      })(),
      fetchAiPriorities(),
      fetchProactiveSuggestions(),
      fetchReminders()
    ]);
    setIsLoading(false);
  }

  async function fetchReminders() {
    const today = new Date().toISOString().split('T')[0];
    const { data: tasks } = await supabase.from("tasks").select("*").in("due_date", [today, new Date(Date.now() + 86400000).toISOString().split('T')[0]]).neq("status", "done");
    const { data: docs } = await supabase.from("documents").select("*").lt("due_date", today).neq("status", "approved");
    const allReminders: Reminder[] = [];
    tasks?.forEach(task => allReminders.push({ id: task.id, title: task.title, type: "task", due_date: task.due_date, urgency: task.due_date === today ? "high" : "medium" }));
    docs?.forEach(doc => allReminders.push({ id: doc.id, title: doc.name, type: "document", due_date: doc.due_date, urgency: "high" }));
    setReminders(allReminders.slice(0, 5));
  }

  async function fetchProactiveSuggestions() {
    try { const response = await fetch(`${API_URL}/api/proactive-suggestions`); const data = await response.json(); setProactiveSuggestions(data.suggestions || []); } 
    catch (error) { console.error("Erreur suggestions:", error); }
  }

  async function fetchAiPriorities() {
    try { const response = await fetch(`${API_URL}/api/ai-priorities`); const data = await response.json(); setAiPriorities(data.priorities || []); } 
    catch (error) { console.error("Erreur priorités:", error); }
  }

  const formatCurrency = (val: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(val);
  const handleHelpMeMoveForward = () => { window.location.href = "/chat?mode=execute"; };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="p-4 md:p-6 lg:p-8 h-full flex flex-col overflow-y-auto bg-midnight space-y-6">
      
      {/* HEADER */}
      <div>
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-serif text-ivory tracking-tight">{greeting}, {userName}. 👑</h1>
        <p className="text-gray-500 text-sm mt-1">Aujourd'hui avec Becks</p>
      </div>

      {/* HUMEUR + BOUTON AIDE (côte à côte) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <MoodWidget />
        <button onClick={handleHelpMeMoveForward} className="py-4 bg-gradient-to-r from-gold-500/20 to-gold-500/5 border border-gold-500/30 rounded-xl text-gold-500 font-medium flex items-center justify-center gap-3 hover:bg-gold-500/30 transition-all group">
          <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform" />
          <span>🧠 Aide-moi à avancer</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

      {/* SECTION 1 : TOP PRIORITÉS (repliable) */}
      <CollapsibleSection title="🎯 Top priorités du jour" icon={Target} defaultOpen={true} badge={aiPriorities.length}>
        {aiPriorities.length > 0 ? (
          <div className="space-y-3">
            {aiPriorities.map((priority, idx) => (
              <div key={priority.id || idx} className={`p-4 rounded-xl border-l-4 ${idx === 0 ? "border-l-red-500 bg-red-950/10" : idx === 1 ? "border-l-orange-500 bg-orange-950/10" : "border-l-gold-500 bg-gold-500/5"}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-ivory font-medium">{priority.title}</p>
                    <p className="text-xs text-gray-400 mt-1">{priority.priority_reason}</p>
                    {priority.due_date && <p className="text-xs text-gray-500 mt-1">📅 {new Date(priority.due_date).toLocaleDateString('fr-FR')}</p>}
                  </div>
                  <Link href="/tasks" className="text-gold-500 text-sm hover:underline">→</Link>
                </div>
                <div className="mt-2 w-full bg-white/10 rounded-full h-1">
                  <div className={`h-1 rounded-full ${idx === 0 ? "bg-red-500" : idx === 1 ? "bg-orange-500" : "bg-gold-500"}`} style={{ width: `${(priority.score / 40) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        ) : <p className="text-center text-gray-500 py-4">Aucune priorité pour le moment</p>}
      </CollapsibleSection>

      {/* SECTION 2 : RAPPELS IMPORTANTS (repliable) */}
      {reminders.length > 0 && (
        <CollapsibleSection title="🔔 Rappels importants" icon={Bell} defaultOpen={true} badge={reminders.length}>
          <div className="space-y-2">
            {reminders.map(reminder => (
              <div key={reminder.id} className={`p-3 rounded-xl border-l-4 ${reminder.urgency === "high" ? "border-l-red-500 bg-red-950/10" : "border-l-yellow-500 bg-yellow-950/10"}`}>
                <p className="text-sm text-ivory">{reminder.title}</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${reminder.type === "task" ? "bg-blue-500/20 text-blue-400" : "bg-orange-500/20 text-orange-400"}`}>
                    {reminder.type === "task" ? "📋 Tâche" : "📄 Document"}
                  </span>
                  {reminder.due_date && <span className={`text-xs ${reminder.urgency === "high" ? "text-red-400" : "text-yellow-400"}`}>⚠️ {new Date(reminder.due_date).toLocaleDateString('fr-FR')}</span>}
                </div>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* SECTION 3 : CARTE DE VIE (repliable - fermée par défaut) */}
      <CollapsibleSection title="🗺️ Carte de vie" icon={Globe} defaultOpen={false}>
        {isLifeMapLoading ? <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-gold-500 animate-spin" /></div> : lifeMapData ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <LifeMapCard title="Famille" icon={Heart} data={lifeMapData.family} href="/family" />
            <LifeMapCard title="Argent" icon={DollarSign} data={lifeMapData.money} href="/money" />
            <LifeMapCard title="Business" icon={Briefcase} data={lifeMapData.business} href="/business" />
            <LifeMapCard title="Ferme" icon={Sprout} data={lifeMapData.farm} href="/farm" />
            <LifeMapCard title="Documents" icon={FileText} data={lifeMapData.documents} href="/documents" />
            <LifeMapCard title="Victoires" icon={Trophy} data={lifeMapData.wins} href="/wins" />
            <LifeMapCard title="Relocation" icon={Globe} data={lifeMapData.relocation} href="/relocation" />
            <LifeMapCard title="Alignement" icon={Shield} data={lifeMapData.alignment} href="/alignment" />
          </div>
        ) : <p className="text-center text-gray-500 py-4">Données non disponibles</p>}
      </CollapsibleSection>

      {/* SECTION 4 : STATS RAPIDES (repliable) */}
      <CollapsibleSection title="📊 Indicateurs clés" icon={TrendingUp} defaultOpen={false}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="Trésorerie" value={formatCurrency(financials.balance)} icon={<Wallet className="w-5 h-5" />} color="text-gold-500" />
          <StatCard title="Missions actives" value={missions.length.toString()} icon={<Target className="w-5 h-5" />} color="text-blue-400" />
          <StatCard title="Tâches aujourd'hui" value={todayTasks.length.toString()} icon={<Clock className="w-5 h-5" />} color="text-orange-400" />
          <StatCard title="Documents" value={pendingDocs.length.toString()} icon={<FileText className="w-5 h-5" />} color="text-red-400" />
        </div>
      </CollapsibleSection>

      {/* SECTION 5 : SUGGESTIONS BECKS (repliable - fermée par défaut) */}
      {proactiveSuggestions.length > 0 && (
        <CollapsibleSection title="✨ Suggestions Becks" icon={Lightbulb} defaultOpen={false} badge={proactiveSuggestions.length}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {proactiveSuggestions.slice(0, 3).map((suggestion, idx) => (
              <Link key={idx} href={suggestion.action_url} className="block p-4 bg-gold-500/5 border border-gold-500/20 rounded-xl hover:bg-gold-500/10 transition-all">
                <p className="text-sm font-medium text-ivory">{suggestion.title}</p>
                <p className="text-xs text-gray-400 mt-1">{suggestion.message}</p>
                <span className="inline-block text-xs text-gold-500 mt-3">→ Voir</span>
              </Link>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* SECTION 6 : TÂCHES + VICTOIRES + DOCUMENTS (tout en un repliable) */}
      <CollapsibleSection title="📋 Activité récente" icon={Clock} defaultOpen={false}>
        <div className="space-y-6">
          {/* Tâches du jour */}
          <div>
            <div className="flex justify-between items-center mb-3"><h3 className="text-sm font-medium text-gold-500">Tâches du jour</h3><Link href="/tasks" className="text-xs text-gray-500 hover:text-gold-500">Voir tout →</Link></div>
            {todayTasks.length > 0 ? todayTasks.map(task => <div key={task.id} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl"><div className="w-1.5 h-1.5 rounded-full bg-gold-500" /><span className="text-ivory text-sm">{task.title}</span></div>) : <p className="text-gray-500 text-sm text-center py-4">Aucune tâche planifiée pour aujourd'hui ✨</p>}
          </div>

          {/* Victoires récentes */}
          {recentWins.length > 0 && (
            <div>
              <div className="flex justify-between items-center mb-3"><h3 className="text-sm font-medium text-gold-500">Victoires récentes</h3><Link href="/wins" className="text-xs text-gray-500 hover:text-gold-500">Voir tout →</Link></div>
              <div className="space-y-2">{recentWins.map(win => <div key={win.id} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl"><span className="text-xl">{win.celebration_emoji || "🎉"}</span><span className="text-ivory text-sm">{win.title}</span></div>)}</div>
            </div>
          )}

          {/* Documents en attente */}
          {pendingDocs.length > 0 && (
            <div>
              <div className="flex justify-between items-center mb-3"><h3 className="text-sm font-medium text-gold-500">Documents à traiter</h3><Link href="/documents" className="text-xs text-gray-500 hover:text-gold-500">Voir tout →</Link></div>
              <div className="flex flex-wrap gap-2">{pendingDocs.map(doc => <span key={doc.id} className="px-3 py-1.5 bg-yellow-500/10 text-yellow-400 rounded-full text-xs">{doc.name}</span>)}</div>
            </div>
          )}
        </div>
      </CollapsibleSection>

      {/* AVATAR FLOTTANT + BOUTON CHAT */}
      <div className="fixed bottom-6 right-6 z-40 flex items-center gap-3">
        <div className="relative">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gold-500/20 to-gold-500/10 border border-gold-500/30 flex items-center justify-center shadow-lg animate-pulse-slow">
            <svg viewBox="0 0 100 100" className="w-8 h-8">
              <circle cx="50" cy="50" r="45" fill="#D4AF37" opacity="0.15" />
              <ellipse cx="35" cy="45" rx="8" ry="10" fill="#D4AF37" opacity="0.8" />
              <ellipse cx="65" cy="45" rx="8" ry="10" fill="#D4AF37" opacity="0.8" />
              <circle cx="35" cy="45" r="4" fill="#1a1a2e" />
              <circle cx="65" cy="45" r="4" fill="#1a1a2e" />
              <circle cx="33" cy="43" r="1.5" fill="white" />
              <circle cx="63" cy="43" r="1.5" fill="white" />
              <path d="M40 60 Q50 68 60 60" stroke="#D4AF37" strokeWidth="2" fill="none" strokeLinecap="round" />
            </svg>
          </div>
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full animate-pulse" />
        </div>
        <Link href="/chat" className="bg-gold-500 text-midnight p-4 rounded-full shadow-lg hover:scale-105 transition-transform">
          <MessageSquare className="w-6 h-6" />
        </Link>
      </div>
    </div>
  );
}
