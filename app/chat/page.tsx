"use client";
import { useState, useRef, useEffect } from "react";
import { 
  Send, ArrowLeft, Plus, Trash2, ChevronLeft, ChevronRight, 
  Search, Edit2, Check, X, Loader2, Menu, Mic, Paperclip, 
  Image, File, XCircle, Upload
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useDropzone } from "react-dropzone";
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";

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

export default function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [filteredConversations, setFilteredConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Speech recognition
  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition
  } = useSpeechRecognition();

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
      setInput(transcript);
    }
  }, [transcript]);

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

  // Scroll auto vers le dernier message
  useEffect(() => {
    if (!isInitialLoad && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    } else {
      setIsInitialLoad(false);
    }
  }, [messages]);

  // Focus sur l'input après chargement
  useEffect(() => {
    if (currentConversationId && inputRef.current) {
      inputRef.current.focus();
    }
  }, [currentConversationId]);

  // Fermer la sidebar sur mobile quand on change de conversation
  useEffect(() => {
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  }, [currentConversationId, isMobile]);

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
      'application/msword': ['.doc', '.docx'],
      'application/vnd.ms-excel': ['.xls', '.xlsx']
    },
    maxSize: 10 * 1024 * 1024 // 10MB
  });

  async function uploadFilesToStorage() {
    if (uploadedFiles.length === 0) return [];
    
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
      // Parser les messages pour extraire les fichiers
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

  const handleSend = async () => {
    if ((!input.trim() && uploadedFiles.length === 0) || isLoading || !currentConversationId) return;
    
    setIsUploading(true);
    const uploadedFilesData = await uploadFilesToStorage();
    setIsUploading(false);
    
    const userMessageContent = input.trim() || "Fichier(s) joint(s)";
    const userMessage: Message = { 
      role: "user", 
      content: userMessageContent,
      files: uploadedFilesData.length > 0 ? uploadedFilesData : undefined
    };
    
    const allMessages = [...messages, userMessage];
    
    setMessages(prev => [...prev, userMessage]);
    await saveMessage(currentConversationId, "user", userMessageContent, uploadedFilesData);
    setInput("");
    setUploadedFiles([]);
    setIsLoading(true);
    resetTranscript();

    try {
      // Construire le message à envoyer à l'API
      let messageContent = userMessageContent;
      if (uploadedFilesData.length > 0) {
        messageContent += "\n\n📎 Fichiers joints:\n" + uploadedFilesData.map(f => `- ${f.name}: ${f.url}`).join("\n");
      }
      
      const response = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          messages: [...allMessages.slice(0, -1), { role: "user", content: messageContent }].map(msg => ({
            role: msg.role,
            content: msg.content
          }))
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Erreur ${response.status}`);
      }
      
      const data = await response.json();
      const assistantContent = data.reply;
      
      setMessages(prev => [...prev, { role: "assistant", content: assistantContent }]);
      await saveMessage(currentConversationId, "assistant", assistantContent);
      
      fetchConversations();
      inputRef.current?.focus();
    } catch (error) {
      console.error("Erreur:", error);
      const errorMessage = "Erreur de connexion. Vérifie que le backend est bien démarré.";
      setMessages(prev => [...prev, { role: "assistant", content: errorMessage }]);
      await saveMessage(currentConversationId, "assistant", errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const startListening = () => {
    resetTranscript();
    SpeechRecognition.startListening({ continuous: true, language: 'fr-FR' });
  };

  const stopListening = () => {
    SpeechRecognition.stopListening();
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return "À l'instant";
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours} h`;
    if (diffDays === 1) return "Hier";
    if (diffDays < 7) return `Il y a ${diffDays} jours`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  const startEditTitle = (conv: Conversation) => {
    setEditingTitleId(conv.id);
    setEditingTitle(conv.title);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !listening) {
      e.preventDefault();
      handleSend();
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="fixed inset-0 bg-midnight flex flex-col">
      {/* HEADER */}
        <header className="sticky top-0 z-10 h-14 border-b border-white/10 flex items-center px-4 bg-midnight/90 backdrop-blur-lg shrink-0">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 text-gray-400 hover:text-gold-500 transition-colors rounded-lg hover:bg-white/5"
            aria-label="Ouvrir l'historique des conversations"
          >
            <Menu className="w-5 h-5" />
          </button>
          
          <div className="flex-1 text-center">
            <h1 className="text-base font-serif text-gold-500">SOVEREIGN AI</h1>
            <p className="text-[9px] text-gold-500/60 uppercase tracking-widest hidden sm:block">Executive Mode</p>
          </div>
          
          <Link 
            href="/" 
            className="p-2 text-gray-400 hover:text-gold-500 transition-colors rounded-lg hover:bg-white/5"
            aria-label="Retour au tableau de bord"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </header>

      {/* SIDEBAR - identique à avant */}
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
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-80 bg-midnight z-50 border-r border-white/10 flex flex-col"
            >
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
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Rechercher..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-gold-500 text-ivory placeholder:text-gray-500"
                  />
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
                {filteredConversations.map(conv => (
                  <div key={conv.id} className={`group p-3 rounded-xl cursor-pointer transition-all ${currentConversationId === conv.id ? "bg-gold-500/10 border border-gold-500/30" : "hover:bg-white/5 border border-transparent"}`}>
                    <div className="flex items-center justify-between">
                      <div onClick={() => setCurrentConversationId(conv.id)} className="flex-1 min-w-0">
                        {editingTitleId === conv.id ? (
                          <div className="flex items-center gap-2">
                            <input type="text" value={editingTitle} onChange={(e) => setEditingTitle(e.target.value)} className="flex-1 bg-white/10 border border-gold-500 rounded-md px-2 py-1 text-sm focus:outline-none" autoFocus onKeyDown={(e) => { if (e.key === 'Enter') updateConversationTitle(conv.id, editingTitle); if (e.key === 'Escape') setEditingTitleId(null); }} />
                            <button onClick={() => updateConversationTitle(conv.id, editingTitle)} className="text-emerald-400"><Check className="w-3 h-3" /></button>
                            <button onClick={() => setEditingTitleId(null)} className="text-red-400"><X className="w-3 h-3" /></button>
                          </div>
                        ) : (
                          <>
                            <p className="text-sm truncate">{conv.title || "Nouvelle conversation"}</p>
                            <p className="text-xs text-gray-500 mt-1">{formatDate(conv.updated_at)}</p>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={(e) => { e.stopPropagation(); startEditTitle(conv); }} className="p-1 text-gray-500 hover:text-gold-500"><Edit2 className="w-3 h-3" /></button>
                        <button onClick={(e) => { e.stopPropagation(); deleteConversation(conv.id); }} className="p-1 text-gray-500 hover:text-red-400"><Trash2 className="w-3 h-3" /></button>
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
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed ${m.role === "user" ? "bg-gold-500 text-midnight rounded-br-none" : "bg-white/10 text-ivory border border-white/5 rounded-bl-none"}`}>
              {m.content}
              {m.files && m.files.length > 0 && (
                <div className="mt-2 pt-2 border-t border-white/10">
                  {m.files.map((file, idx) => (
                    <a key={idx} href={file.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs text-gold-500 hover:underline">
                      <File className="w-3 h-3" /> {file.name}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        ))}
        
        {isLoading && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-start">
            <div className="bg-white/10 p-4 rounded-2xl rounded-bl-none"><Loader2 className="w-4 h-4 text-gold-500 animate-spin" /></div>
          </motion.div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* ZONE DE SAISIE AVEC UPLOAD ET MICRO */}
      <div className="shrink-0 p-4 border-t border-white/10 bg-midnight/90 backdrop-blur-lg">
        {/* Fichiers en attente d'upload */}
        {uploadedFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {uploadedFiles.map((file, idx) => (
              <div key={idx} className="flex items-center gap-2 bg-white/10 rounded-full px-3 py-1 text-xs">
                <File className="w-3 h-3" />
                <span className="truncate max-w-[150px]">{file.name}</span>
                <button onClick={() => removeFile(idx)} className="text-gray-400 hover:text-red-400"><XCircle className="w-3 h-3" /></button>
              </div>
            ))}
          </div>
        )}
        
        {/* Barre de saisie principale */}
        <div className="relative max-w-4xl mx-auto flex items-center gap-2">
          {/* Bouton upload de fichier */}
          <div {...getRootProps()} className="cursor-pointer">
            <input {...getInputProps()} />
            <button type="button" className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors" title="Joindre un fichier">
              <Paperclip className="w-5 h-5 text-gray-400" />
            </button>
          </div>
          
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={listening ? "🎤 Écoute en cours..." : "Écris ton message... (Entrée pour envoyer)"}
            className="flex-1 bg-white/10 border border-white/20 rounded-full py-3 px-5 pr-24 text-sm focus:outline-none focus:border-gold-500 transition-all text-ivory placeholder:text-gray-500"
          />
          
          {/* Bouton micro */}
          {browserSupportsSpeechRecognition && (
            <button
              onMouseDown={startListening}
              onMouseUp={stopListening}
              onTouchStart={startListening}
              onTouchEnd={stopListening}
              className={`p-2 rounded-full transition-colors ${listening ? "bg-red-500 text-white animate-pulse" : "bg-white/10 text-gray-400 hover:bg-white/20"}`}
              title="Appuyer et maintenir pour parler"
            >
              <Mic className="w-5 h-5" />
            </button>
          )}
          
          {/* Bouton envoyer */}
          <button 
            onClick={handleSend}
            disabled={(isLoading || (!input.trim() && uploadedFiles.length === 0))}
            className="absolute right-2 p-2 bg-gold-500 rounded-full text-midnight hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        {listening && (
          <p className="text-center text-xs text-gold-500 mt-2 animate-pulse">🎤 Parle maintenant... (relâche pour envoyer)</p>
        )}
      </div>
    </div>
  );
}
