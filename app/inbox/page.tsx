"use client";
import "regenerator-runtime/runtime";
import { useEffect, useState, useRef } from "react";
import LoadingSpinner from "@/components/LoadingSpinner";
import VoiceInput from "@/components/VoiceInput";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Inbox, Send, Sparkles, Trash2, CheckCircle, 
  Clock, AlertCircle, Lightbulb, Heart, DollarSign,
  Briefcase, FileText, Globe, Sprout, User, X,
  Loader2, Filter, Mic, Paperclip, XCircle, TrendingUp,
  BarChart3, Brain, Target, Zap
} from "lucide-react";
import { toast } from "sonner";
import { useDropzone } from "react-dropzone";
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";

type InboxItem = {
  id: string;
  content: string;
  type: "task" | "idea" | "note" | "opportunity" | "reminder" | "content" | "question" | "worry";
  area: "life" | "family" | "money" | "business" | "content" | "documents" | "relocation" | "farm" | "self";
  mission_id: string | null;
  urgency: "low" | "medium" | "high";
  needs_processing: boolean;
  processed_at: string | null;
  converted_to: string | null;
  created_at: string;
};

const typeConfig = {
  task: { icon: CheckCircle, label: "Tâche", color: "bg-blue-500/20 text-blue-400" },
  idea: { icon: Lightbulb, label: "Idée", color: "bg-yellow-500/20 text-yellow-400" },
  note: { icon: FileText, label: "Note", color: "bg-gray-500/20 text-gray-400" },
  opportunity: { icon: DollarSign, label: "Opportunité", color: "bg-emerald-500/20 text-emerald-400" },
  reminder: { icon: Clock, label: "Rappel", color: "bg-orange-500/20 text-orange-400" },
  content: { icon: Sparkles, label: "Contenu", color: "bg-purple-500/20 text-purple-400" },
  question: { icon: AlertCircle, label: "Question", color: "bg-red-500/20 text-red-400" },
  worry: { icon: Heart, label: "Stress", color: "bg-pink-500/20 text-pink-400" }
};

const areaConfig = {
  life: { icon: User, label: "Vie", color: "bg-gray-500/20 text-gray-400" },
  family: { icon: Heart, label: "Famille", color: "bg-pink-500/20 text-pink-400" },
  money: { icon: DollarSign, label: "Argent", color: "bg-emerald-500/20 text-emerald-400" },
  business: { icon: Briefcase, label: "Business", color: "bg-blue-500/20 text-blue-400" },
  content: { icon: Sparkles, label: "Contenu", color: "bg-purple-500/20 text-purple-400" },
  documents: { icon: FileText, label: "Documents", color: "bg-cyan-500/20 text-cyan-400" },
  relocation: { icon: Globe, label: "Relocalisation", color: "bg-orange-500/20 text-orange-400" },
  farm: { icon: Sprout, label: "Ferme", color: "bg-green-500/20 text-green-400" },
  self: { icon: User, label: "Personnel", color: "bg-indigo-500/20 text-indigo-400" }
};

// ============================================
// COMPOSANT D'ANALYSE EN TEMPS RÉEL
// ============================================
function RealtimeAnalysis({ text }: { text: string }) {
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (text.length < 20) {
      setAnalysis(null);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch("https://sovereign-bridge.onrender.com/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [{
              role: "user",
              content: `Analyse ce texte en français. Retourne UNIQUEMENT du JSON valide sans aucun autre texte:
              {
                "type": "task|idea|question|worry|note",
                "emotion": "positif|negatif|stress|neutre",
                "suggested_action": "courte action (max 40 caractères)",
                "priority": "high|medium|low"
              }
              Texte: "${text.substring(0, 300)}"`
            }]
          })
        });
        const data = await response.json();
        const jsonMatch = data.reply.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          setAnalysis(JSON.parse(jsonMatch[0]));
        }
      } catch (error) {
        console.error("Erreur analyse:", error);
      } finally {
        setLoading(false);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [text]);

  if (!analysis) return null;

  const getTypeEmoji = (type: string) => {
    switch(type) {
      case "task": return "📋";
      case "idea": return "💡";
      case "question": return "❓";
      case "worry": return "😟";
      default: return "📝";
    }
  };

  const getEmotionEmoji = (emotion: string) => {
    switch(emotion) {
      case "positif": return "😊";
      case "negatif": return "😔";
      case "stress": return "😰";
      default: return "😐";
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-2 p-3 bg-gradient-to-r from-gold-500/10 to-transparent border border-gold-500/20 rounded-xl"
    >
      <div className="flex items-center gap-2 mb-2">
        <Brain className="w-3 h-3 text-gold-500" />
        <span className="text-[10px] text-gold-500 uppercase tracking-wider">Analyse en temps réel</span>
      </div>
      <div className="flex items-center gap-3 text-xs flex-wrap">
        <span className="px-2 py-1 rounded-full bg-white/10">
          {getTypeEmoji(analysis.type)} {analysis.type || "note"}
        </span>
        <span className="px-2 py-1 rounded-full bg-white/10">
          {getEmotionEmoji(analysis.emotion)} {analysis.emotion || "neutre"}
        </span>
        {analysis.priority === "high" && (
          <span className="px-2 py-1 rounded-full bg-red-500/20 text-red-400">⚠️ Prioritaire</span>
        )}
        <span className="text-gold-400">💡 {analysis.suggested_action || "À traiter"}</span>
      </div>
    </motion.div>
  );
}

