"use client";

import { useState, useEffect } from "react";
import { 
  LayoutDashboard, MessageSquare, Inbox, CheckSquare, Calendar,
  Wallet, TrendingUp, FileText, Target, Briefcase, Sprout, Globe,
  Trophy, Heart, Users, Zap, ShieldAlert, Menu, X, LogOut,
  ChevronDown, ChevronRight, Download, Settings, Mail, Brain, Bell, BellRing
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

// Structure du menu
const menuItems = [
  { name: "Dashboard", icon: LayoutDashboard, href: "/", group: "main" },
  { name: "Chat", icon: MessageSquare, href: "/chat", group: "main" },
  
  { name: "Brain Dump", icon: Inbox, href: "/inbox", group: "operations" },
  { name: "Tasks", icon: CheckSquare, href: "/tasks", group: "operations" },
  { name: "Calendar", icon: Calendar, href: "/calendar", group: "operations" },
  
  { name: "Money", icon: Wallet, href: "/money", group: "strategies" },
  { name: "Opportunities", icon: TrendingUp, href: "/opportunities", group: "strategies" },
  { name: "Documents", icon: FileText, href: "/documents", group: "strategies" },
  { name: "Email", icon: Mail, href: "/email", group: "strategies" },
  
  { name: "Missions", icon: Target, href: "/missions", group: "projects" },
  { name: "Business", icon: Briefcase, href: "/business", group: "projects" },
  { name: "Love & Fire Sport", icon: Trophy, href: "/love-fire-sport", group: "projects" },
  { name: "Ifè Farm", icon: Sprout, href: "/farm", group: "projects" },
  { name: "Relocation", icon: Globe, href: "/relocation", group: "projects" },
  
  { name: "Wins", icon: Trophy, href: "/wins", group: "vie" },
  { name: "Family", icon: Heart, href: "/family", group: "vie" },
  { name: "Motherhood", icon: Users, href: "/motherhood", group: "vie" },
  
  { name: "Alignment", icon: Zap, href: "/alignment", group: "alignment" },
  { name: "Rescue Mode", icon: ShieldAlert, href: "/rescue", group: "alignment" },
  { name: "Mémoire", icon: Brain, href: "/memory", group: "alignment" },

  { name: "Settings", icon: Settings, href: "/settings", group: "settings" }
];

const groupLabels: Record<string, string> = {
  main: "PRINCIPAL",
  operations: "OPÉRATIONS",
  strategies: "STRATÉGIES",
  projects: "PROJETS",
  vie: "VIE",
  alignment: "ALIGNEMENT",
  settings: "RÉGLAGES"
};

const DEFAULT_OPEN_GROUPS: Record<string, boolean> = {
  main: true,
  operations: true,
  strategies: true,
  projects: true,
  vie: true,
  alignment: true,
  settings: true
};

const VAPID_PUBLIC_KEY = "BBBlTgNIZqh8TWsKy73wptSd69jogrECwImktCKW3YbWeQgDkSwhvmsbhxr2mo57fJt_rhrgddIwQfgj3p9_0C0";
const API_URL = "https://sovereign-bridge.onrender.com";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Composant unique pour les notifications (fusion du badge et de la cloche)
function NotificationCenter() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  // Récupérer le nombre de notifications non lues
  useEffect(() => {
    fetchUnreadCount();
    
    const channel = supabase
      .channel('notifications_unread')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => {
        fetchUnreadCount();
      })
      .subscribe();
    
    return () => {
      channel.unsubscribe();
    };
  }, []);

  // Vérifier l'abonnement push
  useEffect(() => {
    checkSubscription();
  }, []);

  async function fetchUnreadCount() {
    const { count } = await supabase
      .from("notifications")
      .select("*", { count: 'exact', head: true })
      .eq("read", false)
      .eq("user_id", "rebecca");
    
    setUnreadCount(count || 0);
  }

  async function checkSubscription() {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    try {
      const swReg = await navigator.serviceWorker.ready;
      const subscription = await swReg.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (error) {
      console.error("Erreur check subscription:", error);
    }
  }

  async function togglePushSubscription() {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    
    setIsLoading(true);
    
    try {
      if (isSubscribed) {
        // Désactiver
        const swReg = await navigator.serviceWorker.ready;
        const subscription = await swReg.pushManager.getSubscription();
        if (subscription) {
          await subscription.unsubscribe();
          await fetch(`${API_URL}/api/unsubscribe`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endpoint: subscription.endpoint })
          });
          setIsSubscribed(false);
        }
      } else {
        // Activer
        let permission = Notification.permission;
        if (permission !== "granted") {
          permission = await Notification.requestPermission();
        }
        
        if (permission !== "granted") return;
        
        const swReg = await navigator.serviceWorker.ready;
        const subscription = await swReg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
        });
        
        await fetch(`${API_URL}/api/subscribe`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(subscription)
        });
        
        setIsSubscribed(true);
      }
    } catch (error) {
      console.error("Erreur subscription:", error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="relative p-2 rounded-full text-gray-400 hover:text-gold-500 hover:bg-white/5 transition-colors"
        title="Notifications"
      >
        {isSubscribed ? (
          <BellRing className="w-5 h-5" />
        ) : (
          <Bell className="w-5 h-5" />
        )}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center px-1">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Menu déroulant */}
      {showMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
          <div className="absolute right-0 top-full mt-2 w-64 bg-midnight border border-white/10 rounded-xl shadow-xl z-50 overflow-hidden">
            <div className="p-3 border-b border-white/10">
              <p className="text-xs text-gray-400">Notifications</p>
            </div>
            
            <Link
              href="/notifications"
              onClick={() => setShowMenu(false)}
              className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-300 hover:bg-white/5 transition-colors w-full"
            >
              <Bell className="w-4 h-4" />
              Voir toutes les notifications
              {unreadCount > 0 && (
                <span className="ml-auto text-xs bg-gold-500/20 text-gold-500 px-1.5 py-0.5 rounded-full">
                  {unreadCount}
                </span>
              )}
            </Link>
            
            <div className="border-t border-white/10 my-1" />
            
            <button
              onClick={() => {
                togglePushSubscription();
                setShowMenu(false);
              }}
              disabled={isLoading}
              className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-300 hover:bg-white/5 transition-colors w-full"
            >
              {isSubscribed ? (
                <>
                  <BellRing className="w-4 h-4 text-emerald-400" />
                  <span>Notifications push activées</span>
                  <span className="ml-auto text-xs text-gray-500">Désactiver</span>
                </>
              ) : (
                <>
                  <Bell className="w-4 h-4" />
                  <span>Activer les notifications</span>
                </>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// Composant d'invite d'installation PWA - UNIQUEMENT SUR MOBILE
function InstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isInstalled, setIsInstalled] = useState(true);
  
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
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
      <span className="text-sm">Installer</span>
    </button>
  );
}

// Bannière d'installation en bas - UNIQUEMENT SUR MOBILE
function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(true);
  
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
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
            Installe l'application pour y accéder plus rapidement.
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

  const isChatPage = pathname === '/chat';

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
      <div className="flex flex-col h-full">
        <div className="px-4 py-5 border-b border-white/10">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gold-500 rounded-full flex items-center justify-center">
              <span className="text-midnight font-bold text-sm">S</span>
            </div>
            <span className="text-base font-serif text-gold-500 tracking-wider">SOVEREIGN</span>
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          <InstallButton />
          
          {Object.entries(grouped).map(([groupKey, items]) => (
            <div key={groupKey} className="mb-2">
              <button
                onClick={() => toggleGroup(groupKey)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-gray-500 hover:text-gold-400 transition-colors"
              >
                <span className="tracking-wider">{groupLabels[groupKey] || groupKey}</span>
                {openGroups[groupKey] ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5" />
                )}
              </button>
              
              {openGroups[groupKey] && (
                <div className="ml-2 space-y-0.5 mt-1">
                  {items.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                          isActive 
                            ? "bg-gold-500/10 text-gold-400" 
                            : "text-gray-400 hover:bg-white/5 hover:text-white"
                        }`}
                      >
                        <item.icon className="w-4 h-4" />
                        <span className="font-light">{item.name}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </nav>

        <div className="border-t border-white/10 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
              <span className="text-[10px] text-gray-500">Connecté</span>
            </div>
            <NotificationCenter />
          </div>
          
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-red-500/10 hover:text-red-400 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Déconnexion</span>
          </button>
        </div>
      </div>
    );
  };

  if (!user) {
    return <>{children}</>;
  }

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  
  if (isMobile) {
    return (
      <div className="min-h-screen bg-midnight">
        {!isChatPage && (
          <header className="sticky top-0 z-30 flex items-center justify-between h-12 px-3 bg-midnight/95 backdrop-blur-lg border-b border-white/10">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-1.5 text-gold-500 hover:bg-white/10 rounded-lg transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            
            <div className="flex items-center gap-2">
              <NotificationCenter />
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

        {isMobileMenuOpen && (
          <>
            <div
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/70 z-40"
            />
            <aside className="fixed inset-y-0 right-0 w-72 bg-midnight z-50 border-l border-white/10 flex flex-col shadow-2xl">
              <div className="flex justify-end p-3">
                <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-gray-500 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                <SidebarContent />
              </div>
            </aside>
          </>
        )}

        <main className={isChatPage ? "h-screen" : "h-[calc(100vh-48px)] overflow-y-auto"}>
          {isChatPage ? (
            children
          ) : (
            <div className="w-full px-3 pt-6 pb-12">
              {children}
              <InstallBanner />
            </div>
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-midnight">
      <aside className="hidden lg:flex w-64 flex-col border-r border-white/10 bg-black/30 backdrop-blur-sm overflow-y-auto">
        <SidebarContent />
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="w-full px-4 md:px-6 py-6 md:py-8">
          {children}
          <InstallBanner />
        </div>
      </main>
    </div>
  );
}
