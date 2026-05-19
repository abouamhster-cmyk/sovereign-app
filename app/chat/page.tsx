"use client";
import "regenerator-runtime/runtime";
import { useState, useRef, useEffect } from "react";
import { useUserId } from "@/hooks/useUserId";
import { useVoiceConversation } from "@/hooks/useVoiceConversation";
import { ExecutionGuide } from "@/components/ExecutionGuide";
import { ReadyToSend } from "@/components/ReadyToSend";
import { DecisionMode } from "@/components/DecisionMode";
import ReactMarkdown from 'react-markdown';
import { 
  Send, ArrowLeft, Plus, Trash2, ChevronLeft, ChevronRight, 
  Search, Edit2, Check, X, Loader2, Menu, Mic, Paperclip, 
  File, XCircle, Heart, Zap, Trophy, Baby, DollarSign, 
  FileText, Crown, ChevronDown, Sparkles, Volume2, VolumeX,
  Image as ImageIcon, Video, Music, Phone, MessageCircle, Clock, MapPin, Calendar, Mail, ListTodo
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useDropzone } from "react-dropzone";
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";
import { useTextToSpeech, VOICE_OPTIONS } from "@/hooks/useTextToSpeech";
import { MessageWithActions, type Action } from "@/components/MessageWithActions";

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
  actions?: {
    type: string;
    params: any;
    label: string;
  }[];
  files?: { name: string; url: string; type: string }[];
  created_at?: string;
};

// =====================================================
// MODES DE CONVERSATION (version raccourcie pour build)
// =====================================================
const modes = [
  { id: "parle-moi", name: "Parle-moi", icon: Heart, color: "text-pink-400", bg: "bg-pink-500/10", description: "Soutien émotionnel, écoute",
    prompt: `Tu es Becks, la confidente proche de Rebecca. Tu réponds avec douceur et présence.` },
  { id: "fais-le-avec-moi", name: "Fais-le avec moi", icon: Zap, color: "text-yellow-400", bg: "bg-yellow-500/10", description: "Exécution guidée étape par étape",
    prompt: `Tu es Becks en mode exécution guidée. Tu aides Rebecca à avancer étape par étape.` },
  { id: "love-fire-sport", name: "Love & Fire Sport", icon: Trophy, color: "text-emerald-400", bg: "bg-emerald-500/10", description: "Grants, DDA",
    prompt: `Tu es Becks en mode Love & Fire Sport. Tu aides Rebecca sur les grants et contrats.` },
  { id: "mes-enfants", name: "Mes enfants", icon: Baby, color: "text-blue-400", bg: "bg-blue-500/10", description: "Famille",
    prompt: `Tu es Becks en mode famille. Tu aides Rebecca avec ses enfants.` },
  { id: "business-argent", name: "Business & Argent", icon: DollarSign, color: "text-emerald-400", bg: "bg-emerald-500/10", description: "Opportunités",
    prompt: `Tu es Becks en mode Business & Argent.` },
  { id: "documents", name: "Documents", icon: FileText, color: "text-orange-400", bg: "bg-orange-500/10", description: "Lecture, rédaction",
    prompt: `Tu es Becks en mode Documents.` },
  {
    id: "sovereign-mode",
    name: "Sovereign Mode",
    icon: Crown,
    color: "text-gold-500",
    bg: "bg-gold-500/10",
    description: "Vision, décisions, leadership",
    prompt: `Tu es Becks en Sovereign Mode.`
  }
];