// ============================================
// COMPOSANT INSIGHTS (STATISTIQUES)
// ============================================
function Insights({ items }: { items: InboxItem[] }) {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  
  const recentItems = items.filter(i => new Date(i.created_at) > weekAgo);
  
  const typeCount = recentItems.reduce((acc, i) => {
    acc[i.type] = (acc[i.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const areaCount = recentItems.reduce((acc, i) => {
    acc[i.area] = (acc[i.area] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const stressCount = recentItems.filter(i => i.type === "worry" || i.urgency === "high").length;
  const stressPercent = recentItems.length > 0 ? Math.round((stressCount / recentItems.length) * 100) : 0;
  
  const topType = Object.entries(typeCount).sort((a,b) => b[1] - a[1])[0];
  const topArea = Object.entries(areaCount).sort((a,b) => b[1] - a[1])[0];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      <div className="bg-white/5 rounded-xl p-3 text-center">
        <div className="text-xl font-serif text-ivory">{recentItems.length}</div>
        <div className="text-[10px] text-gray-500">Cette semaine</div>
      </div>
      <div className="bg-white/5 rounded-xl p-3 text-center">
        <div className="text-xl font-serif text-gold-500">{topType ? topType[1] : 0}</div>
        <div className="text-[10px] text-gray-500">{topType ? topType[0] : "Type"}</div>
      </div>
      <div className="bg-white/5 rounded-xl p-3 text-center">
        <div className="text-xl font-serif text-blue-400">{topArea ? topArea[1] : 0}</div>
        <div className="text-[10px] text-gray-500">{topArea ? topArea[0] : "Domaine"}</div>
      </div>
      <div className="bg-white/5 rounded-xl p-3 text-center">
        <div className="text-xl font-serif text-red-400">{stressPercent}%</div>
        <div className="text-[10px] text-gray-500">Stress perçu</div>
      </div>
    </div>
  );
}

// ============================================
// COMPOSANT SUGGESTIONS INTELLIGENTES
// ============================================
function SmartSuggestions({ items, onSuggestionClick }: { items: InboxItem[], onSuggestionClick: (text: string) => void }) {
  const pendingCount = items.filter(i => i.needs_processing).length;
  const highUrgencyCount = items.filter(i => i.urgency === "high" && i.needs_processing).length;
  const worryCount = items.filter(i => i.type === "worry" && i.needs_processing).length;
  
  const suggestions = [];
  
  if (pendingCount >= 3) {
    suggestions.push(`📋 Tu as ${pendingCount} éléments en attente. Veux-tu les traiter maintenant ?`);
  }
  if (highUrgencyCount > 0) {
    suggestions.push(`⚠️ ${highUrgencyCount} élément(s) urgent(s) non traités. Priorise-les !`);
  }
  if (worryCount > 0) {
    suggestions.push(`🌿 ${worryCount} source(s) de stress identifiée(s). Veux-tu les décomposer en petites actions ?`);
  }
  if (pendingCount === 0 && items.length > 0) {
    suggestions.push(`🎉 Tu as tout traité ! Continue comme ça !`);
  }
  if (items.length === 0) {
    suggestions.push(`✨ Commence par écrire ce qui te traverse l'esprit. Je m'occupe du classement.`);
  }
  
  if (suggestions.length === 0) return null;
  
  return (
    <div className="bg-gold-500/5 border border-gold-500/20 rounded-xl p-4 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Zap className="w-4 h-4 text-gold-500" />
        <h3 className="text-sm font-serif text-gold-500">Suggestions Sovereign</h3>
      </div>
      <div className="space-y-2">
        {suggestions.map((s, i) => (
          <div key={i} className="text-xs text-gray-300 flex items-start gap-2 cursor-pointer hover:text-gold-400 transition-colors">
            <span className="text-gold-500">→</span>
            <span>{s}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================
// MODE FOCUS
// ============================================
function FocusMode({ onClose, onAdd }: { onClose: () => void, onAdd: (text: string) => void }) {
  const [focusInput, setFocusInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);
  
  const handleSubmit = () => {
    if (focusInput.trim()) {
      onAdd(focusInput);
      setFocusInput("");
    }
  };
  
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4"
    >
      <div className="max-w-2xl w-full">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-gold-500" />
            <h2 className="text-xl font-serif text-gold-500">Mode Focus</h2>
          </div>
          <button onClick={onClose} className="p-2 text-gray-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <p className="text-sm text-gray-400 mb-4 italic">
          "Vide ton esprit. Écris tout ce qui te passe par la tête sans filtre."
        </p>
        
        <textarea
          ref={textareaRef}
          value={focusInput}
          onChange={(e) => setFocusInput(e.target.value)}
          placeholder="Ne réfléchis pas. Écris.
          
Je dois...
Pourquoi...
Et si...
J'ai peur que...
J'aimerais...
Demain il faut...
Pourquoi je n'arrive pas à..."
          className="w-full h-80 bg-white/5 border border-white/10 rounded-2xl p-5 text-ivory placeholder:text-gray-600 resize-none focus:outline-none focus:border-gold-500 text-sm leading-relaxed"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              handleSubmit();
            }
          }}
        />
        
        <div className="flex justify-between items-center mt-4">
          <p className="text-xs text-gray-600">Ctrl/Cmd + Entrée pour envoyer</p>
          <button
            onClick={handleSubmit}
            disabled={!focusInput.trim()}
            className="px-6 py-2 bg-gold-500 text-midnight rounded-full font-medium text-sm hover:bg-gold-400 transition-colors disabled:opacity-50"
          >
            Libérer l'esprit ✨
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export default function InboxPage() {
  const [items, setItems] = useState<InboxItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [input, setInput] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [showFocusMode, setShowFocusMode] = useState(false);
  
  // États pour les fichiers
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  
  // États pour le micro intégré
  const [isRecording, setIsRecording] = useState(false);
  const [isVoiceLocked, setIsVoiceLocked] = useState(false);
  const [pressTimer, setPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [pressStartTime, setPressStartTime] = useState(0);
  const [isSending, setIsSending] = useState(false);
  
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Speech recognition
  const {
    transcript,
    resetTranscript,
    browserSupportsSpeechRecognition
  } = useSpeechRecognition();

  // Mettre à jour l'input quand le transcript change
  useEffect(() => {
    if (transcript) {
      setInput(prev => prev + " " + transcript);
      resetTranscript();
    }
  }, [transcript, resetTranscript]);

  // Nettoyer le timer au démontage
  useEffect(() => {
    return () => {
      if (pressTimer) clearTimeout(pressTimer);
    };
  }, [pressTimer]);

  // Dropzone pour les fichiers
  const onDrop = (acceptedFiles: File[]) => {
    setUploadedFiles(prev => [...prev, ...acceptedFiles]);
  };

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
    },
    maxSize: 10 * 1024 * 1024
  });

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  async function uploadFilesToStorage() {
    if (uploadedFiles.length === 0) return [];
    
    const uploaded = [];
    for (const file of uploadedFiles) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `inbox/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('chat-files')
        .upload(filePath, file);
      
      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage
          .from('chat-files')
          .getPublicUrl(filePath);
        
        uploaded.push({
          name: file.name,
          url: publicUrl,
          type: file.type
        });
      }
    }
    return uploaded;
  }

  useEffect(() => {
    fetchItems();
    
    const channel = supabase
      .channel('inbox_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inbox' }, () => fetchItems())
      .subscribe();
    
    return () => {
      if (channel) {
        channel.unsubscribe();
      }
    };
  }, []); 

  async function fetchItems() {
    setIsLoading(true);
    const { data } = await supabase
      .from("inbox")
      .select("*")
      .order("created_at", { ascending: false });
    setItems(data || []);
    setIsLoading(false);
  }

  // === FONCTION : CLASSIFICATION AUTOMATIQUE ===
  async function processNewItemAutomatically(itemId: string, content: string) {
    try {
      const response = await fetch("https://sovereign-bridge.onrender.com/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            { 
              role: "user", 
              content: `Classe cet élément. Retourne UNIQUEMENT du JSON valide avec les champs: type (task, idea, note, opportunity, reminder, content, question, worry), area (life, family, money, business, content, documents, relocation, farm, self), urgency (low/medium/high). Élément: "${content}"`
            }
          ]
        })
      });
      
      const data = await response.json();
      let classification;
      try {
        const jsonMatch = data.reply.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          classification = JSON.parse(jsonMatch[0]);
        } else {
          classification = { type: "note", area: "life", urgency: "medium" };
        }
      } catch {
        classification = { type: "note", area: "life", urgency: "medium" };
      }
      
      await supabase
        .from("inbox")
        .update({ 
          type: classification.type || "note",
          area: classification.area || "life",
          urgency: classification.urgency || "medium",
          needs_processing: false,
          processed_at: new Date().toISOString()
        })
        .eq("id", itemId);
      
      if (classification.type === "task") {
        await supabase.from("tasks").insert({
          title: content.length > 100 ? content.substring(0, 100) : content,
          status: "today",
          created_at: new Date().toISOString()
        });
        toast.success("✅ Tâche créée automatiquement");
      }
      
      fetchItems();
    } catch (error) {
      console.error("Erreur classification auto:", error);
    }
  }

  // === FONCTION AJOUT MODIFIÉE AVEC FICHIERS ===
  async function addItem(content?: string) {
    const finalContent = content || input.trim();
    if ((!finalContent && uploadedFiles.length === 0) || isSending) return;
    
    setIsSending(true);
    setIsUploading(true);
    const uploadedFilesData = await uploadFilesToStorage();
    setIsUploading(false);
    
    let messageContent = finalContent || "📎 Fichier(s) joint(s)";
    
    const imageFiles = uploadedFilesData.filter(f => f.type.startsWith('image/'));
    const otherFiles = uploadedFilesData.filter(f => !f.type.startsWith('image/'));
    
    if (imageFiles.length > 0) {
      messageContent += "\n\n" + imageFiles.map(f => f.url).join("\n\n");
    }
    
    if (otherFiles.length > 0) {
      messageContent += "\n\n📎 Fichiers joints:\n" + otherFiles.map(f => `- **${f.name}** : ${f.url}`).join("\n");
    }
    
    const { data, error } = await supabase
      .from("inbox")
      .insert({
        content: messageContent,
        type: "note",
        area: "life",
        urgency: "medium",
        needs_processing: true
      })
      .select();
    
    if (!error && data && data[0]) {
      const newItem = data[0];
      setInput("");
      setUploadedFiles([]);
      fetchItems();
      
      toast.info("🤖 Classification en cours...");
      processNewItemAutomatically(newItem.id, messageContent);
    } else if (error) {
      toast.error("Erreur: " + error.message);
    }
    setIsSending(false);
  }

  async function deleteItem(id: string) {
    const { error } = await supabase.from("inbox").delete().eq("id", id);
    if (!error) fetchItems();
  }

  // === GESTION DU MICRO INTÉGRÉ ===
  const startVoiceRecording = () => {
    resetTranscript();
    SpeechRecognition.startListening({ continuous: true, language: 'fr-FR' });
    setIsRecording(true);
  };

  const stopVoiceRecording = () => {
    SpeechRecognition.stopListening();
    setIsRecording(false);
  };

  const handleSendButtonMouseDown = () => {
    setPressStartTime(Date.now());
    
    const timer = setTimeout(() => {
      const pressDuration = Date.now() - pressStartTime;
      
      if (pressDuration >= 3000 && pressDuration < 10000) {
        startVoiceRecording();
      } else if (pressDuration >= 10000) {
        startVoiceRecording();
        setIsVoiceLocked(true);
      }
    }, 3000);
    
    setPressTimer(timer);
  };

  const handleSendButtonMouseUp = () => {
    const pressDuration = Date.now() - pressStartTime;
    
    if (pressTimer) {
      clearTimeout(pressTimer);
      setPressTimer(null);
    }
    
    if (pressDuration < 3000) {
      if (isVoiceLocked) {
        setIsVoiceLocked(false);
        stopVoiceRecording();
      }
      addItem();
    } else if (pressDuration >= 3000 && pressDuration < 10000) {
      stopVoiceRecording();
      inputRef.current?.focus();
    }
  };

  const stopVoiceLock = () => {
    if (isVoiceLocked) {
      setIsVoiceLocked(false);
      stopVoiceRecording();
      inputRef.current?.focus();
    }
  };

  const filteredItems = items.filter(item => {
    if (filter !== "all" && item.area !== filter) return false;
    if (selectedType !== "all" && item.type !== selectedType) return false;
    return true;
  });

  const stats = {
    total: items.length,
    pending: items.filter(i => i.needs_processing).length,
    highUrgency: items.filter(i => i.urgency === "high").length
  };

  return (
    <div className="h-full flex flex-col overflow-y-auto bg-midnight">
      {/* HEADER */}
      <div className="mb-6">
        <h1 className="text-4xl font-serif text-gold-500 tracking-tight">Brain Dump</h1>
        <p className="text-gray-500 mt-2 italic font-light">
          Vide tes pensées ici. L'IA les organisera automatiquement.
        </p>
      </div>

      {/* MODE FOCUS BUTTON */}
      <button
        onClick={() => setShowFocusMode(true)}
        className="mb-6 w-full py-3 bg-gradient-to-r from-gold-500/10 to-gold-500/5 border border-gold-500/20 rounded-xl text-gold-500 text-sm font-medium flex items-center justify-center gap-2 hover:bg-gold-500/20 transition-all group"
      >
        <Brain className="w-4 h-4 group-hover:scale-110 transition-transform" />
        Mode Focus - Vider son esprit
        <Sparkles className="w-3 h-3 opacity-60" />
      </button>

      {/* INSIGHTS */}
      <Insights items={items} />

      {/* SMART SUGGESTIONS */}
      <SmartSuggestions items={items} onSuggestionClick={(text) => setInput(text)} />

      {/* STATS CARD */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
          <div className="text-xl font-serif text-ivory">{stats.total}</div>
          <div className="text-[10px] text-gray-500">Total</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
          <div className="text-xl font-serif text-yellow-400">{stats.pending}</div>
          <div className="text-[10px] text-gray-500">En attente</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
          <div className="text-xl font-serif text-red-400">{stats.highUrgency}</div>
          <div className="text-[10px] text-gray-500">Urgent</div>
        </div>
      </div>

      {/* INPUT AVEC BOUTON PAPERCLIP ET MICRO */}
      <div className="mb-6">
        {uploadedFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {uploadedFiles.map((file, idx) => (
              <div key={idx} className="flex items-center gap-2 bg-white/10 rounded-full px-3 py-1 text-xs">
                {file.type.startsWith('image/') ? '🖼️' : '📄'}
                <span className="truncate max-w-[100px]">{file.name}</span>
                <button onClick={() => removeFile(idx)} className="text-gray-400 hover:text-red-400">
                  <XCircle className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        
        {(isRecording || isVoiceLocked) && (
          <div className="text-center text-xs text-red-400 animate-pulse mb-2">
            {isVoiceLocked ? "🔒 Enregistrement vocal en cours... recliquez pour arrêter" : "🎤 Parlez... relâchez pour arrêter"}
          </div>
        )}
        
        <div className="flex items-start gap-2">
          <button
            onClick={() => document.getElementById('file-upload-input')?.click()}
            className="p-2 rounded-full bg-white/10 text-gray-400 hover:bg-white/20 transition-colors flex-shrink-0 mt-2"
            title="Joindre un fichier"
          >
            <Paperclip className="w-5 h-5" />
          </button>
          
          <input
            id="file-upload-input"
            type="file"
            {...getInputProps()}
            className="hidden"
            onChange={(e) => {
              if (e.target.files) {
                onDrop(Array.from(e.target.files));
              }
            }}
          />
          
          <div className="flex-1">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isRecording || isVoiceLocked ? "🎤 Enregistrement vocal..." : "Écris tout ce qui te traverse l'esprit... (tâches, idées, stress, opportunités, questions)"}
              className="w-full bg-white/10 border border-white/20 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-gold-500 transition-all text-ivory placeholder:text-gray-500 resize-none"
              rows={3}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !isRecording && !isVoiceLocked) {
                  e.preventDefault();
                  addItem();
                }
              }}
            />
            <RealtimeAnalysis text={input} />
          </div>
          
          <button
            onMouseDown={handleSendButtonMouseDown}
            onMouseUp={handleSendButtonMouseUp}
            onMouseLeave={() => {
              if (isRecording && !isVoiceLocked) {
                stopVoiceRecording();
              }
            }}
            onTouchStart={handleSendButtonMouseDown}
            onTouchEnd={handleSendButtonMouseUp}
            onClick={() => {
              if (isVoiceLocked) {
                stopVoiceLock();
              }
            }}
            disabled={(!input.trim() && uploadedFiles.length === 0 && !isRecording && !isVoiceLocked) || isSending}
            className={`p-2 rounded-full transition-all flex-shrink-0 mt-2 ${
              isRecording || isVoiceLocked
                ? "bg-red-500 text-white animate-pulse"
                : "bg-gold-500 text-midnight hover:scale-105"
            } disabled:opacity-50 disabled:hover:scale-100`}
            title={isRecording || isVoiceLocked ? "Enregistrement vocal (recliquez pour arrêter)" : "Envoyer (appui long pour dicter)"}
          >
            {isSending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : isRecording || isVoiceLocked ? (
              <Mic className="w-5 h-5" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
        <p className="text-xs text-gray-600 mt-2">💡 Entrée = envoyer | Shift+Entrée = retour à la ligne | Appui long = dicter</p>
      </div>

      {/* FILTRES */}
      <div className="flex flex-wrap gap-2 mb-6">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-full px-3 py-1.5 text-xs focus:outline-none focus:border-gold-500"
        >
          <option value="all">📁 Tous domaines</option>
          {Object.entries(areaConfig).map(([key, conf]) => (
            <option key={key} value={key}>{conf.label}</option>
          ))}
        </select>
        
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-full px-3 py-1.5 text-xs focus:outline-none focus:border-gold-500"
        >
          <option value="all">🏷️ Tous types</option>
          {Object.entries(typeConfig).map(([key, conf]) => (
            <option key={key} value={key}>{conf.label}</option>
          ))}
        </select>
      </div>

      {/* LISTE DES ENTREES */}
      <div className="space-y-2">
        {isLoading ? (
          <LoadingSpinner />
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Inbox className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-sm">Ton inbox est vide</p>
            <p className="text-xs mt-1">Écris ce qui te passe par la tête !</p>
          </div>
        ) : (
          filteredItems.map((item, idx) => {
            const TypeIcon = typeConfig[item.type].icon;
            const AreaIcon = areaConfig[item.area].icon;
            
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.03 }}
                className={`bg-white/5 border-l-4 rounded-xl p-3 transition-all ${
                  item.urgency === "high" ? "border-l-red-500" : 
                  item.urgency === "medium" ? "border-l-yellow-500" : "border-l-gray-500"
                } ${item.needs_processing ? "opacity-100" : "opacity-60"}`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="text-sm whitespace-pre-wrap line-clamp-3">{item.content}</p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] ${typeConfig[item.type].color}`}>
                        <TypeIcon className="w-3 h-3" /> {typeConfig[item.type].label}
                      </span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] ${areaConfig[item.area].color}`}>
                        <AreaIcon className="w-3 h-3" /> {areaConfig[item.area].label}
                      </span>
                      {item.urgency === "high" && (
                        <span className="text-[10px] text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full">⚠️ Urgent</span>
                      )}
                      <span className="text-[10px] text-gray-600">{new Date(item.created_at).toLocaleString('fr-FR')}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    {item.needs_processing && (
                      <Loader2 className="w-3 h-3 text-gold-500 animate-spin" />
                    )}
                    <button
                      onClick={() => deleteItem(item.id)}
                      className="p-1 text-gray-500 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                {item.processed_at && (
                  <div className="mt-1 text-[10px] text-emerald-400">
                    ✅ Traité le {new Date(item.processed_at).toLocaleString('fr-FR')}
                  </div>
                )}
              </motion.div>
            );
          })
        )}
      </div>

      {/* MODE FOCUS MODAL */}
      <AnimatePresence>
        {showFocusMode && (
          <FocusMode 
            onClose={() => setShowFocusMode(false)} 
            onAdd={(text) => {
              addItem(text);
              setShowFocusMode(false);
            }} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
