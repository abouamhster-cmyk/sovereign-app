"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";
import Link from "next/link";
import { 
  MessageSquare, Sparkles, Heart, Target, Calendar, 
  DollarSign, FileText, Trophy, Briefcase, Sprout, 
  Globe, Shield, Sun, Moon, Smile, Meh, Frown, Crown,
  Loader2, TrendingUp, Wallet, Users
} from "lucide-react";

import { CollapsibleSection } from "@/components/CollapsibleSection";

const API_URL = "https://sovereign-bridge.onrender.com";

type Priority = {
  id: string;
  title: string;
  priority_reason: string;
  score: number;
};

type Task = {
  id: string;
  title: string;
  due_date: string | null;
  status: string;
  area?: string;
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

type Suggestion = {
  type: string;
  title: string;
  message: string;
  action_url: string;
  action_label: string;
};

export default function DashboardPage() {
  const [greeting, setGreeting] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [userName, setUserName] = useState("Rebecca");
  
  // Données
  const [priorities, setPriorities] = useState<Priority[]>([]);
  const [todayTasks, setTodayTasks] = useState<Task[]>([]);
  const [activeMissions, setActiveMissions] = useState<Mission[]>([]);
  const [pendingDocs, setPendingDocs] = useState<Document[]>([]);
  const [recentWins, setRecentWins] = useState<Win[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [mood, setMood] = useState<string | null>(null);
  
  // Stats
  const [financials, setFinancials] = useState({ revenue: 0, spending: 0, balance: 0 });
  const [stats, setStats] = useState({ totalTasks: 0, completedTasks: 0, pendingDocs: 0 });

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
      fetchTodayTasks(),
      fetchActiveMissions(),
      fetchPendingDocs(),
      fetchRecentWins(),
      fetchSuggestions(),
      fetchFinancials()
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

  async function fetchTodayTasks() {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from("tasks")
      .select("*")
      .eq("status", "today")
      .limit(5);
    setTodayTasks(data || []);
  }

  async function fetchActiveMissions() {
    const { data } = await supabase
      .from("missions")
      .select("*")
      .eq("status", "active")
      .limit(6);
    setActiveMissions(data || []);
  }

  async function fetchPendingDocs() {
    const { data } = await supabase
      .from("documents")
      .select("*")
      .neq("status", "approved")
      .limit(3);
    setPendingDocs(data || []);
  }

  async function fetchRecentWins() {
    const { data } = await supabase
      .from("wins")
      .select("*")
      .order("date", { ascending: false })
      .limit(3);
    setRecentWins(data || []);
  }

  async function fetchSuggestions() {
    try {
      const response = await fetch(`${API_URL}/api/proactive-suggestions`);
      const data = await response.json();
      setSuggestions(data.suggestions || []);
    } catch (error) {
      console.error("Erreur suggestions:", error);
    }
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
  }

  const moods = [
    { value: "excellent", emoji: "🌟", label: "Excellent" },
    { value: "bien", emoji: "😊", label: "Bien" },
    { value: "neutre", emoji: "😐", label: "Neutre" },
    { value: "fatiguée", emoji: "😴", label: "Fatiguée" },
    { value: "stressée", emoji: "😰", label: "Stressée" }
  ];

  const currentMood = moods.find(m => m.value === mood);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(val);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-5 pb-24 px-4">
      {/* HEADER */}
      <div className="flex justify-between items-start mb-2">
        <div>
          <h1 className="text-2xl md:text-3xl font-serif text-ivory tracking-tight">
            {greeting}, {userName}. 👑
          </h1>
          <p className="text-gray-500 text-sm">Aujourd'hui avec Becks</p>
        </div>
        <Link 
          href="/chat" 
          className="bg-gold-500/20 text-gold-500 p-2.5 rounded-full hover:bg-gold-500/30 transition-colors"
          title="Discuter avec Becks"
        >
          <MessageSquare className="w-5 h-5" />
        </Link>
      </div>

      {/* HUMEUR DU JOUR */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-3">
        {mood ? (
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
        ) : (
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-sm text-gray-400">Comment te sens-tu aujourd'hui ?</span>
            <div className="flex gap-2">
              {moods.map((m) => (
                <button
                  key={m.value}
                  onClick={() => saveMood(m.value)}
                  className="text-xl hover:scale-110 transition-transform px-1"
                  title={m.label}
                >
                  {m.emoji}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* STATS RAPIDES (toujours visibles) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
          <Wallet className="w-5 h-5 text-gold-500 mx-auto mb-1" />
          <div className="text-lg font-serif text-ivory">{formatCurrency(financials.balance)}</div>
          <div className="text-[10px] text-gray-500">Trésorerie</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
          <Target className="w-5 h-5 text-blue-400 mx-auto mb-1" />
          <div className="text-lg font-serif text-blue-400">{activeMissions.length}</div>
          <div className="text-[10px] text-gray-500">Missions actives</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
          <Calendar className="w-5 h-5 text-orange-400 mx-auto mb-1" />
          <div className="text-lg font-serif text-orange-400">{todayTasks.length}</div>
          <div className="text-[10px] text-gray-500">Tâches aujourd'hui</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
          <FileText className="w-5 h-5 text-red-400 mx-auto mb-1" />
          <div className="text-lg font-serif text-red-400">{pendingDocs.length}</div>
          <div className="text-[10px] text-gray-500">Documents</div>
        </div>
      </div>

      {/* SECTION 1 : TOP PRIORITÉS IA */}
      {priorities.length > 0 && (
        <CollapsibleSection 
          title="🎯 Top priorités du jour" 
          icon={TrendingUp}
          defaultOpen={true}
          badge={priorities.length}
        >
          <div className="space-y-3">
            {priorities.map((priority, idx) => (
              <Link
                key={priority.id}
                href="/tasks"
                className={`block p-3 rounded-xl transition-all hover:bg-white/5 ${
                  idx === 0 ? "border-l-2 border-l-red-500 bg-red-950/10" :
                  idx === 1 ? "border-l-2 border-l-orange-500 bg-orange-950/10" :
                  "border-l-2 border-l-gold-500 bg-gold-500/5"
                }`}
              >
                <p className="text-sm font-medium text-ivory">{priority.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{priority.priority_reason}</p>
                <div className="mt-2 w-full bg-white/10 rounded-full h-1">
                  <div 
                    className={`h-1 rounded-full ${
                      idx === 0 ? "bg-red-500" : idx === 1 ? "bg-orange-500" : "bg-gold-500"
                    }`}
                    style={{ width: `${(priority.score / 40) * 100}%` }}
                  />
                </div>
              </Link>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* SECTION 2 : TÂCHES DU JOUR */}
      {todayTasks.length > 0 && (
        <CollapsibleSection 
          title="📋 Tâches du jour" 
          defaultOpen={true}
          badge={todayTasks.length}
        >
          <div className="space-y-2">
            {todayTasks.map((task) => (
              <Link
                key={task.id}
                href="/tasks"
                className="flex items-center gap-3 p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-all"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-gold-500" />
                <span className="text-sm text-ivory">{task.title}</span>
              </Link>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* SECTION 3 : MISSIONS ACTIVES */}
      {activeMissions.length > 0 && (
        <CollapsibleSection 
          title="🎯 Missions actives" 
          icon={Briefcase}
          defaultOpen={false}
          badge={activeMissions.length}
        >
          <div className="flex flex-wrap gap-2">
            {activeMissions.slice(0, 6).map((mission) => (
              <Link
                key={mission.id}
                href="/missions"
                className="px-3 py-1.5 bg-white/5 rounded-full text-xs text-gray-300 hover:bg-white/10 hover:text-gold-400 transition-colors"
              >
                {mission.name}
              </Link>
            ))}
            {activeMissions.length > 6 && (
              <span className="px-3 py-1.5 text-xs text-gray-500">+{activeMissions.length - 6}</span>
            )}
          </div>
        </CollapsibleSection>
      )}

      {/* SECTION 4 : VICTOIRES RÉCENTES */}
      {recentWins.length > 0 && (
        <CollapsibleSection 
          title="🏆 Victoires récentes" 
          icon={Trophy}
          defaultOpen={false}
          badge={recentWins.length}
        >
          <div className="space-y-2">
            {recentWins.map((win) => (
              <div key={win.id} className="flex items-center gap-3 p-2 bg-white/5 rounded-lg">
                <span className="text-xl">{win.celebration_emoji || "🎉"}</span>
                <span className="text-sm text-gray-300">{win.title}</span>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* SECTION 5 : DOCUMENTS EN ATTENTE */}
      {pendingDocs.length > 0 && (
        <CollapsibleSection 
          title="📄 Documents à traiter" 
          icon={FileText}
          defaultOpen={false}
          badge={pendingDocs.length}
        >
          <div className="flex flex-wrap gap-2">
            {pendingDocs.map((doc) => (
              <Link
                key={doc.id}
                href="/documents"
                className="px-3 py-1.5 bg-yellow-500/10 text-yellow-400 rounded-full text-xs hover:bg-yellow-500/20 transition-colors"
              >
                {doc.name}
              </Link>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* SECTION 6 : SUGGESTIONS BECKS */}
      {suggestions.length > 0 && (
        <CollapsibleSection 
          title="💡 Suggestions Becks" 
          icon={Sparkles}
          defaultOpen={false}
          badge={suggestions.length}
        >
          <div className="space-y-2">
            {suggestions.slice(0, 3).map((suggestion, idx) => (
              <Link
                key={idx}
                href={suggestion.action_url}
                className="block p-3 bg-gold-500/5 border border-gold-500/20 rounded-xl hover:bg-gold-500/10 transition-all"
              >
                <p className="text-sm font-medium text-ivory">{suggestion.title}</p>
                <p className="text-xs text-gray-400 mt-1">{suggestion.message}</p>
                <span className="inline-block text-xs text-gold-500 mt-2">→ {suggestion.action_label}</span>
              </Link>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* AVATAR FLOTTANT */}
      <div className="fixed bottom-6 right-6 z-40">
        <Link 
          href="/chat" 
          className="bg-gold-500 text-midnight p-4 rounded-full shadow-lg hover:scale-105 transition-transform flex items-center gap-2"
        >
          <Crown className="w-5 h-5" />
          <span className="hidden md:inline text-sm font-medium">Becks</span>
        </Link>
      </div>
    </div>
  );
}
