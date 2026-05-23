"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useUserId } from "@/hooks/useUserId";
import { ExecutionGuide } from "@/components/ExecutionGuide";
import { ReadyToSend } from "@/components/ReadyToSend";
import { DecisionMode } from "@/components/DecisionMode";
import { LiveVoiceChat } from "@/components/LiveVoiceChat";
import ReactMarkdown from 'react-markdown';
import { 
  Send, ArrowLeft, Plus, Trash2, Search, Edit2, Check, X, Loader2, 
  Menu, Mic, MicOff, Paperclip, File, XCircle, Sparkles, Volume2, VolumeX,
  Brain, Crown
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
  executionPlan?: { planId: string; plan: any; completedSteps?: number[] };
  detected_intent?: string;
  created_at?: string;
};

export default function ChatPage() {
  const { userId, loading: userIdLoading } = useUserId();
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
  const [showLiveVoice, setShowLiveVoice] = useState(false);
  const [lastIntent, setLastIntent] = useState<string>("");
  
  const [isRecording, setIsRecording] = useState(false);
  const [pressTimer, setPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [pressStartTime, setPressStartTime] = useState(0);
  const [executionPlan, setExecutionPlan] = useState<{ planId: string; plan: any } | null>(null);
  
  const [lastAssistantMessage, setLastAssistantMessage] = useState("");
  const { speak, isSpeaking, isLoading: isTTSLoading, selectedVoice, setSelectedVoice } = useTextToSpeech();
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { transcript, resetTranscript } = useSpeechRecognition();

  // Cache conversations
  let conversationsCache: Conversation[] | null = null;
  let lastFetch = 0;
  const CACHE_TTL = 30000;

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
    const timeout = setTimeout(() => {
      if (!searchTerm.trim()) {
        setFilteredConversations(conversations);
      } else {
        setFilteredConversations(
          conversations.filter(conv => 
            conv.title.toLowerCase().includes(searchTerm.toLowerCase())
          )
        );
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchTerm, conversations]);

  useEffect(() => {
    if (executionPlan && currentConversationId) {
      localStorage.setItem(`execution_plan_${currentConversationId}`, JSON.stringify(executionPlan));
    }
  }, [executionPlan, currentConversationId]);

  useEffect(() => {
    if (currentConversationId) {
      const saved = localStorage.getItem(`execution_plan_${currentConversationId}`);
      if (saved) {
        try { setExecutionPlan(JSON.parse(saved)); } catch(e) {}
      }
    }
  }, [currentConversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

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
    
    const now = Date.now();
    if (conversationsCache && now - lastFetch < CACHE_TTL) {
      setConversations(conversationsCache);
      setFilteredConversations(conversationsCache);
      return;
    }
    
    const { data } = await supabase
      .from("conversations")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });
    
    conversationsCache = data || [];
    lastFetch = now;
    setConversations(conversationsCache);
    setFilteredConversations(conversationsCache);
    
    if (!data || data.length === 0) createNewConversation();
    else if (!currentConversationId) setCurrentConversationId(data[0].id);
  }

  async function fetchMessages(conversationId: string) {
    const { data, error } = await supabase
      .from("conversation_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(100);
    
    if (error) return;
    
    if (data && data.length > 0) {
      const parsedMessages = data.map(msg => {
        try {
          const parsed = JSON.parse(msg.content);
          return { 
            id: msg.id, 
            role: msg.role, 
            content: parsed.content || msg.content,
            actions: parsed.actions || [],
            files: parsed.files || [],
            executionPlan: parsed.execution_plan,
            detected_intent: parsed.detected_intent,
            created_at: msg.created_at 
          };
        } catch {
          return { id: msg.id, role: msg.role, content: msg.content, files: [], created_at: msg.created_at };
        }
      });
      setMessages(parsedMessages);
      
      const lastExecutionPlan = [...parsedMessages].reverse().find(m => m.executionPlan);
      if (lastExecutionPlan?.executionPlan) setExecutionPlan(lastExecutionPlan.executionPlan);
    } else {
      setMessages([{ role: "assistant", content: "Coucou Rebecca 😌 Je suis là. Parle-moi de ce qui te préoccupe aujourd'hui." }]);
    }
  }

  async function createNewConversation() {
    if (!userId) return;
    const { data, error } = await supabase.from("conversations").insert({ title: "Nouvelle conversation...", user_id: userId }).select().single();
    if (!error && data) {
      conversationsCache = null;
      setConversations(prev => [data, ...prev]);
      setFilteredConversations(prev => [data, ...prev]);
      setCurrentConversationId(data.id);
      setMessages([{ role: "assistant", content: "Coucou Rebecca 😌 Je suis là. Parle-moi de ce qui te préoccupe aujourd'hui." }]);
      await saveMessage(data.id, "assistant", "Coucou Rebecca 😌 Je suis là. Parle-moi de ce qui te préoccupe aujourd'hui.");
      if (window.innerWidth < 768) setIsSidebarOpen(false);
    }
  }

  async function updateConversationTitle(id: string, newTitle: string) {
    if (!newTitle.trim()) return;
    await supabase.from("conversations").update({ title: newTitle }).eq("id", id);
    conversationsCache = null;
    setConversations(prev => prev.map(conv => conv.id === id ? { ...conv, title: newTitle } : conv));
    setFilteredConversations(prev => prev.map(conv => conv.id === id ? { ...conv, title: newTitle } : conv));
    setEditingTitleId(null);
  }

  async function deleteConversation(id: string) {
    if (confirm("Supprimer cette conversation ?")) {
      await supabase.from("conversations").delete().eq("id", id);
      conversationsCache = null;
      const newConversations = conversations.filter(c => c.id !== id);
      setConversations(newConversations);
      setFilteredConversations(newConversations);
      if (newConversations.length > 0) setCurrentConversationId(newConversations[0].id);
      else createNewConversation();
    }
  }

  async function saveMessage(
    conversationId: string, 
    role: string, 
    content: string, 
    actions?: any[], 
    files?: any[],
    executionPlan?: any,
    detectedIntent?: string
  ) {
    const messageData: any = { 
      content,
      actions: actions || [],
      files: files || []
    };
    if (executionPlan) messageData.execution_plan = executionPlan;
    if (detectedIntent) messageData.detected_intent = detectedIntent;
    
    await supabase.from("conversation_messages").insert({ 
      conversation_id: conversationId, 
      role, 
      content: JSON.stringify(messageData) 
    });
    
    await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId);
  }

  // ========== ENVOI DE MESSAGE INTELLIGENT ==========
  const sendMessage = async () => {
    if (isSending || (!input.trim() && uploadedFiles.length === 0) || isLoading || !currentConversationId) return;
    
    setIsSending(true);
    setIsLoading(true);
    
    const uploaded = await uploadFilesToStorage();
    let userContent = input.trim() || "📎 Fichier(s) joint(s)";
    const images = uploaded.filter(f => f.type?.startsWith('image/'));
    const others = uploaded.filter(f => !f.type?.startsWith('image/'));
    if (images.length) userContent += "\n\n" + images.map(f => f.url).join("\n\n");
    if (others.length) userContent += "\n\n📎 Fichiers joints:\n" + others.map(f => `- **${f.name}** : ${f.url}`).join("\n");
    
    const userMsg: Message = { role: "user", content: userContent, files: uploaded.length ? uploaded : undefined };
    
    const allMsgs = [
      ...messages.map(m => ({ role: m.role, content: m.content })),
      { role: "user", content: userContent }
    ];
    
    setMessages(prev => [...prev, userMsg]);
    await saveMessage(currentConversationId, "user", userContent, undefined, uploaded);
    
    const assistantMsgIndex = messages.length + 1;
    setMessages(prev => [...prev, { role: "assistant", content: "" }]);
    
    setInput("");
    setUploadedFiles([]);
    resetTranscript();

    try {
      const response = await fetch(`${API_URL}/api/chat/intelligent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: allMsgs, user_id: userId })
      });
      
      const data = await response.json();
      const assistantContent = data.reply;
      
      setMessages(prev => {
        const newMsgs = [...prev];
        if (newMsgs[assistantMsgIndex]) {
          newMsgs[assistantMsgIndex].content = assistantContent;
        }
        return newMsgs;
      });
      
      setLastIntent(data.detected_intent);
      setLastAssistantMessage(assistantContent);
      
      // Afficher un toast avec l'intention détectée (optionnel, rassurant)
      if (data.detected_intent && data.detected_intent !== "OTHER") {
        toast.info(`🧠 Mode ${data.intent_label || data.detected_intent} activé`, { duration: 1500 });
      }
      
      await saveMessage(currentConversationId, "assistant", assistantContent, undefined, undefined, undefined, data.detected_intent);
      await fetchConversations();
      inputRef.current?.focus();
      
      // Faire parler Becks
      if (assistantContent && assistantContent.length > 10) {
        speak(assistantContent);
      }
      
    } catch (error) {
      console.error("Erreur envoi:", error);
      setMessages(prev => {
        const newMsgs = [...prev];
        if (newMsgs[assistantMsgIndex]) {
          newMsgs[assistantMsgIndex].content = "❌ Erreur de connexion. Réessaie.";
        }
        return newMsgs;
      });
    } finally {
      setIsLoading(false);
      setIsSending(false);
    }
  };

  // ========== VOCAL ==========
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
    const duration = Date.now() - pressStartTime;
    if (duration < 1000) {
      if (input.trim() || uploadedFiles.length > 0) sendMessage();
    } else if (isRecording) stopVoiceRecording();
  };

  // ========== UTILITAIRES ==========
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const mins = Math.floor((Date.now() - date.getTime()) / 60000);
    if (mins < 1) return "À l'instant";
    if (mins < 60) return `Il y a ${mins} min`;
    if (mins < 1440) return `Il y a ${Math.floor(mins / 60)} h`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !isRecording && !isSending) {
      e.preventDefault();
      sendMessage();
    }
  };
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("📋 Copié !");
  };

  const handlePlanComplete = () => { toast.success("🎉 Félicitations ! Plan accompli !"); setExecutionPlan(null); };
  const handleClosePlan = () => setExecutionPlan(null);
  const handlePlanUpdate = (planId: string, completedSteps: number[]) => {
    if (executionPlan && executionPlan.planId === planId) {
      const updatedPlan = { ...executionPlan.plan, completedSteps };
      setExecutionPlan({ ...executionPlan, plan: updatedPlan });
      if (currentConversationId) {
        localStorage.setItem(`execution_plan_${currentConversationId}`, JSON.stringify({ planId, plan: updatedPlan }));
      }
    }
  };

  if (userIdLoading) return <div className="flex items-center justify-center h-screen"><Loader2 className="w-8 h-8 text-gold-500 animate-spin" /></div>;

  return (
    <div className="fixed inset-0 bg-midnight flex flex-col">
      {/* HEADER */}
      <header className="sticky top-0 z-10 h-12 border-b border-white/10 flex items-center justify-between px-3 bg-midnight/95 backdrop-blur-lg shrink-0">
        <div className="flex items-center gap-2">
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-gray-400 hover:text-gold-500"><Menu className="w-4 h-4" /></button>
          <Link href="/" className="p-2 text-gray-400 hover:text-gold-500"><ArrowLeft className="w-4 h-4" /></Link>
          {lastIntent && (
            <div className="ml-2 px-2 py-0.5 bg-gold-500/20 rounded-full text-[10px] text-gold-400">
              {lastIntent === "EMOTIONAL" && "💬 Mode émotionnel"}
              {lastIntent === "DOCUMENT" && "📄 Mode documents"}
              {lastIntent === "EXECUTION" && "⚡ Mode exécution"}
              {lastIntent === "LOVE_FIRE_SPORT" && "🏆 Love & Fire"}
              {lastIntent === "FAMILY" && "👨‍👩‍👧‍👦 Famille"}
              {lastIntent === "BUSINESS" && "💰 Business"}
              {lastIntent === "FARM" && "🌾 Ferme"}
              {lastIntent === "STRATEGIC" && "👑 Stratégique"}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <select value={selectedVoice} onChange={(e) => setSelectedVoice(e.target.value)} className="text-[10px] bg-white/10 border border-white/10 rounded-full px-2 py-1 text-gray-400">
            {VOICE_OPTIONS.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
          <button onClick={() => speak(lastAssistantMessage)} disabled={isTTSLoading || !lastAssistantMessage} className={`p-2 rounded-full transition-all ${isSpeaking ? "bg-red-500/20 text-red-400" : "bg-gold-500/20 text-gold-500 hover:bg-gold-500/30"} disabled:opacity-50`}>
            {isTTSLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : isSpeaking ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>
          <button onClick={() => setShowLiveVoice(true)} className="p-2 rounded-full bg-gold-500/20 text-gold-500 hover:bg-gold-500/30">
            <Brain className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* SIDEBAR - identique à avant, garder le même code */}
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

      {/* MESSAGES */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            {m.role === "user" ? (
              <div className="max-w-[85%] p-4 rounded-2xl text-sm bg-gold-500 text-midnight rounded-br-none">
                <ReactMarkdown>{m.content}</ReactMarkdown>
                {m.files?.length ? (
                  <div className="mt-3">
                    <div className="grid grid-cols-2 gap-2">
                      {m.files.filter(f => f.type?.startsWith('image/')).map((file, idx) => (
                        <a key={idx} href={file.url} target="_blank" rel="noopener noreferrer" className="block"><img src={file.url} alt={file.name} className="rounded-xl w-full h-auto max-h-48 object-cover border border-white/10 hover:border-gold-500 transition-all" /></a>
                      ))}
                    </div>
                    {m.files.filter(f => !f.type?.startsWith('image/')).length > 0 && (
                      <div className="mt-2 pt-2 border-t border-white/10">
                        {m.files.filter(f => !f.type?.startsWith('image/')).map((file, idx) => (
                          <a key={idx} href={file.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs text-gold-500 hover:underline mt-1"><File className="w-3 h-3" /> {file.name}</a>
                        ))}
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="max-w-[85%] p-4 rounded-2xl text-sm bg-white/10 text-ivory border border-white/5 rounded-bl-none">
                <MessageWithActions content={m.content} actions={m.actions} onActionComplete={() => {}} onPlanUpdate={handlePlanUpdate} />
              </div>
            )}
          </div>
        ))}
        
        {executionPlan && (
          <div className="flex justify-start">
            <div className="max-w-[85%] w-full">
              <ExecutionGuide planId={executionPlan.planId} plan={executionPlan.plan} onComplete={handlePlanComplete} onClose={handleClosePlan} />
            </div>
          </div>
        )}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white/10 p-4 rounded-2xl rounded-bl-none">
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 bg-gold-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 bg-gold-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 bg-gold-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                <span className="text-xs text-gray-400 ml-1">Becks réfléchit...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ZONE DE SAISIE */}
      <div className="shrink-0 border-t border-white/10 bg-midnight/90 backdrop-blur-lg p-3">
        {uploadedFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {uploadedFiles.map((file, idx) => (
              <div key={idx} className="flex items-center gap-2 bg-white/10 rounded-full px-3 py-1 text-xs">
                {file.type.startsWith('image/') ? '🖼️' : '📄'}
                <span className="truncate max-w-[100px]">{file.name}</span>
                <button onClick={() => removeFile(idx)} className="text-gray-400 hover:text-red-400"><XCircle className="w-3 h-3" /></button>
              </div>
            ))}
          </div>
        )}
        {isRecording && <div className="text-center text-xs text-red-400 animate-pulse mb-2">🎤 Enregistrement vocal... relâchez pour envoyer</div>}
        
        <div className="flex items-center gap-2">
          <button onClick={() => document.getElementById('file-upload-input')?.click()} className="p-2 rounded-full bg-white/10 text-gray-400 hover:bg-white/20 transition-colors flex-shrink-0">
            <Paperclip className="w-5 h-5" />
          </button>
          <input id="file-upload-input" type="file" {...getInputProps()} className="hidden" />
          <input ref={inputRef} type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder={isRecording ? "🎤 Enregistrement vocal..." : "Pose une question, demande de l'aide, ou parle-moi..."} className="flex-1 bg-white/10 border border-white/20 rounded-full py-3 px-4 text-sm focus:outline-none focus:border-gold-500 text-ivory placeholder:text-gray-500" disabled={isRecording} />
          <button
            onMouseDown={handleSendButtonMouseDown}
            onMouseUp={handleSendButtonMouseUp}
            onMouseLeave={() => { if (isRecording) stopVoiceRecording(); }}
            onTouchStart={handleSendButtonMouseDown}
            onTouchEnd={handleSendButtonMouseUp}
            disabled={isLoading || isSending}
            className={`p-2 rounded-full transition-all flex-shrink-0 ${
              isRecording ? "bg-red-500 text-white animate-pulse" : "bg-gold-500 text-midnight hover:scale-105"
            } disabled:opacity-50 disabled:hover:scale-100`}
            title={isRecording ? "Enregistrement en cours... relâchez" : "Appui long pour parler"}
          >
            {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>
        </div>
        
        <div className="mt-2 text-center">
          <span className="text-[10px] text-gray-600">💡 Becks s'adapte automatiquement à ce que tu demandes</span>
        </div>
      </div>

      {/* LIVE VOICE MODAL */}
      {showLiveVoice && userId && <LiveVoiceChat userId={userId} onClose={() => setShowLiveVoice(false)} />}
    </div>
  );
}
