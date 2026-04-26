"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Calendar, Plus, Trash2, Edit2, X, Users, 
  Baby, Heart, Clock, AlertCircle, CheckCircle,
  School, Activity, Pill, Plane, Home, Star
} from "lucide-react";

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

// Liste des enfants (à adapter selon tes enfants)
const childrenList = [
  "Tous",
  "Enfant 1",
  "Enfant 2",
  "Enfant 3"
];

export default function FamilyPage() {
  const [events, setEvents] = useState<FamilyEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterChild, setFilterChild] = useState<string>("Tous");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  
  const [formData, setFormData] = useState({
    title: "",
    child_name: "",
    category: "school" as FamilyEvent["category"],
    priority: "normal" as FamilyEvent["priority"],
    status: "pending" as FamilyEvent["status"],
    date: "",
    notes: ""
  });

  useEffect(() => {
    fetchEvents();
    
    const channel = supabase
      .channel('family_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'family_events' }, () => fetchEvents())
      .subscribe();
    
    return () => channel.unsubscribe();
  }, []);

  async function fetchEvents() {
    setIsLoading(true);
    const { data } = await supabase
      .from("family_events")
      .select("*")
      .order("date", { ascending: true, nullsFirst: false });
    setEvents(data || []);
    setIsLoading(false);
  }

  async function saveEvent() {
    const data = {
      title: formData.title,
      child_name: formData.child_name || null,
      category: formData.category,
      priority: formData.priority,
      status: formData.status,
      date: formData.date || null,
      notes: formData.notes || null
    };
    
    let error;
    if (editingId) {
      const result = await supabase.from("family_events").update(data).eq("id", editingId);
      error = result.error;
    } else {
      const result = await supabase.from("family_events").insert(data);
      error = result.error;
    }
    
    if (!error) {
      resetForm();
      fetchEvents();
    } else {
      alert("Erreur: " + error.message);
    }
  }

  async function deleteEvent(id: string) {
    if (confirm("Supprimer cet événement ?")) {
      const { error } = await supabase.from("family_events").delete().eq("id", id);
      if (!error) fetchEvents();
    }
  }

  async function updateStatus(id: string, newStatus: FamilyEvent["status"]) {
    const { error } = await supabase.from("family_events").update({ status: newStatus }).eq("id", id);
    if (!error) fetchEvents();
  }

  function editEvent(event: FamilyEvent) {
    setFormData({
      title: event.title,
      child_name: event.child_name || "",
      category: event.category,
      priority: event.priority,
      status: event.status,
      date: event.date || "",
      notes: event.notes || ""
    });
    setEditingId(event.id);
    setShowForm(true);
  }

  function resetForm() {
    setShowForm(false);
    setEditingId(null);
    setFormData({
      title: "",
      child_name: "",
      category: "school",
      priority: "normal",
      status: "pending",
      date: "",
      notes: ""
    });
  }

  const filteredEvents = events.filter(e => {
    if (filterChild !== "Tous" && e.child_name !== filterChild) return false;
    if (filterStatus !== "all" && e.status !== filterStatus) return false;
    return true;
  });

  const stats = {
    total: events.length,
    pending: events.filter(e => e.status === "pending").length,
    today: events.filter(e => e.date === new Date().toISOString().split('T')[0]).length,
    critical: events.filter(e => e.priority === "critical").length
  };

  const today = new Date().toISOString().split('T')[0];
  const upcomingEvents = filteredEvents.filter(e => e.date && e.date >= today && e.status !== "done").slice(0, 5);

  return (
    <div className="p-6 lg:p-10 h-full flex flex-col overflow-y-auto bg-midnight">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-serif text-gold-500 tracking-tight">Family Command</h1>
          <p className="text-gray-500 text-sm mt-1">Gestion des événements familiaux et suivi des enfants</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditingId(null); }}
          className="bg-gold-500 text-midnight px-5 py-2 rounded-full text-sm font-medium flex items-center gap-2 hover:bg-gold-400 transition-colors"
        >
          <Plus className="w-4 h-4" /> Ajouter un événement
        </button>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
          <Calendar className="w-5 h-5 text-gold-500 mx-auto mb-2" />
          <div className="text-2xl font-serif text-ivory">{stats.total}</div>
          <div className="text-xs text-gray-500">Événements</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
          <Clock className="w-5 h-5 text-yellow-400 mx-auto mb-2" />
          <div className="text-2xl font-serif text-yellow-400">{stats.pending}</div>
          <div className="text-xs text-gray-500">En attente</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
          <AlertCircle className="w-5 h-5 text-orange-400 mx-auto mb-2" />
          <div className="text-2xl font-serif text-orange-400">{stats.today}</div>
          <div className="text-xs text-gray-500">Aujourd'hui</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
          <Heart className="w-5 h-5 text-red-400 mx-auto mb-2" />
          <div className="text-2xl font-serif text-red-400">{stats.critical}</div>
          <div className="text-xs text-gray-500">Critiques</div>
        </div>
      </div>

      {/* PROCHAINS ÉVÉNEMENTS */}
      {upcomingEvents.length > 0 && (
        <div className="bg-gold-500/10 border border-gold-500/20 rounded-2xl p-5 mb-8">
          <h2 className="text-sm font-serif text-gold-500 mb-3 flex items-center gap-2">
            <Star className="w-4 h-4" />
            📅 Prochains événements
          </h2>
          <div className="space-y-2">
            {upcomingEvents.map(event => (
              <div key={event.id} className="flex items-center justify-between p-3 bg-midnight rounded-xl border border-gold-500/20">
                <div>
                  <p className="text-ivory text-sm">{event.title}</p>
                  <p className="text-xs text-gray-500">
                    {event.child_name && <span>👶 {event.child_name} • </span>}
                    {event.date && new Date(event.date).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${priorityConfig[event.priority].color}`}>
                  {priorityConfig[event.priority].label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FILTRES */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select
          value={filterChild}
          onChange={(e) => setFilterChild(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-gold-500"
        >
          {childrenList.map(child => <option key={child} value={child}>{child === "Tous" ? "👨‍👩‍👧‍👦 Tous les enfants" : `👶 ${child}`}</option>)}
        </select>
        
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-gold-500"
        >
          <option value="all">📋 Tous les statuts</option>
          {Object.entries(statusConfig).map(([key, conf]) => <option key={key} value={key}>{conf.label}</option>)}
        </select>
      </div>

      {/* FORMULAIRE */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 mb-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-serif text-ivory">{editingId ? "Modifier" : "Ajouter"} un événement</h3>
              <button onClick={resetForm} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Titre de l'événement"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-gold-500 text-ivory md:col-span-2"
              />
              <select
                value={formData.child_name}
                onChange={(e) => setFormData({ ...formData, child_name: e.target.value })}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-gold-500 text-ivory"
              >
                <option value="">👨‍👩‍👧‍👦 Toute la famille</option>
                {childrenList.filter(c => c !== "Tous").map(child => <option key={child} value={child}>{child}</option>)}
              </select>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as FamilyEvent["category"] })}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-gold-500 text-ivory"
              >
                {Object.entries(categoryConfig).map(([key, conf]) => <option key={key} value={key}>{conf.label}</option>)}
              </select>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as FamilyEvent["priority"] })}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-gold-500 text-ivory"
              >
                {Object.entries(priorityConfig).map(([key, conf]) => <option key={key} value={key}>{conf.label}</option>)}
              </select>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as FamilyEvent["status"] })}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-gold-500 text-ivory"
              >
                {Object.entries(statusConfig).map(([key, conf]) => <option key={key} value={key}>{conf.label}</option>)}
              </select>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-gold-500 text-ivory"
              />
              <textarea
                placeholder="Notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-gold-500 text-ivory md:col-span-2"
                rows={2}
              />
            </div>
            
            <div className="flex gap-3 mt-6">
              <button onClick={saveEvent} className="bg-gold-500 text-midnight px-6 py-2 rounded-full font-medium hover:bg-gold-400 transition-colors">
                {editingId ? "Mettre à jour" : "Enregistrer"}
              </button>
              <button onClick={resetForm} className="bg-white/10 px-6 py-2 rounded-full hover:bg-white/20 transition-colors">Annuler</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* LISTE DES ÉVÉNEMENTS */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="text-center py-12 text-gray-500">Chargement...</div>
        ) : filteredEvents.length === 0 ? (
          <div className="text-center py-12 text-gray-500">Aucun événement</div>
        ) : (
          filteredEvents.map((event) => {
            const CategoryIcon = categoryConfig[event.category].icon;
            
            return (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className={`bg-white/5 border-l-4 rounded-xl p-4 hover:bg-white/10 transition-colors ${
                  event.priority === "critical" ? "border-l-red-500" :
                  event.priority === "high" ? "border-l-orange-500" :
                  event.priority === "normal" ? "border-l-blue-500" : "border-l-gray-500"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 flex-wrap mb-2">
                      <h3 className="text-ivory font-medium">{event.title}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${categoryConfig[event.category].color}`}>
                        <CategoryIcon className="w-3 h-3 inline mr-1" />
                        {categoryConfig[event.category].label}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${priorityConfig[event.priority].color}`}>
                        {priorityConfig[event.priority].label}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                      {event.child_name && (
                        <span className="flex items-center gap-1">
                          <Baby className="w-3 h-3" /> {event.child_name}
                        </span>
                      )}
                      {event.date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> {new Date(event.date).toLocaleDateString('fr-FR')}
                        </span>
                      )}
                    </div>
                    {event.notes && <p className="text-xs text-gray-600 mt-2">{event.notes}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={event.status}
                      onChange={(e) => updateStatus(event.id, e.target.value as FamilyEvent["status"])}
                      className="bg-white/10 border border-white/10 rounded-lg px-2 py-1 text-xs focus:outline-none"
                    >
                      {Object.entries(statusConfig).map(([key, conf]) => <option key={key} value={key}>{conf.label}</option>)}
                    </select>
                    <button onClick={() => editEvent(event)} className="text-gray-500 hover:text-gold-500">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => deleteEvent(event.id)} className="text-gray-500 hover:text-red-400">
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