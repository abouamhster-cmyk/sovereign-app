"use client";
import { useState, useRef, useEffect } from "react";
import { Send, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";

const API_URL = "https://sovereign-bridge.onrender.com";

export default function ChatPage() {
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Bonjour Rebecca. Que veux-tu qu'on attaque aujourd'hui ?" }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll vers le bas quand nouveau message
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    
    const userMessage = { role: "user", content: input };
    const allMessages = [...messages, userMessage];
    
    setMessages(prev => [...prev, userMessage]);
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
        const errorText = await response.text();
        console.error("Erreur backend:", response.status, errorText);
        throw new Error(`Erreur ${response.status}`);
      }
      
      const data = await response.json();
      setMessages(prev => [...prev, { role: "assistant", content: data.reply }]);
    } catch (error) {
      console.error("Erreur:", error);
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: "Erreur de connexion. Vérifie que le backend est bien démarré." 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-midnight text-ivory">
      {/* HEADER - FIXE EN HAUT */}
      <header className="sticky top-0 z-10 h-16 border-b border-white/5 flex items-center px-6 bg-midnight/80 backdrop-blur-lg shrink-0">
        <Link href="/" className="text-gray-400 hover:text-gold-500 mr-4 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-lg font-serif text-ivory">Sovereign AI</h1>
          <p className="text-[10px] text-gold-500 uppercase tracking-widest">Executive Mode</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-xs text-gold-500/60 hidden sm:inline">EN LIGNE</span>
        </div>
      </header>

      {/* ZONE DES MESSAGES - SCROLLABLE */}
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
        
        {/* Ancre pour le scroll automatique */}
        <div ref={messagesEndRef} />
      </div>

      {/* BARRE DE SAISIE - FIXE EN BAS */}
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
  );
}