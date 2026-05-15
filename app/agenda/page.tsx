"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import LoadingSpinner from "@/components/LoadingSpinner";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Calendar, ChevronLeft, ChevronRight, Clock, 
  CheckCircle, AlertCircle, Target, Heart, DollarSign,
  Briefcase, Sprout, FileText, Plus, Trash2, Edit2, 
  X, Flag, FolderOpen, Loader2, Download, LayoutGrid,
  CalendarDays, ListTodo
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { exportTasksToPDF } from "@/lib/exportPDF";

// =====================================================
// TYPES
// =====================================================

type Task = {
  id: string;
  title: string;
  due_date: string | null;
  status: "not_started" | "today" | "in_progress" | "waiting" | "done";
  priority: "critical" | "high" | "normal" | "low";
  project: string;
  estimated_time: number | null;
  mission_id: string | null;
  created_at: string;
  sync_calendar?: boolean;
  calendar_synced?: boolean;
  calendar_link?: string;
  calendar_event_id?: string;
};

type FamilyEvent = {
  id: string;
  title: string;
  date: string | null;
  child_name: string | null;
  category: string;
  priority: string;
};

type FarmTask = {
  id: string;
  title: string;
  due_date: string | null;
  status: string;
};

type Document = {
  id: string;
  name: string;
  due_date: string | null;
  status: string;
};

// =====================================================
// CONFIGURATIONS
// =====================================================

const statusConfig = {
  not_started: { label: "À faire", icon: Clock, color: "bg-gray-500/20 text-gray-400", border: "border-gray-500/30" },
  today: { label: "Aujourd'hui", icon: AlertCircle, color: "bg-orange-500/20 text-orange-400", border: "border-orange-500/30" },
  in_progress: { label: "En cours", icon: Loader2, color: "bg-blue-500/20 text-blue-400", border: "border-blue-500/30" },
  waiting: { label: "En attente", icon: Clock, color: "bg-yellow-500/20 text-yellow-400", border: "border-yellow-500/30" },
  done: { label: "Terminée", icon: CheckCircle, color: "bg-emerald-500/20 text-emerald-400", border: "border-emerald-500/30" }
};

const priorityConfig = {
  critical: { label: "Critique", icon: Flag, color: "bg-red-500/20 text-red-400" },
  high: { label: "Haute", icon: Flag, color: "bg-orange-500/20 text-orange-400" },
  normal: { label: "Normale", icon: Flag, color: "bg-blue-500/20 text-blue-400" },
  low: { label: "Basse", icon: Flag, color: "bg-gray-500/20 text-gray-400" }
};

const projects = [
  "Ifè Farm",
  "Santé Plus",
  "Love & Fire",
  "Bénin Relocation",
  "Famille",
  "Personnel"
];

