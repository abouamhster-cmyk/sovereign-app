"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";
import Link from "next/link";
import { 
  LayoutDashboard, Target, Heart, DollarSign, Briefcase,
  Sprout, AlertCircle, CheckCircle, Clock, TrendingUp,
  Calendar, Sparkles, ArrowRight, MessageSquare, Shield,
  FileText, Users, Wallet, Globe, Zap, Menu, Lightbulb
} from "lucide-react";

type Mission = {
  id: string;
  name: string;
  status: string;
  priority: string;
};

type Task = {
  id: string;
  title: string;
  status: string;
  due_date: string | null;
};

type Document = {
  id: string;
  name: string;
  status: string;
};

type Opportunity = {
  id: string;
  title: string;
  stage: string;
  estimated_value: number;
};

type Win = {
  id: string;
  title: string;
  celebration_emoji: string;
};

type FarmStats = {
  totalSpent: number;
  activeUnits: number;
  nextMilestone: string;
};

type Suggestion = {
  type: string;
  priority: "high" | "medium" | "low";
  title: string;
  message: string;
  action_url: string;
  action_label: string;
};

const API_URL = "https://sovereign-bridge.onrender.com";

export default function DashboardPage() {
  const [greeting, setGreeting] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [proactiveSuggestions, setProactiveSuggestions] = useState<Suggestion[]>([]);
  
  // Données
  const [missions, setMissions] = useState<Mission[]>([]);
  const [todayTasks, setTodayTasks] = useState<Task[]>([]);
  const [urgentTasks, setUrgentTasks] = useState<Task[]>([]);
  const [pendingDocs, setPendingDocs] = useState<Document[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [recentWins, setRecentWins] = useState<Win[]>([]);
  const [farmStats, setFarmStats] = useState<FarmStats>({
    totalSpent: 0,
    activeUnits: 0,
    nextMilestone: "Chargement..."
  });
  const [financials, setFinancials] = useState({
    revenue: 0,
    spending: 0,
    balance: 0
  });

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Bonjour");
    else if (hour < 18) setGreeting("Bon après-midi");
    else setGreeting("Bonsoir");
    
    fetchAllData();
    
    // Écouter les changements en temps réel
    const channels = [
      supabase.channel('dashboard_missions').on('postgres_changes', { event: '*', schema: 'public', table: 'missions' }, () => fetchMissions()).subscribe(),
      supabase.channel('dashboard_tasks').on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => fetchTasks()).subscribe(),
      supabase.channel('dashboard_docs').on('postgres_changes', { event: '*', schema: 'public', table: 'documents' }, () => fetchDocuments()).subscribe(),
    ];
    
    return () => channels.forEach(ch => ch.unsubscribe());
  }, []);

  async function fetchAllData() {
    setIsLoading(true);
    await Promise.all([
      fetchMissions(),
      fetchTasks(),
      fetchDocuments(),
      fetchOpportunities(),
      fetchWins(),
      fetchFarmStats(),
      fetchFinancials(),
      fetchProactiveSuggestions()
    ]);
    setIsLoading(false);
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

  async function fetchMissions() {
    const { data } = await supabase
      .from("missions")
      .select("*")
      .eq("status", "active");
    setMissions(data || []);
  }

  async function fetchTasks() {
    const { data } = await supabase
      .from("tasks")
      .select("*")
      .eq("status", "today")
      .limit(5);
    setTodayTasks(data || []);
    
    const { data: urgent } = await supabase
      .from("tasks")
      .select("*")
      .eq("status", "today")  
      .neq("status", "done");
    setUrgentTasks(urgent || []);
  }

  async function fetchDocuments() {
    const { data } = await supabase
      .from("documents")
      .select("*")
      .neq("status", "approved")
      .limit(3);
    setPendingDocs(data || []);
  }

  async function fetchOpportunities() {
    const { data } = await supabase
      .from("opportunities")
      .select("*")
      .eq("stage", "preparing")
      .limit(3);
    setOpportunities(data || []);
  }

  async function fetchWins() {
    const { data } = await supabase
      .from("wins")
      .select("*")
      .order("date", { ascending: false })
      .limit(3);
    setRecentWins(data || []);
  }

  async function fetchFarmStats() {
    const [spendingRes, unitsRes] = await Promise.all([
      supabase.from("farm_spending").select("amount"),
      supabase.from("farm_production_units").select("status").eq("status", "active")
    ]);
    
    const totalSpent = (spendingRes.data || []).reduce((sum, s) => sum + (s.amount || 0), 0);
    
    setFarmStats({
      totalSpent,
      activeUnits: (unitsRes.data || []).length,
      nextMilestone: "Installation poissons"
    });
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

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(val);
  };

  // Calm guidance dynamique
  const calmGuidance = urgentTasks.length > 0 
    ? `⚠️ ${urgentTasks.length} tâche(s) urgente(s). Respire. Traite-les une par une.`
    : todayTasks.length > 0
    ? `🎯 Concentre-toi sur tes ${todayTasks.length} priorités du jour. Le reste attendra.`
    : `🌿 Une journée plus calme. Profites-en pour avancer sur ce qui compte vraiment.`;

  return (
    <div className="p-6 lg:p-8 h-full flex flex-col overflow-y-auto bg-midnight">
      
      {/* HEADER */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl lg:text-4xl font-serif text-ivory tracking-tight">
            {greeting}, Rebecca.
          </h1>
          <p className="text-gray-500 text-sm mt-1">Ton empire est sous contrôle.</p>
        </div>
        <Link 
          href="/chat"
          className="flex items-center gap-2 bg-gold-500/10 text-gold-500 px-4 py-2 rounded-full text-sm hover:bg-gold-500/20 transition-colors"
        >
          <MessageSquare className="w-4 h-4" />
          <span className="hidden sm:inline">Sovereign</span>
        </Link>
      </div>

      {/* SUGGESTIONS PROACTIVES */}
      {proactiveSuggestions.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 text-gold-500 mb-3">
            <Lightbulb className="w-4 h-4" />
            <h2 className="text-sm font-serif">Suggestions Sovereign</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {proactiveSuggestions.map((suggestion, idx) => {
              const priorityColor = suggestion.priority === "high" ? "border-red-500/30 bg-red-950/20" :
                                    suggestion.priority === "medium" ? "border-yellow-500/30 bg-yellow-950/20" :
                                    "border-gold-500/30 bg-gold-500/5";
              const actionColor = suggestion.priority === "high" ? "text-red-400 hover:bg-red-500/20" :
                                  suggestion.priority === "medium" ? "text-yellow-400 hover:bg-yellow-500/20" :
                                  "text-gold-500 hover:bg-gold-500/20";
              
              return (
                <Link
                  key={idx}
                  href={suggestion.action_url}
                  className={`block p-4 rounded-xl border transition-all hover:scale-[1.02] ${priorityColor}`}
                >
                  <p className="text-sm font-medium text-ivory">{suggestion.title}</p>
                  <p className="text-xs text-gray-400 mt-1">{suggestion.message}</p>
                  <span className={`inline-block text-xs mt-3 px-2 py-1 rounded-full ${actionColor}`}>
                    {suggestion.action_label} →
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* STATS RAPIDES */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard 
          title="Trésorerie" 
          value={formatCurrency(financials.balance)} 
          icon={<Wallet className="w-5 h-5" />}
          color="text-gold-500"
        />
        <StatCard 
          title="Missions actives" 
          value={missions.length.toString()} 
          icon={<Target className="w-5 h-5" />}
          color="text-blue-400"
        />
        <StatCard 
          title="Tâches aujourd'hui" 
          value={todayTasks.length.toString()} 
          icon={<Clock className="w-5 h-5" />}
          color="text-orange-400"
        />
        <StatCard 
          title="Investissement Ferme" 
          value={formatCurrency(farmStats.totalSpent)} 
          icon={<Sprout className="w-5 h-5" />}
          color="text-emerald-400"
        />
      </div>

      {/* ZONE PRIORITAIRE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        
        {/* URGENT & TODAY */}
        <div className="lg:col-span-2 space-y-6">
          {/* Alertes urgentes */}
          {urgentTasks.length > 0 && (
            <div className="bg-red-950/20 border border-red-500/30 rounded-2xl p-5">
              <div className="flex items-center gap-2 text-red-400 mb-3">
                <AlertCircle className="w-5 h-5" />
                <span className="text-sm font-medium">URGENT - À traiter aujourd'hui</span>
              </div>
              <div className="space-y-2">
                {urgentTasks.map(task => (
                  <div key={task.id} className="flex items-center justify-between p-2 bg-midnight/50 rounded-lg">
                    <span className="text-ivory text-sm">{task.title}</span>
                    {task.due_date && <span className="text-xs text-red-400">⚠️ {new Date(task.due_date).toLocaleDateString('fr-FR')}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tâches du jour */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-sm font-serif text-gold-500 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                📋 Tâches prioritaires
              </h2>
              <Link href="/tasks" className="text-xs text-gray-500 hover:text-gold-500">Voir tout →</Link>
            </div>
            {todayTasks.length > 0 ? (
              <div className="space-y-2">
                {todayTasks.map(task => (
                  <div key={task.id} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg transition-colors">
                    <div className="w-1.5 h-1.5 rounded-full bg-gold-500" />
                    <span className="text-ivory text-sm">{task.title}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm text-center py-4">Aucune tâche planifiée pour aujourd'hui</p>
            )}
          </div>

          {/* Missions actives */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-sm font-serif text-gold-500 flex items-center gap-2">
                <Target className="w-4 h-4" />
                🚀 Missions actives
              </h2>
              <Link href="/missions" className="text-xs text-gray-500 hover:text-gold-500">Voir tout →</Link>
            </div>
            <div className="flex flex-wrap gap-2">
              {missions.map(mission => (
                <span key={mission.id} className="px-3 py-1.5 bg-midnight rounded-full text-xs text-ivory border border-white/10">
                  {mission.name}
                </span>
              ))}
              {missions.length === 0 && <p className="text-gray-500 text-sm">Aucune mission active</p>}
            </div>
          </div>
        </div>

        {/* COLONNE DROITE - CALM GUIDANCE & FARM PULSE */}
        <div className="space-y-6">
          {/* Calm Guidance */}
          <div className="bg-gradient-to-r from-gold-500/10 to-transparent border border-gold-500/20 rounded-2xl p-5">
            <Sparkles className="w-5 h-5 text-gold-500 mb-3" />
            <p className="text-ivory text-sm italic">{calmGuidance}</p>
            <p className="text-xs text-gray-500 mt-3">✨ Sovereign ✨</p>
          </div>

          {/* Farm Pulse */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <div className="flex items-center gap-2 text-emerald-400 mb-3">
              <Sprout className="w-5 h-5" />
              <h2 className="text-sm font-serif">Ifè Farm - Pulse</h2>
            </div>
            <div className="space-y-2 text-sm">
              <p className="flex justify-between">
                <span className="text-gray-500">Investi :</span>
                <span className="text-ivory">{formatCurrency(farmStats.totalSpent)}</span>
              </p>
              <p className="flex justify-between">
                <span className="text-gray-500">Productions :</span>
                <span className="text-ivory">{farmStats.activeUnits} actives</span>
              </p>
              <p className="flex justify-between">
                <span className="text-gray-500">Prochaine étape :</span>
                <span className="text-gold-500">{farmStats.nextMilestone}</span>
              </p>
            </div>
            <Link href="/farm" className="block text-center mt-4 text-xs text-gold-500 hover:underline">
              → Gérer la ferme
            </Link>
          </div>

          {/* Quick Actions */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <h2 className="text-sm font-serif text-gold-500 mb-3">⚡ Accès rapide</h2>
            <div className="grid grid-cols-2 gap-2">
              <Link href="/inbox" className="text-center p-2 bg-midnight rounded-xl text-xs text-gray-400 hover:text-gold-500 transition-colors">🧠 Brain Dump</Link>
              <Link href="/brief" className="text-center p-2 bg-midnight rounded-xl text-xs text-gray-400 hover:text-gold-500 transition-colors">📋 Daily Brief</Link>
              <Link href="/money" className="text-center p-2 bg-midnight rounded-xl text-xs text-gray-400 hover:text-gold-500 transition-colors">💰 Money</Link>
              <Link href="/rescue" className="text-center p-2 bg-midnight rounded-xl text-xs text-gray-400 hover:text-gold-500 transition-colors">🛡️ Rescue</Link>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION BASSE - OPPORTUNITÉS & VICTOIRES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Opportunités récentes */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm font-serif text-gold-500 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              💰 Opportunités en cours
            </h2>
            <Link href="/opportunities" className="text-xs text-gray-500 hover:text-gold-500">Voir tout →</Link>
          </div>
          {opportunities.length > 0 ? (
            <div className="space-y-3">
              {opportunities.map(opp => (
                <div key={opp.id} className="flex justify-between items-center p-2 border-b border-white/5">
                  <span className="text-ivory text-sm">{opp.title}</span>
                  <span className="text-xs text-emerald-400">{opp.estimated_value?.toLocaleString()} CFA</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm text-center py-4">Aucune opportunité en préparation</p>
          )}
        </div>

        {/* Victoires récentes */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm font-serif text-gold-500 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              🏆 Victoires récentes
            </h2>
            <Link href="/wins" className="text-xs text-gray-500 hover:text-gold-500">Voir tout →</Link>
          </div>
          {recentWins.length > 0 ? (
            <div className="space-y-2">
              {recentWins.map(win => (
                <div key={win.id} className="flex items-center gap-3 p-2 bg-midnight/30 rounded-lg">
                  <span className="text-xl">{win.celebration_emoji || "🎉"}</span>
                  <span className="text-ivory text-sm">{win.title}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm text-center py-4">Ajoute ta première victoire ✨</p>
          )}
        </div>
      </div>

      {/* DOCUMENTS EN ATTENTE */}
      {pendingDocs.length > 0 && (
        <div className="mt-6 bg-white/5 border border-white/10 rounded-2xl p-5">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm font-serif text-gold-500 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              📄 Documents en attente
            </h2>
            <Link href="/documents" className="text-xs text-gray-500 hover:text-gold-500">Voir tout →</Link>
          </div>
          <div className="flex flex-wrap gap-3">
            {pendingDocs.map(doc => (
              <span key={doc.id} className="px-3 py-1.5 bg-yellow-500/10 text-yellow-400 rounded-full text-xs">
                {doc.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Composant StatCard
function StatCard({ title, value, icon, color }: { title: string; value: string; icon: React.ReactNode; color: string }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
      <div className={`${color} mb-2`}>{icon}</div>
      <div className="text-2xl font-serif text-ivory">{value}</div>
      <div className="text-xs text-gray-500 mt-1">{title}</div>
    </div>
  );
}
