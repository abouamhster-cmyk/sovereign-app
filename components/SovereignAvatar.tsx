"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Volume2, VolumeX, Mic, Heart, Sparkles } from "lucide-react";

type AvatarState = "idle" | "listening" | "thinking" | "speaking" | "happy";

interface SovereignAvatarProps {
  state?: AvatarState;
  onSpeak?: (text: string) => void;
  isSpeaking?: boolean;
  lastMessage?: string;
  size?: "sm" | "md" | "lg";
  isVoiceActive?: boolean;        // Mode mains libres activé
  isVoiceListening?: boolean;     // En écoute du wake word
  isVoiceSpeaking?: boolean;      // En train de parler vocalement
}

export default function SovereignAvatar({ 
  state = "idle", 
  onSpeak, 
  isSpeaking = false,
  lastMessage = "",
  size = "md",
  isVoiceActive = false,
  isVoiceListening = false,
  isVoiceSpeaking = false
}: SovereignAvatarProps) {
  const [bubbleText, setBubbleText] = useState("");
  const [showBubble, setShowBubble] = useState(false);
  const [animationFrame, setAnimationFrame] = useState(0);
  const [internalState, setInternalState] = useState<AvatarState>(state);

  // Dimensions selon la taille
  const dimensions = {
    sm: "w-16 h-16",
    md: "w-24 h-24",
    lg: "w-32 h-32"
  };

  // Animation de clignement des yeux
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationFrame(prev => (prev + 1) % 60);
    }, 100);
    return () => clearInterval(interval);
  }, []);

  // Synchroniser l'état interne avec les props
  useEffect(() => {
    // Priorité: état vocal mains libres > état explicite
    if (isVoiceListening) {
      setInternalState("listening");
    } else if (isVoiceSpeaking) {
      setInternalState("speaking");
    } else {
      setInternalState(state);
    }
  }, [isVoiceListening, isVoiceSpeaking, state]);

  // Afficher une bulle quand un message arrive
  useEffect(() => {
    if (lastMessage && lastMessage.length > 0) {
      setBubbleText(lastMessage.length > 60 ? lastMessage.substring(0, 60) + "..." : lastMessage);
      setShowBubble(true);
      const timer = setTimeout(() => setShowBubble(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [lastMessage]);

  // État visuel
  const getGlowColor = () => {
    if (isVoiceActive) {
      switch(internalState) {
        case "listening": return "bg-blue-500/40 shadow-blue-500/60 animate-pulse-slow";
        case "speaking": return "bg-emerald-500/40 shadow-emerald-500/60";
        case "thinking": return "bg-purple-500/30 shadow-purple-500/50";
        default: return "bg-gold-500/20 shadow-gold-500/30";
      }
    }
    switch(internalState) {
      case "listening": return "bg-blue-500/30 shadow-blue-500/50";
      case "thinking": return "bg-purple-500/30 shadow-purple-500/50";
      case "speaking": return "bg-emerald-500/30 shadow-emerald-500/50";
      case "happy": return "bg-gold-500/30 shadow-gold-500/50";
      default: return "bg-gold-500/10 shadow-gold-500/20";
    }
  };

  const getEyeState = () => {
    // Clignement toutes les 30 frames
    const isBlinking = animationFrame % 30 < 3;
    if (isBlinking) return "closed";
    if (internalState === "listening" || isVoiceListening) return "listening";
    if (internalState === "thinking") return "thinking";
    return "normal";
  };

  // Animation supplémentaire pour le mode vocal actif
  const getPulseClass = () => {
    if (isVoiceActive && internalState === "listening") {
      return "ring-2 ring-blue-500 ring-opacity-75";
    }
    if (isVoiceActive && internalState === "speaking") {
      return "ring-2 ring-emerald-500 ring-opacity-75";
    }
    return "";
  };

  return (
    <div className="relative inline-block">
      {/* Bulle de pensée */}
      <AnimatePresence>
        {showBubble && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.8 }}
            className="absolute -top-16 left-1/2 -translate-x-1/2 bg-midnight/95 backdrop-blur-lg border border-gold-500/30 rounded-2xl px-4 py-2 max-w-[200px] z-10"
          >
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-midnight/95 border-r border-b border-gold-500/30 rotate-45" />
            <p className="text-xs text-gold-400">{bubbleText}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Avatar avec animation de glow */}
      <motion.div
        animate={{
          scale: internalState === "listening" || isVoiceListening ? [1, 1.05, 1] : 1,
          rotate: internalState === "thinking" ? [0, 5, -5, 0] : 0,
        }}
        transition={{
          duration: 1.5,
          repeat: (internalState === "listening" || isVoiceListening) ? Infinity : 0,
        }}
        className={`relative ${dimensions[size]} rounded-full bg-gradient-to-br from-gold-500/20 to-gold-500/5 flex items-center justify-center shadow-lg ${getGlowColor()} ${getPulseClass()}`}
      >
        {/* Cercle extérieur animé */}
        <div className={`absolute inset-0 rounded-full ${getGlowColor()} animate-pulse opacity-50`} />
        
        {/* Indicateur de mode vocal actif (cercle doré) */}
        {isVoiceActive && (
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute -inset-1 rounded-full border-2 border-gold-500/50"
          />
        )}
        
        {/* Avatar SVG */}
        <svg viewBox="0 0 100 100" className="w-3/4 h-3/4">
          {/* Visage */}
          <circle cx="50" cy="50" r="45" fill="#D4AF37" opacity="0.15" />
          
          {/* Yeux */}
          <g>
            {/* Œil gauche */}
            <ellipse cx="35" cy="45" rx="8" ry="10" fill="#D4AF37" opacity="0.8" />
            {getEyeState() === "closed" ? (
              <line x1="30" y1="45" x2="40" y2="45" stroke="#D4AF37" strokeWidth="2" />
            ) : getEyeState() === "listening" ? (
              <>
                <circle cx="35" cy="45" r="4" fill="#1a1a2e" />
                <circle cx="33" cy="43" r="1.5" fill="white" />
                {/* Animation d'écoute : petites ondes */}
                <path d="M28 40 Q25 45 28 50" stroke="#D4AF37" strokeWidth="1" fill="none" opacity="0.6">
                  <animate attributeName="opacity" values="0.2;0.8;0.2" dur="1s" repeatCount="indefinite" />
                </path>
              </>
            ) : getEyeState() === "thinking" ? (
              <>
                <circle cx="35" cy="45" r="4" fill="#1a1a2e" />
                <circle cx="36" cy="43" r="1" fill="white" />
              </>
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
            ) : (
              <>
                <circle cx="65" cy="45" r="4" fill="#1a1a2e" />
                <circle cx="63" cy="43" r="1.5" fill="white" />
              </>
            )}
          </g>
          
          {/* Sourire */}
          {internalState === "happy" ? (
            <path d="M35 65 Q50 80 65 65" stroke="#D4AF37" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          ) : internalState === "listening" || isVoiceListening ? (
            <ellipse cx="50" cy="65" rx="10" ry="5" fill="#D4AF37" opacity="0.3">
              <animate attributeName="rx" values="10;12;10" dur="0.8s" repeatCount="indefinite" />
            </ellipse>
          ) : (
            <path d="M40 60 Q50 68 60 60" stroke="#D4AF37" strokeWidth="2" fill="none" strokeLinecap="round" />
          )}
          
          {/* Étincelles (état heureux) */}
          {internalState === "happy" && (
            <>
              <Sparkles x={20} y={20} size={8} className="text-gold-500" />
              <Sparkles x={75} y={25} size={6} className="text-gold-500" />
            </>
          )}

          {/* Onde vocale pour le mode listening */}
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

        {/* Indicateur d'écoute / réflexion */}
        {(internalState === "listening" || internalState === "thinking" || isVoiceListening) && (
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            <div className="w-1.5 h-1.5 bg-gold-500 rounded-full animate-bounce" style={{ animationDelay: "0s" }} />
            <div className="w-1.5 h-1.5 bg-gold-500 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
            <div className="w-1.5 h-1.5 bg-gold-500 rounded-full animate-bounce" style={{ animationDelay: "0.4s" }} />
          </div>
        )}

        {/* Petit badge vocal quand mode mains libres activé */}
        {isVoiceActive && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full animate-pulse" title="Mode vocal activé" />
        )}
      </motion.div>

      {/* Bouton vocal (optionnel) */}
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
