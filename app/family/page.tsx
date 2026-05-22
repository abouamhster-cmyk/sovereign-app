"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import LoadingSpinner from "@/components/LoadingSpinner";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Calendar, Plus, Trash2, Edit2, X, Users, 
  Baby, Heart, Clock, AlertCircle, CheckCircle,
  School, Activity, Pill, Plane, Home, Star,
  FileCheck, CalendarDays, LayoutGrid, Loader2
} from "lucide-react";

// =====================================================
// TYPES OPTIMISÉS (colonnes nécessaires uniquement)
// =====================================================

type FamilyEvent = {
  id: string;
  title: string;
  child_name: string | null;
  category: "school" | "health" | "activity" | "travel" | "document" | "routine" | "supplies";
  priority: "critical" | "high" | "normal" | "low";
  status: "pending" | "prepared" | "done";
  date: string | null;
  notes: string | null;
  created_at: string;
};

type KidRecord = {
  id: string;
  name: string;
  child_name: string | null;
  type: string;
  status: string;
  file_url: string | null;
  expiry_date: string | null;
  notes: string | null;
  created_at: string;
};

// =====================================================
// CONFIGURATIONS
// =====================================================

const categoryConfig = {
  school: { label: "📚 École", icon: School, color: "bg-blue-500/20 text-blue-400" },
  health: { label: "🏥 Santé", icon: Pill, color: "bg-red-500/20 text-red-400" },
  activity: { label: "⚡ Activité", icon: Activity, color: "bg-purple-500/20 text-purple-400" },
  travel: { label: "✈️ Voyage", icon: Plane, color: "bg-cyan-500/20 text-cyan-400" },
  document: { label: "📄 Papiers", icon: Star, color: "bg-yellow-500/20 text-yellow-400" },
  routine: { label: "🔄 Routine", icon: Clock, color: "bg-green-500/20 text-green-400" },
  supplies: { label: "🛒 Fournitures", icon: Home, color: "bg-orange-500/20 text-orange-400" }
};

const priorityConfig = {
  critical: { label: "⚠️ Critique", color: "bg-red-500/20 text-red-400" },
  high: { label: "🔴 Haute", color: "bg-orange-500/20 text-orange-400" },
  normal: { label: "🟡 Normale", color: "bg-yellow-500/20 text-yellow-400" },
  low: { label: "🟢 Basse", color: "bg-green-500/20 text-green-400" }
};

const statusConfig = {
  pending: { label: "⏳ En attente", icon: Clock, color: "bg-yellow-500/20 text-yellow-400" },
  prepared: { label: "📦 Préparé", icon: CheckCircle, color: "bg-blue-500/20 text-blue-400" },
  done: { label: "✅ Fait", icon: CheckCircle, color: "bg-emerald-500/20 text-emerald-400" }
};

const childrenList = [
  "Tous",
  "Neriah Fumi",
  "Nylah Tiwa", 
  "Norah Ife",
  "Nyrel Sheyi"
];

// =====================================================
// COMPOSANT PRINCIPAL
// =====================================================

