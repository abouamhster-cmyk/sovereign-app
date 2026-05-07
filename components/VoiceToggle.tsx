// components/VoiceToggle.tsx
"use client";
import { Mic, MicOff, Volume2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface VoiceToggleProps {
  isActive: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  onActivate: () => void;
  onDeactivate: () => void;
  onManualTrigger: () => void;
}

export default function VoiceToggle({
  isActive,
  isListening,
  isSpeaking,
  onActivate,
  onDeactivate,
  onManualTrigger,
}: VoiceToggleProps) {
  return (
    <div className="flex items-center gap-2">
      {/* Bouton principal : activer/désactiver le mode mains libres */}
      <button
        onClick={() => {
          if (isActive) {
            onDeactivate();
          } else {
            onActivate();
          }
        }}
        className={`relative p-3 rounded-full transition-all duration-300 ${
          isActive
            ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30"
            : "bg-white/10 text-gray-400 hover:bg-white/20"
        }`}
        title={isActive ? "Mode vocal activé" : "Activer le mode vocal"}
      >
        {isActive ? <Volume2 className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
        
        {/* Indicateur d'écoute */}
        {isActive && isListening && (
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
        )}
      </button>
      
      {/* Bouton poussoir (push-to-talk) - toujours disponible */}
      <button
        onClick={onManualTrigger}
        disabled={isSpeaking}
        className={`p-3 rounded-full transition-all ${
          isListening && !isActive
            ? "bg-red-500 text-white animate-pulse"
            : "bg-gold-500 text-midnight hover:scale-105"
        } disabled:opacity-50 disabled:hover:scale-100`}
        title="Appuyer pour parler (push-to-talk)"
      >
        <Mic className="w-5 h-5" />
      </button>
      
      {/* Indicateur de statut vocal */}
      <AnimatePresence>
        {(isListening || isSpeaking) && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="px-3 py-1.5 bg-midnight/90 border border-gold-500/30 rounded-full"
          >
            <div className="flex items-center gap-2">
              {isListening && (
                <>
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-xs text-gold-400">
                    {isActive ? "🎤 Je t'écoute... (dis 'Hey Becks')" : "🎤 Parle..."}
                  </span>
                </>
              )}
              {isSpeaking && (
                <>
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                  <span className="text-xs text-gold-400">🔊 Becks parle...</span>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
