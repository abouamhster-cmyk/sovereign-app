"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { 
  Heart, DollarSign, Briefcase, Sprout, FileText, 
  TrendingUp, Shield, Users, Globe, Calendar, Loader2,
  CheckCircle, AlertCircle, Clock
} from "lucide-react";

const API_URL = "https://sovereign-bridge.onrender.com";

type DomainData = {
  status: string;
  pending_count?: number;
  balance?: number;
  active_missions?: number;
  total_investment?: number;
  urgent_count?: number;
  recent_count?: number;
  score?: number;
  next_action?: string;
  urgency: string;
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
};

const domainConfig: Record<string, { label: string; icon: any; color: string; bgColor: string; href: string }> = {
  family: { label: "Famille", icon: Heart, color: "text-pink-400", bgColor: "bg-pink-500/10", href: "/family" },
  money: { label: "Argent", icon: DollarSign, color: "text-emerald-400", bgColor: "bg-emerald-500/10", href: "/money" },
  business: { label: "Business", icon: Briefcase, color: "text-blue-400", bgColor: "bg-blue-500/10", href: "/business" },
  farm: { label: "Ferme", icon: Sprout, color: "text-green-400", bgColor: "bg-green-500/10", href: "/farm" },
  documents: { label: "Documents", icon: FileText, color: "text-orange-400", bgColor: "bg-orange-500/10", href: "/documents" },
  wins: { label: "Victoires", icon: TrendingUp, color: "text-yellow-400", bgColor: "bg-yellow-500/10", href: "/wins" },
  relocation: { label: "Relocalisation", icon: Globe, color: "text-cyan-400", bgColor: "bg-cyan-500/10", href: "/relocation" },
  alignment: { label: "Alignement", icon: Shield, color: "text-purple-400", bgColor: "bg-purple-500/10", href: "/alignment" }
};

const getStatusDisplay = (status: string, urgency: string) => {
  if (status === "🔴") return { icon: AlertCircle, label: "Urgent", color: "text-red-400" };
  if (status === "🟡") return { icon: Clock, label: "À surveiller", color: "text-yellow-400" };
  return { icon: CheckCircle, label: "Stable", color: "text-emerald-400" };
};

export default function LifeMapPage() {
  const [data, setData] = useState<LifeMapData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchLifeMap();
  }, []);

  async function fetchLifeMap() {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/life-map`);
      const result = await response.json();
      if (result.success) {
        setData(result.data);
      }
    } catch (error) {
      console.error("Erreur life map:", error);
    }
    setIsLoading(false);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-gold-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
      {/* HEADER */}
      <div className="mb-6">
        <h1 className="text-3xl md:text-4xl font-serif text-gold-500 tracking-tight">Carte de Vie</h1>
        <p className="text-gray-500 text-sm mt-1">Vue d'ensemble de tes domaines de vie</p>
      </div>

      {/* GRILLE DES DOMAINES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data && Object.entries(data).map(([key, domain]) => {
          const config = domainConfig[key as keyof typeof domainConfig];
          if (!config) return null;
          const Icon = config.icon;
          const statusInfo = getStatusDisplay(domain.status, domain.urgency);
          const StatusIcon = statusInfo.icon;
          
          return (
            <Link key={key} href={config.href}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.02 }}
                className={`${config.bgColor} border border-white/10 rounded-2xl p-5 hover:border-gold-500/30 transition-all cursor-pointer`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Icon className={`w-5 h-5 ${config.color}`} />
                    <h2 className="text-ivory font-medium">{config.label}</h2>
                  </div>
                  <div className="flex items-center gap-1">
                    <StatusIcon className={`w-4 h-4 ${statusInfo.color}`} />
                    <span className={`text-xs ${statusInfo.color}`}>{statusInfo.label}</span>
                  </div>
                </div>
                
                {/* Contenu spécifique au domaine */}
                {key === "money" && domain.balance !== undefined && (
                  <p className={`text-2xl font-serif ${domain.balance >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {domain.balance.toLocaleString()} CFA
                  </p>
                )}
                
                {key === "family" && domain.pending_count !== undefined && (
                  <p className="text-2xl font-serif text-ivory">{domain.pending_count}</p>
                )}
                
                {key === "business" && domain.active_missions !== undefined && (
                  <p className="text-2xl font-serif text-ivory">{domain.active_missions}</p>
                )}
                
                {key === "farm" && domain.total_investment !== undefined && (
                  <p className="text-2xl font-serif text-ivory">{domain.total_investment.toLocaleString()} CFA</p>
                )}
                
                {key === "documents" && domain.urgent_count !== undefined && (
                  <div className="flex items-baseline gap-2">
                    <p className="text-2xl font-serif text-ivory">{domain.pending_count || 0}</p>
                    {domain.urgent_count > 0 && (
                      <span className="text-xs text-red-400">({domain.urgent_count} urgent)</span>
                    )}
                  </div>
                )}
                
                {key === "wins" && domain.recent_count !== undefined && (
                  <p className="text-2xl font-serif text-ivory">{domain.recent_count}</p>
                )}
                
                {key === "alignment" && domain.score !== undefined && (
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-serif text-ivory">{domain.score}%</p>
                    <div className="flex-1 h-2 bg-white/10 rounded-full">
                      <div className="h-2 bg-gold-500 rounded-full" style={{ width: `${domain.score}%` }} />
                    </div>
                  </div>
                )}
                
                {key === "relocation" && domain.pending_count !== undefined && (
                  <p className="text-2xl font-serif text-ivory">{domain.pending_count}</p>
                )}
                
                {/* Prochaine action */}
                {domain.next_action && (
                  <p className="text-xs text-gray-500 mt-3 truncate">
                    📍 {domain.next_action}
                  </p>
                )}
              </motion.div>
            </Link>
          );
        })}
      </div>

      {/* LÉGENDE */}
      <div className="mt-8 p-4 bg-white/5 rounded-xl">
        <p className="text-xs text-gray-500 mb-2">Légende</p>
        <div className="flex flex-wrap gap-4">
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
    </div>
  );
}
