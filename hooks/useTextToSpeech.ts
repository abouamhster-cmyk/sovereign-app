"use client";
import { useState, useCallback, useRef, useEffect } from "react";

const API_URL = "https://sovereign-bridge.onrender.com";

export const VOICE_OPTIONS = [
  { id: "aura-2-athena-en", name: "Athena", description: "Féminine, chaleureuse" },
  { id: "aura-2-hera-en", name: "Hera", description: "Féminine, élégante" },
  { id: "aura-2-odysseus-en", name: "Odysseus", description: "Masculine, douce" },
  { id: "aura-2-orion-en", name: "Orion", description: "Masculine, claire" },
  { id: "aura-2-thalia-en", name: "Thalia", description: "Féminine, jeune" },
];

export function useTextToSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState(VOICE_OPTIONS[0].id);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  // Nettoyage à la destruction
  useEffect(() => {
    return () => {
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }
    };
  }, []);

  const stop = useCallback(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    setIsSpeaking(false);
  }, []);

  const speak = useCallback(async (text: string, onEnd?: () => void) => {
    if (!text || text.length === 0) return;
    
    // Nettoyer le texte des balises et émojis
    const cleanText = text
      .replace(/\[ACTION:[^\]]*\]/g, '')
      .replace(/\*\*/g, '')
      .replace(/[✅🎯✨⚠️📋🎉⭐🌟🔥💪👑💖]/g, '')
      .trim();
    
    if (cleanText.length === 0) return;
    
    stop();
    setIsLoading(true);
    
    try {
      const response = await fetch(`${API_URL}/api/tts/deepgram`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: cleanText, voice: selectedVoice })
      });
      
      const data = await response.json();
      
      if (data.success && data.audio) {
        const audio = new Audio(`data:audio/mp3;base64,${data.audio}`);
        currentAudioRef.current = audio;
        
        audio.onplay = () => {
          setIsSpeaking(true);
          setIsLoading(false);
        };
        audio.onended = () => {
          setIsSpeaking(false);
          currentAudioRef.current = null;
          onEnd?.();
        };
        audio.onerror = () => {
          console.error("Erreur lecture audio, fallback Web Speech");
          fallbackSpeak(cleanText, onEnd);
          setIsLoading(false);
        };
        
        // Forcer la lecture
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {
            fallbackSpeak(cleanText, onEnd);
          });
        }
      } else {
        fallbackSpeak(cleanText, onEnd);
      }
    } catch (error) {
      console.error("Erreur TTS:", error);
      fallbackSpeak(cleanText, onEnd);
    } finally {
      setIsLoading(false);
    }
  }, [selectedVoice, stop]);

  const fallbackSpeak = useCallback((text: string, onEnd?: () => void) => {
    if (!window.speechSynthesis) {
      console.warn("Web Speech API non supportée");
      return;
    }
    
    // Annuler toute parole en cours
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'fr-FR';
    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => {
      setIsSpeaking(false);
      onEnd?.();
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
      console.error("Erreur Web Speech");
    };
    
    window.speechSynthesis.speak(utterance);
  }, []);

  return { 
    speak, 
    stop, 
    isSpeaking, 
    isLoading, 
    selectedVoice, 
    setSelectedVoice, 
    voiceOptions: VOICE_OPTIONS 
  };
}
