"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import LoadingSpinner from "@/components/LoadingSpinner";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Wallet, TrendingUp, TrendingDown, Plus, Trash2, Edit2, 
  X, Check, Calendar, FolderOpen, Tag, Loader2, RefreshCw,
  Download, DollarSign, Target, Clock, AlertCircle,
  Filter, Search, Briefcase, Sparkles, Brain, LayoutGrid,
  CheckCircle, Send, Package
} from "lucide-react";
import { exportFinancialToPDF } from "@/lib/exportPDF";
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';
import { toast } from "sonner";
import Link from "next/link";

const API_URL = "https://sovereign-bridge.onrender.com";

// Enregistrer les composants Chart.js
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

// =====================================================
// TYPES
// =====================================================

type Spending = {
  id: string;
  title: string;
  amount: number;
  category: string;
  project: string;
  date: string;
  notes?: string;
  created_at: string;
};

type Revenue = {
  id: string;
  source: string;
  amount: number;
  project: string;
  date: string;
  notes?: string;
  created_at: string;
};

type Opportunity = {
  id: string;
  title: string;
  type: "client" | "grant" | "contract" | "investor" | "partnership" | "product" | "content" | "other";
  mission_id: string | null;
  estimated_value: number;
  stage: "idea" | "researching" | "preparing" | "submitted" | "follow_up" | "won" | "lost";
  deadline: string | null;
  probability: "low" | "medium" | "high";
  next_action: string | null;
  notes: string | null;
  created_at: string;
};

type Mission = {
  id: string;
  name: string;
};

// =====================================================
// CONFIGURATIONS
// =====================================================

const projects = [
  "Ifè Farm",
  "Santé Plus",
  "Love & Fire",
  "Famille",
  "Personnel",
  "Bénin Relocation"
];

const categories = [
  { value: "materials", label: "Matériaux", color: "bg-blue-500/20 text-blue-400" },
  { value: "construction", label: "Construction", color: "bg-orange-500/20 text-orange-400" },
  { value: "labor", label: "Main d'œuvre", color: "bg-purple-500/20 text-purple-400" },
  { value: "livestock", label: "Élevage", color: "bg-emerald-500/20 text-emerald-400" },
  { value: "crops", label: "Cultures", color: "bg-green-500/20 text-green-400" },
  { value: "transport", label: "Transport", color: "bg-yellow-500/20 text-yellow-400" },
  { value: "equipment", label: "Équipement", color: "bg-indigo-500/20 text-indigo-400" },
  { value: "food", label: "🍽️ Alimentation", color: "bg-pink-500/20 text-pink-400" }, 
  { value: "other", label: "Autre", color: "bg-gray-500/20 text-gray-400" }
];

const typeConfig: Record<string, { label: string; icon: any; color: string }> = {
  client: { label: "🤝 Client", icon: Briefcase, color: "bg-blue-500/20 text-blue-400" },
  grant: { label: "🎯 Subvention", icon: Target, color: "bg-emerald-500/20 text-emerald-400" },
  contract: { label: "📄 Contrat", icon: FileText, color: "bg-purple-500/20 text-purple-400" },
  investor: { label: "💰 Investisseur", icon: DollarSign, color: "bg-yellow-500/20 text-yellow-400" },
  partnership: { label: "🤝 Partenariat", icon: Sparkles, color: "bg-pink-500/20 text-pink-400" },
  product: { label: "📦 Produit", icon: Package, color: "bg-orange-500/20 text-orange-400" },
  content: { label: "📱 Contenu", icon: TrendingUp, color: "bg-cyan-500/20 text-cyan-400" },
  other: { label: "📁 Autre", icon: Briefcase, color: "bg-gray-500/20 text-gray-400" }
};

const stageConfig: Record<string, { label: string; color: string; icon: any; order: number }> = {
  idea: { label: "💡 Idée", color: "bg-gray-500/20 text-gray-400", icon: Sparkles, order: 1 },
  researching: { label: "🔍 Recherche", color: "bg-blue-500/20 text-blue-400", icon: Search, order: 2 },
  preparing: { label: "📝 Préparation", color: "bg-purple-500/20 text-purple-400", icon: Edit2, order: 3 },
  submitted: { label: "📤 Soumis", color: "bg-yellow-500/20 text-yellow-400", icon: Send, order: 4 },
  follow_up: { label: "🔄 Relance", color: "bg-orange-500/20 text-orange-400", icon: Clock, order: 5 },
  won: { label: "🏆 Gagné", color: "bg-emerald-500/20 text-emerald-400", icon: CheckCircle, order: 6 },
  lost: { label: "❌ Perdu", color: "bg-red-500/20 text-red-400", icon: AlertCircle, order: 7 }
};

const probabilityConfig = {
  low: { label: "🟢 Faible", color: "text-gray-400", value: 25 },
  medium: { label: "🟡 Moyenne", color: "text-yellow-400", value: 50 },
  high: { label: "🔴 Haute", color: "text-emerald-400", value: 75 }
};

