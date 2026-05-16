"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Bell, CheckCircle, Circle, ExternalLink, Trash2, CheckCheck, Loader2 } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

type Notification = {
  id: string;
  title: string;
  body: string;
  type: string;
  url: string;
  created_at: string;
  read: boolean;
};

const typeConfig: Record<string, { label: string; color: string }> = {
  task: { label: "📋 Tâche", color: "text-blue-400" },
  mission: { label: "🎯 Mission", color: "text-purple-400" },
  win: { label: "🏆 Victoire", color: "text-yellow-400" },
  money: { label: "💰 Finance", color: "text-emerald-400" },
  family: { label: "👨‍👩‍👧‍👦 Famille", color: "text-pink-400" },
  document: { label: "📄 Document", color: "text-orange-400" },
  morning: { label: "🌅 Brief matinal", color: "text-gold-500" },
  financial: { label: "📊 Finances", color: "text-emerald-400" },
  opportunity: { label: "💡 Opportunité", color: "text-cyan-400" },
  report: { label: "📈 Rapport", color: "text-indigo-400" },
  brief: { label: "📋 Brief", color: "text-gold-500" },
  default: { label: "🔔 Notification", color: "text-gray-400" }
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
    
    // Écouter les changements en temps réel
    const channel = supabase
      .channel('notifications_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => {
        fetchNotifications();
      })
      .subscribe();
    
    return () => {
      channel.unsubscribe();
    };
  }, []);

  async function fetchNotifications() {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .neq("type", "whatsapp")
      .order("created_at", { ascending: false })
      .limit(50);
    
    if (error) {
      console.error("Erreur fetch notifications:", error);
      toast.error("Erreur de chargement");
    } else {
      setNotifications(data || []);
    }
    setIsLoading(false);
  }

  async function markAsRead(id: string) {
    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", id);
    
    if (!error) {
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, read: true } : n)
      );
      // Rafraîchir la cloche
      window.dispatchEvent(new CustomEvent('refreshNotifications'));
    }
  }

  async function markAllAsRead() {
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
    if (unreadIds.length === 0) {
      toast.info("Aucune notification non lue");
      return;
    }
    
    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .in("id", unreadIds);
    
    if (!error) {
      setNotifications(prev =>
        prev.map(n => ({ ...n, read: true }))
      );
      toast.success(`${unreadIds.length} notification(s) marquée(s) comme lue(s)`);
      // Rafraîchir la cloche
      window.dispatchEvent(new CustomEvent('refreshNotifications'));
    } else {
      toast.error("Erreur: " + error.message);
    }
  }

  async function deleteNotification(id: string) {
    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", id);
    
    if (!error) {
      setNotifications(prev => prev.filter(n => n.id !== id));
      toast.success("Notification supprimée");
      // Rafraîchir la cloche
      window.dispatchEvent(new CustomEvent('refreshNotifications'));
    } else {
      toast.error("Erreur lors de la suppression");
    }
  }

  async function deleteAllNotifications() {
    if (confirm("Supprimer toutes les notifications ?")) {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .neq("type", "whatsapp");
      
      if (!error) {
        setNotifications([]);
        toast.success("Toutes les notifications ont été supprimées");
        // Rafraîchir la cloche
        window.dispatchEvent(new CustomEvent('refreshNotifications'));
      }
    }
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
    if (diffDays < 7) return `Il y a ${diffDays} jour(s)`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 text-gold-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-midnight">
      <div className="max-w-3xl mx-auto p-4 md:p-6">
        {/* HEADER */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gold-500/10 rounded-full">
              <Bell className="w-6 h-6 text-gold-500" />
            </div>
            <div>
              <h1 className="text-2xl font-serif text-gold-500">Notifications</h1>
              {unreadCount > 0 && (
                <p className="text-xs text-gray-500">{unreadCount} non lue(s)</p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="p-2 rounded-full bg-white/5 text-gray-400 hover:text-gold-500 hover:bg-white/10 transition-colors"
                title="Tout marquer comme lu"
              >
                <CheckCheck className="w-5 h-5" />
              </button>
            )}
            {notifications.length > 0 && (
              <button
                onClick={deleteAllNotifications}
                className="p-2 rounded-full bg-white/5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                title="Supprimer toutes"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* STATS */}
        {notifications.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <div className="text-xl font-serif text-ivory">{notifications.length}</div>
              <div className="text-[10px] text-gray-500">Total</div>
            </div>
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <div className="text-xl font-serif text-gold-500">{unreadCount}</div>
              <div className="text-[10px] text-gray-500">Non lues</div>
            </div>
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <div className="text-xl font-serif text-emerald-400">{notifications.length - unreadCount}</div>
              <div className="text-[10px] text-gray-500">Lues</div>
            </div>
          </div>
        )}

        {/* LISTE DES NOTIFICATIONS */}
        {notifications.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 mx-auto mb-4 bg-white/5 rounded-full flex items-center justify-center">
              <Bell className="w-8 h-8 text-gray-500 opacity-50" />
            </div>
            <p className="text-gray-500">Aucune notification</p>
            <p className="text-xs text-gray-600 mt-1">Les notifications système apparaîtront ici</p>
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence>
              {notifications.map((notif) => {
                const typeInfo = typeConfig[notif.type] || typeConfig.default;
                
                return (
                  <motion.div
                    key={notif.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    className={`group rounded-xl transition-all ${
                      notif.read
                        ? "bg-white/5 border border-white/10"
                        : "bg-gold-500/5 border-l-4 border-l-gold-500"
                    } hover:bg-white/10`}
                  >
                    <div className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          {notif.read ? (
                            <CheckCircle className="w-4 h-4 text-gray-500" />
                          ) : (
                            <Circle className="w-4 h-4 text-gold-500" />
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-xs font-medium ${typeInfo.color}`}>
                              {typeInfo.label}
                            </span>
                            <span className="text-xs text-gray-500">
                              {formatDate(notif.created_at)}
                            </span>
                            {!notif.read && (
                              <span className="text-[10px] text-gold-500 bg-gold-500/20 px-1.5 py-0.5 rounded-full">
                                Nouveau
                              </span>
                            )}
                          </div>
                          
                          <h3 className="text-ivory font-medium mt-1">
                            {notif.title.replace(/^[^\s]+\s/, "")}
                          </h3>
                          
                          {notif.body && (
                            <p className="text-sm text-gray-400 mt-1">
                              {notif.body}
                            </p>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {!notif.read && (
                            <button
                              onClick={() => markAsRead(notif.id)}
                              className="p-1.5 rounded-full text-gray-500 hover:text-gold-500 hover:bg-white/10"
                              title="Marquer comme lu"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => deleteNotification(notif.id)}
                            className="p-1.5 rounded-full text-gray-500 hover:text-red-400 hover:bg-white/10"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          {notif.url && notif.url !== "/" && notif.type !== "whatsapp" && (
                            <Link
                              href={notif.url}
                              onClick={() => markAsRead(notif.id)}
                              className="p-1.5 rounded-full text-gray-500 hover:text-gold-500 hover:bg-white/10"
                              title="Voir"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
