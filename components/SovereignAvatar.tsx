"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Volume2, VolumeX, Sparkles, Heart, Moon, AlertCircle } from "lucide-react";

type AvatarState = "idle" | "listening" | "thinking" | "speaking" | "happy" | "tired" | "stressed" | "excited";

interface SovereignAvatarProps {
  state?: AvatarState;
  onSpeak?: (text: string) => void;
  isSpeaking?: boolean;
  lastMessage?: string;
  size?: "sm" | "md" | "lg";
  isVoiceActive?: boolean;
  isVoiceListening?: boolean;
  isVoiceSpeaking?: boolean;
  mood?: string | null;
}

// Bulles de pensée aléatoires
const thinkingMessages = [
  "🤔 Je réfléchis...",
  "✨ Je suis là",
  "💭 Une idée...",
  "🌱 Et si on essayait ça ?",
  "🎯 Priorité détectée",
  "💖 Je t'écoute",
  "🧠 Brain dump ?",
  "📋 Une tâche à créer ?"
];

const happyMessages = [
  "🎉 Félicitations !",
  "👑 Tu gères !",
  "✨ Continue comme ça",
  "💪 Puissante",
  "🌟 Une victoire de plus"
];

const tiredMessages = [
  "🌙 Repose-toi",
  "😴 Une pause ?",
  "💤 Je veille",
  "🛌 Demain est un autre jour"
];

