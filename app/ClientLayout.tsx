"use client";

import { useState, useEffect } from "react";
import { 
  LayoutDashboard, MessageSquare, Inbox, CheckSquare, Calendar,
  Wallet, TrendingUp, FileText, Target, Briefcase, Sprout, Globe,
  Trophy, Heart, Users, Zap, ShieldAlert, Menu, X, LogOut,
  ChevronDown, ChevronRight, Download
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

const groupLabels: Record<string, string> = {
  main: "PRINCIPAL",
  operations: "OPÉRATIONS",
  strategies: "STRATÉGIES",
  projects: "PROJETS",
  vie: "VIE",
  alignment: "ALIGNEMENT"
};

// État par défaut - tous ouverts
const DEFAULT_OPEN_GROUPS: Record<string, boolean> = {
  main: true,
  operations: true,
  strategies: true,
  projects: true,
  vie: true,
  alignment: true
};





// Composant d'invite d'installation PWA - UNIQUEMENT SUR MOBILE
function InstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isInstalled, setIsInstalled] = useState(true);
  
  // Détecter si on est sur mobile
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  
  // NE RIEN AFFICHER SUR ORDINATEUR
  if (!isMobile) return null;

  useEffect(() => {
    const checkInstalled = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isStandaloneIOS = (window.navigator as any).standalone === true;
      const isAppInstalled = isStandalone || isStandaloneIOS;
      
      if (isAppInstalled) {
        setIsInstalled(true);
        setIsVisible(false);
        return true;
      }
      return false;
    };

    if (checkInstalled()) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (!checkInstalled()) {
        setIsVisible(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setIsVisible(false);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsVisible(false);
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  if (isInstalled || !isVisible) return null;

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  
  if (isIOS) {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-50 bg-gradient-to-r from-gold-500/10 to-gold-500/5 backdrop-blur-xl border border-gold-500/30 rounded-2xl p-4 shadow-2xl">
        <div className="flex items-start gap-3">
          <div className="bg-gold-500/20 p-2 rounded-full">
            <Download className="w-5 h-5 text-gold-500" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-serif text-gold-500">Installer SOVEREIGN sur iPhone</h3>
            <p className="text-xs text-gray-400 mt-1">
              Appuie sur <span className="text-gold-500 font-bold">Partager</span> puis <span className="text-gold-500 font-bold">"Ajouter à l'écran d'accueil"</span>
            </p>
          </div>
          <button onClick={() => setIsVisible(false)} className="text-gray-500 hover:text-gray-400">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={handleInstall}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gold-500 bg-gold-500/10 hover:bg-gold-500/20 transition-colors mb-2"
    >
      <Download className="w-4 h-4" />
      <span className="text-sm">Installer l'application</span>
    </button>
  );
}

// Bannière d'installation en bas - UNIQUEMENT SUR MOBILE
function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(true);
  
  // Détecter si on est sur mobile
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  
  // NE RIEN AFFICHER SUR ORDINATEUR
  if (!isMobile) return null;

  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isStandaloneIOS = (window.navigator as any).standalone === true;
    
    if (isStandalone || isStandaloneIOS) {
      setIsInstalled(true);
      return;
    }

    setIsInstalled(false);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('installPromptDismissed', Date.now().toString());
  };

  useEffect(() => {
    const dismissed = localStorage.getItem('installPromptDismissed');
    if (dismissed && Date.now() - parseInt(dismissed) < 7 * 24 * 60 * 60 * 1000) {
      setShowPrompt(false);
    }
  }, []);

  if (isInstalled || !showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 bg-gradient-to-r from-gold-500/10 to-gold-500/5 backdrop-blur-xl border border-gold-500/30 rounded-2xl p-4 shadow-2xl">
      <div className="flex items-start gap-3">
        <div className="bg-gold-500/20 p-2 rounded-full">
          <Download className="w-5 h-5 text-gold-500" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-serif text-gold-500">Installer SOVEREIGN</h3>
          <p className="text-xs text-gray-400 mt-1">
            Installe l'application pour y accéder plus rapidement et recevoir les notifications.
          </p>
          <div className="flex gap-3 mt-3">
            <button
              onClick={handleInstall}
              className="px-4 py-1.5 bg-gold-500 text-midnight rounded-full text-xs font-medium hover:bg-gold-400 transition-colors"
            >
              Installer
            </button>
            <button
              onClick={handleDismiss}
              className="px-4 py-1.5 bg-white/10 text-gray-400 rounded-full text-xs hover:bg-white/20 transition-colors"
            >
              Plus tard
            </button>
          </div>
        </div>
        <button onClick={handleDismiss} className="text-gray-500 hover:text-gray-400">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}


export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(DEFAULT_OPEN_GROUPS);
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();

  // Détecter si on est sur la page chat
  const isChatPage = pathname === '/chat';

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
    const grouped = menuItems.reduce((acc, item) => {
      if (!acc[item.group]) acc[item.group] = [];
      acc[item.group].push(item);
      return acc;
    }, {} as Record<string, typeof menuItems>);

    return (
      <div className="flex flex-col h-full p-6">
        <nav className="flex-1 overflow-y-auto">
          <InstallButton />
          
          {Object.entries(grouped).map(([groupKey, items]) => (
            <div key={groupKey} className="mb-6">
              <button
                onClick={() => toggleGroup(groupKey)}
                className="w-full flex items-center justify-between text-xs text-gray-500 uppercase tracking-wider py-2.5 hover:text-gold-400 transition-colors"
              >
                <span>{groupLabels[groupKey] || groupKey}</span>
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

  // Version mobile avec détection de la page chat
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  
  if (isMobile) {
    return (
      <div className="min-h-screen bg-midnight">
        {/* Barre d'en-tête mobile - masquée sur la page chat */}
        {!isChatPage && (
          <header className="sticky top-0 z-30 flex items-center justify-between h-12 px-3 bg-midnight/95 backdrop-blur-lg border-b border-white/10">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-1.5 text-gold-500 hover:bg-white/10 rounded-lg transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            
            <div className="flex items-center gap-2">
              <NotificationBell />
              <button
                onClick={handleSignOut}
                className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-white/10 rounded-lg transition-colors"
                title="Déconnexion"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </header>
        )}

        {/* Mobile Menu Button (seulement sur les pages non-chat) */}
        {!isChatPage && (
          <div className="lg:hidden fixed top-0 left-0 right-0 z-50 p-4 bg-black/80 backdrop-blur-lg border-b border-white/10 flex justify-between items-center">
            <span className="text-gold-500 tracking-wider text-sm">SOVEREIGN</span>
            <button onClick={() => setIsMobileMenuOpen(true)} className="p-2">
              <Menu className="w-5 h-5 text-gold-500" />
            </button>
          </div>
        )}

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

        {/* Main Content - pas de padding sur le chat */}
        <main className={isChatPage ? "h-screen" : "h-[calc(100vh-48px)] overflow-y-auto"}>
          {isChatPage ? (
            children
          ) : (
            <div className="w-full px-3 md:px-5 py-4 md:py-6">
              {children}
              <InstallBanner />
            </div>
          )}
        </main>
      </div>
    );
  }

  // Version desktop
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar Desktop */}
      <aside className="hidden lg:block w-64 border-r border-white/10 bg-black/40 flex-col overflow-y-auto">
        <SidebarContent />
      </aside>

      {/* Main Content Desktop */}
      <main className="flex-1 overflow-y-auto pt-20 lg:pt-0">
        <div className="w-full px-3 md:px-5 py-4 md:py-6">
          {children}
          <InstallBanner />
        </div>
      </main>
    </div>
  );
}
