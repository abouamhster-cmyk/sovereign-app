// hooks/useLiveVoice.ts
import { useState, useEffect, useRef } from "react";

export function useLiveVoice() {
  const [isConnected, setIsConnected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState("");
  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const connect = (userId: string) => {
    const ws = new WebSocket(`wss://sovereign-bridge.onrender.com/ws/voice/${userId}`);
    
    ws.onopen = () => {
      console.log("🔊 Connexion vocale établie");
      setIsConnected(true);
      startMicrophone();
    };
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === "audio") {
        // Jouer l'audio reçu
        const audio = new Audio(`data:audio/mp3;base64,${data.data}`);
        audio.onplay = () => setIsSpeaking(true);
        audio.onended = () => setIsSpeaking(false);
        audio.play();
      }
      
      if (data.type === "text") {
        setTranscript(data.content);
      }
      
      if (data.type === "thinking") {
        console.log("🧠 IA réfléchit...");
      }
    };
    
    ws.onclose = () => {
      setIsConnected(false);
      stopMicrophone();
    };
    
    wsRef.current = ws;
  };

  const startMicrophone = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        audioChunksRef.current = [];
        
        // Convertir en base64 et envoyer
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
      
      // Détection de silence pour arrêter automatiquement
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      source.connect(analyser);
      
      const checkSilence = () => {
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        
        if (average < 10 && mediaRecorder.state === "recording") {
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = setTimeout(() => {
            if (mediaRecorder.state === "recording") {
              mediaRecorder.stop();
              setIsListening(false);
            }
          }, 1500);
        } else if (average > 10 && mediaRecorder.state !== "recording") {
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
          audioChunksRef.current = [];
          mediaRecorder.start(100);
          setIsListening(true);
        }
        
        requestAnimationFrame(checkSilence);
      };
      
      checkSilence();
      
    } catch (error) {
      console.error("Erreur microphone:", error);
    }
  };

  const stopMicrophone = () => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    setIsListening(false);
  };

  const disconnect = () => {
    stopMicrophone();
    if (wsRef.current) {
      wsRef.current.close();
    }
  };

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  return {
    connect,
    disconnect,
    isConnected,
    isListening,
    isSpeaking,
    transcript
  };
}
