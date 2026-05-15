"use client";
import { useEffect, useState } from "react";
import { WifiOff, RefreshCw, Home, MessageCircle } from "lucide-react";
import Link from "next/link";

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    
    const handleOnline = () => {
      setIsOnline(true);
      window.location.reload();
    };
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-midnight">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-emerald-400 mx-auto mb-4 animate-spin" />
          <p className="text-ivory">Connexion rétablie, redirection...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-midnight p-6">
      <div className="text-center max-w-md">
        <div className="w-24 h-24 mx-auto mb-6 bg-white/10 rounded-full flex items-center justify-center">
          <WifiOff className="w-12 h-12 text-gray-500" />
        </div>
        <h1 className="text-2xl font-serif text-gold-500 mb-2">Mode hors ligne</h1>
        <p className="text-gray-400 mb-6">
          Tu n'es pas connecté à internet. Certaines fonctionnalités sont limitées,
          mais tu peux continuer à utiliser l'application.
        </p>
        
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6">
          <p className="text-sm text-gold-400 mb-2">✨ Disponible hors ligne :</p>
          <ul className="text-xs text-gray-400 space-y-1 text-left">
            <li>• 📋 Consultation des tâches en cache</li>
            <li>• 📝 Brain Dump (sera synchronisé plus tard)</li>
            <li>• 💬 Messages en attente</li>
            <li>• 📄 Documents récents</li>
          </ul>
        </div>
        
        <div className="flex gap-3 justify-center">
          <Link
            href="/"
            className="px-6 py-2 bg-gold-500 text-midnight rounded-full text-sm font-medium"
          >
            <Home className="w-4 h-4 inline mr-2" />
            Accueil
          </Link>
          <Link
            href="/chat"
            className="px-6 py-2 bg-white/10 text-gray-300 rounded-full text-sm font-medium hover:bg-white/20"
          >
            <MessageCircle className="w-4 h-4 inline mr-2" />
            Chat
          </Link>
        </div>
      </div>
    </div>
  );
}
