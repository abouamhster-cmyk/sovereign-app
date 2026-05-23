// lib/dashboardData.ts
import { supabase } from "./supabase";

export type DashboardData = {
  // Temps
  hour: number;
  dayName: string;
  date: string;
  
  // Salutation adaptative
  greeting: string;
  timeOfDay: "morning" | "afternoon" | "evening" | "night";
  
  // Événements spéciaux détectés
  specialEvents: {
    type: "birthday" | "deadline_tomorrow" | "grant_urgent" | "meeting_today" | "document_overdue";
    title: string;
    detail: string;
  }[];
  
  // Tâches
  overdueTasks: { id: string; title: string; due_date: string }[];
  todayTasks: { id: string; title: string; priority: string }[];
  tomorrowTasks: { id: string; title: string; due_date: string }[];
  
  // Finances
  balance: number;
  revenueMonth: number;
  spendingMonth: number;
  
  // Grants Love & Fire
  urgentGrants: { id: string; title: string; deadline: string; amount: number }[];
  
  // Famille
  familyEventsToday: { id: string; title: string; child_name: string; time?: string }[];
  familyEventsTomorrow: { id: string; title: string; child_name: string }[];
  birthdaysToday: { child_name: string; age?: number }[];
  birthdaysSoon: { child_name: string; daysLeft: number }[];
  
  // Documents
  overdueDocuments: { id: string; name: string; due_date: string }[];
  expiringDocuments: { id: string; name: string; due_date: string; daysLeft: number }[];
  
  // Projets
  activeMissions: { id: string; name: string; priority: string }[];
  staleMissions: { id: string; name: string; lastUpdate: string }[];
  
  // Victoires récentes (7 jours)
  recentWins: { id: string; title: string; date: string }[];
  
  // Humeur du jour
  moodToday: string | null;
  
  // Messages WhatsApp non répondus
  pendingWhatsApp: { from: string; message: string; isUrgent: boolean }[];
  
  // Brain dump non traité
  pendingBrainDumps: number;
};

