"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import LoadingSpinner from "@/components/LoadingSpinner";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Wallet, TrendingUp, TrendingDown, Plus, Trash2, Edit2, 
  X, Check, Calendar, FolderOpen, Tag, Loader2, RefreshCw,
  Download
} from "lucide-react";
import { exportFinancialToPDF } from "@/lib/exportPDF";
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';

// Enregistrer les composants Chart.js
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

// Types
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

export default function MoneyPage() {
  const [spending, setSpending] = useState<Spending[]>([]);
  const [revenue, setRevenue] = useState<Revenue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<"spending" | "revenue">("spending");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterProject, setFilterProject] = useState<string>("all");
  const [filterMonth, setFilterMonth] = useState<string>("all");

  // Fonction scroll vers formulaire
  const scrollToForm = () => {
    setTimeout(() => {
      const formElement = document.getElementById('form-container');
      if (formElement) {
        formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 150);
  };
  
  // Formulaire
  const [formData, setFormData] = useState({
    title: "",
    amount: "",
    category: "materials",
    project: "Ifè Farm",
    date: new Date().toISOString().split('T')[0],
    notes: ""
  });

  // Projets disponibles
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
    { value: "other", label: "Autre", color: "bg-gray-500/20 text-gray-400" }
  ];

  // Charger les données
  useEffect(() => {
    fetchData();
    
    const spendingChannel = supabase
      .channel('spending_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'spending' }, () => fetchData())
      .subscribe();
    
    const revenueChannel = supabase
      .channel('revenue_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'revenue' }, () => fetchData())
      .subscribe();
    
    return () => {
      spendingChannel.unsubscribe();
      revenueChannel.unsubscribe();
    };
  }, []);

  async function fetchData() {
    setIsLoading(true);
    
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
    setIsLoading(false);
  }

  async function addEntry() {
    const table = formType === "spending" ? "spending" : "revenue";
    const data = {
      title: formData.title,
      amount: parseFloat(formData.amount),
      category: formData.category,
      project: formData.project,
      date: formData.date,
      notes: formData.notes || null
    };
    
    const { error } = await supabase.from(table).insert(data);
    if (!error) {
      resetForm();
      fetchData();
    } else {
      alert("Erreur: " + error.message);
    }
  }

  async function updateEntry() {
    const table = formType === "spending" ? "spending" : "revenue";
    const data = {
      title: formData.title,
      amount: parseFloat(formData.amount),
      category: formData.category,
      project: formData.project,
      date: formData.date,
      notes: formData.notes || null
    };
    
    const { error } = await supabase.from(table).update(data).eq("id", editingId);
    if (!error) {
      resetForm();
      fetchData();
    } else {
      alert("Erreur: " + error.message);
    }
  }

  async function deleteEntry(table: string, id: string) {
    if (confirm("Supprimer cette entrée ?")) {
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (!error) fetchData();
    }
  }

  function editEntry(entry: Spending | Revenue, type: "spending" | "revenue") {
    setFormType(type);
    setFormData({
      title: "title" in entry ? entry.title : entry.source,
      amount: entry.amount.toString(),
      category: "category" in entry ? entry.category : "other",
      project: entry.project,
      date: entry.date,
      notes: entry.notes || ""
    });
    setEditingId(entry.id);
    setShowForm(true);
    scrollToForm();  
  }

  function resetForm() {
    setShowForm(false);
    setEditingId(null);
    setFormData({
      title: "",
      amount: "",
      category: "materials",
      project: "Ifè Farm",
      date: new Date().toISOString().split('T')[0],
      notes: ""
    });
  }

  // Filtrage
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

  // Calculs
  const totalSpending = filteredSpending.reduce((sum, s) => sum + (s.amount || 0), 0);
  const totalRevenue = filteredRevenue.reduce((sum, r) => sum + (r.amount || 0), 0);
  const balance = totalRevenue - totalSpending;

  // Dépenses par catégorie
  const spendingByCategory = categories.map(cat => ({
    ...cat,
    total: filteredSpending.filter(s => s.category === cat.value).reduce((sum, s) => sum + s.amount, 0)
  })).filter(c => c.total > 0);

  // Mois disponibles
  const availableMonths = [...new Set([
    ...spending.map(s => new Date(s.date).toLocaleString('fr-FR', { month: 'long', year: 'numeric' })),
    ...revenue.map(r => new Date(r.date).toLocaleString('fr-FR', { month: 'long', year: 'numeric' }))
  ])];

  // Configuration du graphique des dépenses par catégorie
  const categoryChartData = {
    labels: spendingByCategory.map(c => c.label),
    datasets: [{
      label: 'Dépenses (CFA)',
      data: spendingByCategory.map(c => c.total),
      backgroundColor: [
        'rgba(212, 175, 55, 0.8)',
        'rgba(212, 175, 55, 0.6)',
        'rgba(212, 175, 55, 0.4)',
        'rgba(212, 175, 55, 0.3)',
        'rgba(212, 175, 55, 0.2)',
      ],
      borderColor: '#D4AF37',
      borderWidth: 1,
    }]
  };

  // Configuration du graphique d'évolution
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
        {
          label: 'Revenus',
          data: months.map(m => monthlyData[m].revenue),
          backgroundColor: 'rgba(16, 185, 129, 0.6)',
          borderColor: '#10b981',
          borderWidth: 2,
        },
        {
          label: 'Dépenses',
          data: months.map(m => monthlyData[m].spending),
          backgroundColor: 'rgba(239, 68, 68, 0.6)',
          borderColor: '#ef4444',
          borderWidth: 2,
        }
      ]
    };
  };

  return (
    <div className="h-full flex flex-col overflow-y-auto bg-midnight">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-4xl font-serif text-gold-500 tracking-tight">Money Command</h1>
            <p className="text-gray-500 text-sm mt-1">Gestion financière complète</p>
          </div>
          {/* BOUTON EXPORT PDF */}
          <button
            onClick={() => exportFinancialToPDF(spending, revenue)}
            className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
            title="Exporter les finances en PDF"
          >
            <Download className="w-5 h-5 text-gold-500" />
          </button>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => fetchData()}
            className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors"
          >
            <RefreshCw className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>

      {/* ZONE À EXPORTER */}
      <div>
        {/* FILTRES */}
        <div className="flex flex-wrap gap-3 mb-6">
          <select
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-gold-500"
          >
            <option value="all">📁 Tous les projets</option>
            {projects.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          
          <select
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-gold-500"
          >
            <option value="all">📅 Tous les mois</option>
            {availableMonths.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        {/* STATS CARTES */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
          <motion.div whileHover={{ y: -2 }} className="bg-gradient-to-br from-emerald-500/10 to-transparent border border-emerald-500/20 rounded-2xl p-6">
            <div className="flex items-center gap-2 text-emerald-400 mb-2">
              <TrendingUp className="w-5 h-5" />
              <span className="text-sm uppercase tracking-wider">Revenus</span>
            </div>
            <div className="text-2xl font-serif text-ivory">{totalRevenue.toLocaleString()} CFA</div>
          </motion.div>
          
          <motion.div whileHover={{ y: -2 }} className="bg-gradient-to-br from-red-500/10 to-transparent border border-red-500/20 rounded-2xl p-6">
            <div className="flex items-center gap-2 text-red-400 mb-2">
              <TrendingDown className="w-5 h-5" />
              <span className="text-sm uppercase tracking-wider">Dépenses</span>
            </div>
            <div className="text-2xl font-serif text-ivory">{totalSpending.toLocaleString()} CFA</div>
          </motion.div>
          
          <motion.div whileHover={{ y: -2 }} className={`bg-gradient-to-br from-gold-500/10 to-transparent border rounded-2xl p-6 ${balance >= 0 ? 'border-emerald-500/20' : 'border-red-500/20'}`}>
            <div className="flex items-center gap-2 text-gold-500 mb-2">
              <Wallet className="w-5 h-5" />
              <span className="text-sm uppercase tracking-wider">Solde net</span>
            </div>
            <div className={`text-2xl font-serif ${balance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {balance.toLocaleString()} CFA
            </div>
          </motion.div>
        </div>

        {/* GRAPHIQUES */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {spendingByCategory.length > 0 && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <h2 className="text-sm font-serif text-gold-500 mb-4">📊 Dépenses par catégorie</h2>
              <div className="h-64">
                <Pie data={categoryChartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: '#F5F5F0' } } } }} />
              </div>
            </div>
          )}
          
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <h2 className="text-sm font-serif text-gold-500 mb-4">📈 Évolution 6 mois</h2>
            <div className="h-64">
              <Bar data={getMonthlyEvolution()} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top', labels: { color: '#F5F5F0' } } }, scales: { x: { ticks: { color: '#9CA3AF' } }, y: { ticks: { color: '#9CA3AF' } } } }} />
            </div>
          </div>
        </div>

        {/* ANALYSE PAR CATÉGORIE (texte) */}
        {spendingByCategory.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm uppercase tracking-wider text-gray-500 mb-3">📊 Répartition des dépenses</h2>
            <div className="flex flex-wrap gap-3">
              {spendingByCategory.map(cat => (
                <div key={cat.value} className={`px-4 py-2 rounded-full text-sm ${cat.color}`}>
                  {cat.label}: {cat.total.toLocaleString()} CFA
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TABLEAUX DÉPENSES ET REVENUS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* DÉPENSES */}
          <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            <div className="p-5 border-b border-white/10 flex justify-between items-center">
              <h2 className="text-lg font-serif text-red-400">📤 Dépenses</h2>
              <span className="text-sm text-gray-500">{filteredSpending.length} entrées</span>
            </div>
            <div className="divide-y divide-white/5 max-h-[500px] overflow-y-auto">
              {isLoading ? (
                <LoadingSpinner />
              ) : filteredSpending.length === 0 ? (
                <div className="p-8 text-center text-gray-500">Aucune dépense</div>
              ) : (
                filteredSpending.map((s) => (
                  <div key={s.id} className="p-4 hover:bg-white/5 transition-colors">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="text-ivory font-medium">{s.title}</p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <FolderOpen className="w-3 h-3" /> {s.project}
                          </span>
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <Tag className="w-3 h-3" /> {categories.find(c => c.value === s.category)?.label || s.category}
                          </span>
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> {new Date(s.date).toLocaleDateString('fr-FR')}
                          </span>
                        </div>
                        {s.notes && <p className="text-xs text-gray-600 mt-1">{s.notes}</p>}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-red-400 font-medium">{s.amount.toLocaleString()} CFA</span>
                        <button onClick={() => editEntry(s, "spending")} className="text-gray-500 hover:text-gold-500">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => deleteEntry("spending", s.id)} className="text-gray-500 hover:text-red-400">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* REVENUS */}
          <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            <div className="p-5 border-b border-white/10 flex justify-between items-center">
              <h2 className="text-lg font-serif text-emerald-400">📥 Revenus</h2>
              <span className="text-sm text-gray-500">{filteredRevenue.length} entrées</span>
            </div>
            <div className="divide-y divide-white/5 max-h-[500px] overflow-y-auto">
              {isLoading ? (
                <LoadingSpinner />
              ) : filteredRevenue.length === 0 ? (
                <div className="p-8 text-center text-gray-500">Aucun revenu</div>
              ) : (
                filteredRevenue.map((r) => (
                  <div key={r.id} className="p-4 hover:bg-white/5 transition-colors">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="text-ivory font-medium">{r.source}</p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <FolderOpen className="w-3 h-3" /> {r.project}
                          </span>
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> {new Date(r.date).toLocaleDateString('fr-FR')}
                          </span>
                        </div>
                        {r.notes && <p className="text-xs text-gray-600 mt-1">{r.notes}</p>}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-emerald-400 font-medium">{r.amount.toLocaleString()} CFA</span>
                        <button onClick={() => editEntry(r, "revenue")} className="text-gray-500 hover:text-gold-500">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => deleteEntry("revenue", r.id)} className="text-gray-500 hover:text-red-400">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* BOUTONS D'AJOUT (hors zone export) */}
      <div className="flex gap-4 mt-6">
        <button
            onClick={() => { 
              setFormType("spending"); 
              setShowForm(true); 
              setEditingId(null);
              scrollToForm();
            }}
          className="bg-red-500/20 text-red-400 px-5 py-2 rounded-full text-sm font-medium hover:bg-red-500/30 transition-all flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Dépense
        </button>
        <button
          onClick={() => {      setFormType("revenue");      setShowForm(true);      setEditingId(null);     scrollToForm();   }}
          className="bg-emerald-500/20 text-emerald-400 px-5 py-2 rounded-full text-sm font-medium hover:bg-emerald-500/30 transition-all flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Revenu
        </button>
      </div>

      {/* FORMULAIRE MODAL (hors zone export) */}
      <AnimatePresence>
        {showForm && (
          <motion.div id="form-container" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 mt-6">      
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-serif text-ivory">
                {editingId ? "Modifier" : "Nouvelle"} {formType === "spending" ? "dépense" : "revenu"}
              </h3>
              <button onClick={resetForm} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Titre / Description"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-gold-500 text-ivory"
              />
              <input
                type="number"
                placeholder="Montant (CFA)"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-gold-500 text-ivory"
              />
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-gold-500 text-ivory"
              >
                {categories.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
              <select
                value={formData.project}
                onChange={(e) => setFormData({ ...formData, project: e.target.value })}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-gold-500 text-ivory"
              >
                {projects.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-gold-500 text-ivory"
              />
              <textarea
                placeholder="Notes (optionnel)"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-gold-500 text-ivory md:col-span-2"
                rows={2}
              />
            </div>
            
            <div className="flex gap-3 mt-6">
              <button onClick={editingId ? updateEntry : addEntry} className="bg-gold-500 text-midnight px-6 py-2 rounded-full font-medium hover:bg-gold-400 transition-colors">
                {editingId ? "Mettre à jour" : "Enregistrer"}
              </button>
              <button onClick={resetForm} className="bg-white/10 px-6 py-2 rounded-full hover:bg-white/20 transition-colors">
                Annuler
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
