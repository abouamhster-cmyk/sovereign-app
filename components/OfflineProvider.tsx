"use client";
import { createContext, useContext, useEffect } from "react";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import { toast } from "sonner";

const OfflineContext = createContext<ReturnType<typeof useOfflineSync> | null>(null);

export function useOffline() {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error("useOffline must be used within OfflineProvider");
  }
  return context;
}

export function OfflineProvider({ children }: { children: React.ReactNode }) {
  const offlineSync = useOfflineSync();

  // Notifications de changement de statut
  useEffect(() => {
    if (!offlineSync.isOnline) {
      toast.warning("📡 Mode hors ligne activé", {
        description: "Les modifications seront synchronisées au retour de la connexion",
        duration: 5000
      });
    } else if (offlineSync.pendingActions > 0) {
      toast.info("🔄 Synchronisation en cours...", {
        description: `${offlineSync.pendingActions} action(s) en attente`,
        duration: 3000
      });
    }
  }, [offlineSync.isOnline, offlineSync.pendingActions]);

  return (
    <OfflineContext.Provider value={offlineSync}>
      {children}
    </OfflineContext.Provider>
  );
}