import { FileText, Package, Send } from "lucide-react";

function calculateOpportunityScore(opp: Opportunity): number {
  let score = 0;
  
  if (opp.estimated_value) {
    if (opp.estimated_value >= 10000000) score += 10;
    else if (opp.estimated_value >= 5000000) score += 8;
    else if (opp.estimated_value >= 2000000) score += 6;
    else if (opp.estimated_value >= 1000000) score += 4;
    else if (opp.estimated_value >= 500000) score += 2;
    else score += 1;
  }
  
  if (opp.probability === "high") score += 8;
  else if (opp.probability === "medium") score += 5;
  else if (opp.probability === "low") score += 2;
  
  if (opp.stage === "won") score += 7;
  else if (opp.stage === "follow_up") score += 6;
  else if (opp.stage === "submitted") score += 5;
  else if (opp.stage === "preparing") score += 3;
  else if (opp.stage === "researching") score += 2;
  else if (opp.stage === "idea") score += 1;
  
  if (opp.deadline) {
    const daysUntil = Math.ceil((new Date(opp.deadline).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
    if (daysUntil <= 3) score += 5;
    else if (daysUntil <= 7) score += 4;
    else if (daysUntil <= 14) score += 3;
    else if (daysUntil <= 30) score += 2;
    else score += 1;
  }
  
  return Math.min(score, 30);
}

function getScoreStars(score: number): string {
  if (score >= 24) return "★★★★★";
  if (score >= 20) return "★★★★☆";
  if (score >= 15) return "★★★☆☆";
  if (score >= 10) return "★★☆☆☆";
  return "★☆☆☆☆";
}

function getScoreColor(score: number): string {
  if (score >= 20) return "text-emerald-400 bg-emerald-500/10";
  if (score >= 15) return "text-blue-400 bg-blue-500/10";
  if (score >= 10) return "text-yellow-400 bg-yellow-500/10";
  return "text-gray-400 bg-gray-500/10";
}

// =====================================================
// COMPOSANT PRINCIPAL
// =====================================================

export default function MoneyOpportunitiesPage() {
  const [activeTab, setActiveTab] = useState<"money" | "opportunities">("money");
  
  // États pour les finances
  const [spending, setSpending] = useState<Spending[]>([]);
  const [revenue, setRevenue] = useState<Revenue[]>([]);
  const [showFinanceForm, setShowFinanceForm] = useState(false);
  const [financeFormType, setFinanceFormType] = useState<"spending" | "revenue">("spending");
  const [editingFinanceId, setEditingFinanceId] = useState<string | null>(null);
  const [filterProject, setFilterProject] = useState<string>("all");
  const [filterMonth, setFilterMonth] = useState<string>("all");
  const [isFinanceLoading, setIsFinanceLoading] = useState(true);
  
  // États pour les opportunités
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [showOpportunityForm, setShowOpportunityForm] = useState(false);
  const [editingOpportunityId, setEditingOpportunityId] = useState<string | null>(null);
  const [filterStage, setFilterStage] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("value");
  const [isOpportunityLoading, setIsOpportunityLoading] = useState(true);
  
  // Formulaire finances
  const [financeFormData, setFinanceFormData] = useState({
    title: "",
    amount: "",
    category: "materials",
    project: "Ifè Farm",
    date: new Date().toISOString().split('T')[0],
    notes: ""
  });
  
  // Formulaire opportunité
  const [opportunityFormData, setOpportunityFormData] = useState({
    title: "",
    type: "client" as Opportunity["type"],
    mission_id: "",
    estimated_value: "",
    stage: "idea" as Opportunity["stage"],
    deadline: "",
    probability: "medium" as Opportunity["probability"],
    next_action: "",
    notes: ""
  });

  const scrollToForm = () => {
    setTimeout(() => {
      const formElement = document.getElementById('form-container');
      if (formElement) {
        formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 150);
  };

  // =====================================================
  // CHARGEMENT DES DONNÉES
  // =====================================================

  useEffect(() => {
    fetchAllData();
    
    const spendingChannel = supabase
      .channel('spending_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'spending' }, () => fetchFinanceData())
      .subscribe();
    
    const revenueChannel = supabase
      .channel('revenue_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'revenue' }, () => fetchFinanceData())
      .subscribe();
    
    const opportunitiesChannel = supabase
      .channel('opportunities_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'opportunities' }, () => fetchOpportunities())
      .subscribe();
    
    return () => {
      spendingChannel.unsubscribe();
      revenueChannel.unsubscribe();
      opportunitiesChannel.unsubscribe();
    };
  }, []);

  async function fetchAllData() {
    await Promise.all([fetchFinanceData(), fetchOpportunities(), fetchMissions()]);
  }

  async function fetchFinanceData() {
    setIsFinanceLoading(true);
    
    const { data: spendingData } = await supabase
      .from("spending")
      .select("*")
      .order("date", { ascending: false });
    
    const { data: revenueData } = await supabase
      .from("revenue")
      .select("*")
      .order("date", { ascending: false });
    
    setSpending(spendingData || []);
    setRevenue(revenueData || []);
    setIsFinanceLoading(false);
  }

  async function fetchOpportunities() {
    setIsOpportunityLoading(true);
    const { data } = await supabase
      .from("opportunities")
      .select("*")
      .order("estimated_value", { ascending: false });
    setOpportunities(data || []);
    setIsOpportunityLoading(false);
  }

  async function fetchMissions() {
    const { data } = await supabase
      .from("missions")
      .select("id, name")
      .eq("status", "active");
    setMissions(data || []);
  }

  // =====================================================
  // GESTION DES FINANCES
  // =====================================================

  async function addFinanceEntry() {
    const table = financeFormType === "spending" ? "spending" : "revenue";
    const data = {
      title: financeFormData.title,
      amount: parseFloat(financeFormData.amount),
      category: financeFormData.category,
      project: financeFormData.project,
      date: financeFormData.date,
      notes: financeFormData.notes || null
    };
    
    const { error } = await supabase.from(table).insert(data);
    if (!error) {
      resetFinanceForm();
      fetchFinanceData();
      toast.success(financeFormType === "spending" ? "Dépense ajoutée" : "Revenu ajouté");
    } else {
      toast.error("Erreur: " + error.message);
    }
  }

  async function updateFinanceEntry() {
    const table = financeFormType === "spending" ? "spending" : "revenue";
    const data = {
      title: financeFormData.title,
      amount: parseFloat(financeFormData.amount),
      category: financeFormData.category,
      project: financeFormData.project,
      date: financeFormData.date,
      notes: financeFormData.notes || null
    };
    
    const { error } = await supabase.from(table).update(data).eq("id", editingFinanceId);
    if (!error) {
      resetFinanceForm();
      fetchFinanceData();
      toast.success("Modifié");
    } else {
      toast.error("Erreur: " + error.message);
    }
  }

  async function deleteFinanceEntry(table: string, id: string) {
    if (confirm("Supprimer cette entrée ?")) {
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (!error) {
        fetchFinanceData();
        toast.success("Supprimé");
      }
    }
  }

  function editFinanceEntry(entry: Spending | Revenue, type: "spending" | "revenue") {
    setFinanceFormType(type);
    setFinanceFormData({
      title: "title" in entry ? entry.title : entry.source,
      amount: entry.amount.toString(),
      category: "category" in entry ? entry.category : "other",
      project: entry.project,
      date: entry.date,
      notes: entry.notes || ""
    });
    setEditingFinanceId(entry.id);
    setShowFinanceForm(true);
    scrollToForm();
  }

  function resetFinanceForm() {
    setShowFinanceForm(false);
    setEditingFinanceId(null);
    setFinanceFormData({
      title: "",
      amount: "",
      category: "materials",
      project: "Ifè Farm",
      date: new Date().toISOString().split('T')[0],
      notes: ""
    });
  }

  // =====================================================
  // GESTION DES OPPORTUNITÉS
  // =====================================================

  async function saveOpportunity() {
    const data = {
      title: opportunityFormData.title,
      type: opportunityFormData.type,
      mission_id: opportunityFormData.mission_id || null,
      estimated_value: opportunityFormData.estimated_value ? parseFloat(opportunityFormData.estimated_value) : null,
      stage: opportunityFormData.stage,
      deadline: opportunityFormData.deadline || null,
      probability: opportunityFormData.probability,
      next_action: opportunityFormData.next_action || null,
      notes: opportunityFormData.notes || null
    };
    
    let error;
    if (editingOpportunityId) {
      const result = await supabase.from("opportunities").update(data).eq("id", editingOpportunityId);
      error = result.error;
    } else {
      const result = await supabase.from("opportunities").insert(data);
      error = result.error;
    }
    
    if (!error) {
      resetOpportunityForm();
      fetchOpportunities();
      toast.success(editingOpportunityId ? "Opportunité modifiée" : "Opportunité ajoutée");
    } else {
      toast.error("Erreur: " + error.message);
    }
  }

  async function updateOpportunityStage(id: string, newStage: Opportunity["stage"]) {
    const { error } = await supabase.from("opportunities").update({ stage: newStage }).eq("id", id);
    if (!error) fetchOpportunities();
  }

  async function deleteOpportunity(id: string) {
    if (confirm("Supprimer cette opportunité ?")) {
      const { error } = await supabase.from("opportunities").delete().eq("id", id);
      if (!error) {
        fetchOpportunities();
        toast.success("Opportunité supprimée");
      }
    }
  }

  function editOpportunity(opp: Opportunity) {
    setEditingOpportunityId(opp.id);
    setOpportunityFormData({
      title: opp.title,
      type: opp.type,
      mission_id: opp.mission_id || "",
      estimated_value: opp.estimated_value?.toString() || "",
      stage: opp.stage,
      deadline: opp.deadline || "",
      probability: opp.probability,
      next_action: opp.next_action || "",
      notes: opp.notes || ""
    });
    setShowOpportunityForm(true);
    scrollToForm();
  }

  function resetOpportunityForm() {
    setShowOpportunityForm(false);
    setEditingOpportunityId(null);
    setOpportunityFormData({
      title: "",
      type: "client",
      mission_id: "",
      estimated_value: "",
      stage: "idea",
      deadline: "",
      probability: "medium",
      next_action: "",
      notes: ""
    });
  }

  async function scanOpportunities() {
    toast.info("🔍 Scan en cours...");
    try {
      const response = await fetch(`${API_URL}/api/opportunities/scan`, { method: "POST" });
      const data = await response.json();
      if (data.success && data.count > 0) {
        toast.success(`🎯 ${data.count} opportunité(s) détectée(s) !`);
        fetchOpportunities();
      } else if (data.success) {
        toast.info("Aucune nouvelle opportunité détectée");
      } else {
        toast.error("Erreur lors du scan");
      }
    } catch (error) {
      toast.error("Erreur de connexion");
    }
  }

  // =====================================================
  // FILTRES & CALCULS FINANCES
  // =====================================================

  const filteredSpending = spending.filter(s => {
    if (filterProject !== "all" && s.project !== filterProject) return false;
    if (filterMonth !== "all") {
      const month = new Date(s.date).toLocaleString('fr-FR', { month: 'long', year: 'numeric' });
      if (month !== filterMonth) return false;
    }
    return true;
  });

  const filteredRevenue = revenue.filter(r => {
    if (filterProject !== "all" && r.project !== filterProject) return false;
    if (filterMonth !== "all") {
      const month = new Date(r.date).toLocaleString('fr-FR', { month: 'long', year: 'numeric' });
      if (month !== filterMonth) return false;
    }
    return true;
  });

  const totalSpending = filteredSpending.reduce((sum, s) => sum + (s.amount || 0), 0);
  const totalRevenue = filteredRevenue.reduce((sum, r) => sum + (r.amount || 0), 0);
  const balance = totalRevenue - totalSpending;

  const spendingByCategory = categories.map(cat => ({
    ...cat,
    total: filteredSpending.filter(s => s.category === cat.value).reduce((sum, s) => sum + s.amount, 0)
  })).filter(c => c.total > 0);

  const availableMonths = [...new Set([
    ...spending.map(s => new Date(s.date).toLocaleString('fr-FR', { month: 'long', year: 'numeric' })),
    ...revenue.map(r => new Date(r.date).toLocaleString('fr-FR', { month: 'long', year: 'numeric' }))
  ])];

  const categoryChartData = {
    labels: spendingByCategory.map(c => c.label),
    datasets: [{
      label: 'Dépenses (CFA)',
      data: spendingByCategory.map(c => c.total),
      backgroundColor: ['rgba(212, 175, 55, 0.8)', 'rgba(212, 175, 55, 0.6)', 'rgba(212, 175, 55, 0.4)', 'rgba(212, 175, 55, 0.3)', 'rgba(212, 175, 55, 0.2)'],
      borderColor: '#D4AF37',
      borderWidth: 1,
    }]
  };

  const getMonthlyEvolution = () => {
    const monthlyData: { [key: string]: { revenue: number; spending: number } } = {};
    
    [...spending, ...revenue].forEach(item => {
      const month = new Date(item.date).toLocaleString('fr-FR', { month: 'short', year: 'numeric' });
      if (!monthlyData[month]) monthlyData[month] = { revenue: 0, spending: 0 };
      if ('source' in item) monthlyData[month].revenue += item.amount;
      else monthlyData[month].spending += item.amount;
    });
    
    const months = Object.keys(monthlyData).slice(-6);
    return {
      labels: months,
      datasets: [
        { label: 'Revenus', data: months.map(m => monthlyData[m].revenue), backgroundColor: 'rgba(16, 185, 129, 0.6)', borderColor: '#10b981', borderWidth: 2 },
        { label: 'Dépenses', data: months.map(m => monthlyData[m].spending), backgroundColor: 'rgba(239, 68, 68, 0.6)', borderColor: '#ef4444', borderWidth: 2 }
      ]
    };
  };

  // =====================================================
  // FILTRES OPPORTUNITÉS
  // =====================================================

  const filteredOpportunities = opportunities.filter(opp => {
    if (filterStage !== "all" && opp.stage !== filterStage) return false;
    if (filterType !== "all" && opp.type !== filterType) return false;
    return true;
  });

  const sortedOpportunities = [...filteredOpportunities].sort((a, b) => {
    if (sortBy === "value") return (b.estimated_value || 0) - (a.estimated_value || 0);
    if (sortBy === "score") return calculateOpportunityScore(b) - calculateOpportunityScore(a);
    if (sortBy === "deadline") return (a.deadline || "9999") > (b.deadline || "9999") ? 1 : -1;
    return 0;
  });

  const oppStats = {
    total: opportunities.length,
    totalValue: opportunities.reduce((sum, o) => sum + (o.estimated_value || 0), 0),
    won: opportunities.filter(o => o.stage === "won").length,
    inProgress: opportunities.filter(o => !["won", "lost"].includes(o.stage)).length,
    highProbability: opportunities.filter(o => o.probability === "high" && !["won", "lost"].includes(o.stage)).length
  };

  // =====================================================
  // RENDU
  // =====================================================

  if (isFinanceLoading && isOpportunityLoading) {
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
              <DollarSign className="w-8 h-8 text-emerald-400" />
              <TrendingUp className="w-8 h-8 text-gold-500" />
              <h1 className="text-3xl md:text-4xl font-serif text-gold-500 tracking-tight">
                Money & Opportunities
              </h1>
            </div>
            <p className="text-gray-500 text-sm">
              Gestion financière et suivi des opportunités
            </p>
          </div>
          <button
            onClick={() => exportFinancialToPDF(spending, revenue)}
            className="bg-white/10 p-2 rounded-full hover:bg-white/20 transition-colors"
            title="Exporter les finances en PDF"
          >
            <Download className="w-5 h-5 text-gold-500" />
          </button>
        </div>

        {/* Bloc Becks - Analyse */}
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-3">
            <DollarSign className="w-5 h-5 text-emerald-400" />
            <div>
              <p className="text-sm text-emerald-400 font-medium">Becks - Analyse</p>
              <p className="text-sm text-ivory">
                💰 Solde : {balance.toLocaleString()} CFA • 🎯 {oppStats.inProgress} opportunité(s) en cours
              </p>
            </div>
          </div>
        </div>

        {/* TABS */}
        <div className="flex flex-wrap gap-2 border-b border-white/10 mb-6 overflow-x-auto pb-2">
          <button
            onClick={() => setActiveTab("money")}
            className={`px-4 py-2 text-sm flex items-center gap-2 transition-colors rounded-lg ${
              activeTab === "money" ? "bg-gold-500/20 text-gold-500" : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <LayoutGrid className="w-4 h-4" /> Finances
          </button>
          <button
            onClick={() => setActiveTab("opportunities")}
            className={`px-4 py-2 text-sm flex items-center gap-2 transition-colors rounded-lg ${
              activeTab === "opportunities" ? "bg-gold-500/20 text-gold-500" : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Target className="w-4 h-4" /> Opportunités
          </button>
        </div>

        {/* ==================== ONGLET FINANCES ==================== */}
        {activeTab === "money" && (
          <div>
            {/* FILTRES */}
            <div className="flex flex-wrap gap-3 mb-6">
              <select value={filterProject} onChange={(e) => setFilterProject(e.target.value)} className="bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm">
                <option value="all">📁 Tous les projets</option>
                {projects.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <select value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} className="bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm">
                <option value="all">📅 Tous les mois</option>
                {availableMonths.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <button onClick={() => fetchFinanceData()} className="p-2 bg-white/5 rounded-full hover:bg-white/10"><RefreshCw className="w-4 h-4 text-gray-400" /></button>
            </div>

            {/* STATS CARTES */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
              <motion.div whileHover={{ y: -2 }} className="bg-gradient-to-br from-emerald-500/10 to-transparent border border-emerald-500/20 rounded-2xl p-6">
                <div className="flex items-center gap-2 text-emerald-400 mb-2"><TrendingUp className="w-5 h-5" /><span className="text-sm uppercase tracking-wider">Revenus</span></div>
                <div className="text-2xl font-serif text-ivory">{totalRevenue.toLocaleString()} CFA</div>
              </motion.div>
              <motion.div whileHover={{ y: -2 }} className="bg-gradient-to-br from-red-500/10 to-transparent border border-red-500/20 rounded-2xl p-6">
                <div className="flex items-center gap-2 text-red-400 mb-2"><TrendingDown className="w-5 h-5" /><span className="text-sm uppercase tracking-wider">Dépenses</span></div>
                <div className="text-2xl font-serif text-ivory">{totalSpending.toLocaleString()} CFA</div>
              </motion.div>
              <motion.div whileHover={{ y: -2 }} className={`bg-gradient-to-br from-gold-500/10 to-transparent border rounded-2xl p-6 ${balance >= 0 ? 'border-emerald-500/20' : 'border-red-500/20'}`}>
                <div className="flex items-center gap-2 text-gold-500 mb-2"><Wallet className="w-5 h-5" /><span className="text-sm uppercase tracking-wider">Solde net</span></div>
                <div className={`text-2xl font-serif ${balance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{balance.toLocaleString()} CFA</div>
              </motion.div>
            </div>

            {/* GRAPHIQUES */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {spendingByCategory.length > 0 && (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                  <h2 className="text-sm font-serif text-gold-500 mb-4">📊 Dépenses par catégorie</h2>
                  <div className="h-64"><Pie data={categoryChartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: '#F5F5F0' } } } }} /></div>
                </div>
              )}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                <h2 className="text-sm font-serif text-gold-500 mb-4">📈 Évolution 6 mois</h2>
                <div className="h-64"><Bar data={getMonthlyEvolution()} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top', labels: { color: '#F5F5F0' } } }, scales: { x: { ticks: { color: '#9CA3AF' } }, y: { ticks: { color: '#9CA3AF' } } } }} /></div>
              </div>
            </div>

            {/* ANALYSE PAR CATÉGORIE */}
            {spendingByCategory.length > 0 && (
              <div className="mb-8">
                <h2 className="text-sm uppercase tracking-wider text-gray-500 mb-3">📊 Répartition des dépenses</h2>
                <div className="flex flex-wrap gap-3">
                  {spendingByCategory.map(cat => <div key={cat.value} className={`px-4 py-2 rounded-full text-sm ${cat.color}`}>{cat.label}: {cat.total.toLocaleString()} CFA</div>)}
                </div>
              </div>
            )}

            {/* TABLEAUX */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* DÉPENSES */}
              <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                <div className="p-5 border-b border-white/10 flex justify-between items-center">
                  <h2 className="text-lg font-serif text-red-400">📤 Dépenses</h2>
                  <span className="text-sm text-gray-500">{filteredSpending.length} entrées</span>
                </div>
                <div className="divide-y divide-white/5 max-h-[500px] overflow-y-auto">
                  {isFinanceLoading ? <LoadingSpinner /> : filteredSpending.length === 0 ? <div className="p-8 text-center text-gray-500">Aucune dépense</div> : filteredSpending.map((s) => (
                    <div key={s.id} className="p-4 hover:bg-white/5 transition-colors">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="text-ivory font-medium">{s.title}</p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            <span className="text-xs text-gray-500 flex items-center gap-1"><FolderOpen className="w-3 h-3" /> {s.project}</span>
                            <span className="text-xs text-gray-500 flex items-center gap-1"><Tag className="w-3 h-3" /> {categories.find(c => c.value === s.category)?.label || s.category}</span>
                            <span className="text-xs text-gray-500 flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(s.date).toLocaleDateString('fr-FR')}</span>
                          </div>
                          {s.notes && <p className="text-xs text-gray-600 mt-1">{s.notes}</p>}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-red-400 font-medium">{s.amount.toLocaleString()} CFA</span>
                          <button onClick={() => editFinanceEntry(s, "spending")} className="text-gray-500 hover:text-gold-500"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => deleteFinanceEntry("spending", s.id)} className="text-gray-500 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* REVENUS */}
              <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                <div className="p-5 border-b border-white/10 flex justify-between items-center">
                  <h2 className="text-lg font-serif text-emerald-400">📥 Revenus</h2>
                  <span className="text-sm text-gray-500">{filteredRevenue.length} entrées</span>
                </div>
                <div className="divide-y divide-white/5 max-h-[500px] overflow-y-auto">
                  {isFinanceLoading ? <LoadingSpinner /> : filteredRevenue.length === 0 ? <div className="p-8 text-center text-gray-500">Aucun revenu</div> : filteredRevenue.map((r) => (
                    <div key={r.id} className="p-4 hover:bg-white/5 transition-colors">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="text-ivory font-medium">{r.source}</p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            <span className="text-xs text-gray-500 flex items-center gap-1"><FolderOpen className="w-3 h-3" /> {r.project}</span>
                            <span className="text-xs text-gray-500 flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(r.date).toLocaleDateString('fr-FR')}</span>
                          </div>
                          {r.notes && <p className="text-xs text-gray-600 mt-1">{r.notes}</p>}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-emerald-400 font-medium">{r.amount.toLocaleString()} CFA</span>
                          <button onClick={() => editFinanceEntry(r, "revenue")} className="text-gray-500 hover:text-gold-500"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => deleteFinanceEntry("revenue", r.id)} className="text-gray-500 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* BOUTONS D'AJOUT */}
            <div className="flex gap-4 mt-6">
              <button onClick={() => { setFinanceFormType("spending"); setShowFinanceForm(true); setEditingFinanceId(null); scrollToForm(); }} className="bg-red-500/20 text-red-400 px-5 py-2 rounded-full text-sm font-medium hover:bg-red-500/30 transition-all flex items-center gap-2">
                <Plus className="w-4 h-4" /> Dépense
              </button>
              <button onClick={() => { setFinanceFormType("revenue"); setShowFinanceForm(true); setEditingFinanceId(null); scrollToForm(); }} className="bg-emerald-500/20 text-emerald-400 px-5 py-2 rounded-full text-sm font-medium hover:bg-emerald-500/30 transition-all flex items-center gap-2">
                <Plus className="w-4 h-4" /> Revenu
              </button>
            </div>

            {/* FORMULAIRE FINANCES */}
            <AnimatePresence>
              {showFinanceForm && (
                <motion.div id="form-container" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 mt-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-serif text-ivory">{editingFinanceId ? "Modifier" : "Nouvelle"} {financeFormType === "spending" ? "dépense" : "revenu"}</h3>
                    <button onClick={resetFinanceForm} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="text" placeholder="Titre / Description" value={financeFormData.title} onChange={(e) => setFinanceFormData({ ...financeFormData, title: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-ivory" />
                    <input type="number" placeholder="Montant (CFA)" value={financeFormData.amount} onChange={(e) => setFinanceFormData({ ...financeFormData, amount: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-ivory" />
                    <select value={financeFormData.category} onChange={(e) => setFinanceFormData({ ...financeFormData, category: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-ivory">
                      {categories.map(cat => <option key={cat.value} value={cat.value}>{cat.label}</option>)}
                    </select>
                    <select value={financeFormData.project} onChange={(e) => setFinanceFormData({ ...financeFormData, project: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-ivory">
                      {projects.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                    <input type="date" value={financeFormData.date} onChange={(e) => setFinanceFormData({ ...financeFormData, date: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-ivory" />
                    <textarea placeholder="Notes" value={financeFormData.notes} onChange={(e) => setFinanceFormData({ ...financeFormData, notes: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-ivory md:col-span-2" rows={2} />
                  </div>
                  <div className="flex gap-3 mt-6">
                    <button onClick={editingFinanceId ? updateFinanceEntry : addFinanceEntry} className="bg-gold-500 text-midnight px-6 py-2 rounded-full font-medium hover:bg-gold-400 transition-colors">
                      {editingFinanceId ? "Mettre à jour" : "Enregistrer"}
                    </button>
                    <button onClick={resetFinanceForm} className="bg-white/10 px-6 py-2 rounded-full hover:bg-white/20 transition-colors">Annuler</button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* ==================== ONGLET OPPORTUNITÉS ==================== */}
        {activeTab === "opportunities" && (
          <div>
            <div className="flex justify-end gap-3 mb-4">
              <button onClick={scanOpportunities} className="bg-purple-500/20 text-purple-400 px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 hover:bg-purple-500/30 transition-colors">
                <Brain className="w-4 h-4" /> Scanner les opportunités
              </button>
              <button onClick={() => { setShowOpportunityForm(true); setEditingOpportunityId(null); scrollToForm(); }} className="bg-gold-500 text-midnight px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 hover:bg-gold-400 transition-colors">
                <Plus className="w-4 h-4" /> Nouvelle opportunité
              </button>
            </div>

            {/* STATS OPPORTUNITÉS */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                <div className="text-2xl font-serif text-ivory">{oppStats.total}</div>
                <div className="text-xs text-gray-500">Total</div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                <div className="text-2xl font-serif text-emerald-400">{oppStats.totalValue.toLocaleString()} CFA</div>
                <div className="text-xs text-gray-500">Valeur totale</div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                <div className="text-2xl font-serif text-blue-400">{oppStats.inProgress}</div>
                <div className="text-xs text-gray-500">En cours</div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                <div className="text-2xl font-serif text-emerald-400">{oppStats.won}</div>
                <div className="text-xs text-gray-500">Gagnées</div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                <div className="text-2xl font-serif text-yellow-400">{oppStats.highProbability}</div>
                <div className="text-xs text-gray-500">Haute proba</div>
              </div>
            </div>

            {/* FILTRES OPPORTUNITÉS */}
            <div className="flex flex-wrap gap-3 mb-6">
              <select value={filterStage} onChange={(e) => setFilterStage(e.target.value)} className="bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm">
                <option value="all">📋 Tous les statuts</option>
                {Object.entries(stageConfig).map(([key, conf]) => <option key={key} value={key}>{conf.label}</option>)}
              </select>
              <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm">
                <option value="all">🏷️ Tous les types</option>
                {Object.entries(typeConfig).map(([key, conf]) => <option key={key} value={key}>{conf.label}</option>)}
              </select>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm">
                <option value="value">💰 Trier par valeur</option>
                <option value="score">⭐ Trier par score</option>
                <option value="deadline">📅 Trier par échéance</option>
              </select>
            </div>

            {/* FORMULAIRE OPPORTUNITÉ */}
            <AnimatePresence>
              {showOpportunityForm && (
                <motion.div id="form-container" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 mb-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-serif text-ivory">{editingOpportunityId ? "Modifier" : "Nouvelle"} opportunité</h3>
                    <button onClick={resetOpportunityForm} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="text" placeholder="Nom de l'opportunité" value={opportunityFormData.title} onChange={(e) => setOpportunityFormData({ ...opportunityFormData, title: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-ivory md:col-span-2" />
                    <select value={opportunityFormData.type} onChange={(e) => setOpportunityFormData({ ...opportunityFormData, type: e.target.value as Opportunity["type"] })} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-ivory">
                      {Object.entries(typeConfig).map(([key, conf]) => <option key={key} value={key}>{conf.label}</option>)}
                    </select>
                    <select value={opportunityFormData.mission_id} onChange={(e) => setOpportunityFormData({ ...opportunityFormData, mission_id: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-ivory">
                      <option value="">📁 Aucune mission</option>
                      {missions.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                    <input type="number" placeholder="Valeur estimée (CFA)" value={opportunityFormData.estimated_value} onChange={(e) => setOpportunityFormData({ ...opportunityFormData, estimated_value: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-ivory" />
                    <select value={opportunityFormData.stage} onChange={(e) => setOpportunityFormData({ ...opportunityFormData, stage: e.target.value as Opportunity["stage"] })} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-ivory">
                      {Object.entries(stageConfig).map(([key, conf]) => <option key={key} value={key}>{conf.label}</option>)}
                    </select>
                    <select value={opportunityFormData.probability} onChange={(e) => setOpportunityFormData({ ...opportunityFormData, probability: e.target.value as Opportunity["probability"] })} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-ivory">
                      {Object.entries(probabilityConfig).map(([key, conf]) => <option key={key} value={key}>{conf.label}</option>)}
                    </select>
                    <input type="date" value={opportunityFormData.deadline} onChange={(e) => setOpportunityFormData({ ...opportunityFormData, deadline: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-ivory" />
                    <input type="text" placeholder="Prochaine action" value={opportunityFormData.next_action} onChange={(e) => setOpportunityFormData({ ...opportunityFormData, next_action: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-ivory md:col-span-2" />
                    <textarea placeholder="Notes" value={opportunityFormData.notes} onChange={(e) => setOpportunityFormData({ ...opportunityFormData, notes: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-ivory md:col-span-2" rows={2} />
                  </div>
                  <div className="flex gap-3 mt-6">
                    <button onClick={saveOpportunity} className="bg-gold-500 text-midnight px-6 py-2 rounded-full font-medium hover:bg-gold-400 transition-colors">
                      {editingOpportunityId ? "Mettre à jour" : "Enregistrer"}
                    </button>
                    <button onClick={resetOpportunityForm} className="bg-white/10 px-6 py-2 rounded-full hover:bg-white/20 transition-colors">Annuler</button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* LISTE DES OPPORTUNITÉS */}
            <div className="space-y-3">
              {isOpportunityLoading ? <LoadingSpinner /> : sortedOpportunities.length === 0 ? (
                <div className="text-center py-12 text-gray-500"><TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-30" /><p>Aucune opportunité</p></div>
              ) : sortedOpportunities.map((opp) => {
                const typeData = typeConfig[opp.type] || { icon: Briefcase, label: opp.type || "Autre", color: "bg-gray-500/20 text-gray-400" };
                const TypeIcon = typeData.icon;
                const stageData = stageConfig[opp.stage] || { icon: Clock, label: opp.stage || "En cours", color: "bg-gray-500/20 text-gray-400", order: 3 };
                const StageIcon = stageData.icon;
                const probabilityInfo = probabilityConfig[opp.probability] || { label: "Moyenne", color: "text-yellow-400", value: 50 };
                const score = calculateOpportunityScore(opp);
                
                return (
                  <motion.div key={opp.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="bg-white/5 border border-white/10 rounded-xl p-5 hover:border-gold-500/30 transition-all">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 flex-wrap mb-2">
                          <h3 className="text-ivory font-medium text-lg">{opp.title}</h3>
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs ${typeData.color}`}><TypeIcon className="w-3 h-3" /> {typeData.label}</span>
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs ${stageData.color}`}><StageIcon className="w-3 h-3" /> {stageData.label}</span>
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm mt-2">
                          {opp.estimated_value > 0 && <span className="text-emerald-400 font-medium">{opp.estimated_value.toLocaleString()} CFA</span>}
                          <span className={`text-xs ${probabilityInfo.color}`}>{probabilityInfo.label} ({probabilityInfo.value}%)</span>
                          {opp.deadline && <span className="text-xs text-gray-500 flex items-center gap-1"><Calendar className="w-3 h-3" /> Échéance: {new Date(opp.deadline).toLocaleDateString('fr-FR')}</span>}
                        </div>
                        <div className="flex items-center gap-2 mt-3"><div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs ${getScoreColor(score)}`}><span className="text-xs">{getScoreStars(score)}</span><span>Score: {score}/30</span></div></div>
                        {opp.next_action && <div className="mt-3 p-2 bg-gold-500/5 rounded-lg"><span className="text-xs text-gold-500">🎯 Prochaine action :</span><span className="text-xs text-gray-300 ml-2">{opp.next_action}</span></div>}
                        {opp.notes && <p className="text-xs text-gray-500 mt-2">{opp.notes}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        <select value={opp.stage} onChange={(e) => updateOpportunityStage(opp.id, e.target.value as Opportunity["stage"])} className="bg-white/10 border border-white/10 rounded-lg px-2 py-1 text-xs">
                          {Object.entries(stageConfig).map(([key, conf]) => <option key={key} value={key}>{conf.label}</option>)}
                        </select>
                        <button onClick={() => editOpportunity(opp)} className="text-gray-500 hover:text-gold-500"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => deleteOpportunity(opp.id)} className="text-gray-500 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                    <div className="mt-3 w-full bg-white/10 rounded-full h-1"><div className={`h-1 rounded-full ${opp.stage === "won" ? "bg-emerald-500" : "bg-gold-500"}`} style={{ width: `${(stageData.order / 7) * 100}%` }} /></div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
