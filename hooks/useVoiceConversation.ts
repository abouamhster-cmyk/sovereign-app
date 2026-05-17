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
  wakeWords = ["hey becks", "dis becks", "becks", "sovereign"],
  autoListenAfterResponse = true,
  silenceTimeout = 2000,
}: UseVoiceConversationProps) {
  const [isActive, setIsActive] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcriptBuffer, setTranscriptBuffer] = useState("");
  
  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isAwaitingWakeWordRef = useRef<boolean>(true);
  const isManualModeRef = useRef<boolean>(false);

  // Initialiser la reconnaissance vocale
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("Reconnaissance vocale non supportée");
      return;
    }
    
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = 'fr-FR';
    
    recognitionRef.current.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0].transcript)
        .join(' ')
        .toLowerCase();
      
      // Mode mains libres : détection du wake word
      if (isActive && isAwaitingWakeWordRef.current && !isProcessing && !isSpeaking) {
        const containsWakeWord = wakeWords.some(word => transcript.includes(word));
        if (containsWakeWord) {
          console.log("🎤 Wake word détecté:", transcript);
          isAwaitingWakeWordRef.current = false;
          isManualModeRef.current = false;
          
          // Nettoyer le transcript
          let cleanTranscript = transcript;
          for (const word of wakeWords) {
            if (cleanTranscript.includes(word)) {
              cleanTranscript = cleanTranscript.split(word).pop() || "";
              break;
            }
          }
          setTranscriptBuffer(cleanTranscript);
          
          // Réinitialiser le timer de silence
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
          
          // Démarrer un nouveau timer pour capturer la fin de la phrase
          silenceTimerRef.current = setTimeout(() => {
            if (transcriptBuffer.trim().length > 0) {
              onUserSpeech(transcriptBuffer);
              setTranscriptBuffer("");
            }
            isAwaitingWakeWordRef.current = true;
          }, silenceTimeout);
        }
      }
      
      // Mode manuel (push-to-talk)
      if (isManualModeRef.current && !isProcessing && !isSpeaking) {
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        
        silenceTimerRef.current = setTimeout(() => {
          if (transcript.trim().length > 0) {
            onUserSpeech(transcript);
            isManualModeRef.current = false;
            stopListening();
          }
        }, silenceTimeout);
      }
    };
    
    recognitionRef.current.onerror = (event: any) => {
      console.error("Erreur reconnaissance:", event.error);
      setIsListening(false);
      isAwaitingWakeWordRef.current = true;
      isManualModeRef.current = false;
    };
    
    recognitionRef.current.onend = () => {
      setIsListening(false);
      
      // Se remet en écoute si le mode est actif
      if (isActive && !isProcessing && !isSpeaking && autoListenAfterResponse) {
        setTimeout(() => startListening(), 500);
      }
    };
    
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    };
  }, [isActive, isProcessing, isSpeaking, wakeWords, silenceTimeout, onUserSpeech, autoListenAfterResponse]);

  // Faire parler l'assistant
  const speak = useCallback((text: string) => {
    if (!window.speechSynthesis || !text) return;
    
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    
    // Arrêter la reconnaissance pendant la parole
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
    }
    
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'fr-FR';
    utterance.rate = 0.9;
    utterance.pitch = 1.1;
    
    utterance.onstart = () => {
      setIsSpeaking(true);
      setIsListening(false);
    };
    
    utterance.onend = () => {
      setIsSpeaking(false);
      
      // Se remet en écoute après la réponse
      if (isActive && autoListenAfterResponse && !isManualModeRef.current) {
        isAwaitingWakeWordRef.current = true;
        setTimeout(() => startListening(), 500);
      }
    };
    
    utterance.onerror = () => {
      setIsSpeaking(false);
    };
    
    window.speechSynthesis.speak(utterance);
  }, [isActive, autoListenAfterResponse]);

  // Démarrer l'écoute
  const startListening = useCallback(() => {
    if (!recognitionRef.current || isSpeaking || isProcessing) return;
    
    try {
      recognitionRef.current.start();
      setIsListening(true);
    } catch (e) {
      console.log("Déjà en écoute ou erreur:", e);
    }
  }, [isSpeaking, isProcessing]);
  
  // Arrêter l'écoute
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    setIsListening(false);
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
  }, []);
  
  // Activer le mode mains libres
  const activate = useCallback(() => {
    setIsActive(true);
    isAwaitingWakeWordRef.current = true;
    isManualModeRef.current = false;
    startListening();
  }, [startListening]);
  
  // Désactiver le mode mains libres
  const deactivate = useCallback(() => {
    setIsActive(false);
    stopListening();
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    isAwaitingWakeWordRef.current = true;
    isManualModeRef.current = false;
  }, [stopListening]);
  
  // Déclencher manuellement (push-to-talk)
  const triggerManual = useCallback(() => {
    if (isSpeaking || isProcessing) return;
    
    // Si déjà en écoute, on réinitialise
    if (isListening) {
      stopListening();
    }
    
    isAwaitingWakeWordRef.current = false;
    isManualModeRef.current = true;
    startListening();
    
    // Timeout de sécurité (30s max)
    setTimeout(() => {
      if (isManualModeRef.current) {
        isManualModeRef.current = false;
        stopListening();
      }
    }, 30000);
  }, [isSpeaking, isProcessing, isListening, stopListening, startListening]);
  
  // Parler quand une réponse arrive
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
