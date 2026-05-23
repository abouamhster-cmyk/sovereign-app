import { supabase } from "@/lib/supabase";

export type DashboardData = {
  hour: number;
  dayName: string;
  date: string;
  greeting: string;
  timeOfDay: "morning" | "afternoon" | "evening" | "night";
  specialEvents: { type: string; title: string; detail: string }[];
  overdueTasks: { id: string; title: string; due_date: string }[];
  todayTasks: { id: string; title: string; priority: string }[];
  tomorrowTasks: { id: string; title: string; due_date: string }[];
  balance: number;
  revenueMonth: number;
  spendingMonth: number;
  urgentGrants: { id: string; title: string; deadline: string; amount: number }[];
  familyEventsToday: { id: string; title: string; child_name: string; time?: string }[];
  familyEventsTomorrow: { id: string; title: string; child_name: string }[];
  birthdaysToday: { child_name: string; age?: number }[];
  birthdaysSoon: { child_name: string; daysLeft: number }[];
  overdueDocuments: { id: string; name: string; due_date: string }[];
  expiringDocuments: { id: string; name: string; due_date: string; daysLeft: number }[];
  activeMissions: { id: string; name: string; priority: string }[];
  staleMissions: { id: string; name: string; lastUpdate: string }[];
  recentWins: { id: string; title: string; date: string }[];
  moodToday: string | null;
  pendingWhatsApp: { from: string; message: string; isUrgent: boolean }[];
  pendingBrainDumps: number;
};

