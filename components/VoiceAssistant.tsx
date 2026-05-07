"use client";
import { useState, useEffect, useRef } from "react";
import { Mic, Sparkles, Volume2, VolumeX } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface VoiceAssistantProps {
  onUserSpeech: (text: string) => void;
  isProcessing: boolean;
  lastResponse?: string;
  isActive?: boolean;
  isListening?: boolean;
  isSpeaking?: boolean;
  onActivate?: () => void;
  onDeactivate?: () => void;
  onManualTrigger?: () => void;
}

export default function VoiceAssistant({ 
  onUserSpeech, 
  isProcessing,
  lastResponse,
  isActive: externalIsActive,
  isListening: externalIsListening,
  isSpeaking: externalIsSpeaking,
  onActivate,
  onDeactivate,
  onManualTrigger,
}: VoiceAssistantProps) {
  const [internalIsActive, setInternalIsActive] = useState(false);
  const [internalIsListening, setInternalIsListening] = useState(false);
  const [internalIsSpeaking, setInternalIsSpeaking] = useState(false);
  const recognitionRef = useRef<any>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const isActive = externalIsActive !== undefined ? externalIsActive : internalIsActive;
  const isListening = externalIsListening !== undefined ? externalIsListening : internalIsListening;
  const isSpeaking = externalIsSpeaking !== undefined ? externalIsSpeaking : internalIsSpeaking;

  // Initialiser la reconnaissance vocale (mode poussoir)
  useEffect(() => {
    if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'fr-FR';
      
      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        onUserSpeech(transcript);
        setInternalIsListening(false);
      };
      
      recognitionRef.current.onerror = () => {
        setInternalIsListening(false);
      };
      
      recognitionRef.current.onend = () => {
        setInternalIsListening(false);
      };
    }
  }, [onUserSpeech]);

  // Fonction pour faire parler l'assistant
  const speak = (text: string) => {
    if (!window.speechSynthesis || !text) return;
    
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'fr-FR';
    utterance.rate = 0.9;
    utterance.pitch = 1.1;
    
    utterance.onstart = () => setInternalIsSpeaking(true);
    utterance.onend = () => setInternalIsSpeaking(false);
    utterance.onerror = () => setInternalIsSpeaking(false);
    
    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  // Parler quand une réponse arrive (mode poussoir uniquement)
  useEffect(() => {
    if (lastResponse && !isProcessing && !internalIsSpeaking && lastResponse.length > 0 && !isActive) {
      speak(lastResponse);
    }
  }, [lastResponse, isProcessing, internalIsSpeaking, isActive]);

  const startListening = () => {
    if (recognitionRef.current && !isProcessing && !internalIsSpeaking) {
      try {
        recognitionRef.current.start();
        setInternalIsListening(true);
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(() => {
          if (internalIsListening) {
            try { recognitionRef.current?.stop(); } catch (e) {}
            setInternalIsListening(false);
          }
        }, 10000);
      } catch (e) {
        console.log("Erreur démarrage reconnaissance");
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
    }
    setInternalIsListening(false);
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
  };

  const handleManualTrigger = () => {
    if (onManualTrigger) {
      onManualTrigger();
    } else {
      if (internalIsListening) {
        stopListening();
      } else {
        startListening();
      }
    }
  };

  const handleToggleMode = () => {
    if (onActivate && onDeactivate) {
      if (isActive) {
        onDeactivate();
      } else {
        onActivate();
      }
    } else {
      setInternalIsActive(!internalIsActive);
      if (!internalIsActive) {
        startListening();
      } else {
        stopListening();
        window.speechSynthesis.cancel();
      }
    }
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        {/* Bouton mode vocal mains libres */}
        {onActivate && onDeactivate && (
          <button
            onClick={handleToggleMode}
            className={`p-2 rounded-full transition-all ${
              isActive 
                ? "bg-emerald-500 text-white" 
                : "bg-white/10 text-gray-400 hover:bg-white/20"
            }`}
            title={isActive ? "Mode vocal activé" : "Activer le mode mains libres"}
          >
            {isActive ? <Volume2 className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
          </button>
        )}
        
        {/* Bouton push-to-talk */}
        <button
          onClick={handleManualTrigger}
          disabled={isProcessing || internalIsSpeaking}
          className={`p-2 rounded-full transition-all ${
            internalIsListening ? "bg-red-500 text-white animate-pulse" : "bg-gold-500 text-midnight hover:scale-105"
          } disabled:opacity-50 disabled:hover:scale-100`}
          title="Appuyer pour parler"
        >
          {internalIsListening ? <Mic className="w-4 h-4 animate-pulse" /> : <Mic className="w-4 h-4" />}
        </button>
      </div>

      {/* Indicateur de statut */}
      <AnimatePresence>
        {(internalIsListening || internalIsSpeaking || (isActive && (isListening || isSpeaking))) && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="absolute top-full left-0 mt-2 bg-midnight/90 backdrop-blur border border-gold-500/30 rounded-xl px-3 py-1.5 whitespace-nowrap z-50"
          >
            <div className="flex items-center gap-2">
              {(internalIsListening || (isActive && isListening)) && (
                <>
                  <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-[10px] text-gold-400">
                    {isActive ? "🎤 Je t'écoute... (dis 'Hey Becks')" : "🎤 Parle..."}
                  </span>
                </>
              )}
              {(internalIsSpeaking || (isActive && isSpeaking)) && (
                <>
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  <span className="text-[10px] text-gold-400">🔊 Becks parle...</span>
                </>
              )}
              {isProcessing && (
                <>
                  <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-spin" />
                  <span className="text-[10px] text-gold-400">🧠 Je réfléchis...</span>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