export default function SovereignAvatar({ 
  state = "idle", 
  onSpeak, 
  isSpeaking = false,
  lastMessage = "",
  size = "md",
  isVoiceActive = false,
  isVoiceListening = false,
  isVoiceSpeaking = false,
  mood = null
}: SovereignAvatarProps) {
  const [bubbleText, setBubbleText] = useState("");
  const [showBubble, setShowBubble] = useState(false);
  const [animationFrame, setAnimationFrame] = useState(0);
  const [internalState, setInternalState] = useState<AvatarState>(state);
  const [idleTimer, setIdleTimer] = useState<NodeJS.Timeout | null>(null);
  const [bubbleTimeout, setBubbleTimeout] = useState<NodeJS.Timeout | null>(null);

  const dimensions = {
    sm: "w-10 h-10",
    md: "w-14 h-14",
    lg: "w-20 h-20"
  };

  // Animation des yeux
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationFrame(prev => (prev + 1) % 60);
    }, 100);
    return () => clearInterval(interval);
  }, []);

  // Synchroniser l'état interne
  useEffect(() => {
    if (isVoiceListening) {
      setInternalState("listening");
    } else if (isVoiceSpeaking) {
      setInternalState("speaking");
    } else if (mood === "fatiguée") {
      setInternalState("tired");
    } else if (mood === "stressée") {
      setInternalState("stressed");
    } else if (state === "happy") {
      setInternalState("happy");
    } else if (state === "thinking") {
      setInternalState("thinking");
    } else {
      setInternalState(state);
    }
  }, [isVoiceListening, isVoiceSpeaking, state, mood]);

  // Fonction pour afficher une bulle
  const showThinkingBubble = (text: string, duration: number = 4000) => {
    if (bubbleTimeout) clearTimeout(bubbleTimeout);
    setBubbleText(text);
    setShowBubble(true);
    const timer = setTimeout(() => {
      setShowBubble(false);
    }, duration);
    setBubbleTimeout(timer);
  };

  // Bulle aléatoire toutes les 15-20 secondes quand inactif
  useEffect(() => {
    if (internalState === "idle") {
      if (idleTimer) clearTimeout(idleTimer);
      const timer = setTimeout(() => {
        const randomIndex = Math.floor(Math.random() * thinkingMessages.length);
        showThinkingBubble(thinkingMessages[randomIndex], 4000);
      }, 15000 + Math.random() * 5000);
      setIdleTimer(timer);
    }
    return () => {
      if (idleTimer) clearTimeout(idleTimer);
    };
  }, [internalState]);

  // Bulle quand un message arrive
  useEffect(() => {
    if (lastMessage && lastMessage.length > 0) {
      let message = lastMessage.length > 50 ? lastMessage.substring(0, 50) + "..." : lastMessage;
      
      if (internalState === "happy") {
        const randomHappy = happyMessages[Math.floor(Math.random() * happyMessages.length)];
        message = randomHappy;
      } else if (internalState === "tired") {
        const randomTired = tiredMessages[Math.floor(Math.random() * tiredMessages.length)];
        message = randomTired;
      } else if (internalState === "thinking") {
        message = thinkingMessages[Math.floor(Math.random() * thinkingMessages.length)];
      } else {
        message = "💬 " + message;
      }
      
      showThinkingBubble(message, 3500);
    }
  }, [lastMessage, internalState]);

  // Bulle quand l'avatar parle
  useEffect(() => {
    if (isVoiceSpeaking || isSpeaking) {
      showThinkingBubble("🔊 Je parle...", 2000);
    }
  }, [isVoiceSpeaking, isSpeaking]);

  // Bulle quand l'avatar écoute
  useEffect(() => {
    if (isVoiceListening) {
      showThinkingBubble("🎤 Je t'écoute...", 2500);
    }
  }, [isVoiceListening]);

  const getGlowColor = () => {
    if (isVoiceActive) {
      switch(internalState) {
        case "listening": return "ring-2 ring-blue-500 shadow-blue-500/30";
        case "speaking": return "ring-2 ring-emerald-500 shadow-emerald-500/30";
        default: return "ring-2 ring-gold-500 shadow-gold-500/30";
      }
    }
    switch(internalState) {
      case "happy": return "ring-2 ring-gold-500 shadow-gold-500/30";
      case "thinking": return "ring-2 ring-purple-500 shadow-purple-500/30";
      default: return "";
    }
  };

  const getEyeState = () => {
    const isBlinking = animationFrame % 30 < 3;
    if (isBlinking) return "closed";
    if (internalState === "tired") return "tired";
    if (internalState === "stressed") return "stressed";
    if (internalState === "listening") return "listening";
    if (internalState === "thinking") return "thinking";
    if (internalState === "happy") return "happy";
    return "normal";
  };

  const getPulseClass = () => {
    if (isVoiceActive && internalState === "listening") return "ring-2 ring-blue-500 ring-opacity-75";
    if (isVoiceActive && internalState === "speaking") return "ring-2 ring-emerald-500 ring-opacity-75";
    if (internalState === "happy") return "ring-2 ring-gold-500 ring-opacity-50";
    return "";
  };

  return (
    <div className="relative inline-block">
      {/* Bulle de pensée */}
      <AnimatePresence>
        {showBubble && bubbleText && (
          <motion.div
            initial={{ opacity: 0, x: -10, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -10, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className="absolute top-1/2 -translate-y-1/2 left-full ml-3 bg-midnight/95 backdrop-blur-lg border border-gold-500/30 rounded-2xl px-4 py-2 max-w-[220px] z-10 shadow-xl"
          >
            <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-midnight/95 border-l border-b border-gold-500/30 -rotate-45" />
            <p className="text-xs text-gold-400 whitespace-nowrap">{bubbleText}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Avatar */}
      <motion.div
        animate={{
          scale: internalState === "listening" ? [1, 1.05, 1] : 1,
          rotate: internalState === "thinking" ? [0, 5, -5, 0] : 0,
        }}
        transition={{
          duration: 1.5,
          repeat: internalState === "listening" ? Infinity : 0,
        }}
        className={`relative ${dimensions[size]} rounded-full bg-gradient-to-br from-gold-500/20 to-gold-500/5 flex items-center justify-center ${getGlowColor()} ${getPulseClass()}`}
      >
        {isVoiceActive && (
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute -inset-1 rounded-full border-2 border-gold-500/50"
          />
        )}
        
        <svg viewBox="0 0 100 100" className="w-3/4 h-3/4">
          <circle cx="50" cy="50" r="45" fill="#D4AF37" opacity="0.15" />
          
          {/* Œil gauche */}
          <ellipse cx="35" cy="45" rx="8" ry="10" fill="#D4AF37" opacity="0.8" />
          {getEyeState() === "closed" ? (
            <line x1="30" y1="45" x2="40" y2="45" stroke="#D4AF37" strokeWidth="2" />
          ) : getEyeState() === "tired" ? (
            <path d="M31 46 Q35 44 39 46" stroke="#D4AF37" strokeWidth="1.5" fill="none" />
          ) : getEyeState() === "stressed" ? (
            <>
              <ellipse cx="35" cy="45" rx="5" ry="7" fill="#1a1a2e" />
              <line x1="30" y1="42" x2="32" y2="44" stroke="#D4AF37" strokeWidth="1" />
              <line x1="38" y1="42" x2="36" y2="44" stroke="#D4AF37" strokeWidth="1" />
            </>
          ) : getEyeState() === "listening" ? (
            <>
              <circle cx="35" cy="45" r="4" fill="#1a1a2e" />
              <circle cx="33" cy="43" r="1.5" fill="white" />
              <path d="M28 40 Q25 45 28 50" stroke="#D4AF37" strokeWidth="1" fill="none" opacity="0.6">
                <animate attributeName="opacity" values="0.2;0.8;0.2" dur="1s" repeatCount="indefinite" />
              </path>
            </>
          ) : getEyeState() === "thinking" ? (
            <>
              <circle cx="35" cy="45" r="4" fill="#1a1a2e" />
              <circle cx="36" cy="43" r="1" fill="white" />
            </>
          ) : getEyeState() === "happy" ? (
            <path d="M30 44 Q35 40 40 44" stroke="#D4AF37" strokeWidth="1.5" fill="none" />
          ) : (
            <>
              <circle cx="35" cy="45" r="4" fill="#1a1a2e" />
              <circle cx="33" cy="43" r="1.5" fill="white" />
            </>
          )}
          
          {/* Œil droit */}
          <ellipse cx="65" cy="45" rx="8" ry="10" fill="#D4AF37" opacity="0.8" />
          {getEyeState() === "closed" ? (
            <line x1="60" y1="45" x2="70" y2="45" stroke="#D4AF37" strokeWidth="2" />
          ) : getEyeState() === "tired" ? (
            <path d="M61 46 Q65 44 69 46" stroke="#D4AF37" strokeWidth="1.5" fill="none" />
          ) : getEyeState() === "stressed" ? (
            <>
              <ellipse cx="65" cy="45" rx="5" ry="7" fill="#1a1a2e" />
              <line x1="60" y1="42" x2="62" y2="44" stroke="#D4AF37" strokeWidth="1" />
              <line x1="68" y1="42" x2="66" y2="44" stroke="#D4AF37" strokeWidth="1" />
            </>
          ) : getEyeState() === "listening" ? (
            <>
              <circle cx="65" cy="45" r="4" fill="#1a1a2e" />
              <circle cx="63" cy="43" r="1.5" fill="white" />
              <path d="M58 40 Q55 45 58 50" stroke="#D4AF37" strokeWidth="1" fill="none" opacity="0.6">
                <animate attributeName="opacity" values="0.2;0.8;0.2" dur="1s" repeatCount="indefinite" />
              </path>
            </>
          ) : getEyeState() === "thinking" ? (
            <>
              <circle cx="65" cy="45" r="4" fill="#1a1a2e" />
              <circle cx="66" cy="43" r="1" fill="white" />
            </>
          ) : getEyeState() === "happy" ? (
            <path d="M60 44 Q65 40 70 44" stroke="#D4AF37" strokeWidth="1.5" fill="none" />
          ) : (
            <>
              <circle cx="65" cy="45" r="4" fill="#1a1a2e" />
              <circle cx="63" cy="43" r="1.5" fill="white" />
            </>
          )}
          
          {/* Bouche */}
          {internalState === "happy" ? (
            <path d="M35 65 Q50 82 65 65" stroke="#D4AF37" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          ) : internalState === "tired" ? (
            <path d="M40 63 Q50 60 60 63" stroke="#D4AF37" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          ) : internalState === "stressed" ? (
            <path d="M40 65 L45 62 L50 65 L55 62 L60 65" stroke="#D4AF37" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          ) : internalState === "listening" ? (
            <ellipse cx="50" cy="65" rx="10" ry="5" fill="#D4AF37" opacity="0.3">
              <animate attributeName="rx" values="10;12;10" dur="0.8s" repeatCount="indefinite" />
            </ellipse>
          ) : (
            <path d="M40 60 Q50 68 60 60" stroke="#D4AF37" strokeWidth="2" fill="none" strokeLinecap="round" />
          )}
          
          {/* Étincelles (état heureux) */}
          {internalState === "happy" && (
            <>
              <Sparkles x={20} y={20} size={6} className="text-gold-500" />
              <Sparkles x={75} y={25} size={4} className="text-gold-500" />
            </>
          )}

          {/* Cœur flottant (état heureux) */}
          {internalState === "happy" && (
            <motion.g
              animate={{ y: [0, -5, 0], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <Heart x={80} y={30} size={8} fill="#D4AF37" stroke="none" />
            </motion.g>
          )}

          {/* Lune (état fatigué) */}
          {internalState === "tired" && (
            <Moon x={75} y={25} size={10} className="text-gray-400" />
          )}

          {/* Icône stress */}
          {internalState === "stressed" && (
            <AlertCircle x={75} y={25} size={10} className="text-orange-400" />
          )}

          {/* Onde vocale */}
          {isVoiceListening && (
            <>
              <path d="M25 55 Q20 50 25 45" stroke="#D4AF37" strokeWidth="1.5" fill="none" opacity="0.4">
                <animate attributeName="opacity" values="0;0.6;0" dur="1.2s" repeatCount="indefinite" />
              </path>
              <path d="M75 55 Q80 50 75 45" stroke="#D4AF37" strokeWidth="1.5" fill="none" opacity="0.4">
                <animate attributeName="opacity" values="0;0.6;0" dur="1.2s" begin="0.4s" repeatCount="indefinite" />
              </path>
            </>
          )}
        </svg>

        {/* Points de réflexion */}
        {(internalState === "thinking" || internalState === "listening") && (
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            <div className="w-1.5 h-1.5 bg-gold-500 rounded-full animate-bounce" style={{ animationDelay: "0s" }} />
            <div className="w-1.5 h-1.5 bg-gold-500 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
            <div className="w-1.5 h-1.5 bg-gold-500 rounded-full animate-bounce" style={{ animationDelay: "0.4s" }} />
          </div>
        )}

        {/* Badge mode vocal */}
        {isVoiceActive && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full animate-pulse" title="Mode vocal activé" />
        )}
      </motion.div>

      {/* Bouton vocal */}
      {onSpeak && (
        <button
          onClick={() => onSpeak(lastMessage)}
          className="absolute -bottom-2 -right-2 p-1.5 bg-gold-500/20 rounded-full hover:bg-gold-500/30 transition-colors"
          title={isSpeaking ? "Parole en cours" : "Faire parler Becks"}
        >
          {isSpeaking || isVoiceSpeaking ? (
            <VolumeX className="w-3 h-3 text-gold-500" />
          ) : (
            <Volume2 className="w-3 h-3 text-gold-500" />
          )}
        </button>
      )}
    </div>
  );
}
