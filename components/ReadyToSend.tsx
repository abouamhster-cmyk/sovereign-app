"use client";
import { useState } from "react";
import { Copy, Check, Send, Mail, FileText, Briefcase, Megaphone, Bell } from "lucide-react";
import { toast } from "sonner";

const API_URL = "https://sovereign-bridge.onrender.com";

type DocType = "email" | "letter" | "proposal" | "social" | "reminder";

interface ReadyToSendProps {
  onInsert?: (text: string) => void;
  className?: string;
}

export function ReadyToSend({ onInsert, className = "" }: ReadyToSendProps) {
  const [docType, setDocType] = useState<DocType>("email");
  const [context, setContext] = useState("");
  const [tone, setTone] = useState("professional");
  const [recipient, setRecipient] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generated, setGenerated] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  const typeConfig: Record<DocType, { label: string; icon: any; placeholder: string }> = {
    email: { label: "📧 Email", icon: Mail, placeholder: "À qui ? Pourquoi ? Ce que tu veux dire..." },
    letter: { label: "📄 Lettre", icon: FileText, placeholder: "À qui ? Sujet ? Informations importantes..." },
    proposal: { label: "📋 Proposition", icon: Briefcase, placeholder: "Pour quel projet ? Budget ? Délais ?..." },
    social: { label: "📱 Post social", icon: Megaphone, placeholder: "Sujet ? Platforme ? Message principal..." },
    reminder: { label: "🔔 Rappel", icon: Bell, placeholder: "Quoi ? Pour qui ? Quand ?..." }
  };

  const CurrentIcon = typeConfig[docType].icon;

  async function generate() {
    if (!context.trim()) {
      toast.error("Ajoute un contexte");
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch(`${API_URL}/api/generate/ready-to-send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: docType,
          context,
          tone,
          recipient
        })
      });
      const data = await response.json();
      if (data.success) {
        setGenerated(data.generated);
        toast.success("Document généré !");
      } else {
        toast.error("Erreur: " + data.error);
      }
    } catch (error) {
      toast.error("Erreur de connexion");
    } finally {
      setIsGenerating(false);
    }
  }

  async function copyToClipboard() {
    if (generated) {
      const text = generated.full_text || generated.body;
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Copié !");
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function insertToChat() {
    if (generated && onInsert) {
      const text = generated.full_text || generated.body;
      onInsert(text);
      toast.success("Inséré dans le chat");
    }
  }

  return (
    <div className={`bg-white/5 border border-white/10 rounded-2xl p-5 ${className}`}>
      <h3 className="text-lg font-serif text-gold-500 mb-4 flex items-center gap-2">
        <CurrentIcon className="w-5 h-5" />
        Génération prête à envoyer
      </h3>

      <div className="flex flex-wrap gap-2 mb-4">
        {(Object.entries(typeConfig) as [DocType, any][]).map(([key, conf]) => (
          <button
            key={key}
            onClick={() => setDocType(key)}
            className={`px-3 py-1.5 rounded-full text-xs transition-colors ${
              docType === key ? "bg-gold-500/20 text-gold-500" : "bg-white/5 text-gray-400 hover:bg-white/10"
            }`}
          >
            {conf.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <span className="text-xs text-gray-500 mr-2">Ton :</span>
        {["professional", "warm", "direct", "persuasive"].map(t => (
          <button
            key={t}
            onClick={() => setTone(t)}
            className={`px-3 py-1 rounded-full text-xs transition-colors ${
              tone === t ? "bg-gold-500/20 text-gold-500" : "bg-white/5 text-gray-400 hover:bg-white/10"
            }`}
          >
            {t === "professional" && "🎩 Professionnel"}
            {t === "warm" && "❤️ Chaleureux"}
            {t === "direct" && "⚡ Direct"}
            {t === "persuasive" && "🎯 Persuasif"}
          </button>
        ))}
      </div>

      <input
        type="text"
        placeholder="Destinataire (optionnel)"
        value={recipient}
        onChange={(e) => setRecipient(e.target.value)}
        className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-2 text-sm text-ivory placeholder:text-gray-500 focus:outline-none focus:border-gold-500 mb-4"
      />

      <textarea
        placeholder={typeConfig[docType].placeholder}
        value={context}
        onChange={(e) => setContext(e.target.value)}
        className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-sm text-ivory placeholder:text-gray-500 focus:outline-none focus:border-gold-500 resize-none"
        rows={4}
      />

      <button
        onClick={generate}
        disabled={isGenerating || !context.trim()}
        className="w-full mt-4 py-2 bg-gold-500 text-midnight rounded-xl font-medium hover:bg-gold-400 transition-colors disabled:opacity-50"
      >
        {isGenerating ? "Génération..." : "✨ Générer"}
      </button>

      {generated && (
        <div className="mt-4 p-4 bg-black/30 rounded-xl">
          {generated.subject && (
            <div className="mb-3 pb-2 border-t border-white/10">
              <span className="text-xs text-gray-500">Objet :</span>
              <p className="text-sm text-gold-500 font-medium">{generated.subject}</p>
            </div>
          )}
          <div className="mb-3">
            <span className="text-xs text-gray-500">Message :</span>
            <pre className="text-sm text-ivory whitespace-pre-wrap font-sans mt-1">{generated.body}</pre>
          </div>
          {generated.signature && (
            <div className="pt-2 border-t border-white/10">
              <pre className="text-sm text-gray-400 whitespace-pre-wrap font-sans">{generated.signature}</pre>
            </div>
          )}
          <div className="flex gap-3 mt-4">
            <button
              onClick={copyToClipboard}
              className="flex-1 py-2 bg-white/10 rounded-lg text-sm flex items-center justify-center gap-2 hover:bg-white/20 transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              Copier
            </button>
            {onInsert && (
              <button
                onClick={insertToChat}
                className="flex-1 py-2 bg-gold-500/20 text-gold-500 rounded-lg text-sm flex items-center justify-center gap-2 hover:bg-gold-500/30 transition-colors"
              >
                <Send className="w-4 h-4" />
                Insérer dans le chat
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
