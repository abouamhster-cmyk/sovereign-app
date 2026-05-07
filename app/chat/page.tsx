"use client";
import "regenerator-runtime/runtime";
import { useState, useRef, useEffect } from "react";
import ReactMarkdown from 'react-markdown';
import { 
  Send, ArrowLeft, Plus, Trash2, ChevronLeft, ChevronRight, 
  Search, Edit2, Check, X, Loader2, Menu, Mic, Paperclip, 
  File, XCircle, Heart, Zap, Trophy, Baby, DollarSign, 
  FileText, Crown, ChevronDown, Sparkles, Volume2, VolumeX
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useDropzone } from "react-dropzone";
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";
import { useSpeechSynthesis } from "react-speech-kit";
import SovereignAvatar from "@/components/SovereignAvatar";

const API_URL = "https://sovereign-bridge.onrender.com";

type Conversation = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
};

type Message = {
  id?: string;
  role: "user" | "assistant";
  content: string;
  files?: { name: string; url: string; type: string }[];
  created_at?: string;
};

// Configuration des modes de conversation
const modes = [
  { 
    id: "parle-moi", 
    name: "Parle-moi", 
    icon: Heart, 
    color: "text-pink-400", 
    bg: "bg-pink-500/10",
    description: "Soutien émotionnel, écoute, recentrage",
    prompt: "Tu es Becks, un compagnon bienveillant et doux. Tu es là pour écouter, soutenir, recentrer. Tu ne donnes pas de conseils médicaux. Tu aides Rebecca à clarifier ses émotions et à trouver la paix. Tu parles avec douceur, tu reformules, tu proposes des respirations courtes si elle est stressée. Tu es comme une grande sœur présente et calme."
  },
  { 
    id: "fais-le-avec-moi", 
    name: "Fais-le avec moi", 
    icon: Zap, 
    color: "text-yellow-400", 
    bg: "bg-yellow-500/10",
    description: "Exécution, transformation d'idée en action",
    prompt: "Tu es Becks, un agent d'exécution. Tu transformes les idées en actions concrètes. Tu demandes les informations manquantes, tu crées des checklists, des emails, des plans. Tu es pragmatique, efficace et orientée résultat. Tu ne fais pas de long discours, tu vas droit au but et tu aides à passer à l'action immédiatement."
  },
  { 
    id: "love-fire-sport", 
    name: "Love & Fire Sport", 
    icon: Trophy, 
    color: "text-emerald-400", 
    bg: "bg-emerald-500/10",
    description: "Grants, DDA, contrats publics",
    prompt: "Tu es Becks, spécialiste de Love & Fire Sport. Tu aides Rebecca avec les grants, contrats publics, DDA, Maryland vendor registration, eMMA, SAM.gov, assurances, budgets, business plan. Tu connais le domaine des sports adaptés pour enfants avec autisme et handicaps neurologiques. Tu es précise, organisée et stratégique. Tu peux aider à structurer des dossiers, préparer des emails, suivre des deadlines."
  },
  { 
    id: "mes-enfants", 
    name: "Mes enfants", 
    icon: Baby, 
    color: "text-blue-400", 
    bg: "bg-blue-500/10",
    description: "Routines, rendez-vous, organisation",
    prompt: "Tu es Becks, assistante familiale. Tu connais Neriah Fumi, Nylah Tiwa, Norah Ife et Nyrel Sheyi (appelée Sheyi Coco). Tu aides à organiser routines, rendez-vous, notes de comportement, besoins spéciaux. Tu es douce, organisée et bienveillante. Tu aides à préparer les questions pour les rendez-vous médicaux et à suivre les devoirs."
  },
  { 
    id: "business-argent", 
    name: "Business & Argent", 
    icon: DollarSign, 
    color: "text-emerald-400", 
    bg: "bg-emerald-500/10",
    description: "Opportunités, emails, stratégie",
    prompt: "Tu es Becks, conseillère business. Tu aides avec opportunités, emails de prospection, stratégie, suivi de candidatures, priorités. Tu penses ROI et action rapide. Tu aides à rédiger des propositions, des scripts d'appel, des pitchs. Tu es pragmatique et orientée résultats."
  },
  { 
    id: "documents", 
    name: "Documents", 
    icon: FileText, 
    color: "text-orange-400", 
    bg: "bg-orange-500/10",
    description: "Lecture, résumé, rédaction",
    prompt: "Tu es Becks, assistante documentaire. Tu lis, résumes, réécris, remplis des formulaires. Tu aides à préparer des propositions, des lettres, des budgets. Tu es précise, professionnelle et efficace. Tu peux extraire les informations importantes d'un document et proposer des versions améliorées."
  },
  { 
    id: "sovereign-mode", 
    name: "Sovereign Mode", 
    icon: Crown, 
    color: "text-gold-500", 
    bg: "bg-gold-500/10",
    description: "Vision, plan de vie, décisions",
    prompt: "Tu es Becks, coach de vision et de leadership. Tu aides Rebecca à clarifier sa vision, prendre des décisions importantes, planifier sur 90 jours. Tu es profonde, puissante, alignée. Tu poses des questions qui font réfléchir et tu aides à structurer la pensée. Tu parles avec profondeur et présence."
  }
];

