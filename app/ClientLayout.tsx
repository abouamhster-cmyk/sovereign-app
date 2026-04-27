"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  LayoutDashboard, MessageSquare, Inbox, CheckSquare, Calendar,
  Wallet, TrendingUp, FileText, Target, Briefcase, Sprout, Globe,
  Trophy, Heart, Users, Zap, ShieldAlert, Menu, X, LogOut,
  ChevronDown, ChevronRight
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import NotificationBell from "@/components/NotificationBell";
import { useAuth } from "@/contexts/AuthContext";

// Structure du menu
const menuGroups = [
  {
    title: null,
    key: "root",
    items: [
      { name: "Dashboard", icon: LayoutDashboard, href: "/" },
      { name: "Chat", icon: MessageSquare, href: "/chat" },
    ]
  },
  {
    title: "COMMAND CENTER",
    key: "command",
    icon: "🧠",
    items: [
      { name: "Brain Dump", icon: Inbox, href: "/inbox" },
      { name: "Tasks", icon: CheckSquare, href: "/tasks" },
      { name: "Calendar", icon: Calendar, href: "/calendar" },
    ]
  },
  {
    title: "FINANCES",
    key: "finances",
    icon: "💰",
    items: [
      { name: "Money", icon: Wallet, href: "/money" },
      { name: "Opportunities", icon: TrendingUp, href: "/opportunities" },
      { name: "Documents", icon: FileText, href: "/documents" },
    ]
  },
  {
    title: "PROJETS",
    key: "projects",
    icon: "🌾",
    items: [
      { name: "Missions", icon: Target, href: "/missions" },
      { name: "Business", icon: Briefcase, href: "/business" },
      { name: "Ifè Farm", icon: Sprout, href: "/farm" },
      { name: "Relocation", icon: Globe, href: "/relocation" },
    ]
  },
  {
    title: "VIE",
    key: "life",
    icon: "❤️",
    items: [
      { name: "Wins", icon: Trophy, href: "/wins" },
      { name: "Family", icon: Heart, href: "/family" },
      { name: "Motherhood", icon: Users, href: "/motherhood" },
    ]
  },
  {
    title: "ALIGNEMENT",
    key: "alignment",
    icon: "🛡️",
    items: [
      { name: "Alignment", icon: Zap, href: "/alignment" },
      { name: "Rescue Mode", icon: ShieldAlert, href: "/rescue" },
    ]
  }
];

// État par défaut des groupes
const DEFAULT_OPEN_GROUPS: Record<string, boolean> = {
  "command": true,
  "finances": false,
  "projects": false,
  "life": false,
  "alignment": false
};

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(DEFAULT_OPEN_GROUPS);
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();

  // Charger les préférences sauvegardées au démarrage
  useEffect(() => {
    const saved = localStorage.getItem("sidebar-open-groups");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setOpenGroups({ ...DEFAULT_OPEN_GROUPS, ...parsed });
      } catch (e) {
        console.error("Erreur chargement préférences:", e);
      }
    }
  }, []);

  // Sauvegarder les préférences quand elles changent
  useEffect(() => {
    localStorage.setItem("sidebar-open-groups", JSON.stringify(openGroups));
  }, [openGroups]);

  useEffect(() => {
    if ("serviceWorker" in navigator && window.Notification) {
      navigator.serviceWorker.register("/sw.js").then((reg) => {
        console.log("Sovereign Service Worker Active", reg.scope);
      });
    }
  }, []);

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  const toggleGroup = (key: string) => {
    setOpenGroups(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full p-5">
      <div className="text-xl font-serif tracking-[0.2em] text-gold-500 text-center mb-6">
        SOVEREIGN
      </div>
      
      <nav className="flex-1 overflow-y-auto scrollbar-none">
        {menuGroups.map((group) => (
          <div key={group.key} className="mb-4">
            {group.title ? (
              <button
                onClick={() => toggleGroup(group.key)}
                className="w-full flex items-center justify-between text-[10px] text-gray-500 uppercase tracking-wider py-2 hover:text-gold-500 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <span>{group.icon}</span>
                  <span>{group.title}</span>
                </span>
                {openGroups[group.key] ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronRight className="w-3 h-3" />
                )}
              </button>
            ) : null}
            
            {(!group.title || openGroups[group.key]) && (
              <div className="space-y-1">
                {group.items.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all ${
                        isActive 
                          ? "bg-gold-500/10 text-gold-500" 
                          : "text-gray-400 hover:bg-white/5 hover:text-ivory"
                      }`}
                    >
                      <item.icon className="w-4 h-4" />
                      <span className="text-sm">{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 pt-4 mt-4">
        <div className="flex justify-between items-center mb-3">
          <div>
            <div className="text-[9px] text-gray-500 uppercase tracking-wider">Empire Status</div>
            <div className="flex items-center gap-2 mt-1">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-xs text-gold-500">REBECCA ONE</span>
            </div>
          </div>
          <NotificationBell />
        </div>
        
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-gray-500 hover:bg-red-500/10 hover:text-red-400 transition-all"
        >
          <LogOut className="w-4 h-4" />
          <span className="text-sm">Déconnexion</span>
        </button>
      </div>
    </div>
  );

  if (!user) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="hidden lg:flex w-64 border-r border-white/5 bg-midnight/50 backdrop-blur-xl flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto scrollbar-none">
          <SidebarContent />
        </div>
      </aside>

      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 p-4 bg-midnight/80 backdrop-blur-lg border-b border-white/5 flex justify-between items-center">
        <span className="font-serif text-gold-500 tracking-widest">SOVEREIGN</span>
        <button onClick={() => setIsMobileMenuOpen(true)} className="p-2">
          <Menu className="w-6 h-6 text-gold-500" />
        </button>
      </div>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 lg:hidden"
            />
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25 }}
              className="fixed inset-y-0 right-0 w-72 bg-midnight z-50 border-l border-white/10 flex flex-col"
            >
              <div className="flex justify-end p-4">
                <button onClick={() => setIsMobileMenuOpen(false)} className="p-2">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                <SidebarContent />
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <main className="flex-1 overflow-y-auto bg-midnight relative pt-20 lg:pt-0 scrollbar-none">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
