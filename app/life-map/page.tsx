"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Heart, DollarSign, Briefcase, Sprout, FileText, 
  TrendingUp, Globe, Shield, AlertCircle, Clock, 
  CheckCircle, ArrowRight, Loader2, Calendar, Target,
  MessageCircle, Users, Building2, Crown
} from "lucide-react";
import { toast } from "sonner";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://sovereign-bridge.onrender.com";

// =====================================================
// TYPES
// =====================================================

type DomainData = {
  status: string;        // "🟢", "🟡", "🔴"
  urgency: string;       // "low", "medium", "high"
  pending_count?: number;
  balance?: number;
  active_missions?: number;
  total_investment?: number;
  urgent_count?: number;
  recent_count?: number;
  score?: number;
  next_action?: string;
  next_date?: string;
  message?: string;
};

type LifeMapData = {
  family: DomainData;
  money: DomainData;
  business: DomainData;
  farm: DomainData;
  documents: DomainData;
  wins: DomainData;
  relocation: DomainData;
  alignment: DomainData;
  whatsapp?: DomainData;
};

// =====================================================
// CONFIGURATION DES DOMAINES
// =====================================================

const domainConfig: Record<string, { 
  label: string; 
  icon: any; 
  color: string; 
  bgColor: string; 
  borderColor: string;
  href: string;
  description: string;
}> = {
  family: { 
    label: "Famille", 
    icon: Heart, 
    color: "text-pink-400", 
    bgColor: "bg-pink-500/10", 
    borderColor: "border-pink-500/30",
    href: "/family",
    description: "Événements, routines, enfants"
  },
  money: { 
    label: "Argent", 
    icon: DollarSign, 
    color: "text-emerald-400", 
    bgColor: "bg-emerald-500/10", 
    borderColor: "border-emerald-500/30",
    href: "/money-opportunities",
    description: "Revenus, dépenses, solde"
  },
  business: { 
    label: "Business", 
    icon: Briefcase, 
    color: "text-blue-400", 
    bgColor: "bg-blue-500/10", 
    borderColor: "border-blue-500/30",
    href: "/missions-business",
    description: "Missions actives, priorités"
  },
  farm: { 
    label: "Ifè Farm", 
    icon: Sprout, 
    color: "text-green-400", 
    bgColor: "bg-green-500/10", 
    borderColor: "border-green-500/30",
    href: "/farm",
    description: "Infrastructures, production"
  },
  documents: { 
    label: "Documents", 
    icon: FileText, 
    color: "text-orange-400", 
    bgColor: "bg-orange-500/10", 
    borderColor: "border-orange-500/30",
    href: "/communications",
    description: "Contrats, dossiers, échéances"
  },
  wins: { 
    label: "Victoires", 
    icon: TrendingUp, 
    color: "text-yellow-400", 
    bgColor: "bg-yellow-500/10", 
    borderColor: "border-yellow-500/30",
    href: "/rescue-wins",
    description: "Succès célébrés récemment"
  },
  relocation: { 
    label: "Relocalisation", 
    icon: Globe, 
    color: "text-cyan-400", 
    bgColor: "bg-cyan-500/10", 
    borderColor: "border-cyan-500/30",
    href: "/relocation",
    description: "Démarches Bénin"
  },
  alignment: { 
    label: "Alignement", 
    icon: Shield, 
    color: "text-purple-400", 
    bgColor: "bg-purple-500/10", 
    borderColor: "border-purple-500/30",
    href: "/alignment",
    description: "Énergie, bien-être, focus"
  },
  whatsapp: { 
    label: "WhatsApp", 
    icon: MessageCircle, 
    color: "text-green-400", 
    bgColor: "bg-green-500/10", 
    borderColor: "border-green-500/30",
    href: "/chat?mode=whatsapp",
    description: "Messages non répondus"
  }
};

const getStatusInfo = (status: string, urgency: string) => {
  if (status === "🔴" || urgency === "high") {
    return { icon: AlertCircle, label: "Urgent", color: "text-red-400", bgColor: "bg-red-500/20" };
  }
  if (status === "🟡" || urgency === "medium") {
    return { icon: Clock, label: "À surveiller", color: "text-yellow-400", bgColor: "bg-yellow-500/20" };
  }
  return { icon: CheckCircle, label: "Stable", color: "text-emerald-400", bgColor: "bg-emerald-500/20" };
};

const getUrgencyColor = (urgency: string) => {
  switch(urgency) {
    case "high": return "border-l-red-500";
    case "medium": return "border-l-yellow-500";
    default: return "border-l-emerald-500";
  }
};

// =====================================================
// COMPOSANT PRINCIPAL
// =====================================================