export async function fetchDashboardData(userId: string): Promise<DashboardData> {
  const now = new Date();
  const hour = now.getHours();
  const today = now.toISOString().split('T')[0];
  const tomorrow = new Date(now.setDate(now.getDate() + 1)).toISOString().split('T')[0];
  const weekLater = new Date(now.setDate(now.getDate() + 7)).toISOString().split('T')[0];
  const monthAgo = new Date(now.setMonth(now.getMonth() - 1)).toISOString().split('T')[0];
  
  let timeOfDay: DashboardData["timeOfDay"] = "morning";
  let greeting = "";
  
  if (hour >= 5 && hour < 12) {
    timeOfDay = "morning";
    greeting = "☀️ Bonjour";
  } else if (hour >= 12 && hour < 18) {
    timeOfDay = "afternoon";
    greeting = "🌤️ Bon après-midi";
  } else if (hour >= 18 && hour < 22) {
    timeOfDay = "evening";
    greeting = "🌙 Bonsoir";
  } else {
    timeOfDay = "night";
    greeting = "🌃 Bonne nuit";
  }
  
  // Requêtes parallèles
  const [
    tasksResult,
    missionsResult,
    spendingResult,
    revenueResult,
    familyEventsResult,
    documentsResult,
    winsResult,
    moodResult,
    whatsappResult,
    brainDumpResult,
    grantsResult,
    kidsResult
  ] = await Promise.all([
    supabase.from("tasks").select("id, title, due_date, priority, status").eq("user_id", userId),
    supabase.from("missions").select("id, name, priority, status, updated_at").eq("user_id", userId),
    supabase.from("spending").select("amount, date").eq("user_id", userId).gte("date", monthAgo),
    supabase.from("revenue").select("amount, date").eq("user_id", userId).gte("date", monthAgo),
    supabase.from("family_events").select("*").eq("user_id", userId).gte("date", today),
    supabase.from("documents").select("*").eq("user_id", userId).neq("status", "approved"),
    supabase.from("wins").select("*").eq("user_id", userId).gte("date", monthAgo),
    supabase.from("mood_entries").select("mood").eq("user_id", userId).eq("date", today).maybeSingle(),
    supabase.from("whatsapp_messages").select("from_name, message, importance").eq("user_id", userId).eq("replied", false).limit(10),
    supabase.from("inbox").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("needs_processing", true),
    supabase.from("lf_grants").select("*").eq("user_id", userId).not("deadline", "is", null).lte("deadline", weekLater),
    supabase.from("user_profile").select("children").eq("user_id", userId).maybeSingle()
  ]);
  
  const tasks = tasksResult.data || [];
  const missions = missionsResult.data || [];
  const spending = spendingResult.data || [];
  const revenue = revenueResult.data || [];
  const familyEvents = familyEventsResult.data || [];
  const documents = documentsResult.data || [];
  const wins = winsResult.data || [];
  const whatsapp = whatsappResult.data || [];
  const grants = grantsResult.data || [];
  
  const totalSpending = spending.reduce((sum, s) => sum + (s.amount || 0), 0);
  const totalRevenue = revenue.reduce((sum, r) => sum + (r.amount || 0), 0);
  const balance = totalRevenue - totalSpending;
  
  // Événements spéciaux
  const specialEvents: DashboardData["specialEvents"] = [];
  
  const children = (kidsResult.data as any)?.[0]?.children || [];
  const todayMD = now.toISOString().slice(5, 10);
  for (const child of children) {
    if (child.birthday) {
      const birthdayMD = child.birthday.slice(5, 10);
      if (birthdayMD === todayMD) {
        const age = now.getFullYear() - parseInt(child.birthday.slice(0, 4));
        specialEvents.push({
          type: "birthday",
          title: `🎂 Anniversaire de ${child.name}`,
          detail: `${child.name} fête ses ${age} ans aujourd'hui !`
        });
      }
    }
  }
  
  const urgentGrants = grants.filter(g => {
    const daysLeft = Math.ceil((new Date(g.deadline).getTime() - Date.now()) / (1000 * 3600 * 24));
    return daysLeft <= 3;
  });
  for (const grant of urgentGrants) {
    const daysLeft = Math.ceil((new Date(grant.deadline).getTime() - Date.now()) / (1000 * 3600 * 24));
    specialEvents.push({
      type: "grant_urgent",
      title: `⚠️ Grant urgent : ${grant.title}`,
      detail: `À rendre dans ${daysLeft} jour(s) • ${grant.amount?.toLocaleString()} CFA`
    });
  }
  
  return {
    hour,
    dayName: now.toLocaleDateString('fr-FR', { weekday: 'long' }),
    date: now.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }),
    greeting,
    timeOfDay,
    specialEvents,
    overdueTasks: tasks.filter(t => t.due_date && t.due_date < today && t.status !== "done"),
    todayTasks: tasks.filter(t => t.due_date === today && t.status !== "done"),
    tomorrowTasks: tasks.filter(t => t.due_date === tomorrow && t.status !== "done"),
    balance,
    revenueMonth: totalRevenue,
    spendingMonth: totalSpending,
    urgentGrants: urgentGrants.map(g => ({ id: g.id, title: g.title, deadline: g.deadline, amount: g.amount || 0 })),
    familyEventsToday: familyEvents.filter(e => e.date === today).map(e => ({ id: e.id, title: e.title, child_name: e.child_name || "" })),
    familyEventsTomorrow: familyEvents.filter(e => e.date === tomorrow).map(e => ({ id: e.id, title: e.title, child_name: e.child_name || "" })),
    birthdaysToday: specialEvents.filter(e => e.type === "birthday").map(e => ({ child_name: e.title.replace("🎂 Anniversaire de ", "") })),
    birthdaysSoon: [],
    overdueDocuments: documents.filter(d => d.due_date && d.due_date < today && d.status !== "approved"),
    expiringDocuments: documents.filter(d => {
      if (!d.due_date || d.status === "approved") return false;
      const daysLeft = Math.ceil((new Date(d.due_date).getTime() - Date.now()) / (1000 * 3600 * 24));
      return daysLeft >= 0 && daysLeft <= 7;
    }).map(d => ({ id: d.id, name: d.name, due_date: d.due_date!, daysLeft: Math.ceil((new Date(d.due_date).getTime() - Date.now()) / (1000 * 3600 * 24)) })),
    activeMissions: missions.filter(m => m.status === "active"),
    staleMissions: missions.filter(m => {
      if (m.status !== "active") return false;
      const lastUpdate = m.updated_at ? new Date(m.updated_at) : new Date(m.created_at);
      const daysSinceUpdate = Math.floor((Date.now() - lastUpdate.getTime()) / (1000 * 3600 * 24));
      return daysSinceUpdate > 5;
    }).map(m => ({ id: m.id, name: m.name, lastUpdate: m.updated_at || m.created_at || "" })),
    recentWins: wins.slice(0, 5).map(w => ({ id: w.id, title: w.title, date: w.date })),
    moodToday: moodResult.data?.mood || null,
    pendingWhatsApp: whatsapp.map(w => ({ from: w.from_name || "Contact", message: w.message?.substring(0, 60) || "", isUrgent: w.importance === "high" })),
    pendingBrainDumps: brainDumpResult.count || 0
  };
}
