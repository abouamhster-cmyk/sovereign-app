"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useUserId } from "@/hooks/useUserId";
import LoadingSpinner from "@/components/LoadingSpinner";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Target, Plus, Trash2, Edit2, X, Calendar, 
  FolderOpen, Loader2, TrendingUp, 
  CheckCircle, Clock, AlertCircle, BarChart3,
  Sprout, Briefcase, Heart, FileText, Globe,
  Lightbulb, Activity, Pause, Users, Download,
  Building2, Star, Filter, LayoutGrid, User
} from "lucide-react";
import Link from "next/link";
import { exportMissionsToPDF } from "@/lib/exportPDF";
import { toast } from "sonner";

type Mission = {
  id: string;
  name: string;
  category: "business" | "family" | "personal" | "relocation" | "farm" | "content" | "documents";
  status: "idea" | "planning" | "active" | "waiting" | "paused" | "complete";
  priority: "critical" | "high" | "normal" | "low";
  revenue_potential: number;
  strategic_value: number;
  energy_cost: number;
  deadline: string | null;
  owner: string | null;
  created_at: string;
};

const categoryConfig: Record<string, { label: string; color: string; icon: any }> = {
  business: { label: "Business", color: "bg-blue-500/20 text-blue-400", icon: Briefcase },
  farm: { label: "Ferme", color: "bg-green-500/20 text-green-400", icon: Sprout },
  family: { label: "Famille", color: "bg-pink-500/20 text-pink-400", icon: Heart },
  personal: { label: "Personnel", color: "bg-purple-500/20 text-purple-400", icon: User },
  relocation: { label: "Relocalisation", color: "bg-orange-500/20 text-orange-400", icon: Globe },
  content: { label: "Contenu", color: "bg-indigo-500/20 text-indigo-400", icon: FileText },
  documents: { label: "Documents", color: "bg-cyan-500/20 text-cyan-400", icon: FileText }
};

const statusConfig: Record<string, { label: string; icon: any; color: string }> = {
  idea: { label: "💡 Idée", icon: Lightbulb, color: "bg-gray-500/20 text-gray-400" },
  planning: { label: "📋 Planification", icon: Calendar, color: "bg-blue-500/20 text-blue-400" },
  active: { label: "🚀 Active", icon: Activity, color: "bg-emerald-500/20 text-emerald-400" },
  waiting: { label: "⏳ En attente", icon: Clock, color: "bg-yellow-500/20 text-yellow-400" },
  paused: { label: "⏸️ En pause", icon: Pause, color: "bg-orange-500/20 text-orange-400" },
  complete: { label: "✅ Terminée", icon: CheckCircle, color: "bg-gray-500/20 text-gray-400" }
};

const priorityConfig: Record<string, { label: string; color: string; score: number }> = {
  critical: { label: "⚠️ Critique", color: "bg-red-500/20 text-red-400", score: 5 },
  high: { label: "🔴 Haute", color: "bg-orange-500/20 text-orange-400", score: 4 },
  normal: { label: "🟡 Normale", color: "bg-blue-500/20 text-blue-400", score: 3 },
  low: { label: "🟢 Basse", color: "bg-gray-500/20 text-gray-400", score: 2 }
};

