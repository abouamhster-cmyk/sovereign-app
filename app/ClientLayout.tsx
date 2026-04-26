"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  LayoutDashboard, Users, Wallet, Building2, 
  Megaphone, FileText, Globe, Zap, Menu, X,
  CheckSquare, Target, Sprout, Trophy, Home,
  Briefcase, Calendar, FileCheck, Layers, MessageSquare,
  LogOut, TrendingUp, Inbox, ShieldAlert, Clock,
  ChevronDown, ChevronRight
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import NotificationBell from "@/components/NotificationBell";
import { useAuth } from "@/contexts/AuthContext";

// Structure des menus avec sous-menus
const menuStructure = [
  {
    section: "core",
    title: "COMMAND CENTER",
    items: [
      { name: "Dashboard", icon: LayoutDashboard, href: "/" },
      { name: "Brain Dump", icon: Inbox, href: "/inbox" },
      { name: "Daily Brief", icon: Calendar, href: "/brief" },
      { name: "Weekly Review", icon: Clock, href: "/weekly" },
      { name: "Chat", icon: MessageSquare, href: "/chat" },
    ]
  },
  {
    section: "business",
    title: "BUSINESS & PROJECTS",
    items: [
      { name: "Missions", icon: Target, href: "/missions" },
      { name: "Tasks", icon: CheckSquare, href: "/tasks" },
      { name: "Calendar", icon: Calendar, href: "/calendar" },
      { name: "Business", icon: Briefcase, href: "/business" },
    ]
  },
  {
    section: "finances",
    title: "FINANCES",
    items: [
      { name: "Money", icon: Wallet, href: "/money" },
      { name: "Opportunities", icon: TrendingUp, href: "/opportunities" },
    ]
  },
  {
    section: "content",
    title: "CONTENT & DOCS",
    items: [
      { name: "Content", icon: Megaphone, href: "/content" },
      { name: "Documents", icon: FileText, href: "/documents" },
    ]
  },
  {
    section: "life",
    title: "FAMILY & LIFE",
    items: [
      { name: "Motherhood", icon: Users, href: "/motherhood" },
      { name: "Family", icon: Calendar, href: "/family" },
      { name: "Wins", icon: Trophy, href: "/wins" },
    ]
  },
  {
    section: "projects",
    title: "ACTIVE PROJECTS",
    items: [
      { name: "Ifè Farm", icon: Sprout, href: "/farm" },
      { name: "Relocation", icon: Globe, href: "/relocation" },
    ]
  },
  {
    section: "alignment",
    title: "ALIGNMENT",
    items: [
      { name: "Alignment", icon: Zap, href: "/alignment" },
      { name: "Rescue Mode", icon: ShieldAlert, href: "/rescue" },
    ]
  }
];

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    core: true,
    business: true,
    finances: true,
    content: true,
    life: true,
    projects: true,
    alignment: true
  });
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();

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

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full p-6">
      <div className="text-2xl font-serif tracking-[0.2em] text-gold-500 mb-8 text-center">
        SOVEREIGN
      </div>
      
      <nav className="flex-1 space-y-2 overflow-y-auto scrollbar-none">
        {menuStructure.map((section) => (
          <div key={section.section} className="mb-4">
            {/* En-tête de section avec accordéon */}
            <button
              onClick={() => toggleSection(section.section)}
              className="w-full flex items-center justify-between text-[9px] text-gray-500 uppercase tracking-[0.2em] py-2 hover:text-gold-500 transition-colors"
            >
              <span>{section.title}</span>
              {openSections[section.section] ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
            </button>
            
            {/* Items du menu (accordéon) */}
            <AnimatePresence>
              {openSections[section.section] && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-1 mt-1">
                    {section.items.map((item) => {
                      const isActive = pathname === item.href;
                      return (
                        <Link 
                          key={item.href}
                          href={item.href}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className={`flex items-center space-x-3 p-3 rounded-xl transition-all duration-300 group ${
                            isActive 
                              ? "bg-gold-500/10 text-gold-500" 
                              : "text-gray-400 hover:bg-white/5 hover:text-ivory"
                          }`}
                        >
                          <item.icon className={`w-5 h-5 ${isActive ? "text-gold-500" : "text-gray-500 group-hover:text-gold-500"}`} />
                          <span className="text-sm font-medium tracking-wide">{item.name}</span>
                          {isActive && (
                            <motion.div layoutId="activeNav" className="absolute left-0 w-1 h-6 bg-gold-500 rounded-r-full" />
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </nav>

      {/* ZONE BAS DE SIDEBAR */}
      <div className="border-t border-white/10 pt-6 mt-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <div className="text-[10px] text-gray-500 uppercase tracking-[0.2em] mb-2">Empire Status</div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-xs text-gold-600 font-medium tracking-widest">REBECCA ONE</span>
            </div>
          </div>
          <NotificationBell />
        </div>
        
        {/* Déconnexion */}
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 p-3 rounded-xl text-gray-500 hover:bg-red-500/10 hover:text-red-400 transition-all duration-300 mt-2"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-sm font-medium">Déconnexion</span>
        </button>
      </div>
    </div>
  );

  // Si pas d'utilisateur, on n'affiche pas le layout
  if (!user) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* SIDEBAR DESKTOP - à gauche */}
      <aside className="hidden lg:flex w-72 border-r border-white/5 bg-midnight/50 backdrop-blur-xl overflow-y-auto scrollbar-none">
        <SidebarContent />
      </aside>

      {/* MOBILE HEADER - Hamburger à droite */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 p-4 bg-midnight/80 backdrop-blur-lg border-b border-white/5 flex justify-between items-center">
        <span className="font-serif text-gold-500 tracking-widest">SOVEREIGN</span>
        <button 
          onClick={() => setIsMobileMenuOpen(true)}
          className="p-2 text-gold-500"
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* MOBILE MENU OVERLAY - Sort du côté droit */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] lg:hidden"
            />
            <motion.aside 
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 w-72 bg-midnight z-[70] lg:hidden border-l border-white/10 overflow-y-auto scrollbar-none"
            >
              <button 
                onClick={() => setIsMobileMenuOpen(false)}
                className="absolute top-6 right-6 text-gray-500 hover:text-gold-500"
              >
                <X className="w-6 h-6" />
              </button>
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* CONTENU PRINCIPAL */}
      <main className="flex-1 overflow-y-auto bg-midnight relative pt-20 lg:pt-0 scrollbar-none">
        <div className="max-w-7xl mx-auto h-full">
          {children}
        </div>
      </main>
    </div>
  );
}