export default function AgendaPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"calendar" | "tasks">("calendar");
  
  // ========== ÉTATS CALENDRIER ==========
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [familyEvents, setFamilyEvents] = useState<FamilyEvent[]>([]);
  const [farmTasks, setFarmTasks] = useState<FarmTask[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isCalendarLoading, setIsCalendarLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedEvents, setSelectedEvents] = useState<any[]>([]);

  // ========== ÉTATS TÂCHES ==========
  const [taskList, setTaskList] = useState<Task[]>([]);
  const [isTasksLoading, setIsTasksLoading] = useState(true);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [syncCalendar, setSyncCalendar] = useState(false);
  
  const [taskFormData, setTaskFormData] = useState({
    title: "",
    status: "not_started" as Task["status"],
    priority: "normal" as Task["priority"],
    project: "Ifè Farm",
    due_date: "",
    estimated_time: ""
  });

  const scrollToForm = () => {
    setTimeout(() => {
      const formElement = document.getElementById('form-container');
      if (formElement) {
        formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 150);
  };

  // ========== CHARGEMENT DES DONNÉES ==========
  useEffect(() => {
    fetchAllData();
    
    const tasksChannel = supabase
      .channel('tasks_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => fetchTasks())
      .subscribe();
    
    const eventsChannel = supabase
      .channel('family_events_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'family_events' }, () => fetchFamilyEvents())
      .subscribe();
    
    return () => {
      tasksChannel.unsubscribe();
      eventsChannel.unsubscribe();
    };
  }, []);

  async function fetchAllData() {
    setIsCalendarLoading(true);
    setIsTasksLoading(true);
    await Promise.all([
      fetchTasks(),
      fetchFamilyEvents(),
      fetchFarmTasks(),
      fetchDocuments(),
      fetchTaskList()
    ]);
    setIsCalendarLoading(false);
    setIsTasksLoading(false);
  }

  async function fetchTasks() {
    const { data } = await supabase
      .from("tasks")
      .select("*")
      .neq("status", "done")
      .order("due_date", { ascending: true });
    setTasks(data || []);
  }

  async function fetchTaskList() {
    const { data } = await supabase
      .from("tasks")
      .select("*")
      .order("created_at", { ascending: false });
    setTaskList(data || []);
  }

  async function fetchFamilyEvents() {
    const { data } = await supabase
      .from("family_events")
      .select("*")
      .order("date", { ascending: true });
    setFamilyEvents(data || []);
  }

  async function fetchFarmTasks() {
    const { data } = await supabase
      .from("relocation_tasks")
      .select("*")
      .neq("status", "completed")
      .order("due_date", { ascending: true });
    setFarmTasks(data || []);
  }

  async function fetchDocuments() {
    const { data } = await supabase
      .from("documents")
      .select("*")
      .neq("status", "approved")
      .order("due_date", { ascending: true });
    setDocuments(data || []);
  }

  // ========== FONCTIONS CALENDRIER ==========
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    setSelectedDate(null);
    setSelectedEvents([]);
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    setSelectedDate(null);
    setSelectedEvents([]);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(null);
    setSelectedEvents([]);
  };

  const getEventsForDate = (year: number, month: number, day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    const dayEvents = [
      ...tasks.filter(t => t.due_date === dateStr).map(t => ({ ...t, type: "task", area: t.project })),
      ...familyEvents.filter(f => f.date === dateStr).map(f => ({ ...f, type: "family", title: f.title })),
      ...farmTasks.filter(ft => ft.due_date === dateStr).map(ft => ({ ...ft, type: "farm", title: ft.title })),
      ...documents.filter(d => d.due_date === dateStr).map(d => ({ ...d, type: "document", title: d.name }))
    ];
    
    return dayEvents;
  };

  const handleDateClick = (year: number, month: number, day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const events = getEventsForDate(year, month, day);
    setSelectedDate(dateStr);
    setSelectedEvents(events);
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const monthNames = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
  const dayNames = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
  const adjustedFirstDay = firstDay === 0 ? 6 : firstDay - 1;

  const getPriorityColor = (priority: string) => {
    switch(priority) {
      case "critical": return "text-red-400 bg-red-500/10";
      case "high": return "text-orange-400 bg-orange-500/10";
      case "normal": return "text-blue-400 bg-blue-500/10";
      default: return "text-gray-400 bg-gray-500/10";
    }
  };

  // ========== FONCTIONS TÂCHES ==========
  async function saveTask() {
    const data = {
      title: taskFormData.title,
      status: taskFormData.status,
      priority: taskFormData.priority,
      project: taskFormData.project,
      due_date: taskFormData.due_date || null,
      estimated_time: taskFormData.estimated_time ? parseInt(taskFormData.estimated_time) : null,
      sync_calendar: syncCalendar
    };
    
    try {
      let response;
      let result;
      
      if (editingTaskId) {
        response = await fetch(`https://sovereign-bridge.onrender.com/tasks/${editingTaskId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ table: "tasks", id: editingTaskId, data: data })
        });
        result = await response.json();
      } else {
        response = await fetch(`https://sovereign-bridge.onrender.com/tasks`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ table: "tasks", data: data })
        });
        result = await response.json();
      }
      
      if (result.success) {
        resetTaskForm();
        fetchAllData();
        toast.success(editingTaskId ? "Tâche modifiée" : "Tâche ajoutée");
      } else {
        toast.error("Erreur: " + JSON.stringify(result.error));
      }
    } catch (error) {
      console.error("Erreur saveTask:", error);
      toast.error("Erreur de connexion au serveur");
    }
  }

  async function updateTaskStatus(id: string, newStatus: Task["status"]) {
    const { error } = await supabase.from("tasks").update({ status: newStatus }).eq("id", id);
    if (!error) {
      fetchAllData();
      toast.success("Statut mis à jour");
    }
  }

  async function deleteTask(id: string) {
    if (confirm("Supprimer cette tâche ?")) {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (!error) {
        fetchAllData();
        toast.success("Tâche supprimée");
      }
    }
  }

  function editTask(task: Task) {
    setTaskFormData({
      title: task.title,
      status: task.status,
      priority: task.priority,
      project: task.project,
      due_date: task.due_date || "",
      estimated_time: task.estimated_time?.toString() || ""
    });
    setSyncCalendar(task.sync_calendar || false);
    setEditingTaskId(task.id);
    setShowTaskForm(true);
    setActiveTab("tasks");
    scrollToForm();
  }

  function resetTaskForm() {
    setShowTaskForm(false);
    setEditingTaskId(null);
    setSyncCalendar(false);
    setTaskFormData({
      title: "",
      status: "not_started",
      priority: "normal",
      project: "Ifè Farm",
      due_date: "",
      estimated_time: ""
    });
  }

  const filteredTasks = taskList.filter(t => {
    if (filterStatus !== "all" && t.status !== filterStatus) return false;
    if (filterPriority !== "all" && t.priority !== filterPriority) return false;
    return true;
  });

  const taskStats = {
    total: taskList.length,
    today: taskList.filter(t => t.status === "today").length,
    in_progress: taskList.filter(t => t.status === "in_progress").length,
    done: taskList.filter(t => t.status === "done").length
  };

  if (isCalendarLoading && isTasksLoading) {
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
              <Calendar className="w-8 h-8 text-gold-500" />
              <CheckCircle className="w-8 h-8 text-blue-400" />
              <h1 className="text-3xl md:text-4xl font-serif text-gold-500 tracking-tight">
                Agenda
              </h1>
            </div>
            <p className="text-gray-500 text-sm">
              Calendrier et gestion des tâches
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => exportTasksToPDF(filteredTasks)}
              className="bg-white/10 p-2 rounded-full hover:bg-white/20 transition-colors"
              title="Exporter les tâches en PDF"
            >
              <Download className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Bloc Becks */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-blue-400" />
            <div>
              <p className="text-sm text-blue-400 font-medium">Becks - Agenda</p>
              <p className="text-sm text-ivory">
                📋 {taskStats.today} tâche(s) aujourd'hui • 📅 {taskStats.in_progress} en cours • ✅ {taskStats.done} terminées
              </p>
            </div>
          </div>
        </div>

        {/* TABS */}
        <div className="flex flex-wrap gap-2 border-b border-white/10 mb-6 overflow-x-auto pb-2">
          <button
            onClick={() => setActiveTab("calendar")}
            className={`px-4 py-2 text-sm flex items-center gap-2 transition-colors rounded-lg ${
              activeTab === "calendar" ? "bg-gold-500/20 text-gold-500" : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <CalendarDays className="w-4 h-4" /> Calendrier
          </button>
          <button
            onClick={() => setActiveTab("tasks")}
            className={`px-4 py-2 text-sm flex items-center gap-2 transition-colors rounded-lg ${
              activeTab === "tasks" ? "bg-gold-500/20 text-gold-500" : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <ListTodo className="w-4 h-4" /> Tâches
          </button>
        </div>

        {/* ==================== ONGLET CALENDRIER ==================== */}
        {activeTab === "calendar" && (
          <>
            {/* LÉGENDE */}
            <div className="flex flex-wrap gap-4 mb-6">
              <div className="flex items-center gap-2 text-xs"><div className="w-3 h-3 rounded-full bg-blue-500" /><span className="text-gray-400">Tâches</span></div>
              <div className="flex items-center gap-2 text-xs"><div className="w-3 h-3 rounded-full bg-pink-500" /><span className="text-gray-400">Famille</span></div>
              <div className="flex items-center gap-2 text-xs"><div className="w-3 h-3 rounded-full bg-green-500" /><span className="text-gray-400">Ferme</span></div>
              <div className="flex items-center gap-2 text-xs"><div className="w-3 h-3 rounded-full bg-orange-500" /><span className="text-gray-400">Documents</span></div>
            </div>

            {/* CALENDRIER HEADER */}
            <div className="flex justify-between items-center mb-4">
              <button onClick={prevMonth} className="p-2 hover:bg-white/10 rounded-lg"><ChevronLeft className="w-5 h-5" /></button>
              <div className="flex items-center gap-4">
                <h2 className="text-xl font-serif text-gold-500">{monthNames[month]} {year}</h2>
                <button onClick={goToToday} className="text-xs bg-white/10 px-3 py-1 rounded-full hover:bg-white/20">Aujourd'hui</button>
              </div>
              <button onClick={nextMonth} className="p-2 hover:bg-white/10 rounded-lg"><ChevronRight className="w-5 h-5" /></button>
            </div>

            {/* CALENDRIER GRILLE */}
            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
              <div className="grid grid-cols-7 border-b border-white/10">
                {dayNames.map(day => <div key={day} className="p-3 text-center text-xs text-gray-500 font-medium">{day}</div>)}
              </div>
              <div className="grid grid-cols-7 auto-rows-fr">
                {Array.from({ length: adjustedFirstDay }).map((_, i) => <div key={`empty-${i}`} className="min-h-[100px] p-2 border-r border-b border-white/5 bg-black/20" />)}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const events = getEventsForDate(year, month, day);
                  const isToday = dateStr === todayStr;
                  const isSelected = dateStr === selectedDate;
                  const taskCount = events.filter(e => e.type === "task").length;
                  const familyCount = events.filter(e => e.type === "family").length;
                  const farmCount = events.filter(e => e.type === "farm").length;
                  const docCount = events.filter(e => e.type === "document").length;
                  
                  return (
                    <div onClick={() => handleDateClick(year, month, day)} className={`min-h-[100px] p-2 border-r border-b border-white/5 cursor-pointer transition-all hover:bg-white/5 ${isToday ? "bg-gold-500/5" : ""} ${isSelected ? "bg-gold-500/10 border-gold-500/30" : ""}`}>
                      <div className={`text-right mb-1 ${isToday ? "text-gold-500 font-bold" : "text-gray-400"}`}>{day}</div>
                      <div className="flex flex-wrap gap-1">
                        {taskCount > 0 && <div className="w-2 h-2 rounded-full bg-blue-500" title={`${taskCount} tâche(s)`} />}
                        {familyCount > 0 && <div className="w-2 h-2 rounded-full bg-pink-500" title={`${familyCount} événement(s) familial(aux)`} />}
                        {farmCount > 0 && <div className="w-2 h-2 rounded-full bg-green-500" title={`${farmCount} tâche(s) ferme`} />}
                        {docCount > 0 && <div className="w-2 h-2 rounded-full bg-orange-500" title={`${docCount} document(s)`} />}
                      </div>
                      {events.length > 0 && <div className="mt-1 text-[10px] text-gray-500 truncate">{events.length} événement(s)</div>}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* DÉTAIL DU JOUR SÉLECTIONNÉ */}
            {selectedDate && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-8 bg-white/5 border border-white/10 rounded-2xl p-6">
                <h2 className="text-lg font-serif text-gold-500 mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Événements du {new Date(selectedDate).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                </h2>
                {selectedEvents.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">Aucun événement prévu ce jour</p>
                ) : (
                  <div className="space-y-3">
                    {selectedEvents.map((event, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-midnight rounded-xl border border-white/5">
                        <div className="flex items-center gap-3">
                          {event.type === "task" && <Target className="w-4 h-4 text-blue-400" />}
                          {event.type === "family" && <Heart className="w-4 h-4 text-pink-400" />}
                          {event.type === "farm" && <Sprout className="w-4 h-4 text-green-400" />}
                          {event.type === "document" && <FileText className="w-4 h-4 text-orange-400" />}
                          <div><p className="text-ivory text-sm">{event.title}</p><p className="text-xs text-gray-500 capitalize">{event.type}</p></div>
                        </div>
                        {event.priority && <span className={`text-xs px-2 py-1 rounded-full ${getPriorityColor(event.priority)}`}>{event.priority === "critical" ? "Critical" : event.priority === "high" ? "Haute" : event.priority === "normal" ? "Normale" : "Basse"}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </>
        )}

        {/* ==================== ONGLET TÂCHES ==================== */}
        {activeTab === "tasks" && (
          <div>
            {/* STATS TÂCHES */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                <div className="text-2xl font-serif text-ivory">{taskStats.total}</div>
                <div className="text-xs text-gray-500">Total</div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                <div className="text-2xl font-serif text-orange-400">{taskStats.today}</div>
                <div className="text-xs text-gray-500">Aujourd'hui</div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                <div className="text-2xl font-serif text-blue-400">{taskStats.in_progress}</div>
                <div className="text-xs text-gray-500">En cours</div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                <div className="text-2xl font-serif text-emerald-400">{taskStats.done}</div>
                <div className="text-xs text-gray-500">Terminées</div>
              </div>
            </div>

            {/* FILTRES */}
            <div className="flex flex-wrap gap-3 mb-6">
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm">
                <option value="all">📋 Tous les statuts</option>
                {Object.entries(statusConfig).map(([key, conf]) => <option key={key} value={key}>{conf.label}</option>)}
              </select>
              <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} className="bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm">
                <option value="all">🚩 Toutes les priorités</option>
                {Object.entries(priorityConfig).map(([key, conf]) => <option key={key} value={key}>{conf.label}</option>)}
              </select>
              <button onClick={() => { setShowTaskForm(true); setEditingTaskId(null); scrollToForm(); }} className="bg-gold-500 text-midnight px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2">
                <Plus className="w-4 h-4" /> Nouvelle tâche
              </button>
            </div>

            {/* FORMULAIRE TÂCHE */}
            <AnimatePresence>
              {showTaskForm && (
                <motion.div id="form-container" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 mb-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-serif text-ivory">{editingTaskId ? "Modifier" : "Nouvelle"} tâche</h3>
                    <button onClick={resetTaskForm} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="text" placeholder="Titre de la tâche" value={taskFormData.title} onChange={(e) => setTaskFormData({ ...taskFormData, title: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-ivory md:col-span-2" />
                    <select value={taskFormData.status} onChange={(e) => setTaskFormData({ ...taskFormData, status: e.target.value as Task["status"] })} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-ivory">
                      {Object.entries(statusConfig).map(([key, conf]) => <option key={key} value={key}>{conf.label}</option>)}
                    </select>
                    <select value={taskFormData.priority} onChange={(e) => setTaskFormData({ ...taskFormData, priority: e.target.value as Task["priority"] })} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-ivory">
                      {Object.entries(priorityConfig).map(([key, conf]) => <option key={key} value={key}>{conf.label}</option>)}
                    </select>
                    <select value={taskFormData.project} onChange={(e) => setTaskFormData({ ...taskFormData, project: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-ivory">
                      {projects.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                    <input type="date" value={taskFormData.due_date} onChange={(e) => setTaskFormData({ ...taskFormData, due_date: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-ivory" />
                    <input type="number" placeholder="Temps estimé (minutes)" value={taskFormData.estimated_time} onChange={(e) => setTaskFormData({ ...taskFormData, estimated_time: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-ivory" />
                  </div>
                  <div className="flex items-center gap-2 mt-4 pt-2 border-t border-white/10">
                    <input type="checkbox" id="syncCalendar" checked={syncCalendar} onChange={(e) => setSyncCalendar(e.target.checked)} className="w-4 h-4 rounded border-white/20 bg-white/5 text-gold-500" />
                    <label htmlFor="syncCalendar" className="text-sm text-gray-400">📅 Synchroniser avec Google Calendar</label>
                  </div>
                  <div className="flex gap-3 mt-6">
                    <button onClick={saveTask} className="bg-gold-500 text-midnight px-6 py-2 rounded-full font-medium hover:bg-gold-400 transition-colors">
                      {editingTaskId ? "Mettre à jour" : "Enregistrer"}
                    </button>
                    <button onClick={resetTaskForm} className="bg-white/10 px-6 py-2 rounded-full hover:bg-white/20 transition-colors">Annuler</button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* LISTE DES TÂCHES */}
            <div className="space-y-3">
              {isTasksLoading ? <LoadingSpinner /> : filteredTasks.length === 0 ? (
                <div className="text-center py-12 text-gray-500"><CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-30" /><p>Aucune tâche</p></div>
              ) : (
                filteredTasks.map((task) => {
                  const statusConf = statusConfig[task.status as keyof typeof statusConfig] || statusConfig.not_started;
                  const priorityConf = priorityConfig[task.priority as keyof typeof priorityConfig] || priorityConfig.normal;
                  const StatusIcon = statusConf.icon;
                  const PriorityIcon = priorityConf.icon;
                  
                  return (
                    <motion.div key={task.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className={`bg-white/5 border-l-4 ${statusConf.border} rounded-xl p-4 hover:bg-white/10 transition-colors`}>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 flex-wrap mb-2">
                            <h3 className="text-ivory font-medium">{task.title}</h3>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${priorityConf.color}`}><PriorityIcon className="w-3 h-3 inline mr-1" /> {priorityConf.label}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${statusConf.color}`}><StatusIcon className="w-3 h-3 inline mr-1" /> {statusConf.label}</span>
                            {task.calendar_synced && <span className="text-xs text-emerald-400 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> 📅 Synchronisé</span>}
                          </div>
                          <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                            <span className="flex items-center gap-1"><FolderOpen className="w-3 h-3" /> {task.project}</span>
                            {task.due_date && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(task.due_date).toLocaleDateString('fr-FR')}</span>}
                            {task.estimated_time && <span>⏱️ {task.estimated_time} min</span>}
                            {task.calendar_link && <a href={task.calendar_link} target="_blank" rel="noopener noreferrer" className="text-gold-500 hover:underline flex items-center gap-1">Voir dans Calendar →</a>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <select value={task.status} onChange={(e) => updateTaskStatus(task.id, e.target.value as Task["status"])} className="bg-white/10 border border-white/10 rounded-lg px-2 py-1 text-xs">
                            {Object.entries(statusConfig).map(([key, conf]) => <option key={key} value={key}>{conf.label}</option>)}
                          </select>
                          <button onClick={() => editTask(task)} className="text-gray-500 hover:text-gold-500"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => deleteTask(task.id)} className="text-gray-500 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