export default function MissionsBusinessPage() {
  const { userId, loading: userIdLoading } = useUserId();
  const [activeTab, setActiveTab] = useState<"missions" | "business">("missions");
  const [missions, setMissions] = useState<Mission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [businessFilterStatus, setBusinessFilterStatus] = useState<string>("all");
  
  const [formData, setFormData] = useState({
    name: "",
    category: "business" as Mission["category"],
    status: "idea" as Mission["status"],
    priority: "normal" as Mission["priority"],
    revenue_potential: 3,
    strategic_value: 3,
    energy_cost: 3,
    deadline: "",
    owner: ""
  });

  const scrollToForm = () => {
    setTimeout(() => {
      const formElement = document.getElementById('form-container');
      if (formElement) {
        formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 150);
  };

   useEffect(() => {
    if (!userId) return;
    
    const channel = supabase
      .channel('missions_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'missions', filter: `user_id=eq.${userId}` }, 
        () => fetchMissions()
      )
      .subscribe();
    
    return () => {
      channel.unsubscribe();
    };
  }, [userId]);
  
  async function fetchMissions() {
  if (!userId) return;
  
  setIsLoading(true);
  const { data } = await supabase
    .from("missions")
    .select("*")
    .eq("user_id", userId)  
    .order("created_at", { ascending: false });
  setMissions(data || []);
  setIsLoading(false);
}

  async function saveMission() {
    const data = {
      name: formData.name,
      category: formData.category,
      status: formData.status,
      priority: formData.priority,
      revenue_potential: formData.revenue_potential,
      strategic_value: formData.strategic_value,
      energy_cost: formData.energy_cost,
      deadline: formData.deadline || null,
      owner: formData.owner || null,
      user_id: userId 

    };
    
    let error;
    if (editingId) {
      const result = await supabase.from("missions").update(data).eq("id", editingId);
      error = result.error;
    } else {
      const result = await supabase.from("missions").insert(data);
      error = result.error;
    }
    
    if (!error) {
      resetForm();
      fetchMissions();
      toast.success(editingId ? "Mission modifiée" : "Mission ajoutée");
    } else {
      toast.error("Erreur: " + error.message);
    }
  }

  async function deleteMission(id: string) {
    if (confirm("Supprimer cette mission ?")) {
      const { error } = await supabase.from("missions").delete().eq("id", id);
      if (!error) {
        fetchMissions();
        toast.success("Mission supprimée");
      }
    }
  }

  function editMission(mission: Mission) {
    setFormData({
      name: mission.name,
      category: mission.category,
      status: mission.status,
      priority: mission.priority,
      revenue_potential: mission.revenue_potential,
      strategic_value: mission.strategic_value,
      energy_cost: mission.energy_cost,
      deadline: mission.deadline || "",
      owner: mission.owner || ""
    });
    setEditingId(mission.id);
    setShowForm(true);
    scrollToForm();
  }

  function resetForm() {
    setShowForm(false);
    setEditingId(null);
    setFormData({
      name: "",
      category: "business",
      status: "idea",
      priority: "normal",
      revenue_potential: 3,
      strategic_value: 3,
      energy_cost: 3,
      deadline: "",
      owner: ""
    });
  }

  function getPriorityScore(mission: Mission) {
    const priorityScoreMap: Record<string, number> = {
      critical: 5,
      high: 4,
      normal: 3,
      low: 2
    };
    const priorityScore = priorityScoreMap[mission.priority] || 3;
    return mission.revenue_potential + mission.strategic_value + priorityScore - mission.energy_cost;
  }

  // Filtres pour l'onglet Missions
  const filteredMissions = missions.filter(m => {
    if (filterCategory !== "all" && m.category !== filterCategory) return false;
    if (filterStatus !== "all" && m.status !== filterStatus) return false;
    return true;
  });

  const sortedMissions = [...filteredMissions].sort((a, b) => getPriorityScore(b) - getPriorityScore(a));

  // Filtres pour l'onglet Business (corrigé - suppression de "in_progress")
  const businessFilteredMissions = missions.filter(m => {
    if (businessFilterStatus === "all") return true;
    if (businessFilterStatus === "active") return m.status === "active";
    if (businessFilterStatus === "planning") return m.status === "planning";
    if (businessFilterStatus === "complete") return m.status === "complete";
    return true;
  });

  const stats = {
    total: missions.length,
    active: missions.filter(m => m.status === "active").length,
    complete: missions.filter(m => m.status === "complete").length,
    critical: missions.filter(m => m.priority === "critical").length
  };

  const businessStats = {
    total: missions.length,
    active: missions.filter(m => m.status === "active").length,
    completed: missions.filter(m => m.status === "complete").length,
    planning: missions.filter(m => m.status === "planning").length,
  };

  const completionRate = stats.total > 0 ? ((stats.complete / stats.total) * 100).toFixed(0) : "0";
  const businessCompletionRate = businessStats.total > 0 ? ((businessStats.completed / businessStats.total) * 100).toFixed(0) : "0";

  const getStatusConfig = (status: string) => {
    const name = status?.toLowerCase() || "";
    if (name.includes("term") || name.includes("fait") || name.includes("done") || name === "complete") 
      return { icon: CheckCircle, label: "Terminée", color: "bg-emerald-500/20 text-emerald-400" };
    if (name.includes("cours") || name.includes("progress") || name === "active") 
      return { icon: Clock, label: "En cours", color: "bg-blue-500/20 text-blue-400" };
    if (name === "planning") 
      return { icon: Calendar, label: "Planification", color: "bg-purple-500/20 text-purple-400" };
    if (name === "waiting") 
      return { icon: Clock, label: "En attente", color: "bg-yellow-500/20 text-yellow-400" };
    if (name === "paused") 
      return { icon: AlertCircle, label: "En pause", color: "bg-orange-500/20 text-orange-400" };
    return { icon: AlertCircle, label: status || "Planifiée", color: "bg-yellow-500/20 text-yellow-400" };
  };

  const getPriorityColorBusiness = (priority: string) => {
    const name = priority?.toLowerCase() || "";
    if (name === "critical") return { color: "border-l-red-500", label: "⚠️ Critique", bg: "bg-red-500/20 text-red-400" };
    if (name === "high") return { color: "border-l-orange-500", label: "🔴 Haute", bg: "bg-orange-500/20 text-orange-400" };
    if (name === "normal") return { color: "border-l-gold-500", label: "🟡 Normale", bg: "bg-gold-500/20 text-gold-400" };
    return { color: "border-l-gray-500", label: "🟢 Basse", bg: "bg-gray-500/20 text-gray-400" };
  };

  const getCategoryIcon = (category: string) => {
    const name = category?.toLowerCase() || "";
    if (name === "business") return <Briefcase className="w-4 h-4" />;
    if (name === "farm") return <Sprout className="w-4 h-4" />;
    if (name === "relocation") return <Globe className="w-4 h-4" />;
    if (name === "content") return <FileText className="w-4 h-4" />;
    if (name === "documents") return <FileText className="w-4 h-4" />;
    return <Target className="w-4 h-4" />;
  };


    if (userIdLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-gold-500 animate-spin" />
      </div>
    );
  }
  
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
        <Loader2 className="w-8 h-8 text-gold-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-y-auto bg-midnight p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto w-full">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Target className="w-8 h-8 text-gold-500" />
              <Briefcase className="w-8 h-8 text-blue-400" />
              <h1 className="text-3xl md:text-4xl font-serif text-gold-500 tracking-tight">
                Missions & Business
              </h1>
            </div>
            <p className="text-gray-500 text-sm">
              Gestion stratégique des projets et pilotage business
            </p>
          </div>
          <button
            onClick={() => exportMissionsToPDF(filteredMissions)}
            className="bg-white/10 p-2 rounded-full hover:bg-white/20 transition-colors"
            title="Exporter les missions en PDF"
          >
            <Download className="w-5 h-5 text-gold-500" />
          </button>
        </div>

        {/* Bloc Becks */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-3">
            <Briefcase className="w-5 h-5 text-blue-400" />
            <div>
              <p className="text-sm text-blue-400 font-medium">Becks - Pilotage</p>
              <p className="text-sm text-ivory">
                🎯 {stats.active} mission(s) active(s) • 📊 {stats.complete} terminée(s) • ⚡ {stats.critical} critique(s)
              </p>
            </div>
          </div>
        </div>

        {/* TABS */}
        <div className="flex flex-wrap gap-2 border-b border-white/10 mb-6 overflow-x-auto pb-2">
          <button
            onClick={() => setActiveTab("missions")}
            className={`px-4 py-2 text-sm flex items-center gap-2 transition-colors rounded-lg ${
              activeTab === "missions" ? "bg-gold-500/20 text-gold-500" : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <LayoutGrid className="w-4 h-4" /> Missions
          </button>
          <button
            onClick={() => setActiveTab("business")}
            className={`px-4 py-2 text-sm flex items-center gap-2 transition-colors rounded-lg ${
              activeTab === "business" ? "bg-gold-500/20 text-gold-500" : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Briefcase className="w-4 h-4" /> Business
          </button>
        </div>

        {/* ==================== ONGLET MISSIONS ==================== */}
        {activeTab === "missions" && (
          <div>
            {/* STATS */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                <div className="text-2xl font-serif text-ivory">{stats.total}</div>
                <div className="text-xs text-gray-500">Total missions</div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                <div className="text-2xl font-serif text-emerald-400">{stats.active}</div>
                <div className="text-xs text-gray-500">Actives</div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                <div className="text-2xl font-serif text-gray-400">{stats.complete}</div>
                <div className="text-xs text-gray-500">Terminées</div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                <div className="text-2xl font-serif text-red-400">{stats.critical}</div>
                <div className="text-xs text-gray-500">Critiques</div>
              </div>
            </div>

            {/* BARRE DE PROGRESSION */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-400">Progression globale</span>
                <span className="text-sm text-gold-500">{completionRate}%</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-2">
                <div className="bg-gold-500 h-2 rounded-full transition-all duration-500" style={{ width: `${completionRate}%` }} />
              </div>
            </div>

            {/* FILTRES */}
            <div className="flex flex-wrap gap-3 mb-6">
              <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm">
                <option value="all">📁 Toutes les catégories</option>
                {Object.entries(categoryConfig).map(([key, conf]) => <option key={key} value={key}>{conf.label}</option>)}
              </select>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm">
                <option value="all">📋 Tous les statuts</option>
                {Object.entries(statusConfig).map(([key, conf]) => <option key={key} value={key}>{conf.label}</option>)}
              </select>
              <button onClick={() => { setShowForm(true); setEditingId(null); scrollToForm(); }} className="bg-gold-500 text-midnight px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2">
                <Plus className="w-4 h-4" /> Nouvelle mission
              </button>
            </div>

            {/* FORMULAIRE */}
            <AnimatePresence>
              {showForm && (
                <motion.div id="form-container" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 mb-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-serif text-ivory">{editingId ? "Modifier" : "Nouvelle"} mission</h3>
                    <button onClick={resetForm} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="text" placeholder="Nom de la mission" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-ivory md:col-span-2" />
                    <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value as Mission["category"] })} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-ivory">
                      {Object.entries(categoryConfig).map(([key, conf]) => <option key={key} value={key}>{conf.label}</option>)}
                    </select>
                    <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value as Mission["status"] })} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-ivory">
                      {Object.entries(statusConfig).map(([key, conf]) => <option key={key} value={key}>{conf.label}</option>)}
                    </select>
                    <select value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: e.target.value as Mission["priority"] })} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-ivory">
                      {Object.entries(priorityConfig).map(([key, conf]) => <option key={key} value={key}>{conf.label}</option>)}
                    </select>
                    <input type="date" value={formData.deadline} onChange={(e) => setFormData({ ...formData, deadline: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-ivory" />
                    <input type="text" placeholder="Propriétaire" value={formData.owner} onChange={(e) => setFormData({ ...formData, owner: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-ivory" />
                  </div>
                  <div className="flex gap-3 mt-6">
                    <button onClick={saveMission} className="bg-gold-500 text-midnight px-6 py-2 rounded-full font-medium hover:bg-gold-400 transition-colors">
                      {editingId ? "Mettre à jour" : "Enregistrer"}
                    </button>
                    <button onClick={resetForm} className="bg-white/10 px-6 py-2 rounded-full hover:bg-white/20 transition-colors">Annuler</button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* LISTE DES MISSIONS */}
            <div className="space-y-3">
              {sortedMissions.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Target className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p>Aucune mission</p>
                  <p className="text-sm mt-2">Crée ta première mission</p>
                </div>
              ) : (
                sortedMissions.map((mission) => {
                  const categoryData = categoryConfig[mission.category] || { label: mission.category || "Autre", icon: Target, color: "bg-gray-500/20 text-gray-400" };
                  const CategoryIcon = categoryData.icon;
                  const statusData = statusConfig[mission.status] || { label: mission.status || "En cours", icon: Clock, color: "bg-gray-500/20 text-gray-400" };
                  const StatusIcon = statusData.icon;
                  const priorityData = priorityConfig[mission.priority] || { label: "Normale", color: "bg-blue-500/20 text-blue-400", score: 3 };
                  
                  return (
                    <motion.div key={mission.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="bg-white/5 border border-white/10 rounded-xl p-5 hover:bg-white/10 transition-colors">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 flex-wrap mb-2">
                            <h3 className="text-ivory font-medium text-lg">{mission.name}</h3>
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs ${priorityData.color}`}>{priorityData.label}</span>
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs ${categoryData.color}`}><CategoryIcon className="w-3 h-3" /> {categoryData.label}</span>
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs ${statusData.color}`}><StatusIcon className="w-3 h-3" /> {statusData.label}</span>
                          </div>
                          <div className="flex flex-wrap gap-4 text-xs text-gray-500 mt-2">
                            {mission.deadline && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Échéance: {new Date(mission.deadline).toLocaleDateString('fr-FR')}</span>}
                            {mission.owner && <span className="flex items-center gap-1"><Users className="w-3 h-3" /> Owner: {mission.owner}</span>}
                            <span className="flex items-center gap-1"><BarChart3 className="w-3 h-3" /> Score: {getPriorityScore(mission)}</span>
                          </div>
                          <div className="mt-3 w-full bg-white/10 rounded-full h-1">
                            <div className="bg-gold-500 h-1 rounded-full" style={{ width: `${Math.min(100, (getPriorityScore(mission) / 20) * 100)}%` }} />
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <button onClick={() => editMission(mission)} className="text-gray-500 hover:text-gold-500"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => deleteMission(mission.id)} className="text-gray-500 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ==================== ONGLET BUSINESS ==================== */}
        {activeTab === "business" && (
          <div>
            {/* STATS BUSINESS */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                <div className="text-2xl font-serif text-ivory">{businessStats.total}</div>
                <div className="text-xs text-gray-500">Total missions</div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                <div className="text-2xl font-serif text-blue-400">{businessStats.active}</div>
                <div className="text-xs text-gray-500">En cours</div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                <div className="text-2xl font-serif text-emerald-400">{businessStats.completed}</div>
                <div className="text-xs text-gray-500">Terminées</div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                <div className="text-2xl font-serif text-purple-400">{businessStats.planning}</div>
                <div className="text-xs text-gray-500">Planifiées</div>
              </div>
            </div>

            {/* BARRE DE PROGRESSION BUSINESS */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-400">Progression globale</span>
                <span className="text-sm text-gold-500">{businessCompletionRate}%</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-2">
                <div className="bg-gold-500 h-2 rounded-full transition-all duration-500" style={{ width: `${businessCompletionRate}%` }} />
              </div>
              <div className="flex justify-between mt-3 text-xs">
                <span className="text-emerald-400">{businessStats.completed} terminée(s)</span>
                <span className="text-blue-400">{businessStats.active} en cours</span>
                <span className="text-purple-400">{businessStats.planning} planifiée(s)</span>
              </div>
            </div>

            {/* FILTRES BUSINESS */}
            <div className="flex flex-wrap gap-3 mb-6">
              <button onClick={() => setBusinessFilterStatus("all")} className={`px-4 py-2 rounded-full text-sm transition-all ${businessFilterStatus === "all" ? "bg-gold-500 text-midnight" : "bg-white/5 text-gray-400 hover:bg-white/10"}`}>📋 Toutes</button>
              <button onClick={() => setBusinessFilterStatus("active")} className={`px-4 py-2 rounded-full text-sm transition-all ${businessFilterStatus === "active" ? "bg-blue-500 text-white" : "bg-white/5 text-gray-400 hover:bg-white/10"}`}>🔄 En cours</button>
              <button onClick={() => setBusinessFilterStatus("planning")} className={`px-4 py-2 rounded-full text-sm transition-all ${businessFilterStatus === "planning" ? "bg-purple-500 text-white" : "bg-white/5 text-gray-400 hover:bg-white/10"}`}>📅 Planifiées</button>
              <button onClick={() => setBusinessFilterStatus("complete")} className={`px-4 py-2 rounded-full text-sm transition-all ${businessFilterStatus === "complete" ? "bg-emerald-500 text-white" : "bg-white/5 text-gray-400 hover:bg-white/10"}`}>✅ Terminées</button>
            </div>

            {/* LISTE BUSINESS */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h2 className="text-xl font-serif text-ivory mb-6 flex items-center gap-3">
                <Target className="w-5 h-5 text-gold-500" />
                Projets Stratégiques
              </h2>
              
              {businessFilteredMissions.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Building2 className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p>Aucune mission enregistrée</p>
                  <button onClick={() => { setActiveTab("missions"); setShowForm(true); }} className="text-gold-500 text-sm mt-2 inline-block hover:underline">Créer une mission →</button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {businessFilteredMissions.map((mission) => {
                    const statusConf = getStatusConfig(mission.status);
                    const StatusIcon = statusConf.icon;
                    const priorityConf = getPriorityColorBusiness(mission.priority);
                    
                    return (
                      <motion.div key={mission.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className={`group p-5 bg-midnight rounded-2xl border border-white/5 border-l-4 ${priorityConf.color} hover:border-gold-500/30 transition-all`}>
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-4">
                            <div className="p-2 bg-white/5 rounded-xl"><Building2 className="text-gold-500 w-5 h-5" /></div>
                            <div>
                              <h3 className="text-ivory font-bold text-lg">{mission.name}</h3>
                              <div className="flex flex-wrap items-center gap-3 mt-2">
                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs border ${statusConf.color}`}><StatusIcon className="w-3 h-3" /> {statusConf.label}</span>
                                {mission.deadline && <span className="text-xs text-gray-500 flex items-center gap-1"><Calendar className="w-3 h-3" /> Échéance: {new Date(mission.deadline).toLocaleDateString('fr-FR')}</span>}
                                {mission.owner && <span className="text-xs text-gray-500 flex items-center gap-1">👤 {mission.owner}</span>}
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${priorityConf.bg}`}>{priorityConf.label}</span>
                              </div>
                              {mission.revenue_potential > 0 && (
                                <div className="flex items-center gap-4 mt-3">
                                  <div className="flex items-center gap-1"><TrendingUp className="w-3 h-3 text-emerald-400" /><span className="text-xs text-gray-400">Potentiel: {mission.revenue_potential}/5</span></div>
                                  <div className="flex items-center gap-1"><Star className="w-3 h-3 text-gold-400" /><span className="text-xs text-gray-400">Stratégique: {mission.strategic_value}/5</span></div>
                                </div>
                              )}
                            </div>
                          </div>
                          <button onClick={() => editMission(mission)} className="opacity-0 group-hover:opacity-100 transition-opacity p-2 text-gray-500 hover:text-gold-500"><Edit2 className="w-4 h-4" /></button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* CONSEIL STRATÉGIQUE */}
            <div className="mt-6 p-5 bg-gradient-to-r from-gold-500/10 to-transparent rounded-2xl border border-gold-500/20">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-5 h-5 text-gold-500" />
                <div>
                  <p className="text-xs text-gold-500 uppercase tracking-wider">Vision Sovereign</p>
                  <p className="text-ivory text-sm mt-1">Priorise les missions à fort impact. Une à la fois.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
