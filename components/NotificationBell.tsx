"use client";

import { useState, useEffect } from "react";
import { Bell, BellRing } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

const VAPID_PUBLIC_KEY = "BDKRJZfCHn7PxdrfojdRP7ZAFW1mnw8bKZM-mK6Ue8Q0almSSTPuLQRVlscGiXtJaLRYONMYgZgu_T5EKR6K92s";

export default function NotificationBell() {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    checkSubscription();
  }, []);

  async function checkSubscription() {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      console.log("Push non supporté");
      return;
    }

    try {
      const swReg = await navigator.serviceWorker.ready;
      const subscription = await swReg.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (error) {
      console.error("Erreur check subscription:", error);
    }
  }

  async function subscribeToPush() {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      toast.error("Votre navigateur ne supporte pas les notifications");
      return;
    }

    setIsLoading(true);

    try {
      // Demander la permission
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        toast.error("Permission refusée");
        return;
      }

      // Récupérer le service worker
      const swReg = await navigator.serviceWorker.ready;
      
      // Convertir la clé VAPID
      const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      
      // Créer la subscription
      const subscription = await swReg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey
      });

      // Envoyer la subscription au backend
      const response = await fetch("https://sovereign-bridge.onrender.com/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription)
      });

      if (response.ok) {
        setIsSubscribed(true);
        toast.success("Notifications activées", {
          description: "Vous recevrez les rappels importants"
        });
      } else {
        throw new Error("Erreur serveur");
      }
    } catch (error) {
      console.error("Erreur subscription:", error);
      toast.error("Impossible d'activer les notifications");
    } finally {
      setIsLoading(false);
    }
  }

  async function unsubscribeFromPush() {
    if (!("serviceWorker" in navigator)) return;
    
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
    }
  }

  const handleClick = () => {
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
      } disabled:opacity-50`}
      title={isSubscribed ? "Désactiver les alertes" : "Activer les alertes"}
    >
      {isLoading ? (
        <div className="w-5 h-5 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
      ) : isSubscribed ? (
        <BellRing className="w-5 h-5" />
      ) : (
        <Bell className="w-5 h-5" />
      )}
    </button>
  );
}

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