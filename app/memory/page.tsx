"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Brain, Plus, Trash2, Edit2, X, Check, 
  Heart, Briefcase, DollarSign, User, Baby, 
  FolderOpen, Sparkles, Loader2, AlertCircle,
  ChevronDown, ChevronRight
} from "lucide-react";
import { toast } from "sonner";

type Memory = {
  id: string;
  category: string;
  key: string;
  value: string;
  created_at: string;
  updated_at: string;
};

const categoryConfig: Record<string, { label: string; icon: any; color: string }> = {
  identity: { label: "👤 Identité", icon: User, color: "bg-blue-500/20 text-blue-400" },
  family: { label: "👨‍👩‍👧‍👦 Famille", icon: Heart, color: "bg-pink-500/20 text-pink-400" },
  business: { label: "💼 Business", icon: Briefcase, color: "bg-purple-500/20 text-purple-400" },
  money: { label: "💰 Argent", icon: DollarSign, color: "bg-emerald-500/20 text-emerald-400" },
  projects: { label: "📁 Projets", icon: FolderOpen, color: "bg-orange-500/20 text-orange-400" },
  preferences: { label: "⚙️ Préférences", icon: Sparkles, color: "bg-yellow-500/20 text-yellow-400" },
  emotions: { label: "❤️ Émotions", icon: Heart, color: "bg-red-500/20 text-red-400" },
  other: { label: "📝 Autre", icon: Brain, color: "bg-gray-500/20 text-gray-400" }
};

