"use client";
import "regenerator-runtime/runtime";
import { useEffect, useState, useRef } from "react";
import LoadingSpinner from "@/components/LoadingSpinner";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Inbox, Send, Sparkles, Trash2, CheckCircle, 
  Clock, AlertCircle, Lightbulb, Heart, DollarSign,
  Briefcase, FileText, Globe, Sprout, User, X,
  Loader2, Filter, Mic, Paperclip, XCircle, Brain,
  TrendingUp, Smile, Frown, Meh, Zap, Target
} from "lucide-react";
import { toast } from "sonner";
import { useDropzone } from "react-dropzone";
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";

// Types
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

type BrainAnalysis = {
  summary: string;
  emotions: string[];
  main_topics: string[];
  urgency_level: string;
  priorities: { title: string; reason: string }[];
  suggested_tasks: { title: string; project: string; priority: string }[];
  suggested_missions: { name: string; category: string; priority: string }[];
  insights: string;
  calming_response: string;
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

const emotionIcons: Record<string, { icon: any; color: string }> = {
  stress: { icon: AlertCircle, color: "text-red-400" },
  fatigue: { icon: Clock, color: "text-yellow-400" },
  excitation: { icon: Zap, color: "text-orange-400" },
  frustration: { icon: AlertCircle, color: "text-red-400" },
  clarté: { icon: Lightbulb, color: "text-green-400" },
  confusion: { icon: Meh, color: "text-gray-400" },
  sérénité: { icon: Smile, color: "text-emerald-400" },
  anxiété: { icon: Heart, color: "text-pink-400" },
  motivation: { icon: TrendingUp, color: "text-purple-400" },
  tristesse: { icon: Frown, color: "text-blue-400" },
  joie: { icon: Smile, color: "text-emerald-400" }
};

export default function InboxPage() {
  const [items, setItems] = useState<InboxItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [input, setInput] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [analysis, setAnalysis] = useState<BrainAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // États pour les fichiers
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  
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
  } = useSpeechRecognition();

  useEffect(() => {
    if (transcript) {
      setInput(prev => prev + " " + transcript);
      resetTranscript();
    }
  }, [transcript, resetTranscript]);

  useEffect(() => {
    fetchItems();
    
    const channel = supabase
      .channel('inbox_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inbox' }, () => fetchItems())
      .subscribe();
    
    return () => {
      if (channel) channel.unsubscribe();
    };
  }, []);

  useEffect(() => {
    return () => {
      if (pressTimer) clearTimeout(pressTimer);
    };
  }, [pressTimer]);

  // Dropzone
  const onDrop = (acceptedFiles: File[]) => {
    setUploadedFiles(prev => [...prev, ...acceptedFiles]);
  };

  const { getInputProps } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
    },
    maxSize: 10 * 1024 * 1024,
    noClick: true,
    noKeyboard: true
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

  async function fetchItems() {
    setIsLoading(true);
    const { data } = await supabase
      .from("inbox")
      .select("*")
      .order("created_at", { ascending: false });
    setItems(data || []);
    setIsLoading(false);
  }

  async function analyzeAndAddItem() {
    const content = input.trim();
    if ((!content && uploadedFiles.length === 0) || isSending) return;
    
    setIsSending(true);
    setIsAnalyzing(true);
    
    // Upload des fichiers
    const uploadedFilesData = await uploadFilesToStorage();
    
    let fullContent = content || "📎 Fichier(s) joint(s)";
    const imageFiles = uploadedFilesData.filter(f => f.type.startsWith('image/'));
    const otherFiles = uploadedFilesData.filter(f => !f.type.startsWith('image/'));
    
    if (imageFiles.length > 0) {
      fullContent += "\n\n" + imageFiles.map(f => f.url).join("\n\n");
    }
    if (otherFiles.length > 0) {
      fullContent += "\n\n📎 Fichiers joints:\n" + otherFiles.map(f => `- **${f.name}** : ${f.url}`).join("\n");
    }
    
    // 1. Sauvegarder dans inbox
    const { data, error } = await supabase
      .from("inbox")
      .insert({
        content: fullContent,
        type: "note",
        area: "life",
        urgency: "medium",
        needs_processing: true
      })
      .select();
    
    if (!error && data && data[0]) {
      setInput("");
      setUploadedFiles([]);
      fetchItems();
      
      // 2. Analyser avec l'IA
      toast.info("🧠 Analyse en cours...");
      
      try {
        const response = await fetch("https://sovereign-bridge.onrender.com/api/brain-dump/process", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: fullContent })
        });
        
        const result = await response.json();
        
        if (result.success && result.analysis) {
          setAnalysis(result.analysis);
          
          // Afficher le message réconfortant
          toast.success(result.analysis.calming_response || "✨ Prise en compte !");
          
          // 3. Créer les tâches suggérées automatiquement
          if (result.analysis.suggested_tasks?.length > 0) {
            for (const task of result.analysis.suggested_tasks.slice(0, 3)) {
              await supabase.from("tasks").insert({
                title: task.title,
                status: "today",
                priority: task.priority || "normal",
                project: task.project || "Général",
                created_at: new Date().toISOString()
              });
            }
            toast.success(`✅ ${result.analysis.suggested_tasks.length} tâche(s) créée(s)`);
          }
          
          // 4. Mettre à jour l'item inbox avec l'analyse
          await supabase
            .from("inbox")
            .update({ 
              type: result.analysis.urgency_level === "high" ? "task" : "note",
              urgency: result.analysis.urgency_level,
              needs_processing: false,
              processed_at: new Date().toISOString()
            })
            .eq("id", data[0].id);
        }
      } catch (error) {
        console.error("Erreur analyse:", error);
        toast.error("L'analyse a échoué, mais l'idée a été sauvegardée");
      } finally {
        setIsAnalyzing(false);
        fetchItems();
      }
    } else if (error) {
      toast.error("Erreur: " + error.message);
    }
    setIsSending(false);
  }

  async function deleteItem(id: string) {
    const { error } = await supabase.from("inbox").delete().eq("id", id);
    if (!error) fetchItems();
  }

  // Gestion du micro
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
    if (pressTimer) clearTimeout(pressTimer);
    if (pressDuration < 3000) {
      if (isVoiceLocked) {
        setIsVoiceLocked(false);
        stopVoiceRecording();
      }
      analyzeAndAddItem();
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
    <div className="p-4 md:p-6 lg:p-8 h-full flex flex-col overflow-y-auto bg-midnight">
      {/* HEADER */}
      <div className="mb-6">
        <h1 className="text-3xl md:text-4xl font-serif text-gold-500 tracking-tight">Brain Dump</h1>
        <p className="text-gray-500 text-sm mt-1 italic">
          Vide ton esprit. Je trie, j'analyse, j'agis.
        </p>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
          <div className="text-xl font-serif text-ivory">{stats.total}</div>
          <div className="text-[10px] text-gray-500">Total</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
          <div className="text-xl font-serif text-yellow-400">{stats.pending}</div>
          <div className="text-[10px] text-gray-500">En cours</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
          <div className="text-xl font-serif text-red-400">{stats.highUrgency}</div>
          <div className="text-[10px] text-gray-500">Urgent</div>
        </div>
      </div>

      {/* INPUT AREA */}
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
            {isVoiceLocked ? "🔒 Enregistrement vocal... recliquez pour arrêter" : "🎤 Parlez... relâchez pour arrêter"}
          </div>
        )}
        
        <div className="flex items-start gap-2">
          <button
            onClick={() => document.getElementById('file-upload-input')?.click()}
            className="p-2 rounded-full bg-white/10 text-gray-400 hover:bg-white/20 transition-colors flex-shrink-0 mt-2"
          >
            <Paperclip className="w-5 h-5" />
          </button>
          
          <input
            id="file-upload-input"
            type="file"
            {...getInputProps()}
            className="hidden"
          />
          
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isRecording || isVoiceLocked ? "🎤 Enregistrement vocal..." : "Écris tout ce qui te traverse l'esprit... (tâches, idées, stress, opportunités, questions)"}
            className="flex-1 bg-white/10 border border-white/20 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-gold-500 transition-all text-ivory placeholder:text-gray-500 resize-none"
            rows={3}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !isRecording && !isVoiceLocked && !isSending) {
                e.preventDefault();
                analyzeAndAddItem();
              }
            }}
          />
          
          <button
            onMouseDown={handleSendButtonMouseDown}
            onMouseUp={handleSendButtonMouseUp}
            onMouseLeave={() => {
              if (isRecording && !isVoiceLocked) stopVoiceRecording();
            }}
            onTouchStart={handleSendButtonMouseDown}
            onTouchEnd={handleSendButtonMouseUp}
            onClick={() => { if (isVoiceLocked) stopVoiceLock(); }}
            disabled={(!input.trim() && uploadedFiles.length === 0 && !isRecording && !isVoiceLocked) || isSending}
            className={`p-2 rounded-full transition-all flex-shrink-0 mt-2 ${
              isRecording || isVoiceLocked
                ? "bg-red-500 text-white animate-pulse"
                : "bg-gold-500 text-midnight hover:scale-105"
            } disabled:opacity-50 disabled:hover:scale-100`}
            title={isRecording || isVoiceLocked ? "Enregistrement vocal" : "Envoyer (appui long pour dicter)"}
          >
            {isSending || isAnalyzing ? (
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

      {/* RÉSULTAT DE L'ANALYSE */}
      <AnimatePresence>
        {analysis && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mb-6 bg-gradient-to-r from-gold-500/10 to-transparent border border-gold-500/20 rounded-xl p-4"
          >
            <div className="flex items-center gap-2 mb-3">
              <Brain className="w-4 h-4 text-gold-500" />
              <span className="text-xs text-gold-500 uppercase tracking-wider">Analyse intelligente</span>
              <button 
                onClick={() => setAnalysis(null)}
                className="ml-auto text-gray-500 hover:text-gold-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            {/* Message réconfortant */}
            <p className="text-sm text-ivory italic mb-3">"{analysis.calming_response}"</p>
            
            {/* Émotions et urgence */}
            <div className="flex flex-wrap gap-2 mb-3">
              {analysis.emotions?.map((emotion, i) => {
                const emotionConfig = emotionIcons[emotion.toLowerCase()];
                const EmotionIcon = emotionConfig?.icon || Heart;
                const color = emotionConfig?.color || "text-gray-400";
                return (
                  <span key={i} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-white/10 ${color}`}>
                    <EmotionIcon className="w-3 h-3" />
                    {emotion}
                  </span>
                );
              })}
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${
                analysis.urgency_level === "high" ? "bg-red-500/20 text-red-400" :
                analysis.urgency_level === "medium" ? "bg-yellow-500/20 text-yellow-400" :
                "bg-green-500/20 text-green-400"
              }`}>
                {analysis.urgency_level === "high" ? "⚠️ Urgence haute" : 
                 analysis.urgency_level === "medium" ? "🟡 Urgence moyenne" : 
                 "🟢 Urgence basse"}
              </span>
            </div>
            
            {/* RÉSUMÉ COMPLET */}
            <div className="mb-3 p-3 bg-black/20 rounded-lg">
              <p className="text-xs text-gold-500 mb-1">📋 Résumé</p>
              <p className="text-sm text-gray-200 whitespace-pre-wrap leading-relaxed">{analysis.summary}</p>
            </div>
            
            {/* Sujets principaux */}
            {analysis.main_topics?.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {analysis.main_topics.map((topic, i) => (
                  <span key={i} className="px-2 py-0.5 rounded-full text-xs bg-white/5 text-gray-300">
                    #{topic}
                  </span>
                ))}
              </div>
            )}
            
            {/* Priorités */}
            {analysis.priorities?.length > 0 && (
              <div className="mt-3 pt-2 border-t border-white/10">
                <p className="text-xs text-gold-500 mb-2">🎯 Ce qui est prioritaire :</p>
                <ul className="text-xs text-gray-300 space-y-1.5">
                  {analysis.priorities.map((p, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-gold-500">•</span>
                      <span><strong>{p.title}</strong> — {p.reason}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* Insights */}
            {analysis.insights && (
              <div className="mt-3 pt-2 border-t border-white/10">
                <p className="text-xs text-gold-500 mb-1">💡 Insight</p>
                <p className="text-xs text-gray-300 italic">{analysis.insights}</p>
              </div>
            )}
            
            {/* Tâches créées */}
            {analysis.suggested_tasks?.length > 0 && (
              <div className="mt-3 pt-2 border-t border-white/10">
                <p className="text-xs text-gold-500 mb-2">✅ Tâches créées :</p>
                <ul className="text-xs text-gray-300 space-y-1">
                  {analysis.suggested_tasks.map((task, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <CheckCircle className="w-3 h-3 text-emerald-400" />
                      <span>{task.title}</span>
                      <span className="text-gray-500 text-[10px]">({task.project})</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* FILTRES */}
      <div className="flex flex-wrap gap-2 mb-4">
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
            const TypeIcon = typeConfig[item.type]?.icon || FileText;
            const AreaIcon = areaConfig[item.area]?.icon || User;
            
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.03 }}
                className={`bg-white/5 border-l-4 rounded-xl p-3 transition-all ${
                  item.urgency === "high" ? "border-l-red-500" : 
                  item.urgency === "medium" ? "border-l-yellow-500" : "border-l-gray-500"
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="text-sm whitespace-pre-wrap line-clamp-3">{item.content}</p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] ${typeConfig[item.type]?.color || "bg-gray-500/20 text-gray-400"}`}>
                        <TypeIcon className="w-3 h-3" /> {typeConfig[item.type]?.label || "Note"}
                      </span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] ${areaConfig[item.area]?.color || "bg-gray-500/20 text-gray-400"}`}>
                        <AreaIcon className="w-3 h-3" /> {areaConfig[item.area]?.label || "Autre"}
                      </span>
                      {item.urgency === "high" && (
                        <span className="text-[10px] text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full">⚠️ Urgent</span>
                      )}
                      <span className="text-[10px] text-gray-600">{new Date(item.created_at).toLocaleString('fr-FR')}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteItem(item.id)}
                    className="p-1.5 text-gray-500 hover:text-red-400 transition-colors ml-2"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
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
    </div>
  );
}
