"use client";
import { useEffect, useState } from "react";
import LoadingSpinner from "@/components/LoadingSpinner";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Megaphone, Calendar, Plus, Edit2, Trash2, X,
  Sparkles, Clock, CheckCircle, AlertCircle, Filter,
  Image, FileText, Video, Music, Download
} from "lucide-react";
import { exportToPDF } from "@/lib/exportPDF";

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

const platformConfig = {
  instagram: { label: "Instagram", icon: Image, color: "bg-gradient-to-r from-pink-500 to-purple-600 text-white" },
  linkedin: { label: "LinkedIn", icon: FileText, color: "bg-blue-600 text-white" },
  youtube: { label: "YouTube", icon: Video, color: "bg-red-600 text-white" },
  tiktok: { label: "TikTok", icon: Music, color: "bg-black text-white" },
  website: { label: "Site Web", icon: Sparkles, color: "bg-gray-600 text-white" },
  other: { label: "Autre", icon: Sparkles, color: "bg-gray-500 text-white" }
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

// Import manquant
import { RefreshCw } from "lucide-react";

export default function ContentPage() {
  const [contents, setContents] = useState<Content[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingContent, setEditingContent] = useState<Content | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPlatform, setFilterPlatform] = useState<string>("all");
  
  const [formData, setFormData] = useState({
    title: "",
    hook: "",
    platform: "instagram",
    content_type: "story",
    status: "idea",
    publish_date: "",
    cta: ""
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
  fetchContent();
  
  const channel = supabase
    .channel('content_changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'content' }, () => fetchContent())
    .subscribe();
  
  return () => {
    channel.unsubscribe();
  };
}, []);

  async function fetchContent() {
    setIsLoading(true);
    const { data } = await supabase
      .from("content")
      .select("*")
      .order("publish_date", { ascending: true, nullsFirst: false });
    setContents(data || []);
    setIsLoading(false);
  }

  async function saveContent() {
    const data = {
      title: formData.title,
      hook: formData.hook || null,
      platform: formData.platform,
      content_type: formData.content_type,
      status: formData.status,
      publish_date: formData.publish_date || null,
      cta: formData.cta || null
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
      fetchContent();
    } else {
      alert("Erreur: " + error.message);
    }
  }

  async function updateStatus(id: string, newStatus: string) {
    const { error } = await supabase.from("content").update({ status: newStatus }).eq("id", id);
    if (!error) fetchContent();
  }

  async function deleteContent(id: string) {
    if (confirm("Supprimer ce contenu ?")) {
      const { error } = await supabase.from("content").delete().eq("id", id);
      if (!error) fetchContent();
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
    scrollToForm(); 
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

  const filteredContents = contents.filter(c => {
    if (filterStatus !== "all" && c.status !== filterStatus) return false;
    if (filterPlatform !== "all" && c.platform !== filterPlatform) return false;
    return true;
  });

  const stats = {
    total: contents.length,
    posted: contents.filter(c => c.status === "posted").length,
    scheduled: contents.filter(c => c.status === "scheduled").length,
    draft: contents.filter(c => c.status === "draft").length
  };

  const PlatformIcon = ({ platform }: { platform: string }) => {
    const config = platformConfig[platform as keyof typeof platformConfig];
    if (!config) return <Sparkles className="w-4 h-4" />;
    return <config.icon className="w-4 h-4" />;
  };

  return (
    <div className="h-full flex flex-col overflow-y-auto bg-midnight">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-serif text-gold-500 tracking-tight">Content Studio</h1>
          <p className="text-gray-500 mt-2 italic font-light">
            Planning éditorial et gestion de contenu
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => exportToPDF("content-report", `contenu-${new Date().toISOString().split('T')[0]}`)}
            className="bg-white/10 p-2 rounded-full hover:bg-white/20 transition-colors"
            title="Exporter en PDF"
          >
            <Download className="w-5 h-5" />
          </button>
          <button
            onClick={() => {      setShowForm(true);      setEditingContent(null);     scrollToForm();   }}
            className="bg-gold-500 text-midnight px-5 py-2 rounded-full text-sm font-medium flex items-center gap-2 hover:bg-gold-400 transition-colors"
          >
            <Plus className="w-4 h-4" /> Nouveau contenu
          </button>
        </div>
      </div>

      {/* STATISTIQUES */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
          <div className="text-2xl font-serif text-ivory">{stats.total}</div>
          <div className="text-xs text-gray-500">Total contenus</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
          <div className="text-2xl font-serif text-emerald-400">{stats.posted}</div>
          <div className="text-xs text-gray-500">Publiés</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
          <div className="text-2xl font-serif text-purple-400">{stats.scheduled}</div>
          <div className="text-xs text-gray-500">Programmés</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
          <div className="text-2xl font-serif text-yellow-400">{stats.draft}</div>
          <div className="text-xs text-gray-500">Brouillons</div>
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
          value={filterPlatform}
          onChange={(e) => setFilterPlatform(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-gold-500"
        >
          <option value="all">📱 Toutes les plateformes</option>
          {Object.entries(platformConfig).map(([key, conf]) => (
            <option key={key} value={key}>{conf.label}</option>
          ))}
        </select>
      </div>

      {/* FORMULAIRE */}
      <AnimatePresence>
        {showForm && (
          <motion.div id="form-container" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 mb-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-serif text-ivory">{editingContent ? "Modifier" : "Nouveau"} contenu</h3>
              <button onClick={resetForm} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Titre du contenu"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-gold-500 text-ivory md:col-span-2"
              />
              <textarea
                placeholder="Hook / Angle (optionnel)"
                value={formData.hook}
                onChange={(e) => setFormData({ ...formData, hook: e.target.value })}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-gold-500 text-ivory md:col-span-2"
                rows={2}
              />
              <select
                value={formData.platform}
                onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-gold-500 text-ivory"
              >
                {Object.entries(platformConfig).map(([key, conf]) => (
                  <option key={key} value={key}>{conf.label}</option>
                ))}
              </select>
              <select
                value={formData.content_type}
                onChange={(e) => setFormData({ ...formData, content_type: e.target.value })}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-gold-500 text-ivory"
              >
                {Object.entries(contentTypeConfig).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-gold-500 text-ivory"
              >
                {Object.entries(statusConfig).map(([key, conf]) => (
                  <option key={key} value={key}>{conf.label}</option>
                ))}
              </select>
              <input
                type="date"
                placeholder="Date de publication"
                value={formData.publish_date}
                onChange={(e) => setFormData({ ...formData, publish_date: e.target.value })}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-gold-500 text-ivory"
              />
              <input
                type="text"
                placeholder="Call to Action (optionnel)"
                value={formData.cta}
                onChange={(e) => setFormData({ ...formData, cta: e.target.value })}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-gold-500 text-ivory md:col-span-2"
              />
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

      {/* GRILLE DES CONTENUS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {isLoading ? (
          <div className="col-span-2">
            <LoadingSpinner />
          </div>
        ) : filteredContents.length === 0 ? (
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
              <motion.div
                key={content.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-gold-500/30 transition-all"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs ${platformColor}`}>
                        <PlatformIcon platform={content.platform} />
                        {platformConfig[content.platform as keyof typeof platformConfig]?.label || content.platform}
                      </span>
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs ${statusColor}`}>
                        <StatusIcon className="w-3 h-3" />
                        {statusConfig[content.status as keyof typeof statusConfig]?.label || content.status}
                      </span>
                    </div>
                    <h3 className="text-ivory font-medium text-lg">{content.title}</h3>
                    {content.hook && (
                      <p className="text-gray-400 text-sm mt-2 italic">"{content.hook}"</p>
                    )}
                    <div className="flex flex-wrap gap-4 mt-3 text-xs text-gray-500">
                      <span>📂 {contentTypeConfig[content.content_type as keyof typeof contentTypeConfig] || content.content_type}</span>
                      {content.publish_date && (
                        <span>📅 {new Date(content.publish_date).toLocaleDateString('fr-FR')}</span>
                      )}
                      {content.cta && (
                        <span>🎯 CTA: {content.cta}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={content.status}
                      onChange={(e) => updateStatus(content.id, e.target.value)}
                      className="bg-white/10 border border-white/10 rounded-lg px-2 py-1 text-xs focus:outline-none"
                    >
                      {Object.entries(statusConfig).map(([key, conf]) => (
                        <option key={key} value={key}>{conf.label}</option>
                      ))}
                    </select>
                    <button onClick={() => editContent(content)} className="text-gray-500 hover:text-gold-500">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => deleteContent(content.id)} className="text-gray-500 hover:text-red-400">
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
