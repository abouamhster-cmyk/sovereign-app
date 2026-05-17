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
  const [isAudioUnlocked, setIsAudioUnlocked] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState(VOICE_OPTIONS[0].id);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  // 🔓 DÉBLOQUER L'AUDIO AU PREMIER CLIC UTILISATEUR
  useEffect(() => {
    const unlockAudio = () => {
      if (!isAudioUnlocked) {
        // Créer un contexte audio silencieux pour débloquer
        try {
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          if (audioContext.state === 'suspended') {
            audioContext.resume();
          }
          console.log("🔓 Audio débloqué");
        } catch (e) {}
        setIsAudioUnlocked(true);
      }
    };
    
    window.addEventListener('click', unlockAudio);
    window.addEventListener('touchstart', unlockAudio);
    
    return () => {
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };
  }, [isAudioUnlocked]);

  const stop = useCallback(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    setIsSpeaking(false);
  }, []);

  useEffect(() => {
    return () => {
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
      }
    };
  }, []);

  const speak = useCallback(async (text: string, onEnd?: () => void) => {
    if (!text || text.length === 0) return;
    
    const cleanText = text
      .replace(/\[ACTION:[^\]]*\]/g, '')
      .replace(/\*\*/g, '')
      .replace(/✅|🎯|✨|⚠️|📋|🎉/g, '')
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
        audio.onerror = (err) => {
          console.error("Erreur lecture audio:", err);
          fallbackSpeak(cleanText, onEnd);
          setIsLoading(false);
        };
        
        // Forcer la lecture
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch((error) => {
            console.error("Lecture bloquée, fallback:", error);
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
    if (!window.speechSynthesis) return;
    
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'fr-FR';
    utterance.rate = 0.9;
    utterance.pitch = 1.1;
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => {
      setIsSpeaking(false);
      onEnd?.();
    };
    utterance.onerror = () => setIsSpeaking(false);
    
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
