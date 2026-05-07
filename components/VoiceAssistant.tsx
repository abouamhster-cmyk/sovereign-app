"use client";
import { useState, useEffect, useRef } from "react";
import { Mic, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface VoiceAssistantProps {
  onUserSpeech: (text: string) => void;
  isProcessing: boolean;
  lastResponse?: string;
}

export default function VoiceAssistant({ 
  onUserSpeech, 
  isProcessing,
  lastResponse 
}: VoiceAssistantProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const recognitionRef = useRef<any>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Initialiser la reconnaissance vocale
  useEffect(() => {
    if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'fr-FR';
      
      recognitionRef.current.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join('');
        
        if (event.results[0].isFinal) {
          onUserSpeech(transcript);
          stopListening();
        }
      };
      
      recognitionRef.current.onerror = () => {
        console.log("Erreur reconnaissance vocale");
        stopListening();
      };
      
      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, [onUserSpeech]);

  const startListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e) {
        console.log("Déjà en écoute");
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      setIsListening(false);
    }
  };

  // Faire parler l'assistant avec l'API native
  const speak = (text: string) => {
    if (!window.speechSynthesis || !text) return;
    
    // Annuler toute parole en cours
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'fr-FR';
    utterance.rate = 0.9;
    utterance.pitch = 1.1;
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => {
      setIsSpeaking(false);
      // Réactiver l'écoute après la réponse si le mode est actif
      if (isActive) {
        setTimeout(() => startListening(), 500);
      }
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
    };
    
    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  // Déclencher la parole quand une nouvelle réponse arrive
  useEffect(() => {
    if (lastResponse && !isProcessing && !isSpeaking && isActive && lastResponse.length > 0) {
      speak(lastResponse);
    }
  }, [lastResponse, isProcessing, isActive]);

  const toggleAssistant = () => {
    if (isActive) {
      stopListening();
      window.speechSynthesis.cancel();
      setIsActive(false);
      setIsSpeaking(false);
    } else {
      setIsActive(true);
      startListening();
    }
  };

  return (
    <div className="relative">
      <button
        onClick={toggleAssistant}
        className={`relative p-3 rounded-full transition-all duration-300 ${
          isActive 
            ? "bg-gold-500 text-midnight shadow-lg shadow-gold-500/30" 
            : "bg-white/10 text-gray-400 hover:bg-white/20"
        }`}
      >
        {isActive ? <Sparkles className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
      </button>

      <AnimatePresence>
        {isActive && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute -top-10 left-1/2 -translate-x-1/2 bg-midnight border border-gold-500/30 rounded-xl px-3 py-1.5 whitespace-nowrap z-50"
          >
            <div className="flex items-center gap-2">
              {isListening && (
                <>
                  <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-[10px] text-gold-400">Je t'écoute...</span>
                </>
              )}
              {isSpeaking && (
                <>
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  <span className="text-[10px] text-gold-400">Je parle...</span>
                </>
              )}
              {isProcessing && (
                <>
                  <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-spin" />
                  <span className="text-[10px] text-gold-400">Je réfléchis...</span>
                </>
              )}
              {!isListening && !isSpeaking && !isProcessing && (
                <span className="text-[10px] text-gold-400">🎤 Parle...</span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
