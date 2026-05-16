"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useUserId } from "@/hooks/useUserId";
import { motion } from "framer-motion";
import LoadingSpinner from "@/components/LoadingSpinner";
import Link from "next/link";
import { 
  Trophy, Target, Calendar, DollarSign, FileText, 
  CheckCircle, Clock, AlertCircle, Plus, TrendingUp,
  Building2, Users, Mail, Phone, Edit2, Trash2, X,
  Check, ChevronRight, Sparkles
} from "lucide-react";
import { toast } from "sonner";

const API_URL = "https://sovereign-bridge.onrender.com";

type Grant = {
  id: string;
  title: string;
  agency: string;
  amount: number;
  deadline: string;
  status: string;
  probability: number;
  notes: string;
};

type Contract = {
  id: string;
  title: string;
  contract_type: string;
  agency: string;
  status: string;
  deadline: string;
  requirements: string[];
  notes: string;
};

type ChecklistItem = {
  id: string;
  title: string;
  status: string;
  deadline: string | null;
};

export default function LoveFireSportPage() {
  const { userId, loading: userIdLoading } = useUserId();
  const [activeTab, setActiveTab] = useState<"dashboard" | "grants" | "contracts" | "checklist">("dashboard");
  const [stats, setStats] = useState<any>(null);
  const [grants, setGrants] = useState<Grant[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showGrantForm, setShowGrantForm] = useState(false);
  const [showContractForm, setShowContractForm] = useState(false);
  
  // Formulaire grant
  const [newGrant, setNewGrant] = useState({
    title: "",
    agency: "",
    amount: "",
    deadline: "",
    status: "researching",
    probability: 50,
    notes: ""
  });

  useEffect(() => {
    if (userId) {
      fetchAllData();
    }
  }, [userId]);

  async function fetchAllData() {
    setIsLoading(true);
    await Promise.all([
      fetchStats(),
      fetchGrants(),
      fetchContracts(),
      fetchChecklist()
    ]);
    setIsLoading(false);
  }

  async function fetchStats() {
    try {
      const response = await fetch(`${API_URL}/api/lf/stats?user_id=${userId}`);
      const data = await response.json();
      if (data.success) setStats(data.stats);
    } catch (error) {
      console.error("Erreur stats:", error);
    }
  }

  async function fetchGrants() {
    if (!userId) return;
    
    const { data } = await supabase
      .from("lf_grants")
      .select("*")
      .eq("user_id", userId)
      .order("deadline", { ascending: true, nullsFirst: false });
    setGrants(data || []);
  }

  async function fetchContracts() {
    if (!userId) return;
    
    const { data } = await supabase
      .from("lf_contracts")
      .select("*")
      .eq("user_id", userId)
      .order("deadline", { ascending: true, nullsFirst: false });
    setContracts(data || []);
  }

  async function fetchChecklist() {
    try {
      const response = await fetch(`${API_URL}/api/lf/checklist`);
      const data = await response.json();
      if (data.success) setChecklist(data.checklist);
    } catch (error) {
      console.error("Erreur checklist:", error);
    }
  }

  async function createGrant() {
    if (!newGrant.title || !userId) return;
    
    const { error } = await supabase
      .from("lf_grants")
      .insert({
        title: newGrant.title,
        agency: newGrant.agency,
        amount: newGrant.amount ? parseInt(newGrant.amount) : null,
        deadline: newGrant.deadline,
        status: newGrant.status,
        probability: newGrant.probability,
        notes: newGrant.notes,
        user_id: userId
      });
    
    if (!error) {
      toast.success("Grant ajouté !");
      setShowGrantForm(false);
      setNewGrant({ title: "", agency: "", amount: "", deadline: "", status: "researching", probability: 50, notes: "" });
      fetchGrants();
      fetchStats();
    } else {
      toast.error("Erreur: " + error.message);
    }
  }

  const getStatusColor = (status: string) => {
    switch(status) {
      case "researching": return "bg-blue-500/20 text-blue-400";
      case "preparing": return "bg-yellow-500/20 text-yellow-400";
      case "submitted": return "bg-purple-500/20 text-purple-400";
      case "under_review": return "bg-orange-500/20 text-orange-400";
      case "approved": return "bg-emerald-500/20 text-emerald-400";
      case "rejected": return "bg-red-500/20 text-red-400";
      default: return "bg-gray-500/20 text-gray-400";
    }
  };

  const getContractTypeIcon = (type: string) => {
    switch(type) {
      case "DDA": return "📋";
      case "eMMA": return "📱";
      case "SAM.gov": return "🏛️";
      case "county": return "🏢";
      default: return "📄";
    }
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
    <div className="p-4 md:p-6 lg:p-8 h-full flex flex-col overflow-y-auto bg-midnight">
      <div className="max-w-7xl mx-auto w-full">
        {/* HEADER */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Trophy className="w-8 h-8 text-gold-500" />
            <h1 className="text-3xl md:text-4xl font-serif text-gold-500 tracking-tight">
              Love & Fire Sport
            </h1>
          </div>
          <p className="text-gray-500 text-sm">
            Adaptive Sports — Grants, DDA, eMMA, SAM.gov, contrats publics
          </p>
        </div>

        {/* Bloc Becks - Love & Fire Sport */}
        <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-3">
            <Trophy className="w-5 h-5 text-purple-400" />
            <div>
              <p className="text-sm text-purple-400 font-medium">Becks - Love & Fire Sport</p>
              <p className="text-sm text-ivory">
                🎯 {grants.filter(g => g.status === "researching").length} grants en recherche<br/>
                📄 {grants.filter(g => g.status === "preparing").length} grants en préparation<br/>
                ⚠️ {grants.filter(g => g.deadline && new Date(g.deadline) < new Date(Date.now() + 7*24*60*60*1000)).length} deadline(s) dans les 7 jours
              </p>
            </div>
          </div>
        </div>

        {/* STATS CARDS */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
              <div className="text-2xl font-serif text-ivory">{stats.active_grants}</div>
              <div className="text-xs text-gray-500">Grants actifs</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
              <div className="text-2xl font-serif text-purple-400">{stats.submitted_grants}</div>
              <div className="text-xs text-gray-500">Soumis</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
              <div className="text-2xl font-serif text-blue-400">{stats.dda_contracts}</div>
              <div className="text-xs text-gray-500">DDA</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
              <div className="text-2xl font-serif text-red-400">{stats.urgent_tasks}</div>
              <div className="text-xs text-gray-500">Tâches urgentes</div>
            </div>
          </div>
        )}

        {/* TABS */}
        <div className="flex flex-wrap gap-2 border-b border-white/10 mb-6">
          {[
            { id: "dashboard", label: "📊 Dashboard" },
            { id: "grants", label: "💰 Grants" },
            { id: "contracts", label: "📑 Contrats" },
            { id: "checklist", label: "✅ Checklist DDA" }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-t-lg transition-all ${
                activeTab === tab.id 
                  ? "bg-gold-500/20 text-gold-500 border-b-2 border-gold-500" 
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* DASHBOARD TAB */}
        {activeTab === "dashboard" && (
          <div className="space-y-6">
            {/* Prochaines deadlines */}
            {stats?.next_deadline && (
              <div className="bg-red-950/20 border border-red-500/30 rounded-xl p-5">
                <div className="flex items-center gap-2 text-red-400 mb-2">
                  <AlertCircle className="w-5 h-5" />
                  <span className="text-sm font-medium">Prochaine deadline</span>
                </div>
                <p className="text-ivory font-medium">{stats.next_deadline_title}</p>
                <p className="text-sm text-red-400 mt-1">📅 {new Date(stats.next_deadline).toLocaleDateString('fr-FR')}</p>
              </div>
            )}

            {/* Ressources utiles */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-5">
              <h3 className="text-gold-500 text-sm mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Ressources utiles
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <a href="https://dda.health.maryland.gov" target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                  <span>DDA Maryland</span>
                  <ChevronRight className="w-4 h-4 text-gray-500" />
                </a>
                <a href="https://www.sam.gov" target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                  <span>SAM.gov</span>
                  <ChevronRight className="w-4 h-4 text-gray-500" />
                </a>
                <a href="https://emma.maryland.gov" target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                  <span>eMMA Maryland</span>
                  <ChevronRight className="w-4 h-4 text-gray-500" />
                </a>
                <a href="https://grants.gov" target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                  <span>Grants.gov</span>
                  <ChevronRight className="w-4 h-4 text-gray-500" />
                </a>
              </div>
            </div>
          </div>
        )}

        {/* GRANTS TAB */}
        {activeTab === "grants" && (
          <div>
            <div className="flex justify-end mb-4">
              <button
                onClick={() => setShowGrantForm(true)}
                className="bg-gold-500 text-midnight px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 hover:bg-gold-400 transition-colors"
              >
                <Plus className="w-4 h-4" /> Nouveau grant
              </button>
            </div>

            {/* Formulaire grant */}
            {showGrantForm && (
              <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-5 mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-gold-500 font-serif">Nouveau grant</h3>
                  <button onClick={() => setShowGrantForm(false)} className="text-gray-400 hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Nom du grant"
                    value={newGrant.title}
                    onChange={(e) => setNewGrant({ ...newGrant, title: e.target.value })}
                    className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-ivory focus:outline-none focus:border-gold-500"
                  />
                  <input
                    type="text"
                    placeholder="Agence"
                    value={newGrant.agency}
                    onChange={(e) => setNewGrant({ ...newGrant, agency: e.target.value })}
                    className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-ivory focus:outline-none focus:border-gold-500"
                  />
                  <input
                    type="number"
                    placeholder="Montant (CFA)"
                    value={newGrant.amount}
                    onChange={(e) => setNewGrant({ ...newGrant, amount: e.target.value })}
                    className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-ivory focus:outline-none focus:border-gold-500"
                  />
                  <input
                    type="date"
                    placeholder="Date limite"
                    value={newGrant.deadline}
                    onChange={(e) => setNewGrant({ ...newGrant, deadline: e.target.value })}
                    className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-ivory focus:outline-none focus:border-gold-500"
                  />
                  <select
                    value={newGrant.status}
                    onChange={(e) => setNewGrant({ ...newGrant, status: e.target.value })}
                    className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-ivory focus:outline-none focus:border-gold-500"
                  >
                    <option value="researching">🔍 En recherche</option>
                    <option value="preparing">📝 En préparation</option>
                    <option value="submitted">📤 Soumis</option>
                  </select>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-400">Probabilité: {newGrant.probability}%</span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={newGrant.probability}
                      onChange={(e) => setNewGrant({ ...newGrant, probability: parseInt(e.target.value) })}
                      className="flex-1"
                    />
                  </div>
                  <textarea
                    placeholder="Notes"
                    value={newGrant.notes}
                    onChange={(e) => setNewGrant({ ...newGrant, notes: e.target.value })}
                    className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-ivory focus:outline-none focus:border-gold-500 md:col-span-2"
                    rows={2}
                  />
                </div>
                <div className="flex gap-3 mt-4">
                  <button onClick={createGrant} className="bg-gold-500 text-midnight px-6 py-2 rounded-full font-medium">Enregistrer</button>
                  <button onClick={() => setShowGrantForm(false)} className="bg-white/10 px-6 py-2 rounded-full">Annuler</button>
                </div>
              </div>
            )}

            {/* Liste des grants */}
            <div className="space-y-3">
              {grants.length === 0 ? (
                <div className="text-center py-12 text-gray-500">Aucun grant pour le moment</div>
              ) : (
                grants.map(grant => (
                  <div key={grant.id} className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-colors">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="text-ivory font-medium">{grant.title}</h3>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <span className="text-xs text-gray-500">{grant.agency}</span>
                          {grant.amount > 0 && <span className="text-xs text-emerald-400">{grant.amount.toLocaleString()} CFA</span>}
                          <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(grant.status)}`}>
                            {grant.status === "researching" ? "🔍 Recherche" :
                             grant.status === "preparing" ? "📝 Préparation" :
                             grant.status === "submitted" ? "📤 Soumis" : grant.status}
                          </span>
                          <span className="text-xs text-gray-500">📊 {grant.probability}%</span>
                        </div>
                        {grant.deadline && (
                          <p className="text-xs text-gray-500 mt-2">📅 {new Date(grant.deadline).toLocaleDateString('fr-FR')}</p>
                        )}
                        {grant.notes && <p className="text-xs text-gray-400 mt-2">{grant.notes}</p>}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* CONTRACTS TAB */}
        {activeTab === "contracts" && (
          <div className="space-y-3">
            {contracts.length === 0 ? (
              <div className="text-center py-12 text-gray-500">Aucun contrat pour le moment</div>
            ) : (
              contracts.map(contract => (
                <div key={contract.id} className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-colors">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{getContractTypeIcon(contract.contract_type)}</span>
                        <h3 className="text-ivory font-medium">{contract.title}</h3>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <span className="text-xs text-gray-500">{contract.agency}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(contract.status)}`}>
                          {contract.status}
                        </span>
                      </div>
                      {contract.deadline && (
                        <p className="text-xs text-gray-500 mt-2">📅 {new Date(contract.deadline).toLocaleDateString('fr-FR')}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* CHECKLIST TAB */}
        {activeTab === "checklist" && (
          <div className="space-y-2">
            <div className="bg-gold-500/10 border border-gold-500/20 rounded-xl p-4 mb-4">
              <h3 className="text-gold-500 text-sm mb-2">📋 Procédure DDA / SAM.gov / eMMA</h3>
              <p className="text-xs text-gray-400">Coche les étapes au fur et à mesure de ton avancement</p>
            </div>
            
            {checklist.map((item) => (
              <div key={item.id} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center cursor-pointer ${
                  item.status === "done" ? "bg-emerald-500 border-emerald-500" : "border-gray-500"
                }`}>
                  {item.status === "done" && <Check className="w-3 h-3 text-white" />}
                </div>
                <div className="flex-1">
                  <p className={`text-sm ${item.status === "done" ? "text-gray-500 line-through" : "text-ivory"}`}>
                    {item.title}
                  </p>
                  {item.deadline && (
                    <p className="text-xs text-gray-500 mt-0.5">📅 {new Date(item.deadline).toLocaleDateString('fr-FR')}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* BOUTON CHAT FLOTTANT */}
        <Link href="/chat?mode=love-fire-sport" className="fixed bottom-6 right-6 z-40 bg-gold-500 text-midnight p-4 rounded-full shadow-lg hover:scale-105 transition-transform">
          <Sparkles className="w-6 h-6" />
        </Link>
      </div>
    </div>
  );
}
