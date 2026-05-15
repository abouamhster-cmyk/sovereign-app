"use client";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";

type PendingAction = {
  id: string;
  type: "insert" | "update" | "delete";
  table: string;
  data: any;
  timestamp: number;
};

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingActions, setPendingActions] = useState<PendingAction[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  // Détecter les changements de connexion
  useEffect(() => {
    setIsOnline(navigator.onLine);
    
    const handleOnline = () => {
      setIsOnline(true);
      syncPendingActions();
    };
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Charger les actions en attente
  useEffect(() => {
    const saved = localStorage.getItem("pending_actions");
    if (saved) {
      setPendingActions(JSON.parse(saved));
    }
  }, []);

  // Sauvegarder les actions en attente
  const savePendingActions = useCallback((actions: PendingAction[]) => {
    localStorage.setItem("pending_actions", JSON.stringify(actions));
    setPendingActions(actions);
  }, []);

  // Ajouter une action en attente
  const queueAction = useCallback(async (type: PendingAction["type"], table: string, data: any) => {
    const newAction: PendingAction = {
      id: `${Date.now()}-${Math.random()}`,
      type,
      table,
      data,
      timestamp: Date.now()
    };
    
    const newActions = [...pendingActions, newAction];
    savePendingActions(newActions);
    
    // Si online, exécuter immédiatement
    if (isOnline) {
      await executeAction(newAction);
    }
    
    return newAction.id;
  }, [pendingActions, isOnline, savePendingActions]);

  // Exécuter une action
  const executeAction = useCallback(async (action: PendingAction) => {
    try {
      let result;
      switch (action.type) {
        case "insert":
          result = await supabase.from(action.table).insert(action.data);
          break;
        case "update":
          result = await supabase.from(action.table).update(action.data).eq("id", action.data.id);
          break;
        case "delete":
          result = await supabase.from(action.table).delete().eq("id", action.data.id);
          break;
      }
      
      if (!result?.error) {
        // Supprimer l'action de la file
        const newActions = pendingActions.filter(a => a.id !== action.id);
        savePendingActions(newActions);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Erreur exécution action:", error);
      return false;
    }
  }, [pendingActions, savePendingActions]);

  // Synchroniser toutes les actions en attente
  const syncPendingActions = useCallback(async () => {
    if (!isOnline || pendingActions.length === 0 || isSyncing) return;
    
    setIsSyncing(true);
    console.log(`🔄 Synchronisation de ${pendingActions.length} action(s)...`);
    
    const newPendingActions = [...pendingActions];
    const succeeded: string[] = [];
    
    for (const action of newPendingActions) {
      const success = await executeAction(action);
      if (success) {
        succeeded.push(action.id);
      }
    }
    
    const remaining = newPendingActions.filter(a => !succeeded.includes(a.id));
    savePendingActions(remaining);
    
    setIsSyncing(false);
    console.log(`✅ Synchronisation terminée. ${succeeded.length} réussi(s), ${remaining.length} restant(s)`);
    
    return { succeeded: succeeded.length, remaining: remaining.length };
  }, [isOnline, pendingActions, isSyncing, executeAction, savePendingActions]);

  return {
    isOnline,
    isSyncing,
    pendingActions: pendingActions.length,
    queueAction,
    syncPendingActions
  };
}
