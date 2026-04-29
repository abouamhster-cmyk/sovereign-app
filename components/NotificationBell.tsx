"use client";

import { useState, useEffect } from "react";
import { Bell, BellRing, Loader2 } from "lucide-react";
import { toast } from "sonner";

const VAPID_PUBLIC_KEY = "BBBlTgNIZqh8TWsKy73wptSd69jogrECwImktCKW3YbWeQgDkSwhvmsbhxr2mo57fJt_rhrgddIwQfgj3p9_0C0";

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
  const [isSupported, setIsSupported] = useState(true);
  const [hasRequestedPermission, setHasRequestedPermission] = useState(false);

  useEffect(() => {
    checkSubscription();
    // Demander la permission automatiquement après 3 secondes (sauf si déjà fait)
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

  // NOUVELLE FONCTION : Demande automatique de permission
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
      // Demander la permission si pas encore accordée
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

      const response = await fetch("https://sovereign-bridge.onrender.com/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription)
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
        
        await fetch("https://sovereign-bridge.onrender.com/api/unsubscribe", {
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
      const response = await fetch("https://sovereign-bridge.onrender.com/api/send-notification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "🔔 SOVEREIGN",
          body: "Les notifications sont activées !",
          url: "/"
        })
      });
      const result = await response.json();
      console.log("Notification test envoyée:", result);
    } catch (error) {
      console.error("Erreur test notification:", error);
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
    <button
      onClick={handleClick}
      disabled={isLoading}
      className={`p-2 rounded-full transition-all duration-300 ${
        isSubscribed 
          ? "text-gold-500 bg-gold-500/10" 
          : "text-gray-500 hover:text-ivory hover:bg-white/5"
      } disabled:opacity-50 relative`}
      title={isSubscribed ? "Désactiver les alertes" : "Activer les alertes"}
    >
      {isLoading ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : isSubscribed ? (
        <BellRing className="w-5 h-5" />
      ) : (
        <Bell className="w-5 h-5" />
      )}
      {/* Indicateur visuel si permission non accordée */}
      {!isSubscribed && Notification.permission === "default" && (
        <span className="absolute -top-1 -right-1 w-2 h-2 bg-gold-500 rounded-full animate-pulse" />
      )}
    </button>
  );
}
