"use client";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

const publicRoutes = ["/login"];

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !user && !publicRoutes.includes(pathname)) {
      router.push("/login");
    }
  }, [user, isLoading, router, pathname]);

  // Pendant le chargement, on affiche un écran de chargement
  if (isLoading) {
    return (
      <div className="min-h-screen bg-midnight flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-gold-500 animate-spin" />
      </div>
    );
  }

  // Si l'utilisateur n'est pas connecté ET qu'on n'est pas sur une route publique
  // on ne retourne RIEN du tout (pas même le layout)
  if (!user && !publicRoutes.includes(pathname)) {
    return null;
  }

  // Si l'utilisateur est connecté ou sur une route publique, on affiche les enfants
  return <>{children}</>;
}