export default function LifeMapPage() {
  const { user } = useAuth();
  const userId = user?.id || null;
  const [lifeMapData, setLifeMapData] = useState<LifeMapData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  useEffect(() => {
    if (userId) {
      fetchLifeMap();
    }
  }, [userId]);

  async function fetchLifeMap() {
    if (!userId) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/life-map?user_id=${userId}`);
      const result = await response.json();
      
      if (result.success) {
        setLifeMapData(result.data);
        setLastUpdated(new Date().toLocaleTimeString());
      } else {
        console.error("Erreur life-map:", result.error);
        toast.error("Impossible de charger la carte de vie");
      }
    } catch (error) {
      console.error("Erreur fetch life-map:", error);
      toast.error("Erreur de connexion");
    } finally {
      setIsLoading(false);
    }
  }

  const formatBalance = (balance?: number) => {
    if (balance === undefined) return "—";
    return `${balance.toLocaleString()} CFA`;
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  if (!userId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-gray-500">Veuillez vous connecter</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-gold-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Crown className="w-8 h-8 text-gold-500" />
            <h1 className="text-3xl md:text-4xl font-serif text-gold-500 tracking-tight">
              Carte de Vie
            </h1>
          </div>
          <p className="text-gray-500 text-sm">
            Vue d'ensemble de tous les domaines de ta vie
          </p>
        </div>
        <button
          onClick={fetchLifeMap}
          disabled={isLoading}
          className="px-4 py-2 bg-white/10 rounded-full text-sm text-gray-400 hover:text-gold-500 hover:bg-white/15 transition-colors flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          Actualiser
        </button>
      </div>

      {/* DERNIÈRE MISE À JOUR */}
      {lastUpdated && (
        <p className="text-right text-[10px] text-gray-600">
          Dernière mise à jour : {lastUpdated}
        </p>
      )}

      {/* GRILLE DES DOMAINES */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {Object.entries(domainConfig).map(([key, config]) => {
          const domain = lifeMapData?.[key as keyof LifeMapData];
          if (!domain && key !== "whatsapp") return null;
          
          const Icon = config.icon;
          const statusInfo = getStatusInfo(domain?.status || "🟢", domain?.urgency || "low");
          const StatusIcon = statusInfo.icon;
          const urgencyColor = getUrgencyColor(domain?.urgency || "low");
          
          return (
            <Link key={key} href={config.href}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
                className={`${config.bgColor} border ${config.borderColor} rounded-2xl overflow-hidden cursor-pointer transition-all hover:shadow-lg hover:shadow-gold-500/10`}
              >
                {/* En-tête */}
                <div className={`p-4 border-b ${config.borderColor} flex items-center justify-between`}>
                  <div className="flex items-center gap-2">
                    <Icon className={`w-5 h-5 ${config.color}`} />
                    <h2 className="text-ivory font-medium">{config.label}</h2>
                  </div>
                  <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${statusInfo.bgColor}`}>
                    <StatusIcon className={`w-3 h-3 ${statusInfo.color}`} />
                    <span className={`text-[10px] ${statusInfo.color}`}>{statusInfo.label}</span>
                  </div>
                </div>
                
                {/* Contenu */}
                <div className="p-4 space-y-3">
                  {/* Valeur principale */}
                  {key === "money" && domain?.balance !== undefined && (
                    <div>
                      <p className={`text-2xl font-serif ${domain.balance >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {formatBalance(domain.balance)}
                      </p>
                      <p className="text-[10px] text-gray-500">Solde net</p>
                    </div>
                  )}
                  
                  {key === "family" && domain?.pending_count !== undefined && (
                    <div>
                      <p className="text-2xl font-serif text-ivory">{domain.pending_count}</p>
                      <p className="text-[10px] text-gray-500">Événement(s) à venir</p>
                    </div>
                  )}
                  
                  {key === "business" && domain?.active_missions !== undefined && (
                    <div>
                      <p className="text-2xl font-serif text-ivory">{domain.active_missions}</p>
                      <p className="text-[10px] text-gray-500">Mission(s) active(s)</p>
                    </div>
                  )}
                  
                  {key === "farm" && domain?.total_investment !== undefined && (
                    <div>
                      <p className="text-2xl font-serif text-ivory">{formatBalance(domain.total_investment)}</p>
                      <p className="text-[10px] text-gray-500">Investissement total</p>
                    </div>
                  )}
                  
                  {key === "documents" && (
                    <div>
                      <div className="flex items-baseline gap-2">
                        <p className="text-2xl font-serif text-ivory">{domain?.pending_count || 0}</p>
                        {domain?.urgent_count && domain.urgent_count > 0 && (
                          <span className="text-xs text-red-400">({domain.urgent_count} urgent)</span>
                        )}
                      </div>
                      <p className="text-[10px] text-gray-500">Document(s) en attente</p>
                    </div>
                  )}
                  
                  {key === "wins" && domain?.recent_count !== undefined && (
                    <div>
                      <p className="text-2xl font-serif text-ivory">{domain.recent_count}</p>
                      <p className="text-[10px] text-gray-500">Victoire(s) récente(s)</p>
                    </div>
                  )}
                  
                  {key === "alignment" && domain?.score !== undefined && (
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-2xl font-serif text-ivory">{domain.score}%</p>
                        <div className="flex-1 h-2 bg-white/10 rounded-full">
                          <div className="h-2 bg-gold-500 rounded-full" style={{ width: `${domain.score}%` }} />
                        </div>
                      </div>
                      <p className="text-[10px] text-gray-500">Score d'alignement</p>
                    </div>
                  )}
                  
                  {key === "relocation" && domain?.pending_count !== undefined && (
                    <div>
                      <p className="text-2xl font-serif text-ivory">{domain.pending_count}</p>
                      <p className="text-[10px] text-gray-500">Tâche(s) en attente</p>
                    </div>
                  )}
                  
                  {key === "whatsapp" && (
                    <div>
                      <p className="text-2xl font-serif text-ivory">{lifeMapData?.whatsapp?.pending_count || 0}</p>
                      <p className="text-[10px] text-gray-500">Message(s) non répondus</p>
                    </div>
                  )}
                  
                  {/* Prochaine action */}
                  {domain?.next_action && (
                    <div className="pt-2 border-t border-white/10">
                      <p className="text-xs text-gold-500 flex items-center gap-1">
                        <Target className="w-3 h-3" />
                        {domain.next_action}
                      </p>
                      {domain.next_date && (
                        <p className="text-[10px] text-gray-500 mt-1">
                          📅 {formatDate(domain.next_date)}
                        </p>
                      )}
                    </div>
                  )}
                  
                  {/* Message additionnel */}
                  {domain?.message && (
                    <p className="text-[10px] text-gray-400 italic">{domain.message}</p>
                  )}
                  
                  {/* Lien vers la page */}
                  <div className="pt-2 flex justify-end">
                    <span className="text-[10px] text-gold-500/70 flex items-center gap-1">
                      Voir détails <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
                
                {/* Barre d'urgence latérale */}
                <div className={`h-1 w-full ${urgencyColor.replace("border-l-", "bg-")} opacity-50`} />
              </motion.div>
            </Link>
          );
        })}
      </div>

      {/* LÉGENDE */}
      <div className="mt-8 p-4 bg-white/5 rounded-xl">
        <p className="text-xs text-gray-500 mb-3">Légende</p>
        <div className="flex flex-wrap gap-6">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-3 h-3 text-emerald-400" />
            <span className="text-xs text-gray-400">Stable</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-3 h-3 text-yellow-400" />
            <span className="text-xs text-gray-400">À surveiller</span>
          </div>
          <div className="flex items-center gap-2">
            <AlertCircle className="w-3 h-3 text-red-400" />
            <span className="text-xs text-gray-400">Urgent</span>
          </div>
        </div>
      </div>

      {/* RÉSUMÉ RAPIDE */}
      {lifeMapData && (
        <div className="bg-gradient-to-r from-gold-500/10 to-transparent border border-gold-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Crown className="w-4 h-4 text-gold-500" />
            <h3 className="text-sm font-serif text-gold-500">Résumé</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
            <div>
              <p className="text-xs text-gray-500">Domaines stables</p>
              <p className="text-lg font-serif text-emerald-400">
                {Object.values(lifeMapData).filter(d => d?.status === "🟢" || d?.urgency === "low").length}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">À surveiller</p>
              <p className="text-lg font-serif text-yellow-400">
                {Object.values(lifeMapData).filter(d => d?.status === "🟡" || d?.urgency === "medium").length}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Urgents</p>
              <p className="text-lg font-serif text-red-400">
                {Object.values(lifeMapData).filter(d => d?.status === "🔴" || d?.urgency === "high").length}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Prochaines actions</p>
              <p className="text-lg font-serif text-gold-500">
                {Object.values(lifeMapData).filter(d => d?.next_action).length}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* BOUTON RAFRAÎCHISSEMENT FLOTTANT (mobile) */}
      <button
        onClick={fetchLifeMap}
        className="fixed bottom-6 right-6 z-40 bg-gold-500/20 text-gold-500 p-3 rounded-full shadow-lg hover:bg-gold-500/30 transition-colors md:hidden"
      >
        <RefreshCw className="w-5 h-5" />
      </button>
    </div>
  );
}

// Importer RefreshCw en haut
import { RefreshCw } from "lucide-react";
