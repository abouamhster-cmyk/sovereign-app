"use client";

import { useState, useEffect } from "react";
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

// Structure du menu simplifiée
const menuItems = [
  { name: "Dashboard", icon: LayoutDashboard, href: "/", group: "main" },
  { name: "Chat", icon: MessageSquare, href: "/chat", group: "main" },
  
  { name: "Brain Dump", icon: Inbox, href: "/inbox", group: "operations" },
  { name: "Tasks", icon: CheckSquare, href: "/tasks", group: "operations" },
  { name: "Calendar", icon: Calendar, href: "/calendar", group: "operations" },
  
  { name: "Money", icon: Wallet, href: "/money", group: "strategies" },
  { name: "Opportunities", icon: TrendingUp, href: "/opportunities", group: "strategies" },
  { name: "Documents", icon: FileText, href: "/documents", group: "strategies" },
  
  { name: "Missions", icon: Target, href: "/missions", group: "projects" },
  { name: "Business", icon: Briefcase, href: "/business", group: "projects" },
  { name: "Ifè Farm", icon: Sprout, href: "/farm", group: "projects" },
  { name: "Relocation", icon: Globe, href: "/relocation", group: "projects" },
  
  { name: "Wins", icon: Trophy, href: "/wins", group: "vie" },
  { name: "Family", icon: Heart, href: "/family", group: "vie" },
  { name: "Motherhood", icon: Users, href: "/motherhood", group: "vie" },
  
  { name: "Alignment", icon: Zap, href: "/alignment", group: "alignment" },
  { name: "Rescue Mode", icon: ShieldAlert, href: "/rescue", group: "alignment" }
];

const groupLabels = {
  main: "PRINCIPAL",
  operations: "OPÉRATIONS",
  strategies: "STRATÉGIES",
  projects: "PROJETS",
  vie: "VIE",
  alignment: "ALIGNEMENT"
};

// État par défaut - tous ouverts
const DEFAULT_OPEN_GROUPS = {
  main: true,
  operations: true,
  strategies: true,
  projects: true,
  vie: true,
  alignment: true
};

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState(DEFAULT_OPEN_GROUPS);
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();

  // Charger les préférences
  useEffect(() => {
    const saved = localStorage.getItem("sidebar-open-groups");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setOpenGroups({ ...DEFAULT_OPEN_GROUPS, ...parsed });
      } catch (e) {
        console.error("Erreur:", e);
      }
    }
  }, []);

  // Sauvegarder
  useEffect(() => {
    if (user) {
      localStorage.setItem("sidebar-open-groups", JSON.stringify(openGroups));
    }
  }, [openGroups, user]);

  useEffect(() => {
    if ("serviceWorker" in navigator && window.Notification) {
      navigator.serviceWorker.register("/sw.js").then((reg) => {
        console.log("Service Worker actif", reg.scope);
      });
    }
  }, []);

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  const toggleGroup = (groupKey: string) => {
    setOpenGroups(prev => ({ ...prev, [groupKey]: !prev[groupKey] }));
  };

  const SidebarContent = () => {
    // Grouper les items par groupe
    const grouped = menuItems.reduce((acc, item) => {
      if (!acc[item.group]) acc[item.group] = [];
      acc[item.group].push(item);
      return acc;
    }, {} as Record<string, typeof menuItems>);

    return (
      <div className="flex flex-col h-full p-6">
        <nav className="flex-1 overflow-y-auto">
          {Object.entries(grouped).map(([groupKey, items]) => (
            <div key={groupKey} className="mb-6">
              <button
                onClick={() => toggleGroup(groupKey)}
                className="w-full flex items-center justify-between text-xs text-gray-500 uppercase tracking-wider py-2.5 hover:text-gold-400 transition-colors"
              >
                <span>{groupLabels[groupKey as keyof typeof groupLabels]}</span>
                {openGroups[groupKey] ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronRight className="w-3 h-3" />
                )}
              </button>
              
              {openGroups[groupKey] && (
                <div className="space-y-1">
                  {items.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                          isActive 
                            ? "bg-gold-500/10 text-gold-400" 
                            : "text-gray-400 hover:bg-white/5 hover:text-white"
                        }`}
                      >
                        <item.icon className="w-4 h-4" />
                        <span className="text-sm font-light">{item.name}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </nav>

        <div className="border-t border-white/10 pt-4 mt-2">
          <div className="flex justify-between items-center mb-4">
            <div>
              <div className="text-[10px] text-gray-600 uppercase tracking-wider">STATUS</div>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                <span className="text-xs text-gold-400">ACTIVE</span>
              </div>
            </div>
            <NotificationBell />
          </div>
          
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-500 hover:bg-red-500/10 hover:text-red-400 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm">Déconnexion</span>
          </button>
        </div>
      </div>
    );
  };

  if (!user) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar Desktop */}
      <aside className="hidden lg:block w-64 border-r border-white/10 bg-black/40 flex-col overflow-y-auto">
        <SidebarContent />
      </aside>

      {/* Mobile Menu Button */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 p-4 bg-black/80 backdrop-blur-lg border-b border-white/10 flex justify-between items-center">
        <span className="text-gold-500 tracking-wider text-sm">SOVEREIGN</span>
        <button onClick={() => setIsMobileMenuOpen(true)} className="p-2">
          <Menu className="w-5 h-5 text-gold-500" />
        </button>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <>
          <div
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/70 z-50 lg:hidden"
          />
          <aside className="fixed inset-y-0 right-0 w-72 bg-black z-50 border-l border-white/10 flex flex-col">
            <div className="flex justify-end p-4">
              <button onClick={() => setIsMobileMenuOpen(false)} className="p-2">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <SidebarContent />
            </div>
          </aside>
        </>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pt-20 lg:pt-0">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