export async function fetchDashboardData(userId: string): Promise<DashboardData> {
  const now = new Date();
  const hour = now.getHours();
  const today = now.toISOString().split('T')[0];
  const tomorrow = new Date(now.setDate(now.getDate() + 1)).toISOString().split('T')[0];
  const weekLater = new Date(now.setDate(now.getDate() + 7)).toISOString().split('T')[0];
  const monthAgo = new Date(now.setMonth(now.getMonth() - 1)).toISOString().split('T')[0];
  
  // Déterminer la salutation adaptative
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
  
  // Exécution parallèle de toutes les requêtes
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
    // Tâches
    supabase.from("tasks").select("id, title, due_date, priority, status").eq("user_id", userId),
    
    // Missions
    supabase.from("missions").select("id, name, priority, status, updated_at").eq("user_id", userId),
    
    // Dépenses (30 jours)
    supabase.from("spending").select("amount, date").eq("user_id", userId).gte("date", monthAgo),
    
    // Revenus (30 jours)
    supabase.from("revenue").select("amount, date").eq("user_id", userId).gte("date", monthAgo),
    
    // Événements familiaux
    supabase.from("family_events").select("*").eq("user_id", userId).gte("date", today),
    
    // Documents
    supabase.from("documents").select("*").eq("user_id", userId).neq("status", "approved"),
    
    // Victoires (7 jours)
    supabase.from("wins").select("*").eq("user_id", userId).gte("date", monthAgo),
    
    // Humeur aujourd'hui
    supabase.from("mood_entries").select("mood").eq("user_id", userId).eq("date", today).maybeSingle(),
    
    // WhatsApp non répondus
    supabase.from("whatsapp_messages").select("from_name, message, importance").eq("user_id", userId).eq("replied", false).limit(10),
    
    // Brain dump non traités
    supabase.from("inbox").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("needs_processing", true),
    
    // Grants Love & Fire
    supabase.from("lf_grants").select("*").eq("user_id", userId).not("deadline", "is", null).lte("deadline", weekLater),
    
    // Enfants pour anniversaires
    supabase.from("user_profile").select("children").eq("user_id", userId).maybeSingle()
  ]);
  
  // Traitement des données
  const tasks = tasksResult.data || [];
  const missions = missionsResult.data || [];
  const spending = spendingResult.data || [];
  const revenue = revenueResult.data || [];
  const familyEvents = familyEventsResult.data || [];
  const documents = documentsResult.data || [];
  const wins = winsResult.data || [];
  const whatsapp = whatsappResult.data || [];
  const grants = grantsResult.data || [];
  
  // Calcul des indicateurs financiers
  const totalSpending = spending.reduce((sum, s) => sum + (s.amount || 0), 0);
  const totalRevenue = revenue.reduce((sum, r) => sum + (r.amount || 0), 0);
  const balance = totalRevenue - totalSpending;
  
  // Détection des événements spéciaux
  const specialEvents: DashboardData["specialEvents"] = [];
  
  // 1. Anniversaires aujourd'hui
  const children = kidsResult.data?.[0]?.children || [];
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
  
  // 2. Grants urgents (≤ 3 jours)
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
  
  // 3. Documents en retard
  const overdueDocs = documents.filter(d => d.due_date && d.due_date < today && d.status !== "approved");
  for (const doc of overdueDocs.slice(0, 2)) {
    specialEvents.push({
      type: "document_overdue",
      title: `📄 Document en retard : ${doc.name}`,
      detail: `Était à rendre le ${new Date(doc.due_date).toLocaleDateString('fr-FR')}`
    });
  }
  
  // 4. Tâches pour demain (si beaucoup)
  const tomorrowTasksData = tasks.filter(t => t.due_date === tomorrow && t.status !== "done");
  if (tomorrowTasksData.length >= 3) {
    specialEvents.push({
      type: "deadline_tomorrow",
      title: `📋 ${tomorrowTasksData.length} tâches à faire demain`,
      detail: tomorrowTasksData.slice(0, 3).map(t => t.title).join(", ") + (tomorrowTasksData.length > 3 ? "..." : "")
    });
  }
  
  // 5. Événement familial aujourd'hui
  const familyToday = familyEvents.filter(e => e.date === today);
  if (familyToday.length > 0) {
    specialEvents.push({
      type: "meeting_today",
      title: `👨‍👩‍👧‍👦 Aujourd'hui : ${familyToday[0].title}`,
      detail: familyToday[0].child_name ? `Pour ${familyToday[0].child_name}` : ""
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
    tomorrowTasks: tomorrowTasksData,
    
    balance,
    revenueMonth: totalRevenue,
    spendingMonth: totalSpending,
    
    urgentGrants: urgentGrants.map(g => ({
      id: g.id,
      title: g.title,
      deadline: g.deadline,
      amount: g.amount || 0
    })),
    
    familyEventsToday: familyEvents.filter(e => e.date === today).map(e => ({
      id: e.id,
      title: e.title,
      child_name: e.child_name || "",
      time: e.time || undefined
    })),
    
    familyEventsTomorrow: familyEvents.filter(e => e.date === tomorrow).map(e => ({
      id: e.id,
      title: e.title,
      child_name: e.child_name || ""
    })),
    
    birthdaysToday: specialEvents.filter(e => e.type === "birthday").map(e => ({
      child_name: e.title.replace("🎂 Anniversaire de ", ""),
      age: undefined
    })),
    
    birthdaysSoon: [],
    
    overdueDocuments: documents.filter(d => d.due_date && d.due_date < today && d.status !== "approved"),
    expiringDocuments: documents.filter(d => {
      if (!d.due_date || d.status === "approved") return false;
      const daysLeft = Math.ceil((new Date(d.due_date).getTime() - Date.now()) / (1000 * 3600 * 24));
      return daysLeft >= 0 && daysLeft <= 7;
    }).map(d => ({
      id: d.id,
      name: d.name,
      due_date: d.due_date!,
      daysLeft: Math.ceil((new Date(d.due_date).getTime() - Date.now()) / (1000 * 3600 * 24))
    })),
    
    activeMissions: missions.filter(m => m.status === "active"),
    staleMissions: missions.filter(m => {
      if (m.status !== "active") return false;
      const lastUpdate = m.updated_at ? new Date(m.updated_at) : new Date(m.created_at);
      const daysSinceUpdate = Math.floor((Date.now() - lastUpdate.getTime()) / (1000 * 3600 * 24));
      return daysSinceUpdate > 5;
    }).map(m => ({
      id: m.id,
      name: m.name,
      lastUpdate: m.updated_at || m.created_at || ""
    })),
    
    recentWins: wins.slice(0, 5).map(w => ({
      id: w.id,
      title: w.title,
      date: w.date
    })),
    
    moodToday: moodResult.data?.mood || null,
    
    pendingWhatsApp: whatsapp.map(w => ({
      from: w.from_name || "Contact",
      message: w.message?.substring(0, 60) || "",
      isUrgent: w.importance === "high"
    })),
    
    pendingBrainDumps: brainDumpResult.count || 0
  };
}
