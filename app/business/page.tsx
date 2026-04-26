"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";
import { 
  Building2, Target, CheckCircle, Clock, AlertCircle, 
  TrendingUp, Calendar, Zap, Plus, Edit2, Trash2,
  Briefcase, Filter, Star, Sprout, Globe, Megaphone, FileText
} from "lucide-react";
import Link from "next/link";

type Mission = {
  id: string;
  name: string;
  category: string;
  status: string;
  priority: string;
  deadline: string | null;
  owner: string | null;
  revenue_potential: number;
  strategic_value: number;
  created_at: string;
};

export default function BusinessPage() {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");

useEffect(() => {
  fetchMissions();
  
  const channel = supabase
    .channel('missions_business')
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

  const getStatusConfig = (status: string) => {
    const name = status?.toLowerCase() || "";
    if (name.includes("term") || name.includes("fait") || name.includes("done") || name === "complete") 
      return { icon: CheckCircle, label: "Terminée", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" };
    if (name.includes("cours") || name.includes("progress") || name === "active" || name === "in_progress") 
      return { icon: Clock, label: "En cours", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" };
    if (name === "planning") 
      return { icon: Calendar, label: "Planification", color: "bg-purple-500/20 text-purple-400 border-purple-500/30" };
    if (name === "waiting") 
      return { icon: Clock, label: "En attente", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" };
    if (name === "paused") 
      return { icon: AlertCircle, label: "En pause", color: "bg-orange-500/20 text-orange-400 border-orange-500/30" };
    return { icon: AlertCircle, label: status || "Planifiée", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" };
  };

  const getPriorityColor = (priority: string) => {
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
    if (name === "content") return <Megaphone className="w-4 h-4" />;
    if (name === "documents") return <FileText className="w-4 h-4" />;
    return <Target className="w-4 h-4" />;
  };

  const filteredMissions = missions.filter(m => {
    if (filterStatus === "all") return true;
    if (filterStatus === "active") return m.status === "active" || m.status === "in_progress";
    if (filterStatus === "planning") return m.status === "planning";
    if (filterStatus === "complete") return m.status === "complete";
    return true;
  });

  const stats = {
    total: missions.length,
    active: missions.filter(m => m.status === "active" || m.status === "in_progress").length,
    completed: missions.filter(m => m.status === "complete").length,
    planning: missions.filter(m => m.status === "planning").length,
  };

  const completionRate = stats.total > 0 ? ((stats.completed / stats.total) * 100).toFixed(0) : "0";

  return (
    <div className="p-8 lg:p-12 h-full flex flex-col overflow-y-auto bg-midnight">
      <header className="mb-8">
        <div className="flex justify-between items-start">
          <div>
            <motion.h1 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl font-serif text-gold-500 tracking-tight"
            >
              Business Command
            </motion.h1>
            <p className="text-gray-500 mt-2 italic font-light">Pilotage stratégique et suivi des missions</p>
          </div>
          <Link 
            href="/missions" 
            className="bg-gold-500/20 text-gold-500 px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 hover:bg-gold-500/30 transition-colors"
          >
            <Plus className="w-4 h-4" /> Gérer les missions
          </Link>
        </div>
      </header>

      {/* STATISTIQUES */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
          <div className="text-2xl font-serif text-ivory">{stats.total}</div>
          <div className="text-xs text-gray-500 uppercase tracking-wider mt-1">Total missions</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
          <div className="text-2xl font-serif text-blue-400">{stats.active}</div>
          <div className="text-xs text-gray-500 uppercase tracking-wider mt-1">En cours</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
          <div className="text-2xl font-serif text-emerald-400">{stats.completed}</div>
          <div className="text-xs text-gray-500 uppercase tracking-wider mt-1">Terminées</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
          <div className="text-2xl font-serif text-purple-400">{stats.planning}</div>
          <div className="text-xs text-gray-500 uppercase tracking-wider mt-1">Planifiées</div>
        </div>
      </div>

      {/* BARRE DE PROGRESSION GLOBALE */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-8">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-400">Progression globale</span>
          <span className="text-sm text-gold-500">{completionRate}%</span>
        </div>
        <div className="w-full bg-white/10 rounded-full h-2">
          <div 
            className="bg-gold-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${completionRate}%` }}
          />
        </div>
        <div className="flex justify-between mt-3 text-xs">
          <span className="text-emerald-400">{stats.completed} terminée(s)</span>
          <span className="text-blue-400">{stats.active} en cours</span>
          <span className="text-purple-400">{stats.planning} planifiée(s)</span>
        </div>
      </div>

      {/* FILTRES */}
      <div className="flex flex-wrap gap-3 mb-6">
        <button
          onClick={() => setFilterStatus("all")}
          className={`px-4 py-2 rounded-full text-sm transition-all ${filterStatus === "all" ? "bg-gold-500 text-midnight" : "bg-white/5 text-gray-400 hover:bg-white/10"}`}
        >
          📋 Toutes
        </button>
        <button
          onClick={() => setFilterStatus("active")}
          className={`px-4 py-2 rounded-full text-sm transition-all ${filterStatus === "active" ? "bg-blue-500 text-white" : "bg-white/5 text-gray-400 hover:bg-white/10"}`}
        >
          🔄 En cours
        </button>
        <button
          onClick={() => setFilterStatus("planning")}
          className={`px-4 py-2 rounded-full text-sm transition-all ${filterStatus === "planning" ? "bg-purple-500 text-white" : "bg-white/5 text-gray-400 hover:bg-white/10"}`}
        >
          📅 Planifiées
        </button>
        <button
          onClick={() => setFilterStatus("complete")}
          className={`px-4 py-2 rounded-full text-sm transition-all ${filterStatus === "complete" ? "bg-emerald-500 text-white" : "bg-white/5 text-gray-400 hover:bg-white/10"}`}
        >
          ✅ Terminées
        </button>
      </div>

      {/* LISTE DES MISSIONS */}
      <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-md">
        <h2 className="text-xl font-serif text-ivory mb-6 flex items-center gap-3">
          <Target className="w-5 h-5 text-gold-500" />
          Vos Projets Stratégiques
        </h2>
        
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse h-24 bg-white/5 rounded-2xl" />
            ))}
          </div>
        ) : filteredMissions.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {filteredMissions.map((mission) => {
              const statusConfig = getStatusConfig(mission.status);
              const StatusIcon = statusConfig.icon;
              const priorityConfig = getPriorityColor(mission.priority);
              
              return (
                <motion.div 
                  key={mission.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`group p-5 bg-midnight rounded-2xl border border-white/5 border-l-4 ${priorityConfig.color} hover:border-gold-500/30 transition-all`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="p-2 bg-white/5 rounded-xl">
                        <Building2 className="text-gold-500 w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-ivory font-bold text-lg">{mission.name}</h3>
                        <div className="flex flex-wrap items-center gap-3 mt-2">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs border ${statusConfig.color}`}>
                            <StatusIcon className="w-3 h-3" />
                            {statusConfig.label}
                          </span>
                          {mission.deadline && (
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Échéance: {new Date(mission.deadline).toLocaleDateString('fr-FR')}
                            </span>
                          )}
                          {mission.owner && (
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                              👤 {mission.owner}
                            </span>
                          )}
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${priorityConfig.bg}`}>
                            {priorityConfig.label}
                          </span>
                        </div>
                        {mission.revenue_potential > 0 && (
                          <div className="flex items-center gap-4 mt-3">
                            <div className="flex items-center gap-1">
                              <TrendingUp className="w-3 h-3 text-emerald-400" />
                              <span className="text-xs text-gray-400">Potentiel revenu: {mission.revenue_potential}/5</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Star className="w-3 h-3 text-gold-400" />
                              <span className="text-xs text-gray-400">Valeur stratégique: {mission.strategic_value}/5</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <Link 
                      href={`/missions?edit=${mission.id}`}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-2 text-gray-500 hover:text-gold-500"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Link>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <Building2 className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p>Aucune mission enregistrée</p>
            <Link href="/missions" className="text-gold-500 text-sm mt-2 inline-block hover:underline">
              Crée ta première mission →
            </Link>
          </div>
        )}
      </div>

      {/* CONSEIL STRATÉGIQUE */}
      <div className="mt-8 p-5 bg-gradient-to-r from-gold-500/10 to-transparent rounded-2xl border border-gold-500/20">
        <div className="flex items-center gap-3">
          <TrendingUp className="w-5 h-5 text-gold-500" />
          <div>
            <p className="text-xs text-gold-500 uppercase tracking-wider">Vision Sovereign</p>
            <p className="text-ivory text-sm mt-1">Priorise les missions à fort impact. Une à la fois.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
