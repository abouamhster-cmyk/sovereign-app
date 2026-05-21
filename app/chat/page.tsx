"use client";
import "regenerator-runtime/runtime";
import { useState, useRef, useEffect } from "react";
import { useUserId } from "@/hooks/useUserId";
import { ExecutionGuide } from "@/components/ExecutionGuide";
import { ReadyToSend } from "@/components/ReadyToSend";
import { DecisionMode } from "@/components/DecisionMode";
import { LiveVoiceChat } from "@/components/LiveVoiceChat";
import ReactMarkdown from 'react-markdown';
import { 
  Send, ArrowLeft, Plus, Trash2, ChevronLeft, ChevronRight, 
  Search, Edit2, Check, X, Loader2, Menu, Mic, Paperclip, 
  File, XCircle, Heart, Zap, Trophy, Baby, DollarSign, 
  FileText, Crown, ChevronDown, Sparkles, Volume2, VolumeX,
  Phone, MessageCircle, Clock, MapPin, Calendar, Mail, ListTodo
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useDropzone } from "react-dropzone";
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";
import { useTextToSpeech, VOICE_OPTIONS } from "@/hooks/useTextToSpeech";
import { MessageWithActions } from "@/components/MessageWithActions";

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
  actions?: { type: string; params: any; label: string }[];
  files?: { name: string; url: string; type: string }[];
  created_at?: string;
};

