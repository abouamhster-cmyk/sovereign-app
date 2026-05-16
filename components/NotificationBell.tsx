"use client";

import { useState, useEffect } from "react";
import { Bell, BellRing, Loader2, Trash2, Volume2, VolumeX, Vibrate } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

const VAPID_PUBLIC_KEY = "BBBlTgNIZqh8TWsKy73wptSd69jogrECwImktCKW3YbWeQgDkSwhvmsbhxr2mo57fJt_rhrgddIwQfgj3p9_0C0";
const API_URL = "https://sovereign-bridge.onrender.com";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function NotificationBell() {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [hasRequestedPermission, setHasRequestedPermission] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  
  // ========== COMPTEUR DE NOTIFICATIONS NON LUES ==========
  const [unreadCount, setUnreadCount] = useState(0);

  // Récupérer le nombre de notifications non lues
  const fetchUnreadCount = async () => {
    try {
      const { count, error } = await supabase
        .from("notifications")
        .select("*", { count: 'exact', head: true })
        .eq("read", false)
        .eq("user_id", "rebecca");
      
      if (error) throw error;
      setUnreadCount(count || 0);
    } catch (error) {
      console.error("Erreur fetchUnreadCount:", error);
    }
  };

  // Écouter les changements de notifications en temps réel
  useEffect(() => {
    fetchUnreadCount();
    
    const channel = supabase
      .channel('notifications_bell')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'notifications' }, 
        () => fetchUnreadCount()
      )
      .subscribe();
    
    // Écouter l'événement personnalisé de la page notifications
    const handleRefresh = () => fetchUnreadCount();
    window.addEventListener('refreshNotifications', handleRefresh);
    
    return () => {
      channel.unsubscribe();
      window.removeEventListener('refreshNotifications', handleRefresh);
    };
  }, []);

  // Charger les préférences au démarrage
  useEffect(() => {
    const savedSound = localStorage.getItem("notif_sound");
    const savedVibration = localStorage.getItem("notif_vibrate");
    if (savedSound !== null) setSoundEnabled(savedSound === "true");
    if (savedVibration !== null) setVibrationEnabled(savedVibration === "true");
  }, []);

  // Sauvegarder les préférences
  const savePreferences = (sound: boolean, vibration: boolean) => {
    localStorage.setItem("notif_sound", String(sound));
    localStorage.setItem("notif_vibrate", String(vibration));
    setSoundEnabled(sound);
    setVibrationEnabled(vibration);
    toast.success("Préférences sauvegardées");
  };

  useEffect(() => {
    checkSubscription();
    const timer = setTimeout(() => {
      if (!hasRequestedPermission && Notification.permission === "default") {
        autoRequestPermission();
      }
    }, 3000);
    
    return () => clearTimeout(timer);
  }, [hasRequestedPermission]);

  async function checkSubscription() {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setIsSupported(false);
      return;
    }

    try {
      const swReg = await navigator.serviceWorker.ready;
      const subscription = await swReg.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (error) {
      console.error("Erreur check subscription:", error);
      setIsSupported(false);
    }
  }

  async function autoRequestPermission() {
    if (Notification.permission !== "default") return;
    
    console.log("🔔 Demande automatique de permission...");
    const permission = await Notification.requestPermission();
    setHasRequestedPermission(true);
    
    if (permission === "granted") {
      console.log("✅ Permission accordée, création de la subscription...");
      await subscribeToPush();
    } else {
      console.log("❌ Permission refusée");
      toast.info("Active les notifications manuellement avec la cloche 🔔", {
        duration: 5000,
      });
    }
  }

  async function subscribeToPush() {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      toast.error("Votre navigateur ne supporte pas les notifications");
      return;
    }

    setIsLoading(true);

    try {
      let permission = Notification.permission;
      if (permission !== "granted") {
        permission = await Notification.requestPermission();
        setHasRequestedPermission(true);
      }
      
      if (permission !== "granted") {
        toast.error("Permission refusée pour les notifications");
        setIsLoading(false);
        return;
      }

      const swReg = await navigator.serviceWorker.ready;
      console.log("Service Worker prêt:", swReg);

      const subscription = await swReg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });
      console.log("Subscription créée:", subscription);

      const response = await fetch(`${API_URL}/api/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...subscription,
          preferences: {
            sound: soundEnabled,
            vibration: vibrationEnabled
          }
        })
      });

      const result = await response.json();

      if (result.success) {
        setIsSubscribed(true);
        toast.success("Notifications activées !", {
          description: "Vous recevrez les rappels importants"
        });
        
        setTimeout(() => {
          testNotification();
        }, 2000);
      } else {
        throw new Error(result.error || "Erreur serveur");
      }
    } catch (error) {
      console.error("Erreur subscription détaillée:", error);
      toast.error("Impossible d'activer les notifications");
    } finally {
      setIsLoading(false);
    }
  }

  async function unsubscribeFromPush() {
    if (!("serviceWorker" in navigator)) return;
    
    setIsLoading(true);
    try {
      const swReg = await navigator.serviceWorker.ready;
      const subscription = await swReg.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
        
        await fetch(`${API_URL}/api/unsubscribe`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint })
        });
        
        setIsSubscribed(false);
        toast.info("Notifications désactivées");
      }
    } catch (error) {
      console.error("Erreur unsubscription:", error);
      toast.error("Erreur lors de la désactivation");
    } finally {
      setIsLoading(false);
    }
  }

  async function testNotification() {
    try {
      const response = await fetch(`${API_URL}/api/send-notification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "🔔 SOVEREIGN",
          body: "Les notifications sont activées !",
          url: "/",
          sound: soundEnabled ? "/sounds/notification.mp3" : null,
          vibrate: vibrationEnabled ? [200, 100, 200] : null
        })
      });
      const result = await response.json();
      console.log("Notification test envoyée:", result);
    } catch (error) {
      console.error("Erreur test notification:", error);
    }
  }

  async function cleanExpiredSubscriptions() {
    setIsCleaning(true);
    try {
      const response = await fetch(`${API_URL}/api/clean-expired-subscriptions`, {
        method: "POST"
      });
      const result = await response.json();
      if (result.success) {
        toast.success(`${result.deleted} subscription(s) expirée(s) supprimée(s)`, {
          description: `${result.total} subscriptions au total, ${result.deleted} nettoyées`
        });
        await checkSubscription();
      } else {
        toast.error("Erreur: " + result.error);
      }
    } catch (error) {
      console.error("Erreur nettoyage:", error);
      toast.error("Erreur lors du nettoyage des subscriptions");
    } finally {
      setIsCleaning(false);
    }
  }

  const handleClick = () => {
    if (!isSupported) {
      toast.error("Notifications non supportées sur ce navigateur");
      return;
    }
    
    if (isSubscribed) {
      unsubscribeFromPush();
    } else {
      subscribeToPush();
    }
  };

  return (
    <div className="relative flex items-center gap-2">
      {/* Bouton des paramètres son/vibration */}
      <button
        onClick={() => setShowSettings(!showSettings)}
        className="p-2 rounded-full bg-white/5 text-gray-500 hover:text-gold-500 hover:bg-white/10 transition-all duration-300"
        title="Paramètres des notifications"
      >
        {soundEnabled ? (
          <Volume2 className="w-4 h-4" />
        ) : (
          <VolumeX className="w-4 h-4" />
        )}
      </button>

      {/* Menu des paramètres */}
      {showSettings && (
        <div className="absolute bottom-full left-0 mb-2 w-48 bg-midnight border border-white/10 rounded-xl shadow-xl z-50 p-3">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs text-gray-400 flex items-center gap-2">
                <Volume2 className="w-3 h-3" /> Son
              </label>
              <button
                onClick={() => savePreferences(!soundEnabled, vibrationEnabled)}
                className={`w-8 h-4 rounded-full transition-colors ${soundEnabled ? "bg-gold-500" : "bg-white/20"}`}
              >
                <div className={`w-3 h-3 rounded-full bg-white transition-transform ${soundEnabled ? "translate-x-4" : "translate-x-1"}`} />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <label className="text-xs text-gray-400 flex items-center gap-2">
                <Vibrate className="w-3 h-3" /> Vibration
              </label>
              <button
                onClick={() => savePreferences(soundEnabled, !vibrationEnabled)}
                className={`w-8 h-4 rounded-full transition-colors ${vibrationEnabled ? "bg-gold-500" : "bg-white/20"}`}
              >
                <div className={`w-3 h-3 rounded-full bg-white transition-transform ${vibrationEnabled ? "translate-x-4" : "translate-x-1"}`} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bouton de nettoyage */}
      <button
        onClick={cleanExpiredSubscriptions}
        disabled={isCleaning}
        className="p-2 rounded-full bg-white/5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all duration-300 disabled:opacity-50"
        title="Nettoyer les anciennes subscriptions"
      >
        {isCleaning ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Trash2 className="w-4 h-4" />
        )}
      </button>
      
      {/* Bouton principal d'activation/désactivation AVEC COMPTEUR */}
      <button
        onClick={handleClick}
        disabled={isLoading}
        className={`relative p-2 rounded-full transition-all duration-300 ${
          isSubscribed 
            ? "text-gold-500 bg-gold-500/10" 
            : "text-gray-500 hover:text-ivory hover:bg-white/5"
        } disabled:opacity-50`}
        title={isSubscribed ? "Désactiver les alertes" : "Activer les alertes"}
      >
        {isLoading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : isSubscribed ? (
          <BellRing className="w-5 h-5" />
        ) : (
          <Bell className="w-5 h-5" />
        )}
        
        {/* BULLE ROUGE DU COMPTEUR */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center px-1">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
        
        {/* Indicateur visuel si permission non accordée */}
        {!isSubscribed && Notification.permission === "default" && (
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-gold-500 rounded-full animate-pulse" />
        )}
      </button>
    </div>
  );
}
