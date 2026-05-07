"use client";
import { useState } from "react";
import { Send, Loader2 } from "lucide-react";
import { toast } from "sonner";

const API_URL = "https://sovereign-bridge.onrender.com";

export default function EmailPage() {
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    if (!to || !subject || !body) {
      toast.error("Tous les champs sont requis");
      return;
    }

    setIsSending(true);
    try {
      const response = await fetch(`${API_URL}/api/email/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, subject, body })
      });
      
      const data = await response.json();
      if (data.success) {
        toast.success("Email envoyé avec succès !");
        setTo("");
        setSubject("");
        setBody("");
      } else {
        toast.error("Erreur: " + data.error);
      }
    } catch (error) {
      toast.error("Erreur de connexion");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-serif text-gold-500">📧 Email Command</h1>
        <p className="text-gray-500 mt-2">Envoi d'emails via Brevo</p>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Destinataire</label>
            <input
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="exemple@email.com"
              className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-ivory focus:outline-none focus:border-gold-500"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Sujet</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Sujet de l'email"
              className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-ivory focus:outline-none focus:border-gold-500"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Message (HTML supporté)</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Écris ton message ici...&lt;br&gt;Tu peux utiliser du HTML"
              rows={8}
              className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-ivory focus:outline-none focus:border-gold-500 resize-none font-mono text-sm"
            />
          </div>

          <button
            onClick={handleSend}
            disabled={isSending}
            className="w-full bg-gold-500 text-midnight py-3 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-gold-400 transition-colors disabled:opacity-50"
          >
            {isSending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
            Envoyer l'email
          </button>
        </div>
      </div>
    </div>
  );
}
