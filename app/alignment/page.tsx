"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";
import { 
  ShieldAlert, Sparkles, Anchor, Heart, Star, 
  Calendar, Quote, Crown, Zap, Moon, Sun, Plus,
  Trophy, Smile, Award
} from "lucide-react";
import Link from "next/link";

type Win = {
  id: string;
  title: string;
  category: string;
  date: string;
  celebration_emoji: string | null;
  notes: string | null;
  created_at: string;
};

export default function AlignmentPage() {
  const [wins, setWins] = useState<Win[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentAffirmation, setCurrentAffirmation] = useState(0);
  const [energyLevel, setEnergyLevel] = useState(3);

  const affirmations = [
    "Je commande mon énergie, je ne la subis pas.",
    "Mes victoires construisent mon empire, une pierre à la fois.",
    "Je mérite le calme après la tempête.",
    "Mon intuition est ma meilleure alliée.",
    "Je célèbre mes progrès, pas seulement la perfection.",
    "Je suis exactement là où je dois être.",
    "Chaque défi que je surmonte me rend plus forte.",
    "Mon énergie est précieuse, je la protège."
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentAffirmation((prev) => (prev + 1) % affirmations.length);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

 useEffect(() => {
  fetchWins();
  
  const channel = supabase
    .channel('wins_alignment')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'wins' }, () => fetchWins())
    .subscribe();
  
  return () => {
    channel.unsubscribe();
  };
}, []);
  
  async function fetchWins() {
    setIsLoading(true);
    const { data } = await supabase
      .from("wins")
      .select("*")
      .order("date", { ascending: false })
      .limit(5);
    setWins(data || []);
    setIsLoading(false);
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
  };

  const getCelebrationEmoji = (win: Win) => {
    if (win.celebration_emoji) return win.celebration_emoji;
    const celebrations = ["🎉", "👑", "⭐", "🌟", "💪", "🔥", "✨", "🏆", "💖", "🌱"];
    return celebrations[Math.floor(Math.random() * celebrations.length)];
  };

  const getCategoryColor = (category: string) => {
    const name = category?.toLowerCase() || "";
    if (name === "business") return "bg-blue-500/20 text-blue-400";
    if (name === "family") return "bg-pink-500/20 text-pink-400";
    if (name === "personal") return "bg-purple-500/20 text-purple-400";
    if (name === "money") return "bg-emerald-500/20 text-emerald-400";
    if (name === "health") return "bg-red-500/20 text-red-400";
    if (name === "farm") return "bg-green-500/20 text-green-400";
    return "bg-gray-500/20 text-gray-400";
  };

  return (
    <div className="p-8 lg:p-12 h-full flex flex-col overflow-y-auto bg-midnight">
      <header className="mb-10">
        <div className="flex justify-between items-start">
          <div>
            <motion.h1 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl font-serif text-gold-500 tracking-tight"
            >
              Alignment Command
            </motion.h1>
            <p className="text-gray-500 mt-2 italic font-light">
              Stabilité intérieure, vérité et célébration des victoires
            </p>
          </div>
          <Link 
            href="/wins" 
            className="bg-gold-500/20 text-gold-500 px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 hover:bg-gold-500/30 transition-colors"
          >
            <Plus className="w-4 h-4" /> Voir toutes mes victoires
          </Link>
        </div>
      </header>

      {/* Affirmation du moment */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gradient-to-r from-gold-500/10 to-gold-500/5 border border-gold-500/20 rounded-3xl p-6 mb-8 text-center"
      >
        <Quote className="w-8 h-8 text-gold-500 mx-auto mb-3 opacity-60" />
        <p className="text-ivory text-lg italic font-light max-w-2xl mx-auto">
          "{affirmations[currentAffirmation]}"
        </p>
        <div className="flex justify-center gap-1 mt-4">
          {affirmations.map((_, i) => (
            <div 
              key={i}
              className={`w-1.5 h-1.5 rounded-full transition-all ${i === currentAffirmation ? "bg-gold-500 w-3" : "bg-gold-500/30"}`}
            />
          ))}
        </div>
      </motion.div>

      {/* RESCUE MODE */}
      <motion.div 
        whileHover={{ scale: 1.01 }}
        className="bg-red-950/20 border border-red-500/30 rounded-3xl p-8 mb-8 relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-1 h-full bg-red-500" />
        <div className="absolute top-4 right-4 opacity-10">
          <ShieldAlert className="w-20 h-20 text-red-500" />
        </div>
        <h2 className="text-2xl font-serif text-red-400 mb-2 flex items-center gap-3">
          <ShieldAlert className="w-6 h-6" /> RESCUE MODE
        </h2>
        <p className="text-ivory mt-4 text-lg max-w-2xl">Si tu es en surcharge, arrête tout.</p>
        <div className="mt-4 space-y-2 text-gray-400">
          <p className="flex items-center gap-2"><span className="text-red-400">1.</span> Ferme tes onglets.</p>
          <p className="flex items-center gap-2"><span className="text-red-400">2.</span> Demande à Sovereign ton unique priorité.</p>
          <p className="flex items-center gap-2"><span className="text-red-400">3.</span> Ignore le reste pour 24h.</p>
        </div>
      </motion.div>

      {/* GRILLE PRINCIPALE */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* WINS & TRUTHS */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-8">
          <h2 className="text-xl font-serif text-gold-500 mb-6 flex items-center gap-3">
            <Crown className="w-5 h-5" /> Wins & Truths
          </h2>
          
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse flex items-center gap-3 p-4 bg-white/5 rounded-xl">
                  <div className="w-8 h-8 bg-white/10 rounded-full" />
                  <div className="flex-1">
                    <div className="h-4 bg-white/10 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-white/5 rounded w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : wins.length > 0 ? (
            <div className="space-y-4">
              {wins.map((win, i) => (
                <motion.div 
                  key={win.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="group flex items-start gap-4 p-4 bg-midnight rounded-xl border border-white/5 hover:border-gold-500/30 transition-all"
                >
                  <div className="text-2xl">{getCelebrationEmoji(win)}</div>
                  <div className="flex-1">
                    <p className="text-ivory font-medium">{win.title}</p>
                    <div className="flex items-center gap-3 mt-2">
                      {win.date && (
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> {formatDate(win.date)}
                        </span>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded-full ${getCategoryColor(win.category)}`}>
                        {win.category || "Victoire"}
                      </span>
                    </div>
                    {win.notes && (
                      <p className="text-xs text-gray-600 mt-2 italic">{win.notes}</p>
                    )}
                  </div>
                  <Sparkles className="w-4 h-4 text-gold-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                </motion.div>
              ))}
              {wins.length === 5 && (
                <div className="text-center pt-2">
                  <Link href="/wins" className="text-xs text-gold-500 hover:underline">
                    Voir toutes les victoires →
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Trophy className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>Aucune victoire enregistrée</p>
              <Link href="/wins" className="text-gold-500 text-sm mt-2 inline-block hover:underline">
                Ajoute ta première victoire →
              </Link>
            </div>
          )}
          
          {/* Conseil d'ancrage */}
          <div className="mt-6 pt-6 border-t border-white/10">
            <p className="text-xs text-gray-500 italic flex items-center gap-2">
              <Heart className="w-3 h-3 text-gold-500" />
              Chaque victoire compte, petite ou grande. Célèbre-les !
            </p>
          </div>
        </div>

        {/* GROUNDING PROMPTS */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-8">
          <h2 className="text-xl font-serif text-gold-500 mb-6 flex items-center gap-3">
            <Anchor className="w-5 h-5" /> Grounding Prompts
          </h2>
          
          <div className="space-y-4">
            <div className="group p-5 bg-gradient-to-r from-gold-500/5 to-transparent rounded-xl border border-white/5 hover:border-gold-500/20 transition-all cursor-pointer">
              <p className="text-ivory font-light text-lg">🌿</p>
              <p className="text-gray-300 mt-2">"Qu'est-ce qui compte vraiment aujourd'hui ?"</p>
              <p className="text-xs text-gray-600 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">Prends 3 respirations avant de répondre.</p>
            </div>
            
            <div className="group p-5 bg-gradient-to-r from-gold-500/5 to-transparent rounded-xl border border-white/5 hover:border-gold-500/20 transition-all cursor-pointer">
              <p className="text-ivory font-light text-lg">👑</p>
              <p className="text-gray-300 mt-2">"Ma vision est-elle alignée avec mes actions ?"</p>
              <p className="text-xs text-gray-600 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">Si non, ajuste une chose aujourd'hui.</p>
            </div>
            
            <div className="group p-5 bg-gradient-to-r from-gold-500/5 to-transparent rounded-xl border border-white/5 hover:border-gold-500/20 transition-all cursor-pointer">
              <p className="text-ivory font-light text-lg">⚡</p>
              <p className="text-gray-300 mt-2">"Qu'est-ce qui draine mon énergie en ce moment ?"</p>
              <p className="text-xs text-gray-600 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">Identifie-le et protège-toi.</p>
            </div>
            
            <div className="group p-5 bg-gradient-to-r from-gold-500/5 to-transparent rounded-xl border border-white/5 hover:border-gold-500/20 transition-all cursor-pointer">
              <p className="text-ivory font-light text-lg">💖</p>
              <p className="text-gray-300 mt-2">"Quelle est la chose dont je suis le plus fière aujourd'hui ?"</p>
              <p className="text-xs text-gray-600 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">Célèbre cette victoire.</p>
            </div>
          </div>

          {/* Énergie du moment */}
          <div className="mt-8 pt-6 border-t border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 uppercase tracking-wider">Niveau d'énergie</span>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <button
                    key={i}
                    onClick={() => setEnergyLevel(i)}
                    className={`w-6 h-1.5 rounded-full overflow-hidden transition-all ${
                      i <= energyLevel ? "bg-gold-500" : "bg-gold-500/20"
                    }`}
                  >
                    <div className="w-full h-full" />
                  </button>
                ))}
              </div>
            </div>
            
            <div className="mt-3">
              {energyLevel <= 2 && (
                <div className="flex items-center gap-2 text-sm text-orange-400">
                  <Moon className="w-4 h-4" />
                  <span>Prends soin de toi aujourd'hui. Une micro-pause peut tout changer.</span>
                </div>
              )}
              {energyLevel === 3 && (
                <div className="flex items-center gap-2 text-sm text-gold-500/80">
                  <Sun className="w-4 h-4" />
                  <span>Énergie stable. Profite-en pour avancer sur une priorité.</span>
                </div>
              )}
              {energyLevel >= 4 && (
                <div className="flex items-center gap-2 text-sm text-emerald-400">
                  <Sparkles className="w-4 h-4" />
                  <span>En pleine forme ! C'est le moment d'attaquer les gros dossiers.</span>
                </div>
              )}
            </div>
            
            <div className="mt-4 pt-4 border-t border-white/5">
              <p className="text-xs text-gold-500/60 text-center">
                Rappelle-toi : tu construis un empire, pas une urgence. 👑
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
