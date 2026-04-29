"use client";
import { useEffect, useState } from "react";
import LoadingSpinner from "@/components/LoadingSpinner"; 
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Trophy, Plus, Trash2, Edit2, X, Calendar, 
  Star, Sparkles, Heart, Briefcase, Home, 
  Sprout, DollarSign, Smile, Award
} from "lucide-react";
import { exportWinsToPDF } from "@/lib/exportPDF";
import { Download } from "lucide-react";

type Win = {
  id: string;
  title: string;
  category: "business" | "family" | "personal" | "money" | "health" | "farm" | "other";
  date: string;
  celebration_emoji: string | null;
  notes: string | null;
  created_at: string;
};

const categoryConfig = {
  business: { label: "💼 Business", icon: Briefcase, color: "bg-blue-500/20 text-blue-400", emoji: "🚀" },
  family: { label: "👨‍👩‍👧‍👦 Famille", icon: Heart, color: "bg-pink-500/20 text-pink-400", emoji: "💖" },
  personal: { label: "🧘 Personnel", icon: Smile, color: "bg-purple-500/20 text-purple-400", emoji: "✨" },
  money: { label: "💰 Argent", icon: DollarSign, color: "bg-emerald-500/20 text-emerald-400", emoji: "💵" },
  health: { label: "🏥 Santé", icon: Heart, color: "bg-red-500/20 text-red-400", emoji: "💪" },
  farm: { label: "🌾 Ferme", icon: Sprout, color: "bg-green-500/20 text-green-400", emoji: "🌱" },
  other: { label: "🎉 Autre", icon: Star, color: "bg-gray-500/20 text-gray-400", emoji: "🎯" }
};

const celebrationEmojis = [
  "🎉", "👑", "⭐", "🌟", "💪", "🔥", "✨", "🏆", 
  "💖", "🚀", "🌱", "🦋", "🌈", "⚡", "🎯", "🏅"
];

