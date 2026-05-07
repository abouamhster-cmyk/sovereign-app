"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";
import Link from "next/link";
import { 
  MessageSquare, Sparkles, Sun, Moon, Smile, Meh, Frown,
  Loader2, TrendingUp, Crown
} from "lucide-react";

import { CollapsibleSection } from "@/components/CollapsibleSection";
import { SimpleLifeMap } from "@/components/SimpleLifeMap";
import { DashboardPriorities } from "@/components/DashboardPriorities";
import { DashboardTasks } from "@/components/DashboardTasks";

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
  const [upcomingTasks, setUpcomingTasks] = useState<Task[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [mood, setMood] = useState<string | null>(null);
  
  // Stats pour la Life Map
  const [balance, setBalance] = useState(0);
  const [activeMissions, setActiveMissions] = useState(0);
  const [familyEvents, setFamilyEvents] = useState(0);
  const [alignmentScore, setAlignmentScore] = useState(0);

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
      fetchUpcomingTasks(),
      fetchSuggestions(),
      fetchLifeMapData()
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

  async function fetchUpcomingTasks() {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from("tasks")
      .select("*")
      .neq("status", "done")
      .order("due_date", { ascending: true, nullsFirst: false })
      .limit(5);
    setUpcomingTasks(data || []);
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

  async function fetchLifeMapData() {
    try {
      // Finances
      const [revenueRes, spendingRes] = await Promise.all([
        supabase.from("revenue").select("amount"),
        supabase.from("spending").select("amount")
      ]);
      const totalRevenue = (revenueRes.data || []).reduce((sum, r) => sum + (r.amount || 0), 0);
      const totalSpending = (spendingRes.data || []).reduce((sum, s) => sum + (s.amount || 0), 0);
      setBalance(totalRevenue - totalSpending);
      
      // Missions actives
      const { data: missions } = await supabase.from("missions").select("*").eq("status", "active");
      setActiveMissions(missions?.length || 0);
      
      // Événements familiaux à venir
      const today = new Date().toISOString().split('T')[0];
      const { data: events } = await supabase
        .from("family_events")
        .select("*")
        .gte("date", today)
        .neq("status", "done");
      setFamilyEvents(events?.length || 0);
      
      // Score d'alignement (victoires récentes)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const { data: wins } = await supabase.from("wins").select("*").gte("date", sevenDaysAgo);
      setAlignmentScore(Math.min(100, (wins?.length || 0) * 12));
      
    } catch (error) {
      console.error("Erreur LifeMap:", error);
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
  }

  const moods = [
    { value: "excellent", emoji: "🌟", label: "Excellent", icon: Sun },
    { value: "bien", emoji: "😊", label: "Bien", icon: Smile },
    { value: "neutre", emoji: "😐", label: "Neutre", icon: Meh },
    { value: "fatiguée", emoji: "😴", label: "Fatiguée", icon: Moon },
    { value: "stressée", emoji: "😰", label: "Stressée", icon: Frown }
  ];

  const currentMood = moods.find(m => m.value === mood);

  return (
    <div className="max-w-4xl mx-auto space-y-4 pb-24">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-2">
        <div>
          <h1 className="text-2xl md:text-3xl font-serif text-ivory tracking-tight">
            {greeting}, {userName}. 👑
          </h1>
          <p className="text-gray-500 text-sm">Becks est là pour t'aider</p>
        </div>
        <Link 
          href="/chat" 
          className="bg-gold-500 text-midnight p-3 rounded-full shadow-lg hover:scale-105 transition-transform"
        >
          <MessageSquare className="w-5 h-5" />
        </Link>
      </div>

      {/* HUMEUR DU JOUR (petit widget) */}
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
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Comment te sens-tu ?</span>
            <div className="flex gap-2">
              {moods.map((m) => (
                <button
                  key={m.value}
                  onClick={() => saveMood(m.value)}
                  className="text-xl hover:scale-110 transition-transform"
                  title={m.label}
                >
                  {m.emoji}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* SECTION 1 : TOP PRIORITÉS */}
      <CollapsibleSection 
        title="🎯 Top priorités du jour" 
        icon={TrendingUp}
        defaultOpen={true}
        badge={priorities.length}
      >
        {isLoading ? (
          <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-gold-500" /></div>
        ) : (
          <DashboardPriorities priorities={priorities} />
        )}
      </CollapsibleSection>

      {/* SECTION 2 : PROCHAINES TÂCHES */}
      <CollapsibleSection 
        title="📋 Mes prochaines tâches" 
        defaultOpen={true}
        badge={upcomingTasks.length}
      >
        {isLoading ? (
          <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-gold-500" /></div>
        ) : (
          <DashboardTasks tasks={upcomingTasks} />
        )}
      </CollapsibleSection>

      {/* SECTION 3 : CARTE DE VIE (repliable) */}
      <CollapsibleSection 
        title="🗺️ Carte de vie" 
        defaultOpen={false}
      >
        <SimpleLifeMap 
          balance={balance}
          activeMissions={activeMissions}
          familyEvents={familyEvents}
          alignmentScore={alignmentScore}
        />
      </CollapsibleSection>

      {/* SECTION 4 : SUGGESTIONS BECKS (repliable) */}
      {suggestions.length > 0 && (
        <CollapsibleSection 
          title="💡 Suggestions Becks" 
          icon={Sparkles}
          defaultOpen={false}
          badge={suggestions.length}
        >
          <div className="space-y-2">
            {suggestions.slice(0, 2).map((suggestion, idx) => (
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

      {/* BOUTON D'AIDE FLOTTANT */}
      <div className="fixed bottom-6 right-6 z-40">
        <Link 
          href="/chat" 
          className="bg-gold-500 text-midnight p-4 rounded-full shadow-lg hover:scale-105 transition-transform flex items-center gap-2"
        >
          <Crown className="w-5 h-5" />
          <span className="hidden md:inline text-sm">Becks</span>
        </Link>
      </div>
    </div>
  );
}
