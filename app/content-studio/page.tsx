"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import LoadingSpinner from "@/components/LoadingSpinner";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Megaphone, Calendar, Plus, Edit2, Trash2, X,
  Sparkles, Clock, CheckCircle, AlertCircle, Filter,
  Image, FileText, Video, Music, Download,
  ChevronLeft, ChevronRight, Brain, LayoutGrid, Loader2,
  RefreshCw
} from "lucide-react";
import Link from "next/link";
import { exportToPDF } from "@/lib/exportPDF";
import { toast } from "sonner";

// =====================================================
// TYPES OPTIMISÉS
// =====================================================

type Content = {
  id: string;
  title: string;
  hook: string | null;
  platform: string;
  content_type: string;
  status: string;
  mission_id: string | null;
  publish_date: string | null;
  cta: string | null;
  created_at: string;
};

type Suggestion = {
  date: string;
  suggested_platform: string;
  suggested_type: string;
  suggested_theme: string;
};

// =====================================================
// CONFIGURATIONS
// =====================================================

const platformConfig = {
  instagram: { label: "Instagram", icon: Image, emoji: "📸", color: "bg-gradient-to-r from-pink-500 to-purple-600 text-white" },
  linkedin: { label: "LinkedIn", icon: FileText, emoji: "💼", color: "bg-blue-600 text-white" },
  youtube: { label: "YouTube", icon: Video, emoji: "📺", color: "bg-red-600 text-white" },
  tiktok: { label: "TikTok", icon: Music, emoji: "🎵", color: "bg-black text-white" },
  website: { label: "Site Web", icon: Sparkles, emoji: "🌐", color: "bg-gray-600 text-white" },
  other: { label: "Autre", icon: Sparkles, emoji: "📝", color: "bg-gray-500 text-white" }
};

const statusConfig = {
  idea: { label: "💡 Idée", icon: Sparkles, color: "bg-gray-500/20 text-gray-400" },
  draft: { label: "📝 Brouillon", icon: Edit2, color: "bg-yellow-500/20 text-yellow-400" },
  outlined: { label: "📋 Planifié", icon: Calendar, color: "bg-blue-500/20 text-blue-400" },
  scheduled: { label: "📅 Programmé", icon: Clock, color: "bg-purple-500/20 text-purple-400" },
  posted: { label: "✅ Publié", icon: CheckCircle, color: "bg-emerald-500/20 text-emerald-400" },
  repurposed: { label: "🔄 Repris", icon: RefreshCw, color: "bg-cyan-500/20 text-cyan-400" }
};

