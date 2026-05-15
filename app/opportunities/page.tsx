"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import LoadingSpinner from "@/components/LoadingSpinner";
"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Calendar, ChevronLeft, ChevronRight, Plus, 
  Sparkles, CheckCircle, Clock, Edit2, Trash2, X, Loader2,
  Filter, Brain, TrendingUp, Heart, MessageCircle
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

const API_URL = "https://sovereign-bridge.onrender.com";

type ContentItem = {
  id: string;
  title: string;
  hook: string;
  platform: string;
  content_type: string;
  status: string;
  publish_date: string;
  cta: string;
};

type Suggestion = {
  date: string;
  suggested_platform: string;
  suggested_type: string;
  suggested_theme: string;
};

// Plateformes avec émojis (pas d'icônes lucide problématiques)
const platformEmojis = {
  instagram: "📸",
  linkedin: "💼",
  youtube: "📺",
  facebook: "📘",
  tiktok: "🎵",
  website: "🌐",
  other: "📝"
};

const platformColors = {
  instagram: "text-pink-400",
  linkedin: "text-blue-400",
  youtube: "text-red-400",
  facebook: "text-blue-500",
  tiktok: "text-black dark:text-white",
  website: "text-purple-400",
  other: "text-gray-400"
};

const statusConfig = {
  idea: { label: "💡 Idée", color: "bg-gray-500/20 text-gray-400" },
  draft: { label: "📝 Brouillon", color: "bg-yellow-500/20 text-yellow-400" },
  scheduled: { label: "📅 Programmé", color: "bg-blue-500/20 text-blue-400" },
  posted: { label: "✅ Publié", color: "bg-emerald-500/20 text-emerald-400" }
};

