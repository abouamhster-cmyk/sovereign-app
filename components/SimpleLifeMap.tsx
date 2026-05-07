"use client";
import Link from "next/link";
import { DollarSign, Briefcase, Heart, Shield } from "lucide-react";

interface SimpleLifeMapProps {
  balance: number;
  activeMissions: number;
  familyEvents: number;
  alignmentScore: number;
}

export function SimpleLifeMap({ balance, activeMissions, familyEvents, alignmentScore }: SimpleLifeMapProps) {
  const items = [
    {
      title: "Argent",
      icon: DollarSign,
      value: balance.toLocaleString(),
      suffix: " CFA",
      color: balance >= 0 ? "text-emerald-400" : "text-red-400",
      href: "/money",
      status: balance >= 0 ? "🟢" : "🔴"
    },
    {
      title: "Business",
      icon: Briefcase,
      value: activeMissions,
      suffix: " mission(s)",
      color: "text-blue-400",
      href: "/business",
      status: activeMissions > 5 ? "🟡" : "🟢"
    },
    {
      title: "Famille",
      icon: Heart,
      value: familyEvents,
      suffix: " événement(s)",
      color: "text-pink-400",
      href: "/family",
      status: familyEvents > 3 ? "🟡" : "🟢"
    },
    {
      title: "Alignement",
      icon: Shield,
      value: alignmentScore,
      suffix: "%",
      color: "text-gold-500",
      href: "/alignment",
      status: alignmentScore >= 70 ? "🟢" : "🟡"
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {items.map((item) => (
        <Link
          key={item.title}
          href={item.href}
          className="block bg-white/5 border border-white/10 rounded-xl p-3 hover:bg-white/10 transition-all hover:border-gold-500/30"
        >
          <div className="flex items-center justify-between mb-2">
            <item.icon className="w-4 h-4 text-gold-500" />
            <span className="text-xs">{item.status}</span>
          </div>
          <p className="text-xs text-gray-500 mb-1">{item.title}</p>
          <p className={`text-lg font-serif ${item.color}`}>
            {item.value}{item.suffix}
          </p>
        </Link>
      ))}
    </div>
  );
}