export default function MemoryPage() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  
  const [formData, setFormData] = useState({
    category: "identity",
    key: "",
    value: ""
  });

  useEffect(() => {
    fetchMemories();
  }, []);

  async function fetchMemories() {
    setIsLoading(true);
    const { data } = await supabase
      .from("user_memory")
      .select("*")
      .order("created_at", { ascending: false });
    setMemories(data || []);
    setIsLoading(false);
  }

  async function saveMemory() {
    if (!formData.key || !formData.value) {
      toast.error("Le titre et la valeur sont requis");
      return;
    }

    const data = {
      category: formData.category,
      key: formData.key,
      value: formData.value,
      user_id: "rebecca"
    };

    let error;
    if (editingId) {
      const result = await supabase
        .from("user_memory")
        .update(data)
        .eq("id", editingId);
      error = result.error;
    } else {
      const result = await supabase
        .from("user_memory")
        .insert(data);
      error = result.error;
    }

    if (!error) {
      toast.success(editingId ? "Souvenir modifié" : "Nouveau souvenir ajouté");
      resetForm();
      fetchMemories();
    } else {
      toast.error("Erreur: " + error.message);
    }
  }

  async function deleteMemory(id: string) {
    if (confirm("Supprimer ce souvenir ?")) {
      const { error } = await supabase
        .from("user_memory")
        .delete()
        .eq("id", id);
      if (!error) {
        toast.success("Souvenir supprimé");
        fetchMemories();
      }
    }
  }

  function editMemory(memory: Memory) {
    setFormData({
      category: memory.category,
      key: memory.key,
      value: memory.value
    });
    setEditingId(memory.id);
    setShowForm(true);
  }

  function resetForm() {
    setShowForm(false);
    setEditingId(null);
    setFormData({
      category: "identity",
      key: "",
      value: ""
    });
  }

  const filteredMemories = memories.filter(memory => {
    if (selectedCategory !== "all" && memory.category !== selectedCategory) return false;
    if (searchTerm && !memory.key.toLowerCase().includes(searchTerm.toLowerCase()) 
        && !memory.value.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const memoriesByCategory = filteredMemories.reduce((acc, memory) => {
    if (!acc[memory.category]) acc[memory.category] = [];
    acc[memory.category].push(memory);
    return acc;
  }, {} as Record<string, Memory[]>);

  return (
    <div className="h-full flex flex-col overflow-y-auto bg-midnight p-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Brain className="w-8 h-8 text-gold-500" />
            <h1 className="text-3xl md:text-4xl font-serif text-gold-500 tracking-tight">
              Mémoire de Becks
            </h1>
          </div>
          <p className="text-gray-500 text-sm">
            Ce que Becks sait de toi. Modifie ou supprime les souvenirs.
          </p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditingId(null); setFormData({ category: "identity", key: "", value: "" }); }}
          className="bg-gold-500 text-midnight px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 hover:bg-gold-400 transition-colors"
        >
          <Plus className="w-4 h-4" /> Ajouter un souvenir
        </button>
      </div>

      {/* Formulaire d'ajout */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 mb-6"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-serif text-ivory">
                {editingId ? "Modifier" : "Nouveau"} souvenir
              </h3>
              <button onClick={resetForm} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-gold-500 text-ivory"
              >
                {Object.entries(categoryConfig).map(([key, conf]) => (
                  <option key={key} value={key}>{conf.label}</option>
                ))}
              </select>

              <input
                type="text"
                placeholder="Titre (ex: 'nom_complet', 'projet_principal')"
                value={formData.key}
                onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-gold-500 text-ivory"
              />

              <textarea
                placeholder="Valeur (ex: 'Rebecca, mère de 4 filles, entrepreneur')"
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-gold-500 text-ivory md:col-span-2"
                rows={3}
              />
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={saveMemory} className="bg-gold-500 text-midnight px-6 py-2 rounded-full font-medium hover:bg-gold-400 transition-colors">
                {editingId ? "Mettre à jour" : "Enregistrer"}
              </button>
              <button onClick={resetForm} className="bg-white/10 px-6 py-2 rounded-full hover:bg-white/20 transition-colors">
                Annuler
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Barre de recherche et filtre */}
      <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="Rechercher un souvenir..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-4 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-ivory placeholder:text-gray-500 focus:outline-none focus:border-gold-500"
          />
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-gold-500 text-ivory"
        >
          <option value="all">📁 Toutes les catégories</option>
          {Object.entries(categoryConfig).map(([key, conf]) => (
            <option key={key} value={key}>{conf.label}</option>
          ))}
        </select>
      </div>

      {/* Liste des souvenirs par catégorie */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 text-gold-500 animate-spin" />
        </div>
      ) : Object.keys(memoriesByCategory).length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Brain className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p>Aucun souvenir en mémoire</p>
          <p className="text-sm mt-2">Clique sur "Ajouter un souvenir" pour commencer</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(memoriesByCategory).map(([category, categoryMemories]) => {
            const config = categoryConfig[category] || categoryConfig.other;
            const Icon = config.icon;
            
            return (
              <div key={category} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                <div className="bg-white/5 px-4 py-3 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4" />
                    <h2 className="text-sm font-medium text-ivory">{config.label}</h2>
                    <span className="text-xs text-gray-500">({categoryMemories.length})</span>
                  </div>
                </div>
                <div className="divide-y divide-white/5">
                  {categoryMemories.map((memory) => (
                    <div key={memory.id} className="p-4 hover:bg-white/5 transition-colors">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="text-ivory font-medium">{memory.key}</p>
                          <p className="text-sm text-gray-400 mt-1">{memory.value}</p>
                          <p className="text-xs text-gray-600 mt-2">
                            Ajouté le {new Date(memory.created_at).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => editMemory(memory)}
                            className="p-1.5 text-gray-500 hover:text-gold-500 transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteMemory(memory.id)}
                            className="p-1.5 text-gray-500 hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Message d'information */}
      <div className="mt-8 p-4 bg-gold-500/10 border border-gold-500/20 rounded-xl">
        <div className="flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-gold-500" />
          <div>
            <p className="text-sm text-gold-400 font-medium">Comment ça fonctionne ?</p>
            <p className="text-xs text-gray-400 mt-1">
              Becks utilise ces informations pour mieux te connaître et te répondre de façon personnalisée.
              Tu peux ajouter, modifier ou supprimer des souvenirs à tout moment.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
