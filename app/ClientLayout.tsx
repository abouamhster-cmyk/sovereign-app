"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  LayoutDashboard, Target, Heart, DollarSign, Briefcase, Calendar,
  MessageSquare, FileText, Inbox, Trophy, Megaphone, 
  Sprout, Shield, Globe, Baby, LogOut, Menu, X,
  Bell, BellRing, Loader2, Crown
} from "lucide-react";
import NotificationBell from "@/components/NotificationBell";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const navItems = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Chat", href: "/chat", icon: MessageSquare },
  { name: "Missions", href: "/missions", icon: Target },
  { name: "Tasks", href: "/tasks", icon: Briefcase },
  { name: "Money", href: "/money", icon: DollarSign },
  { name: "Calendar", href: "/calendar", icon: Calendar },
  { name: "Content", href: "/content", icon: Megaphone },
  { name: "Documents", href: "/documents", icon: FileText },
  { name: "Inbox", href: "/inbox", icon: Inbox },
  { name: "Wins", href: "/wins", icon: Trophy },
  { name: "Brief", href: "/brief", icon: Crown },
  { name: "Weekly", href: "/weekly", icon: Crown },
  { name: "Rescue", href: "/rescue", icon: Shield },
  { name: "Family", href: "/family", icon: Heart },
  { name: "Motherhood", href: "/motherhood", icon: Baby },
  { name: "Farm", href: "/farm", icon: Sprout },
  { name: "Relocation", href: "/relocation", icon: Globe },
  { name: "Alignment", href: "/alignment", icon: Crown },
  { name: "Opportunities", href: "/opportunities", icon: Crown },
];

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { signOut, user } = useAuth();

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Fermer la sidebar après navigation sur mobile
  useEffect(() => {
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  }, [pathname, isMobile]);

  const handleLogout = async () => {
    try {
      await signOut();
      router.push("/login");
      toast.success("Déconnexion réussie");
    } catch (error) {
      toast.error("Erreur lors de la déconnexion");
    }
  };

  // Version mobile : afficher le bouton menu, pas de sidebar permanente
  if (isMobile) {
    return (
      <div className="min-h-screen bg-midnight">
        {/* Barre d'en-tête mobile simplifiée */}
        <header className="sticky top-0 z-30 flex items-center justify-between h-12 px-3 bg-midnight/95 backdrop-blur-lg border-b border-white/10">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-1.5 text-gold-500 hover:bg-white/10 rounded-lg transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-2">
            <NotificationBell />
            <button
              onClick={handleLogout}
              className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-white/10 rounded-lg transition-colors"
              title="Déconnexion"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Sidebar mobile */}
        <AnimatePresence>
          {isSidebarOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsSidebarOpen(false)}
                className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40"
              />
              <motion.aside
                initial={{ x: -280 }}
                animate={{ x: 0 }}
                exit={{ x: -280 }}
                transition={{ type: "spring", damping: 25 }}
                className="fixed top-0 left-0 bottom-0 w-64 bg-midnight/95 backdrop-blur-xl z-50 border-r border-white/10 flex flex-col shadow-2xl"
              >
                {/* Header sidebar - plus compact */}
                <div className="flex items-center justify-between px-3 py-3 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <Crown className="w-4 h-4 text-gold-500" />
                    <span className="text-xs font-serif text-gold-500 tracking-wider">SOVEREIGN</span>
                  </div>
                  <button
                    onClick={() => setIsSidebarOpen(false)}
                    className="p-1 text-gray-400 hover:text-gold-500 rounded-lg"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Navigation - compacte */}
                <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
                  {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setIsSidebarOpen(false)}
                        className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-all ${
                          isActive
                            ? "bg-gold-500/10 text-gold-500 border-l-2 border-gold-500"
                            : "text-gray-400 hover:text-ivory hover:bg-white/5"
                        }`}
                      >
                        <item.icon className="w-4 h-4" />
                        <span>{item.name}</span>
                      </Link>
                    );
                  })}
                </nav>

                {/* Footer compact */}
                <div className="p-2 border-t border-white/10">
                  <div className="flex items-center justify-between px-2 py-1.5">
                    <span className="text-[10px] text-gray-600 truncate">
                      {user?.email?.split('@')[0] || "Rebecca"}
                    </span>
                    <button
                      onClick={handleLogout}
                      className="p-1 text-gray-500 hover:text-red-400 transition-colors"
                      title="Déconnexion"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Contenu principal */}
        <main className="h-[calc(100vh-48px)] overflow-y-auto">
          {children}
        </main>
      </div>
    );
  }

  // Version desktop : sidebar permanente
  return (
    <div className="flex h-screen bg-midnight">
      {/* Sidebar desktop */}
      <aside className="w-64 flex-shrink-0 border-r border-white/10 bg-midnight/50 backdrop-blur-sm flex flex-col overflow-y-auto">
        <div className="p-5 border-b border-white/10">
          <Link href="/" className="flex items-center gap-2">
            <Crown className="w-6 h-6 text-gold-500" />
            <span className="text-lg font-serif text-gold-500 tracking-wider">SOVEREIGN</span>
          </Link>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                  isActive
                    ? "bg-gold-500/10 text-gold-500 border-l-2 border-gold-500"
                    : "text-gray-400 hover:text-ivory hover:bg-white/5"
                }`}
              >
                <item.icon className="w-4 h-4" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-gray-500">Notifications</span>
            <NotificationBell />
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-red-400 hover:bg-white/5 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Contenu principal */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