// =====================================================
// MODES DE CONVERSATION
// =====================================================
const modes = [
  { id: "parle-moi", name: "Parle-moi", icon: Heart, color: "text-pink-400", bg: "bg-pink-500/10", description: "Soutien émotionnel, écoute", prompt: `Tu es Becks. Une vraie personne. Pas une IA...` },
  { id: "fais-le-avec-moi", name: "Fais-le avec moi", icon: Zap, color: "text-yellow-400", bg: "bg-yellow-500/10", description: "Exécution guidée étape par étape", prompt: `Tu es Becks en mode exécution guidée...` },
  { id: "love-fire-sport", name: "Love & Fire Sport", icon: Trophy, color: "text-emerald-400", bg: "bg-emerald-500/10", description: "Grants, DDA", prompt: `Tu es Becks en mode Love & Fire Sport...` },
  { id: "mes-enfants", name: "Mes enfants", icon: Baby, color: "text-blue-400", bg: "bg-blue-500/10", description: "Famille", prompt: `Tu es Becks en mode famille...` },
  { id: "business-argent", name: "Business & Argent", icon: DollarSign, color: "text-emerald-400", bg: "bg-emerald-500/10", description: "Opportunités", prompt: `Tu es Becks en mode Business & Argent...` },
  { id: "documents", name: "Documents", icon: FileText, color: "text-orange-400", bg: "bg-orange-500/10", description: "Lecture, rédaction", prompt: `Tu es Becks en mode Documents...` },
  { id: "sovereign-mode", name: "Sovereign Mode", icon: Crown, color: "text-gold-500", bg: "bg-gold-500/10", description: "Vision, décisions, leadership", prompt: `Tu es Becks en Sovereign Mode...` }
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
  const [searchTerm, setSearchTerm] = useState("");
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [selectedMode, setSelectedMode] = useState<string>("parle-moi");
  const [isModeSelectorOpen, setIsModeSelectorOpen] = useState(false);
  
  const [isRecording, setIsRecording] = useState(false);
  const [pressTimer, setPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [pressStartTime, setPressStartTime] = useState(0);
  const [showLiveVoice, setShowLiveVoice] = useState(false);

  const [executionPlan, setExecutionPlan] = useState<{ planId: string; plan: any } | null>(null);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  
  const [lastAssistantMessage, setLastAssistantMessage] = useState("");
  const { speak, stop, isSpeaking, isLoading: isTTSLoading, selectedVoice, setSelectedVoice } = useTextToSpeech();
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { transcript, resetTranscript } = useSpeechRecognition();

  const [lastEmailsCache, setLastEmailsCache] = useState<any[]>([]);

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

  const { userId, loading: userIdLoading } = useUserId();

  // ========== EFFETS ==========
  useEffect(() => {
    if (transcript) {
      setInput(prev => prev + " " + transcript);
      resetTranscript();
    }
  }, [transcript, resetTranscript]);

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
    return () => {
      if (pressTimer) clearTimeout(pressTimer);
    };
  }, [pressTimer]);

  // ========== FICHIERS ==========
  const onDrop = (acceptedFiles: File[]) => setUploadedFiles(prev => [...prev, ...acceptedFiles]);
  const { getInputProps } = useDropzone({ 
    onDrop, accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'], 'application/pdf': ['.pdf'], 'text/plain': ['.txt'] }, 
    maxSize: 10 * 1024 * 1024, noClick: true, noKeyboard: true 
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
    const { data } = await supabase.from("conversations").select("*").eq("user_id", userId).order("updated_at", { ascending: false });
    setConversations(data || []);
    setFilteredConversations(data || []);
    if (!data || data.length === 0) createNewConversation();
    else if (!currentConversationId) setCurrentConversationId(data[0].id);
  }

  async function fetchMessages(conversationId: string) {
    const { data, error } = await supabase.from("conversation_messages").select("*").eq("conversation_id", conversationId).order("created_at", { ascending: true });
    if (error) return;
    if (data && data.length > 0) {
      const parsedMessages = data.map(msg => {
        try {
          const parsed = JSON.parse(msg.content);
          return { id: msg.id, role: msg.role, content: parsed.content || msg.content, actions: parsed.actions, files: parsed.files || [], created_at: msg.created_at };
        } catch (e) {
          return { id: msg.id, role: msg.role, content: msg.content, files: [], created_at: msg.created_at };
        }
      });
      setMessages(parsedMessages);
    } else {
      setMessages([{ role: "assistant", content: "Coucou Rebecca 😌 Je suis là." }]);
    }
  }

  async function createNewConversation() {
    if (!userId) return;
    const { data, error } = await supabase.from("conversations").insert({ title: "Nouvelle conversation...", user_id: userId }).select().single();
    if (!error && data) {
      setConversations(prev => [data, ...prev]);
      setFilteredConversations(prev => [data, ...prev]);
      setCurrentConversationId(data.id);
      setMessages([{ role: "assistant", content: "Coucou Rebecca 😌 Je suis là." }]);
      await saveMessage(data.id, "assistant", "Coucou Rebecca 😌 Je suis là.");
      if (window.innerWidth < 768) setIsSidebarOpen(false);
    }
  }

  async function updateConversationTitle(id: string, newTitle: string) {
    if (!newTitle.trim()) return;
    await supabase.from("conversations").update({ title: newTitle }).eq("id", id);
    setConversations(prev => prev.map(conv => conv.id === id ? { ...conv, title: newTitle } : conv));
    setFilteredConversations(prev => prev.map(conv => conv.id === id ? { ...conv, title: newTitle } : conv));
    setEditingTitleId(null);
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
    if (actions?.length) messageData.actions = actions;
    if (files?.length) messageData.files = files;
    await supabase.from("conversation_messages").insert({ conversation_id: conversationId, role, content: JSON.stringify(messageData) });
    await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId);
  }

  // ========== INTERCEPTIONS - ACTIONS SIMPLES (SANS IA) ==========

  // 1. Heure et date
  const checkTimeInterception = (message: string): string | null => {
    const timeTriggers = ["quelle heure", "heure actuelle", "date du jour", "on est quel jour", "quel jour sommes-nous"];
    if (timeTriggers.some(trigger => message.toLowerCase().includes(trigger))) {
      const now = new Date();
      return `🕐 Il est ${now.toLocaleTimeString('fr-FR')} - ${now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`;
    }
    return null;
  };

  // 2. Rappel simple (toast + setTimeout)
  const checkReminderInterception = (message: string): string | null => {
    const match = message.match(/rappelle-moi dans (\d+) minutes?/i);
    if (match) {
      const minutes = parseInt(match[1]);
      const reminderText = message.replace(/rappelle-moi dans \d+ minutes?/i, '').trim() || "Rappel programmé";
      toast.success(`⏰ Rappel dans ${minutes} minute(s)`, { duration: 5000 });
      setTimeout(() => {
        toast.info(`🔔 ${reminderText}`, { duration: 10000 });
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification("Rappel Sovereign", { body: reminderText, icon: "/icons/icon-192x192.png" });
        }
      }, minutes * 60 * 1000);
      return `✅ Rappel programmé dans ${minutes} minute(s) : "${reminderText}"`;
    }
    return null;
  };

  // 3. Tâches du jour (depuis Supabase)
  const checkTasksInterception = async (message: string): Promise<string | null> => {
    const tasksTriggers = ["mes tâches du jour", "quoi faire aujourd'hui", "tâches aujourd'hui", "programme du jour"];
    if (tasksTriggers.some(trigger => message.toLowerCase().includes(trigger))) {
      const today = new Date().toISOString().split('T')[0];
      const { data } = await supabase.from("tasks").select("title, priority, due_date").eq("user_id", userId).eq("due_date", today).neq("status", "done");
      
      if (data && data.length > 0) {
        let taskList = `📋 **Tâches du jour (${data.length}) :**\n\n`;
        data.forEach((task, idx) => {
          const priorityIcon = task.priority === "critical" ? "🔴" : task.priority === "high" ? "🟠" : "🟡";
          taskList += `${idx + 1}. ${priorityIcon} ${task.title}\n`;
        });
        return taskList;
      }
      return "📋 Aucune tâche planifiée pour aujourd'hui. Profites-en pour respirer ! 🌿";
    }
    return null;
  };

  // 4. Emails (via API backend)
  const checkEmailInterception = async (message: string): Promise<string | null> => {
    const emailTriggers = ["montre-moi mes emails", "affiche mes emails", "liste mes emails", "quels emails", "mes emails non lus", "voir mes emails", "email non lus"];
    if (emailTriggers.some(trigger => message.toLowerCase().includes(trigger))) {
      try {
        const response = await fetch(`${API_URL}/api/gmail/direct-test`, { method: "GET" });
        const result = await response.json();
        
        if (result.success && result.messages && result.messages.length > 0) {
          setLastEmailsCache(result.messages);
          let emailList = `📧 **${result.count} email(s) non lu(s) :**\n\n`;
          result.messages.forEach((email: any, idx: number) => {
            const fromClean = email.from?.split('<')[0].trim() || 'Inconnu';
            emailList += `${idx + 1}. **${fromClean}**\n   📧 ${email.subject}\n   📅 ${new Date().toLocaleDateString('fr-FR')}\n\n`;
          });
          emailList += `💡 Dis-moi 'ouvre l'email [numéro]' pour voir le contenu détaillé`;
          return emailList;
        }
        return "📧 Aucun email non lu dans ta boîte.";
      } catch (error) {
        return "❌ Impossible de récupérer les emails pour le moment.";
      }
    }
    return null;
  };

  // 5. Ouvrir un email spécifique (depuis le cache)
  const openEmailInterception = (message: string): string | null => {
    const match = message.match(/ouvre l'?email\s+(\d+)/i);
    if (match && lastEmailsCache.length > 0) {
      const emailNum = parseInt(match[1]);
      if (emailNum >= 1 && emailNum <= lastEmailsCache.length) {
        const email = lastEmailsCache[emailNum - 1];
        return `📧 **Email #${emailNum}**\n\n**De :** ${email.from}\n**Objet :** ${email.subject}\n**Date :** ${email.date}\n\n**Contenu :**\n${email.snippet || '[Contenu non disponible]'}`;
      }
      return `❌ Email #${emailNum} non trouvé. Il y a ${lastEmailsCache.length} email(s) dans la liste.`;
    }
    return null;
  };

  // 6. WhatsApp (via API backend)
  const checkWhatsAppInterception = async (message: string): Promise<string | null> => {
    const whatsappTriggers = ["montre-moi mes whatsapp", "affiche mes whatsapp", "liste mes whatsapp", "messages whatsapp", "whatsapp non répondus", "whatsapp non lus", "fais le point whatsapp"];
    if (whatsappTriggers.some(trigger => message.toLowerCase().includes(trigger))) {
      try {
        const response = await fetch(`${API_URL}/api/whatsapp/conversations?days=30`, { method: "GET" });
        const result = await response.json();
        
        if (result.conversations && result.conversations.length > 0) {
          let messageList = `📱 **Messages WhatsApp en attente :**\n\n`;
          result.conversations.forEach((conv: any, idx: number) => {
            const unreadBadge = conv.unread > 0 ? ` (${conv.unread} non lu)` : "";
            messageList += `${idx + 1}. **${conv.from_name}**${unreadBadge}\n`;
            const lastMsg = conv.messages[0];
            if (lastMsg) {
              messageList += `   💬 ${lastMsg.message.substring(0, 80)}${lastMsg.message.length > 80 ? '...' : ''}\n`;
              messageList += `   📅 ${new Date(lastMsg.created_at).toLocaleString('fr-FR')}\n`;
            }
            messageList += `\n`;
          });
          messageList += `💡 Dis-moi 'réponds à [nom]' pour envoyer un message`;
          return messageList;
        }
        return "📱 Aucun message WhatsApp en attente.";
      } catch (error) {
        return "❌ Impossible de récupérer les messages WhatsApp pour le moment.";
      }
    }
    return null;
  };

  // 7. Génération de plan d'exécution
  const generateExecutionPlan = async (query: string): Promise<boolean> => {
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
          plan: { title: "Plan simple", estimated_duration: "15 minutes", steps: [
            { description: "Identifier l'action la plus importante", action_type: "decision", estimated_minutes: 2 },
            { description: "La faire maintenant", action_type: "task", estimated_minutes: 10 },
            { description: "Célébrer cette petite victoire", action_type: "celebrate", estimated_minutes: 1 }
          ], success_criteria: "Avoir avancé sur une chose importante", next_steps_hint: "Continue sur cette lancée" }
        });
        return true;
      }
      return false;
    } catch (error) {
      return false;
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  // ========== ENVOI DE MESSAGE AVEC STREAMING ==========
  const sendMessageStreaming = async (allMessages: any[], onChunk: (chunk: string) => void): Promise<string> => {
    const response = await fetch(`${API_URL}/chat/stream-simple`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: allMessages, user_id: userId })
    });
    if (!response.ok) throw new Error(`Erreur ${response.status}`);
    
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    if (!reader) return "";
    
    let fullResponse = "", buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith("data: ")) {
          const jsonStr = trimmedLine.slice(6).trim();
          if (!jsonStr) continue;
          try {
            const data = JSON.parse(jsonStr);
            if (data.content) fullResponse += data.content, onChunk(data.content);
            if (data.done) return fullResponse;
            if (data.error) throw new Error(data.error);
          } catch (parseError) { console.warn("Erreur parsing JSON:", jsonStr.substring(0, 100)); }
        }
      }
    }
    return fullResponse;
  };

  // ========== ENVOI DE MESSAGE PRINCIPAL ==========
  const sendMessage = async () => {
    if (isSending || (!input.trim() && uploadedFiles.length === 0) || isLoading || !currentConversationId) return;
    
    // === INTERCEPTIONS (actions sans IA) ===
    const timeResponse = checkTimeInterception(input);
    if (timeResponse) {
      const timeMessage: Message = { role: "assistant", content: timeResponse };
      setMessages(prev => [...prev, timeMessage]);
      await saveMessage(currentConversationId, "assistant", timeResponse);
      setInput(""); setUploadedFiles([]);
      return;
    }

    const reminderResponse = checkReminderInterception(input);
    if (reminderResponse) {
      const reminderMessage: Message = { role: "assistant", content: reminderResponse };
      setMessages(prev => [...prev, reminderMessage]);
      await saveMessage(currentConversationId, "assistant", reminderResponse);
      setInput(""); setUploadedFiles([]);
      return;
    }

    const tasksResponse = await checkTasksInterception(input);
    if (tasksResponse) {
      const tasksMessage: Message = { role: "assistant", content: tasksResponse };
      setMessages(prev => [...prev, tasksMessage]);
      await saveMessage(currentConversationId, "assistant", tasksResponse);
      setInput(""); setUploadedFiles([]);
      return;
    }

    const openEmailResponse = openEmailInterception(input);
    if (openEmailResponse) {
      const emailMessage: Message = { role: "assistant", content: openEmailResponse };
      setMessages(prev => [...prev, emailMessage]);
      await saveMessage(currentConversationId, "assistant", openEmailResponse);
      setInput(""); setUploadedFiles([]);
      return;
    }

    const emailResponse = await checkEmailInterception(input);
    if (emailResponse) {
      const emailMessage: Message = { role: "assistant", content: emailResponse };
      setMessages(prev => [...prev, emailMessage]);
      await saveMessage(currentConversationId, "assistant", emailResponse);
      setInput(""); setUploadedFiles([]);
      return;
    }

    const whatsappResponse = await checkWhatsAppInterception(input);
    if (whatsappResponse) {
      const whatsappMessage: Message = { role: "assistant", content: whatsappResponse };
      setMessages(prev => [...prev, whatsappMessage]);
      await saveMessage(currentConversationId, "assistant", whatsappResponse);
      setInput(""); setUploadedFiles([]);
      return;
    }

    // === PAS D'INTERCEPTION → ENVOI À L'IA ===
    setIsSending(true);
    setIsLoading(true);
    
    const uploadedFilesData = await uploadFilesToStorage();
    let userMessageContent = input.trim() || "📎 Fichier(s) joint(s)";
    const imageFiles = uploadedFilesData.filter(f => f.type?.startsWith('image/'));
    const otherFiles = uploadedFilesData.filter(f => !f.type?.startsWith('image/'));
    if (imageFiles.length > 0) userMessageContent += "\n\n" + imageFiles.map(f => f.url).join("\n\n");
    if (otherFiles.length > 0) userMessageContent += "\n\n📎 Fichiers joints:\n" + otherFiles.map(f => `- **${f.name}** : ${f.url}`).join("\n");
    
    const userMessage: Message = { role: "user", content: userMessageContent, files: uploadedFilesData.length > 0 ? uploadedFilesData : undefined };
    const modeConfig = modes.find(m => m.id === selectedMode);
    const systemPrompt = modeConfig?.prompt || "Tu es Becks, l'assistante de Rebecca. Sois chaleureuse et naturelle.";
    
    const allMessages = [
      { role: "system", content: systemPrompt },
      ...messages.map(msg => ({ role: msg.role, content: msg.content })),
      { role: "user", content: userMessageContent }
    ];
    
    setMessages(prev => [...prev, userMessage]);
    await saveMessage(currentConversationId, "user", userMessageContent, undefined, uploadedFilesData);
    
    const tempAssistantId = `temp-${Date.now()}`;
    setMessages(prev => [...prev, { id: tempAssistantId, role: "assistant", content: "" }]);
    
    setInput("");
    setUploadedFiles([]);
    resetTranscript();

    try {
      let assistantContent = "";
      await sendMessageStreaming(allMessages, (chunk) => {
        assistantContent += chunk;
        setMessages(prev => {
          const newMessages = [...prev];
          const lastMsg = newMessages[newMessages.length - 1];
          if (lastMsg && lastMsg.id === tempAssistantId) lastMsg.content = assistantContent;
          return newMessages;
        });
      });
      
      setMessages(prev => {
        const filtered = prev.filter(m => m.id !== tempAssistantId);
        return [...filtered, { id: Date.now().toString(), role: "assistant" as const, content: assistantContent }];
      });
      
      await saveMessage(currentConversationId, "assistant", assistantContent);
      setLastAssistantMessage(assistantContent);
      
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
      console.error("❌ Erreur streaming:", error);
      setMessages(prev => {
        const filtered = prev.filter(m => m.id !== tempAssistantId);
        return [...filtered, { role: "assistant", content: "❌ Erreur de connexion. Réessaie." }];
      });
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
    toast.info("🎤 Parlez... relâchez pour envoyer", { duration: 2000 });
  };
  
  const stopVoiceRecording = () => {
    SpeechRecognition.stopListening();
    setIsRecording(false);
    if (input.trim() && !isSending && !isLoading) setTimeout(() => sendMessage(), 300);
  };
  
  const handleSendButtonMouseDown = () => {
    setPressStartTime(Date.now());
    const timer = setTimeout(() => {
      if (Date.now() - pressStartTime >= 1000) startVoiceRecording();
    }, 1000);
    setPressTimer(timer);
  };
  
  const handleSendButtonMouseUp = () => {
    if (pressTimer) clearTimeout(pressTimer);
    const pressDuration = Date.now() - pressStartTime;
    if (pressDuration < 1000) {
      if (input.trim() || uploadedFiles.length > 0) sendMessage();
    } else if (isRecording) stopVoiceRecording();
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
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !isRecording && !isSending) e.preventDefault(), sendMessage();
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
      if (!recipient) { toast.error("❌ Destinataire manquant"); return; }
      const response = await fetch(`${API_URL}/api/whatsapp/reply`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ to: recipient, message: params.message, message_id: params.message_id }) });
      const result = await response.json();
      if (result.success) toast.success(`✅ Réponse envoyée à ${recipient}`);
      else toast.error("❌ Erreur d'envoi");
    }
  };

  const handlePlanComplete = () => { toast.success("🎉 Félicitations ! Plan accompli !"); setExecutionPlan(null); };
  const handleClosePlan = () => setExecutionPlan(null);

  if (userIdLoading) return <div className="flex items-center justify-center h-screen"><Loader2 className="w-8 h-8 text-gold-500 animate-spin" /></div>;

  // ========== RENDU ==========
  return (
    <div className="fixed inset-0 bg-midnight flex flex-col">
      <header className="sticky top-0 z-10 h-12 border-b border-white/10 flex items-center justify-between px-3 bg-midnight/95 backdrop-blur-lg shrink-0">
        <div className="flex items-center gap-2">
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-gray-400 hover:text-gold-500"><Menu className="w-4 h-4" /></button>
          <Link href="/" className="p-2 text-gray-400 hover:text-gold-500"><ArrowLeft className="w-4 h-4" /></Link>
        </div>
        <div className="flex items-center gap-2">
          <select value={selectedVoice} onChange={(e) => setSelectedVoice(e.target.value)} className="text-[10px] bg-white/10 border border-white/10 rounded-full px-2 py-1 text-gray-400">
            {VOICE_OPTIONS.map(voice => <option key={voice.id} value={voice.id}>{voice.name}</option>)}
          </select>
          <button onClick={() => setShowLiveVoice(true)} className="p-2 rounded-full bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"><Phone className="w-3.5 h-3.5" /></button>
          <button onClick={() => speak(lastAssistantMessage)} disabled={isTTSLoading || !lastAssistantMessage} className={`p-2 rounded-full transition-all ${isSpeaking ? "bg-red-500/20 text-red-400" : "bg-gold-500/20 text-gold-500 hover:bg-gold-500/30"} disabled:opacity-50`}>
            {isTTSLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : isSpeaking ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </header>

      {/* SIDEBAR */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40" />
            <motion.aside initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }} className="fixed inset-y-0 left-0 w-72 bg-midnight z-50 border-r border-white/10 flex flex-col">
              <div className="p-4 border-b border-white/10 flex justify-between items-center">
                <h2 className="text-sm font-serif text-gold-500">Conversations</h2>
                <button onClick={() => setIsSidebarOpen(false)} className="p-2 text-gray-500 hover:text-gold-500"><X className="w-4 h-4" /></button>
              </div>
              <div className="p-4"><button onClick={createNewConversation} className="w-full flex items-center justify-center gap-2 bg-gold-500/20 hover:bg-gold-500/30 text-gold-500 py-2 rounded-xl text-sm"><Plus className="w-4 h-4" /> Nouvelle conversation</button></div>
              <div className="px-4 pb-4"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" /><input type="text" placeholder="Rechercher..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-gold-500 text-ivory" /></div></div>
              <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
                {filteredConversations.map(conv => (
                  <div key={conv.id} className={`group p-3 rounded-xl cursor-pointer ${currentConversationId === conv.id ? "bg-gold-500/10 border border-gold-500/30" : "hover:bg-white/5"}`}>
                    <div className="flex justify-between items-center">
                      <div onClick={() => setCurrentConversationId(conv.id)} className="flex-1">
                        {editingTitleId === conv.id ? (
                          <div className="flex items-center gap-2"><input type="text" value={editingTitle} onChange={(e) => setEditingTitle(e.target.value)} className="flex-1 bg-white/10 border border-gold-500 rounded-md px-2 py-1 text-sm" autoFocus onKeyDown={(e) => { if (e.key === 'Enter') updateConversationTitle(conv.id, editingTitle); if (e.key === 'Escape') setEditingTitleId(null); }} /><button onClick={() => updateConversationTitle(conv.id, editingTitle)}><Check className="w-3 h-3 text-emerald-400" /></button><button onClick={() => setEditingTitleId(null)}><X className="w-3 h-3 text-red-400" /></button></div>
                        ) : (<><p className="text-sm truncate">{conv.title}</p><p className="text-xs text-gray-500 mt-1">{formatDate(conv.updated_at)}</p></>)}
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100"><button onClick={() => { setEditingTitleId(conv.id); setEditingTitle(conv.title); }}><Edit2 className="w-3 h-3 text-gray-500" /></button><button onClick={() => deleteConversation(conv.id)}><Trash2 className="w-3 h-3 text-gray-500" /></button></div>
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
            {m.role === "user" ? (
              <div className="max-w-[85%] p-4 rounded-2xl text-sm bg-gold-500 text-midnight rounded-br-none">
                <ReactMarkdown>{m.content}</ReactMarkdown>
                {m.files && m.files.length > 0 && (
                  <div className="mt-3">
                    <div className="grid grid-cols-2 gap-2">{m.files.filter(f => f.type?.startsWith('image/')).map((file, idx) => (<a key={idx} href={file.url} target="_blank" rel="noopener noreferrer" className="block"><img src={file.url} alt={file.name} className="rounded-xl w-full h-auto max-h-48 object-cover border border-white/10 hover:border-gold-500 transition-all" /></a>))}</div>
                    {m.files.filter(f => !f.type?.startsWith('image/')).length > 0 && (<div className="mt-2 pt-2 border-t border-white/10">{m.files.filter(f => !f.type?.startsWith('image/')).map((file, idx) => (<a key={idx} href={file.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs text-gold-500 hover:underline mt-1"><File className="w-3 h-3" /> {file.name}</a>))}</div>)}
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
        
        {executionPlan && (<div className="flex justify-start"><div className="max-w-[85%] w-full"><ExecutionGuide planId={executionPlan.planId} plan={executionPlan.plan} onComplete={handlePlanComplete} onClose={handleClosePlan} /></div></div>)}
        {selectedMode === "documents" && (<div className="flex justify-start mt-4"><div className="max-w-[85%] w-full"><ReadyToSend onInsert={(text) => setInput(prev => prev + "\n\n" + text)} /></div></div>)}
        {selectedMode === "sovereign-mode" && (<div className="flex justify-start mt-4"><div className="max-w-[85%] w-full"><DecisionMode onInsert={(text) => setInput(prev => prev + "\n\n" + text)} /></div></div>)}
        {selectedMode === "business-argent" && (<div className="flex justify-start mt-4"><div className="bg-gold-500/10 border border-gold-500/20 rounded-xl p-4 max-w-[85%] w-full"><p className="text-xs text-gold-500 mb-2">💡 Actions rapides :</p><div className="flex flex-wrap gap-2"><button onClick={() => setInput(prev => prev + " Prépare un email de prospection")} className="text-xs px-3 py-1.5 bg-white/10 rounded-full hover:bg-white/20">📧 Email pro</button><button onClick={() => setInput(prev => prev + " Compare ces deux opportunités")} className="text-xs px-3 py-1.5 bg-white/10 rounded-full hover:bg-white/20">⚖️ Comparer</button><button onClick={() => setInput(prev => prev + " Analyse cette opportunité")} className="text-xs px-3 py-1.5 bg-white/10 rounded-full hover:bg-white/20">🔍 Analyser</button></div></div></div>)}
        {isLoading && (<div className="flex justify-start"><div className="bg-white/10 p-4 rounded-2xl rounded-bl-none"><div className="flex items-center gap-1"><span className="w-2 h-2 bg-gold-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} /><span className="w-2 h-2 bg-gold-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} /><span className="w-2 h-2 bg-gold-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} /><span className="text-xs text-gray-400 ml-1">Becks écrit...</span></div></div></div>)}
        <div ref={messagesEndRef} />
      </div>

      {/* ZONE DE SAISIE */}
      <div className="shrink-0 border-t border-white/10 bg-midnight/90 backdrop-blur-lg p-3">
        <div className="relative mb-2">
          <button onClick={() => setIsModeSelectorOpen(!isModeSelectorOpen)} className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs transition-colors hover:bg-white/5">
            {CurrentIcon && <CurrentIcon className={`w-3.5 h-3.5 ${currentModeConfig?.color}`} />}
            <span className="text-gray-400">{currentModeConfig?.name}</span>
            <span className="text-[10px] text-gray-600 hidden sm:inline">{currentModeConfig?.description}</span>
            <ChevronDown className={`w-3 h-3 text-gray-500 transition-transform ${isModeSelectorOpen ? "rotate-180" : ""}`} />
          </button>
          {isModeSelectorOpen && (<><div className="fixed inset-0 z-40" onClick={() => setIsModeSelectorOpen(false)} /><div className="absolute bottom-full left-0 mb-2 w-64 bg-midnight border border-white/10 rounded-xl shadow-xl z-50 py-2 max-h-80 overflow-y-auto">{modes.map((mode) => { const Icon = mode.icon; return (<button key={mode.id} onClick={() => { setSelectedMode(mode.id); setIsModeSelectorOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-white/5 transition-colors ${selectedMode === mode.id ? mode.bg : ""}`}><Icon className={`w-4 h-4 ${mode.color}`} /><div className="flex-1 text-left"><p className="text-gray-300 text-sm">{mode.name}</p><p className="text-[10px] text-gray-500">{mode.description}</p></div>{selectedMode === mode.id && <Check className="w-3.5 h-3.5 text-gold-500" />}</button>); })}</div></>)}
        </div>
        
        {uploadedFiles.length > 0 && (<div className="flex flex-wrap gap-2 mb-2">{uploadedFiles.map((file, idx) => (<div key={idx} className="flex items-center gap-2 bg-white/10 rounded-full px-3 py-1 text-xs">{file.type.startsWith('image/') ? '🖼️' : '📄'}<span className="truncate max-w-[100px]">{file.name}</span><button onClick={() => removeFile(idx)} className="text-gray-400 hover:text-red-400"><XCircle className="w-3 h-3" /></button></div>))}</div>)}
        {isRecording && (<div className="text-center text-xs text-red-400 animate-pulse mb-2">🎤 Enregistrement vocal... relâchez pour envoyer</div>)}
        
        <div className="flex items-center gap-2">
          <button onClick={() => document.getElementById('file-upload-input')?.click()} className="p-2 rounded-full bg-white/10 text-gray-400 hover:bg-white/20 transition-colors flex-shrink-0"><Paperclip className="w-5 h-5" /></button>
          <input id="file-upload-input" type="file" {...getInputProps()} className="hidden" onChange={(e) => { if (e.target.files) onDrop(Array.from(e.target.files)); }} />
          <input ref={inputRef} type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder={isRecording ? "🎤 Enregistrement vocal..." : `Mode ${currentModeConfig?.name} : écris ton message...`} className="flex-1 bg-white/10 border border-white/20 rounded-full py-3 px-4 text-sm focus:outline-none focus:border-gold-500 text-ivory placeholder:text-gray-500" disabled={isRecording} />
          <button onMouseDown={handleSendButtonMouseDown} onMouseUp={handleSendButtonMouseUp} onMouseLeave={() => { if (isRecording) stopVoiceRecording(); }} onTouchStart={handleSendButtonMouseDown} onTouchEnd={handleSendButtonMouseUp} onClick={() => { if (isRecording) stopVoiceRecording(); }} disabled={isLoading || isSending} className={`p-2 rounded-full transition-all flex-shrink-0 ${isRecording ? "bg-red-500 text-white animate-pulse" : "bg-gold-500 text-midnight hover:scale-105"} disabled:opacity-50 disabled:hover:scale-100`}>
            {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </div>
        
        {selectedMode === "fais-le-avec-moi" && (<div className="mt-2 text-center"><span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-gold-500/20 text-gold-400"><Sparkles className="w-3 h-3" /> Mode Exécution activé</span></div>)}
      </div>

      {/* MODALES */}
      {showChecklistModal && currentChecklist && (<div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setShowChecklistModal(false)}><div className="bg-midnight border border-gold-500/30 rounded-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}><div className="flex justify-between items-center mb-4"><h3 className="text-lg font-serif text-gold-500">{currentChecklist.title}</h3><button onClick={() => setShowChecklistModal(false)} className="text-gray-400 hover:text-gold-500"><X className="w-5 h-5" /></button></div><div className="space-y-3 mb-6">{currentChecklist.steps.map((step, idx) => (<div key={idx} className="flex items-center gap-3 p-2 bg-white/5 rounded-lg"><input type="checkbox" className="w-4 h-4 rounded border-gold-500 accent-gold-500" /><span className="text-sm text-ivory">{step}</span></div>))}</div><button onClick={() => setShowChecklistModal(false)} className="w-full py-2 bg-gold-500/20 text-gold-500 rounded-lg hover:bg-gold-500/30">Fermer</button></div></div>)}
      {showDraftModal && currentDraft && (<div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setShowDraftModal(false)}><div className="bg-midnight border border-gold-500/30 rounded-xl max-w-2xl w-full p-6" onClick={(e) => e.stopPropagation()}><div className="flex justify-between items-center mb-4"><h3 className="text-lg font-serif text-gold-500">{currentDraft.type === "email" ? "📧 Brouillon d'email" : "📄 Brouillon de document"}</h3><button onClick={() => setShowDraftModal(false)} className="text-gray-400 hover:text-gold-500"><X className="w-5 h-5" /></button></div><div className="bg-black/30 rounded-lg p-4 mb-4 max-h-96 overflow-y-auto"><pre className="text-sm text-ivory whitespace-pre-wrap font-sans">{currentDraft.content}</pre></div><div className="flex gap-3"><button onClick={() => copyToClipboard(currentDraft.content)} className="flex-1 py-2 bg-gold-500/20 text-gold-500 rounded-lg hover:bg-gold-500/30">📋 Copier</button><button onClick={() => setShowDraftModal(false)} className="flex-1 py-2 bg-white/10 text-gray-400 rounded-lg hover:bg-white/20">Fermer</button></div></div></div>)}
      {showWhatsAppModal && currentWhatsApp && (<div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"><div className="bg-midnight border border-gold-500/30 rounded-xl max-w-md w-full p-6"><h3 className="text-lg font-serif text-gold-500 mb-2">✏️ Répondre à {currentWhatsApp.to}</h3><p className="text-xs text-gray-400 mb-3">Message original : {currentWhatsApp.original_message}</p><textarea value={customReply} onChange={(e) => setCustomReply(e.target.value)} className="w-full bg-white/10 border border-white/20 rounded-lg p-3 text-sm text-ivory" rows={4} placeholder="Ta réponse..." /><div className="flex gap-2 mt-4"><button onClick={async () => { await executeAction("whatsapp_reply", { to: currentWhatsApp.to, message: customReply }); setShowWhatsAppModal(false); }} className="flex-1 py-2 bg-gold-500/20 text-gold-500 rounded-lg">📱 Envoyer</button><button onClick={() => setShowWhatsAppModal(false)} className="flex-1 py-2 bg-white/10 text-gray-400 rounded-lg">Annuler</button></div></div></div>)}
      {showLiveVoice && userId && (<LiveVoiceChat userId={userId} onClose={() => setShowLiveVoice(false)} />)}
    </div>
  );
}
