"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import LoadingSpinner from "@/components/LoadingSpinner";
import { exportTasksToPDF } from "@/lib/exportPDF";
import { motion, AnimatePresence } from "framer-motion";
import { 
  CheckCircle, Clock, AlertCircle, Plus, Trash2, Edit2, 
  X, Flag, Calendar, FolderOpen, Loader2, Download
} from "lucide-react";
import Link from "next/link";

type Task = {
  id: string;
  title: string;
  status: "not_started" | "today" | "in_progress" | "waiting" | "done";
  priority: "critical" | "high" | "normal" | "low";
  project: string;
  due_date: string | null;
  estimated_time: number | null;
  mission_id: string | null;
  created_at: string;
};

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

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");

 const scrollToForm = () => {
  setTimeout(() => {
    const formElement = document.getElementById('form-container');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, 150);
};
  
  const [formData, setFormData] = useState({
    title: "",
    status: "not_started" as Task["status"],
    priority: "normal" as Task["priority"],
    project: "Ifè Farm",
    due_date: "",
    estimated_time: ""
  });

  useEffect(() => {
  fetchTasks();
  
  const channel = supabase
    .channel('tasks_changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => fetchTasks())
    .subscribe();
  
  return () => {
    channel.unsubscribe();
  };
}, []);
  
  async function fetchTasks() {
    setIsLoading(true);
    const { data } = await supabase
      .from("tasks")
      .select("*")
      .order("created_at", { ascending: false });
    setTasks(data || []);
    setIsLoading(false);
  }

  async function saveTask() {
    const data = {
      title: formData.title,
      status: formData.status,
      priority: formData.priority,
      project: formData.project,
      due_date: formData.due_date || null,
      estimated_time: formData.estimated_time ? parseInt(formData.estimated_time) : null
    };
    
    let error;
    if (editingId) {
      const result = await supabase.from("tasks").update(data).eq("id", editingId);
      error = result.error;
    } else {
      const result = await supabase.from("tasks").insert(data);
      error = result.error;
    }
    
    if (!error) {
      resetForm();
      fetchTasks();
    } else {
      alert("Erreur: " + error.message);
    }
  }

  async function updateStatus(id: string, newStatus: Task["status"]) {
    const { error } = await supabase.from("tasks").update({ status: newStatus }).eq("id", id);
    if (!error) fetchTasks();
  }

  async function deleteTask(id: string) {
    if (confirm("Supprimer cette tâche ?")) {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (!error) fetchTasks();
    }
  }

function editTask(task: Task) {
  setFormData({
    title: task.title,
    status: task.status,
    priority: task.priority,
    project: task.project,
    due_date: task.due_date || "",
    estimated_time: task.estimated_time?.toString() || ""
  });
  setEditingId(task.id);
  setShowForm(true);
  scrollToForm(); 
}

  function resetForm() {
    setShowForm(false);
    setEditingId(null);
    setFormData({
      title: "",
      status: "not_started",
      priority: "normal",
      project: "Ifè Farm",
      due_date: "",
      estimated_time: ""
    });
  }

  const filteredTasks = tasks.filter(t => {
    if (filterStatus !== "all" && t.status !== filterStatus) return false;
    if (filterPriority !== "all" && t.priority !== filterPriority) return false;
    return true;
  });

  const stats = {
    total: tasks.length,
    today: tasks.filter(t => t.status === "today").length,
    in_progress: tasks.filter(t => t.status === "in_progress").length,
    done: tasks.filter(t => t.status === "done").length
  };

  return (
    <div className="p-6 lg:p-10 h-full flex flex-col overflow-y-auto bg-midnight">
      {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-serif text-gold-500 tracking-tight">Task Command</h1>
            <p className="text-gray-500 text-sm mt-1">Gestion des priorités et exécution</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => exportTasksToPDF(filteredTasks)}
              className="bg-white/10 p-2 rounded-full hover:bg-white/20 transition-colors"
              title="Exporter les tâches en PDF"
            >
              <Download className="w-5 h-5" />
            </button>
            <button
              onClick={() => { 
                setShowForm(true); 
                setEditingId(null);
                scrollToForm();
              }}
              className="bg-gold-500 text-midnight px-5 py-2 rounded-full text-sm font-medium flex items-center gap-2 hover:bg-gold-400 transition-colors"
            >
              <Plus className="w-4 h-4" /> Nouvelle tâche
            </button>
          </div>
        </div>

      {/* STATS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
          <div className="text-2xl font-serif text-ivory">{stats.total}</div>
          <div className="text-xs text-gray-500">Total</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
          <div className="text-2xl font-serif text-orange-400">{stats.today}</div>
          <div className="text-xs text-gray-500">Aujourd'hui</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
          <div className="text-2xl font-serif text-blue-400">{stats.in_progress}</div>
          <div className="text-xs text-gray-500">En cours</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
          <div className="text-2xl font-serif text-emerald-400">{stats.done}</div>
          <div className="text-xs text-gray-500">Terminées</div>
        </div>
      </div>

      {/* FILTRES */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-gold-500"
        >
          <option value="all">📋 Tous les statuts</option>
          {Object.entries(statusConfig).map(([key, conf]) => (
            <option key={key} value={key}>{conf.label}</option>
          ))}
        </select>
        
        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-gold-500"
        >
          <option value="all">🚩 Toutes les priorités</option>
          {Object.entries(priorityConfig).map(([key, conf]) => (
            <option key={key} value={key}>{conf.label}</option>
          ))}
        </select>
      </div>

      {/* FORMULAIRE */}
      <AnimatePresence>
    {showForm && (
      <motion.div id="form-container" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 mb-8"> 
        <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-serif text-ivory">{editingId ? "Modifier" : "Nouvelle"} tâche</h3>
              <button onClick={resetForm} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Titre de la tâche"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-gold-500 text-ivory md:col-span-2"
              />
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as Task["status"] })}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-gold-500 text-ivory"
              >
                {Object.entries(statusConfig).map(([key, conf]) => <option key={key} value={key}>{conf.label}</option>)}
              </select>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as Task["priority"] })}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-gold-500 text-ivory"
              >
                {Object.entries(priorityConfig).map(([key, conf]) => <option key={key} value={key}>{conf.label}</option>)}
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
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-gold-500 text-ivory"
              />
              <input
                type="number"
                placeholder="Temps estimé (minutes)"
                value={formData.estimated_time}
                onChange={(e) => setFormData({ ...formData, estimated_time: e.target.value })}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-gold-500 text-ivory"
              />
            </div>
            
            <div className="flex gap-3 mt-6">
              <button onClick={saveTask} className="bg-gold-500 text-midnight px-6 py-2 rounded-full font-medium hover:bg-gold-400 transition-colors">
                {editingId ? "Mettre à jour" : "Enregistrer"}
              </button>
              <button onClick={resetForm} className="bg-white/10 px-6 py-2 rounded-full hover:bg-white/20 transition-colors">Annuler</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* LISTE DES TÂCHES - CORRIGÉE AVEC FALLBACK */}
      <div className="space-y-3">
        {isLoading ? (
          <LoadingSpinner />
        ) : filteredTasks.length === 0 ? (
          <div className="text-center py-12 text-gray-500">Aucune tâche</div>
        ) : (
          filteredTasks.map((task) => {
            // Fallback pour éviter les erreurs si status ou priority est invalide
            const statusConf = statusConfig[task.status as keyof typeof statusConfig] || statusConfig.not_started;
            const priorityConf = priorityConfig[task.priority as keyof typeof priorityConfig] || priorityConfig.normal;
            const StatusIcon = statusConf.icon;
            const PriorityIcon = priorityConf.icon;
            
            return (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className={`bg-white/5 border-l-4 ${statusConf.border} rounded-xl p-4 hover:bg-white/10 transition-colors`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 flex-wrap mb-2">
                      <h3 className="text-ivory font-medium">{task.title}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${priorityConf.color}`}>
                        <PriorityIcon className="w-3 h-3 inline mr-1" />
                        {priorityConf.label}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusConf.color}`}>
                        <StatusIcon className="w-3 h-3 inline mr-1" />
                        {statusConf.label}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1"><FolderOpen className="w-3 h-3" /> {task.project}</span>
                      {task.due_date && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(task.due_date).toLocaleDateString('fr-FR')}</span>}
                      {task.estimated_time && <span>⏱️ {task.estimated_time} min</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={task.status}
                      onChange={(e) => updateStatus(task.id, e.target.value as Task["status"])}
                      className="bg-white/10 border border-white/10 rounded-lg px-2 py-1 text-xs focus:outline-none"
                    >
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
  );
}
