import { DashboardData } from "@/lib/dashboardData";

const displayedItemsCache = new Map<string, Set<string>>();

function markAsDisplayed(section: string, itemId: string): boolean {
  if (!displayedItemsCache.has(section)) {
    displayedItemsCache.set(section, new Set());
  }
  const set = displayedItemsCache.get(section)!;
  if (set.has(itemId)) return false;
  set.add(itemId);
  return true;
}

export function resetDisplayCache() {
  displayedItemsCache.clear();
}

export function formatDashboardMessages(data: DashboardData) {
  const eventMessages: string[] = [];
  const taskMessages: string[] = [];
  
  let greetingMessage = `${data.greeting} Rebecca.`;
  
  if (data.timeOfDay === "morning") {
    if (data.moodToday === "fatiguée") {
      greetingMessage = `${data.greeting} Rebecca. Tu as l'air fatiguée. On y va doucement.`;
    } else if (data.moodToday === "stressée") {
      greetingMessage = `${data.greeting} Rebecca. Je sens que tu es stressée. On respire d'abord.`;
    } else if (data.overdueTasks.length > 0) {
      greetingMessage = `${data.greeting} Rebecca. ${data.overdueTasks.length} tâche(s) en retard. On regarde ça ?`;
    }
  } else if (data.timeOfDay === "evening") {
    if (data.todayTasks.length === 0) {
      greetingMessage = `🌙 Bonsoir Rebecca. Journée terminée, tout est fait. Repose-toi bien.`;
    } else if (data.pendingWhatsApp.length > 0) {
      greetingMessage = `🌙 Bonsoir Rebecca. ${data.pendingWhatsApp.length} message(s) WhatsApp en attente.`;
    }
  }
  
  for (const event of data.specialEvents) {
    const cacheKey = `${event.type}_${event.title}`;
    if (markAsDisplayed("special_events", cacheKey)) {
      eventMessages.push(event.detail);
    }
  }
  
  let priorityMessage = "";
  
  if (data.urgentGrants.length > 0 && markAsDisplayed("priority", "grants")) {
    const grant = data.urgentGrants[0];
    priorityMessage = `⚠️ Grant urgent : ${grant.title} dans ${Math.ceil((new Date(grant.deadline).getTime() - Date.now()) / (1000 * 3600 * 24))} jour(s).`;
  } else if (data.overdueTasks.length > 0 && markAsDisplayed("priority", "overdue")) {
    priorityMessage = `🔴 ${data.overdueTasks.length} tâche(s) en retard. La plus ancienne : ${data.overdueTasks[0].title}.`;
  } else if (data.overdueDocuments.length > 0 && markAsDisplayed("priority", "documents")) {
    priorityMessage = `📄 ${data.overdueDocuments.length} document(s) en retard.`;
  } else if (data.balance < 0 && markAsDisplayed("priority", "balance")) {
    priorityMessage = `💰 Solde négatif : ${Math.abs(data.balance).toLocaleString()} CFA.`;
  } else if (data.familyEventsToday.length > 0 && markAsDisplayed("priority", "family")) {
    priorityMessage = `👨‍👩‍👧‍👦 Aujourd'hui : ${data.familyEventsToday[0].title}.`;
  }
  
  for (const task of data.todayTasks.slice(0, 3)) {
    const cacheKey = `task_${task.id}`;
    if (markAsDisplayed("tasks", cacheKey)) {
      taskMessages.push(`📋 ${task.title}${task.priority === "critical" ? " ⚠️" : ""}`);
    }
  }
  
  let financialMessage = null;
  if (data.balance < -100000 && markAsDisplayed("financial", "balance_alert")) {
    financialMessage = `💰 Solde négatif de ${Math.abs(data.balance).toLocaleString()} CFA.`;
  }
  
  let familyMessage = null;
  if (data.familyEventsToday.length > 0 && markAsDisplayed("family", "today")) {
    const event = data.familyEventsToday[0];
    familyMessage = `👨‍👩‍👧‍👦 ${event.title}${event.child_name ? ` avec ${event.child_name}` : ""} aujourd'hui.`;
  } else if (data.birthdaysToday.length > 0 && markAsDisplayed("family", "birthday")) {
    familyMessage = `🎂 Anniversaire de ${data.birthdaysToday[0].child_name} aujourd'hui !`;
  }
  
  let documentMessage = null;
  if (data.overdueDocuments.length > 0 && markAsDisplayed("documents", "overdue")) {
    documentMessage = `📄 ${data.overdueDocuments[0].name} en retard.`;
  }
  
  let whatsappMessage = null;
  const urgentWhatsApp = data.pendingWhatsApp.filter(w => w.isUrgent);
  if (urgentWhatsApp.length > 0 && markAsDisplayed("whatsapp", "urgent")) {
    whatsappMessage = `📱 ${urgentWhatsApp[0].from} : "${urgentWhatsApp[0].message}"`;
  }
  
  let actionPrompt = "";
  
  if (data.urgentGrants.length > 0 && markAsDisplayed("action", "grants")) {
    actionPrompt = `👉 On prépare le dossier ${data.urgentGrants[0].title} ?`;
  } else if (data.overdueTasks.length > 0 && markAsDisplayed("action", "overdue")) {
    actionPrompt = `👉 On commence par ${data.overdueTasks[0].title} ?`;
  } else if (data.familyEventsToday.length > 0 && markAsDisplayed("action", "family")) {
    actionPrompt = `👉 Tu veux que je prépare des questions pour ${data.familyEventsToday[0].title} ?`;
  } else if (data.pendingBrainDumps > 0 && markAsDisplayed("action", "braindump")) {
    actionPrompt = `👉 On traite ton Brain Dump maintenant ?`;
  } else {
    actionPrompt = `👉 Je suis là. De quoi as-tu besoin ?`;
  }
  
  return {
    greetingMessage,
    priorityMessage,
    eventMessages,
    taskMessages,
    financialMessage,
    familyMessage,
    documentMessage,
    whatsappMessage,
    actionPrompt
  };
}
