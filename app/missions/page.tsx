"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Target, Plus, Trash2, Edit2, X, Calendar, 
  Flag, FolderOpen, Loader2, TrendingUp, Battery,
  CheckCircle, Clock, AlertCircle, BarChart3,
  Sprout, Briefcase, Heart, Globe, FileText, 
  Lightbulb, Activity, Pause, Users, User
} from "lucide-react";
import Link from "next/link";

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

const categoryConfig = {
  business: { label: "Business", color: "bg-blue-500/20 text-blue-400", icon: Briefcase },
  farm: { label: "Ferme", color: "bg-green-500/20 text-green-400", icon: Sprout },
  family: { label: "Famille", color: "bg-pink-500/20 text-pink-400", icon: Heart },
  personal: { label: "Personnel", color: "bg-purple-500/20 text-purple-400", icon: User },
  relocation: { label: "Relocalisation", color: "bg-orange-500/20 text-orange-400", icon: Globe },
  content: { label: "Contenu", color: "bg-indigo-500/20 text-indigo-400", icon: FileText },
  documents: { label: "Documents", color: "bg-cyan-500/20 text-cyan-400", icon: FileText }
};

const statusConfig = {
  idea: { label: "Idée", icon: Lightbulb, color: "bg-gray-500/20 text-gray-400" },
  planning: { label: "Planification", icon: Calendar, color: "bg-blue-500/20 text-blue-400" },
  active: { label: "Active", icon: Activity, color: "bg-emerald-500/20 text-emerald-400" },
  waiting: { label: "En attente", icon: Clock, color: "bg-yellow-500/20 text-yellow-400" },
  paused: { label: "En pause", icon: Pause, color: "bg-orange-500/20 text-orange-400" },
  complete: { label: "Terminée", icon: CheckCircle, color: "bg-gray-500/20 text-gray-400" }
};

const priorityConfig = {
  critical: { label: "Critique", color: "bg-red-500/20 text-red-400", score: 5 },
  high: { label: "Haute", color: "bg-orange-500/20 text-orange-400", score: 4 },
  normal: { label: "Normale", color: "bg-blue-500/20 text-blue-400", score: 3 },
  low: { label: "Basse", color: "bg-gray-500/20 text-gray-400", score: 2 }
};

