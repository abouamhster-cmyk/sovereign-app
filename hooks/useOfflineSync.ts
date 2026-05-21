"use client";
import { useEffect, useState, useCallback, useRef } from "react";
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
  const isSyncingRef = useRef(false);
  const actionsLoadedRef = useRef(false);

  // ========== 1. DÉTECTION DE CONNEXION ==========
  useEffect(() => {
    setIsOnline(navigator.onLine);
    
    const handleOnline = () => {
      console.log("📡 Connexion rétablie");
      setIsOnline(true);
      // Attendre un peu avant de synchroniser
      setTimeout(() => syncPendingActions(), 2000);
    };
    
    const handleOffline = () => {
      console.log("📡 Connexion perdue");
      setIsOnline(false);
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // ========== 2. CHARGEMENT DES ACTIONS EN ATTENTE ==========
  useEffect(() => {
    if (actionsLoadedRef.current) return;
    
    try {
      const saved = localStorage.getItem("sovereign_pending_actions");
      if (saved) {
        const actions = JSON.parse(saved);
        // Filtrer les actions trop anciennes (> 7 jours)
        const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const freshActions = actions.filter((a: PendingAction) => a.timestamp > weekAgo);
        setPendingActions(freshActions);
        console.log(`📦 ${freshActions.length} action(s) en attente chargée(s)`);
        
        // Sauvegarder la version filtrée
        if (freshActions.length !== actions.length) {
          localStorage.setItem("sovereign_pending_actions", JSON.stringify(freshActions));
        }
      }
    } catch (error) {
      console.error("Erreur chargement actions:", error);
    }
    
    actionsLoadedRef.current = true;
  }, []);

  // ========== 3. SAUVEGARDE DES ACTIONS ==========
  const savePendingActions = useCallback((actions: PendingAction[]) => {
    try {
      localStorage.setItem("sovereign_pending_actions", JSON.stringify(actions));
      setPendingActions(actions);
    } catch (error) {
      console.error("Erreur sauvegarde actions:", error);
    }
  }, []);

  // ========== 4. AJOUTER UNE ACTION EN ATTENTE ==========
  const queueAction = useCallback(async (
    type: PendingAction["type"], 
    table: string, 
    data: any
  ): Promise<string | null> => {
    const newAction: PendingAction = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      type,
      table,
      data,
      timestamp: Date.now()
    };
    
    const newActions = [...pendingActions, newAction];
    savePendingActions(newActions);
    
    console.log(`📝 Action mise en file: ${type} ${table}`);
    
    // Si online, exécuter immédiatement
    if (isOnline && !isSyncingRef.current) {
      const success = await executeAction(newAction);
      if (success) {
        const remaining = pendingActions.filter(a => a.id !== newAction.id);
        savePendingActions(remaining);
        return newAction.id;
      }
    }
    
    return newAction.id;
  }, [pendingActions, isOnline, savePendingActions]);

  // ========== 5. EXÉCUTER UNE ACTION ==========
  const executeAction = useCallback(async (action: PendingAction): Promise<boolean> => {
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
        default:
          console.warn(`Type d'action inconnu: ${action.type}`);
          return false;
      }
      
      if (result?.error) {
        console.error(`Erreur action ${action.type} ${action.table}:`, result.error);
        return false;
      }
      
      console.log(`✅ Action exécutée: ${action.type} ${action.table}`);
      return true;
      
    } catch (error) {
      console.error(`Exception action ${action.type} ${action.table}:`, error);
      return false;
    }
  }, []);

  // ========== 6. SYNCHRONISER TOUTES LES ACTIONS ==========
  const syncPendingActions = useCallback(async (): Promise<{ succeeded: number; remaining: number }> => {
    if (!isOnline) {
      console.log("📡 Hors ligne, synchronisation impossible");
      return { succeeded: 0, remaining: pendingActions.length };
    }
    
    if (pendingActions.length === 0) {
      return { succeeded: 0, remaining: 0 };
    }
    
    if (isSyncingRef.current) {
      console.log("⏳ Synchronisation déjà en cours");
      return { succeeded: 0, remaining: pendingActions.length };
    }
    
    isSyncingRef.current = true;
    setIsSyncing(true);
    
    console.log(`🔄 Synchronisation de ${pendingActions.length} action(s)...`);
    
    const actionsCopy = [...pendingActions];
    const succeededIds: string[] = [];
    
    // Exécuter les actions dans l'ordre
    for (const action of actionsCopy) {
      const success = await executeAction(action);
      if (success) {
        succeededIds.push(action.id);
      }
      // Petit délai entre les actions pour éviter les conflits
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Garder uniquement les actions échouées
    const remainingActions = actionsCopy.filter(a => !succeededIds.includes(a.id));
    savePendingActions(remainingActions);
    
    isSyncingRef.current = false;
    setIsSyncing(false);
    
    console.log(`✅ Synchronisation terminée: ${succeededIds.length} réussi(s), ${remainingActions.length} restant(s)`);
    
    return { 
      succeeded: succeededIds.length, 
      remaining: remainingActions.length 
    };
    
  }, [isOnline, pendingActions, executeAction, savePendingActions]);

  // ========== 7. NETTOYER LES ANCIENNES ACTIONS ==========
  const cleanOldActions = useCallback((): number => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const freshActions = pendingActions.filter(a => a.timestamp > weekAgo);
    const removedCount = pendingActions.length - freshActions.length;
    
    if (removedCount > 0) {
      savePendingActions(freshActions);
      console.log(`🧹 ${removedCount} action(s) ancienne(s) supprimée(s)`);
    }
    
    return removedCount;
  }, [pendingActions, savePendingActions]);

  // ========== 8. SYNC AUTO AU DÉMARRAGE (si online) ==========
  useEffect(() => {
    if (isOnline && pendingActions.length > 0 && !isSyncingRef.current) {
      // Attendre que la page soit stable
      const timer = setTimeout(() => {
        syncPendingActions();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, pendingActions.length, syncPendingActions]);

  return {
    isOnline,
    isSyncing,
    pendingActions: pendingActions.length,
    queueAction,
    syncPendingActions,
    cleanOldActions
  };
}
