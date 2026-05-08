 "use client";
import { ReactNode } from "react";
import { motion } from "framer-motion";

interface DashboardCardProps {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  action?: { label: string; onClick: () => void };
  accentColor?: string;
}

export function DashboardCard({ title, icon, children, action, accentColor = "gold" }: DashboardCardProps) {
  const borderColor = accentColor === "gold" ? "border-gold-500/30" : 
                      accentColor === "emerald" ? "border-emerald-500/30" :
                      accentColor === "blue" ? "border-blue-500/30" :
                      accentColor === "pink" ? "border-pink-500/30" :
                      "border-white/10";
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white/5 border ${borderColor} rounded-xl overflow-hidden`}
    >
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="text-sm font-medium text-ivory">{title}</h3>
        </div>
        {action && (
          <button 
            onClick={action.onClick}
            className="text-xs text-gold-500 hover:text-gold-400 transition-colors"
          >
            {action.label} →
          </button>
        )}
      </div>
      <div className="p-4">
        {children}
      </div>
    </motion.div>
  );
}
