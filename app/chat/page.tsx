"use client";
import { useState, useRef, useEffect } from "react";
import ReactMarkdown from 'react-markdown';
import "regenerator-runtime/runtime";
import { 
  Send, ArrowLeft, Plus, Trash2, ChevronLeft, ChevronRight, 
  Search, Edit2, Check, X, Loader2, Menu, Mic, Paperclip, 
  File, XCircle, Image as ImageIcon
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
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  // Scroll auto
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages]);

  // Focus input
  useEffect(() => {
    if (currentConversationId && inputRef.current) {
      inputRef.current.focus();
    }
  }, [currentConversationId]);

  // Fermer sidebar sur mobile
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
    },
    maxSize: 10 * 1024 * 1024
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
    
    // Construire le message avec les fichiers
    let userMessageContent = input.trim() || "📎 Fichier(s) joint(s)";
    
    // Ajouter les URLs des images pour que l'IA puisse les "voir"
    const imageFiles = uploadedFilesData.filter(f => f.type.startsWith('image/'));
    if (imageFiles.length > 0) {
      userMessageContent += "\n\n📸 Images jointes:\n" + imageFiles.map(f => f.url).join("\n");
    }
    
    // Ajouter les autres fichiers
    const otherFiles = uploadedFilesData.filter(f => !f.type.startsWith('image/'));
    if (otherFiles.length > 0) {
      userMessageContent += "\n\n📎 Autres fichiers:\n" + otherFiles.map(f => `- ${f.name}: ${f.url}`).join("\n");
    }
    
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
      const response = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          messages: allMessages.map(msg => ({
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
    SpeechRecognition.startListening({ continuous: false, language: 'fr-FR' });
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
        >
          <Menu className="w-5 h-5" />
        </button>
        
        <div className="flex-1 text-center">
          <h1 className="text-base font-serif text-gold-500">SOVEREIGN AI</h1>
          <p className="text-[9px] text-gold-500/60 uppercase tracking-widest hidden sm:block">Executive Mode</p>
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
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
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
                    
                    {/* Message texte */}
                    <ReactMarkdown
                      components={{
                        img: ({ node, ...props }) => (
                          <img 
                            {...props} 
                            className="rounded-xl max-w-full max-h-96 object-contain my-2 border border-white/10" 
                            loading="lazy"
                          />
                        ),
                        a: ({ node, ...props }) => (
                          <a {...props} className="text-gold-500 hover:underline" target="_blank" rel="noopener noreferrer" />
                        ),
                        p: ({ node, ...props }) => (
                          <p className="mb-2 last:mb-0" {...props} />
                        ),
                      }}
                    >
                      {m.content}
                    </ReactMarkdown>                    
                    {/* Images affichées directement */}
                    {m.files && m.files.length > 0 && (
                      <div className="mt-3">
                        {/* Images - affichées en aperçu */}
                        <div className="grid grid-cols-2 gap-2">
                          {m.files.filter(f => f.type.startsWith('image/')).map((file, idx) => (
                            <a key={idx} href={file.url} target="_blank" rel="noopener noreferrer" className="block">
                              <img 
                                src={file.url} 
                                alt={file.name}
                                className="rounded-xl w-full h-auto max-h-48 object-cover border border-white/10 hover:border-gold-500 transition-all"
                              />
                            </a>
                          ))}
                        </div>
                        
                        {/* Autres fichiers (PDF, etc.) - liens */}
                        {m.files.filter(f => !f.type.startsWith('image/')).length > 0 && (
                          <div className="mt-2 pt-2 border-t border-white/10">
                            {m.files.filter(f => !f.type.startsWith('image/')).map((file, idx) => (
                              <a key={idx} href={file.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs text-gold-500 hover:underline mt-1">
                                <File className="w-3 h-3" />
                                {file.name}
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

      {/* BARRE DE SAISIE - VERSION MOBILE OPTIMISÉE */}
      <div className="shrink-0 p-3 border-t border-white/10 bg-midnight/90 backdrop-blur-lg">
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
        {listening && (
          <div className="text-center text-xs text-red-400 animate-pulse mb-2">
            🎤 Parle... relâche pour envoyer
          </div>
        )}
        
             {/* Barre de saisie principale */}
            <div className="flex items-center gap-2">
              {/* Select pour choisir entre upload et micro */}
              <div className="relative">
                <select
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === "upload") {
                      document.getElementById('file-upload-input')?.click();
                    } else if (value === "micro") {
                      startListening();
                    }
                    // Remettre la valeur par défaut
                    e.target.value = "";
                  }}
                  className="bg-white/10 border border-white/20 rounded-full px-3 py-2 text-sm text-gold-500 focus:outline-none focus:border-gold-500 cursor-pointer"
                  defaultValue=""
                >
                  <option value="" disabled>📎 Actions</option>
                  <option value="upload">📎 Joindre un fichier</option>
                  {browserSupportsSpeechRecognition && (
                    <option value="micro">🎤 Dictée vocale</option>
                  )}
                </select>
                
                {/* Input file caché */}
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
              </div>
              
              {/* Champ de saisie */}
              <div className="relative flex-1">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Écris ton message..."
                  className={`w-full bg-white/10 border rounded-full py-3 px-4 pr-12 text-sm focus:outline-none focus:border-gold-500 text-ivory placeholder:text-gray-500 ${listening ? "border-red-500" : "border-white/20"}`}
                />
                
                {/* Bouton envoyer */}
                <button
                  onClick={handleSend}
                  disabled={(!input.trim() && uploadedFiles.length === 0) || isLoading}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-gold-500 rounded-full disabled:opacity-50 transition-all"
                >
                  <Send className="w-4 h-4 text-midnight" />
                </button>
              </div>
            </div>
            
            {/* Indicateur d'enregistrement vocal */}
            {listening && (
              <div className="text-center text-xs text-red-400 animate-pulse mt-2">
                🎤 Enregistrement en cours... relâchez le micro pour envoyer
              </div>
            )}
        
      </div>
    </div>
  );
}