export default function MissionsPage() {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  
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
  fetchMissions();
  
  const channel = supabase
    .channel('missions_changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'missions' }, () => fetchMissions())
    .subscribe();
  
  return () => {
    channel.unsubscribe();
  };
}, []);
  
  async function fetchMissions() {
    setIsLoading(true);
    const { data } = await supabase
      .from("missions")
      .select("*")
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
      owner: formData.owner || null
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
    } else {
      alert("Erreur: " + error.message);
    }
  }

  async function deleteMission(id: string) {
    if (confirm("Supprimer cette mission ?")) {
      const { error } = await supabase.from("missions").delete().eq("id", id);
      if (!error) fetchMissions();
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
    const priorityScore = mission.priority === "critical" ? 5 : mission.priority === "high" ? 4 : mission.priority === "normal" ? 3 : 2;
    return mission.revenue_potential + mission.strategic_value + priorityScore - mission.energy_cost;
  }

  const filteredMissions = missions.filter(m => {
    if (filterCategory !== "all" && m.category !== filterCategory) return false;
    if (filterStatus !== "all" && m.status !== filterStatus) return false;
    return true;
  });

  const sortedMissions = [...filteredMissions].sort((a, b) => getPriorityScore(b) - getPriorityScore(a));

  const stats = {
    total: missions.length,
    active: missions.filter(m => m.status === "active").length,
    complete: missions.filter(m => m.status === "complete").length,
    critical: missions.filter(m => m.priority === "critical").length
  };

  const completionRate = stats.total > 0 ? ((stats.complete / stats.total) * 100).toFixed(0) : "0";

  return (
    <div className="p-6 lg:p-10 h-full flex flex-col overflow-y-auto bg-midnight">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-serif text-gold-500 tracking-tight">Missions Command</h1>
          <p className="text-gray-500 text-sm mt-1">Gestion stratégique des projets</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditingId(null); scrollToForm(); }}
          className="bg-gold-500 text-midnight px-5 py-2 rounded-full text-sm font-medium flex items-center gap-2 hover:bg-gold-400 transition-colors"
        >
          <Plus className="w-4 h-4" /> Nouvelle mission
        </button>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
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
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-8">
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
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-gold-500"
        >
          <option value="all">📁 Toutes les catégories</option>
          {Object.entries(categoryConfig).map(([key, conf]) => (
            <option key={key} value={key}>{conf.label}</option>
          ))}
        </select>
        
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-gold-500"
        >
          <option value="all">📋 Tous les statuts</option>
          {Object.entries(statusConfig).map(([key, conf]) => (
            <option key={key} value={key}>{conf.label}</option>
          ))}
        </select>
      </div>

      {/* FORMULAIRE */}
      <AnimatePresence>
        {showForm && (
          <motion.div id="form-container" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 mb-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-serif text-ivory">{editingId ? "Modifier" : "Nouvelle"} mission</h3>
              <button onClick={resetForm} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Nom de la mission"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-gold-500 text-ivory md:col-span-2"
              />
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as Mission["category"] })}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-gold-500 text-ivory"
              >
                {Object.entries(categoryConfig).map(([key, conf]) => <option key={key} value={key}>{conf.label}</option>)}
              </select>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as Mission["status"] })}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-gold-500 text-ivory"
              >
                {Object.entries(statusConfig).map(([key, conf]) => <option key={key} value={key}>{conf.label}</option>)}
              </select>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as Mission["priority"] })}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-gold-500 text-ivory"
              >
                {Object.entries(priorityConfig).map(([key, conf]) => <option key={key} value={key}>{conf.label}</option>)}
              </select>
              <input
                type="date"
                value={formData.deadline}
                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-gold-500 text-ivory"
              />
              <input
                type="text"
                placeholder="Propriétaire (ex: Rebecca, Odile)"
                value={formData.owner}
                onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-gold-500 text-ivory"
              />
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
        {isLoading ? (
          <div className="text-center py-12 text-gray-500">Chargement...</div>
        ) : sortedMissions.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Target className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p>Aucune mission</p>
            <p className="text-sm mt-2">Crée ta première mission</p>
          </div>
        ) : (
          sortedMissions.map((mission) => {
            const StatusIcon = statusConfig[mission.status].icon;
            const priorityConfigData = priorityConfig[mission.priority];
            const CategoryIcon = categoryConfig[mission.category].icon;
            
            return (
              <motion.div
                key={mission.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white/5 border border-white/10 rounded-xl p-5 hover:bg-white/10 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 flex-wrap mb-2">
                      <h3 className="text-ivory font-medium text-lg">{mission.name}</h3>
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs ${priorityConfigData.color}`}>
                        {priorityConfigData.label}
                      </span>
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs ${categoryConfig[mission.category].color}`}>
                        <CategoryIcon className="w-3 h-3" />
                        {categoryConfig[mission.category].label}
                      </span>
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs ${statusConfig[mission.status].color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {statusConfig[mission.status].label}
                      </span>
                    </div>
                    
                    <div className="flex flex-wrap gap-4 text-xs text-gray-500 mt-2">
                      {mission.deadline && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> Échéance: {new Date(mission.deadline).toLocaleDateString('fr-FR')}
                        </span>
                      )}
                      {mission.owner && (
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" /> Owner: {mission.owner}</span>
                      )}
                      <span className="flex items-center gap-1">
                        <BarChart3 className="w-3 h-3" /> Score: {getPriorityScore(mission)}
                      </span>
                    </div>
                    
                    <div className="mt-3 w-full bg-white/10 rounded-full h-1">
                      <div className="bg-gold-500 h-1 rounded-full" style={{ width: `${Math.min(100, (getPriorityScore(mission) / 20) * 100)}%` }} />
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    <button onClick={() => editMission(mission)} className="text-gray-500 hover:text-gold-500">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => deleteMission(mission.id)} className="text-gray-500 hover:text-red-400">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
