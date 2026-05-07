"use client";
import Link from "next/link";
import { Target, ArrowRight } from "lucide-react";

interface Priority {
  id: string;
  title: string;
  priority_reason: string;
  score: number;
}

interface DashboardPrioritiesProps {
  priorities: Priority[];
}

export function DashboardPriorities({ priorities }: DashboardPrioritiesProps) {
  if (!priorities || priorities.length === 0) {
    return (
      <div className="text-center py-4 text-gray-500 text-sm">
        <Target className="w-8 h-8 mx-auto mb-2 opacity-30" />
        <p>Aucune priorité pour le moment</p>
        <Link href="/tasks" className="text-gold-500 text-xs hover:underline">
          + Créer une tâche
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {priorities.map((priority, idx) => (
        <Link
          key={priority.id}
          href="/tasks"
          className={`block p-3 rounded-xl transition-all hover:bg-white/5 ${
            idx === 0 ? "bg-red-950/10 border-l-2 border-l-red-500" :
            idx === 1 ? "bg-orange-950/10 border-l-2 border-l-orange-500" :
            "bg-gold-500/5 border-l-2 border-l-gold-500"
          }`}
        >
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <p className="text-sm font-medium text-ivory">{priority.title}</p>
              <p className="text-xs text-gray-500 mt-0.5">{priority.priority_reason}</p>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <div className="mt-2 w-full bg-white/10 rounded-full h-1">
            <div 
              className={`h-1 rounded-full ${
                idx === 0 ? "bg-red-500" : idx === 1 ? "bg-orange-500" : "bg-gold-500"
              }`}
              style={{ width: `${(priority.score / 40) * 100}%` }}
            />
          </div>
        </Link>
      ))}
    </div>
  );
}
