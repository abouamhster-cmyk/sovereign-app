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
}

export default function SovereignAvatar({ 
  state = "idle", 
  onSpeak, 
  isSpeaking = false,
  lastMessage = "",
  size = "md"
}: SovereignAvatarProps) {
  const [bubbleText, setBubbleText] = useState("");
  const [showBubble, setShowBubble] = useState(false);
  const [animationFrame, setAnimationFrame] = useState(0);

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
    switch(state) {
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
    if (state === "listening") return "listening";
    if (state === "thinking") return "thinking";
    return "normal";
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
          scale: state === "listening" ? [1, 1.05, 1] : 1,
          rotate: state === "thinking" ? [0, 5, -5, 0] : 0,
        }}
        transition={{
          duration: 1.5,
          repeat: state === "listening" ? Infinity : 0,
        }}
        className={`relative ${dimensions[size]} rounded-full bg-gradient-to-br from-gold-500/20 to-gold-500/5 flex items-center justify-center shadow-lg ${getGlowColor()}`}
      >
        {/* Cercle extérieur animé */}
        <div className={`absolute inset-0 rounded-full ${getGlowColor()} animate-pulse opacity-50`} />
        
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
          {state === "happy" ? (
            <path d="M35 65 Q50 80 65 65" stroke="#D4AF37" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          ) : state === "listening" ? (
            <ellipse cx="50" cy="65" rx="10" ry="5" fill="#D4AF37" opacity="0.3" />
          ) : (
            <path d="M40 60 Q50 68 60 60" stroke="#D4AF37" strokeWidth="2" fill="none" strokeLinecap="round" />
          )}
          
          {/* Étincelles (état heureux) */}
          {state === "happy" && (
            <>
              <Sparkles x={20} y={20} size={8} className="text-gold-500" />
              <Sparkles x={75} y={25} size={6} className="text-gold-500" />
            </>
          )}
        </svg>

        {/* Indicateur d'écoute / réflexion */}
        {(state === "listening" || state === "thinking") && (
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            <div className="w-1.5 h-1.5 bg-gold-500 rounded-full animate-bounce" style={{ animationDelay: "0s" }} />
            <div className="w-1.5 h-1.5 bg-gold-500 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
            <div className="w-1.5 h-1.5 bg-gold-500 rounded-full animate-bounce" style={{ animationDelay: "0.4s" }} />
          </div>
        )}
      </motion.div>

      {/* Bouton vocal (optionnel) */}
      {onSpeak && (
        <button
          onClick={() => onSpeak(lastMessage)}
          className="absolute -bottom-2 -right-2 p-1.5 bg-gold-500/20 rounded-full hover:bg-gold-500/30 transition-colors"
          title="Faire parler Becks"
        >
          {isSpeaking ? (
            <VolumeX className="w-3 h-3 text-gold-500" />
          ) : (
            <Volume2 className="w-3 h-3 text-gold-500" />
          )}
        </button>
      )}
    </div>
  );
}
