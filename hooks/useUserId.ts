"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export function useUserId() {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError) throw authError;
        
        setUserId(user?.id || null);
      } catch (err) {
        console.error("Erreur récupération user:", err);
        setError(err instanceof Error ? err.message : "Erreur inconnue");
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  return { userId, loading, error };
}
