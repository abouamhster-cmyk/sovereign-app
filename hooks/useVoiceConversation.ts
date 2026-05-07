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
  wakeWords = ["hey becks", "dis becks", "becks", "sovereign", "hey sovereign"],
  autoListenAfterResponse = true,
  silenceTimeout = 3000,
}: UseVoiceConversationProps) {
  const [isActive, setIsActive] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [wakeWordDetected, setWakeWordDetected] = useState(false);
  
  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const wakeWordTimerRef = useRef<NodeJS.Timeout | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const lastTranscriptRef = useRef<string>("");
  const isAwaitingWakeWordRef = useRef<boolean>(true);

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
      
      // Détection du wake word
      if (isAwaitingWakeWordRef.current && !isProcessing && !isSpeaking) {
        const containsWakeWord = wakeWords.some(word => transcript.includes(word));
        if (containsWakeWord) {
          console.log("🎤 Wake word détecté:", transcript);
          setWakeWordDetected(true);
          isAwaitingWakeWordRef.current = false;
          
          // Nettoyer le transcript pour ne garder que ce qui vient après le wake word
          let cleanTranscript = transcript;
          for (const word of wakeWords) {
            if (cleanTranscript.includes(word)) {
              cleanTranscript = cleanTranscript.split(word).pop() || "";
              break;
            }
          }
          
          if (cleanTranscript.trim().length > 0) {
            // Il y a une requête directe avec le wake word
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
            onUserSpeech(cleanTranscript.trim());
            stopListening();
          } else {
            // Juste le wake word, on se met en écoute pour la suite
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
          }
        }
      }
      
      // Si on est en mode écoute active (après wake word ou bouton)
      if (!isAwaitingWakeWordRef.current && !isProcessing && !isSpeaking) {
        // Détection de la fin de parole (silence)
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        
        silenceTimerRef.current = setTimeout(() => {
          const finalTranscript = transcript;
          if (finalTranscript.trim().length > 0 && finalTranscript !== lastTranscriptRef.current) {
            console.log("🎤 Silence détecté, envoi de:", finalTranscript);
            lastTranscriptRef.current = finalTranscript;
            onUserSpeech(finalTranscript);
            stopListening();
          }
        }, silenceTimeout);
      }
    };
    
    recognitionRef.current.onerror = (event: any) => {
      console.error("Erreur reconnaissance:", event.error);
      if (event.error === "not-allowed") {
        setIsActive(false);
      }
      setIsListening(false);
    };
    
    recognitionRef.current.onend = () => {
      setIsListening(false);
      
      // Si le mode est actif et qu'on n'attend pas de wake word
      if (isActive && !isAwaitingWakeWordRef.current && !isProcessing && !isSpeaking && autoListenAfterResponse) {
        // Se remet en écoute après un court délai
        setTimeout(() => startListening(), 500);
      } else if (isActive && isAwaitingWakeWordRef.current) {
        // En mode écoute de wake word, on reste à l'écoute
        setTimeout(() => startListening(), 500);
      }
    };
    
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (wakeWordTimerRef.current) clearTimeout(wakeWordTimerRef.current);
    };
  }, [wakeWords, silenceTimeout, onUserSpeech, isProcessing, isSpeaking, isActive, autoListenAfterResponse]);

  // Faire parler l'assistant
  const speak = useCallback((text: string) => {
    if (!window.speechSynthesis || !text) return;
    
    // Nettoyer les timers
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
      
      // Se remet en écoute après la réponse si le mode est actif
      if (isActive && autoListenAfterResponse) {
        isAwaitingWakeWordRef.current = false;
        setTimeout(() => startListening(), 500);
      } else if (isActive) {
        isAwaitingWakeWordRef.current = true;
        setTimeout(() => startListening(), 500);
      }
    };
    
    utterance.onerror = () => {
      setIsSpeaking(false);
    };
    
    utteranceRef.current = utterance;
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
    startListening();
  }, [startListening]);
  
  // Désactiver le mode mains libres
  const deactivate = useCallback(() => {
    setIsActive(false);
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
    }
    window.speechSynthesis.cancel();
    setIsListening(false);
    setIsSpeaking(false);
    isAwaitingWakeWordRef.current = true;
  }, []);
  
  // Parler quand une réponse arrive
  useEffect(() => {
    if (lastResponse && !isProcessing && isActive && lastResponse.length > 0 && !isSpeaking) {
      speak(lastResponse);
    }
  }, [lastResponse, isProcessing, isActive, isSpeaking, speak]);
  
  // Déclencher manuellement (bouton poussoir)
  const triggerManual = useCallback(() => {
    if (isSpeaking || isProcessing) return;
    
    // Si déjà en écoute, on réinitialise
    if (isListening) {
      stopListening();
    }
    
    isAwaitingWakeWordRef.current = false;
    startListening();
  }, [isSpeaking, isProcessing, isListening, stopListening, startListening]);
  
  return {
    isActive,
    isListening,
    isSpeaking,
    wakeWordDetected,
    activate,
    deactivate,
    triggerManual,
    speak,
  };
}
