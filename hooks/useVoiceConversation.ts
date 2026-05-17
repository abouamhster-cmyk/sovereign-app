console.log("🔊 HOOK useVoiceConversation CHARGÉ");
"use client";
import { useState, useEffect, useRef, useCallback } from "react";

interface UseVoiceConversationProps {
  onUserSpeech: (text: string) => void;
  isProcessing: boolean;
  lastResponse?: string;
  wakeWords?: string[];
  autoListenAfterResponse?: boolean;
  silenceTimeout?: number;
}

export function useVoiceConversation({
  onUserSpeech,
  isProcessing,
  lastResponse,
  wakeWords = ["hey becks", "dis becks", "becks"],
  autoListenAfterResponse = true,
  silenceTimeout = 2000,
}: UseVoiceConversationProps) {
  const [isActive, setIsActive] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialisation simple
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SpeechRecognition) {
      console.error("Reconnaissance vocale non supportée");
      return;
    }
    
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = false;
    recognitionRef.current.interimResults = false;
    recognitionRef.current.lang = 'fr-FR';
    
    recognitionRef.current.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      console.log("🎤 Transcription reçue:", transcript);
      onUserSpeech(transcript);
      setIsListening(false);
    };
    
    recognitionRef.current.onerror = (event: any) => {
      console.error("Erreur:", event.error);
      setIsListening(false);
    };
    
    recognitionRef.current.onend = () => {
      setIsListening(false);
    };
    
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (e) {}
      }
    };
  }, [onUserSpeech]);

  // Démarrer l'écoute
  const startListening = useCallback(() => {
    if (!recognitionRef.current || isProcessing || isSpeaking) return;
    
    try {
      recognitionRef.current.start();
      setIsListening(true);
      console.log("🎤 Écoute démarrée");
    } catch (e) {
      console.error("Erreur démarrage:", e);
    }
  }, [isProcessing, isSpeaking]);
  
  // Arrêter l'écoute
  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      setIsListening(false);
    }
  }, [isListening]);
  
  // Mode mains libres (simplifié - pas de wake word automatique)
  const activate = useCallback(() => {
    setIsActive(true);
  }, []);
  
  const deactivate = useCallback(() => {
    setIsActive(false);
    stopListening();
  }, [stopListening]);
  
  // Push-to-talk
  const triggerManual = useCallback(() => {
    console.log("🎤 Push-to-talk déclenché");
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);
  
  // Parler
  const speak = useCallback((text: string) => {
    if (!window.speechSynthesis || !text) return;
    
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'fr-FR';
    utterance.rate = 0.9;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }, []);
  
  // Réponse vocale
  useEffect(() => {
    if (lastResponse && !isProcessing && isActive && lastResponse.length > 0 && !isSpeaking) {
      speak(lastResponse);
    }
  }, [lastResponse, isProcessing, isActive, isSpeaking, speak]);
  
  return {
    isActive,
    isListening,
    isSpeaking,
    activate,
    deactivate,
    triggerManual,
    speak,
  };
}
