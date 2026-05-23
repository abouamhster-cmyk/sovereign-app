"use client";

import { useState } from "react";
import { Sparkles, Send, Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface Suggestion {
  text: string;
  style: string;
  emoji: string;
}

interface WhatsAppSuggestionsProps {
  message: string;
  contactName: string;
  contactNumber: string;
  onSend?: (text: string) => void;
}

const API_URL = "https://sovereign-bridge.onrender.com";

export function WhatsAppSuggestions({ message, contactName, contactNumber, onSend }: WhatsAppSuggestionsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [analysis, setAnalysis] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [quickActions, setQuickActions] = useState<string[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const fetchSuggestions = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/whatsapp/suggest-reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, contact_name: contactName })
      });
      const data = await response.json();
      
      if (data.success) {
        setAnalysis(data.analysis);
        setSuggestions(data.suggestions || []);
        setQuickActions(data.quick_actions || []);
      } else {
        toast.error(data.error || "Erreur lors de la génération");
      }
    } catch (error) {
      toast.error("Erreur de connexion");
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    toast.success("Copié !");
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const sendMessage = async (text: string) => {
    if (onSend) {
      onSend(text);
    } else {
      try {
        const response = await fetch(`${API_URL}/api/whatsapp/reply`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ to: contactNumber, message: text })
        });
        const result = await response.json();
        if (result.success) {
          toast.success(`✅ Réponse envoyée à ${contactName}`);
        } else {
          toast.error("❌ Erreur d'envoi");
        }
      } catch (error) {
        toast.error("Erreur de connexion");
      }
    }
  };

  return (
    <div className="bg-white/5 border border-gold-500/30 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-serif text-gold-500 flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          Réponses suggérées
        </h3>
        <button
          onClick={fetchSuggestions}
          disabled={isLoading}
          className="text-xs bg-gold-500/20 text-gold-500 px-3 py-1 rounded-full hover:bg-gold-500/30 transition-colors disabled:opacity-50"
        >
          {isLoading ? "Analyse..." : "Analyser"}
        </button>
      </div>

      {analysis && (
        <div className="mb-3 p-2 bg-black/30 rounded-lg">
          <p className="text-xs text-gray-400">📊 {analysis}</p>
        </div>
      )}

      {suggestions.length > 0 && (
        <div className="space-y-2 mb-3">
          <p className="text-xs text-gray-500">⚡ Réponses suggérées :</p>
          {suggestions.map((sugg, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <button
                onClick={() => sendMessage(sugg.text)}
                className="flex-1 text-left p-2 bg-white/10 rounded-lg hover:bg-gold-500/20 transition-colors text-sm text-ivory"
              >
                <span className="mr-2">{sugg.emoji}</span>
                {sugg.text}
                <span className="text-xs text-gray-500 ml-2">({sugg.style})</span>
              </button>
              <button
                onClick={() => copyToClipboard(sugg.text, idx)}
                className="p-2 rounded-lg bg-white/5 text-gray-400 hover:text-gold-500"
              >
                {copiedIndex === idx ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          ))}
        </div>
      )}

      {quickActions.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-2 border-t border-white/10">
          {quickActions.map((action, idx) => (
            <button
              key={idx}
              onClick={() => sendMessage(action)}
              className="text-xs px-3 py-1 bg-white/5 rounded-full hover:bg-gold-500/20 transition-colors"
            >
              {action}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
