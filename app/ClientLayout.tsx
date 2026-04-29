"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  LayoutDashboard, Target, Heart, DollarSign, Briefcase, Calendar,
  MessageSquare, FileText, Inbox, Trophy, Megaphone, 
  Sprout, Shield, Globe, Baby, LogOut, Menu, X,
  Crown, ChevronDown, ChevronRight, Sparkles, FolderOpen, TrendingUp
} from "lucide-react";
import NotificationBell from "@/components/NotificationBell";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

// Structure hiérarchique du menu
const menuStructure = [
  {
    category: "Principal",
    icon: Crown,
    items: [
      { name: "Dashboard", href: "/", icon: LayoutDashboard },
      { name: "Chat", href: "/chat", icon: MessageSquare },
    ]
  },
  {
    category: "Opérations",
    icon: Briefcase,
    items: [
      { name: "Missions", href: "/missions", icon: Target },
      { name: "Tasks", href: "/tasks", icon: Briefcase },
      { name: "Money", href: "/money", icon: DollarSign },
      { name: "Calendar", href: "/calendar", icon: Calendar },
      { name: "Documents", href: "/documents", icon: FileText },
    ]
  },
  {
    category: "Création & Suivi",
    icon: Sparkles,
    items: [
      { name: "Content", href: "/content", icon: Megaphone },
      { name: "Wins", href: "/wins", icon: Trophy },
      { name: "Inbox", href: "/inbox", icon: Inbox },
      { name: "Brief", href: "/brief", icon: Crown },
      { name: "Weekly", href: "/weekly", icon: Crown },
    ]
  },
  {
    category: "Vie & Projets",
    icon: Heart,
    items: [
      { name: "Family", href: "/family", icon: Heart },
      { name: "Motherhood", href: "/motherhood", icon: Baby },
      { name: "Farm", href: "/farm", icon: Sprout },
      { name: "Relocation", href: "/relocation", icon: Globe },
    ]
  },
  {
    category: "Stratégie",
    icon: Shield,
    items: [
      { name: "Rescue", href: "/rescue", icon: Shield },
      { name: "Alignment", href: "/alignment", icon: Crown },
      { name: "Opportunities", href: "/opportunities", icon: TrendingUp },
    ]
  }
];

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({});
  const pathname = usePathname();
  const router = useRouter();
  const { signOut, user } = useAuth();

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Initialiser les catégories ouvertes (celles qui contiennent la page active)
  useEffect(() => {
    const newOpenState: Record<string, boolean> = {};
    for (const category of menuStructure) {
      const hasActiveItem = category.items.some(item => pathname === item.href);
      if (hasActiveItem) {
        newOpenState[category.category] = true;
      }
    }
    // Par défaut, ouvrir la première catégorie si aucune n'est active
    if (Object.keys(newOpenState).length === 0 && menuStructure.length > 0) {
      newOpenState[menuStructure[0].category] = true;
    }
    setOpenCategories(prev => ({ ...prev, ...newOpenState }));
  }, [pathname]);

  // Fermer la sidebar après navigation sur mobile
  useEffect(() => {
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  }, [pathname, isMobile]);

  const toggleCategory = (category: string) => {
    setOpenCategories(prev => ({ ...prev, [category]: !prev[category] }));
  };

  const handleLogout = async () => {
    try {
      await signOut();
      router.push("/login");
      toast.success("Déconnexion réussie");
    } catch (error) {
      toast.error("Erreur lors de la déconnexion");
    }
  };

  // Composant menu réutilisable
  const MenuContent = () => (
    <>
      {menuStructure.map((category) => {
        const isOpen = openCategories[category.category];
        const CategoryIcon = category.icon;
        const hasActiveItem = category.items.some(item => pathname === item.href);
        
        return (
          <div key={category.category} className="mb-1">
            <button
              onClick={() => toggleCategory(category.category)}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                hasActiveItem ? "text-gold-500" : "text-gray-500 hover:text-gray-400"
              }`}
            >
              <div className="flex items-center gap-2">
                <CategoryIcon className="w-3.5 h-3.5" />
                <span>{category.category}</span>
              </div>
              {isOpen ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </button>
            
            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden ml-3"
                >
                  <div className="space-y-0.5 mt-0.5">
                    {category.items.map((item) => {
                      const isActive = pathname === item.href;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-sm transition-all ${
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
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </>
  );

  // Version mobile
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
                {/* Header sidebar compact */}
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

                {/* Navigation avec sous-menus */}
                <nav className="flex-1 overflow-y-auto py-3 px-2">
                  <MenuContent />
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

        <nav className="flex-1 py-4 px-3">
          <MenuContent />
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
