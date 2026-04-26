"use client";
import { useState, useRef, useEffect } from "react";
import { Send, ArrowLeft, Plus, MessageSquare, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

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
  created_at?: string;
};

export default function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Charger la liste des conversations
  useEffect(() => {
    fetchConversations();
  }, []);

  // Charger les messages d'une conversation
  useEffect(() => {
    if (currentConversationId) {
      fetchMessages(currentConversationId);
    }
  }, [currentConversationId]);

  // Auto-scroll
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  async function fetchConversations() {
    const { data } = await supabase
      .from("conversations")
      .select("*")
      .order("updated_at", { ascending: false });
    
    setConversations(data || []);
    
    // Si aucune conversation, en créer une nouvelle
    if (!data || data.length === 0) {
      createNewConversation();
    } else {
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
      setMessages(data);
    } else {
      // Message de bienvenue par défaut
      setMessages([{ role: "assistant", content: "Bonjour Rebecca. Que veux-tu qu'on attaque aujourd'hui ?" }]);
    }
  }

  async function createNewConversation() {
    const { data, error } = await supabase
      .from("conversations")
      .insert({
        title: `Nouvelle conversation ${new Date().toLocaleDateString('fr-FR')}`,
        user_id: "rebecca"
      })
      .select()
      .single();
    
    if (!error && data) {
      setConversations([data, ...conversations]);
      setCurrentConversationId(data.id);
      setMessages([{ role: "assistant", content: "Bonjour Rebecca. Que veux-tu qu'on attaque aujourd'hui ?" }]);
    }
  }

  async function deleteConversation(id: string) {
    if (confirm("Supprimer cette conversation ?")) {
      const { error } = await supabase.from("conversations").delete().eq("id", id);
      if (!error) {
        const newConversations = conversations.filter(c => c.id !== id);
        setConversations(newConversations);
        if (newConversations.length > 0) {
          setCurrentConversationId(newConversations[0].id);
        } else {
          createNewConversation();
        }
      }
    }
  }

  async function saveMessage(conversationId: string, role: string, content: string) {
    await supabase.from("conversation_messages").insert({
      conversation_id: conversationId,
      role: role,
      content: content
    });
    
    // Mettre à jour le updated_at de la conversation
    await supabase
      .from("conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversationId);
  }

  const handleSend = async () => {
    if (!input.trim() || isLoading || !currentConversationId) return;
    
    const userMessage = { role: "user" as const, content: input };
    const allMessages = [...messages, userMessage]; // ✅ TOUT l'historique est envoyé
    
    setMessages(prev => [...prev, userMessage]);
    await saveMessage(currentConversationId, "user", input);
    setInput("");
    setIsLoading(true);

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
      
      // Rafraîchir la liste des conversations pour mettre à jour l'ordre
      fetchConversations();
    } catch (error) {
      console.error("Erreur:", error);
      const errorMessage = "Erreur de connexion. Vérifie que le backend est bien démarré.";
      setMessages(prev => [...prev, { role: "assistant", content: errorMessage }]);
      await saveMessage(currentConversationId, "assistant", errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) return "Aujourd'hui";
    if (date.toDateString() === yesterday.toDateString()) return "Hier";
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="flex h-screen bg-midnight text-ivory">
      {/* SIDEBAR DES CONVERSATIONS */}
      <div className={`${isSidebarOpen ? 'w-80' : 'w-0'} transition-all duration-300 overflow-hidden border-r border-white/10 bg-midnight/50`}>
        <div className="p-4 h-full flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm font-serif text-gold-500">Conversations</h2>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="p-1 text-gray-500 hover:text-gold-500 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
          
          <button
            onClick={createNewConversation}
            className="w-full mb-4 flex items-center justify-center gap-2 bg-gold-500/20 hover:bg-gold-500/30 text-gold-500 py-2 rounded-xl transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            Nouvelle conversation
          </button>
          
          <div className="flex-1 overflow-y-auto space-y-2">
            {conversations.map(conv => (
              <div
                key={conv.id}
                onClick={() => setCurrentConversationId(conv.id)}
                className={`group p-3 rounded-xl cursor-pointer transition-all ${
                  currentConversationId === conv.id
                    ? "bg-gold-500/10 border border-gold-500/30"
                    : "hover:bg-white/5 border border-transparent"
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{conv.title || "Nouvelle conversation"}</p>
                    <p className="text-xs text-gray-500 mt-1">{formatDate(conv.updated_at)}</p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteConversation(conv.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-500 hover:text-red-400 transition-all"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ZONE PRINCIPALE DU CHAT */}
      <div className="flex-1 flex flex-col">
        {/* HEADER */}
        <header className="sticky top-0 z-10 h-16 border-b border-white/5 flex items-center px-4 bg-midnight/80 backdrop-blur-lg shrink-0">
          {!isSidebarOpen && (
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="mr-3 p-1 text-gray-500 hover:text-gold-500 transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}
          <Link href="/" className="text-gray-400 hover:text-gold-500 mr-4 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1">
            <h1 className="text-lg font-serif text-ivory">Sovereign AI</h1>
            <p className="text-[10px] text-gold-500 uppercase tracking-widest">Executive Mode</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-xs text-gold-500/60 hidden sm:inline">EN LIGNE</span>
          </div>
        </header>

        {/* ZONE DES MESSAGES */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div className={`max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed ${
                m.role === "user" 
                  ? "bg-gold-500 text-midnight rounded-br-none" 
                  : "bg-white/10 text-ivory border border-white/5 rounded-bl-none"
              }`}>
                {m.content}
              </div>
            </motion.div>
          ))}
          
          {isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-start"
            >
              <div className="bg-white/10 p-4 rounded-2xl rounded-bl-none">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-gold-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 bg-gold-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 bg-gold-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </motion.div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* BARRE DE SAISIE */}
        <div className="shrink-0 p-4 border-t border-white/10 bg-midnight/80 backdrop-blur-lg">
          <div className="relative max-w-4xl mx-auto flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Écris ton message..."
              className="flex-1 bg-white/10 border border-white/20 rounded-full py-3 px-5 pr-12 text-sm focus:outline-none focus:border-gold-500 transition-all text-ivory placeholder:text-gray-500"
            />
            <button 
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="absolute right-2 p-2 bg-gold-500 rounded-full text-midnight hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
