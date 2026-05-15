"use client";
import { useState } from "react";
import { Scale, TrendingUp, Target, Battery, Heart, Clock, ThumbsUp } from "lucide-react";
import { toast } from "sonner";

const API_URL = "https://sovereign-bridge.onrender.com";

interface DecisionModeProps {
  onInsert?: (text: string) => void;
  className?: string;
}

export function DecisionMode({ onInsert, className = "" }: DecisionModeProps) {
  const [optionA, setOptionA] = useState("");
  const [optionB, setOptionB] = useState("");
  const [context, setContext] = useState("");
  const [isComparing, setIsComparing] = useState(false);
  const [result, setResult] = useState<any>(null);

  async function compare() {
    if (!optionA.trim() || !optionB.trim()) {
      toast.error("Remplis les deux options");
      return;
    }

    setIsComparing(true);
    try {
      const response = await fetch(`${API_URL}/api/decide/compare`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ option_a: optionA, option_b: optionB, context })
      });
      const data = await response.json();
      if (data.success) {
        setResult(data.comparison);
        toast.success("Analyse terminée !");
      } else {
        toast.error("Erreur: " + data.error);
      }
    } catch (error) {
      toast.error("Erreur de connexion");
    } finally {
      setIsComparing(false);
    }
  }

  function reset() {
    setOptionA("");
    setOptionB("");
    setContext("");
    setResult(null);
  }

  const getScoreColor = (score: number) => {
    if (score >= 70) return "text-emerald-400";
    if (score >= 50) return "text-yellow-400";
    return "text-red-400";
  };

  return (
    <div className={`bg-white/5 border border-white/10 rounded-2xl p-5 ${className}`}>
      <h3 className="text-lg font-serif text-gold-500 mb-4 flex items-center gap-2">
        <Scale className="w-5 h-5" />
        Decision Mode
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="text-sm text-gray-400 mb-1 block">Option A</label>
          <textarea
            placeholder="Ex: Lancer le programme pilote maintenant"
            value={optionA}
            onChange={(e) => setOptionA(e.target.value)}
            className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-sm text-ivory placeholder:text-gray-500 focus:outline-none focus:border-gold-500 resize-none"
            rows={3}
          />
        </div>
        <div>
          <label className="text-sm text-gray-400 mb-1 block">Option B</label>
          <textarea
            placeholder="Ex: Attendre le financement avant de lancer"
            value={optionB}
            onChange={(e) => setOptionB(e.target.value)}
            className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-sm text-ivory placeholder:text-gray-500 focus:outline-none focus:border-gold-500 resize-none"
            rows={3}
          />
        </div>
      </div>

      <textarea
        placeholder="Contexte (optionnel) : Délais, budget, équipe..."
        value={context}
        onChange={(e) => setContext(e.target.value)}
        className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-sm text-ivory placeholder:text-gray-500 focus:outline-none focus:border-gold-500 resize-none mb-4"
        rows={2}
      />

      <div className="flex gap-3">
        <button
          onClick={compare}
          disabled={isComparing || !optionA || !optionB}
          className="flex-1 py-2 bg-gold-500 text-midnight rounded-xl font-medium hover:bg-gold-400 transition-colors disabled:opacity-50"
        >
          {isComparing ? "Analyse en cours..." : "⚖️ Comparer"}
        </button>
        <button
          onClick={reset}
          className="px-4 py-2 bg-white/10 rounded-xl text-gray-400 hover:bg-white/20 transition-colors"
        >
          Effacer
        </button>
      </div>

      {result && (
        <div className="mt-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-black/30 rounded-xl p-4 text-center">
              <p className="text-xs text-gray-500 mb-1">Option A</p>
              <p className={`text-3xl font-bold ${getScoreColor(result.analysis?.option_a?.score || 0)}`}>
                {result.analysis?.option_a?.score || 0}
              </p>
              <div className="w-full bg-white/10 rounded-full h-1.5 mt-2">
                <div className="bg-gold-500 h-1.5 rounded-full" style={{ width: `${Math.min(100, (result.analysis?.option_a?.score || 0))}%` }} />
              </div>
            </div>
            <div className="bg-black/30 rounded-xl p-4 text-center">
              <p className="text-xs text-gray-500 mb-1">Option B</p>
              <p className={`text-3xl font-bold ${getScoreColor(result.analysis?.option_b?.score || 0)}`}>
                {result.analysis?.option_b?.score || 0}
              </p>
              <div className="w-full bg-white/10 rounded-full h-1.5 mt-2">
                <div className="bg-gold-500 h-1.5 rounded-full" style={{ width: `${Math.min(100, (result.analysis?.option_b?.score || 0))}%` }} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-emerald-500/5 rounded-xl p-4">
              <p className="text-xs text-emerald-400 mb-2">✅ Points forts - Option A</p>
              <ul className="space-y-1">
                {result.analysis?.option_a?.pros?.map((pro: string, i: number) => (
                  <li key={i} className="text-xs text-gray-300">• {pro}</li>
                ))}
              </ul>
              <p className="text-xs text-red-400 mt-3 mb-2">❌ Points faibles - Option A</p>
              <ul className="space-y-1">
                {result.analysis?.option_a?.cons?.map((con: string, i: number) => (
                  <li key={i} className="text-xs text-gray-300">• {con}</li>
                ))}
              </ul>
            </div>
            <div className="bg-emerald-500/5 rounded-xl p-4">
              <p className="text-xs text-emerald-400 mb-2">✅ Points forts - Option B</p>
              <ul className="space-y-1">
                {result.analysis?.option_b?.pros?.map((pro: string, i: number) => (
                  <li key={i} className="text-xs text-gray-300">• {pro}</li>
                ))}
              </ul>
              <p className="text-xs text-red-400 mt-3 mb-2">❌ Points faibles - Option B</p>
              <ul className="space-y-1">
                {result.analysis?.option_b?.cons?.map((con: string, i: number) => (
                  <li key={i} className="text-xs text-gray-300">• {con}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="bg-gold-500/10 border border-gold-500/20 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <ThumbsUp className="w-4 h-4 text-gold-500" />
              <p className="text-sm font-medium text-gold-500">Recommandation</p>
            </div>
            <p className="text-ivory text-sm mb-2">
              {result.recommendation === "option_a" ? "✅ Option A" : "✅ Option B"}
            </p>
            <p className="text-gray-300 text-sm">{result.recommendation_reason}</p>
            <p className="text-xs text-gold-500 mt-3 pt-2 border-t border-gold-500/20">
              🎯 Prochaine action : {result.next_action}
            </p>
          </div>

          {onInsert && (
            <button
              onClick={() => onInsert(JSON.stringify(result, null, 2))}
              className="w-full py-2 bg-white/10 rounded-lg text-sm text-gray-300 hover:bg-white/20 transition-colors"
            >
              📋 Insérer l'analyse dans le chat
            </button>
          )}
        </div>
      )}
    </div>
  );
}
