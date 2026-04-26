"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import LoadingSpinner from "@/components/LoadingSpinner";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Globe, Plane, CheckCircle, Clock, AlertCircle, 
  Calendar, Home, FileText, Building2, Truck, 
  TrendingUp, Shield, Plus, Edit2, Trash2, X
} from "lucide-react";
import { Users } from "lucide-react";

type RelocationTask = {
  id: string;
  title: string;
  category: string;
  status: string;
  priority: string;
  due_date: string | null;
  notes: string | null;
  created_at: string;
};

export default function RelocationPage() {
  const [tasks, setTasks] = useState<RelocationTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<RelocationTask | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  
  const [formData, setFormData] = useState({
    title: "",
    category: "admin",
    status: "not_started",
    priority: "normal",
    due_date: "",
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

  useEffect(() => {
  fetchTasks();
  
  const channel = supabase
    .channel('relocation_tasks')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'relocation_tasks' }, () => fetchTasks())
    .subscribe();
  
  return () => {
    channel.unsubscribe();
  };
}, []);
  

  async function fetchTasks() {
    setIsLoading(true);
    const { data } = await supabase
      .from("relocation_tasks")
      .select("*")
      .order("due_date", { ascending: true, nullsFirst: false });
    setTasks(data || []);
    setIsLoading(false);
  }

  async function saveTask() {
    const data = {
      title: formData.title,
      category: formData.category,
      status: formData.status,
      priority: formData.priority,
      due_date: formData.due_date || null,
      notes: formData.notes || null
    };
    
    let error;
    if (editingTask) {
      const result = await supabase.from("relocation_tasks").update(data).eq("id", editingTask.id);
      error = result.error;
    } else {
      const result = await supabase.from("relocation_tasks").insert(data);
      error = result.error;
    }
    
    if (!error) {
      resetForm();
      fetchTasks();
    } else {
      alert("Erreur: " + error.message);
    }
  }

  async function updateStatus(id: string, newStatus: string) {
    const { error } = await supabase.from("relocation_tasks").update({ status: newStatus }).eq("id", id);
    if (!error) fetchTasks();
  }

  async function deleteTask(id: string) {
    if (confirm("Supprimer cette tâche ?")) {
      const { error } = await supabase.from("relocation_tasks").delete().eq("id", id);
      if (!error) fetchTasks();
    }
  }

  function editTask(task: RelocationTask) {
    setEditingTask(task);
    setFormData({
      title: task.title,
      category: task.category,
      status: task.status,
      priority: task.priority,
      due_date: task.due_date || "",
      notes: task.notes || ""
    });
    setShowForm(true);
    scrollToForm(); 
  }

  function resetForm() {
    setShowForm(false);
    setEditingTask(null);
    setFormData({
      title: "",
      category: "admin",
      status: "not_started",
      priority: "normal",
      due_date: "",
      notes: ""
    });
  }

  const getStatusIcon = (status: string) => {
    const name = status?.toLowerCase() || "";
    if (name.includes("completed") || name.includes("done") || name.includes("fait") || name.includes("terminé")) 
      return <CheckCircle className="w-4 h-4 text-emerald-400" />;
    if (name.includes("in_progress") || name.includes("cours") || name.includes("progress")) 
      return <Clock className="w-4 h-4 text-blue-400" />;
    if (name.includes("urgent")) 
      return <AlertCircle className="w-4 h-4 text-red-400" />;
    return <Clock className="w-4 h-4 text-yellow-400" />;
  };

  const getStatusColor = (status: string) => {
    const name = status?.toLowerCase() || "";
    if (name.includes("completed") || name.includes("done") || name.includes("fait") || name.includes("terminé")) 
      return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
    if (name.includes("in_progress") || name.includes("cours") || name.includes("progress")) 
      return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    if (name.includes("urgent")) 
      return "bg-red-500/20 text-red-400 border-red-500/30";
    return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
  };

  const getStatusLabel = (status: string) => {
    const name = status?.toLowerCase() || "";
    if (name.includes("completed") || name.includes("done") || name.includes("fait") || name.includes("terminé")) 
      return "Terminé";
    if (name.includes("in_progress") || name.includes("cours") || name.includes("progress")) 
      return "En cours";
    if (name.includes("urgent")) 
      return "Urgent";
    return "À faire";
  };

  const getCategoryIcon = (category: string) => {
    const name = category?.toLowerCase() || "";
    if (name.includes("admin") || name.includes("papier") || name.includes("document")) 
      return <FileText className="w-4 h-4" />;
    if (name.includes("housing") || name.includes("logement") || name.includes("maison")) 
      return <Home className="w-4 h-4" />;
    if (name.includes("transport") || name.includes("shipping")) 
      return <Truck className="w-4 h-4" />;
    if (name.includes("money")) 
      return <TrendingUp className="w-4 h-4" />;
    if (name.includes("children")) 
      return <Users className="w-4 h-4" />;
    return <Plane className="w-4 h-4" />;
  };

  const getCategoryLabel = (category: string) => {
    const name = category?.toLowerCase() || "";
    if (name.includes("admin")) return "📄 Administratif";
    if (name.includes("housing")) return "🏠 Logement";
    if (name.includes("transport")) return "🚚 Transport";
    if (name.includes("money")) return "💰 Finances";
    if (name.includes("children")) return "👶 Enfants";
    return "✈️ Voyage";
  };

  const filteredTasks = tasks.filter(t => {
    if (filterCategory === "all") return true;
    return t.category === filterCategory;
  });

  const stats = {
    total: tasks.length,
    completed: tasks.filter(t => t.status === "completed" || t.status === "done").length,
    inProgress: tasks.filter(t => t.status === "in_progress").length,
    urgent: tasks.filter(t => t.priority === "urgent" || t.status === "urgent").length,
  };

  const completionRate = stats.total > 0 ? ((stats.completed / stats.total) * 100).toFixed(0) : "0";

  const urgentTasks = tasks.filter(t => t.priority === "urgent" || t.status === "urgent");
  
  const upcomingDeadlines = tasks
    .filter(t => t.due_date && t.status !== "completed" && t.status !== "done")
    .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())
    .slice(0, 5);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const today = new Date();
    const diffDays = Math.ceil((date.getTime() - today.getTime()) / (1000 * 3600 * 24));
    
    if (diffDays < 0) return "⚠️ En retard";
    if (diffDays === 0) return "📍 Aujourd'hui";
    if (diffDays === 1) return "📅 Demain";
    return `📅 Dans ${diffDays} jours`;
  };

  const categoriesList = [
    { id: "all", label: "📁 Toutes" },
    { id: "admin", label: "📄 Administratif" },
    { id: "housing", label: "🏠 Logement" },
    { id: "transport", label: "🚚 Transport" },
    { id: "money", label: "💰 Finances" },
    { id: "children", label: "👶 Enfants" }
  ];

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
              Relocation Command
            </motion.h1>
            <p className="text-gray-500 mt-2 italic font-light">
              Pilotage de l'expatriation vers le Bénin
            </p>
          </div>
          <button
            onClick={() => {      setShowForm(true);      setEditingTask(null);     scrollToForm();   }}
            className="bg-gold-500 text-midnight px-5 py-2 rounded-full text-sm font-medium flex items-center gap-2 hover:bg-gold-400 transition-colors"
          >
            <Plus className="w-4 h-4" /> Ajouter une tâche
          </button>
        </div>
      </header>

      {/* STATISTIQUES */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
          <div className="text-2xl font-serif text-ivory">{stats.total}</div>
          <div className="text-xs text-gray-500 uppercase mt-1">Tâches totales</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
          <div className="text-2xl font-serif text-emerald-400">{stats.completed}</div>
          <div className="text-xs text-gray-500 uppercase mt-1">Terminées</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
          <div className="text-2xl font-serif text-blue-400">{stats.inProgress}</div>
          <div className="text-xs text-gray-500 uppercase mt-1">En cours</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
          <div className="text-2xl font-serif text-red-400">{stats.urgent}</div>
          <div className="text-xs text-gray-500 uppercase mt-1">Urgentes</div>
        </div>
      </div>

      {/* BARRE DE PROGRESSION */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-8">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-400 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-gold-500" />
            Progression de la relocalisation
          </span>
          <span className="text-sm text-gold-500">{completionRate}%</span>
        </div>
        <div className="w-full bg-white/10 rounded-full h-2">
          <div 
            className="bg-gold-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${completionRate}%` }}
          />
        </div>
      </div>

      {/* ALERTES URGENTES */}
      {urgentTasks.length > 0 && (
        <div className="bg-red-950/20 border border-red-500/30 rounded-2xl p-5 mb-8">
          <h3 className="text-sm font-serif text-red-400 mb-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Tâches urgentes ({urgentTasks.length})
          </h3>
          <div className="space-y-2">
            {urgentTasks.map((task) => (
              <div key={task.id} className="flex items-center justify-between p-3 bg-midnight rounded-xl border border-red-500/30">
                <span className="text-ivory text-sm">{task.title}</span>
                {task.due_date && (
                  <span className="text-xs text-red-400">{formatDate(task.due_date)}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PROCHAINES ÉCHÉANCES */}
      {upcomingDeadlines.length > 0 && (
        <div className="bg-blue-950/20 border border-blue-500/30 rounded-2xl p-5 mb-8">
          <h3 className="text-sm font-serif text-blue-400 mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Prochaines échéances
          </h3>
          <div className="space-y-2">
            {upcomingDeadlines.map((task) => (
              <div key={task.id} className="flex items-center justify-between p-3 bg-midnight rounded-xl border border-blue-500/20">
                <span className="text-ivory text-sm">{task.title}</span>
                <span className="text-xs text-blue-400">{formatDate(task.due_date!)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FILTRES */}
      <div className="flex flex-wrap gap-2 mb-6">
        {categoriesList.map(cat => (
          <button
            key={cat.id}
            onClick={() => setFilterCategory(cat.id)}
            className={`px-4 py-2 rounded-full text-sm transition-all ${filterCategory === cat.id ? "bg-gold-500 text-midnight" : "bg-white/5 text-gray-400 hover:bg-white/10"}`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* FORMULAIRE AJOUT */}
      <AnimatePresence>
        {showForm && (
          <motion.div id="form-container" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 mb-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-serif text-ivory">{editingTask ? "Modifier" : "Ajouter"} une tâche</h3>
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
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-gold-500 text-ivory"
              >
                <option value="admin">📄 Administratif</option>
                <option value="housing">🏠 Logement</option>
                <option value="transport">🚚 Transport</option>
                <option value="money">💰 Finances</option>
                <option value="children">👶 Enfants</option>
              </select>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-gold-500 text-ivory"
              >
                <option value="not_started">⏳ À faire</option>
                <option value="in_progress">🔄 En cours</option>
                <option value="completed">✅ Terminé</option>
                <option value="urgent">⚠️ Urgent</option>
              </select>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-gold-500 text-ivory"
              >
                <option value="low">🟢 Basse</option>
                <option value="normal">🟡 Normale</option>
                <option value="high">🔴 Haute</option>
                <option value="urgent">⚠️ Urgente</option>
              </select>
              <input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
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
              <button onClick={saveTask} className="bg-gold-500 text-midnight px-6 py-2 rounded-full font-medium hover:bg-gold-400 transition-colors">
                {editingTask ? "Mettre à jour" : "Enregistrer"}
              </button>
              <button onClick={resetForm} className="bg-white/10 px-6 py-2 rounded-full hover:bg-white/20 transition-colors">Annuler</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* LISTE DES TÂCHES PAR CATÉGORIE */}
        {isLoading ? (
                  <div className="flex-1 flex items-center justify-center py-20">
                    <LoadingSpinner />
                  </div>
                ) : (
        <>
      <div className="space-y-6">
        {categoriesList.filter(c => c.id !== "all").map(cat => {
          const categoryTasks = filteredTasks.filter(t => t.category === cat.id);
          if (categoryTasks.length === 0) return null;
          
          return (
            <div key={cat.id} className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <h2 className="text-lg font-serif text-ivory mb-4 flex items-center gap-2">
                {getCategoryIcon(cat.id)}
                {getCategoryLabel(cat.id)}
              </h2>
              <div className="space-y-3">
                {categoryTasks.map((task) => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center justify-between p-3 bg-midnight rounded-xl border border-white/5 hover:border-gold-500/20 transition-all"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      {getStatusIcon(task.status)}
                      <span className="text-ivory text-sm">{task.title}</span>
                      {task.due_date && (
                        <span className="text-xs text-gray-500 ml-2">{formatDate(task.due_date)}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={task.status}
                        onChange={(e) => updateStatus(task.id, e.target.value)}
                        className="bg-white/10 border border-white/10 rounded-lg px-2 py-1 text-xs focus:outline-none"
                      >
                        <option value="not_started">⏳ À faire</option>
                        <option value="in_progress">🔄 En cours</option>
                        <option value="completed">✅ Terminé</option>
                        <option value="urgent">⚠️ Urgent</option>
                      </select>
                      <button onClick={() => editTask(task)} className="text-gray-500 hover:text-gold-500">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => deleteTask(task.id)} className="text-gray-500 hover:text-red-400">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* CONSEIL */}
      <div className="mt-8 p-5 bg-gradient-to-r from-gold-500/10 to-transparent rounded-2xl border border-gold-500/20">
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5 text-gold-500" />
          <div>
            <p className="text-xs text-gold-500 uppercase tracking-wider">Conseil Sovereign</p>
            <p className="text-ivory text-sm mt-1">Une étape à la fois. Le Bénin t'attend, prépare-toi sereinement.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
