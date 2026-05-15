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