// =====================================================
// COMPOSANT PRINCIPAL
// =====================================================
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
  const [selectedMode, setSelectedMode] = useState<string>("parle-moi");
  const [isModeSelectorOpen, setIsModeSelectorOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isVoiceLocked, setIsVoiceLocked] = useState(false);
  const [pressTimer, setPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [pressStartTime, setPressStartTime] = useState(0);

  const [executionPlan, setExecutionPlan] = useState<{ planId: string; plan: any } | null>(null);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  
  const [lastAssistantMessage, setLastAssistantMessage] = useState("");
  const { speak, stop, isSpeaking, isLoading: isTTSLoading, selectedVoice, setSelectedVoice } = useTextToSpeech();
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { transcript, resetTranscript } = useSpeechRecognition();

  const [showChecklistModal, setShowChecklistModal] = useState(false);
  const [currentChecklist, setCurrentChecklist] = useState<{ title: string; steps: string[] } | null>(null);
  const [showDraftModal, setShowDraftModal] = useState(false);
  const [currentDraft, setCurrentDraft] = useState<{ content: string; type: string } | null>(null);
  const [showDataModal, setShowDataModal] = useState(false);
  const [currentData, setCurrentData] = useState<{ title: string; content: string } | null>(null);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [currentWhatsApp, setCurrentWhatsApp] = useState<{ to: string; original_message: string } | null>(null);
  const [customReply, setCustomReply] = useState("");
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [currentReplyTo, setCurrentReplyTo] = useState("");
  const [replyMessage, setReplyMessage] = useState("");

  const { 
    isActive: isVoiceActive, 
    isListening: isVoiceListening, 
    isSpeaking: isVoiceSpeaking,
    activate: activateVoice,
    deactivate: deactivateVoice,
    triggerManual: triggerVoiceManual,
    speak: speakVoice
  } = useVoiceConversation({
    onUserSpeech: (text) => {
      setInput(text);
      setTimeout(() => {
        if (text.trim() && !isSending && !isLoading) {
          sendMessage();
        }
      }, 500);
    },
    isProcessing: isLoading || isSending,
    lastResponse: lastAssistantMessage,
    wakeWords: ["hey becks", "dis becks", "becks", "sovereign", "hey sovereign"],
    autoListenAfterResponse: true,
    silenceTimeout: 2000
  });

  const { userId, loading: userIdLoading } = useUserId();

  // ========== RAPPORT MATINAL ==========
  const [morningReportSentToday, setMorningReportSentToday] = useState(false);

  const checkAndSendMorningReport = async () => {
    if (!currentConversationId) return false;
    if (morningReportSentToday) return false;
    
    try {
      const response = await fetch(`${API_URL}/api/morning-greeting?user_id=${userId}`);
      const data = await response.json();
      
      if (data.success && data.message && !data.already_sent) {
        const reportMessage: Message = { role: "assistant", content: data.message };
        setMessages(prev => [reportMessage, ...prev]);
        await saveMessage(currentConversationId, "assistant", data.message);
        setMorningReportSentToday(true);
        return true;
      } else if (data.already_sent) {
        setMorningReportSentToday(true);
      }
    } catch (error) {
      console.error("Erreur rapport matinal:", error);
    }
    return false;
  };

  // ========== EFFETS ==========
  useEffect(() => {
    if (transcript) { setInput(prev => prev + " " + transcript); resetTranscript(); }
  }, [transcript, resetTranscript]);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => { 
    if (userId) fetchConversations();
  }, [userId]);  
  
  useEffect(() => { 
    if (currentConversationId) fetchMessages(currentConversationId); 
  }, [currentConversationId]);
  
  useEffect(() => {
    if (searchTerm.trim() === "") setFilteredConversations(conversations);
    else setFilteredConversations(conversations.filter(conv => conv.title.toLowerCase().includes(searchTerm.toLowerCase())));
  }, [searchTerm, conversations]);
  
  useEffect(() => { 
    if (messagesEndRef.current) messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" }); 
  }, [messages]);
  
  useEffect(() => { 
    if (isMobile && currentConversationId) setIsSidebarOpen(false); 
  }, [currentConversationId, isMobile]);
  
  useEffect(() => { 
    return () => { if (pressTimer) clearTimeout(pressTimer); }; 
  }, [pressTimer]);

  // ========== FICHIERS ==========
  const onDrop = (acceptedFiles: File[]) => setUploadedFiles(prev => [...prev, ...acceptedFiles]);
  const { getInputProps } = useDropzone({ 
    onDrop, 
    accept: { 
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'], 
      'application/pdf': ['.pdf'], 
      'text/plain': ['.txt'] 
    }, 
    maxSize: 10 * 1024 * 1024, 
    noClick: true, 
    noKeyboard: true 
  });
  const removeFile = (index: number) => setUploadedFiles(prev => prev.filter((_, i) => i !== index));

  async function uploadFilesToStorage() {
    if (uploadedFiles.length === 0 || !currentConversationId) return [];
    const uploaded = [];
    for (const file of uploadedFiles) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `chat/${currentConversationId}/${fileName}`;
      const { error: uploadError } = await supabase.storage.from('chat-files').upload(filePath, file);
      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage.from('chat-files').getPublicUrl(filePath);
        uploaded.push({ name: file.name, url: publicUrl, type: file.type });
      }
    }
    return uploaded;
  }

  // ========== CONVERSATIONS ==========
  async function fetchConversations() {
    if (!userId) return;  
    const { data } = await supabase
      .from("conversations")
      .select("*")
      .eq("user_id", userId)   
      .order("updated_at", { ascending: false });
    setConversations(data || []);
    setFilteredConversations(data || []);
    if (!data || data.length === 0) createNewConversation();
    else if (!currentConversationId) setCurrentConversationId(data[0].id);
  }

  async function fetchMessages(conversationId: string) {
    const { data, error } = await supabase
      .from("conversation_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });
    if (error) { 
      console.error("❌ Erreur fetchMessages:", error); 
      return; 
    }
    if (data && data.length > 0) {
      const parsedMessages = data.map(msg => {
        try {
          const parsed = JSON.parse(msg.content);
          return { 
            id: msg.id, 
            role: msg.role, 
            content: parsed.content || msg.content, 
            actions: parsed.actions, 
            files: Array.isArray(parsed.files) ? parsed.files : [], 
            created_at: msg.created_at 
          };
        } catch (e) {
          return { id: msg.id, role: msg.role, content: msg.content, files: [], created_at: msg.created_at };
        }
      });
      setMessages(parsedMessages);
    } else if (messages.length === 0) {
      try {
        const response = await fetch(`${API_URL}/api/morning-greeting?user_id=${userId}`);
        const data = await response.json();
        if (data.success && data.message) {
          setMessages([{ role: "assistant", content: data.message }]);
          if (!data.already_sent) setMorningReportSentToday(true);
        } else {
          setMessages([{ role: "assistant", content: "Coucou Rebecca 😌 Je suis là. Raconte-moi…" }]);
        }
      } catch (error) {
        setMessages([{ role: "assistant", content: "Coucou Rebecca 😌 Je suis là." }]);
      }
    }
  }

  async function createNewConversation() {
    if (!userId) return;
    const title = "Nouvelle conversation...";
    const { data, error } = await supabase
      .from("conversations")
      .insert({ title, user_id: userId })
      .select()
      .single();
    if (!error && data) {
      setConversations(prev => [data, ...prev]);
      setFilteredConversations(prev => [data, ...prev]);
      setCurrentConversationId(data.id);
      setMessages([{ role: "assistant", content: "Coucou Rebecca 😌 Je suis là." }]);
      await saveMessage(data.id, "assistant", "Coucou Rebecca 😌 Je suis là.");
      if (isMobile) setIsSidebarOpen(false);
    }
  }

  async function updateConversationTitleAfterFirstMessage(conversationId: string, userMessage: string) {
    try {
      const response = await fetch(`${API_URL}/api/chat/generate-title`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ first_message: userMessage })
      });
      const data = await response.json();
      if (data.success && data.title && data.title !== "Nouvelle conversation...") {
        await supabase
          .from("conversations")
          .update({ title: data.title })
          .eq("id", conversationId);
        setConversations(prev => 
          prev.map(conv => conv.id === conversationId ? { ...conv, title: data.title } : conv)
        );
        setFilteredConversations(prev => 
          prev.map(conv => conv.id === conversationId ? { ...conv, title: data.title } : conv)
        );
      }
    } catch (error) {
      console.error("Erreur mise à jour titre:", error);
    }
  }
  
  async function updateConversationTitle(id: string, newTitle: string) {
    if (!newTitle.trim()) return;
    await supabase.from("conversations").update({ title: newTitle }).eq("id", id);
    setConversations(prev => prev.map(conv => conv.id === id ? { ...conv, title: newTitle } : conv));
    setFilteredConversations(prev => prev.map(conv => conv.id === id ? { ...conv, title: newTitle } : conv));
    setEditingTitleId(null);
    setEditingTitle("");
  }

  async function deleteConversation(id: string) {
    if (confirm("Supprimer cette conversation ?")) {
      await supabase.from("conversations").delete().eq("id", id);
      const newConversations = conversations.filter(c => c.id !== id);
      setConversations(newConversations);
      setFilteredConversations(newConversations);
      if (newConversations.length > 0) setCurrentConversationId(newConversations[0].id);
      else createNewConversation();
    }
  }

  async function saveMessage(conversationId: string, role: string, content: string, actions?: any[], files?: any[]) {
    const messageData: any = { content };
    if (actions && actions.length > 0) messageData.actions = actions;
    if (files && files.length > 0) messageData.files = files;
    await supabase.from("conversation_messages").insert({ 
      conversation_id: conversationId, 
      role, 
      content: JSON.stringify(messageData) 
    });
    await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId);
  }

  // ========== EXÉCUTION ==========
  async function generateExecutionPlan(query: string) {
    setIsGeneratingPlan(true);
    try {
      const response = await fetch(`${API_URL}/api/execute/step-by-step`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, user_id: userId })
      });
      const data = await response.json();
      if (data.success && data.plan) {
        setExecutionPlan({ planId: data.plan_id, plan: data.plan });
        return true;
      } else if (data.fallback) {
        setExecutionPlan({
          planId: "fallback-" + Date.now(),
          plan: {
            title: "Plan simple",
            estimated_duration: "15 minutes",
            steps: [
              { description: "Identifier l'action la plus importante", action_type: "decision", estimated_minutes: 2 },
              { description: "La faire maintenant", action_type: "task", estimated_minutes: 10 },
              { description: "Célébrer cette petite victoire", action_type: "celebrate", estimated_minutes: 1 }
            ],
            success_criteria: "Avoir avancé sur une chose importante",
            next_steps_hint: "Continue sur cette lancée"
          }
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error("Erreur génération plan:", error);
      return false;
    } finally {
      setIsGeneratingPlan(false);
    }
  }

  const sendRegularMessage = async (allMessages: any[]) => {
    const response = await fetch(`${API_URL}/chat`, { 
      method: "POST", 
      headers: { "Content-Type": "application/json" }, 
      body: JSON.stringify({ messages: allMessages, user_id: userId }) 
    });
    if (!response.ok) throw new Error(`Erreur ${response.status}`);
    const data = await response.json();
    return data.reply;
  };

  const sendMessage = async () => {
    if (isSending || (!input.trim() && uploadedFiles.length === 0) || isLoading || !currentConversationId) return;
    
    await checkAndSendMorningReport();
    
    setIsSending(true);
    setIsLoading(true);
    
    const uploadedFilesData = await uploadFilesToStorage();
    let userMessageContent = input.trim() || "📎 Fichier(s) joint(s)";
    const imageFiles = uploadedFilesData.filter(f => f.type.startsWith('image/'));
    const otherFiles = uploadedFilesData.filter(f => !f.type.startsWith('image/'));
    if (imageFiles.length > 0) userMessageContent += "\n\n" + imageFiles.map(f => f.url).join("\n\n");
    if (otherFiles.length > 0) userMessageContent += "\n\n📎 Fichiers joints:\n" + otherFiles.map(f => `- **${f.name}** : ${f.url}`).join("\n");
    
    const userMessage: Message = { 
      role: "user", 
      content: userMessageContent, 
      files: uploadedFilesData.length > 0 ? uploadedFilesData : undefined 
    };
    const currentModeConfig = modes.find(m => m.id === selectedMode);
    const enhancedModePrompt = currentModeConfig?.prompt || modes[0].prompt;
    
    const allMessages = [
      { role: "system", content: enhancedModePrompt }, 
      ...messages.map(msg => ({ role: msg.role, content: msg.content })), 
      { role: "user", content: userMessageContent }
    ];
    
    setMessages(prev => [...prev, userMessage]);
    await saveMessage(currentConversationId, "user", userMessageContent, undefined, uploadedFilesData);

    const { data: existingMessages } = await supabase
      .from("conversation_messages")
      .select("id", { count: "exact", head: true })
      .eq("conversation_id", currentConversationId);

    if (existingMessages?.length === 1) {
      await updateConversationTitleAfterFirstMessage(currentConversationId, userMessageContent);
    }
    
    setInput("");
    setUploadedFiles([]);
    resetTranscript();

    try {
      let assistantContent = await sendRegularMessage(allMessages);
      const assistantMessage: Message = { role: "assistant", content: assistantContent };
      setMessages(prev => [...prev, assistantMessage]);
      await saveMessage(currentConversationId, "assistant", assistantContent);

      setLastAssistantMessage(assistantContent);
      if (selectedMode !== "fais-le-avec-moi" && 
          !assistantContent.includes("🎯 Je vais t'aider") && 
          assistantContent.length < 500) {
        speak(assistantContent);
      }
      
      if (selectedMode === "fais-le-avec-moi" && userMessageContent.length > 10 && userMessageContent.length < 500) {
        const hasPlan = await generateExecutionPlan(userMessageContent);
        if (hasPlan && executionPlan) {
          const guideMessageContent = `🎯 Je vais t'aider à avancer étape par étape.\n\n**Plan : ${executionPlan.plan.title}**\n*Durée estimée : ${executionPlan.plan.estimated_duration}*\n\nCoche les étapes au fur et à mesure. Une chose à la fois. ✨`;
          const guideMessage: Message = { role: "assistant", content: guideMessageContent };
          setMessages(prev => [...prev, guideMessage]);
          await saveMessage(currentConversationId, "assistant", guideMessageContent);
        }
      }
      
      await fetchConversations();
      inputRef.current?.focus();
    } catch (error) {
      console.error("❌ Erreur:", error);
      setMessages(prev => [...prev, { role: "assistant", content: "❌ Erreur de connexion." }]);
    } finally {
      setIsLoading(false);
      setIsSending(false);
    }
  };

  // ========== FONCTIONS VOCALES ==========
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
      if (pressDuration >= 3000 && pressDuration < 10000) startVoiceRecording();
      else if (pressDuration >= 10000) { startVoiceRecording(); setIsVoiceLocked(true); }
    }, 3000);
    setPressTimer(timer);
  };
  
  const handleSendButtonMouseUp = () => {
    const pressDuration = Date.now() - pressStartTime;
    if (pressTimer) clearTimeout(pressTimer);
    if (pressDuration < 3000) {
      if (isVoiceLocked) { setIsVoiceLocked(false); stopVoiceRecording(); }
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
  
  // ========== UTILITAIRES ==========
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const diffMins = Math.floor((new Date().getTime() - date.getTime()) / 60000);
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
  const copyToClipboard = (text: string) => { 
    navigator.clipboard.writeText(text); 
    toast.success("📋 Copié !"); 
  };

  const executeAction = async (type: string, params: any) => {
    if (type === "whatsapp_reply") {
      const recipient = params.to || params.conversation_id;
      if (!recipient) {
        toast.error("❌ Destinataire manquant");
        return;
      }
      const response = await fetch(`${API_URL}/api/whatsapp/reply`, { 
        method: "POST", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify({ to: recipient, message: params.message, message_id: params.message_id }) 
      });
      const result = await response.json();
      if (result.success) {
        toast.success(`✅ Réponse envoyée à ${recipient}`);
      } else {
        toast.error("❌ Erreur d'envoi");
      }
    }
  };

  const handlePlanComplete = () => {
    toast.success("🎉 Félicitations ! Plan accompli !");
    setExecutionPlan(null);
  };

  const handleClosePlan = () => {
    setExecutionPlan(null);
  };

  if (userIdLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 text-gold-500 animate-spin" />
      </div>
    );
  }

  // ========== RENDU ==========
  return (
    <div className="fixed inset-0 bg-midnight flex flex-col">
      <header className="sticky top-0 z-10 h-12 border-b border-white/10 flex items-center justify-between px-4 bg-midnight/90 backdrop-blur-lg shrink-0">
        <button onClick={() => setIsSidebarOpen(true)} className="p-1.5 text-gray-400 hover:text-gold-500">
          <Menu className="w-4 h-4" />
        </button>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (isVoiceActive) {
                deactivateVoice();
                toast.info("Mode mains libres désactivé");
              } else {
                activateVoice();
                toast.success("Mode mains libres activé - Dis 'Hey Becks'", { duration: 3000 });
              }
            }}
            className={`p-1.5 rounded-full transition-all ${
              isVoiceActive 
                ? "bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/50" 
                : "bg-white/10 text-gray-400 hover:bg-white/20"
            }`}
          >
            {isVoiceActive ? (
              <div className="relative">
                <Volume2 className="w-3.5 h-3.5" />
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              </div>
            ) : (
              <Mic className="w-3.5 h-3.5" />
            )}
          </button>

          <button
            onMouseDown={triggerVoiceManual}
            onTouchStart={triggerVoiceManual}
            className={`p-1.5 rounded-full transition-all ${
              isVoiceListening && !isVoiceActive
                ? "bg-red-500 text-white animate-pulse"
                : "bg-gold-500/20 text-gold-500 hover:bg-gold-500/30"
            }`}
          >
            {isVoiceListening ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mic className="w-3.5 h-3.5" />}
          </button>

          <select
            value={selectedVoice}
            onChange={(e) => setSelectedVoice(e.target.value)}
            className="text-[10px] bg-white/10 border border-white/10 rounded-full px-2 py-1 text-gray-400"
          >
            {VOICE_OPTIONS.map(voice => (
              <option key={voice.id} value={voice.id}>{voice.name} - {voice.description}</option>
            ))}
          </select>

          <button
            onClick={isSpeaking ? stop : () => speak(lastAssistantMessage)}
            disabled={isTTSLoading}
            className={`p-1.5 rounded-full transition-all ${
              (isSpeaking || isVoiceSpeaking)
                ? "bg-red-500/20 text-red-400 animate-pulse" 
                : "bg-gold-500/20 text-gold-500 hover:bg-gold-500/30"
            } disabled:opacity-50`}
          >
            {isTTSLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (isSpeaking || isVoiceSpeaking) ? (
              <VolumeX className="w-3.5 h-3.5" />
            ) : (
              <Volume2 className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
        
        <Link href="/" className="p-1.5 text-gray-400 hover:text-gold-500">
          <ArrowLeft className="w-4 h-4" />
        </Link>
      </header>

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
                <button onClick={createNewConversation} className="w-full flex items-center justify-center gap-2 bg-gold-500/20 hover:bg-gold-500/30 text-gold-500 py-2 rounded-xl transition-colors text-sm">
                  <Plus className="w-4 h-4" />Nouvelle conversation
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
                            <input 
                              type="text" 
                              value={editingTitle} 
                              onChange={(e) => setEditingTitle(e.target.value)} 
                              className="flex-1 bg-white/10 border border-gold-500 rounded-md px-2 py-1 text-sm" 
                              autoFocus 
                              onKeyDown={(e) => { 
                                if (e.key === 'Enter') updateConversationTitle(conv.id, editingTitle); 
                                if (e.key === 'Escape') setEditingTitleId(null); 
                              }} 
                            />
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

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            {m.role === "user" ? (
              <div className="max-w-[85%] p-4 rounded-2xl text-sm bg-gold-500 text-midnight rounded-br-none">
                <ReactMarkdown>{m.content}</ReactMarkdown>
                {m.files && Array.isArray(m.files) && m.files.length > 0 && (
                  <div className="mt-3">
                    <div className="grid grid-cols-2 gap-2">
                      {m.files.filter(f => f.type?.startsWith('image/')).map((file, idx) => (
                        <a key={idx} href={file.url} target="_blank" rel="noopener noreferrer" className="block">
                          <img src={file.url} alt={file.name} className="rounded-xl w-full h-auto max-h-48 object-cover border border-white/10 hover:border-gold-500 transition-all" />
                        </a>
                      ))}
                    </div>
                    {m.files.filter(f => !f.type?.startsWith('image/')).length > 0 && (
                      <div className="mt-2 pt-2 border-t border-white/10">
                        {m.files.filter(f => !f.type?.startsWith('image/')).map((file, idx) => (
                          <a key={idx} href={file.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs text-gold-500 hover:underline mt-1">
                            <File className="w-3 h-3" /> {file.name}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="max-w-[85%] p-4 rounded-2xl text-sm bg-white/10 text-ivory border border-white/5 rounded-bl-none">
                <MessageWithActions content={m.content} actions={m.actions} onActionComplete={() => {}} />
              </div>
            )}
          </motion.div>
        ))}
        
        {executionPlan && (
          <div className="flex justify-start">
            <div className="max-w-[85%] w-full">
              <ExecutionGuide 
                planId={executionPlan.planId}
                plan={executionPlan.plan}
                onComplete={handlePlanComplete}
                onClose={handleClosePlan}
              />
            </div>
          </div>
        )}
        
        {selectedMode === "documents" && (
          <div className="flex justify-start mt-4">
            <div className="max-w-[85%] w-full">
              <ReadyToSend onInsert={(text) => setInput(prev => prev + "\n\n" + text)} />
            </div>
          </div>
        )}
        
        {selectedMode === "sovereign-mode" && (
          <div className="flex justify-start mt-4">
            <div className="max-w-[85%] w-full">
              <DecisionMode onInsert={(text) => setInput(prev => prev + "\n\n" + text)} />
            </div>
          </div>
        )}
        
        {selectedMode === "business-argent" && (
          <div className="flex justify-start mt-4">
            <div className="bg-gold-500/10 border border-gold-500/20 rounded-xl p-4 max-w-[85%] w-full">
              <p className="text-xs text-gold-500 mb-2">💡 Actions rapides :</p>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setInput(prev => prev + " Prépare un email de prospection")} className="text-xs px-3 py-1.5 bg-white/10 rounded-full hover:bg-white/20">📧 Email pro</button>
                <button onClick={() => setInput(prev => prev + " Compare ces deux opportunités")} className="text-xs px-3 py-1.5 bg-white/10 rounded-full hover:bg-white/20">⚖️ Comparer</button>
                <button onClick={() => setInput(prev => prev + " Analyse cette opportunité")} className="text-xs px-3 py-1.5 bg-white/10 rounded-full hover:bg-white/20">🔍 Analyser</button>
              </div>
            </div>
          </div>
        )}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white/10 p-4 rounded-2xl">
              <Loader2 className="w-4 h-4 text-gold-500 animate-spin" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="shrink-0 border-t border-white/10 bg-midnight/90 backdrop-blur-lg p-3">
        {(isVoiceListening || isVoiceActive) && (
          <div className="text-center text-xs text-emerald-400 animate-pulse mb-2 flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-ping" />
            <span>
              {isVoiceActive 
                ? "🎤 Mode mains libres actif - Dis 'Hey Becks'" 
                : isVoiceListening 
                  ? "🎤 Je t'écoute... parle maintenant"
                  : ""}
            </span>
          </div>
        )}

        <div className="relative mb-2">
          <button onClick={() => setIsModeSelectorOpen(!isModeSelectorOpen)} className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs transition-colors hover:bg-white/5">
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
                      onClick={() => { setSelectedMode(mode.id); setIsModeSelectorOpen(false); }} 
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
            {isVoiceLocked ? "🔒 Enregistrement vocal en cours..." : "🎤 Parlez... relâchez pour arrêter"}
          </div>
        )}
        
        <div className="flex items-center gap-2">
          <button onClick={() => document.getElementById('file-upload-input')?.click()} className="p-2 rounded-full bg-white/10 text-gray-400 hover:bg-white/20 transition-colors flex-shrink-0">
            <Paperclip className="w-5 h-5" />
          </button>
          <input id="file-upload-input" type="file" {...getInputProps()} className="hidden" onChange={(e) => { if (e.target.files) onDrop(Array.from(e.target.files)); }} />
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
            onMouseLeave={() => { if (isRecording && !isVoiceLocked) stopVoiceRecording(); }} 
            onTouchStart={handleSendButtonMouseDown} 
            onTouchEnd={handleSendButtonMouseUp} 
            onClick={() => { if (isVoiceLocked) stopVoiceLock(); }} 
            disabled={(!input.trim() && uploadedFiles.length === 0 && !isRecording && !isVoiceLocked) || isLoading || isSending} 
            className={`p-2 rounded-full transition-all flex-shrink-0 ${isRecording || isVoiceLocked ? "bg-red-500 text-white animate-pulse" : "bg-gold-500 text-midnight hover:scale-105"} disabled:opacity-50 disabled:hover:scale-100`}
          >
            {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </div>
        
        {selectedMode === "fais-le-avec-moi" && (
          <div className="mt-2 text-center">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-gold-500/20 text-gold-400">
              <Sparkles className="w-3 h-3" />Mode Exécution activé
            </span>
          </div>
        )}
      </div>

      {showChecklistModal && currentChecklist && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setShowChecklistModal(false)}>
          <div className="bg-midnight border border-gold-500/30 rounded-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-serif text-gold-500">{currentChecklist.title}</h3>
              <button onClick={() => setShowChecklistModal(false)} className="text-gray-400 hover:text-gold-500"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3 mb-6">
              {currentChecklist.steps.map((step, idx) => (
                <div key={idx} className="flex items-center gap-3 p-2 bg-white/5 rounded-lg">
                  <input type="checkbox" className="w-4 h-4 rounded border-gold-500 accent-gold-500" />
                  <span className="text-sm text-ivory">{step}</span>
                </div>
              ))}
            </div>
            <button onClick={() => setShowChecklistModal(false)} className="w-full py-2 bg-gold-500/20 text-gold-500 rounded-lg hover:bg-gold-500/30">Fermer</button>
          </div>
        </div>
      )}

      {showDraftModal && currentDraft && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setShowDraftModal(false)}>
          <div className="bg-midnight border border-gold-500/30 rounded-xl max-w-2xl w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-serif text-gold-500">{currentDraft.type === "email" ? "📧 Brouillon d'email" : "📄 Brouillon de document"}</h3>
              <button onClick={() => setShowDraftModal(false)} className="text-gray-400 hover:text-gold-500"><X className="w-5 h-5" /></button>
            </div>
            <div className="bg-black/30 rounded-lg p-4 mb-4 max-h-96 overflow-y-auto">
              <pre className="text-sm text-ivory whitespace-pre-wrap font-sans">{currentDraft.content}</pre>
            </div>
            <div className="flex gap-3">
              <button onClick={() => copyToClipboard(currentDraft.content)} className="flex-1 py-2 bg-gold-500/20 text-gold-500 rounded-lg hover:bg-gold-500/30">📋 Copier</button>
              <button onClick={() => setShowDraftModal(false)} className="flex-1 py-2 bg-white/10 text-gray-400 rounded-lg hover:bg-white/20">Fermer</button>
            </div>
          </div>
        </div>
      )}

      {showWhatsAppModal && currentWhatsApp && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-midnight border border-gold-500/30 rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-serif text-gold-500 mb-2">✏️ Répondre à {currentWhatsApp.to}</h3>
            <p className="text-xs text-gray-400 mb-3">Message original : {currentWhatsApp.original_message}</p>
            <textarea 
              value={customReply} 
              onChange={(e) => setCustomReply(e.target.value)} 
              className="w-full bg-white/10 border border-white/20 rounded-lg p-3 text-sm text-ivory" 
              rows={4} 
              placeholder="Ta réponse..." 
            />
            <div className="flex gap-2 mt-4">
              <button onClick={async () => { await executeAction("whatsapp_reply", { to: currentWhatsApp.to, message: customReply }); setShowWhatsAppModal(false); }} className="flex-1 py-2 bg-gold-500/20 text-gold-500 rounded-lg">📱 Envoyer</button>
              <button onClick={() => setShowWhatsAppModal(false)} className="flex-1 py-2 bg-white/10 text-gray-400 rounded-lg">Annuler</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
