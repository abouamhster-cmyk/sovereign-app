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
  PieChart, LineChart, Smile, Meh, Frown, Sun, Moon, Bell
} from "lucide-react";

// Types
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

const API_URL = "https://sovereign-bridge.onrender.com";

// Composant Widget Humeur
function MoodWidget() {
  const [mood, setMood] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const savedMood = localStorage.getItem("todayMood");
    const savedDate = localStorage.getItem("todayMoodDate");
    const today = new Date().toISOString().split('T')[0];
    
    if (savedMood && savedDate === today) {
      setMood(savedMood);
    }
  }, []);

  const saveMood = async (selectedMood: string) => {
    setIsLoading(true);
    const today = new Date().toISOString().split('T')[0];
    setMood(selectedMood);
    localStorage.setItem("todayMood", selectedMood);
    localStorage.setItem("todayMoodDate", today);
    
    await supabase.from("mood_entries").insert({
      mood: selectedMood,
      date: today,
    });
    setIsLoading(false);
  };

  const moods = [
    { value: "excellent", emoji: "🌟", label: "Excellent", icon: Sun },
    { value: "bien", emoji: "😊", label: "Bien", icon: Smile },
    { value: "neutre", emoji: "😐", label: "Neutre", icon: Meh },
    { value: "fatiguée", emoji: "😴", label: "Fatiguée", icon: Moon },
    { value: "stressée", emoji: "😰", label: "Stressée", icon: Frown },
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
          <button
            onClick={() => { setMood(null); localStorage.removeItem("todayMood"); }}
            className="text-xs text-gray-500 hover:text-gold-400"
          >
            Modifier
          </button>
        </div>
        {mood === "fatiguée" && (
          <p className="text-xs text-gold-400 mt-3 pt-2 border-t border-gold-500/20">✨ Prends soin de toi. Une petite chose à la fois.</p>
        )}
        {mood === "stressée" && (
          <p className="text-xs text-gold-400 mt-3 pt-2 border-t border-gold-500/20">🌿 On respire. Une seule priorité pour commencer.</p>
        )}
        {mood === "excellent" && (
          <p className="text-xs text-gold-400 mt-3 pt-2 border-t border-gold-500/20">🔥 C'est le moment d'attaquer les gros dossiers !</p>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
      <p className="text-xs text-gray-500 mb-3">Comment te sens-tu aujourd'hui ?</p>
      <div className="flex justify-between">
        {moods.map((m) => (
          <button
            key={m.value}
            onClick={() => saveMood(m.value)}
            disabled={isLoading}
            className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            <span className="text-xl">{m.emoji}</span>
            <span className="text-[10px] text-gray-500">{m.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [greeting, setGreeting] = useState("");
  const [userName, setUserName] = useState("Rebecca");
  const [isLoading, setIsLoading] = useState(true);
  const [proactiveSuggestions, setProactiveSuggestions] = useState<Suggestion[]>([]);
  const [aiPriorities, setAiPriorities] = useState<AiPriority[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  
  // Données pour la carte de vie dynamique
  const [missions, setMissions] = useState<Mission[]>([]);
  const [todayTasks, setTodayTasks] = useState<Task[]>([]);
  const [pendingDocs, setPendingDocs] = useState<Document[]>([]);
  const [recentWins, setRecentWins] = useState<Win[]>([]);
  const [familyEvents, setFamilyEvents] = useState<FamilyEvent[]>([]);
  const [relocationTasks, setRelocationTasks] = useState<RelocationTask[]>([]);
  const [farmUnits, setFarmUnits] = useState<FarmUnit[]>([]);
  const [financials, setFinancials] = useState({ revenue: 0, spending: 0, balance: 0 });
  const [alignmentScore, setAlignmentScore] = useState(0);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Bonjour");
    else if (hour < 18) setGreeting("Bon après-midi");
    else setGreeting("Bonsoir");
    
    fetchUserName();
    fetchAllData();
  }, []);

  async function fetchUserName() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email) {
      const name = user.email.split('@')[0];
      setUserName(name.charAt(0).toUpperCase() + name.slice(1));
    }
  }

  async function fetchAllData() {
    setIsLoading(true);
    await Promise.all([
      fetchMissions(),
      fetchTasks(),
      fetchDocuments(),
      fetchWins(),
      fetchFinancials(),
      fetchAiPriorities(),
      fetchProactiveSuggestions(),
      fetchFamilyEvents(),
      fetchRelocationTasks(),
      fetchFarmUnits(),
      fetchReminders()
    ]);
    calculateAlignmentScore();
    setIsLoading(false);
  }

  async function fetchReminders() {
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    
    // Tâches en retard ou aujourd'hui
    const { data: tasks } = await supabase
      .from("tasks")
      .select("*")
      .in("due_date", [today, tomorrow])
      .neq("status", "done");
    
    // Documents en retard
    const { data: docs } = await supabase
      .from("documents")
      .select("*")
      .lt("due_date", today)
      .neq("status", "approved");
    
    const allReminders: Reminder[] = [];
    
    tasks?.forEach(task => {
      allReminders.push({
        id: task.id,
        title: task.title,
        type: "task",
        due_date: task.due_date,
        urgency: task.due_date === today ? "high" : "medium"
      });
    });
    
    docs?.forEach(doc => {
      allReminders.push({
        id: doc.id,
        title: doc.name,
        type: "document",
        due_date: doc.due_date,
        urgency: "high"
      });
    });
    
    setReminders(allReminders.slice(0, 5));
  }

  async function fetchProactiveSuggestions() {
    try {
      const response = await fetch(`${API_URL}/api/proactive-suggestions`);
      const data = await response.json();
      setProactiveSuggestions(data.suggestions || []);
    } catch (error) {
      console.error("Erreur suggestions:", error);
    }
  }

  async function fetchAiPriorities() {
    try {
      const response = await fetch(`${API_URL}/api/ai-priorities`);
      const data = await response.json();
      setAiPriorities(data.priorities || []);
    } catch (error) {
      console.error("Erreur priorités:", error);
    }
  }

  async function fetchMissions() {
    const { data } = await supabase.from("missions").select("*").eq("status", "active");
    setMissions(data || []);
  }

  async function fetchTasks() {
    const { data } = await supabase.from("tasks").select("*").eq("status", "today").limit(5);
    setTodayTasks(data || []);
  }

  async function fetchDocuments() {
    const { data } = await supabase.from("documents").select("*").neq("status", "approved").limit(3);
    setPendingDocs(data || []);
  }

  async function fetchWins() {
    const { data } = await supabase.from("wins").select("*").order("date", { ascending: false }).limit(3);
    setRecentWins(data || []);
  }

  async function fetchFinancials() {
    const [revenueRes, spendingRes] = await Promise.all([
      supabase.from("revenue").select("amount"),
      supabase.from("spending").select("amount")
    ]);
    const revenue = (revenueRes.data || []).reduce((sum, r) => sum + (r.amount || 0), 0);
    const spending = (spendingRes.data || []).reduce((sum, s) => sum + (s.amount || 0), 0);
    setFinancials({ revenue, spending, balance: revenue - spending });
  }

  async function fetchFamilyEvents() {
    const { data } = await supabase.from("family_events").select("*").gte("date", new Date().toISOString().split('T')[0]).limit(10);
    setFamilyEvents(data || []);
  }

  async function fetchRelocationTasks() {
    const { data } = await supabase.from("relocation_tasks").select("*").neq("status", "completed");
    setRelocationTasks(data || []);
  }

  async function fetchFarmUnits() {
    const { data } = await supabase.from("farm_production_units").select("*").eq("status", "active");
    setFarmUnits(data || []);
  }

  function calculateAlignmentScore() {
    // Score basé sur: missions actives + victoires récentes + humeur
    const baseScore = Math.min(100, (missions.length * 5) + (recentWins.length * 3));
    setAlignmentScore(baseScore);
  }

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(val);
  };

  const handleHelpMeMoveForward = () => {
    window.location.href = "/chat?mode=execute";
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 h-full flex flex-col overflow-y-auto bg-midnight">
      
      {/* HEADER avec prénom */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-serif text-ivory tracking-tight">
          {greeting}, {userName}. 👑
        </h1>
        <p className="text-gray-500 text-sm mt-1">Aujourd'hui avec Becks</p>
      </div>

      {/* WIDGET HUMEUR */}
      <div className="mb-6">
        <MoodWidget />
      </div>

      {/* BOUTON "Aide-moi à avancer" */}
      <motion.button
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        onClick={handleHelpMeMoveForward}
        className="mb-8 w-full py-4 bg-gradient-to-r from-gold-500/20 to-gold-500/5 border border-gold-500/30 rounded-2xl text-gold-500 font-medium flex items-center justify-center gap-3 hover:bg-gold-500/30 transition-all group"
      >
        <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform" />
        <span>🧠 Aide-moi à avancer maintenant</span>
        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
      </motion.button>

      {/* TOP 3 PRIORITÉS IA */}
      {aiPriorities.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 text-gold-500 mb-3">
            <Target className="w-4 h-4" />
            <h2 className="text-sm font-serif">🎯 Top priorités du jour</h2>
          </div>
          <div className="space-y-3">
            {aiPriorities.map((priority, idx) => (
              <div
                key={priority.id || idx}
                className={`p-4 rounded-xl border-l-4 transition-all ${
                  idx === 0 ? "border-l-red-500 bg-red-950/10" :
                  idx === 1 ? "border-l-orange-500 bg-orange-950/10" :
                  "border-l-gold-500 bg-gold-500/5"
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-ivory font-medium">{priority.title}</p>
                    <p className="text-xs text-gray-400 mt-1">{priority.priority_reason}</p>
                    {priority.due_date && (
                      <p className="text-xs text-gray-500 mt-1">📅 {new Date(priority.due_date).toLocaleDateString('fr-FR')}</p>
                    )}
                  </div>
                  <Link href="/tasks" className="text-gold-500 text-sm hover:underline">→</Link>
                </div>
                <div className="mt-2 w-full bg-white/10 rounded-full h-1">
                  <div className={`h-1 rounded-full ${idx === 0 ? "bg-red-500" : idx === 1 ? "bg-orange-500" : "bg-gold-500"}`} style={{ width: `${(priority.score / 40) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION RAPPELS IMPORTANTS - NOUVEAU */}
      {reminders.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 text-gold-500 mb-3">
            <Bell className="w-4 h-4" />
            <h2 className="text-sm font-serif">🔔 Rappels importants</h2>
          </div>
          <div className="space-y-2">
            {reminders.map(reminder => (
              <div key={reminder.id} className={`p-3 rounded-xl border-l-4 ${reminder.urgency === "high" ? "border-l-red-500 bg-red-950/10" : "border-l-yellow-500 bg-yellow-950/10"}`}>
                <p className="text-sm text-ivory">{reminder.title}</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${reminder.type === "task" ? "bg-blue-500/20 text-blue-400" : "bg-orange-500/20 text-orange-400"}`}>
                    {reminder.type === "task" ? "📋 Tâche" : "📄 Document"}
                  </span>
                  {reminder.due_date && (
                    <span className={`text-xs ${reminder.urgency === "high" ? "text-red-400" : "text-yellow-400"}`}>
                      ⚠️ {new Date(reminder.due_date).toLocaleDateString('fr-FR')}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CARTE DE VIE DYNAMIQUE - AMÉLIORÉE */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-gold-500 mb-3">
          <Globe className="w-4 h-4" />
          <h2 className="text-sm font-serif">🗺️ Carte de vie</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <LifeMapCard 
            title="Famille" 
            icon={Heart} 
            count={familyEvents.length} 
            status="événements" 
            color="text-pink-400" 
            href="/family" 
          />
          <LifeMapCard 
            title="Argent" 
            icon={DollarSign} 
            count={financials.balance} 
            status="CFA" 
            color="text-emerald-400" 
            href="/money" 
            isCurrency={true}
          />
          <LifeMapCard 
            title="Business" 
            icon={Briefcase} 
            count={missions.length} 
            status="missions" 
            color="text-blue-400" 
            href="/missions" 
          />
          <LifeMapCard 
            title="Ferme" 
            icon={Sprout} 
            count={farmUnits.length} 
            status="unités" 
            color="text-green-400" 
            href="/farm" 
          />
          <LifeMapCard 
            title="Documents" 
            icon={FileText} 
            count={pendingDocs.length} 
            status="en attente" 
            color="text-orange-400" 
            href="/documents" 
          />
          <LifeMapCard 
            title="Victoires" 
            icon={Trophy} 
            count={recentWins.length} 
            status="récentes" 
            color="text-yellow-400" 
            href="/wins" 
          />
          <LifeMapCard 
            title="Relocation" 
            icon={Globe} 
            count={relocationTasks.length} 
            status="tâches" 
            color="text-cyan-400" 
            href="/relocation" 
          />
          <LifeMapCard 
            title="Alignement" 
            icon={Shield} 
            count={alignmentScore} 
            status="%" 
            color="text-purple-400" 
            href="/alignment" 
          />
        </div>
      </div>

      {/* STATS RAPIDES */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard title="Trésorerie" value={formatCurrency(financials.balance)} icon={<Wallet className="w-5 h-5" />} color="text-gold-500" />
        <StatCard title="Missions actives" value={missions.length.toString()} icon={<Target className="w-5 h-5" />} color="text-blue-400" />
        <StatCard title="Tâches aujourd'hui" value={todayTasks.length.toString()} icon={<Clock className="w-5 h-5" />} color="text-orange-400" />
        <StatCard title="Documents" value={pendingDocs.length.toString()} icon={<FileText className="w-5 h-5" />} color="text-red-400" />
      </div>

      {/* SUGGESTIONS PROACTIVES */}
      {proactiveSuggestions.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 text-gold-500 mb-3">
            <Lightbulb className="w-4 h-4" />
            <h2 className="text-sm font-serif">✨ Suggestions Becks</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {proactiveSuggestions.slice(0, 3).map((suggestion, idx) => (
              <Link key={idx} href={suggestion.action_url} className="block p-4 bg-gold-500/5 border border-gold-500/20 rounded-xl hover:bg-gold-500/10 transition-all">
                <p className="text-sm font-medium text-ivory">{suggestion.title}</p>
                <p className="text-xs text-gray-400 mt-1">{suggestion.message}</p>
                <span className="inline-block text-xs text-gold-500 mt-3">→ Voir</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* TÂCHES DU JOUR */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-sm font-serif text-gold-500 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            📋 Tâches du jour
          </h2>
          <Link href="/tasks" className="text-xs text-gray-500 hover:text-gold-500">Voir tout →</Link>
        </div>
        {todayTasks.length > 0 ? (
          <div className="space-y-2">
            {todayTasks.map(task => (
              <div key={task.id} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
                <div className="w-1.5 h-1.5 rounded-full bg-gold-500" />
                <span className="text-ivory text-sm">{task.title}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm text-center py-4">Aucune tâche planifiée pour aujourd'hui ✨</p>
        )}
      </div>

      {/* VICTOIRES RÉCENTES */}
      {recentWins.length > 0 && (
        <div className="mb-8">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-sm font-serif text-gold-500 flex items-center gap-2">
              <Trophy className="w-4 h-4" />
              🏆 Victoires récentes
            </h2>
            <Link href="/wins" className="text-xs text-gray-500 hover:text-gold-500">Voir tout →</Link>
          </div>
          <div className="space-y-2">
            {recentWins.map(win => (
              <div key={win.id} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
                <span className="text-xl">{win.celebration_emoji || "🎉"}</span>
                <span className="text-ivory text-sm">{win.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* DOCUMENTS EN ATTENTE */}
      {pendingDocs.length > 0 && (
        <div className="mb-8">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-sm font-serif text-gold-500 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              📄 Documents à traiter
            </h2>
            <Link href="/documents" className="text-xs text-gray-500 hover:text-gold-500">Voir tout →</Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {pendingDocs.map(doc => (
              <span key={doc.id} className="px-3 py-1.5 bg-yellow-500/10 text-yellow-400 rounded-full text-xs">
                {doc.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* BOUTON CHAT FLOTTANT */}
      <Link href="/chat" className="fixed bottom-6 right-6 z-40 bg-gold-500 text-midnight p-4 rounded-full shadow-lg hover:scale-105 transition-transform">
        <MessageSquare className="w-6 h-6" />
      </Link>
    </div>
  );
}

// Composant StatCard
function StatCard({ title, value, icon, color }: { title: string; value: string; icon: React.ReactNode; color: string }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
      <div className={`${color} mb-2`}>{icon}</div>
      <div className="text-xl font-serif text-ivory">{value}</div>
      <div className="text-xs text-gray-500 mt-1">{title}</div>
    </div>
  );
}

// Composant LifeMapCard amélioré avec support devise
function LifeMapCard({ title, icon: Icon, count, status, color, href, isCurrency = false }: { title: string; icon: any; count: number | string; status: string; color: string; href: string; isCurrency?: boolean }) {
  const displayValue = isCurrency && typeof count === 'number' 
    ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(count)
    : count;
  
  return (
    <Link href={href} className="bg-white/5 border border-white/10 rounded-xl p-3 hover:bg-white/10 transition-all">
      <Icon className={`w-4 h-4 ${color} mb-2`} />
      <p className="text-xs font-medium text-ivory">{title}</p>
      <p className="text-[10px] text-gray-500 mt-0.5">{displayValue} {!isCurrency && status}</p>
    </Link>
  );
}
