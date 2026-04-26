"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import LoadingSpinner from "@/components/LoadingSpinner";
import { motion } from "framer-motion";
import { 
  Users, Calendar, FileCheck, Heart, Baby, 
  Clock, AlertCircle, CheckCircle, Star, Plus,
  Trash2, Edit2, X
} from "lucide-react";

type FamilyEvent = {
  id: string;
  title: string;
  child_name: string | null;
  category: string;
  priority: string;
  status: string;
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

export default function MotherhoodPage() {
  const [calendar, setCalendar] = useState<FamilyEvent[]>([]);
  const [records, setRecords] = useState<KidRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<FamilyEvent | null>(null);
  
  const [eventForm, setEventForm] = useState({
    title: "",
    child_name: "",
    category: "school",
    priority: "normal",
    status: "pending",
    date: "",
    notes: ""
  });

  useEffect(() => {
    fetchData();
    
    const eventsChannel = supabase
      .channel('family_events_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'family_events' }, () => fetchEvents())
      .subscribe();
    
    const kidsChannel = supabase
      .channel('kids_records_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kids_records' }, () => fetchKidsRecords())
      .subscribe();
    
    return () => {
      eventsChannel.unsubscribe();
      kidsChannel.unsubscribe();
    };
  }, []);

  async function fetchData() {
    setIsLoading(true);
    await Promise.all([fetchEvents(), fetchKidsRecords()]);
    setIsLoading(false);
  }

  async function fetchEvents() {
    const { data } = await supabase
      .from("family_events")
      .select("*")
      .order("date", { ascending: true, nullsFirst: false });
    setCalendar(data || []);
  }

  async function fetchKidsRecords() {
    const { data } = await supabase
      .from("kids_records")
      .select("*")
      .order("created_at", { ascending: false });
    setRecords(data || []);
  }

  async function saveEvent() {
    const data = {
      title: eventForm.title,
      child_name: eventForm.child_name || null,
      category: eventForm.category,
      priority: eventForm.priority,
      status: eventForm.status,
      date: eventForm.date || null,
      notes: eventForm.notes || null
    };
    
    let error;
    if (editingEvent) {
      const result = await supabase.from("family_events").update(data).eq("id", editingEvent.id);
      error = result.error;
    } else {
      const result = await supabase.from("family_events").insert(data);
      error = result.error;
    }
    
    if (!error) {
      resetEventForm();
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

  function editEvent(event: FamilyEvent) {
    setEditingEvent(event);
    setEventForm({
      title: event.title,
      child_name: event.child_name || "",
      category: event.category,
      priority: event.priority,
      status: event.status,
      date: event.date || "",
      notes: event.notes || ""
    });
    setShowEventForm(true);
  }

  function resetEventForm() {
    setShowEventForm(false);
    setEditingEvent(null);
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

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "Date non définie";
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) return "Aujourd'hui";
    if (date.toDateString() === tomorrow.toDateString()) return "Demain";
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
  };

  const getStatusIcon = (status: string) => {
    const name = status?.toLowerCase() || "";
    if (name.includes("valid") || name.includes("fait") || name.includes("ok") || name.includes("done")) 
      return <CheckCircle className="w-4 h-4 text-emerald-400" />;
    if (name.includes("urgent") || name.includes("important")) 
      return <AlertCircle className="w-4 h-4 text-red-400" />;
    return <Clock className="w-4 h-4 text-yellow-400" />;
  };

  const getStatusColor = (status: string) => {
    const name = status?.toLowerCase() || "";
    if (name.includes("valid") || name.includes("fait") || name.includes("ok") || name.includes("done")) 
      return "bg-emerald-500/20 text-emerald-400";
    if (name.includes("urgent") || name.includes("important")) 
      return "bg-red-500/20 text-red-400";
    return "bg-yellow-500/20 text-yellow-400";
  };

  const getPriorityColor = (priority: string) => {
    const name = priority?.toLowerCase() || "";
    if (name === "critical") return "border-l-red-500";
    if (name === "high") return "border-l-orange-500";
    if (name === "normal") return "border-l-blue-500";
    return "border-l-gray-500";
  };

  const upcomingEvents = calendar.filter(item => {
    if (!item.date) return false;
    const eventDate = new Date(item.date);
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    return eventDate >= today && eventDate <= nextWeek && item.status !== "done";
  }).slice(0, 5);

  const stats = {
    totalEvents: calendar.length,
    upcoming: upcomingEvents.length,
    totalRecords: records.length,
    completedRecords: records.filter(r => {
      const status = r.status || "";
      return status.toLowerCase().includes("valid") || status.toLowerCase().includes("fait") || status.toLowerCase().includes("done");
    }).length,
  };

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
              Motherhood Command
            </motion.h1>
            <p className="text-gray-500 mt-2 italic font-light">
              Logistique familiale et priorités absolues
            </p>
          </div>
          <button
            onClick={() => { setShowEventForm(true); setEditingEvent(null); }}
            className="bg-gold-500 text-midnight px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 hover:bg-gold-400 transition-colors"
          >
            <Plus className="w-4 h-4" /> Ajouter un événement
          </button>
        </div>
      </header>

      {/* STATISTIQUES */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
          <Calendar className="w-5 h-5 text-gold-500 mx-auto mb-2" />
          <div className="text-xl font-serif text-ivory">{stats.totalEvents}</div>
          <div className="text-xs text-gray-500">Événements</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
          <Clock className="w-5 h-5 text-blue-400 mx-auto mb-2" />
          <div className="text-xl font-serif text-blue-400">{stats.upcoming}</div>
          <div className="text-xs text-gray-500">À venir (7j)</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
          <Baby className="w-5 h-5 text-gold-500 mx-auto mb-2" />
          <div className="text-xl font-serif text-ivory">{stats.totalRecords}</div>
          <div className="text-xs text-gray-500">Dossiers enfants</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
          <CheckCircle className="w-5 h-5 text-emerald-400 mx-auto mb-2" />
          <div className="text-xl font-serif text-emerald-400">{stats.completedRecords}</div>
          <div className="text-xs text-gray-500">Documents validés</div>
        </div>
      </div>

      {/* FORMULAIRE AJOUT ÉVÉNEMENT */}
      {showEventForm && (
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-serif text-ivory">{editingEvent ? "Modifier" : "Ajouter"} un événement</h3>
            <button onClick={resetEventForm} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Titre de l'événement"
              value={eventForm.title}
              onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-gold-500 text-ivory md:col-span-2"
            />
            <input
              type="text"
              placeholder="Nom de l'enfant (optionnel)"
              value={eventForm.child_name}
              onChange={(e) => setEventForm({ ...eventForm, child_name: e.target.value })}
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-gold-500 text-ivory"
            />
            <select
              value={eventForm.category}
              onChange={(e) => setEventForm({ ...eventForm, category: e.target.value })}
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-gold-500 text-ivory"
            >
              <option value="school">📚 École</option>
              <option value="health">🏥 Santé</option>
              <option value="activity">⚡ Activité</option>
              <option value="travel">✈️ Voyage</option>
              <option value="document">📄 Papiers</option>
              <option value="routine">🔄 Routine</option>
              <option value="supplies">🛒 Fournitures</option>
            </select>
            <select
              value={eventForm.priority}
              onChange={(e) => setEventForm({ ...eventForm, priority: e.target.value })}
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-gold-500 text-ivory"
            >
              <option value="critical">⚠️ Critique</option>
              <option value="high">🔴 Haute</option>
              <option value="normal">🟡 Normale</option>
              <option value="low">🟢 Basse</option>
            </select>
            <select
              value={eventForm.status}
              onChange={(e) => setEventForm({ ...eventForm, status: e.target.value })}
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-gold-500 text-ivory"
            >
              <option value="pending">⏳ En attente</option>
              <option value="prepared">📦 Préparé</option>
              <option value="done">✅ Fait</option>
            </select>
            <input
              type="date"
              value={eventForm.date}
              onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })}
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-gold-500 text-ivory"
            />
            <textarea
              placeholder="Notes"
              value={eventForm.notes}
              onChange={(e) => setEventForm({ ...eventForm, notes: e.target.value })}
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-gold-500 text-ivory md:col-span-2"
              rows={2}
            />
          </div>
          
          <div className="flex gap-3 mt-6">
            <button onClick={saveEvent} className="bg-gold-500 text-midnight px-6 py-2 rounded-full font-medium hover:bg-gold-400 transition-colors">
              {editingEvent ? "Mettre à jour" : "Enregistrer"}
            </button>
            <button onClick={resetEventForm} className="bg-white/10 px-6 py-2 rounded-full hover:bg-white/20 transition-colors">Annuler</button>
          </div>
        </motion.div>
      )}

      {/* PROCHAINS ÉVÉNEMENTS */}
      {upcomingEvents.length > 0 && (
        <div className="bg-gold-500/10 border border-gold-500/20 rounded-2xl p-5 mb-8">
          <h3 className="text-sm font-serif text-gold-500 mb-3 flex items-center gap-2">
            <Star className="w-4 h-4" />
            Prochains rendez-vous
          </h3>
          <div className="space-y-2">
            {upcomingEvents.map((event) => (
              <div key={event.id} className="flex items-center justify-between p-3 bg-midnight rounded-xl border border-gold-500/20">
                <div>
                  <span className="text-ivory text-sm">{event.title}</span>
                  {event.child_name && <span className="text-xs text-gray-500 ml-2">👶 {event.child_name}</span>}
                </div>
                <span className="text-xs text-gold-500">{formatDate(event.date || "")}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* GRILLE PRINCIPALE */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 flex-1">
        
        {/* CALENDRIER FAMILIAL */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col">
          <h2 className="text-xl font-serif text-ivory mb-4 flex items-center gap-3">
            <Calendar className="w-5 h-5 text-gold-500" /> 
            Family Calendar
          </h2>
          
          <div className="flex-1 overflow-y-auto space-y-3 scrollbar-hide max-h-[400px]">
                {isLoading ? (
                  <LoadingSpinner />
                ) : calendar.length > 0 ? (
              calendar.map((event) => {
                const isToday = event.date && new Date(event.date).toDateString() === new Date().toDateString();
                const priorityClass = getPriorityColor(event.priority);
                
                return (
                  <motion.div 
                    key={event.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`p-4 bg-midnight rounded-xl border-l-4 ${priorityClass} ${isToday ? 'border-r border-gold-500/30' : 'border-white/5'}`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="text-ivory font-medium">{event.title}</p>
                        <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(event.date || "")}
                          {isToday && <span className="ml-2 text-gold-500 text-[10px] uppercase">Aujourd'hui</span>}
                        </p>
                        {event.child_name && (
                          <p className="text-xs text-gray-500 mt-1">👶 {event.child_name}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
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
            ) : (
              <p className="text-gray-500 text-center py-8">Aucun événement prévu.</p>
            )}
          </div>
        </div>

        {/* KIDS RECORDS */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col">
          <h2 className="text-xl font-serif text-ivory mb-4 flex items-center gap-3">
            <FileCheck className="w-5 h-5 text-gold-500" /> 
            Kids Records
          </h2>
          
          <div className="flex-1 overflow-y-auto space-y-3 scrollbar-hide max-h-[400px]">
              {isLoading ? (
                <LoadingSpinner />
              ) : records.length > 0 ? (
              records.map((record) => (
                <motion.div 
                  key={record.id}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex justify-between items-center p-4 bg-midnight rounded-xl border border-white/5 hover:border-gold-500/20 transition-all"
                >
                  <div>
                    <p className="text-ivory font-medium">{record.name}</p>
                    {record.child_name && (
                      <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                        <Heart className="w-3 h-3 text-gold-500" />
                        {record.child_name}
                      </p>
                    )}
                    {record.expiry_date && (
                      <p className="text-xs text-gray-500 mt-1">
                        Expire: {new Date(record.expiry_date).toLocaleDateString('fr-FR')}
                      </p>
                    )}
                  </div>
                  <span className={`inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider px-2 py-1 rounded-full ${getStatusColor(record.status)}`}>
                    {getStatusIcon(record.status)}
                    {record.status || "En cours"}
                  </span>
                </motion.div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-8">Aucun document enregistré.</p>
            )}
          </div>
        </div>
      </div>

      {/* RAPPEL BIEN-ÊTRE */}
      <div className="mt-8 p-5 bg-gradient-to-r from-pink-500/10 to-transparent rounded-2xl border border-pink-500/20">
        <div className="flex items-center gap-3">
          <Heart className="w-5 h-5 text-pink-400" />
          <div>
            <p className="text-xs text-pink-400 uppercase tracking-wider">Rappel Sovereign</p>
            <p className="text-ivory text-sm mt-1">Ta famille est ton anchor. Prends soin de toi d'abord.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
