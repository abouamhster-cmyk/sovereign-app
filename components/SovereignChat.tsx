"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, User, Bot } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function SovereignChat() {
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Bonjour Rebecca. Je suis prêt à commander l'Empire avec vous. Que faisons-nous ?" }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll vers le bas
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // CONNEXION À TON BACKEND RENDER
      const response = await fetch("https://sovereign-bridge.onrender.com/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage]
        }),
      });

      const data = await response.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    } catch (error) {
      setMessages((prev) => [...prev, { role: "assistant", content: "Désolé Rebecca, j'ai une difficulté de connexion à l'infrastructure." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[500px] w-[400px] bg-white/5 border border-white/10 rounded-3xl backdrop-blur-2xl shadow-2xl overflow-hidden">
      {/* Header du Chat */}
      <div className="p-4 border-b border-white/10 bg-gold-500/5 flex items-center space-x-3">
        <div className="bg-gold-500 p-2 rounded-full">
          <Sparkles className="w-4 h-4 text-midnight" />
        </div>
        <div>
          <div className="text-sm font-bold text-ivory tracking-tight">SOVEREIGN AI</div>
          <div className="text-[10px] text-gold-500 uppercase tracking-widest">Executive Mode</div>
        </div>
      </div>

      {/* Zone des messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
        {messages.map((m, i) => (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            key={i}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${
              m.role === "user" 
              ? "bg-gold-600 text-ivory rounded-tr-none" 
              : "bg-white/10 text-ivory border border-white/5 rounded-tl-none"
            }`}>
              {m.content}
            </div>
          </motion.div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white/5 p-3 rounded-2xl animate-pulse text-xs text-gray-500">
              Sovereign réfléchit...
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 bg-midnight/50">
        <div className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Écrivez un ordre..."
            className="w-full bg-white/5 border border-white/10 rounded-full py-3 px-5 pr-12 text-sm focus:outline-none focus:border-gold-500 transition-all text-ivory placeholder:text-gray-600"
          />
          <button 
            onClick={handleSend}
            className="absolute right-2 p-2 bg-gold-500 rounded-full text-midnight hover:scale-105 transition-transform"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}