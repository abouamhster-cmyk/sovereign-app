"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Sprout, Plus, Trash2, Edit2, X, Calendar, 
  DollarSign, Tractor, Fish, LayoutGrid, TrendingUp,
  CheckCircle, Clock, AlertCircle, Droplets, 
  Sun, Shield, Users as UsersIcon, Building2,
  Package, Truck, Leaf, Home, Download
} from "lucide-react";
import { exportToPDF } from "@/lib/exportPDF";

// Types
type FarmInfrastructure = {
  id: string;
  name: string;
  type: "building" | "utility" | "security" | "production" | "landscape";
  status: "planned" | "in_progress" | "complete" | "needs_repair";
  location_on_site: string;
  completed_date: string | null;
  responsible_person: string | null;
  notes: string | null;
};

type FarmProductionUnit = {
  id: string;
  name: string;
  category: "fish" | "chicken" | "around" | "snail" | "coconut" | "garden";
  status: "planned" | "setup" | "active" | "harvest" | "paused";
  current_capacity: string;
  start_date: string | null;
  expected_first_revenue: string | null;
  technical_lead: string | null;
  notes: string | null;
};

type FarmSpending = {
  id: string;
  title: string;
  amount: number;
  currency: string;
  category: "forage" | "construction" | "labor" | "equipment" | "materials" | "livestock" | "crops" | "transport" | "security";
  project_area: string;
  verified: boolean;
  notes: string | null;
  created_at: string;
};

type FarmTeam = {
  id: string;
  name: string;
  role: string;
  area: string;
  status: "active" | "occasional" | "pending";
  phone: string;
  notes: string | null;
};

// Configurations
const infraTypeConfig = {
  building: { label: "Bâtiment", icon: Building2, color: "bg-blue-500/20 text-blue-400" },
  utility: { label: "Utilitaire", icon: Droplets, color: "bg-cyan-500/20 text-cyan-400" },
  security: { label: "Sécurité", icon: Shield, color: "bg-red-500/20 text-red-400" },
  production: { label: "Production", icon: Package, color: "bg-emerald-500/20 text-emerald-400" },
  landscape: { label: "Paysage", icon: Leaf, color: "bg-green-500/20 text-green-400" }
};

const productionCategoryConfig = {
  fish: { label: "Poisson", icon: Fish, color: "bg-blue-500/20 text-blue-400" },
  chicken: { label: "Poulet", icon: UsersIcon, color: "bg-yellow-500/20 text-yellow-400" },
  around: { label: "Okra", icon: Leaf, color: "bg-green-500/20 text-green-400" },
  snail: { label: "Escargot", icon: Sprout, color: "bg-purple-500/20 text-purple-400" },
  coconut: { label: "Coco", icon: TreePine, color: "bg-orange-500/20 text-orange-400" },
  garden: { label: "Jardin", icon: Sprout, color: "bg-emerald-500/20 text-emerald-400" }
};

const statusConfig = {
  planned: { label: "Planifié", icon: Calendar, color: "bg-gray-500/20 text-gray-400" },
  in_progress: { label: "En cours", icon: Clock, color: "bg-blue-500/20 text-blue-400" },
  setup: { label: "Installation", icon: Package, color: "bg-orange-500/20 text-orange-400" },
  active: { label: "Actif", icon: Activity, color: "bg-emerald-500/20 text-emerald-400" },
  harvest: { label: "Récolte", icon: Tractor, color: "bg-green-500/20 text-green-400" },
  complete: { label: "Terminé", icon: CheckCircle, color: "bg-gray-500/20 text-gray-400" },
  needs_repair: { label: "À réparer", icon: AlertCircle, color: "bg-red-500/20 text-red-400" },
  paused: { label: "En pause", icon: Pause, color: "bg-yellow-500/20 text-yellow-400" }
};

const spendingCategoryConfig = {
  forage: { label: "Forage", icon: Droplets },
  construction: { label: "Construction", icon: Building2 },
  labor: { label: "Main d'œuvre", icon: UsersIcon },
  equipment: { label: "Équipement", icon: Package },
  materials: { label: "Matériaux", icon: Truck },
  livestock: { label: "Élevage", icon: Fish },
  crops: { label: "Cultures", icon: Leaf },
  transport: { label: "Transport", icon: Truck },
  security: { label: "Sécurité", icon: Shield }
};

// Imports manquants
import { Activity, Pause, TreePine } from "lucide-react";

