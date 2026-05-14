"use client";

import { useEffect, useState, useRef } from "react";
import LoadingSpinner from "@/components/LoadingSpinner";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Inbox, Send, Sparkles, Trash2, CheckCircle, 
  Clock, AlertCircle, Lightbulb, Heart, DollarSign,
  Briefcase, FileText, Globe, Sprout, User, X,
  Loader2, Filter, Mic, Paperclip, XCircle, Brain,
  TrendingUp, Smile, Frown, Meh, Zap, Target,
  ChevronDown, ChevronUp, Plus
} from "lucide-react";
import { toast } from "sonner";
import { useDropzone } from "react-dropzone";
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";

const API_URL = "https://sovereign-bridge.onrender.com";

// Types
type InboxItem = {
  id: string;
  content: string;
  type: "task" | "idea" | "note" | "opportunity" | "reminder" | "content" | "question" | "worry";
  area: "life" | "family" | "money" | "business" | "content" | "documents" | "relocation" | "farm" | "self";
  urgency: "low" | "medium" | "high";
  needs_processing: boolean;
  processed_at: string | null;
  created_at: string;
};

type BrainAnalysis = {
  summary: string;
  emotions: string[];
  main_topics: string[];
  urgency_level: string;
  priorities: { title: string; reason: string }[];
  suggested_tasks: { title: string; project: string; priority: string }[];
  insights: string;
  calming_response: string;
};

