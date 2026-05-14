// app/notifications/page.tsx
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Bell, Calendar, Target, FileText, Trophy, Users, DollarSign } from "lucide-react";

type NotificationLog = {
  id: string;
  type: string;
  date: string;
  sent_at: string;
  metadata?: any;
};

const typeConfig: Record<string, { icon: any; label: string; color: string }> = {
  task_reminder: { icon: Bell, label: "Rappel tâches", color: "text-blue-400" },
  mission_reminder: { icon: Target, label: "Rappel missions", color: "text-purple-400" },
  document_reminder: { icon: FileText, label: "Rappel documents", color: "text-orange-400" },
  family_reminder: { icon: Users, label: "Rappel famille", color: "text-pink-400" },
  celebration_reminder: { icon: Trophy, label: "Rappel victoires", color: "text-yellow-400" },
  morning_notification: { icon: Bell, label: "Brief matinal", color: "text-gold-500" },
  weekly_financial: { icon: DollarSign, label: "Bilan financier", color: "text-emerald-400" }
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  async function fetchNotifications() {
    setIsLoading(true);
    const { data } = await supabase
      .from("notifications_log")
      .select("*")
      .order("sent_at", { ascending: false })
        .limit(50);
    
    setNotifications(data || []);
    setIsLoading(false);
  }

  const getTypeInfo = (type: string) => {
    return typeConfig[type] || { icon: Bell, label: type, color: "text-gray-400" };
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return `Aujourd'hui à ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (date.toDateString() === yesterday.toDateString()) {
      return `Hier à ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
    }
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Bell className="w-6 h-6 text-gold-500" />
        <h1 className="text-2xl font-serif text-gold-500">Notifications</h1>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Aucune notification pour le moment</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notif) => {
            const typeInfo = getTypeInfo(notif.type);
            const Icon = typeInfo.icon;
            
            return (
              <div key={notif.id} className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-colors">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-full bg-white/5 ${typeInfo.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-medium ${typeInfo.color}`}>
                        {typeInfo.label}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatDate(notif.sent_at)}
                      </span>
                    </div>
                    <p className="text-ivory text-sm mt-1">
                      Notification envoyée
                    </p>
                    {notif.metadata && Object.keys(notif.metadata).length > 0 && (
                      <p className="text-xs text-gray-500 mt-1">
                        {JSON.stringify(notif.metadata)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