export default function ContentCalendarPage() {
  const [contents, setContents] = useState<ContentItem[]>([]);
  const [calendarData, setCalendarData] = useState<Record<string, ContentItem[]>>({});
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showIdeaModal, setShowIdeaModal] = useState(false);
  const [generatingIdea, setGeneratingIdea] = useState(false);
  const [generatedIdea, setGeneratedIdea] = useState<any>(null);
  const [stats, setStats] = useState({ total: 0, scheduled: 0, published: 0, draft: 0 });

  useEffect(() => {
    fetchCalendarData();
  }, [currentDate]);

  async function fetchCalendarData() {
    setIsLoading(true);
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    
    try {
      const response = await fetch(`${API_URL}/api/content/calendar?month=${month}&year=${year}`);
      const data = await response.json();
      
      if (data.success) {
        setCalendarData(data.calendar);
        setSuggestions(data.suggestions || []);
        setStats(data.stats);
        
        const { data: contentsData } = await supabase
          .from("content")
          .select("*")
          .order("publish_date", { ascending: true });
        setContents(contentsData || []);
      }
    } catch (error) {
      console.error("Erreur:", error);
      toast.error("Erreur chargement calendrier");
    }
    setIsLoading(false);
  }

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
    }
    setGeneratingIdea(false);
  }

  async function saveGeneratedIdea() {
    if (!generatedIdea || !selectedDate) return;
    
    const { error } = await supabase.from("content").insert({
      title: generatedIdea.title,
      hook: generatedIdea.hook,
      platform: "instagram",
      content_type: generatedIdea.content_type || "post",
      status: "idea",
      publish_date: selectedDate,
      cta: generatedIdea.cta || "À définir"
    });
    
    if (!error) {
      toast.success("Idée sauvegardée !");
      setShowIdeaModal(false);
      setGeneratedIdea(null);
      fetchCalendarData();
    } else {
      toast.error("Erreur: " + error.message);
    }
  }

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

  const monthNames = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
  const dayNames = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
  
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const adjustedFirstDay = firstDay === 0 ? 6 : firstDay - 1;
  const today = new Date().toISOString().split('T')[0];

  const getContentsForDate = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return calendarData[dateStr] || [];
  };

  const getSuggestionForDate = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return suggestions.find(s => s.date === dateStr);
  };

  const handleDateClick = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setSelectedDate(dateStr);
  };

  return (
    <div className="h-full flex flex-col overflow-y-auto bg-midnight p-4 md:p-6">
      <div className="max-w-6xl mx-auto w-full">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="w-8 h-8 text-gold-500" />
              <h1 className="text-3xl md:text-4xl font-serif text-gold-500 tracking-tight">
                Content Calendar
              </h1>
            </div>
            <p className="text-gray-500 text-sm">
              Planification éditoriale et génération de contenu
            </p>
          </div>
          <div className="flex gap-3">
            <Link 
              href="/content"
              className="bg-white/10 px-4 py-2 rounded-full text-sm hover:bg-white/20 transition-colors"
            >
              Voir tous les contenus
            </Link>
          </div>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
            <div className="text-2xl font-serif text-ivory">{stats.total}</div>
            <div className="text-xs text-gray-500">Total</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
            <div className="text-2xl font-serif text-blue-400">{stats.scheduled}</div>
            <div className="text-xs text-gray-500">Programmés</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
            <div className="text-2xl font-serif text-emerald-400">{stats.published}</div>
            <div className="text-xs text-gray-500">Publiés</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
            <div className="text-2xl font-serif text-yellow-400">{stats.draft}</div>
            <div className="text-xs text-gray-500">Brouillons</div>
          </div>
        </div>

        {/* CALENDRIER HEADER */}
        <div className="flex justify-between items-center mb-4">
          <button onClick={prevMonth} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-serif text-gold-500">
              {monthNames[month]} {year}
            </h2>
            <button 
              onClick={goToToday}
              className="text-xs bg-white/10 px-3 py-1 rounded-full hover:bg-white/20"
            >
              Aujourd'hui
            </button>
          </div>
          <button onClick={nextMonth} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* CALENDRIER GRILLE */}
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <div className="grid grid-cols-7 border-b border-white/10">
            {dayNames.map(day => (
              <div key={day} className="p-3 text-center text-xs text-gray-500 font-medium">
                {day}
              </div>
            ))}
          </div>
          
          <div className="grid grid-cols-7 auto-rows-fr">
            {Array.from({ length: adjustedFirstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[120px] p-2 border-r border-b border-white/5 bg-black/20" />
            ))}
            
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const dayContents = getContentsForDate(day);
              const suggestion = getSuggestionForDate(day);
              const isToday = dateStr === today;
              const isSelected = dateStr === selectedDate;
              
              return (
                <div
                  key={day}
                  onClick={() => handleDateClick(day)}
                  className={`min-h-[120px] p-2 border-r border-b border-white/5 cursor-pointer transition-all hover:bg-white/5 ${
                    isToday ? "bg-gold-500/5" : ""
                  } ${isSelected ? "bg-gold-500/10 border-gold-500/30" : ""}`}
                >
                  <div className={`text-right mb-1 text-sm ${isToday ? "text-gold-500 font-bold" : "text-gray-400"}`}>
                    {day}
                  </div>
                  
                  <div className="space-y-1">
                    {dayContents.slice(0, 2).map((content, idx) => {
                      const platformEmoji = platformEmojis[content.platform as keyof typeof platformEmojis] || "📝";
                      const iconColor = platformColors[content.platform as keyof typeof platformColors] || "text-gray-400";
                      const statusColor = statusConfig[content.status as keyof typeof statusConfig]?.color || "bg-gray-500/20 text-gray-400";
                      
                      return (
                        <div key={idx} className="text-[10px] p-1 rounded bg-white/5 truncate flex items-center gap-1">
                          <span className={iconColor}>{platformEmoji}</span>
                          <span className="text-gray-300 truncate flex-1">{content.title}</span>
                          <span className={`w-1.5 h-1.5 rounded-full ${statusColor.includes("emerald") ? "bg-emerald-400" : statusColor.includes("blue") ? "bg-blue-400" : "bg-yellow-400"}`} />
                        </div>
                      );
                    })}
                    
                    {dayContents.length > 2 && (
                      <div className="text-[10px] text-gray-500 text-center">
                        +{dayContents.length - 2} autre(s)
                      </div>
                    )}
                    
                    {suggestion && dayContents.length === 0 && (
                      <div className="text-[10px] p-1 rounded bg-gold-500/10 border border-gold-500/20 text-gold-400 text-center truncate">
                        💡 {suggestion.suggested_theme}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* MODALE GÉNÉRATION D'IDÉE */}
        <AnimatePresence>
          {showIdeaModal && selectedDate && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-midnight border border-gold-500/30 rounded-2xl max-w-md w-full p-6"
              >
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-serif text-gold-500">
                    📅 {new Date(selectedDate).toLocaleDateString('fr-FR')}
                  </h3>
                  <button onClick={() => setShowIdeaModal(false)} className="text-gray-400 hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                {!generatedIdea ? (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-400">Génère une idée de contenu pour cette date</p>
                    <div className="flex gap-2">
                      <select className="flex-1 bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-sm">
                        <option>Instagram</option>
                        <option>LinkedIn</option>
                        <option>TikTok</option>
                        <option>Facebook</option>
                      </select>
                      <button
                        onClick={() => generateIdea()}
                        disabled={generatingIdea}
                        className="bg-gold-500 text-midnight px-4 py-2 rounded-lg text-sm flex items-center gap-2"
                      >
                        {generatingIdea ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
                        Générer
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-white/10 rounded-xl p-4">
                      <h4 className="text-gold-500 font-medium mb-2">{generatedIdea.title}</h4>
                      <p className="text-sm text-gray-300 mb-3">"{generatedIdea.hook}"</p>
                      <div className="flex flex-wrap gap-2">
                        {generatedIdea.hashtags?.map((tag: string, i: number) => (
                          <span key={i} className="text-xs text-gold-400">#{tag}</span>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500 mt-3">📊 Meilleur moment: {generatedIdea.best_time}</p>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={saveGeneratedIdea}
                        className="flex-1 bg-gold-500 text-midnight py-2 rounded-lg font-medium"
                      >
                        Sauvegarder
                      </button>
                      <button
                        onClick={() => generateIdea()}
                        className="flex-1 bg-white/10 py-2 rounded-lg text-gray-400"
                      >
                        Regénérer
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* BOUTON FLOTTANT GÉNÉRATION IA */}
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
      </div>
    </div>
  );
}
import { motion, AnimatePresence } from "framer-motion";
import { 
  TrendingUp, Plus, Trash2, Edit2, X, Calendar, 
  DollarSign, Target, Clock, CheckCircle, AlertCircle,
  Filter, Search, Briefcase, Sparkles, Loader2
} from "lucide-react";

type Opportunity = {
  id: string;
  title: string;
  type: "client" | "grant" | "contract" | "investor" | "partnership" | "product" | "content" | "other";
  mission_id: string | null;
  estimated_value: number;
  stage: "idea" | "researching" | "preparing" | "submitted" | "follow_up" | "won" | "lost";
  deadline: string | null;
  probability: "low" | "medium" | "high";
  next_action: string | null;
  notes: string | null;
  created_at: string;
};

type Mission = {
  id: string;
  name: string;
};

const typeConfig: Record<string, { label: string; icon: any; color: string }> = {
  client: { label: "🤝 Client", icon: Briefcase, color: "bg-blue-500/20 text-blue-400" },
  grant: { label: "🎯 Subvention", icon: Target, color: "bg-emerald-500/20 text-emerald-400" },
  contract: { label: "📄 Contrat", icon: FileText, color: "bg-purple-500/20 text-purple-400" },
  investor: { label: "💰 Investisseur", icon: DollarSign, color: "bg-yellow-500/20 text-yellow-400" },
  partnership: { label: "🤝 Partenariat", icon: Sparkles, color: "bg-pink-500/20 text-pink-400" },
  product: { label: "📦 Produit", icon: Package, color: "bg-orange-500/20 text-orange-400" },
  content: { label: "📱 Contenu", icon: TrendingUp, color: "bg-cyan-500/20 text-cyan-400" },
  other: { label: "📁 Autre", icon: Briefcase, color: "bg-gray-500/20 text-gray-400" }
};

const stageConfig: Record<string, { label: string; color: string; icon: any; order: number }> = {
  idea: { label: "💡 Idée", color: "bg-gray-500/20 text-gray-400", icon: Sparkles, order: 1 },
  researching: { label: "🔍 Recherche", color: "bg-blue-500/20 text-blue-400", icon: Search, order: 2 },
  preparing: { label: "📝 Préparation", color: "bg-purple-500/20 text-purple-400", icon: Edit2, order: 3 },
  submitted: { label: "📤 Soumis", color: "bg-yellow-500/20 text-yellow-400", icon: Send, order: 4 },
  follow_up: { label: "🔄 Relance", color: "bg-orange-500/20 text-orange-400", icon: Clock, order: 5 },
  won: { label: "🏆 Gagné", color: "bg-emerald-500/20 text-emerald-400", icon: CheckCircle, order: 6 },
  lost: { label: "❌ Perdu", color: "bg-red-500/20 text-red-400", icon: AlertCircle, order: 7 }
};

const probabilityConfig = {
  low: { label: "🟢 Faible", color: "text-gray-400", value: 25 },
  medium: { label: "🟡 Moyenne", color: "text-yellow-400", value: 50 },
  high: { label: "🔴 Haute", color: "text-emerald-400", value: 75 }
};

import { FileText, Package, Send } from "lucide-react";

function getScoreColor(score: number): string {
  if (score >= 20) return "text-emerald-400 bg-emerald-500/10";
  if (score >= 15) return "text-blue-400 bg-blue-500/10";
  if (score >= 10) return "text-yellow-400 bg-yellow-500/10";
  return "text-gray-400 bg-gray-500/10";
}

function getScoreStars(score: number): string {
  if (score >= 24) return "★★★★★";
  if (score >= 20) return "★★★★☆";
  if (score >= 15) return "★★★☆☆";
  if (score >= 10) return "★★☆☆☆";
  return "★☆☆☆☆";
}

function calculateOpportunityScore(opp: Opportunity): number {
  let score = 0;
  
  if (opp.estimated_value) {
    if (opp.estimated_value >= 10000000) score += 10;
    else if (opp.estimated_value >= 5000000) score += 8;
    else if (opp.estimated_value >= 2000000) score += 6;
    else if (opp.estimated_value >= 1000000) score += 4;
    else if (opp.estimated_value >= 500000) score += 2;
    else score += 1;
  }
  
  if (opp.probability === "high") score += 8;
  else if (opp.probability === "medium") score += 5;
  else if (opp.probability === "low") score += 2;
  
  if (opp.stage === "won") score += 7;
  else if (opp.stage === "follow_up") score += 6;
  else if (opp.stage === "submitted") score += 5;
  else if (opp.stage === "preparing") score += 3;
  else if (opp.stage === "researching") score += 2;
  else if (opp.stage === "idea") score += 1;
  
  if (opp.deadline) {
    const daysUntil = Math.ceil((new Date(opp.deadline).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
    if (daysUntil <= 3) score += 5;
    else if (daysUntil <= 7) score += 4;
    else if (daysUntil <= 14) score += 3;
    else if (daysUntil <= 30) score += 2;
    else score += 1;
  }
  
  return Math.min(score, 30);
}

export default function OpportunitiesPage() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterStage, setFilterStage] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("value");
  
  const [formData, setFormData] = useState({
    title: "",
    type: "client" as Opportunity["type"],
    mission_id: "",
    estimated_value: "",
    stage: "idea" as Opportunity["stage"],
    deadline: "",
    probability: "medium" as Opportunity["probability"],
    next_action: "",
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
    fetchData();
    
    const channel = supabase
      .channel('opportunities_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'opportunities' }, () => fetchOpportunities())
      .subscribe();
    
    return () => {
      channel.unsubscribe();
    };
  }, []);
    
  async function fetchData() {
    setIsLoading(true);
    await Promise.all([fetchOpportunities(), fetchMissions()]);
    setIsLoading(false);
  }

  async function fetchOpportunities() {
    const { data } = await supabase
      .from("opportunities")
      .select("*")
      .order("estimated_value", { ascending: false });
    setOpportunities(data || []);
  }

  async function fetchMissions() {
    const { data } = await supabase
      .from("missions")
      .select("id, name")
      .eq("status", "active");
    setMissions(data || []);
  }

  async function saveOpportunity() {
    const data = {
      title: formData.title,
      type: formData.type,
      mission_id: formData.mission_id || null,
      estimated_value: formData.estimated_value ? parseFloat(formData.estimated_value) : null,
      stage: formData.stage,
      deadline: formData.deadline || null,
      probability: formData.probability,
      next_action: formData.next_action || null,
      notes: formData.notes || null
    };
    
    let error;
    if (editingId) {
      const result = await supabase.from("opportunities").update(data).eq("id", editingId);
      error = result.error;
    } else {
      const result = await supabase.from("opportunities").insert(data);
      error = result.error;
    }
    
    if (!error) {
      resetForm();
      fetchOpportunities();
    } else {
      alert("Erreur: " + error.message);
    }
  }

  async function updateStage(id: string, newStage: Opportunity["stage"]) {
    const { error } = await supabase.from("opportunities").update({ stage: newStage }).eq("id", id);
    if (!error) fetchOpportunities();
  }

  async function deleteOpportunity(id: string) {
    if (confirm("Supprimer cette opportunité ?")) {
      const { error } = await supabase.from("opportunities").delete().eq("id", id);
      if (!error) fetchOpportunities();
    }
  }

  function editOpportunity(opp: Opportunity) {
    setEditingId(opp.id);
    setFormData({
      title: opp.title,
      type: opp.type,
      mission_id: opp.mission_id || "",
      estimated_value: opp.estimated_value?.toString() || "",
      stage: opp.stage,
      deadline: opp.deadline || "",
      probability: opp.probability,
      next_action: opp.next_action || "",
      notes: opp.notes || ""
    });
    setShowForm(true);
    scrollToForm(); 
  }

  function resetForm() {
    setShowForm(false);
    setEditingId(null);
    setFormData({
      title: "",
      type: "client",
      mission_id: "",
      estimated_value: "",
      stage: "idea",
      deadline: "",
      probability: "medium",
      next_action: "",
      notes: ""
    });
  }

  const filteredOpportunities = opportunities.filter(opp => {
    if (filterStage !== "all" && opp.stage !== filterStage) return false;
    if (filterType !== "all" && opp.type !== filterType) return false;
    return true;
  });

  const sortedOpportunities = [...filteredOpportunities].sort((a, b) => {
    if (sortBy === "value") return (b.estimated_value || 0) - (a.estimated_value || 0);
    if (sortBy === "score") return calculateOpportunityScore(b) - calculateOpportunityScore(a);
    if (sortBy === "deadline") return (a.deadline || "9999") > (b.deadline || "9999") ? 1 : -1;
    return 0;
  });

  const stats = {
    total: opportunities.length,
    totalValue: opportunities.reduce((sum, o) => sum + (o.estimated_value || 0), 0),
    won: opportunities.filter(o => o.stage === "won").length,
    inProgress: opportunities.filter(o => !["won", "lost"].includes(o.stage)).length,
    highProbability: opportunities.filter(o => o.probability === "high" && !["won", "lost"].includes(o.stage)).length
  };

  return (
   <div className="h-full flex flex-col overflow-y-auto bg-midnight">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-serif text-gold-500 tracking-tight">Opportunities</h1>
          <p className="text-gray-500 mt-1 text-sm">Suivi des deals, contrats et opportunités financières</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditingId(null); scrollToForm(); }}
          className="bg-gold-500 text-midnight px-4 py-2 rounded-full text-sm font-medium flex items-center justify-center gap-2 w-full md:w-auto"
        >
          <Plus className="w-4 h-4" /> Nouvelle opportunité
        </button>
        
        // Dans le header, à côté du bouton "Nouvelle opportunité"
        <button
          onClick={async () => {
            toast.info("🔍 Scan en cours...");
            const response = await fetch(`${API_URL}/api/opportunities/scan`, { method: "POST" });
            const data = await response.json();
            if (data.success && data.count > 0) {
              toast.success(`🎯 ${data.count} opportunité(s) détectée(s) !`);
              fetchOpportunities();
            } else if (data.success) {
              toast.info("Aucune nouvelle opportunité détectée");
            } else {
              toast.error("Erreur lors du scan");
            }
          }}
          className="bg-purple-500/20 text-purple-400 px-4 py-2 rounded-full text-sm flex items-center gap-2 hover:bg-purple-500/30 transition-colors"
        >
          <Brain className="w-4 h-4" />
          Scanner les opportunités
        </button>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
          <div className="text-2xl font-serif text-ivory">{stats.total}</div>
          <div className="text-xs text-gray-500">Total</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
          <div className="text-2xl font-serif text-emerald-400">{stats.totalValue.toLocaleString()} CFA</div>
          <div className="text-xs text-gray-500">Valeur totale</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
          <div className="text-2xl font-serif text-blue-400">{stats.inProgress}</div>
          <div className="text-xs text-gray-500">En cours</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
          <div className="text-2xl font-serif text-emerald-400">{stats.won}</div>
          <div className="text-xs text-gray-500">Gagnées</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
          <div className="text-2xl font-serif text-yellow-400">{stats.highProbability}</div>
          <div className="text-xs text-gray-500">Haute proba</div>
        </div>
      </div>

      {/* FILTRES */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select
          value={filterStage}
          onChange={(e) => setFilterStage(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-gold-500"
        >
          <option value="all">📋 Tous les statuts</option>
          {Object.entries(stageConfig).map(([key, conf]) => (
            <option key={key} value={key}>{conf.label}</option>
          ))}
        </select>
        
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-gold-500"
        >
          <option value="all">🏷️ Tous les types</option>
          {Object.entries(typeConfig).map(([key, conf]) => (
            <option key={key} value={key}>{conf.label}</option>
          ))}
        </select>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-gold-500"
        >
          <option value="value">💰 Trier par valeur</option>
          <option value="score">⭐ Trier par score</option>
          <option value="deadline">📅 Trier par échéance</option>
        </select>
      </div>

      {/* FORMULAIRE */}
      <AnimatePresence>
        {showForm && (
          <motion.div id="form-container" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 mb-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-serif text-ivory">{editingId ? "Modifier" : "Nouvelle"} opportunité</h3>
              <button onClick={resetForm} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Nom de l'opportunité"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-gold-500 text-ivory md:col-span-2"
              />
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as Opportunity["type"] })}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-gold-500 text-ivory"
              >
                {Object.entries(typeConfig).map(([key, conf]) => <option key={key} value={key}>{conf.label}</option>)}
              </select>
              <select
                value={formData.mission_id}
                onChange={(e) => setFormData({ ...formData, mission_id: e.target.value })}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-gold-500 text-ivory"
              >
                <option value="">📁 Aucune mission</option>
                {missions.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
              <input
                type="number"
                placeholder="Valeur estimée (CFA)"
                value={formData.estimated_value}
                onChange={(e) => setFormData({ ...formData, estimated_value: e.target.value })}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-gold-500 text-ivory"
              />
              <select
                value={formData.stage}
                onChange={(e) => setFormData({ ...formData, stage: e.target.value as Opportunity["stage"] })}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-gold-500 text-ivory"
              >
                {Object.entries(stageConfig).map(([key, conf]) => <option key={key} value={key}>{conf.label}</option>)}
              </select>
              <select
                value={formData.probability}
                onChange={(e) => setFormData({ ...formData, probability: e.target.value as Opportunity["probability"] })}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-gold-500 text-ivory"
              >
                {Object.entries(probabilityConfig).map(([key, conf]) => <option key={key} value={key}>{conf.label}</option>)}
              </select>
              <input
                type="date"
                value={formData.deadline}
                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-gold-500 text-ivory"
              />
              <input
                type="text"
                placeholder="Prochaine action"
                value={formData.next_action}
                onChange={(e) => setFormData({ ...formData, next_action: e.target.value })}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-gold-500 text-ivory md:col-span-2"
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
              <button onClick={saveOpportunity} className="bg-gold-500 text-midnight px-6 py-2 rounded-full font-medium hover:bg-gold-400 transition-colors">
                {editingId ? "Mettre à jour" : "Enregistrer"}
              </button>
              <button onClick={resetForm} className="bg-white/10 px-6 py-2 rounded-full hover:bg-white/20 transition-colors">Annuler</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* LISTE DES OPPORTUNITÉS */}
      <div className="space-y-3">
        {isLoading ? (
          <LoadingSpinner />
        ) : sortedOpportunities.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p>Aucune opportunité</p>
            <p className="text-sm mt-2">Crée ta première opportunité pour suivre tes deals</p>
          </div>
        ) : (
          sortedOpportunities.map((opp) => {
            const typeData = typeConfig[opp.type] || { icon: Briefcase, label: opp.type || "Autre", color: "bg-gray-500/20 text-gray-400" };
            const TypeIcon = typeData.icon;
            const stageData = stageConfig[opp.stage] || { icon: Clock, label: opp.stage || "En cours", color: "bg-gray-500/20 text-gray-400", order: 3 };
            const StageIcon = stageData.icon;
            const probabilityInfo = probabilityConfig[opp.probability] || { label: "Moyenne", color: "text-yellow-400", value: 50 };
            const score = calculateOpportunityScore(opp);
            
            return (
              <motion.div
                key={opp.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white/5 border border-white/10 rounded-xl p-5 hover:border-gold-500/30 transition-all"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 flex-wrap mb-2">
                      <h3 className="text-ivory font-medium text-lg">{opp.title}</h3>
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs ${typeData.color}`}>
                        <TypeIcon className="w-3 h-3" /> {typeData.label}
                      </span>
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs ${stageData.color}`}>
                        <StageIcon className="w-3 h-3" /> {stageData.label}
                      </span>
                    </div>
                    
                    <div className="flex flex-wrap gap-4 text-sm mt-2">
                      {opp.estimated_value > 0 && (
                        <span className="text-emerald-400 font-medium">
                          {opp.estimated_value.toLocaleString()} CFA
                        </span>
                      )}
                      <span className={`text-xs ${probabilityInfo.color}`}>
                        {probabilityInfo.label} ({probabilityInfo.value}%)
                      </span>
                      {opp.deadline && (
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Échéance: {new Date(opp.deadline).toLocaleDateString('fr-FR')}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 mt-3">
                      <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs ${getScoreColor(score)}`}>
                        <span className="text-xs">{getScoreStars(score)}</span>
                        <span>Score: {score}/30</span>
                      </div>
                    </div>
                    
                    {opp.next_action && (
                      <div className="mt-3 p-2 bg-gold-500/5 rounded-lg">
                        <span className="text-xs text-gold-500">🎯 Prochaine action :</span>
                        <span className="text-xs text-gray-300 ml-2">{opp.next_action}</span>
                      </div>
                    )}
                    
                    {opp.notes && (
                      <p className="text-xs text-gray-500 mt-2">{opp.notes}</p>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <select
                      value={opp.stage}
                      onChange={(e) => updateStage(opp.id, e.target.value as Opportunity["stage"])}
                      className="bg-white/10 border border-white/10 rounded-lg px-2 py-1 text-xs focus:outline-none"
                    >
                      {Object.entries(stageConfig).map(([key, conf]) => (
                        <option key={key} value={key}>{conf.label}</option>
                      ))}
                    </select>
                    <button onClick={() => editOpportunity(opp)} className="text-gray-500 hover:text-gold-500">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => deleteOpportunity(opp.id)} className="text-gray-500 hover:text-red-400">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div className="mt-3 w-full bg-white/10 rounded-full h-1">
                  <div 
                    className={`h-1 rounded-full ${opp.stage === "won" ? "bg-emerald-500" : "bg-gold-500"}`}
                    style={{ width: `${(stageData.order / 7) * 100}%` }}
                  />
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
