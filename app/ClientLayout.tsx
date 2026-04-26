"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  LayoutDashboard, Users, Wallet, Building2, 
  Megaphone, FileText, Globe, Zap, Menu, X,
  CheckSquare, Target, Sprout, Trophy, Home,
  Briefcase, Calendar, FileCheck, Layers, MessageSquare,
  LogOut, TrendingUp, Inbox, ShieldAlert, Clock
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import NotificationBell from "@/components/NotificationBell";
import { useAuth } from "@/contexts/AuthContext";

const menuItems = [
  // CORE
  { name: "Dashboard", icon: LayoutDashboard, href: "/", section: "core" },
  { name: "Brain Dump", icon: Inbox, href: "/inbox", section: "core" },
  { name: "Daily Brief", icon: Calendar, href: "/brief", section: "core" },
  { name: "Weekly Review", icon: Clock, href: "/weekly", section: "core" },
  { name: "Chat", icon: MessageSquare, href: "/chat", section: "core" },
  
  // BUSINESS & PROJECTS
  { name: "Missions", icon: Target, href: "/missions", section: "business" },
  { name: "Tasks", icon: CheckSquare, href: "/tasks", section: "business" },
  { name: "Calendar", icon: Calendar, href: "/calendar", section: "business" },
  { name: "Business", icon: Briefcase, href: "/business", section: "business" },
  
  // FINANCES
  { name: "Money", icon: Wallet, href: "/money", section: "finances" },
  { name: "Opportunities", icon: TrendingUp, href: "/opportunities", section: "finances" },
  
  // CONTENU & DOCUMENTS
  { name: "Content", icon: Megaphone, href: "/content", section: "content" },
  { name: "Documents", icon: FileText, href: "/documents", section: "content" },
  
  // VIE & FAMILLE
  { name: "Motherhood", icon: Users, href: "/motherhood", section: "life" },
  { name: "Family", icon: Calendar, href: "/family", section: "life" },
  { name: "Wins", icon: Trophy, href: "/wins", section: "life" },
  
  // PROJETS SPÉCIFIQUES
  { name: "Ifè Farm", icon: Sprout, href: "/farm", section: "projects" },
  { name: "Relocation", icon: Globe, href: "/relocation", section: "projects" },
  
  // ALIGNEMENT
  { name: "Alignment", icon: Zap, href: "/alignment", section: "alignment" },
  { name: "Rescue Mode", icon: ShieldAlert, href: "/rescue", section: "alignment" },
];

// Séparateurs visuels
const sectionTitles = {
  core: "COMMAND CENTER",
  business: "BUSINESS & PROJECTS",
  finances: "FINANCES",
  content: "CONTENT & DOCS",
  life: "FAMILY & LIFE",
  projects: "ACTIVE PROJECTS",
  alignment: "ALIGNMENT"
};

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();

  // Enregistrement du Service Worker
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

  const SidebarContent = () => {
    let currentSection = "";
    
    return (
      <div className="flex flex-col h-full p-6">
        <div className="text-2xl font-serif tracking-[0.2em] text-gold-500 mb-8">
          SOVEREIGN
        </div>
        
        <nav className="flex-1 space-y-4 overflow-y-auto sidebar-scroll">
          {menuItems.map((item) => {
            const showSection = currentSection !== item.section;
            currentSection = item.section;
            
            return (
              <div key={item.href}>
                {showSection && (
                  <div className="text-[9px] text-gray-600 uppercase tracking-[0.2em] mt-4 mb-2 first:mt-0">
                    {sectionTitles[item.section as keyof typeof sectionTitles]}
                  </div>
                )}
                <Link 
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center space-x-3 p-3 rounded-xl transition-all duration-300 group ${
                    pathname === item.href 
                      ? "bg-gold-500/10 text-gold-500" 
                      : "text-gray-400 hover:bg-white/5 hover:text-ivory"
                  }`}
                >
                  <item.icon className={`w-5 h-5 ${pathname === item.href ? "text-gold-500" : "text-gray-500 group-hover:text-gold-500"}`} />
                  <span className="text-sm font-medium tracking-wide">{item.name}</span>
                  {pathname === item.href && (
                    <motion.div layoutId="activeNav" className="absolute left-0 w-1 h-6 bg-gold-500 rounded-r-full" />
                  )}
                </Link>
              </div>
            );
          })}
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
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* SIDEBAR DESKTOP */}
      <aside className="hidden lg:flex w-72 border-r border-white/5 bg-midnight/50 backdrop-blur-xl">
        <SidebarContent />
      </aside>

      {/* MOBILE HEADER */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 p-4 bg-midnight/80 backdrop-blur-lg border-b border-white/5 flex justify-between items-center">
        <span className="font-serif text-gold-500 tracking-widest">SOVEREIGN</span>
        <button 
          onClick={() => setIsMobileMenuOpen(true)}
          className="p-2 text-gold-500"
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* MOBILE MENU OVERLAY */}
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
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-72 bg-midnight z-[70] lg:hidden border-r border-white/10"
            >
              <button 
                onClick={() => setIsMobileMenuOpen(false)}
                className="absolute top-6 right-6 text-gray-500"
              >
                <X className="w-6 h-6" />
              </button>
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* CONTENU PRINCIPAL */}
      <main className="flex-1 overflow-y-auto bg-midnight relative pt-20 lg:pt-0">
        <div className="max-w-7xl mx-auto h-full">
          {children}
        </div>
      </main>

      {/* STYLES SCROLLBAR */}
      <style jsx global>{`
        .sidebar-scroll {
          overflow-y: auto;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .sidebar-scroll::-webkit-scrollbar {
          display: none;
        }
        main {
          scrollbar-width: thin;
          scrollbar-color: rgba(212, 175, 55, 0.3) transparent;
        }
        main::-webkit-scrollbar {
          width: 4px;
        }
        main::-webkit-scrollbar-track {
          background: transparent;
        }
        main::-webkit-scrollbar-thumb {
          background: rgba(212, 175, 55, 0.3);
          border-radius: 4px;
        }
        main::-webkit-scrollbar-thumb:hover {
          background: rgba(212, 175, 55, 0.5);
        }
      `}</style>
    </div>
  );
}