export default function FarmPage() {
  const [activeTab, setActiveTab] = useState<"infrastructure" | "production" | "spending" | "team">("infrastructure");
  
  const [infrastructure, setInfrastructure] = useState<FarmInfrastructure[]>([]);
  const [production, setProduction] = useState<FarmProductionUnit[]>([]);
  const [spending, setSpending] = useState<FarmSpending[]>([]);
  const [team, setTeam] = useState<FarmTeam[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<any>({});


const scrollToForm = () => {
  setTimeout(() => {
    const formElement = document.getElementById('form-container');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, 150);
};

  useEffect(() => {
    fetchAllData();
    
    const channels = [
      supabase.channel('farm_infra').on('postgres_changes', { event: '*', schema: 'public', table: 'farm_infrastructure' }, () => fetchInfrastructure()),
      supabase.channel('farm_production').on('postgres_changes', { event: '*', schema: 'public', table: 'farm_production_units' }, () => fetchProduction()),
      supabase.channel('farm_spending').on('postgres_changes', { event: '*', schema: 'public', table: 'farm_spending' }, () => fetchSpending()),
      supabase.channel('farm_team').on('postgres_changes', { event: '*', schema: 'public', table: 'farm_team' }, () => fetchTeam())
    ];
    
    channels.forEach(ch => ch.subscribe());
    return () => channels.forEach(ch => ch.unsubscribe());
  }, []);

  async function fetchAllData() {
    setIsLoading(true);
    await Promise.all([
      fetchInfrastructure(),
      fetchProduction(),
      fetchSpending(),
      fetchTeam()
    ]);
    setIsLoading(false);
  }

  async function fetchInfrastructure() {
    const { data } = await supabase.from("farm_infrastructure").select("*").order("created_at");
    setInfrastructure(data || []);
  }

  async function fetchProduction() {
    const { data } = await supabase.from("farm_production_units").select("*").order("created_at");
    setProduction(data || []);
  }

  async function fetchSpending() {
    const { data } = await supabase.from("farm_spending").select("*").order("created_at", { ascending: false });
    setSpending(data || []);
  }

  async function fetchTeam() {
    const { data } = await supabase.from("farm_team").select("*").order("name");
    setTeam(data || []);
  }

  async function saveItem() {
    let table = "";
    let data = {};
    
    if (activeTab === "infrastructure") {
      table = "farm_infrastructure";
      data = {
        name: formData.name,
        type: formData.type,
        status: formData.status,
        location_on_site: formData.location_on_site,
        completed_date: formData.completed_date || null,
        responsible_person: formData.responsible_person || null,
        notes: formData.notes || null
      };
    } else if (activeTab === "production") {
      table = "farm_production_units";
      data = {
        name: formData.name,
        category: formData.category,
        status: formData.status,
        current_capacity: formData.current_capacity,
        start_date: formData.start_date || null,
        expected_first_revenue: formData.expected_first_revenue || null,
        technical_lead: formData.technical_lead || null,
        notes: formData.notes || null
      };
    } else if (activeTab === "spending") {
      table = "farm_spending";
      data = {
        title: formData.title,
        amount: parseFloat(formData.amount),
        currency: "XOF",
        category: formData.category,
        project_area: formData.project_area,
        verified: false,
        notes: formData.notes || null
      };
    } else if (activeTab === "team") {
      table = "farm_team";
      data = {
        name: formData.name,
        role: formData.role,
        area: formData.area,
        status: formData.status,
        phone: formData.phone || null,
        notes: formData.notes || null
      };
    }
    
    let error;
    if (editingId) {
      const result = await supabase.from(table).update(data).eq("id", editingId);
      error = result.error;
    } else {
      const result = await supabase.from(table).insert(data);
      error = result.error;
    }
    
    if (!error) {
      resetForm();
      if (activeTab === "infrastructure") fetchInfrastructure();
      else if (activeTab === "production") fetchProduction();
      else if (activeTab === "spending") fetchSpending();
      else if (activeTab === "team") fetchTeam();
    } else {
      alert("Erreur: " + error.message);
    }
  }

  async function deleteItem(table: string, id: string) {
    if (confirm("Supprimer cet élément ?")) {
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (!error) {
        if (table === "farm_infrastructure") fetchInfrastructure();
        else if (table === "farm_production_units") fetchProduction();
        else if (table === "farm_spending") fetchSpending();
        else if (table === "farm_team") fetchTeam();
      }
    }
  }

  function editItem(item: any, type: string) {
    setEditingId(item.id);
    if (type === "infrastructure") {
      setFormData({
        name: item.name,
        type: item.type,
        status: item.status,
        location_on_site: item.location_on_site,
        completed_date: item.completed_date || "",
        responsible_person: item.responsible_person || "",
        notes: item.notes || ""
      });
    } else if (type === "production") {
      setFormData({
        name: item.name,
        category: item.category,
        status: item.status,
        current_capacity: item.current_capacity,
        start_date: item.start_date || "",
        expected_first_revenue: item.expected_first_revenue || "",
        technical_lead: item.technical_lead || "",
        notes: item.notes || ""
      });
    } else if (type === "spending") {
      setFormData({
        title: item.title,
        amount: item.amount,
        category: item.category,
        project_area: item.project_area,
        notes: item.notes || ""
      });
    } else if (type === "team") {
      setFormData({
        name: item.name,
        role: item.role,
        area: item.area,
        status: item.status,
        phone: item.phone || "",
        notes: item.notes || ""
      });
    }
    setShowForm(true);
    scrollToForm(); 
  }

  function resetForm() {
    setShowForm(false);
    setEditingId(null);
    setFormData({});
  }

  const totalSpent = spending.reduce((sum, s) => sum + s.amount, 0);
  const activeProduction = production.filter(p => p.status === "active" || p.status === "setup").length;
  const completedInfra = infrastructure.filter(i => i.status === "complete").length;
  const totalInfra = infrastructure.length;

  return (
    <div className="p-6 lg:p-10 h-full flex flex-col overflow-y-auto bg-midnight">
      {/* HEADER AVEC BOUTON EXPORT */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-serif text-gold-500 tracking-tight">Ifè Living Farm</h1>
          <p className="text-gray-500 text-sm mt-1">Command Center - Gestion complète de la ferme</p>
        </div>
        <button
          onClick={() => exportToPDF("farm-report", `farm-rapport-${new Date().toISOString().split('T')[0]}`)}
          className="bg-white/10 p-2 rounded-full hover:bg-white/20 transition-colors"
          title="Exporter en PDF"
        >
          <Download className="w-5 h-5" />
        </button>
      </div>

      {/* ZONE À EXPORTER */}
      <div id="farm-report">
        {/* STATS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
            <div className="text-2xl font-serif text-ivory">{totalSpent.toLocaleString()} CFA</div>
            <div className="text-xs text-gray-500">Investissement total</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
            <div className="text-2xl font-serif text-emerald-400">{activeProduction}</div>
            <div className="text-xs text-gray-500">Productions actives</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
            <div className="text-2xl font-serif text-blue-400">{completedInfra}/{totalInfra}</div>
            <div className="text-xs text-gray-500">Infrastructures</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
            <div className="text-2xl font-serif text-gold-500">{team.length}</div>
            <div className="text-xs text-gray-500">Équipe</div>
          </div>
        </div>

        {/* TABS */}
        <div className="flex flex-wrap gap-2 border-b border-white/10 mb-6">
          {[
            { id: "infrastructure", label: "🏗️ Infrastructures", icon: Building2 },
            { id: "production", label: "🌾 Production", icon: Sprout },
            { id: "spending", label: "💰 Dépenses", icon: DollarSign },
            { id: "team", label: "👥 Équipe", icon: UsersIcon }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id as any); setShowForm(false); }}
              className={`px-5 py-2 rounded-t-xl transition-all ${activeTab === tab.id ? "bg-gold-500/20 text-gold-500 border-b-2 border-gold-500" : "text-gray-500 hover:text-gray-300"}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* BOUTON AJOUTER */}
        <div className="flex justify-end mb-6">
          <button
            onClick={() => { setShowForm(true); setEditingId(null); setFormData({}); scrollToForm(); }}
            className="bg-gold-500 text-midnight px-5 py-2 rounded-full text-sm font-medium flex items-center gap-2 hover:bg-gold-400 transition-colors"
          >
            <Plus className="w-4 h-4" /> Ajouter
          </button>
        </div>

        {/* FORMULAIRE DYNAMIQUE */}
        <AnimatePresence>
          {showForm && (
            <motion.div id="form-container" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 mb-8">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-serif text-ivory">
                  {editingId ? "Modifier" : "Ajouter"} - {activeTab === "infrastructure" ? "Infrastructure" : activeTab === "production" ? "Production" : activeTab === "spending" ? "Dépense" : "Membre"}
                </h3>
                <button onClick={resetForm} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeTab === "infrastructure" && (
                  <>
                    <input type="text" placeholder="Nom" value={formData.name || ""} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-gold-500 text-ivory" />
                    <select value={formData.type || "building"} onChange={(e) => setFormData({ ...formData, type: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-gold-500 text-ivory">
                      {Object.entries(infraTypeConfig).map(([key, conf]) => <option key={key} value={key}>{conf.label}</option>)}
                    </select>
                    <select value={formData.status || "planned"} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-gold-500 text-ivory">
                      {Object.entries(statusConfig).map(([key, conf]) => <option key={key} value={key}>{conf.label}</option>)}
                    </select>
                    <input type="text" placeholder="Localisation" value={formData.location_on_site || ""} onChange={(e) => setFormData({ ...formData, location_on_site: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-gold-500 text-ivory" />
                    <input type="date" placeholder="Date complétion" value={formData.completed_date || ""} onChange={(e) => setFormData({ ...formData, completed_date: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-gold-500 text-ivory" />
                    <input type="text" placeholder="Responsable" value={formData.responsible_person || ""} onChange={(e) => setFormData({ ...formData, responsible_person: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-gold-500 text-ivory" />
                    <textarea placeholder="Notes" value={formData.notes || ""} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-gold-500 text-ivory md:col-span-2" rows={2} />
                  </>
                )}

                {activeTab === "production" && (
                  <>
                    <input type="text" placeholder="Nom" value={formData.name || ""} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-gold-500 text-ivory" />
                    <select value={formData.category || "fish"} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-gold-500 text-ivory">
                      {Object.entries(productionCategoryConfig).map(([key, conf]) => <option key={key} value={key}>{conf.label}</option>)}
                    </select>
                    <select value={formData.status || "planned"} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-gold-500 text-ivory">
                      {Object.entries(statusConfig).map(([key, conf]) => <option key={key} value={key}>{conf.label}</option>)}
                    </select>
                    <input type="text" placeholder="Capacité" value={formData.current_capacity || ""} onChange={(e) => setFormData({ ...formData, current_capacity: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-gold-500 text-ivory" />
                    <input type="date" placeholder="Date début" value={formData.start_date || ""} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-gold-500 text-ivory" />
                    <input type="date" placeholder="Premier revenu" value={formData.expected_first_revenue || ""} onChange={(e) => setFormData({ ...formData, expected_first_revenue: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-gold-500 text-ivory" />
                    <input type="text" placeholder="Lead technique" value={formData.technical_lead || ""} onChange={(e) => setFormData({ ...formData, technical_lead: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-gold-500 text-ivory" />
                    <textarea placeholder="Notes" value={formData.notes || ""} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-gold-500 text-ivory md:col-span-2" rows={2} />
                  </>
                )}

                {activeTab === "spending" && (
                  <>
                    <input type="text" placeholder="Titre" value={formData.title || ""} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-gold-500 text-ivory" />
                    <input type="number" placeholder="Montant (CFA)" value={formData.amount || ""} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-gold-500 text-ivory" />
                    <select value={formData.category || "materials"} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-gold-500 text-ivory">
                      {Object.entries(spendingCategoryConfig).map(([key, conf]) => <option key={key} value={key}>{conf.label}</option>)}
                    </select>
                    <input type="text" placeholder="Zone du projet" value={formData.project_area || ""} onChange={(e) => setFormData({ ...formData, project_area: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-gold-500 text-ivory" />
                    <textarea placeholder="Notes" value={formData.notes || ""} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-gold-500 text-ivory md:col-span-2" rows={2} />
                  </>
                )}

                {activeTab === "team" && (
                  <>
                    <input type="text" placeholder="Nom" value={formData.name || ""} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-gold-500 text-ivory" />
                    <input type="text" placeholder="Rôle" value={formData.role || ""} onChange={(e) => setFormData({ ...formData, role: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-gold-500 text-ivory" />
                    <input type="text" placeholder="Zone" value={formData.area || ""} onChange={(e) => setFormData({ ...formData, area: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-gold-500 text-ivory" />
                    <select value={formData.status || "active"} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-gold-500 text-ivory">
                      <option value="active">Actif</option>
                      <option value="occasional">Occasionnel</option>
                      <option value="pending">En attente</option>
                    </select>
                    <input type="tel" placeholder="Téléphone" value={formData.phone || ""} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-gold-500 text-ivory" />
                    <textarea placeholder="Notes" value={formData.notes || ""} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-gold-500 text-ivory md:col-span-2" rows={2} />
                  </>
                )}
              </div>
              
              <div className="flex gap-3 mt-6">
                <button onClick={saveItem} className="bg-gold-500 text-midnight px-6 py-2 rounded-full font-medium hover:bg-gold-400 transition-colors">
                  {editingId ? "Mettre à jour" : "Enregistrer"}
                </button>
                <button onClick={resetForm} className="bg-white/10 px-6 py-2 rounded-full hover:bg-white/20 transition-colors">Annuler</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* LISTES PAR TAB */}
        <div className="space-y-3">
          {isLoading ? (
            <div className="text-center py-12 text-gray-500">Chargement...</div>
          ) : activeTab === "infrastructure" && infrastructure.length === 0 ? (
            <div className="text-center py-12 text-gray-500">Aucune infrastructure</div>
          ) : activeTab === "production" && production.length === 0 ? (
            <div className="text-center py-12 text-gray-500">Aucune unité de production</div>
          ) : activeTab === "spending" && spending.length === 0 ? (
            <div className="text-center py-12 text-gray-500">Aucune dépense</div>
          ) : activeTab === "team" && team.length === 0 ? (
            <div className="text-center py-12 text-gray-500">Aucun membre dans l'équipe</div>
          ) : (
            <>
              {activeTab === "infrastructure" && infrastructure.map(item => {
                const Icon = infraTypeConfig[item.type].icon;
                return (
                  <div key={item.id} className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-colors">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 flex-wrap mb-2">
                          <h3 className="text-ivory font-medium">{item.name}</h3>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${infraTypeConfig[item.type].color}`}>
                            <Icon className="w-3 h-3 inline mr-1" /> {infraTypeConfig[item.type].label}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${statusConfig[item.status].color}`}>
                            {statusConfig[item.status].label}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500">📍 {item.location_on_site}</div>
                        {item.responsible_person && <div className="text-xs text-gray-500">👤 {item.responsible_person}</div>}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => editItem(item, "infrastructure")} className="text-gray-500 hover:text-gold-500"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => deleteItem("farm_infrastructure", item.id)} className="text-gray-500 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {activeTab === "production" && production.map(item => {
                const Icon = productionCategoryConfig[item.category].icon;
                return (
                  <div key={item.id} className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-colors">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 flex-wrap mb-2">
                          <h3 className="text-ivory font-medium">{item.name}</h3>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${productionCategoryConfig[item.category].color}`}>
                            <Icon className="w-3 h-3 inline mr-1" /> {productionCategoryConfig[item.category].label}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${statusConfig[item.status].color}`}>
                            {statusConfig[item.status].label}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500">📦 Capacité: {item.current_capacity}</div>
                        {item.technical_lead && <div className="text-xs text-gray-500">🔧 Lead: {item.technical_lead}</div>}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => editItem(item, "production")} className="text-gray-500 hover:text-gold-500"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => deleteItem("farm_production_units", item.id)} className="text-gray-500 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {activeTab === "spending" && spending.map(item => (
                <div key={item.id} className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-colors">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 flex-wrap mb-2">
                        <h3 className="text-ivory font-medium">{item.title}</h3>
                        <span className="text-sm text-red-400 font-medium">{item.amount.toLocaleString()} CFA</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${item.verified ? "bg-emerald-500/20 text-emerald-400" : "bg-yellow-500/20 text-yellow-400"}`}>
                          {item.verified ? "✓ Vérifié" : "⏳ En attente"}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">📂 {spendingCategoryConfig[item.category]?.label || item.category} • 📍 {item.project_area}</div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => editItem(item, "spending")} className="text-gray-500 hover:text-gold-500"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => deleteItem("farm_spending", item.id)} className="text-gray-500 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                </div>
              ))}

              {activeTab === "team" && team.map(item => (
                <div key={item.id} className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-colors">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 flex-wrap mb-2">
                        <h3 className="text-ivory font-medium">{item.name}</h3>
                        <span className="text-xs text-gold-500">{item.role}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${item.status === "active" ? "bg-emerald-500/20 text-emerald-400" : item.status === "occasional" ? "bg-blue-500/20 text-blue-400" : "bg-yellow-500/20 text-yellow-400"}`}>
                          {item.status === "active" ? "Actif" : item.status === "occasional" ? "Occasionnel" : "En attente"}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">📍 {item.area}</div>
                      {item.phone && <div className="text-xs text-gray-500">📞 {item.phone}</div>}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => editItem(item, "team")} className="text-gray-500 hover:text-gold-500"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => deleteItem("farm_team", item.id)} className="text-gray-500 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
