"use client";
import { useEffect, useState, useRef } from "react";
import LoadingSpinner from "@/components/LoadingSpinner";
import VoiceInput from "@/components/VoiceInput";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Inbox, Send, Sparkles, Trash2, CheckCircle, 
  Clock, AlertCircle, Lightbulb, Heart, DollarSign,
  Briefcase, FileText, Globe, Sprout, User, X,
  Loader2, Filter, Mic, Paperclip, XCircle
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

export default function InboxPage() {
  const [items, setItems] = useState<InboxItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [filter, setFilter] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  
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

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
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

  const scrollToForm = () => {
    setTimeout(() => {
      const formElement = document.getElementById('form-container');
      if (formElement) {
        formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 150);
  };

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
  async function addItem() {
    if ((!input.trim() && uploadedFiles.length === 0) || isSending) return;
    
    setIsSending(true);
    setIsUploading(true);
    const uploadedFilesData = await uploadFilesToStorage();
    setIsUploading(false);
    
    let content = input.trim() || "📎 Fichier(s) joint(s)";
    
    const imageFiles = uploadedFilesData.filter(f => f.type.startsWith('image/'));
    const otherFiles = uploadedFilesData.filter(f => !f.type.startsWith('image/'));
    
    if (imageFiles.length > 0) {
      content += "\n\n" + imageFiles.map(f => f.url).join("\n\n");
    }
    
    if (otherFiles.length > 0) {
      content += "\n\n📎 Fichiers joints:\n" + otherFiles.map(f => `- **${f.name}** : ${f.url}`).join("\n");
    }
    
    const { data, error } = await supabase
      .from("inbox")
      .insert({
        content: content,
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
      processNewItemAutomatically(newItem.id, content);
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
    <div className="p-8 lg:p-12 h-full flex flex-col overflow-y-auto bg-midnight">
      {/* HEADER */}
      <div className="mb-8">
        <h1 className="text-4xl font-serif text-gold-500 tracking-tight">Brain Dump</h1>
        <p className="text-gray-500 mt-2 italic font-light">
          Vide tes pensées ici. L'IA les organisera automatiquement.
        </p>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
          <div className="text-2xl font-serif text-ivory">{stats.total}</div>
          <div className="text-xs text-gray-500">Total entrées</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
          <div className="text-2xl font-serif text-yellow-400">{stats.pending}</div>
          <div className="text-xs text-gray-500">En traitement</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
          <div className="text-2xl font-serif text-red-400">{stats.highUrgency}</div>
          <div className="text-xs text-gray-500">Urgentes</div>
        </div>
      </div>

      {/* INPUT AVEC BOUTON JOINDURE ET MICRO */}
      <div className="mb-8">
        {/* Fichiers en attente */}
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
        
        {/* Indicateur d'enregistrement vocal */}
        {(isRecording || isVoiceLocked) && (
          <div className="text-center text-xs text-red-400 animate-pulse mb-2">
            {isVoiceLocked ? "🔒 Enregistrement vocal en cours... recliquez pour arrêter" : "🎤 Parlez... relâchez pour arrêter (texte modifiable)"}
          </div>
        )}
        
        <div className="flex items-center gap-2">
          {/* Bouton Paperclip */}
          <button
            onClick={() => document.getElementById('file-upload-input')?.click()}
            className="p-2 rounded-full bg-white/10 text-gray-400 hover:bg-white/20 transition-colors flex-shrink-0"
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
          
          {/* Champ de saisie */}
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isRecording || isVoiceLocked ? "🎤 Enregistrement vocal..." : "Écris tout ce qui te traverse l'esprit... (tâches, idées, stress, opportunités, questions)"}
            className="flex-1 bg-white/10 border border-white/20 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-gold-500 transition-all text-ivory placeholder:text-gray-500 resize-none"
            rows={3}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !isRecording && !isVoiceLocked) {
                e.preventDefault();
                addItem();
              }
            }}
          />
          
          {/* Bouton Envoyer / Micro intégré */}
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
            className={`p-2 rounded-full transition-all flex-shrink-0 ${
              isRecording || isVoiceLocked
                ? "bg-red-500 text-white animate-pulse"
                : "bg-gold-500 text-midnight hover:scale-105"
            } disabled:opacity-50 disabled:hover:scale-100`}
            title={isRecording || isVoiceLocked ? "Enregistrement vocal (recliquez pour arrêter)" : "Envoyer (appui long pour dicter)"}
          >
            {isSending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isRecording || isVoiceLocked ? (
              <Mic className="w-5 h-5" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
        <p className="text-xs text-gray-600 mt-2">💡 Appuie sur Entrée pour envoyer, Shift+Entrée pour retour à la ligne | Appui long sur le bouton pour dicter</p>
      </div>

      {/* FILTRES */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-gold-500"
        >
          <option value="all">📁 Tous les domaines</option>
          {Object.entries(areaConfig).map(([key, conf]) => (
            <option key={key} value={key}>{conf.label}</option>
          ))}
        </select>
        
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-gold-500"
        >
          <option value="all">🏷️ Tous les types</option>
          {Object.entries(typeConfig).map(([key, conf]) => (
            <option key={key} value={key}>{conf.label}</option>
          ))}
        </select>
      </div>

      {/* LISTE DES ENTREES */}
      <div className="space-y-3">
        {isLoading ? (
          <LoadingSpinner />
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Inbox className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p>Ton inbox est vide</p>
            <p className="text-sm mt-2">Écris ce qui te passe par la tête !</p>
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
                className={`bg-white/5 border-l-4 rounded-xl p-4 transition-all ${
                  item.urgency === "high" ? "border-l-red-500" : 
                  item.urgency === "medium" ? "border-l-yellow-500" : "border-l-gray-500"
                } ${item.needs_processing ? "opacity-100" : "opacity-60"}`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="text-ivory text-sm whitespace-pre-wrap">{item.content}</p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs ${typeConfig[item.type].color}`}>
                        <TypeIcon className="w-3 h-3" /> {typeConfig[item.type].label}
                      </span>
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs ${areaConfig[item.area].color}`}>
                        <AreaIcon className="w-3 h-3" /> {areaConfig[item.area].label}
                      </span>
                      {item.urgency === "high" && (
                        <span className="text-xs text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full">⚠️ Urgent</span>
                      )}
                      <span className="text-xs text-gray-600">{new Date(item.created_at).toLocaleString('fr-FR')}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {item.needs_processing && (
                      <div className="p-1.5">
                        <Loader2 className="w-4 h-4 text-gold-500 animate-spin" />
                      </div>
                    )}
                    <button
                      onClick={() => deleteItem(item.id)}
                      className="p-1.5 text-gray-500 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                {item.processed_at && (
                  <div className="mt-2 text-xs text-emerald-400">
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
