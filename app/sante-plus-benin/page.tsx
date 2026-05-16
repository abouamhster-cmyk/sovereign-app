Voici le code complet et propre de `app/sante-plus-benin/page.tsx` :

```tsx
"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useUserId } from "@/hooks/useUserId";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Heart, Users, Calendar, DollarSign, Briefcase, 
  Globe, Phone, Mail, MapPin, Clock, CheckCircle,
  Plus, Edit2, Trash2, X, Loader2, Target, TrendingUp,
  AlertCircle, Building2, Handshake, FileText, Sparkles
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

type Client = {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  status: string;
  service_type: string;
  notes: string;
  created_at: string;
};

type Visit = {
  id: string;
  client_id: string;
  client_name?: string;
  date: string;
  duration: number;
  service: string;
  notes: string;
  status: string;
};

type Staff = {
  id: string;
  name: string;
  role: string;
  phone: string;
  email: string;
  status: string;
  hourly_rate: number;
  notes: string;
};

type BeninProject = {
  id: string;
  name: string;
  category: string;
  status: string;
  priority: string;
  deadline: string;
  budget: number;
  spent: number;
  next_action: string;
  notes: string;
};

type BeninOpportunity = {
  id: string;
  title: string;
  type: string;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  status: string;
  priority: string;
  estimated_value: number;
  next_action: string;
  notes: string;
};

export default function SantePlusBeninPage() {
  const { userId, loading: userIdLoading } = useUserId();
  const [activeTab, setActiveTab] = useState<"clients" | "visits" | "staff" | "benin-projects" | "benin-opportunities">("clients");
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Données
  const [clients, setClients] = useState<Client[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [beninProjects, setBeninProjects] = useState<BeninProject[]>([]);
  const [beninOpportunities, setBeninOpportunities] = useState<BeninOpportunity[]>([]);
  
  // Formulaire
  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    if (userId) {
      fetchAllData();
    }
  }, [userId]);

  async function fetchAllData() {
    setIsLoading(true);
    await Promise.all([
      fetchClients(),
      fetchVisits(),
      fetchStaff(),
      fetchBeninProjects(),
      fetchBeninOpportunities()
    ]);
    setIsLoading(false);
  }

  async function fetchClients() {
    if (!userId) return;
    const { data } = await supabase
      .from("sante_plus_clients")
      .select("*")
      .eq("user_id", userId)
      .order("name");
    setClients(data || []);
  }

  async function fetchVisits() {
    if (!userId) return;
    const { data } = await supabase
      .from("sante_plus_visits")
      .select("*")
      .eq("user_id", userId)
      .order("date", { ascending: false });
    
    // Enrichir avec les noms des clients
    const enriched = await Promise.all((data || []).map(async (visit) => {
      const { data: client } = await supabase
        .from("sante_plus_clients")
        .select("name")
        .eq("id", visit.client_id)
        .single();
      return { ...visit, client_name: client?.name || "Inconnu" };
    }));
    setVisits(enriched);
  }

  async function fetchStaff() {
    if (!userId) return;
    const { data } = await supabase
      .from("sante_plus_staff")
      .select("*")
      .eq("user_id", userId)
      .order("name");
    setStaff(data || []);
  }

  async function fetchBeninProjects() {
    if (!userId) return;
    const { data } = await supabase
      .from("benin_projects")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    setBeninProjects(data || []);
  }

  async function fetchBeninOpportunities() {
    if (!userId) return;
    const { data } = await supabase
      .from("benin_opportunities")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    setBeninOpportunities(data || []);
  }

  async function saveItem() {
    let table = "";
    let data = {};
    
    if (activeTab === "clients") {
      table = "sante_plus_clients";
      data = {
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        address: formData.address,
        status: formData.status || "active",
        service_type: formData.service_type,
        notes: formData.notes,
        user_id: userId
      };
    } else if (activeTab === "visits") {
      table = "sante_plus_visits";
      data = {
        client_id: formData.client_id,
        date: formData.date,
        duration: formData.duration,
        service: formData.service,
        notes: formData.notes,
        status: formData.status || "scheduled",
        user_id: userId
      };
    } else if (activeTab === "staff") {
      table = "sante_plus_staff";
      data = {
        name: formData.name,
        role: formData.role,
        phone: formData.phone,
        email: formData.email,
        status: formData.status || "active",
        hourly_rate: formData.hourly_rate,
        notes: formData.notes,
        user_id: userId
      };
    } else if (activeTab === "benin-projects") {
      table = "benin_projects";
      data = {
        name: formData.name,
        category: formData.category,
        status: formData.status || "idea",
        priority: formData.priority || "normal",
        deadline: formData.deadline,
        budget: formData.budget,
        spent: formData.spent || 0,
        next_action: formData.next_action,
        notes: formData.notes,
        user_id: userId
      };
    } else if (activeTab === "benin-opportunities") {
      table = "benin_opportunities";
      data = {
        title: formData.title,
        type: formData.type,
        contact_name: formData.contact_name,
        contact_phone: formData.contact_phone,
        contact_email: formData.contact_email,
        status: formData.status || "new",
        priority: formData.priority || "medium",
        estimated_value: formData.estimated_value,
        next_action: formData.next_action,
        notes: formData.notes,
        user_id: userId
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
      toast.success(editingId ? "Mis à jour" : "Ajouté");
      resetForm();
      await fetchAllData();
    } else {
      toast.error("Erreur: " + error.message);
    }
  }

  async function deleteItem(table: string, id: string) {
    if (confirm("Supprimer ?")) {
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (!error) {
        toast.success("Supprimé");
        await fetchAllData();
      }
    }
  }

  function editItem(item: any, type: string) {
    setEditingId(item.id);
    setFormData(item);
    setShowForm(true);
    setTimeout(() => {
      document.getElementById("form-container")?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }

  function resetForm() {
    setShowForm(false);
    setEditingId(null);
    setFormData({});
  }

  // Statistiques
  const stats = {
    clients: clients.length,
    active_clients: clients.filter(c => c.status === "active").length,
    visits_today: visits.filter(v => v.date === new Date().toISOString().split('T')[0]).length,
    staff_active: staff.filter(s => s.status === "active").length,
    benin_projects: beninProjects.length,
    benin_opportunities: beninOpportunities.filter(o => o.status === "new").length
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) return "Aujourd'hui";
    if (date.toDateString() === tomorrow.toDateString()) return "Demain";
    return date.toLocaleDateString('fr-FR');
  };

  const getPriorityColor = (priority: string) => {
    switch(priority) {
      case "critical": return "bg-red-500/20 text-red-400";
      case "high": return "bg-orange-500/20 text-orange-400";
      case "normal": return "bg-blue-500/20 text-blue-400";
      default: return "bg-gray-500/20 text-gray-400";
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case "active": return "bg-emerald-500/20 text-emerald-400";
      case "completed": return "bg-green-500/20 text-green-400";
      case "scheduled": return "bg-blue-500/20 text-blue-400";
      case "cancelled": return "bg-red-500/20 text-red-400";
      case "new": return "bg-yellow-500/20 text-yellow-400";
      default: return "bg-gray-500/20 text-gray-400";
    }
  };

  const categoriesBenin = {
    relocation: { label: "🚚 Relocalisation", color: "bg-cyan-500/20 text-cyan-400" },
    business: { label: "💼 Business", color: "bg-purple-500/20 text-purple-400" },
    community: { label: "🤝 Communauté", color: "bg-emerald-500/20 text-emerald-400" },
    real_estate: { label: "🏠 Immobilier", color: "bg-orange-500/20 text-orange-400" },
    other: { label: "📁 Autre", color: "bg-gray-500/20 text-gray-400" }
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
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 text-gold-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-y-auto bg-midnight p-4 md:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto w-full">
        {/* HEADER */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Heart className="w-8 h-8 text-pink-400" />
            <Globe className="w-8 h-8 text-cyan-400" />
            <h1 className="text-3xl md:text-4xl font-serif text-gold-500 tracking-tight">
              Santé Plus & Bénin
            </h1>
          </div>
          <p className="text-gray-500 text-sm">
            Coordination des soins à domicile et projets Bénin
          </p>
        </div>

        {/* Bloc Becks */}
        <div className="bg-pink-500/10 border border-pink-500/20 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-3">
            <Heart className="w-5 h-5 text-pink-400" />
            <div>
              <p className="text-sm text-pink-400 font-medium">Becks - Santé Plus & Bénin</p>
              <p className="text-sm text-ivory">
                📊 {stats.clients} clients actifs • 🏠 {stats.benin_projects} projets Bénin • 💼 {stats.benin_opportunities} opportunités
              </p>
            </div>
          </div>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
            <Users className="w-5 h-5 text-blue-400 mx-auto mb-2" />
            <div className="text-2xl font-serif text-ivory">{stats.clients}</div>
            <div className="text-xs text-gray-500">Clients</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
            <Calendar className="w-5 h-5 text-emerald-400 mx-auto mb-2" />
            <div className="text-2xl font-serif text-emerald-400">{stats.visits_today}</div>
            <div className="text-xs text-gray-500">Visites aujourd'hui</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
            <Briefcase className="w-5 h-5 text-purple-400 mx-auto mb-2" />
            <div className="text-2xl font-serif text-purple-400">{stats.staff_active}</div>
            <div className="text-xs text-gray-500">Personnel actif</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
            <Building2 className="w-5 h-5 text-cyan-400 mx-auto mb-2" />
            <div className="text-2xl font-serif text-cyan-400">{stats.benin_projects}</div>
            <div className="text-xs text-gray-500">Projets Bénin</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
            <Handshake className="w-5 h-5 text-yellow-400 mx-auto mb-2" />
            <div className="text-2xl font-serif text-yellow-400">{stats.benin_opportunities}</div>
            <div className="text-xs text-gray-500">Opportunités</div>
          </div>
        </div>

        {/* TABS */}
        <div className="flex flex-wrap gap-2 border-b border-white/10 mb-6 overflow-x-auto pb-2">
          <button
            onClick={() => setActiveTab("clients")}
            className={`px-4 py-2 text-sm flex items-center gap-2 transition-colors rounded-lg ${
              activeTab === "clients" ? "bg-gold-500/20 text-gold-500" : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Users className="w-4 h-4" /> Clients
          </button>
          <button
            onClick={() => setActiveTab("visits")}
            className={`px-4 py-2 text-sm flex items-center gap-2 transition-colors rounded-lg ${
              activeTab === "visits" ? "bg-gold-500/20 text-gold-500" : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Calendar className="w-4 h-4" /> Visites
          </button>
          <button
            onClick={() => setActiveTab("staff")}
            className={`px-4 py-2 text-sm flex items-center gap-2 transition-colors rounded-lg ${
              activeTab === "staff" ? "bg-gold-500/20 text-gold-500" : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Briefcase className="w-4 h-4" /> Personnel
          </button>
          <button
            onClick={() => setActiveTab("benin-projects")}
            className={`px-4 py-2 text-sm flex items-center gap-2 transition-colors rounded-lg ${
              activeTab === "benin-projects" ? "bg-gold-500/20 text-gold-500" : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Building2 className="w-4 h-4" /> Projets Bénin
          </button>
          <button
            onClick={() => setActiveTab("benin-opportunities")}
            className={`px-4 py-2 text-sm flex items-center gap-2 transition-colors rounded-lg ${
              activeTab === "benin-opportunities" ? "bg-gold-500/20 text-gold-500" : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Handshake className="w-4 h-4" /> Opportunités
          </button>
        </div>

        {/* BOUTON AJOUTER */}
        <div className="flex justify-end mb-4">
          <button
            onClick={() => { setShowForm(true); setEditingId(null); setFormData({}); }}
            className="bg-gold-500 text-midnight px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 hover:bg-gold-400 transition-colors"
          >
            <Plus className="w-4 h-4" /> Ajouter
          </button>
        </div>

        {/* FORMULAIRE */}
        <AnimatePresence>
          {showForm && (
            <motion.div id="form-container" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 mb-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-serif text-ivory">
                  {editingId ? "Modifier" : "Ajouter"} - {
                    activeTab === "clients" ? "Client" :
                    activeTab === "visits" ? "Visite" :
                    activeTab === "staff" ? "Personnel" :
                    activeTab === "benin-projects" ? "Projet Bénin" :
                    "Opportunité"
                  }
                </h3>
                <button onClick={resetForm} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeTab === "clients" && (
                  <>
                    <input type="text" placeholder="Nom complet" value={formData.name || ""} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-ivory" />
                    <input type="tel" placeholder="Téléphone" value={formData.phone || ""} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-ivory" />
                    <input type="email" placeholder="Email" value={formData.email || ""} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-ivory" />
                    <input type="text" placeholder="Adresse" value={formData.address || ""} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-ivory" />
                    <select value={formData.status || "active"} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-ivory">
                      <option value="active">Actif</option>
                      <option value="inactive">Inactif</option>
                    </select>
                    <input type="text" placeholder="Type de service" value={formData.service_type || ""} onChange={(e) => setFormData({ ...formData, service_type: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-ivory" />
                    <textarea placeholder="Notes" value={formData.notes || ""} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-ivory md:col-span-2" rows={2} />
                  </>
                )}

                {activeTab === "visits" && (
                  <>
                    <select value={formData.client_id || ""} onChange={(e) => setFormData({ ...formData, client_id: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-ivory">
                      <option value="">Sélectionner un client</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <input type="date" placeholder="Date" value={formData.date || ""} onChange={(e) => setFormData({ ...formData, date: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-ivory" />
                    <input type="number" placeholder="Durée (minutes)" value={formData.duration || ""} onChange={(e) => setFormData({ ...formData, duration: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-ivory" />
                    <input type="text" placeholder="Service" value={formData.service || ""} onChange={(e) => setFormData({ ...formData, service: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-ivory" />
                    <select value={formData.status || "scheduled"} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-ivory">
                      <option value="scheduled">Planifiée</option>
                      <option value="completed">Réalisée</option>
                      <option value="cancelled">Annulée</option>
                    </select>
                    <textarea placeholder="Notes" value={formData.notes || ""} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-ivory md:col-span-2" rows={2} />
                  </>
                )}

                {activeTab === "staff" && (
                  <>
                    <input type="text" placeholder="Nom" value={formData.name || ""} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-ivory" />
                    <input type="text" placeholder="Rôle" value={formData.role || ""} onChange={(e) => setFormData({ ...formData, role: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-ivory" />
                    <input type="tel" placeholder="Téléphone" value={formData.phone || ""} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-ivory" />
                    <input type="email" placeholder="Email" value={formData.email || ""} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-ivory" />
                    <select value={formData.status || "active"} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-ivory">
                      <option value="active">Actif</option>
                      <option value="inactive">Inactif</option>
                    </select>
                    <input type="number" placeholder="Taux horaire (CFA)" value={formData.hourly_rate || ""} onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-ivory" />
                    <textarea placeholder="Notes" value={formData.notes || ""} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-ivory md:col-span-2" rows={2} />
                  </>
                )}

                {activeTab === "benin-projects" && (
                  <>
                    <input type="text" placeholder="Nom du projet" value={formData.name || ""} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-ivory md:col-span-2" />
                    <select value={formData.category || "other"} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-ivory">
                      {Object.entries(categoriesBenin).map(([key, conf]) => <option key={key} value={key}>{conf.label}</option>)}
                    </select>
                    <select value={formData.status || "idea"} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-ivory">
                      <option value="idea">💡 Idée</option>
                      <option value="planning">📋 Planification</option>
                      <option value="active">🚀 Actif</option>
                      <option value="paused">⏸️ En pause</option>
                      <option value="completed">✅ Terminé</option>
                    </select>
                    <select value={formData.priority || "normal"} onChange={(e) => setFormData({ ...formData, priority: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-ivory">
                      <option value="critical">⚠️ Critique</option>
                      <option value="high">🔴 Haute</option>
                      <option value="normal">🟡 Normale</option>
                      <option value="low">🟢 Basse</option>
                    </select>
                    <input type="date" placeholder="Date limite" value={formData.deadline || ""} onChange={(e) => setFormData({ ...formData, deadline: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-ivory" />
                    <input type="number" placeholder="Budget (CFA)" value={formData.budget || ""} onChange={(e) => setFormData({ ...formData, budget: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-ivory" />
                    <input type="number" placeholder="Dépensé (CFA)" value={formData.spent || ""} onChange={(e) => setFormData({ ...formData, spent: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-ivory" />
                    <input type="text" placeholder="Prochaine action" value={formData.next_action || ""} onChange={(e) => setFormData({ ...formData, next_action: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-ivory" />
                    <textarea placeholder="Notes" value={formData.notes || ""} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-ivory md:col-span-2" rows={2} />
                  </>
                )}

                {activeTab === "benin-opportunities" && (
                  <>
                    <input type="text" placeholder="Titre" value={formData.title || ""} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-ivory md:col-span-2" />
                    <select value={formData.type || "other"} onChange={(e) => setFormData({ ...formData, type: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-ivory">
                      <option value="partnership">🤝 Partenariat</option>
                      <option value="investment">💰 Investissement</option>
                      <option value="job">💼 Job</option>
                      <option value="contract">📄 Contrat</option>
                      <option value="other">📁 Autre</option>
                    </select>
                    <input type="text" placeholder="Contact" value={formData.contact_name || ""} onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-ivory" />
                    <input type="tel" placeholder="Téléphone contact" value={formData.contact_phone || ""} onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-ivory" />
                    <input type="email" placeholder="Email contact" value={formData.contact_email || ""} onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-ivory" />
                    <select value={formData.status || "new"} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-ivory">
                      <option value="new">🆕 Nouvelle</option>
                      <option value="contacted">📞 Contactée</option>
                      <option value="in_progress">🔄 En cours</option>
                      <option value="won">🏆 Gagnée</option>
                      <option value="lost">❌ Perdue</option>
                    </select>
                    <select value={formData.priority || "medium"} onChange={(e) => setFormData({ ...formData, priority: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-ivory">
                      <option value="high">🔴 Haute</option>
                      <option value="medium">🟡 Moyenne</option>
                      <option value="low">🟢 Basse</option>
                    </select>
                    <input type="number" placeholder="Valeur estimée (CFA)" value={formData.estimated_value || ""} onChange={(e) => setFormData({ ...formData, estimated_value: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-ivory" />
                    <input type="text" placeholder="Prochaine action" value={formData.next_action || ""} onChange={(e) => setFormData({ ...formData, next_action: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-ivory" />
                    <textarea placeholder="Notes" value={formData.notes || ""} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-ivory md:col-span-2" rows={2} />
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

        {/* LISTES */}
        <div className="space-y-3">
          {/* CLIENTS */}
          {activeTab === "clients" && clients.map(client => (
            <div key={client.id} className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-colors">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="text-ivory font-medium">{client.name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(client.status)}`}>
                      {client.status === "active" ? "Actif" : "Inactif"}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-4 mt-2 text-xs text-gray-500">
                    {client.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {client.phone}</span>}
                    {client.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {client.email}</span>}
                    {client.address && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {client.address}</span>}
                  </div>
                  {client.service_type && <p className="text-xs text-gray-400 mt-2">Service: {client.service_type}</p>}
                  {client.notes && <p className="text-xs text-gray-500 mt-1 italic">{client.notes}</p>}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => editItem(client, "clients")} className="text-gray-500 hover:text-gold-500"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => deleteItem("sante_plus_clients", client.id)} className="text-gray-500 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          ))}

          {/* VISITES */}
          {activeTab === "visits" && visits.map(visit => (
            <div key={visit.id} className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-colors">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="text-ivory font-medium">{visit.client_name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(visit.status)}`}>
                      {visit.status === "scheduled" ? "Planifiée" : visit.status === "completed" ? "Réalisée" : "Annulée"}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-4 mt-2 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {formatDate(visit.date)}</span>
                    {visit.duration && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {visit.duration} min</span>}
                    {visit.service && <span>{visit.service}</span>}
                  </div>
                  {visit.notes && <p className="text-xs text-gray-500 mt-1 italic">{visit.notes}</p>}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => editItem(visit, "visits")} className="text-gray-500 hover:text-gold-500"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => deleteItem("sante_plus_visits", visit.id)} className="text-gray-500 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          ))}

          {/* STAFF */}
          {activeTab === "staff" && staff.map(member => (
            <div key={member.id} className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-colors">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="text-ivory font-medium">{member.name}</h3>
                    <span className="text-xs text-gold-500">{member.role}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(member.status)}`}>
                      {member.status === "active" ? "Actif" : "Inactif"}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-4 mt-2 text-xs text-gray-500">
                    {member.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {member.phone}</span>}
                    {member.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {member.email}</span>}
                    {member.hourly_rate && <span>{member.hourly_rate.toLocaleString()} CFA/h</span>}
                  </div>
                  {member.notes && <p className="text-xs text-gray-500 mt-1 italic">{member.notes}</p>}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => editItem(member, "staff")} className="text-gray-500 hover:text-gold-500"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => deleteItem("sante_plus_staff", member.id)} className="text-gray-500 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          ))}

          {/* PROJETS BÉNIN */}
          {activeTab === "benin-projects" && beninProjects.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <Building2 className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>Aucun projet Bénin</p>
              <p className="text-sm mt-2">Clique sur "Ajouter" pour commencer</p>
            </div>
          )}
          {activeTab === "benin-projects" && beninProjects.map(project => {
            const categoryConf = categoriesBenin[project.category as keyof typeof categoriesBenin] || categoriesBenin.other;
            return (
              <div key={project.id} className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-colors">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="text-ivory font-medium">{project.name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${categoryConf.color}`}>{categoryConf.label}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${getPriorityColor(project.priority)}`}>
                        {project.priority === "critical" ? "Critique" : project.priority === "high" ? "Haute" : project.priority === "normal" ? "Normale" : "Basse"}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-4 mt-2 text-xs text-gray-500">
                      {project.deadline && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(project.deadline).toLocaleDateString('fr-FR')}</span>}
                      {project.budget > 0 && <span>💰 Budget: {project.budget.toLocaleString()} CFA</span>}
                      {project.spent > 0 && <span>💸 Dépensé: {project.spent.toLocaleString()} CFA</span>}
                    </div>
                    {project.next_action && <p className="text-xs text-gold-500 mt-2">🎯 {project.next_action}</p>}
                    {project.notes && <p className="text-xs text-gray-500 mt-1 italic">{project.notes}</p>}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => editItem(project, "benin-projects")} className="text-gray-500 hover:text-gold-500"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => deleteItem("benin_projects", project.id)} className="text-gray-500 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>
            );
          })}

          {/* OPPORTUNITÉS BÉNIN */}
          {activeTab === "benin-opportunities" && beninOpportunities.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <Handshake className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>Aucune opportunité Bénin</p>
              <p className="text-sm mt-2">Clique sur "Ajouter" pour commencer</p>
            </div>
          )}
          {activeTab === "benin-opportunities" && beninOpportunities.map(opp => (
            <div key={opp.id} className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-colors">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="text-ivory font-medium">{opp.title}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getPriorityColor(opp.priority)}`}>
                      {opp.priority === "high" ? "Haute" : opp.priority === "medium" ? "Moyenne" : "Basse"}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-4 mt-2 text-xs text-gray-500">
                    {opp.contact_name && <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {opp.contact_name}</span>}
                    {opp.estimated_value > 0 && <span className="text-emerald-400">{opp.estimated_value.toLocaleString()} CFA</span>}
                  </div>
                  {opp.next_action && <p className="text-xs text-gold-500 mt-2">🎯 {opp.next_action}</p>}
                  {opp.notes && <p className="text-xs text-gray-500 mt-1 italic">{opp.notes}</p>}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => editItem(opp, "benin-opportunities")} className="text-gray-500 hover:text-gold-500"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => deleteItem("benin_opportunities", opp.id)} className="text-gray-500 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Messages vides pour les autres onglets */}
        {activeTab === "clients" && clients.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p>Aucun client</p>
            <p className="text-sm mt-2">Clique sur "Ajouter" pour commencer</p>
          </div>
        )}
        {activeTab === "visits" && visits.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Calendar className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p>Aucune visite</p>
            <p className="text-sm mt-2">Clique sur "Ajouter" pour commencer</p>
          </div>
        )}
        {activeTab === "staff" && staff.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Briefcase className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p>Aucun membre du personnel</p>
            <p className="text-sm mt-2">Clique sur "Ajouter" pour commencer</p>
          </div>
        )}
      </div>
    </div>
  );
}
```
