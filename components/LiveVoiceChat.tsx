"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Mic, MicOff, Volume2, VolumeX, Loader2, X, Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

const API_URL = "https://sovereign-bridge.onrender.com";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface LiveVoiceChatProps {
  userId: string;
  onClose?: () => void;
}

export function LiveVoiceChat({ userId, onClose }: LiveVoiceChatProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [manualInput, setManualInput] = useState("");
  const [isWakeWordActive, setIsWakeWordActive] = useState(false);
  
  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Nettoyage complet des ressources
  const cleanup = useCallback(() => {
    // Arrêter le MediaRecorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch(e) {}
    }
    mediaRecorderRef.current = null;
    
    // Arrêter toutes les tracks du stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      streamRef.current = null;
    }
    
    // Fermer l'AudioContext
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    // Nettoyer les timers
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    setIsListening(false);
  }, []);

  // Arrêter le microphone
  const stopMicrophone = useCallback(() => {
    cleanup();
  }, [cleanup]);

  // Démarrer le microphone avec analyse audio continue
  const startMicrophone = useCallback(async () => {
    if (streamRef.current) {
      toast.info("Micro déjà actif");
      return;
    }
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      // Configurer l'analyse audio
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const analyser = audioContext.createAnalyser();
      analyserRef.current = analyser;
      analyser.fftSize = 256;
      
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      
      if (audioContext.state === "suspended") {
        await audioContext.resume();
      }
      
      // MediaRecorder pour l'envoi audio
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        if (audioChunksRef.current.length === 0) return;
        
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        audioChunksRef.current = [];
        
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(",")[1];
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
              type: "audio_chunk",
              audio: base64,
              is_final: true
            }));
          }
        };
        reader.readAsDataURL(audioBlob);
      };
      
      // Détection de silence
      const checkAudio = () => {
        if (!analyserRef.current || !mediaRecorderRef.current) {
          animationFrameRef.current = requestAnimationFrame(checkAudio);
          return;
        }
        
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);
        
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avgVolume = sum / dataArray.length;
        const isSilent = avgVolume < 15;
        
        // Si son détecté et pas en train d'enregistrer
        if (!isSilent && mediaRecorderRef.current.state !== "recording") {
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
          audioChunksRef.current = [];
          mediaRecorderRef.current.start(100);
          setIsListening(true);
        }
        // Si silence pendant l'enregistrement
        else if (isSilent && mediaRecorderRef.current.state === "recording") {
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = setTimeout(() => {
            if (mediaRecorderRef.current?.state === "recording") {
              mediaRecorderRef.current.stop();
            }
            setIsListening(false);
          }, 1000);
        }
        
        animationFrameRef.current = requestAnimationFrame(checkAudio);
      };
      
      checkAudio();
      toast.success("🎤 Micro activé - Parlez maintenant");
      
    } catch (error) {
      console.error("Erreur microphone:", error);
      toast.error("Impossible d'accéder au microphone");
    }
  }, []);

  // Connexion WebSocket
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    
    setIsConnecting(true);
    
    const ws = new WebSocket(`${API_URL.replace("https", "wss")}/ws/voice/${userId}`);
    
    ws.onopen = () => {
      console.log("🔊 WebSocket vocal connecté");
      setIsConnected(true);
      setIsConnecting(false);
      toast.success("🎤 Connecté - Cliquez sur le micro pour parler");
    };
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === "audio") {
        const audio = new Audio(`data:audio/mp3;base64,${data.data}`);
        audio.onplay = () => setIsSpeaking(true);
        audio.onended = () => setIsSpeaking(false);
        audio.play().catch(console.error);
      }
      
      if (data.type === "text") {
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: "assistant",
          content: data.content,
          timestamp: new Date()
        }]);
      }
      
      if (data.type === "thinking") {
        setIsThinking(data.status);
      }
      
      if (data.type === "ready") {
        toast.info(data.message);
      }
      
      if (data.type === "wake_word_detected") {
        setIsWakeWordActive(true);
        toast.info("🎤 Je t'écoute...", { duration: 2000 });
        setTimeout(() => setIsWakeWordActive(false), 10000);
      }
    };
    
    ws.onclose = () => {
      console.log("🔊 WebSocket vocal déconnecté");
      setIsConnected(false);
      stopMicrophone();
    };
    
    ws.onerror = (error) => {
      console.error("Erreur WebSocket:", error);
      toast.error("Erreur de connexion vocale");
      setIsConnecting(false);
    };
    
    wsRef.current = ws;
  }, [userId, stopMicrophone]);

  // Déconnexion
  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    stopMicrophone();
    setIsConnected(false);
  }, [stopMicrophone]);

  // Envoyer un message texte manuel
  const sendManualMessage = () => {
    if (!manualInput.trim() || wsRef.current?.readyState !== WebSocket.OPEN) return;
    
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: "user",
      content: manualInput,
      timestamp: new Date()
    }]);
    
    wsRef.current.send(JSON.stringify({
      type: "audio_chunk",
      audio: "",
      is_final: true,
      text_override: manualInput
    }));
    
    setManualInput("");
  };

  // Réinitialiser la conversation
  const resetConversation = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "reset_conversation" }));
      setMessages([]);
      toast.success("Conversation réinitialisée");
    }
  };

  // Nettoyage au démontage
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl bg-midnight border border-gold-500/30 rounded-2xl overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-gold-500/5">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className={`w-3 h-3 rounded-full ${isConnected ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`} />
              {isSpeaking && (
                <div className="absolute inset-0 w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
              )}
            </div>
            <h2 className="text-lg font-serif text-gold-500">🎤 Live Voice</h2>
            {isThinking && (
              <div className="flex items-center gap-1 text-xs text-gray-400">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Becks réfléchit...</span>
              </div>
            )}
            {isWakeWordActive && (
              <div className="flex items-center gap-1 text-xs text-gold-400">
                <Mic className="w-3 h-3 animate-pulse" />
                <span>Je t'écoute...</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {!isConnected && !isConnecting && (
              <button
                onClick={connect}
                className="px-3 py-1.5 bg-gold-500 text-midnight rounded-full text-xs font-medium"
              >
                Activer
              </button>
            )}
            {isConnecting && (
              <Loader2 className="w-4 h-4 text-gold-500 animate-spin" />
            )}
            {isConnected && (
              <button
                onClick={disconnect}
                className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded-full text-xs font-medium hover:bg-red-500/30"
              >
                Désactiver
              </button>
            )}
            <button onClick={resetConversation} className="p-2 text-gray-500 hover:text-gold-500">
              🔄
            </button>
            {onClose && (
              <button onClick={onClose} className="p-2 text-gray-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="h-96 overflow-y-auto p-4 space-y-3 bg-black/20">
          {messages.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <Volume2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Parle à Becks en direct</p>
              <p className="text-xs mt-1">Activez le micro puis parlez naturellement</p>
              <p className="text-xs text-gold-500 mt-2">💡 Dis "Hey Sovereign" pour réveiller l'assistant</p>
            </div>
          )}
          
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                  msg.role === "user"
                    ? "bg-gold-500 text-midnight rounded-br-none"
                    : "bg-white/10 text-ivory border border-white/5 rounded-bl-none"
                }`}
              >
                {msg.content}
                <div className="text-[10px] opacity-50 mt-1">
                  {msg.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}
          
          {isListening && (
            <div className="flex justify-start">
              <div className="bg-red-500/20 border border-red-500/30 p-3 rounded-2xl rounded-bl-none">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-sm text-red-400">🎤 Je t'écoute...</span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Status bar */}
        <div className="p-3 border-t border-white/10 bg-white/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isConnected ? (
                <>
                  {!isListening ? (
                    <button
                      onClick={startMicrophone}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors"
                    >
                      <Mic className="w-3 h-3" />
                      <span>Activer le micro</span>
                    </button>
                  ) : (
                    <button
                      onClick={stopMicrophone}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs bg-red-500/20 text-red-400 animate-pulse hover:bg-red-500/30 transition-colors"
                    >
                      <MicOff className="w-3 h-3" />
                      <span>Désactiver le micro</span>
                    </button>
                  )}
                </>
              ) : (
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <MicOff className="w-4 h-4" />
                  <span>Déconnecté</span>
                </div>
              )}
              
              {isSpeaking && (
                <div className="flex items-center gap-2 text-xs text-gold-500">
                  <Volume2 className="w-4 h-4 animate-pulse" />
                  <span>Becks parle...</span>
                </div>
              )}
            </div>
            
            {/* Input manuel (fallback) */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendManualMessage()}
                placeholder="Ou écris ici..."
                className="bg-white/10 border border-white/20 rounded-full px-3 py-1 text-xs text-ivory placeholder:text-gray-500 focus:outline-none focus:border-gold-500"
                disabled={!isConnected}
              />
              <button
                onClick={sendManualMessage}
                disabled={!manualInput.trim() || !isConnected}
                className="p-1.5 bg-gold-500/20 rounded-full text-gold-500 disabled:opacity-50"
              >
                <Send className="w-3 h-3" />
              </button>
            </div>
          </div>
          
          <div className="mt-2 text-center text-[10px] text-gray-500">
            💡 Astuce : Activez le micro, puis parlez. Le micro se coupe après 1 seconde de silence.
          </div>
        </div>
      </motion.div>
    </div>
  );
}