export default function WinsPage() {
  const [wins, setWins] = useState<Win[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterMonth, setFilterMonth] = useState<string>("all");
  
  const [formData, setFormData] = useState({
    title: "",
    category: "personal" as Win["category"],
    date: new Date().toISOString().split('T')[0],
    celebration_emoji: "🎉",
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
  fetchWins();
  
  const channel = supabase
    .channel('wins_changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'wins' }, () => fetchWins())
    .subscribe();
  
  return () => {
    channel.unsubscribe();
  };
}, []);
  

  async function fetchWins() {
    setIsLoading(true);
    const { data } = await supabase
      .from("wins")
      .select("*")
      .order("date", { ascending: false });
    setWins(data || []);
    setIsLoading(false);
  }

  async function saveWin() {
    const data = {
      title: formData.title,
      category: formData.category,
      date: formData.date,
      celebration_emoji: formData.celebration_emoji,
      notes: formData.notes || null
    };
    
    let error;
    if (editingId) {
      const result = await supabase.from("wins").update(data).eq("id", editingId);
      error = result.error;
    } else {
      const result = await supabase.from("wins").insert(data);
      error = result.error;
    }
    
    if (!error) {
      resetForm();
      fetchWins();
    } else {
      alert("Erreur: " + error.message);
    }
  }

  async function deleteWin(id: string) {
    if (confirm("Supprimer cette victoire ?")) {
      const { error } = await supabase.from("wins").delete().eq("id", id);
      if (!error) fetchWins();
    }
  }

  function editWin(win: Win) {
    setFormData({
      title: win.title,
      category: win.category,
      date: win.date,
      celebration_emoji: win.celebration_emoji || "🎉",
      notes: win.notes || ""
    });
    setEditingId(win.id);
    setShowForm(true);
    scrollToForm();
  }

  function resetForm() {
    setShowForm(false);
    setEditingId(null);
    setFormData({
      title: "",
      category: "personal",
      date: new Date().toISOString().split('T')[0],
      celebration_emoji: "🎉",
      notes: ""
    });
  }

  // Obtenir les mois disponibles
  const availableMonths = [...new Set(wins.map(w => 
    new Date(w.date).toLocaleString('fr-FR', { month: 'long', year: 'numeric' })
  ))];

  const filteredWins = wins.filter(w => {
    if (filterCategory !== "all" && w.category !== filterCategory) return false;
    if (filterMonth !== "all") {
      const month = new Date(w.date).toLocaleString('fr-FR', { month: 'long', year: 'numeric' });
      if (month !== filterMonth) return false;
    }
    return true;
  });

  const stats = {
    total: wins.length,
    thisMonth: wins.filter(w => {
      const now = new Date();
      const winDate = new Date(w.date);
      return winDate.getMonth() === now.getMonth() && winDate.getFullYear() === now.getFullYear();
    }).length,
    byCategory: Object.keys(categoryConfig).map(cat => ({
      category: cat,
      count: wins.filter(w => w.category === cat).length,
      label: categoryConfig[cat as keyof typeof categoryConfig].label
    })).filter(c => c.count > 0)
  };

  return (
    <div className="h-full flex flex-col overflow-y-auto bg-midnight">
      {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-serif text-gold-500 tracking-tight">Wins & Truths</h1>
            <p className="text-gray-500 text-sm mt-1">Célébrer chaque victoire, petite ou grande ✨</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => exportWinsToPDF(filteredWins)}
              className="bg-white/10 p-2 rounded-full hover:bg-white/20 transition-colors"
              title="Exporter les victoires en PDF"
            >
              <Download className="w-5 h-5" />
            </button>
            <button
              onClick={() => { setShowForm(true); setEditingId(null); scrollToForm(); }}
              className="bg-gold-500 text-midnight px-5 py-2 rounded-full text-sm font-medium flex items-center gap-2 hover:bg-gold-400 transition-colors"
            >
              <Trophy className="w-4 h-4" /> Ajouter une victoire
            </button>
          </div>
        </div>

      {/* STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-gradient-to-br from-gold-500/10 to-transparent border border-gold-500/20 rounded-2xl p-6 text-center">
          <Trophy className="w-8 h-8 text-gold-500 mx-auto mb-2" />
          <div className="text-3xl font-serif text-ivory">{stats.total}</div>
          <div className="text-xs text-gray-500">Victoires totales</div>
        </div>
        <div className="bg-gradient-to-br from-emerald-500/10 to-transparent border border-emerald-500/20 rounded-2xl p-6 text-center">
          <Star className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
          <div className="text-3xl font-serif text-emerald-400">{stats.thisMonth}</div>
          <div className="text-xs text-gray-500">Ce mois-ci</div>
        </div>
        <div className="bg-gradient-to-br from-purple-500/10 to-transparent border border-purple-500/20 rounded-2xl p-6 text-center">
          <Sparkles className="w-8 h-8 text-purple-400 mx-auto mb-2" />
          <div className="text-3xl font-serif text-purple-400">{stats.byCategory.length}</div>
          <div className="text-xs text-gray-500">Catégories touchées</div>
        </div>
      </div>

      {/* STATS PAR CATÉGORIE */}
      {stats.byCategory.length > 0 && (
        <div className="flex flex-wrap gap-3 mb-8">
          {stats.byCategory.map(cat => (
            <div key={cat.category} className="px-4 py-2 bg-white/5 rounded-full text-sm">
              {categoryConfig[cat.category as keyof typeof categoryConfig].label} : {cat.count}
            </div>
          ))}
        </div>
      )}

      {/* FILTRES */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-gold-500"
        >
          <option value="all">📁 Toutes les catégories</option>
          {Object.entries(categoryConfig).map(([key, conf]) => (
            <option key={key} value={key}>{conf.label}</option>
          ))}
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

      {/* FORMULAIRE */}
      <AnimatePresence>
        {showForm && (
          <motion.div id="form-container" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 mb-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-serif text-ivory">{editingId ? "Modifier" : "Nouvelle"} victoire</h3>
              <button onClick={resetForm} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Quelle est ta victoire ?"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-gold-500 text-ivory md:col-span-2"
              />
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as Win["category"] })}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-gold-500 text-ivory"
              >
                {Object.entries(categoryConfig).map(([key, conf]) => (
                  <option key={key} value={key}>{conf.emoji} {conf.label}</option>
                ))}
              </select>
              <div className="flex gap-2">
                <select
                  value={formData.celebration_emoji}
                  onChange={(e) => setFormData({ ...formData, celebration_emoji: e.target.value })}
                  className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-gold-500 text-ivory flex-1"
                >
                  {celebrationEmojis.map(emoji => (
                    <option key={emoji} value={emoji}>{emoji}</option>
                  ))}
                </select>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-gold-500 text-ivory"
                />
              </div>
              <textarea
                placeholder="Notes (optionnel)"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-gold-500 text-ivory md:col-span-2"
                rows={2}
              />
            </div>
            
            <div className="flex gap-3 mt-6">
              <button onClick={saveWin} className="bg-gold-500 text-midnight px-6 py-2 rounded-full font-medium hover:bg-gold-400 transition-colors">
                {editingId ? "Mettre à jour" : "Enregistrer"}
              </button>
              <button onClick={resetForm} className="bg-white/10 px-6 py-2 rounded-full hover:bg-white/20 transition-colors">Annuler</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* LISTE DES VICTOIRES */}
      <div className="space-y-3">
        {isLoading ? (
          <LoadingSpinner />   
        ) : filteredWins.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Trophy className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p>Pas encore de victoires enregistrées</p>
            <p className="text-sm mt-2">C'est le moment de célébrer tes succès ! ✨</p>
          </div>
        ) : (
          filteredWins.map((win, index) => {
            const CategoryIcon = categoryConfig[win.category].icon;
            
            return (
              <motion.div
                key={win.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="group bg-gradient-to-r from-gold-500/5 to-transparent border border-gold-500/20 rounded-xl p-5 hover:border-gold-500/40 transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 flex-wrap mb-2">
                      <span className="text-2xl">{win.celebration_emoji || "🎉"}</span>
                      <h3 className="text-ivory font-medium text-lg">{win.title}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${categoryConfig[win.category].color}`}>
                        <CategoryIcon className="w-3 h-3 inline mr-1" />
                        {categoryConfig[win.category].label}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-4 text-xs text-gray-500 items-center">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> {new Date(win.date).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                    {win.notes && <p className="text-xs text-gray-600 mt-2 italic">{win.notes}</p>}
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => editWin(win)} className="text-gray-500 hover:text-gold-500">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => deleteWin(win.id)} className="text-gray-500 hover:text-red-400">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* MESSAGE DE MOTIVATION */}
      {wins.length > 0 && (
        <div className="mt-8 p-5 bg-gradient-to-r from-gold-500/10 to-transparent rounded-2xl border border-gold-500/20 text-center">
          <Sparkles className="w-6 h-6 text-gold-500 mx-auto mb-2" />
          <p className="text-sm text-gray-400">
            {stats.total} victoire(s) célébrée(s) • Continue sur cette lancée ! 👑
          </p>
        </div>
      )}
    </div>
  );
}