const contentTypeConfig = {
  story: "📖 Story",
  educational: "🎓 Éducatif",
  promo: "📢 Promotion",
  testimonial: "⭐ Témoignage",
  emotional: "💖 Émotionnel",
  authority: "👑 Autorité",
  behind_scenes: "🎬 Behind the Scenes"
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://sovereign-bridge.onrender.com";

export default function ContentStudioPage() {
  const { user } = useAuth();  // ← OPTIMISATION: useAuth au lieu de useUserId
  const userId = user?.id || null;
  const [activeTab, setActiveTab] = useState<"list" | "calendar" | "generate">("list");
  
  // États pour la liste
  const [contents, setContents] = useState<Content[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingContent, setEditingContent] = useState<Content | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPlatform, setFilterPlatform] = useState<string>("all");
  
  // États pour le calendrier
  const [calendarData, setCalendarData] = useState<Record<string, Content[]>>({});
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [calendarStats, setCalendarStats] = useState({ total: 0, scheduled: 0, published: 0, draft: 0 });
  const [isCalendarLoading, setIsCalendarLoading] = useState(true);
  
  // États pour la génération IA
  const [showIdeaModal, setShowIdeaModal] = useState(false);
  const [generatingIdea, setGeneratingIdea] = useState(false);
  const [generatedIdea, setGeneratedIdea] = useState<any>(null);
  const [isGeneratingCalendar, setIsGeneratingCalendar] = useState(false);
  
  const [formData, setFormData] = useState({
    title: "",
    hook: "",
    platform: "instagram",
    content_type: "story",
    status: "idea",
    publish_date: "",
    cta: ""
  });

  // ========== CHARGEMENT OPTIMISÉ ==========
  useEffect(() => {
    if (!userId) return;
    
    const loadAllData = async () => {
      setIsLoading(true);
      await fetchContentOptimized();
      setIsLoading(false);
    };
    
    loadAllData();
    
    const channel = supabase
      .channel('content_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'content', filter: `user_id=eq.${userId}` }, 
        () => fetchContentOptimized()
      )
      .subscribe();
    
    return () => { channel.unsubscribe(); };
  }, [userId]);

  // ========== REQUÊTES OPTIMISÉES ==========
  async function fetchContentOptimized() {
    if (!userId) return;
    
    const { data } = await supabase
      .from("content")
      .select("id, title, hook, platform, content_type, status, mission_id, publish_date, cta, created_at")  // ← colonnes nécessaires
      .eq("user_id", userId)
      .order("publish_date", { ascending: true, nullsFirst: false })
      .limit(200);  // ← limite
    
    setContents(data || []);
  }

  async function fetchCalendarDataOptimized(year: number, month: number) {
    if (!userId) return;
    
    setIsCalendarLoading(true);
    
    const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];
    
    const { data } = await supabase
      .from("content")
      .select("id, title, platform, status, publish_date, content_type")
      .eq("user_id", userId)
      .gte("publish_date", startDate)
      .lte("publish_date", endDate)
      .order("publish_date", { ascending: true })
      .limit(100);
    
    // Organiser par date
    const calendar: Record<string, Content[]> = {};
    (data || []).forEach(item => {
      const date = item.publish_date;
      if (date) {
        if (!calendar[date]) calendar[date] = [];
        calendar[date].push(item as Content);
      }
    });
    
    setCalendarData(calendar);
    
    // Statistiques
    const stats = {
      total: data?.length || 0,
      scheduled: (data?.filter(c => c.status === "scheduled") || []).length,
      published: (data?.filter(c => c.status === "posted") || []).length,
      draft: (data?.filter(c => c.status === "draft") || []).length
    };
    setCalendarStats(stats);
    
    setIsCalendarLoading(false);
  }

  // ========== CHARGEMENT DU CALENDRIER AU CHANGEMENT DE MOIS ==========
  useEffect(() => {
    if (!userId) return;
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    fetchCalendarDataOptimized(year, month);
  }, [currentDate, userId]);

  // ========== GESTION DES CONTENUS ==========
  async function saveContent() {
    if (!userId) return;
    
    const data = {
      title: formData.title,
      hook: formData.hook || null,
      platform: formData.platform,
      content_type: formData.content_type,
      status: formData.status,
      publish_date: formData.publish_date || null,
      cta: formData.cta || null,
      user_id: userId
    };
    
    let error;
    if (editingContent) {
      const result = await supabase.from("content").update(data).eq("id", editingContent.id);
      error = result.error;
    } else {
      const result = await supabase.from("content").insert(data);
      error = result.error;
    }
    
    if (!error) {
      resetForm();
      fetchContentOptimized();
      // Rafraîchir le calendrier aussi
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      fetchCalendarDataOptimized(year, month);
      toast.success(editingContent ? "Contenu modifié" : "Contenu ajouté");
    } else {
      toast.error("Erreur: " + error.message);
    }
  }

  async function updateStatus(id: string, newStatus: string) {
    const { error } = await supabase.from("content").update({ status: newStatus }).eq("id", id);
    if (!error) {
      fetchContentOptimized();
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      fetchCalendarDataOptimized(year, month);
    }
  }

  async function deleteContent(id: string) {
    if (confirm("Supprimer ce contenu ?")) {
      const { error } = await supabase.from("content").delete().eq("id", id);
      if (!error) {
        fetchContentOptimized();
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth() + 1;
        fetchCalendarDataOptimized(year, month);
        toast.success("Contenu supprimé");
      }
    }
  }

  function editContent(content: Content) {
    setEditingContent(content);
    setFormData({
      title: content.title,
      hook: content.hook || "",
      platform: content.platform,
      content_type: content.content_type,
      status: content.status,
      publish_date: content.publish_date || "",
      cta: content.cta || ""
    });
    setShowForm(true);
    setActiveTab("list");
    setTimeout(() => {
      document.getElementById("form-container")?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }

  function resetForm() {
    setShowForm(false);
    setEditingContent(null);
    setFormData({
      title: "",
      hook: "",
      platform: "instagram",
      content_type: "story",
      status: "idea",
      publish_date: "",
      cta: ""
    });
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
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    setSelectedDate(null);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(null);
  };

  const getContentsForDate = useCallback((day: number) => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return calendarData[dateStr] || [];
  }, [currentDate, calendarData]);

  // ========== GÉNÉRATION IA ==========
  async function generateIdea(platform: string = "instagram", topic: string = "") {
    setGeneratingIdea(true);
    try {
      const response = await fetch(`${API_URL}/api/content/generate-idea`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, topic })
      });
      const data = await response.json();
      if (data.success) {
        setGeneratedIdea(data.idea);
      } else {
        toast.error("Erreur génération d'idée");
      }
    } catch (error) {
      toast.error("Erreur de connexion");
    } finally {
      setGeneratingIdea(false);
    }
  }

  async function saveGeneratedIdea() {
    if (!generatedIdea || !selectedDate || !userId) {
      toast.error("Sélectionne une date d'abord");
      return;
    }
    
    const { error } = await supabase.from("content").insert({
      title: generatedIdea.title,
      hook: generatedIdea.hook,
      platform: "instagram",
      content_type: generatedIdea.content_type || "post",
      status: "idea",
      publish_date: selectedDate,
      cta: generatedIdea.cta || "À définir",
      user_id: userId
    });
    
    if (!error) {
      toast.success("Idée sauvegardée !");
      setShowIdeaModal(false);
      setGeneratedIdea(null);
      fetchContentOptimized();
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      fetchCalendarDataOptimized(year, month);
    } else {
      toast.error("Erreur: " + error.message);
    }
  }

  // ========== STATS MEMOIZED ==========
  const stats = useMemo(() => ({
    total: contents.length,
    posted: contents.filter(c => c.status === "posted").length,
    scheduled: contents.filter(c => c.status === "scheduled").length,
    draft: contents.filter(c => c.status === "draft").length
  }), [contents]);

  const filteredContents = useMemo(() => {
    return contents.filter(c => {
      if (filterStatus !== "all" && c.status !== filterStatus) return false;
      if (filterPlatform !== "all" && c.platform !== filterPlatform) return false;
      return true;
    });
  }, [contents, filterStatus, filterPlatform]);

  const monthNames = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
  const dayNames = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
  
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const adjustedFirstDay = firstDay === 0 ? 6 : firstDay - 1;
  const today = new Date().toISOString().split('T')[0];

  const PlatformIcon = useCallback(({ platform }: { platform: string }) => {
    const config = platformConfig[platform as keyof typeof platformConfig];
    if (!config) return <Sparkles className="w-4 h-4" />;
    return <config.icon className="w-4 h-4" />;
  }, []);

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
        <Loader2 className="w-8 h-8 text-gold-500 animate-spin" />
      </div>
    );
  }

  return (
    <div id="content-studio" className="h-full flex flex-col overflow-y-auto bg-midnight p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto w-full">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Megaphone className="w-8 h-8 text-gold-500" />
              <h1 className="text-3xl md:text-4xl font-serif text-gold-500 tracking-tight">
                Content Studio
              </h1>
            </div>
            <p className="text-gray-500 text-sm">
              Planning éditorial, gestion de contenu et génération IA
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => exportToPDF("content-studio", `contenu-${new Date().toISOString().split('T')[0]}`)}
              className="bg-white/10 p-2 rounded-full hover:bg-white/20 transition-colors"
              title="Exporter en PDF"
            >
              <Download className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* STATS GLOBALES */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
            <div className="text-2xl font-serif text-ivory">{stats.total}</div>
            <div className="text-xs text-gray-500">Total contenus</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
            <div className="text-2xl font-serif text-emerald-400">{stats.posted}</div>
            <div className="text-xs text-gray-500">Publiés</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
            <div className="text-2xl font-serif text-purple-400">{stats.scheduled}</div>
            <div className="text-xs text-gray-500">Programmés</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
            <div className="text-2xl font-serif text-yellow-400">{stats.draft}</div>
            <div className="text-xs text-gray-500">Brouillons</div>
          </div>
        </div>

        {/* Bloc Becks */}
        <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-3">
            <Megaphone className="w-5 h-5 text-purple-400" />
            <div>
              <p className="text-sm text-purple-400 font-medium">Becks - Content Studio</p>
              <p className="text-sm text-ivory">
                📝 {stats.draft} brouillon(s) • 📅 {stats.scheduled} programmé(s) • 🎯 {stats.posted} publié(s)
              </p>
            </div>
          </div>
        </div>

        {/* TABS */}
        <div className="flex flex-wrap gap-2 border-b border-white/10 mb-6 overflow-x-auto pb-2">
          <button
            onClick={() => setActiveTab("list")}
            className={`px-4 py-2 text-sm flex items-center gap-2 transition-colors rounded-lg ${
              activeTab === "list" ? "bg-gold-500/20 text-gold-500" : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <LayoutGrid className="w-4 h-4" /> Tous les contenus
          </button>
          <button
            onClick={() => setActiveTab("calendar")}
            className={`px-4 py-2 text-sm flex items-center gap-2 transition-colors rounded-lg ${
              activeTab === "calendar" ? "bg-gold-500/20 text-gold-500" : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Calendar className="w-4 h-4" /> Calendrier éditorial
          </button>
          <button
            onClick={() => setActiveTab("generate")}
            className={`px-4 py-2 text-sm flex items-center gap-2 transition-colors rounded-lg ${
              activeTab === "generate" ? "bg-gold-500/20 text-gold-500" : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Brain className="w-4 h-4" /> Génération IA
          </button>
        </div>

        {/* ==================== ONGLET LISTE ==================== */}
        {activeTab === "list" && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <div className="flex gap-3">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-gold-500 text-ivory"
                >
                  <option value="all">📋 Tous les statuts</option>
                  {Object.entries(statusConfig).map(([key, conf]) => (
                    <option key={key} value={key}>{conf.label}</option>
                  ))}
                </select>
                
                <select
                  value={filterPlatform}
                  onChange={(e) => setFilterPlatform(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-gold-500 text-ivory"
                >
                  <option value="all">📱 Toutes les plateformes</option>
                  {Object.entries(platformConfig).map(([key, conf]) => (
                    <option key={key} value={key}>{conf.label}</option>
                  ))}
                </select>
              </div>
              
              <button
                onClick={() => { setShowForm(true); setEditingContent(null); setTimeout(() => document.getElementById("form-container")?.scrollIntoView({ behavior: "smooth" }), 100); }}
                className="bg-gold-500 text-midnight px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 hover:bg-gold-400 transition-colors"
              >
                <Plus className="w-4 h-4" /> Nouveau contenu
              </button>
            </div>

            {/* Formulaire */}
            <AnimatePresence>
              {showForm && (
                <motion.div id="form-container" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 mb-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-serif text-ivory">{editingContent ? "Modifier" : "Nouveau"} contenu</h3>
                    <button onClick={resetForm} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="text" placeholder="Titre du contenu" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-ivory md:col-span-2" />
                    <textarea placeholder="Hook / Angle" value={formData.hook} onChange={(e) => setFormData({ ...formData, hook: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-ivory md:col-span-2" rows={2} />
                    <select value={formData.platform} onChange={(e) => setFormData({ ...formData, platform: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-ivory">
                      {Object.entries(platformConfig).map(([key, conf]) => <option key={key} value={key}>{conf.label}</option>)}
                    </select>
                    <select value={formData.content_type} onChange={(e) => setFormData({ ...formData, content_type: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-ivory">
                      {Object.entries(contentTypeConfig).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                    </select>
                    <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-ivory">
                      {Object.entries(statusConfig).map(([key, conf]) => <option key={key} value={key}>{conf.label}</option>)}
                    </select>
                    <input type="date" value={formData.publish_date} onChange={(e) => setFormData({ ...formData, publish_date: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-ivory" />
                    <input type="text" placeholder="Call to Action" value={formData.cta} onChange={(e) => setFormData({ ...formData, cta: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-ivory md:col-span-2" />
                  </div>
                  
                  <div className="flex gap-3 mt-6">
                    <button onClick={saveContent} className="bg-gold-500 text-midnight px-6 py-2 rounded-full font-medium hover:bg-gold-400 transition-colors">
                      {editingContent ? "Mettre à jour" : "Enregistrer"}
                    </button>
                    <button onClick={resetForm} className="bg-white/10 px-6 py-2 rounded-full hover:bg-white/20 transition-colors">Annuler</button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Grille des contenus */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredContents.length === 0 ? (
                <div className="col-span-2 text-center py-12 text-gray-500">
                  <Megaphone className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p>Aucun contenu</p>
                  <p className="text-sm mt-2">Crée ton premier contenu !</p>
                </div>
              ) : (
                filteredContents.map((content) => {
                  const StatusIcon = statusConfig[content.status as keyof typeof statusConfig]?.icon || Sparkles;
                  const statusColor = statusConfig[content.status as keyof typeof statusConfig]?.color || "bg-gray-500/20 text-gray-400";
                  const platformColor = platformConfig[content.platform as keyof typeof platformConfig]?.color || "bg-gray-600 text-white";
                  
                  return (
                    <motion.div key={content.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-gold-500/30 transition-all">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs ${platformColor}`}>
                              <PlatformIcon platform={content.platform} /> {platformConfig[content.platform as keyof typeof platformConfig]?.label || content.platform}
                            </span>
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs ${statusColor}`}>
                              <StatusIcon className="w-3 h-3" /> {statusConfig[content.status as keyof typeof statusConfig]?.label || content.status}
                            </span>
                          </div>
                          <h3 className="text-ivory font-medium text-lg">{content.title}</h3>
                          {content.hook && <p className="text-gray-400 text-sm mt-2 italic">"{content.hook}"</p>}
                          <div className="flex flex-wrap gap-4 mt-3 text-xs text-gray-500">
                            <span>📂 {contentTypeConfig[content.content_type as keyof typeof contentTypeConfig] || content.content_type}</span>
                            {content.publish_date && <span>📅 {new Date(content.publish_date).toLocaleDateString('fr-FR')}</span>}
                            {content.cta && <span>🎯 CTA: {content.cta}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <select value={content.status} onChange={(e) => updateStatus(content.id, e.target.value)} className="bg-white/10 border border-white/10 rounded-lg px-2 py-1 text-xs">
                            {Object.entries(statusConfig).map(([key, conf]) => <option key={key} value={key}>{conf.label}</option>)}
                          </select>
                          <button onClick={() => editContent(content)} className="text-gray-500 hover:text-gold-500"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => deleteContent(content.id)} className="text-gray-500 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ==================== ONGLET CALENDRIER ==================== */}
        {activeTab === "calendar" && (
          <div>
            {/* Stats calendrier */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                <div className="text-2xl font-serif text-ivory">{calendarStats.total}</div>
                <div className="text-xs text-gray-500">Total</div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                <div className="text-2xl font-serif text-blue-400">{calendarStats.scheduled}</div>
                <div className="text-xs text-gray-500">Programmés</div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                <div className="text-2xl font-serif text-emerald-400">{calendarStats.published}</div>
                <div className="text-xs text-gray-500">Publiés</div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                <div className="text-2xl font-serif text-yellow-400">{calendarStats.draft}</div>
                <div className="text-xs text-gray-500">Brouillons</div>
              </div>
            </div>

            {/* En-tête calendrier */}
            <div className="flex justify-between items-center mb-4">
              <button onClick={prevMonth} className="p-2 hover:bg-white/10 rounded-lg"><ChevronLeft className="w-5 h-5" /></button>
              <div className="flex items-center gap-4">
                <h2 className="text-xl font-serif text-gold-500">{monthNames[month]} {year}</h2>
                <button onClick={goToToday} className="text-xs bg-white/10 px-3 py-1 rounded-full hover:bg-white/20">Aujourd'hui</button>
              </div>
              <button onClick={nextMonth} className="p-2 hover:bg-white/10 rounded-lg"><ChevronRight className="w-5 h-5" /></button>
            </div>

            {isCalendarLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-gold-500 animate-spin" /></div>
            ) : (
              <>
                {/* Grille calendrier */}
                <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                  <div className="grid grid-cols-7 border-b border-white/10">
                    {dayNames.map(day => <div key={day} className="p-3 text-center text-xs text-gray-500 font-medium">{day}</div>)}
                  </div>
                  <div className="grid grid-cols-7 auto-rows-fr">
                    {Array.from({ length: adjustedFirstDay }).map((_, i) => <div key={`empty-${i}`} className="min-h-[120px] p-2 border-r border-b border-white/5 bg-black/20" />)}
                    {Array.from({ length: daysInMonth }).map((_, i) => {
                      const day = i + 1;
                      const dayContents = getContentsForDate(day);
                      const isToday = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` === today;
                      const isSelected = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` === selectedDate;
                      
                      return (
                        <div onClick={() => setSelectedDate(`${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`)} className={`min-h-[120px] p-2 border-r border-b border-white/5 cursor-pointer transition-all hover:bg-white/5 ${isToday ? "bg-gold-500/5" : ""} ${isSelected ? "bg-gold-500/10 border-gold-500/30" : ""}`}>
                          <div className={`text-right mb-1 text-sm ${isToday ? "text-gold-500 font-bold" : "text-gray-400"}`}>{day}</div>
                          <div className="space-y-1">
                            {dayContents.slice(0, 2).map((content, idx) => {
                              const emoji = platformConfig[content.platform as keyof typeof platformConfig]?.emoji || "📝";
                              return <div key={idx} className="text-[10px] p-1 rounded bg-white/5 truncate flex items-center gap-1"><span>{emoji}</span><span className="text-gray-300 truncate flex-1">{content.title}</span></div>;
                            })}
                            {dayContents.length > 2 && <div className="text-[10px] text-gray-500 text-center">+{dayContents.length - 2} autre(s)</div>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Formulaire rapide pour la date sélectionnée */}
                {selectedDate && (
                  <div className="mt-6 p-4 bg-white/10 rounded-xl">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-sm font-serif text-gold-500">
                        📅 {new Date(selectedDate).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                      </h3>
                      <button
                        onClick={() => {
                          setFormData(prev => ({ ...prev, publish_date: selectedDate }));
                          setActiveTab("list");
                          setShowForm(true);
                          setTimeout(() => document.getElementById("form-container")?.scrollIntoView({ behavior: "smooth" }), 100);
                        }}
                        className="text-xs bg-gold-500/20 text-gold-500 px-3 py-1 rounded-full hover:bg-gold-500/30"
                      >
                        + Ajouter un contenu
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Bouton flottant génération IA */}
            <button
              onClick={() => {
                if (selectedDate) {
                  setShowIdeaModal(true);
                  setGeneratedIdea(null);
                } else {
                  toast.info("Sélectionne une date dans le calendrier d'abord");
                }
              }}
              className="fixed bottom-6 right-6 z-40 bg-gradient-to-r from-purple-500 to-pink-500 text-white p-4 rounded-full shadow-lg hover:scale-105 transition-transform"
            >
              <Sparkles className="w-6 h-6" />
            </button>

            {/* Modale génération IA */}
            <AnimatePresence>
              {showIdeaModal && selectedDate && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-midnight border border-gold-500/30 rounded-2xl max-w-md w-full p-6">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-serif text-gold-500">📅 {new Date(selectedDate).toLocaleDateString('fr-FR')}</h3>
                      <button onClick={() => setShowIdeaModal(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
                    </div>
                    {!generatedIdea ? (
                      <div className="space-y-4">
                        <p className="text-sm text-gray-400">Génère une idée de contenu pour cette date</p>
                        <button onClick={() => generateIdea()} disabled={generatingIdea} className="w-full bg-gold-500 text-midnight py-2 rounded-lg flex items-center justify-center gap-2">
                          {generatingIdea ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />} Générer une idée
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="bg-white/10 rounded-xl p-4">
                          <h4 className="text-gold-500 font-medium mb-2">{generatedIdea.title}</h4>
                          <p className="text-sm text-gray-300 mb-3">"{generatedIdea.hook}"</p>
                          <div className="flex flex-wrap gap-2">{generatedIdea.hashtags?.map((tag: string, i: number) => <span key={i} className="text-xs text-gold-400">#{tag}</span>)}</div>
                        </div>
                        <div className="flex gap-3">
                          <button onClick={saveGeneratedIdea} className="flex-1 bg-gold-500 text-midnight py-2 rounded-lg">Sauvegarder</button>
                          <button onClick={() => generateIdea()} className="flex-1 bg-white/10 py-2 rounded-lg text-gray-400">Regénérer</button>
                        </div>
                      </div>
                    )}
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* ==================== ONGLET GÉNÉRATION IA ==================== */}
        {activeTab === "generate" && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
            <Brain className="w-16 h-16 text-gold-500 mx-auto mb-4" />
            <h2 className="text-xl font-serif text-gold-500 mb-2">Génération de contenu IA</h2>
            <p className="text-gray-400 text-sm mb-6">Laisse Becks générer des idées de contenu pour toi</p>
            
            <div className="max-w-md mx-auto space-y-4">
              <select className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-ivory">
                <option>Instagram</option>
                <option>LinkedIn</option>
                <option>TikTok</option>
                <option>Facebook</option>
              </select>
              <input type="text" placeholder="Sujet (optionnel)" className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-ivory placeholder:text-gray-500" />
              <button
                onClick={async () => {
                  await generateIdea();
                  if (generatedIdea) {
                    toast.success("Idée générée ! Va dans l'onglet Calendrier pour la sauvegarder");
                  }
                }}
                disabled={generatingIdea}
                className="w-full bg-gold-500 text-midnight py-3 rounded-xl font-medium flex items-center justify-center gap-2"
              >
                {generatingIdea ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Générer une idée
              </button>
            </div>

            {generatedIdea && (
              <div className="mt-8 p-4 bg-white/10 rounded-xl text-left">
                <h3 className="text-gold-500 font-medium mb-2">Idée générée :</h3>
                <p className="text-ivory font-medium">{generatedIdea.title}</p>
                <p className="text-gray-400 text-sm mt-1">"{generatedIdea.hook}"</p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {generatedIdea.hashtags?.map((tag: string, i: number) => <span key={i} className="text-xs text-gold-400">#{tag}</span>)}
                </div>
                <p className="text-xs text-gray-500 mt-3">📊 Meilleur moment: {generatedIdea.best_time}</p>
                <button
                  onClick={() => setActiveTab("calendar")}
                  className="mt-4 w-full bg-gold-500/20 text-gold-500 py-2 rounded-lg text-sm hover:bg-gold-500/30 transition-colors"
                >
                  Programmer dans le calendrier →
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
