// app/notifications/page.tsx - Version avec table notifications
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Bell, CheckCircle, Circle, ExternalLink } from "lucide-react";
import Link from "next/link";

type Notification = {
  id: string;
  title: string;
  body: string;
  type: string;
  url: string;
  created_at: string;
  read: boolean;
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  async function fetchNotifications() {
    setIsLoading(true);
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false });
    
    setNotifications(data || []);
    setIsLoading(false);
  }

  async function markAsRead(id: string) {
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", id);
    
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return "À l'instant";
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours} h`;
    return `Il y a ${diffDays} jour(s)`;
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Bell className="w-6 h-6 text-gold-500" />
          <h1 className="text-2xl font-serif text-gold-500">Notifications</h1>
        </div>
        {unreadCount > 0 && (
          <span className="text-xs bg-gold-500/20 text-gold-500 px-2 py-1 rounded-full">
            {unreadCount} non lue(s)
          </span>
        )}
      </div>
      
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Aucune notification</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notif) => (
            <Link
              key={notif.id}
              href={notif.url || "#"}
              onClick={() => markAsRead(notif.id)}
              className={`block p-4 rounded-xl transition-all ${
                notif.read
                  ? "bg-white/5 border border-white/10"
                  : "bg-gold-500/10 border-l-4 border-l-gold-500"
              } hover:bg-white/10`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  {notif.read ? (
                    <CheckCircle className="w-4 h-4 text-gray-500" />
                  ) : (
                    <Circle className="w-4 h-4 text-gold-500" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-ivory font-medium">{notif.title}</p>
                  {notif.body && (
                    <p className="text-sm text-gray-400 mt-1">{notif.body}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-gray-500">
                      {formatDate(notif.created_at)}
                    </span>
                    {!notif.read && (
                      <span className="text-xs text-gold-500">● Nouveau</span>
                    )}
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