const typeConfig = {
  task: { icon: CheckCircle, label: "Tâche", color: "bg-blue-500/20 text-blue-400", border: "border-l-blue-500" },
  idea: { icon: Lightbulb, label: "Idée", color: "bg-yellow-500/20 text-yellow-400", border: "border-l-yellow-500" },
  note: { icon: FileText, label: "Note", color: "bg-gray-500/20 text-gray-400", border: "border-l-gray-500" },
  opportunity: { icon: DollarSign, label: "Opportunité", color: "bg-emerald-500/20 text-emerald-400", border: "border-l-emerald-500" },
  reminder: { icon: Clock, label: "Rappel", color: "bg-orange-500/20 text-orange-400", border: "border-l-orange-500" },
  content: { icon: Sparkles, label: "Contenu", color: "bg-purple-500/20 text-purple-400", border: "border-l-purple-500" },
  question: { icon: AlertCircle, label: "Question", color: "bg-red-500/20 text-red-400", border: "border-l-red-500" },
  worry: { icon: Heart, label: "Stress", color: "bg-pink-500/20 text-pink-400", border: "border-l-pink-500" }
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

export default function InboxPage() {
  const [items, setItems] = useState<InboxItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [input, setInput] = useState("");
  const [filterArea, setFilterArea] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [analysis, setAnalysis] = useState<BrainAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [isProcessingExisting, setIsProcessingExisting] = useState(false);
  const [processingItemId, setProcessingItemId] = useState<string | null>(null);
  
  // États pour les fichiers
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  
  // États pour le micro
  const [isRecording, setIsRecording] = useState(false);
  const [isVoiceLocked, setIsVoiceLocked] = useState(false);
  const [pressTimer, setPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [pressStartTime, setPressStartTime] = useState(0);
  const [isSending, setIsSending] = useState(false);
  
  const inputRef = useRef<HTMLTextAreaElement>(null);

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
      
      toast.info("🧠 Analyse en cours...");
      
      try {
        const response = await fetch(`${API_URL}/api/brain-dump/process`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: fullContent })
        });
        
        const result = await response.json();
        
        if (result.success && result.analysis) {
          setAnalysis(result.analysis);
          toast.success(result.analysis.calming_response || "✨ Prise en compte !");
          
          if (result.analysis.suggested_tasks?.length > 0) {
            for (const task of result.analysis.suggested_tasks.slice(0, 3)) {
              await supabase.from("tasks").insert({
                title: task.title,
                status: "today",
                priority: task.priority || "normal",
                project: task.project || "Général"
              });
            }
            toast.success(`✅ ${result.analysis.suggested_tasks.length} tâche(s) créée(s)`);
          }
          
          await supabase
            .from("inbox")
            .update({ 
              type: result.analysis.urgency_level === "high" ? "task" : "note",
              urgency: result.analysis.urgency_level,
              needs_processing: false,
              processed_at: new Date().toISOString()
            })
            .eq("id", data[0].id);
            
          fetchItems();
        }
      } catch (error) {
        console.error("Erreur analyse:", error);
        toast.error("L'analyse a échoué, mais l'idée a été sauvegardée");
      } finally {
        setIsAnalyzing(false);
      }
    } else if (error) {
      toast.error("Erreur: " + error.message);
    }
    setIsSending(false);
  }

  async function processExistingItem(item: InboxItem) {
    setProcessingItemId(item.id);
    setIsProcessingExisting(true);
    
    try {
      const response = await fetch(`${API_URL}/api/brain-dump/process`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: item.content })
      });
      
      const result = await response.json();
      
      if (result.success && result.analysis) {
        setAnalysis(result.analysis);
        toast.success(result.analysis.calming_response || "✨ Analyse terminée !");
        
        if (result.analysis.suggested_tasks?.length > 0) {
          for (const task of result.analysis.suggested_tasks.slice(0, 3)) {
            await supabase.from("tasks").insert({
              title: task.title,
              status: "today",
              priority: task.priority || "normal",
              project: task.project || "Général"
            });
          }
          toast.success(`✅ ${result.analysis.suggested_tasks.length} tâche(s) créée(s)`);
        }
        
        await supabase
          .from("inbox")
          .update({ 
            type: result.analysis.urgency_level === "high" ? "task" : "note",
            urgency: result.analysis.urgency_level,
            needs_processing: false,
            processed_at: new Date().toISOString()
          })
          .eq("id", item.id);
          
        fetchItems();
      }
    } catch (error) {
      console.error("Erreur analyse:", error);
      toast.error("Erreur lors de l'analyse");
    } finally {
      setProcessingItemId(null);
      setIsProcessingExisting(false);
    }
  }

  async function deleteItem(id: string) {
    const { error } = await supabase.from("inbox").delete().eq("id", id);
    if (!error) fetchItems();
  }

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
    if (filterArea !== "all" && item.area !== filterArea) return false;
    if (filterType !== "all" && item.type !== filterType) return false;
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
        <div className="flex items-center gap-3 mb-2">
          <Brain className="w-8 h-8 text-gold-500" />
          <h1 className="text-3xl md:text-4xl font-serif text-gold-500 tracking-tight">Brain Dump</h1>
        </div>
        <p className="text-gray-500 text-sm italic">
          Vide ton esprit. Je trie, j'analyse, j'agis.
        </p>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
          <div className="text-2xl font-serif text-ivory">{stats.total}</div>
          <div className="text-[10px] text-gray-500">Total</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
          <div className="text-2xl font-serif text-yellow-400">{stats.pending}</div>
          <div className="text-[10px] text-gray-500">À traiter</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
          <div className="text-2xl font-serif text-red-400">{stats.highUrgency}</div>
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
        
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 focus-within:border-gold-500 transition-all">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Écris tout ce qui te traverse l'esprit... (tâches, idées, stress, opportunités, questions)"
            className="w-full bg-transparent text-ivory placeholder:text-gray-500 resize-none focus:outline-none text-sm"
            rows={4}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !isRecording && !isVoiceLocked && !isSending) {
                e.preventDefault();
                analyzeAndAddItem();
              }
            }}
          />
          
          <div className="flex justify-between items-center mt-3 pt-2 border-t border-white/10">
            <div className="flex items-center gap-2">
              <button
                onClick={() => document.getElementById('file-upload-input')?.click()}
                className="p-1.5 rounded-full bg-white/5 text-gray-400 hover:bg-white/10 transition-colors"
                title="Joindre un fichier"
              >
                <Paperclip className="w-4 h-4" />
              </button>
              <input
                id="file-upload-input"
                type="file"
                {...getInputProps()}
                className="hidden"
              />
              <span className="text-[10px] text-gray-600">Appui long = dicter</span>
            </div>
            
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
              className={`px-4 py-1.5 rounded-full transition-all flex items-center gap-2 ${
                isRecording || isVoiceLocked
                  ? "bg-red-500 text-white animate-pulse"
                  : "bg-gold-500 text-midnight hover:scale-105"
              } disabled:opacity-50 disabled:hover:scale-100 text-sm font-medium`}
            >
              {isSending || isAnalyzing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isRecording || isVoiceLocked ? (
                <Mic className="w-4 h-4" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {isSending || isAnalyzing ? "Envoi..." : "Envoyer"}
            </button>
          </div>
        </div>
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
            
            <p className="text-sm text-ivory italic mb-3">"{analysis.calming_response}"</p>
            
            <div className="flex flex-wrap gap-2 mb-3">
              {analysis.emotions?.map((emotion, i) => (
                <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-gray-300">
                  {emotion}
                </span>
              ))}
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                analysis.urgency_level === "high" ? "bg-red-500/20 text-red-400" :
                analysis.urgency_level === "medium" ? "bg-yellow-500/20 text-yellow-400" :
                "bg-green-500/20 text-green-400"
              }`}>
                {analysis.urgency_level === "high" ? "⚠️ Urgence haute" : 
                 analysis.urgency_level === "medium" ? "🟡 Urgence moyenne" : 
                 "🟢 Urgence basse"}
              </span>
            </div>
            
            <div className="mb-3 p-3 bg-black/20 rounded-lg">
              <p className="text-xs text-gold-500 mb-1">📋 Résumé</p>
              <p className="text-sm text-gray-200">{analysis.summary}</p>
            </div>
            
            {analysis.priorities && analysis.priorities.length > 0 && (
              <div className="mb-3">
                <p className="text-xs text-gold-500 mb-2">🎯 Priorités identifiées</p>
                <div className="space-y-2">
                  {analysis.priorities.map((p, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <span className="text-gold-500">{i + 1}.</span>
                      <div>
                        <p className="text-ivory">{p.title}</p>
                        <p className="text-xs text-gray-500">{p.reason}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {analysis.suggested_tasks?.length > 0 && (
              <div className="mt-3 pt-2 border-t border-white/10">
                <p className="text-xs text-gold-500 mb-2">✅ Tâches créées :</p>
                <ul className="text-xs text-gray-300 space-y-1">
                  {analysis.suggested_tasks.map((task, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <CheckCircle className="w-3 h-3 text-emerald-400" />
                      <span>{task.title}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {analysis.insights && (
              <div className="mt-3 pt-2 border-t border-white/10">
                <p className="text-xs text-gold-500 mb-1">💡 Insight</p>
                <p className="text-xs text-gray-400">{analysis.insights}</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* FILTRES */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-gold-500 transition-colors"
        >
          <Filter className="w-4 h-4" />
          Filtres
          {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        <span className="text-xs text-gray-500">{filteredItems.length} résultat(s)</span>
      </div>

      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-4"
          >
            <div className="flex flex-wrap gap-2 p-3 bg-white/5 rounded-xl">
              <select
                value={filterArea}
                onChange={(e) => setFilterArea(e.target.value)}
                className="bg-white/10 border border-white/10 rounded-full px-3 py-1.5 text-xs focus:outline-none focus:border-gold-500 text-ivory"
              >
                <option value="all">📁 Tous domaines</option>
                {Object.entries(areaConfig).map(([key, conf]) => (
                  <option key={key} value={key}>{conf.label}</option>
                ))}
              </select>
              
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="bg-white/10 border border-white/10 rounded-full px-3 py-1.5 text-xs focus:outline-none focus:border-gold-500 text-ivory"
              >
                <option value="all">🏷️ Tous types</option>
                {Object.entries(typeConfig).map(([key, conf]) => (
                  <option key={key} value={key}>{conf.label}</option>
                ))}
              </select>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
            const typeConf = typeConfig[item.type] || typeConfig.note;
            const TypeIcon = typeConf.icon;
            const areaConf = areaConfig[item.area] || areaConfig.life;
            const AreaIcon = areaConf.icon;
            
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
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] ${typeConf.color}`}>
                        <TypeIcon className="w-3 h-3" /> {typeConf.label}
                      </span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] ${areaConf.color}`}>
                        <AreaIcon className="w-3 h-3" /> {areaConf.label}
                      </span>
                      <span className="text-[10px] text-gray-600">{new Date(item.created_at).toLocaleString('fr-FR')}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    {item.needs_processing && (
                      <button
                        onClick={() => processExistingItem(item)}
                        disabled={processingItemId === item.id}
                        className="p-1.5 text-gray-500 hover:text-gold-500 transition-colors"
                        title="Analyser"
                      >
                        {processingItemId === item.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Brain className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                    <button
                      onClick={() => deleteItem(item.id)}
                      className="p-1.5 text-gray-500 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
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
    </div>
  );
}
