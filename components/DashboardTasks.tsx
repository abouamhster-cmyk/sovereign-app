"use client";
import Link from "next/link";
import { CheckCircle, Clock, Calendar, ArrowRight } from "lucide-react";

interface Task {
  id: string;
  title: string;
  due_date: string | null;
  status: string;
}

interface DashboardTasksProps {
  tasks: Task[];
}

export function DashboardTasks({ tasks }: DashboardTasksProps) {
  if (!tasks || tasks.length === 0) {
    return (
      <div className="text-center py-4 text-gray-500 text-sm">
        <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
        <p>Aucune tâche à venir</p>
        <Link href="/tasks/new" className="text-gold-500 text-xs hover:underline">
          + Créer une tâche
        </Link>
      </div>
    );
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    const today = new Date();
    const diffDays = Math.ceil((date.getTime() - today.getTime()) / (1000 * 3600 * 24));
    
    if (diffDays < 0) return "⚠️ En retard";
    if (diffDays === 0) return "📍 Aujourd'hui";
    if (diffDays === 1) return "📅 Demain";
    return `📅 Dans ${diffDays} jours`;
  };

  return (
    <div className="space-y-2">
      {tasks.slice(0, 3).map((task) => (
        <Link
          key={task.id}
          href="/tasks"
          className="flex items-center justify-between p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-all group"
        >
          <div className="flex items-center gap-3">
            {task.status === "done" ? (
              <CheckCircle className="w-4 h-4 text-emerald-400" />
            ) : (
              <Clock className="w-4 h-4 text-gold-500" />
            )}
            <div>
              <p className="text-sm text-ivory">{task.title}</p>
              {task.due_date && (
                <p className="text-xs text-gray-500">{formatDate(task.due_date)}</p>
              )}
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity" />
        </Link>
      ))}
      {tasks.length > 3 && (
        <Link href="/tasks" className="block text-center text-xs text-gold-500 hover:underline mt-2">
          + {tasks.length - 3} autre(s) tâche(s)
        </Link>
      )}
    </div>
  );
}