export default function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [filteredConversations, setFilteredConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  
  // États pour le sélecteur de modes
  const [selectedMode, setSelectedMode] = useState<string>("parle-moi");
  const [isModeSelectorOpen, setIsModeSelectorOpen] = useState(false);
  
  // États pour le micro intégré
  const [isRecording, setIsRecording] = useState(false);
  const [isVoiceLocked, setIsVoiceLocked] = useState(false);
  const [pressTimer, setPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [pressStartTime, setPressStartTime] = useState(0);
  
  // États pour l'avatar et la voix
  const [avatarState, setAvatarState] = useState<"idle" | "listening" | "thinking" | "speaking" | "happy">("idle");
  const [lastAssistantMessage, setLastAssistantMessage] = useState("");
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Speech recognition
  const {
    transcript,
    resetTranscript,
  } = useSpeechRecognition();

  // Speech synthesis
  const { speak, speaking, supported: speechSupported } = useSpeechSynthesis();

  // Détecter le mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Mettre à jour l'input quand le transcript change
  useEffect(() => {
    if (transcript) {
      setInput(prev => prev + " " + transcript);
      resetTranscript();
    }
  }, [transcript, resetTranscript]);

  // Charger les conversations
  useEffect(() => {
    fetchConversations();
  }, []);

  // Charger les messages quand une conversation change
  useEffect(() => {
    if (currentConversationId) {
      fetchMessages(currentConversationId);
    }
  }, [currentConversationId]);

  // Filtrer les conversations par recherche
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredConversations(conversations);
    } else {
      const filtered = conversations.filter(conv => 
        conv.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredConversations(filtered);
    }
  }, [searchTerm, conversations]);

  // Scroll auto
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages]);

  // Fermer sidebar sur mobile après navigation
  useEffect(() => {
    if (isMobile && currentConversationId) {
      setIsSidebarOpen(false);
    }
  }, [currentConversationId, isMobile]);

  // Nettoyer le timer
  useEffect(() => {
    return () => {
      if (pressTimer) clearTimeout(pressTimer);
    };
  }, [pressTimer]);

  // Dropzone pour les fichiers
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
    if (uploadedFiles.length === 0 || !currentConversationId) return [];
    
    const uploaded = [];
    for (const file of uploadedFiles) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `chat/${currentConversationId}/${fileName}`;
      
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

  async function fetchConversations() {
    const { data } = await supabase
      .from("conversations")
      .select("*")
      .order("updated_at", { ascending: false });
    
    setConversations(data || []);
    setFilteredConversations(data || []);
    
    if (!data || data.length === 0) {
      createNewConversation();
    } else if (!currentConversationId) {
      setCurrentConversationId(data[0].id);
    }
  }

  async function fetchMessages(conversationId: string) {
    const { data } = await supabase
      .from("conversation_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });
    
    if (data && data.length > 0) {
      const parsedMessages = data.map(msg => {
        try {
          const parsed = JSON.parse(msg.content);
          return { ...msg, content: parsed.content, files: parsed.files };
        } catch {
          return msg;
        }
      });
      setMessages(parsedMessages);
    } else {
      setMessages([{ role: "assistant", content: "Bonjour Rebecca. Que veux-tu qu'on attaque aujourd'hui ?" }]);
    }
  }

  async function createNewConversation() {
    const title = `Nouvelle conversation ${new Date().toLocaleDateString('fr-FR')}`;
    const { data, error } = await supabase
      .from("conversations")
      .insert({
        title: title,
        user_id: "rebecca"
      })
      .select()
      .single();
    
    if (!error && data) {
      setConversations(prev => [data, ...prev]);
      setFilteredConversations(prev => [data, ...prev]);
      setCurrentConversationId(data.id);
      setMessages([{ role: "assistant", content: "Bonjour Rebecca. Que veux-tu qu'on attaque aujourd'hui ?" }]);
      if (isMobile) setIsSidebarOpen(false);
    }
  }

  async function updateConversationTitle(id: string, newTitle: string) {
    if (!newTitle.trim()) return;
    
    const { error } = await supabase
      .from("conversations")
      .update({ title: newTitle })
      .eq("id", id);
    
    if (!error) {
      setConversations(prev => 
        prev.map(conv => conv.id === id ? { ...conv, title: newTitle } : conv)
      );
      setFilteredConversations(prev => 
        prev.map(conv => conv.id === id ? { ...conv, title: newTitle } : conv)
      );
    }
    setEditingTitleId(null);
    setEditingTitle("");
  }

  async function deleteConversation(id: string) {
    if (confirm("Supprimer cette conversation ?")) {
      const { error } = await supabase.from("conversations").delete().eq("id", id);
      if (!error) {
        const newConversations = conversations.filter(c => c.id !== id);
        setConversations(newConversations);
        setFilteredConversations(newConversations);
        if (newConversations.length > 0) {
          setCurrentConversationId(newConversations[0].id);
        } else {
          createNewConversation();
        }
      }
    }
  }

  async function saveMessage(conversationId: string, role: string, content: string, files?: any[]) {
    const messageData = files ? { content, files } : { content };
    await supabase.from("conversation_messages").insert({
      conversation_id: conversationId,
      role: role,
      content: JSON.stringify(messageData)
    });
    
    await supabase
      .from("conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversationId);
  }

  const sendRegularMessage = async (allMessages: any[]) => {
    const response = await fetch(`${API_URL}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: allMessages }),
    });
    
    if (!response.ok) throw new Error(`Erreur ${response.status}`);
    
    const data = await response.json();
    return data.reply;
  };

  const handleExecuteMode = async (userMessageContent: string) => {
    try {
      const analysisRes = await fetch(`${API_URL}/api/execute/analyze-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: userMessageContent })
      });
      const analysis = await analysisRes.json();
      
      if (analysis.success && analysis.execution_plan) {
        const plan = analysis.execution_plan;
        
        let responseText = `🎯 **Mode Exécution activé**\n\n`;
        responseText += `**${plan.title}**\n\n`;
        
        if (plan.steps && plan.steps.length > 0) {
          responseText += `**📋 Plan d'action :**\n`;
          plan.steps.forEach((step: string, i: number) => {
            responseText += `${i + 1}. ${step}\n`;
          });
          responseText += `\n`;
        }
        
        if (plan.type === "checklist" || (plan.steps && plan.steps.length > 0)) {
          const checklistRes = await fetch(`${API_URL}/api/execute/create-checklist`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: plan.title,
              steps: plan.steps || plan.suggested_tasks?.map((t: any) => t.title) || []
            })
          });
          const checklist = await checklistRes.json();
          if (checklist.success) {
            responseText += `✅ **Checklist créée** - Tu peux suivre ta progression\n\n`;
          }
        }
        
        if (plan.suggested_tasks && plan.suggested_tasks.length > 0) {
          responseText += `**📝 Tâches créées automatiquement :**\n`;
          for (const task of plan.suggested_tasks) {
            await fetch(`${API_URL}/api/execute/create-task`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                title: task.title,
                priority: task.priority || "normal",
                due_date: null
              })
            });
            responseText += `- ${task.title}\n`;
          }
          responseText += `\n`;
        }
        
        if (plan.type === "email" || plan.type === "document") {
          const draftRes = await fetch(`${API_URL}/api/execute/create-draft`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: plan.type,
              context: userMessageContent
            })
          });
          const draft = await draftRes.json();
          if (draft.success && draft.draft) {
            responseText += `**✏️ Brouillon généré :**\n\n`;
            responseText += `\`\`\`\n${draft.draft.content}\n\`\`\`\n\n`;
            responseText += `*Copie et colle ce contenu ou demande-moi de le modifier.*\n\n`;
          }
        }
        
        if (plan.next_action) {
          responseText += `**⚡ Prochaine action :** ${plan.next_action}\n\n`;
        }
        
        responseText += `\n---\n💡 *Ce plan a été généré automatiquement. Dis-moi quand tu avances ou si tu veux ajuster quelque chose.*`;
        
        return responseText;
      }
    } catch (error) {
      console.error("Erreur execute mode:", error);
    }
    return null;
  };

  const sendMessage = async () => {
    if (isSending || (!input.trim() && uploadedFiles.length === 0) || isLoading || !currentConversationId) return;
    
    setIsSending(true);
    setAvatarState("thinking");
    
    const uploadedFilesData = await uploadFilesToStorage();
    
    let userMessageContent = input.trim() || "📎 Fichier(s) joint(s)";
    
    const imageFiles = uploadedFilesData.filter(f => f.type.startsWith('image/'));
    const otherFiles = uploadedFilesData.filter(f => !f.type.startsWith('image/'));
    
    if (imageFiles.length > 0) {
      userMessageContent += "\n\n" + imageFiles.map(f => f.url).join("\n\n");
    }
    if (otherFiles.length > 0) {
      userMessageContent += "\n\n📎 Fichiers joints:\n" + otherFiles.map(f => `- **${f.name}** : ${f.url}`).join("\n");
    }
    
    const userMessage: Message = { 
      role: "user", 
      content: userMessageContent,
      files: uploadedFilesData.length > 0 ? uploadedFilesData : undefined
    };
    
    const currentModeConfig = modes.find(m => m.id === selectedMode);
    const systemPrompt = currentModeConfig?.prompt || modes[0].prompt;
    
    const allMessages = [
      { role: "system", content: systemPrompt },
      ...messages.map(msg => ({ role: msg.role, content: msg.content })),
      { role: "user", content: userMessageContent }
    ];
    
    setMessages(prev => [...prev, userMessage]);
    await saveMessage(currentConversationId, "user", userMessageContent, uploadedFilesData);
    setInput("");
    setUploadedFiles([]);
    setIsLoading(true);
    resetTranscript();

    try {
      let assistantContent: string;
      
      if (selectedMode === "fais-le-avec-moi") {
        const executeResult = await handleExecuteMode(userMessageContent);
        assistantContent = executeResult || await sendRegularMessage(allMessages);
      } else {
        assistantContent = await sendRegularMessage(allMessages);
      }
      
      setAvatarState("speaking");
      setLastAssistantMessage(assistantContent);
      
      if (speechSupported && assistantContent.length < 500) {
        speak({ text: assistantContent, rate: 0.9 });
      }
      
      setMessages(prev => [...prev, { role: "assistant", content: assistantContent }]);
      await saveMessage(currentConversationId, "assistant", assistantContent);
      fetchConversations();
      inputRef.current?.focus();
      
      setTimeout(() => setAvatarState("idle"), 3000);
    } catch (error) {
      console.error("Erreur:", error);
      setMessages(prev => [...prev, { role: "assistant", content: "Erreur de connexion. Vérifie que le backend est bien démarré." }]);
      setAvatarState("idle");
    } finally {
      setIsLoading(false);
      setIsSending(false);
    }
  };

  const startVoiceRecording = () => {
    resetTranscript();
    SpeechRecognition.startListening({ continuous: true, language: 'fr-FR' });
    setIsRecording(true);
    setAvatarState("listening");
  };

  const stopVoiceRecording = () => {
    SpeechRecognition.stopListening();
    setIsRecording(false);
    setAvatarState("idle");
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
      sendMessage();
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

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMins = Math.floor((now.getTime() - date.getTime()) / 60000);
    if (diffMins < 1) return "À l'instant";
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffMins < 1440) return `Il y a ${Math.floor(diffMins / 60)} h`;
    if (diffMins < 10080) return `Il y a ${Math.floor(diffMins / 1440)} jours`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  const startEditTitle = (conv: Conversation) => {
    setEditingTitleId(conv.id);
    setEditingTitle(conv.title);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !isRecording && !isVoiceLocked && !isSending) {
      e.preventDefault();
      sendMessage();
    }
  };

  const currentModeConfig = modes.find(m => m.id === selectedMode);
  const CurrentIcon = currentModeConfig?.icon;

  return (
    <div className="fixed inset-0 bg-midnight flex flex-col">
      {/* HEADER */}
      <header className="sticky top-0 z-10 h-14 border-b border-white/10 flex items-center justify-between px-4 bg-midnight/90 backdrop-blur-lg shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 text-gray-400 hover:text-gold-500 transition-colors rounded-lg hover:bg-white/5"
            title="Historique des conversations"
          >
            <Menu className="w-5 h-5" />
          </button>
          <button
            onClick={createNewConversation}
            className="p-2 text-gray-400 hover:text-gold-500 transition-colors rounded-lg hover:bg-white/5 lg:hidden"
            title="Nouvelle conversation"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex items-center gap-3">
          <SovereignAvatar 
            state={avatarState} 
            size="sm"
            lastMessage={lastAssistantMessage}
            onSpeak={() => speak({ text: lastAssistantMessage, rate: 0.9 })}
            isSpeaking={speaking}
          />
          <div className="text-left hidden sm:block">
            <h1 className="text-sm font-serif text-gold-500">Becks</h1>
            <p className="text-[9px] text-gray-500">Sovereign Life Agent</p>
          </div>
        </div>
        
        <Link href="/" className="p-2 text-gray-400 hover:text-gold-500 transition-colors rounded-lg hover:bg-white/5">
          <ArrowLeft className="w-5 h-5" />
        </Link>
      </header>

      {/* SIDEBAR CONVERSATIONS */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40"
            />
            <motion.aside className="fixed inset-y-0 left-0 w-80 bg-midnight z-50 border-r border-white/10 flex flex-col">
              <div className="p-4 border-b border-white/10 flex justify-between items-center">
                <h2 className="text-sm font-serif text-gold-500">Conversations</h2>
                <button onClick={() => setIsSidebarOpen(false)} className="p-1 text-gray-500 hover:text-gold-500">
                  <ChevronLeft className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-4">
                <button
                  onClick={createNewConversation}
                  className="w-full flex items-center justify-center gap-2 bg-gold-500/20 hover:bg-gold-500/30 text-gold-500 py-2 rounded-xl transition-colors text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Nouvelle conversation
                </button>
              </div>
              
              <div className="px-4 pb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Rechercher..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-gold-500 text-ivory"
                  />
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
                {filteredConversations.map(conv => (
                  <div key={conv.id} className={`group p-3 rounded-xl cursor-pointer ${currentConversationId === conv.id ? "bg-gold-500/10 border border-gold-500/30" : "hover:bg-white/5"}`}>
                    <div className="flex justify-between items-center">
                      <div onClick={() => setCurrentConversationId(conv.id)} className="flex-1">
                        {editingTitleId === conv.id ? (
                          <div className="flex items-center gap-2">
                            <input type="text" value={editingTitle} onChange={(e) => setEditingTitle(e.target.value)} className="flex-1 bg-white/10 border border-gold-500 rounded-md px-2 py-1 text-sm" autoFocus onKeyDown={(e) => { if (e.key === 'Enter') updateConversationTitle(conv.id, editingTitle); if (e.key === 'Escape') setEditingTitleId(null); }} />
                            <button onClick={() => updateConversationTitle(conv.id, editingTitle)}><Check className="w-3 h-3 text-emerald-400" /></button>
                            <button onClick={() => setEditingTitleId(null)}><X className="w-3 h-3 text-red-400" /></button>
                          </div>
                        ) : (
                          <>
                            <p className="text-sm truncate">{conv.title}</p>
                            <p className="text-xs text-gray-500 mt-1">{formatDate(conv.updated_at)}</p>
                          </>
                        )}
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                        <button onClick={() => startEditTitle(conv)}><Edit2 className="w-3 h-3 text-gray-500" /></button>
                        <button onClick={() => deleteConversation(conv.id)}><Trash2 className="w-3 h-3 text-gray-500" /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ZONE DES MESSAGES */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] p-4 rounded-2xl text-sm ${m.role === "user" ? "bg-gold-500 text-midnight rounded-br-none" : "bg-white/10 text-ivory border border-white/5 rounded-bl-none"}`}>
              <ReactMarkdown
                components={{
                  img: ({ ...props }) => (
                    <img {...props} className="rounded-xl max-w-full max-h-96 object-contain my-2 border border-white/10" loading="lazy" />
                  ),
                  a: ({ href, children, ...props }) => {
                    const isImage = href?.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                    if (isImage) {
                      return <img src={href} alt={String(children)} className="rounded-xl max-w-full max-h-96 object-contain my-2 border border-white/10" loading="lazy" />;
                    }
                    return <a href={href} target="_blank" rel="noopener noreferrer" className="text-gold-500 hover:underline" {...props}>{children}</a>;
                  },
                }}
              >
                {m.content}
              </ReactMarkdown>
              
              {m.files && m.files.length > 0 && (
                <div className="mt-3">
                  <div className="grid grid-cols-2 gap-2">
                    {m.files.filter(f => f.type.startsWith('image/')).map((file, idx) => (
                      <a key={idx} href={file.url} target="_blank" rel="noopener noreferrer" className="block">
                        <img src={file.url} alt={file.name} className="rounded-xl w-full h-auto max-h-48 object-cover border border-white/10 hover:border-gold-500 transition-all" />
                      </a>
                    ))}
                  </div>
                  {m.files.filter(f => !f.type.startsWith('image/')).length > 0 && (
                    <div className="mt-2 pt-2 border-t border-white/10">
                      {m.files.filter(f => !f.type.startsWith('image/')).map((file, idx) => (
                        <a key={idx} href={file.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs text-gold-500 hover:underline mt-1">
                          <File className="w-3 h-3" /> {file.name}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white/10 p-4 rounded-2xl">
              <Loader2 className="w-4 h-4 text-gold-500 animate-spin" />
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* BARRE DE SAISIE AVEC SÉLECTEUR DE MODES */}
      <div className="shrink-0 border-t border-white/10 bg-midnight/90 backdrop-blur-lg p-3">
        {/* SÉLECTEUR DE MODES */}
        <div className="relative mb-2">
          <button
            onClick={() => setIsModeSelectorOpen(!isModeSelectorOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs transition-colors hover:bg-white/5"
          >
            {CurrentIcon && <CurrentIcon className={`w-3.5 h-3.5 ${currentModeConfig?.color}`} />}
            <span className="text-gray-400">{currentModeConfig?.name}</span>
            <span className="text-[10px] text-gray-600 hidden sm:inline">{currentModeConfig?.description}</span>
            <ChevronDown className={`w-3 h-3 text-gray-500 transition-transform ${isModeSelectorOpen ? "rotate-180" : ""}`} />
          </button>
          
          {isModeSelectorOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsModeSelectorOpen(false)} />
              <div className="absolute bottom-full left-0 mb-2 w-64 bg-midnight border border-white/10 rounded-xl shadow-xl z-50 py-2 max-h-80 overflow-y-auto">
                {modes.map((mode) => {
                  const Icon = mode.icon;
                  return (
                    <button
                      key={mode.id}
                      onClick={() => {
                        setSelectedMode(mode.id);
                        setIsModeSelectorOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-white/5 transition-colors ${selectedMode === mode.id ? mode.bg : ""}`}
                    >
                      <Icon className={`w-4 h-4 ${mode.color}`} />
                      <div className="flex-1 text-left">
                        <p className="text-gray-300 text-sm">{mode.name}</p>
                        <p className="text-[10px] text-gray-500">{mode.description}</p>
                      </div>
                      {selectedMode === mode.id && <Check className="w-3.5 h-3.5 text-gold-500" />}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

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
            {isVoiceLocked ? "🔒 Enregistrement vocal en cours... recliquez pour arrêter" : "🎤 Parlez... relâchez pour arrêter"}
          </div>
        )}
        
        {/* Barre de saisie principale */}
        <div className="flex items-center gap-2">
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
          
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isRecording || isVoiceLocked ? "🎤 Enregistrement vocal..." : `Mode ${currentModeConfig?.name} : écris ton message...`}
            className="flex-1 bg-white/10 border border-white/20 rounded-full py-3 px-4 text-sm focus:outline-none focus:border-gold-500 text-ivory placeholder:text-gray-500"
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
            disabled={(!input.trim() && uploadedFiles.length === 0 && !isRecording && !isVoiceLocked) || isLoading || isSending}
            className={`p-2 rounded-full transition-all flex-shrink-0 ${
              isRecording || isVoiceLocked
                ? "bg-red-500 text-white animate-pulse"
                : "bg-gold-500 text-midnight hover:scale-105"
            } disabled:opacity-50 disabled:hover:scale-100`}
            title={isRecording || isVoiceLocked ? "Enregistrement vocal" : "Envoyer (appui long pour dicter)"}
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
        
        {/* Indicateur de mode exécution */}
        {selectedMode === "fais-le-avec-moi" && (
          <div className="mt-2 text-center">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-gold-500/20 text-gold-400">
              <Sparkles className="w-3 h-3" />
              Mode Exécution activé - Je transforme tes demandes en actions
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