export default function FamilyPage() {
  const { user } = useAuth();  // ← OPTIMISATION: useAuth au lieu de useUserId
  const userId = user?.id || null;
  const [activeTab, setActiveTab] = useState<"overview" | "events" | "records">("overview");
  
  // Événements
  const [events, setEvents] = useState<FamilyEvent[]>([]);
  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [filterChild, setFilterChild] = useState<string>("Tous");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  
  // Dossiers enfants
  const [records, setRecords] = useState<KidRecord[]>([]);
  const [showRecordForm, setShowRecordForm] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  
  // États chargement
  const [isLoading, setIsLoading] = useState(true);
  
  // Formulaire événement
  const [eventForm, setEventForm] = useState({
    title: "",
    child_name: "",
    category: "school" as FamilyEvent["category"],
    priority: "normal" as FamilyEvent["priority"],
    status: "pending" as FamilyEvent["status"],
    date: "",
    notes: ""
  });
  
  // Formulaire dossier enfant
  const [recordForm, setRecordForm] = useState({
    name: "",
    child_name: "",
    type: "",
    status: "pending",
    expiry_date: "",
    notes: ""
  });

  // ========== CHARGEMENT OPTIMISÉ ==========
  useEffect(() => {
    if (!userId) return;
    
    const loadAllData = async () => {
      setIsLoading(true);
      await Promise.all([
        fetchEventsOptimized(),
        fetchKidsRecordsOptimized()
      ]);
      setIsLoading(false);
    };
    
    loadAllData();
    
    // Channel unifié pour les changements
    const channel = supabase
      .channel('family_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'family_events', filter: `user_id=eq.${userId}` }, 
        () => fetchEventsOptimized()
      )
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'kids_records', filter: `user_id=eq.${userId}` }, 
        () => fetchKidsRecordsOptimized()
      )
      .subscribe();
    
    return () => { channel.unsubscribe(); };
  }, [userId]);

  // ========== REQUÊTES OPTIMISÉES ==========
  async function fetchEventsOptimized() {
    if (!userId) return;
    
    const { data } = await supabase
      .from("family_events")
      .select("id, title, child_name, category, priority, status, date, notes, created_at")  // ← colonnes nécessaires
      .eq("user_id", userId)
      .order("date", { ascending: true, nullsFirst: false })
      .limit(100);  // ← limite
    
    setEvents(data || []);
  }
  
  async function fetchKidsRecordsOptimized() {
    if (!userId) return;
    
    const { data } = await supabase
      .from("kids_records")
      .select("id, name, child_name, type, status, file_url, expiry_date, notes, created_at")  // ← colonnes nécessaires
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(100);  // ← limite
    
    setRecords(data || []);
  }

  // ========== GESTION DES ÉVÉNEMENTS ==========
  async function saveEvent() {
    if (!userId) return;
    
    const data = {
      title: eventForm.title,
      child_name: eventForm.child_name || null,
      category: eventForm.category,
      priority: eventForm.priority,
      status: eventForm.status,
      date: eventForm.date || null,
      notes: eventForm.notes || null,
      user_id: userId  
    };
    
    let error;
    if (editingEventId) {
      const result = await supabase.from("family_events").update(data).eq("id", editingEventId);
      error = result.error;
    } else {
      const result = await supabase.from("family_events").insert(data);
      error = result.error;
    }
    
    if (!error) {
      resetEventForm();
      fetchEventsOptimized();
      toast.success(editingEventId ? "Événement modifié" : "Événement ajouté");
    } else {
      toast.error("Erreur: " + error.message);
    }
  }

  async function deleteEvent(id: string) {
    if (confirm("Supprimer cet événement ?")) {
      const { error } = await supabase.from("family_events").delete().eq("id", id);
      if (!error) fetchEventsOptimized();
    }
  }

  async function updateEventStatus(id: string, newStatus: FamilyEvent["status"]) {
    const { error } = await supabase.from("family_events").update({ status: newStatus }).eq("id", id);
    if (!error) fetchEventsOptimized();
  }

  function editEvent(event: FamilyEvent) {
    setEventForm({
      title: event.title,
      child_name: event.child_name || "",
      category: event.category,
      priority: event.priority,
      status: event.status,
      date: event.date || "",
      notes: event.notes || ""
    });
    setEditingEventId(event.id);
    setShowEventForm(true);
    setTimeout(() => {
      document.getElementById("form-container")?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }

  function resetEventForm() {
    setShowEventForm(false);
    setEditingEventId(null);
    setEventForm({
      title: "",
      child_name: "",
      category: "school",
      priority: "normal",
      status: "pending",
      date: "",
      notes: ""
    });
  }

  // ========== GESTION DES DOSSIERS ENFANTS ==========
  async function saveRecord() {
    if (!userId) return;
    
    const data = {
      name: recordForm.name,
      child_name: recordForm.child_name || null,
      type: recordForm.type,
      status: recordForm.status,
      expiry_date: recordForm.expiry_date || null,
      notes: recordForm.notes || null,
      user_id: userId 
    };
    
    let error;
    if (editingRecordId) {
      const result = await supabase.from("kids_records").update(data).eq("id", editingRecordId);
      error = result.error;
    } else {
      const result = await supabase.from("kids_records").insert(data);
      error = result.error;
    }
    
    if (!error) {
      resetRecordForm();
      fetchKidsRecordsOptimized();
      toast.success(editingRecordId ? "Dossier modifié" : "Dossier ajouté");
    } else {
      toast.error("Erreur: " + error.message);
    }
  }

  async function deleteRecord(id: string) {
    if (confirm("Supprimer ce dossier ?")) {
      const { error } = await supabase.from("kids_records").delete().eq("id", id);
      if (!error) fetchKidsRecordsOptimized();
    }
  }

  function editRecord(record: KidRecord) {
    setRecordForm({
      name: record.name,
      child_name: record.child_name || "",
      type: record.type || "",
      status: record.status || "pending",
      expiry_date: record.expiry_date || "",
      notes: record.notes || ""
    });
    setEditingRecordId(record.id);
    setShowRecordForm(true);
    setTimeout(() => {
      document.getElementById("form-container")?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }

  function resetRecordForm() {
    setShowRecordForm(false);
    setEditingRecordId(null);
    setRecordForm({
      name: "",
      child_name: "",
      type: "",
      status: "pending",
      expiry_date: "",
      notes: ""
    });
  }

  // ========== UTILITAIRES MEMOIZED ==========
  const formatDate = useCallback((dateStr: string) => {
    if (!dateStr) return "Date non définie";
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) return "Aujourd'hui";
    if (date.toDateString() === tomorrow.toDateString()) return "Demain";
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
  }, []);

  const getRecordStatusIcon = useCallback((status: string) => {
    const name = status?.toLowerCase() || "";
    if (name.includes("valid") || name.includes("fait") || name.includes("ok") || name.includes("done")) 
      return <CheckCircle className="w-4 h-4 text-emerald-400" />;
    if (name.includes("urgent") || name.includes("important")) 
      return <AlertCircle className="w-4 h-4 text-red-400" />;
    return <Clock className="w-4 h-4 text-yellow-400" />;
  }, []);

  const getRecordStatusColor = useCallback((status: string) => {
    const name = status?.toLowerCase() || "";
    if (name.includes("valid") || name.includes("fait") || name.includes("ok") || name.includes("done")) 
      return "bg-emerald-500/20 text-emerald-400";
    if (name.includes("urgent") || name.includes("important")) 
      return "bg-red-500/20 text-red-400";
    return "bg-yellow-500/20 text-yellow-400";
  }, []);

  // ========== STATS ET FILTRES MEMOIZED ==========
  const stats = useMemo(() => ({
    totalEvents: events.length,
    pendingEvents: events.filter(e => e.status === "pending").length,
    todayEvents: events.filter(e => e.date === new Date().toISOString().split('T')[0]).length,
    criticalEvents: events.filter(e => e.priority === "critical").length,
    totalRecords: records.length,
    completedRecords: records.filter(r => {
      const status = r.status || "";
      return status.toLowerCase().includes("valid") || status.toLowerCase().includes("fait") || status.toLowerCase().includes("done");
    }).length,
  }), [events, records]);

  const upcomingEvents = useMemo(() => {
    return events.filter(item => {
      if (!item.date) return false;
      const eventDate = new Date(item.date);
      const today = new Date();
      const nextWeek = new Date(today);
      nextWeek.setDate(today.getDate() + 7);
      return eventDate >= today && eventDate <= nextWeek && item.status !== "done";
    }).slice(0, 5);
  }, [events]);

  const filteredEvents = useMemo(() => {
    return events.filter(e => {
      if (filterChild !== "Tous" && e.child_name !== filterChild) return false;
      if (filterStatus !== "all" && e.status !== filterStatus) return false;
      return true;
    });
  }, [events, filterChild, filterStatus]);

  const scrollToForm = () => {
    setTimeout(() => {
      const formElement = document.getElementById('form-container');
      if (formElement) {
        formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 150);
  };

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
        <div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-y-auto bg-midnight p-4 md:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto w-full">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Heart className="w-8 h-8 text-pink-400" />
              <h1 className="text-3xl md:text-4xl font-serif text-gold-500 tracking-tight">
                Family Command
              </h1>
            </div>
            <p className="text-gray-500 text-sm">
              Logistique familiale et suivi des enfants
            </p>
          </div>
        </div>

        {/* Bloc Becks */}
        <div className="bg-gold-500/10 border border-gold-500/20 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-3">
            <Heart className="w-5 h-5 text-gold-500" />
            <div>
              <p className="text-sm text-gold-400 font-medium">Becks te conseille</p>
              <p className="text-sm text-ivory">
                {stats.pendingEvents > 0 
                  ? `📌 Tu as ${stats.pendingEvents} événement(s) à préparer et ${stats.totalRecords} dossier(s) enfant. On organise ça ?`
                  : `✨ ${stats.totalRecords} dossier(s) enfant enregistré(s). Rien d'urgent côté famille. Profite de ce calme !`}
              </p>
            </div>
          </div>
        </div>

        {/* STATISTIQUES COMBINÉES */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
          <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
            <Calendar className="w-5 h-5 text-gold-500 mx-auto mb-1" />
            <div className="text-xl font-serif text-ivory">{stats.totalEvents}</div>
            <div className="text-[10px] text-gray-500">Événements</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
            <Clock className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
            <div className="text-xl font-serif text-yellow-400">{stats.pendingEvents}</div>
            <div className="text-[10px] text-gray-500">En attente</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
            <AlertCircle className="w-5 h-5 text-orange-400 mx-auto mb-1" />
            <div className="text-xl font-serif text-orange-400">{stats.todayEvents}</div>
            <div className="text-[10px] text-gray-500">Aujourd'hui</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
            <Heart className="w-5 h-5 text-red-400 mx-auto mb-1" />
            <div className="text-xl font-serif text-red-400">{stats.criticalEvents}</div>
            <div className="text-[10px] text-gray-500">Critiques</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
            <Baby className="w-5 h-5 text-gold-500 mx-auto mb-1" />
            <div className="text-xl font-serif text-ivory">{stats.totalRecords}</div>
            <div className="text-[10px] text-gray-500">Dossiers</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
            <CheckCircle className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
            <div className="text-xl font-serif text-emerald-400">{stats.completedRecords}</div>
            <div className="text-[10px] text-gray-500">Validés</div>
          </div>
        </div>

        {/* TABS */}
        <div className="flex flex-wrap gap-2 border-b border-white/10 mb-6 overflow-x-auto pb-2">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-4 py-2 text-sm flex items-center gap-2 transition-colors rounded-lg ${
              activeTab === "overview" ? "bg-gold-500/20 text-gold-500" : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <LayoutGrid className="w-4 h-4" /> Vue d'ensemble
          </button>
          <button
            onClick={() => setActiveTab("events")}
            className={`px-4 py-2 text-sm flex items-center gap-2 transition-colors rounded-lg ${
              activeTab === "events" ? "bg-gold-500/20 text-gold-500" : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Calendar className="w-4 h-4" /> Événements
          </button>
          <button
            onClick={() => setActiveTab("records")}
            className={`px-4 py-2 text-sm flex items-center gap-2 transition-colors rounded-lg ${
              activeTab === "records" ? "bg-gold-500/20 text-gold-500" : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <FileCheck className="w-4 h-4" /> Dossiers enfants
          </button>
        </div>

        {/* ==================== ONGLET VUE D'ENSEMBLE ==================== */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Prochains événements */}
            {upcomingEvents.length > 0 && (
              <div className="bg-gold-500/10 border border-gold-500/20 rounded-2xl p-5">
                <h2 className="text-sm font-serif text-gold-500 mb-3 flex items-center gap-2">
                  <Star className="w-4 h-4" />
                  📅 Prochains événements
                </h2>
                <div className="space-y-2">
                  {upcomingEvents.map(event => {
                    const priorityConf = priorityConfig[event.priority as keyof typeof priorityConfig] || priorityConfig.normal;
                    return (
                      <div key={event.id} className="flex items-center justify-between p-3 bg-midnight rounded-xl border border-gold-500/20">
                        <div>
                          <p className="text-ivory text-sm">{event.title}</p>
                          <p className="text-xs text-gray-500">
                            {event.child_name && <span>👶 {event.child_name} • </span>}
                            {event.date && new Date(event.date).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full ${priorityConf.color}`}>
                          {priorityConf.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Derniers dossiers ajoutés */}
            {records.length > 0 && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                <h2 className="text-sm font-serif text-gold-500 mb-3 flex items-center gap-2">
                  <FileCheck className="w-4 h-4" />
                  📋 Derniers dossiers ajoutés
                </h2>
                <div className="space-y-2">
                  {records.slice(0, 5).map(record => (
                    <div key={record.id} className="flex items-center justify-between p-3 bg-midnight rounded-xl border border-white/5">
                      <div>
                        <p className="text-ivory text-sm">{record.name}</p>
                        {record.child_name && <p className="text-xs text-gray-500">👶 {record.child_name}</p>}
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${getRecordStatusColor(record.status)}`}>
                        {record.status || "En cours"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions rapides */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => { setActiveTab("events"); setShowEventForm(true); scrollToForm(); }}
                className="py-3 bg-blue-500/20 text-blue-400 rounded-xl text-sm font-medium hover:bg-blue-500/30 transition-colors"
              >
                + Ajouter un événement
              </button>
              <button
                onClick={() => { setActiveTab("records"); setShowRecordForm(true); scrollToForm(); }}
                className="py-3 bg-emerald-500/20 text-emerald-400 rounded-xl text-sm font-medium hover:bg-emerald-500/30 transition-colors"
              >
                + Ajouter un dossier
              </button>
            </div>
          </div>
        )}

        {/* ==================== ONGLET ÉVÉNEMENTS ==================== */}
        {activeTab === "events" && (
          <div>
            <div className="flex justify-end mb-4">
              <button
                onClick={() => { setShowEventForm(true); setEditingEventId(null); scrollToForm(); }}
                className="bg-gold-500 text-midnight px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 hover:bg-gold-400 transition-colors"
              >
                <Plus className="w-4 h-4" /> Ajouter un événement
              </button>
            </div>

            {/* Filtres */}
            <div className="flex flex-wrap gap-3 mb-6">
              <select
                value={filterChild}
                onChange={(e) => setFilterChild(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-gold-500 text-ivory"
              >
                {childrenList.map(child => <option key={child} value={child}>{child === "Tous" ? "👨‍👩‍👧‍👦 Tous les enfants" : `👶 ${child}`}</option>)}
              </select>
              
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-gold-500 text-ivory"
              >
                <option value="all">📋 Tous les statuts</option>
                {Object.entries(statusConfig).map(([key, conf]) => <option key={key} value={key}>{conf.label}</option>)}
              </select>
            </div>

            {/* Formulaire événement */}
            <AnimatePresence>
              {showEventForm && (
                <motion.div id="form-container" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 mb-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-serif text-ivory">{editingEventId ? "Modifier" : "Ajouter"} un événement</h3>
                    <button onClick={resetEventForm} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="text" placeholder="Titre" value={eventForm.title} onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-ivory md:col-span-2" />
                    <input type="text" placeholder="Nom de l'enfant" value={eventForm.child_name} onChange={(e) => setEventForm({ ...eventForm, child_name: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-ivory" />
                    <select value={eventForm.category} onChange={(e) => setEventForm({ ...eventForm, category: e.target.value as FamilyEvent["category"] })} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-ivory">
                      {Object.entries(categoryConfig).map(([key, conf]) => <option key={key} value={key}>{conf.label}</option>)}
                    </select>
                    <select value={eventForm.priority} onChange={(e) => setEventForm({ ...eventForm, priority: e.target.value as FamilyEvent["priority"] })} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-ivory">
                      {Object.entries(priorityConfig).map(([key, conf]) => <option key={key} value={key}>{conf.label}</option>)}
                    </select>
                    <select value={eventForm.status} onChange={(e) => setEventForm({ ...eventForm, status: e.target.value as FamilyEvent["status"] })} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-ivory">
                      {Object.entries(statusConfig).map(([key, conf]) => <option key={key} value={key}>{conf.label}</option>)}
                    </select>
                    <input type="date" value={eventForm.date} onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-ivory" />
                    <textarea placeholder="Notes" value={eventForm.notes} onChange={(e) => setEventForm({ ...eventForm, notes: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-ivory md:col-span-2" rows={2} />
                  </div>
                  
                  <div className="flex gap-3 mt-6">
                    <button onClick={saveEvent} className="bg-gold-500 text-midnight px-6 py-2 rounded-full font-medium hover:bg-gold-400 transition-colors">
                      {editingEventId ? "Mettre à jour" : "Enregistrer"}
                    </button>
                    <button onClick={resetEventForm} className="bg-white/10 px-6 py-2 rounded-full hover:bg-white/20 transition-colors">Annuler</button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Liste des événements */}
            <div className="space-y-3">
              {filteredEvents.length === 0 ? (
                <div className="text-center py-12 text-gray-500">Aucun événement</div>
              ) : (
                filteredEvents.map((event) => {
                  const categoryConf = categoryConfig[event.category as keyof typeof categoryConfig] || categoryConfig.school;
                  const priorityConf = priorityConfig[event.priority as keyof typeof priorityConfig] || priorityConfig.normal;
                  const CategoryIcon = categoryConf.icon;
                  
                  let borderClass = "border-l-gray-500";
                  if (event.priority === "critical") borderClass = "border-l-red-500";
                  else if (event.priority === "high") borderClass = "border-l-orange-500";
                  else if (event.priority === "normal") borderClass = "border-l-blue-500";
                  
                  return (
                    <motion.div key={event.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className={`bg-white/5 border-l-4 rounded-xl p-4 hover:bg-white/10 transition-colors ${borderClass}`}>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 flex-wrap mb-2">
                            <h3 className="text-ivory font-medium">{event.title}</h3>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${categoryConf.color}`}>
                              <CategoryIcon className="w-3 h-3 inline mr-1" /> {categoryConf.label}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${priorityConf.color}`}>{priorityConf.label}</span>
                          </div>
                          <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                            {event.child_name && <span className="flex items-center gap-1"><Baby className="w-3 h-3" /> {event.child_name}</span>}
                            {event.date && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(event.date).toLocaleDateString('fr-FR')}</span>}
                          </div>
                          {event.notes && <p className="text-xs text-gray-600 mt-2">{event.notes}</p>}
                        </div>
                        <div className="flex items-center gap-2">
                          <select value={event.status} onChange={(e) => updateEventStatus(event.id, e.target.value as FamilyEvent["status"])} className="bg-white/10 border border-white/10 rounded-lg px-2 py-1 text-xs">
                            {Object.entries(statusConfig).map(([key, conf]) => <option key={key} value={key}>{conf.label}</option>)}
                          </select>
                          <button onClick={() => editEvent(event)} className="text-gray-500 hover:text-gold-500"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => deleteEvent(event.id)} className="text-gray-500 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ==================== ONGLET DOSSIERS ENFANTS ==================== */}
        {activeTab === "records" && (
          <div>
            <div className="flex justify-end mb-4">
              <button
                onClick={() => { setShowRecordForm(true); setEditingRecordId(null); scrollToForm(); }}
                className="bg-gold-500 text-midnight px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 hover:bg-gold-400 transition-colors"
              >
                <Plus className="w-4 h-4" /> Ajouter un dossier
              </button>
            </div>

            {/* Formulaire dossier */}
            <AnimatePresence>
              {showRecordForm && (
                <motion.div id="form-container" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 mb-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-serif text-ivory">{editingRecordId ? "Modifier" : "Ajouter"} un dossier</h3>
                    <button onClick={resetRecordForm} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="text" placeholder="Nom du document" value={recordForm.name} onChange={(e) => setRecordForm({ ...recordForm, name: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-ivory md:col-span-2" />
                    <select value={recordForm.child_name} onChange={(e) => setRecordForm({ ...recordForm, child_name: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-ivory">
                      <option value="">👨‍👩‍👧‍👦 Toute la famille</option>
                      {childrenList.filter(c => c !== "Tous").map(child => <option key={child} value={child}>{child}</option>)}
                    </select>
                    <input type="text" placeholder="Type (ex: Passeport, Carnet de santé)" value={recordForm.type} onChange={(e) => setRecordForm({ ...recordForm, type: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-ivory" />
                    <select value={recordForm.status} onChange={(e) => setRecordForm({ ...recordForm, status: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-ivory">
                      <option value="pending">⏳ En attente</option>
                      <option value="valid">✅ Validé</option>
                      <option value="expired">⚠️ Expiré</option>
                    </select>
                    <input type="date" placeholder="Date d'expiration" value={recordForm.expiry_date} onChange={(e) => setRecordForm({ ...recordForm, expiry_date: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-ivory" />
                    <textarea placeholder="Notes" value={recordForm.notes} onChange={(e) => setRecordForm({ ...recordForm, notes: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-ivory md:col-span-2" rows={2} />
                  </div>
                  
                  <div className="flex gap-3 mt-6">
                    <button onClick={saveRecord} className="bg-gold-500 text-midnight px-6 py-2 rounded-full font-medium hover:bg-gold-400 transition-colors">
                      {editingRecordId ? "Mettre à jour" : "Enregistrer"}
                    </button>
                    <button onClick={resetRecordForm} className="bg-white/10 px-6 py-2 rounded-full hover:bg-white/20 transition-colors">Annuler</button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Liste des dossiers */}
            <div className="space-y-3">
              {records.length === 0 ? (
                <div className="text-center py-12 text-gray-500">Aucun dossier enfant</div>
              ) : (
                records.map(record => (
                  <motion.div key={record.id} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-all">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="text-ivory font-medium">{record.name}</p>
                        {record.child_name && <p className="text-xs text-gray-500 mt-1 flex items-center gap-1"><Heart className="w-3 h-3 text-gold-500" /> {record.child_name}</p>}
                        {record.type && <p className="text-xs text-gray-500 mt-1">📄 {record.type}</p>}
                        {record.expiry_date && <p className="text-xs text-gray-500 mt-1">Expire: {new Date(record.expiry_date).toLocaleDateString('fr-FR')}</p>}
                        {record.notes && <p className="text-xs text-gray-500 mt-1 italic">{record.notes}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider px-2 py-1 rounded-full ${getRecordStatusColor(record.status)}`}>
                          {getRecordStatusIcon(record.status)}
                          {record.status || "En cours"}
                        </span>
                        <button onClick={() => editRecord(record)} className="text-gray-500 hover:text-gold-500"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => deleteRecord(record.id)} className="text-gray-500 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
