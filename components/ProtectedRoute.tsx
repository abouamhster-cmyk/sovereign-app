"use client";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

const publicRoutes = ["/login"];

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [isDataReady, setIsDataReady] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    async function checkDataReady() {
      if (user && !isAuthLoading) {
        // Charger les données initiales essentielles
        try {
          await Promise.all([
            supabase.from("missions").select("id", { count: "exact", head: true }),
            supabase.from("tasks").select("id", { count: "exact", head: true }),
          ]);
          setIsDataReady(true);
        } catch (error) {
          console.error("Erreur chargement initial:", error);
          setIsDataReady(true); // On passe quand même pour éviter un blocage
        }
      } else if (!user && !isAuthLoading && !publicRoutes.includes(pathname)) {
        router.push("/login");
      }
    }
    
    checkDataReady();
  }, [user, isAuthLoading, router, pathname]);

  // Pendant le chargement de l'auth ou des données
  if (isAuthLoading || (user && !isDataReady)) {
    return (
      <div className="fixed inset-0 bg-midnight flex flex-col items-center justify-center z-50">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-gold-500/20 rounded-full"></div>
          <div className="w-16 h-16 border-4 border-gold-500 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
        </div>
        <div className="mt-6 text-center">
          <p className="text-gold-500 font-serif text-xl tracking-wider">SOVEREIGN</p>
         </div>
      </div>
    );
  }

  // Si pas d'utilisateur et pas sur une route publique → ne rien rendre
  if (!user && !publicRoutes.includes(pathname)) {
    return null;
  }

  return <>{children}</>;
}
