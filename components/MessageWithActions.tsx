"use client";
import { useState } from "react";
import { CheckCircle, Loader2, Mic, Send, MapPin, Clock, Mail, FileText, ListTodo, Sparkles, DollarSign, Calendar, Phone, MessageCircle, X } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from 'react-markdown';

const API_URL = "https://sovereign-bridge.onrender.com";

type Action = {
  type: string;
  params: any;
  label: string;
};

type MessageWithActionsProps = {
  content: string;
  actions?: Action[];
  onActionComplete?: () => void;
};

// ============================================================
// FONCTION POUR PARSER LES ACTIONS DANS LE TEXTE
// ============================================================
function parseActionsFromText(text: string): { cleanText: string; actions: Action[] } {
  const actionRegex = /\[ACTION:({[^{}]+(?:{[^{}]*}[^{}]*)*})\]/g;
  const actions: Action[] = [];
  let cleanText = text;
  let match;
  
  while ((match = actionRegex.exec(text)) !== null) {
    try {
      const actionData = JSON.parse(match[1]);
      if (actionData.type && actionData.params !== undefined && actionData.label) {
        actions.push({
          type: actionData.type,
          params: actionData.params,
          label: actionData.label
        });
      }
      cleanText = cleanText.replace(match[0], '');
    } catch (e) {
      console.error('Action JSON invalide:', match[1]);
    }
  }
  
  cleanText = cleanText.replace(/\n{3,}/g, '\n\n').trim();
  
  return { cleanText, actions };
}

// ============================================================
// ICONES DES ACTIONS
// ============================================================
const getActionIcon = (type: string) => {
  switch(type) {
    case "send_email": return <Mail className="w-3 h-3" />;
    case "create_task": return <CheckCircle className="w-3 h-3" />;
    case "create_draft": return <FileText className="w-3 h-3" />;
    case "create_checklist": return <ListTodo className="w-3 h-3" />;
    case "get_financial_summary": return <DollarSign className="w-3 h-3" />;
    case "create_calendar_event": return <Calendar className="w-3 h-3" />;
    case "make_call": return <Phone className="w-3 h-3" />;
    case "send_sms": return <MessageCircle className="w-3 h-3" />;
    case "send_whatsapp": return <MessageCircle className="w-3 h-3 text-green-400" />;
    case "send_telegram": return <Send className="w-3 h-3 text-sky-400" />;
    case "schedule_reminder": return <Clock className="w-3 h-3" />;
    case "share_location": return <MapPin className="w-3 h-3" />;
    case "read_table": return <ListTodo className="w-3 h-3" />;
    case "voice_message": return <Mic className="w-3 h-3" />;
    default: return <Sparkles className="w-3 h-3" />;
  }
};

// ============================================================
// EXÉCUTION D'UNE ACTION
// ============================================================
const executeActionFn = async (action: Action): Promise<{ success: boolean; data?: any }> => {
  try {
    const { type, params } = action;
    
    console.log("🔘 Action cliquée:", { type, params });
    
    switch (type) {
      // ========== TÂCHES ==========
      case "create_task":
        const taskResponse = await fetch(`${API_URL}/api/execute/create-task`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: params.title,
            priority: params.priority || "normal",
            due_date: params.due_date || null
          })
        });
        const taskResult = await taskResponse.json();
        if (taskResult.success) {
          toast.success(`✅ Tâche créée: "${params.title}"`);
          return { success: true, data: taskResult.task };
        }
        break;
      
      // ========== FINANCES ==========
      case "get_financial_summary":
        toast.info("💰 Redirection vers la page Money", { duration: 2000 });
        setTimeout(() => {
          window.open("/money", "_self");
        }, 500);
        return { success: true };
      
      // ========== EMAILS ==========
      case "send_email":
        const emailResponse = await fetch(`${API_URL}/api/email/send`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: params.to,
            subject: params.subject,
            body: params.body
          })
        });
        const emailResult = await emailResponse.json();
        if (emailResult.success) {
          toast.success(`📧 Email envoyé à ${params.to}`);
          return { success: true };
        }
        break;
      
      // ========== CHECKLISTS ==========
      case "create_checklist":
        // Retourner les données de la checklist pour affichage modale
        const steps = params.steps || [
          "Étape 1: Préparer les documents",
          "Étape 2: Contacter les parties prenantes",
          "Étape 3: Finaliser et soumettre"
        ];
        return { 
          success: true, 
          data: { 
            type: "checklist",
            title: params.title || "Checklist",
            steps: steps
          } 
        };
      
      // ========== BROUILLONS ==========
      case "create_draft":
        const draftResponse = await fetch(`${API_URL}/api/execute/create-draft`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: params.type || "email",
            context: params.context || "Document à rédiger"
          })
        });
        const draftResult = await draftResponse.json();
        if (draftResult.success && draftResult.draft) {
          toast.success(`📄 Brouillon généré: ${draftResult.draft.type}`);
          return { 
            success: true, 
            data: { 
              type: "draft",
              content: draftResult.draft.content,
              draftType: draftResult.draft.type
            } 
          };
        }
        break;
      
      // ========== CALENDRIER ==========
      case "create_calendar_event":
        const calendarResponse = await fetch(`${API_URL}/api/calendar/event`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            summary: params.summary,
            start_datetime: params.start_datetime,
            end_datetime: params.end_datetime,
            description: params.description || ""
          })
        });
        const calendarResult = await calendarResponse.json();
        if (calendarResult.success) {
          toast.success(`📅 Événement créé: ${params.summary}`);
          if (calendarResult.link) {
            window.open(calendarResult.link, "_blank");
          }
          return { success: true };
        }
        break;
      
      // ========== ANALYSE DÉPENSES ==========
      case "analyze_spending":
      case "analyze_expenses":
        toast.info("🔍 Analyse des dépenses - Redirection vers Money", { duration: 2000 });
        setTimeout(() => {
          window.open("/money", "_self");
        }, 500);
        return { success: true };
      
      // ========== ÉCRITURE TABLE ==========
      case "write_to_table":
        const table = params.table || "spending";
        const writeResponse = await fetch(`${API_URL}/${table}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: params })
        });
        const writeResult = await writeResponse.json();
        if (writeResult.success) {
          toast.success(`💾 Enregistré dans ${table}`);
          return { success: true };
        }
        break;

        // ========== APPELS TÉLÉPHONIQUES ==========
        case "make_call":
          const phoneNumber = params.phone || params.number || params.to;
          if (phoneNumber && phoneNumber !== "__NUMÉRO__" && !phoneNumber.includes("__")) {
            toast.info(`📞 Appel de ${phoneNumber}...`, { duration: 2000 });
            setTimeout(() => {
              window.location.href = `tel:${phoneNumber.replace(/\s/g, '').replace(/^\+/, '')}`;
            }, 500);
            return { success: true };
          }
          toast.error("❌ Numéro de téléphone non disponible");
          break;

        // ========== SAUVEGARDER EN MÉMOIRE ==========
        case "save_memory":
          const saveResponse = await fetch(`${API_URL}/api/memory/save`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              category: params.category || "general",
              key: params.key,
              value: params.value
            })
          });
          const saveResult = await saveResponse.json();
          if (saveResult.success) {
            toast.success(`💾 "${params.key}" sauvegardé`);
            return { success: true };
          }
          break;

        // ========== SMS ==========
         case "send_sms":
          const smsNumber = params.phone || params.number || params.to;
          const smsBody = params.body || params.message || "Message de Sovereign";
          if (smsNumber && smsNumber !== "__NUMÉRO__" && !smsNumber.includes("__")) {
            const cleanNumber = smsNumber.replace(/\s/g, '').replace(/^\+/, '');
            const encodedBody = encodeURIComponent(smsBody);
            
            // Détecter si c'est un mobile ou desktop
            const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
            
            if (isMobile) {
              // Mobile : utiliser sms:
              toast.info(`📱 Envoi SMS à ${smsNumber}...`, { duration: 2000 });
              setTimeout(() => {
                window.location.href = `sms:${cleanNumber}?body=${encodedBody}`;
              }, 500);
            } else {
              // Desktop : ouvrir WhatsApp Web ou copier le numéro
              toast.info(`📱 Sur ordinateur, utilise WhatsApp ou copie le numéro: ${smsNumber}`, { duration: 4000 });
              navigator.clipboard.writeText(smsNumber);
              toast.success(`📋 Numéro ${smsNumber} copié dans le presse-papier`);
              
              // Proposer d'ouvrir WhatsApp Web
              setTimeout(() => {
                if (confirm("Ouvrir WhatsApp Web pour envoyer ce message ?")) {
                  window.open(`https://wa.me/${cleanNumber}?text=${encodedBody}`, '_blank');
                }
              }, 1000);
            }
            return { success: true };
          }
          toast.error("❌ Numéro de téléphone non disponible");
          break;

        // ========== WHATSAPP ==========
        case "send_whatsapp":
          const waNumber = params.phone || params.number || params.to;
          const waMessage = params.body || params.message || "Message de Sovereign";
          if (waNumber && waNumber !== "__NUMÉRO__" && !waNumber.includes("__")) {
            const cleanNumber = waNumber.replace(/\s/g, '').replace(/^\+/, '');
            const encodedMessage = encodeURIComponent(waMessage);
            toast.info(`💬 Ouverture WhatsApp...`, { duration: 2000 });
            setTimeout(() => {
              window.open(`https://wa.me/${cleanNumber}?text=${encodedMessage}`, '_blank');
            }, 500);
            return { success: true };
          }
          toast.error("❌ Numéro WhatsApp non disponible");
          break;

        // ========== TELEGRAM ==========
      case "send_telegram":
        const tgUsername = params.username || params.to;
        const tgMessage = params.body || params.message;
        if (tgUsername) {
          const cleanUsername = tgUsername.replace('@', '');
          toast.info(`💬 Ouverture Telegram...`, { duration: 2000 });
          setTimeout(() => {
            const url = tgMessage 
              ? `https://t.me/${cleanUsername}?text=${encodeURIComponent(tgMessage)}`
              : `https://t.me/${cleanUsername}`;
            window.open(url, '_blank');
          }, 500);
          return { success: true };
        }
        toast.error("❌ Nom d'utilisateur Telegram manquant");
        break;

      // ========== RAPPELS PROGRAMMÉS AVEC SON & VIBRATION ==========
      case "schedule_reminder":
        const reminderTitle = params.title || "Rappel";
        const reminderMinutes = params.minutes;
        
        if (reminderMinutes && typeof reminderMinutes === 'number') {
          toast.success(`⏰ Rappel dans ${reminderMinutes} minute(s): "${reminderTitle}"`);
          
          setTimeout(() => {
            // 1. Vibration (si supporté)
            if ("vibrate" in navigator) {
              navigator.vibrate([200, 100, 200, 100, 500]);
            }
            
            // 2. Son (via une API Web Audio)
            try {
              const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
              const oscillator = audioContext.createOscillator();
              const gainNode = audioContext.createGain();
              oscillator.connect(gainNode);
              gainNode.connect(audioContext.destination);
              oscillator.frequency.value = 880;
              gainNode.gain.value = 0.3;
              oscillator.start();
              gainNode.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + 1);
              oscillator.stop(audioContext.currentTime + 0.8);
            } catch(e) { console.log("Son non supporté"); }
            
            // 3. Toast visuel
            toast.info(`🔔 ${reminderTitle}`, { duration: 10000 });
            
            // 4. Notification browser (même app fermée si service worker)
            if ("Notification" in window) {
              if (Notification.permission === "granted") {
                const notificationOptions: any = {
                  body: `⏰ Rappel programmé il y a ${reminderMinutes} minute(s)`,
                  icon: "/icons/icon-192x192.png",
                  badge: "/icons/icon-96x96.png",
                  tag: `reminder-${Date.now()}`,
                  silent: false
                };
                // Vibration seulement si supportée
                if ("vibrate" in navigator) {
                  notificationOptions.vibrate = [200, 100, 200];
                }
                new Notification(reminderTitle, notificationOptions);
              } else if (Notification.permission !== "denied") {
                Notification.requestPermission().then(perm => {
                  if (perm === "granted") {
                    const notificationOptions: any = {
                      body: `⏰ Rappel programmé`,
                      icon: "/icons/icon-192x192.png",
                      badge: "/icons/icon-96x96.png",
                      tag: `reminder-${Date.now()}`
                    };
                    if ("vibrate" in navigator) {
                      notificationOptions.vibrate = [200, 100, 200];
                    }
                    new Notification(reminderTitle, notificationOptions);
                  }
                });
              }
            }
          }, reminderMinutes * 60 * 1000);
          
          return { success: true };
        }
        
        toast.error("❌ Durée du rappel manquante (ex: minutes: 30)");
        break;

          // ========== PARTAGE DE POSITION AVEC SON ==========
    case "share_location":
      if ("geolocation" in navigator) {
        toast.info("📍 Récupération de votre position...", { duration: 2000 });
        
        // Petit son de début
        try {
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          oscillator.frequency.value = 440;
          gainNode.gain.value = 0.1;
          oscillator.start();
          oscillator.stop(audioContext.currentTime + 0.2);
        } catch(e) {}
        
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            const mapsUrl = `https://maps.google.com/?q=${latitude},${longitude}`;
            
            toast.success(`📍 Position trouvée !`);
            navigator.clipboard.writeText(mapsUrl);
            toast.success(`📋 Lien copié !`, { duration: 3000 });
            
            // Son de succès
            try {
              const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
              const oscillator = audioContext.createOscillator();
              const gainNode = audioContext.createGain();
              oscillator.connect(gainNode);
              gainNode.connect(audioContext.destination);
              oscillator.frequency.value = 660;
              gainNode.gain.value = 0.1;
              oscillator.start();
              oscillator.stop(audioContext.currentTime + 0.3);
            } catch(e) {}
            
            setTimeout(() => {
              if (confirm("📍 Voir votre position sur Google Maps ?")) {
                window.open(mapsUrl, '_blank');
              }
            }, 1000);
          },
          (error) => {
            let errorMsg = "❌ Impossible d'obtenir la position";
            if (error.code === 1) errorMsg = "📍 Permission refusée. Activez la localisation.";
            if (error.code === 2) errorMsg = "📍 Position non disponible, réessayez.";
            if (error.code === 3) errorMsg = "📍 Délai dépassé, vérifiez votre connexion GPS.";
            toast.error(errorMsg);
            
            // Son d'erreur
            try {
              const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
              const oscillator = audioContext.createOscillator();
              const gainNode = audioContext.createGain();
              oscillator.connect(gainNode);
              gainNode.connect(audioContext.destination);
              oscillator.frequency.value = 220;
              gainNode.gain.value = 0.1;
              oscillator.start();
              oscillator.stop(audioContext.currentTime + 0.5);
            } catch(e) {}
          },
          { timeout: 10000, enableHighAccuracy: true }
        );
        return { success: true };
      }
      toast.error("❌ Géolocalisation non supportée");
      break;

      // ========== LECTURE TABLE AVEC AFFICHAGE ==========
      case "read_table":
        const tableName = params.table;
        const filters = params.filters || {};
        
        if (!tableName) {
          toast.error("❌ Nom de table manquant");
          break;
        }
        
        toast.info(`📊 Chargement des données depuis ${tableName}...`, { duration: 1500 });
        
        try {
          // Construire l'URL avec les filtres
          let url = `${API_URL}/${tableName}?limit=${params.limit || 20}`;
          
          const readResponse = await fetch(url, {
            method: "GET",
            headers: { "Content-Type": "application/json" }
          });
          const readResult = await readResponse.json();
          
          if (readResult.success && readResult.data && readResult.data.length > 0) {
            // Formater les données pour affichage
            const data = readResult.data;
            let formattedData = `📋 **${tableName.toUpperCase()}** (${data.length} élément(s)):\n\n`;
            
            data.slice(0, 10).forEach((item: any, idx: number) => {
              if (tableName === "tasks") {
                formattedData += `${idx + 1}. ${item.title} - ${item.status || 'pending'} ${item.due_date ? `📅 ${item.due_date}` : ''}\n`;
              } else if (tableName === "spending" || tableName === "revenue") {
                formattedData += `${idx + 1}. ${item.title || item.source} : ${item.amount?.toLocaleString()} CFA\n`;
              } else if (tableName === "missions") {
                formattedData += `${idx + 1}. 🎯 ${item.name} - ${item.status}\n`;
              } else {
                formattedData += `${idx + 1}. ${JSON.stringify(item).substring(0, 100)}...\n`;
              }
            });
            
            if (data.length > 10) {
              formattedData += `\n... et ${data.length - 10} autre(s)`;
            }
            
            toast.success(`📊 Données chargées (${data.length} éléments)`);
            
            // Retourner les données pour affichage
            return { 
              success: true, 
              data: { 
                type: "table_data",
                title: tableName,
                content: formattedData,
                rawData: data
              } 
            };
          } else {
            toast.info(`📊 Aucune donnée trouvée dans ${tableName}`);
            return { success: true, data: { type: "table_data", title: tableName, content: `📊 Aucune donnée dans ${tableName}` } };
          }
        } catch (error) {
          console.error("Erreur read_table:", error);
          toast.error("❌ Erreur chargement des données");
          break;
        }

        // ========== MESSAGES VOCAUX ==========
      case "voice_message":
        toast.info("🎤 Message vocal - Fonctionnalité à venir", { duration: 3000 });
        // TODO: Intégration avec service de messagerie vocale
        return { success: true };



        // ========== WHATSAPP RÉPONSES ==========
      case "whatsapp_reply":
        const replyResponse = await fetch(`${API_URL}/api/whatsapp/reply`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: params.to,
            message: params.message,
            message_id: params.message_id
          })
        });
        const replyResult = await replyResponse.json();
        if (replyResult.success) {
          toast.success(`📱 Réponse envoyée à ${params.to}`);
          return { success: true };
        }
        break;
      
      case "whatsapp_reply_custom":
        // Ouvrir une modale pour personnaliser la réponse
        return {
          success: true,
          data: {
            type: "whatsapp_custom",
            to: params.to,
            original_message: params.original_message
          }
        };


      // ========== WHATSAPP - GET CONVERSATIONS ==========
      case "whatsapp_get_conversations":
        const convResponse = await fetch(`${API_URL}/api/whatsapp/conversations?days=${params.days || 7}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" }
        });
        const convResult = await convResponse.json();
        
        if (convResult.conversations && convResult.conversations.length > 0) {
          let formattedMessages = "📱 **Messages WhatsApp récents**\n\n";
          
          convResult.conversations.forEach((conv: any) => {
            formattedMessages += `👤 **${conv.from_name || conv.from}** (${conv.unread} non lu(s))\n`;
            conv.messages.slice(0, 3).forEach((msg: any) => {
              formattedMessages += `   💬 ${msg.message.substring(0, 100)}`;
              if (msg.status === "pending") formattedMessages += ` ⏳`;
              formattedMessages += `\n`;
            });
            formattedMessages += `   [ACTION:{"type":"whatsapp_reply","params":{"to":"${conv.from}","message":""},"label":"✏️ Répondre"}]\n\n`;
          });
          
          return { 
            success: true, 
            data: { 
              type: "table_data",
              title: "WhatsApp",
              content: formattedMessages
            } 
          };
        } else {
          toast.info("📱 Aucun message WhatsApp récent");
          return { success: true };
        }
        break;
      // ========== DÉFAUT ==========
      default:
        console.warn("⚠️ Action non implémentée:", type, params);
        toast.info(`🔧 "${action.label}" - Fonctionnalité en cours d'implémentation`, { duration: 3000 });
        return { success: true };
    }
    
    return { success: false };
  } catch (error: any) {
    console.error("❌ Erreur action:", error);
    toast.error(`❌ ${error.message || "Erreur d'exécution"}`);
    return { success: false };
  }
};

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================
export function MessageWithActions({ content, actions: providedActions = [], onActionComplete }: MessageWithActionsProps) {
  const { cleanText, actions: parsedActions } = parseActionsFromText(content);
  const actions = providedActions.length > 0 ? providedActions : parsedActions;
  
  const [executingActions, setExecutingActions] = useState<Set<number>>(new Set());
  const [executedActions, setExecutedActions] = useState<Set<number>>(new Set());
  const [showDataModal, setShowDataModal] = useState(false);
  const [currentData, setCurrentData] = useState<{ title: string; content: string } | null>(null);
  
  // États pour les modales
  const [showChecklistModal, setShowChecklistModal] = useState(false);
  const [currentChecklist, setCurrentChecklist] = useState<{ title: string; steps: string[] } | null>(null);
  
  const [showDraftModal, setShowDraftModal] = useState(false);
  const [currentDraft, setCurrentDraft] = useState<{ content: string; type: string } | null>(null);
  
    // États pour WhatsApp Custom Reply
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [currentWhatsApp, setCurrentWhatsApp] = useState<{ to: string; original_message: string } | null>(null);
  const [customReply, setCustomReply] = useState("");

  const handleExecuteAction = async (index: number, action: Action) => {
    setExecutingActions(prev => new Set(prev).add(index));
    
    const result = await executeActionFn(action);
    
    if (result.success) {
      // Vérifier si c'est une checklist à afficher
      if (result.data?.type === "checklist") {
        setCurrentChecklist({
          title: result.data.title,
          steps: result.data.steps
        });
        setShowChecklistModal(true);
      }

      if (result.data?.type === "table_data") {
          setCurrentData({
            title: result.data.title,
            content: result.data.content
          });
          setShowDataModal(true);
        }
      
      // Vérifier si c'est un brouillon à afficher
      if (result.data?.type === "draft") {
        setCurrentDraft({
          content: result.data.content,
          type: result.data.draftType
        });
        setShowDraftModal(true);
      }

    if (result.data?.type === "whatsapp_custom") {
      setCurrentWhatsApp({
        to: result.data.to,
        original_message: result.data.original_message
      });
      setCustomReply("");
      setShowWhatsAppModal(true);
    }
      toast.success(`✅ ${action.label}`);
      setExecutedActions(prev => new Set(prev).add(index));
      onActionComplete?.();
    } else {
      toast.error(`❌ Échec : ${action.label}`);
    }
    
    setExecutingActions(prev => {
      const next = new Set(prev);
      next.delete(index);
      return next;
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("📋 Copié dans le presse-papier");
  };

  return (
    <>
      <div className="space-y-3">
        <ReactMarkdown
          components={{
            img: ({ ...props }) => (
              <img {...props} className="rounded-xl max-w-full max-h-96 object-contain my-2 border border-white/10" loading="lazy" />
            ),
            a: ({ href, children, ...props }) => {
              const isImage = href?.match(/\.(jpg|jpeg|png|gif|webp)$/i);
              if (isImage) {
                return <img src={href} alt={String(children)} className="rounded-xl max-w-full max-h-96 object-contain my-2 border border-white/10" loading="lazy" />;
              }
              return <a href={href} target="_blank" rel="noopener noreferrer" className="text-gold-500 hover:underline" {...props}>{children}</a>;
            },
          }}
        >
          {cleanText || content}
        </ReactMarkdown>
        
        {actions.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3 pt-2 border-t border-white/10">
            {actions.map((action, idx) => (
              <button
                key={idx}
                onClick={() => handleExecuteAction(idx, action)}
                disabled={executingActions.has(idx) || executedActions.has(idx)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  executedActions.has(idx)
                    ? "bg-emerald-500/20 text-emerald-400 cursor-default"
                    : "bg-gold-500/20 text-gold-400 hover:bg-gold-500/30 hover:scale-105"
                } disabled:opacity-50 disabled:hover:scale-100`}
              >
                {executingActions.has(idx) ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : executedActions.has(idx) ? (
                  <CheckCircle className="w-3 h-3" />
                ) : (
                  getActionIcon(action.type)
                )}
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* MODALE CHECKLIST */}
      {showChecklistModal && currentChecklist && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setShowChecklistModal(false)}>
          <div className="bg-midnight border border-gold-500/30 rounded-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-serif text-gold-500">{currentChecklist.title}</h3>
              <button onClick={() => setShowChecklistModal(false)} className="text-gray-400 hover:text-gold-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3 mb-6">
              {currentChecklist.steps.map((step, idx) => (
                <div key={idx} className="flex items-center gap-3 p-2 bg-white/5 rounded-lg">
                  <input type="checkbox" className="w-4 h-4 rounded border-gold-500 accent-gold-500" />
                  <span className="text-sm text-ivory">{step}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => setShowChecklistModal(false)}
              className="w-full py-2 bg-gold-500/20 text-gold-500 rounded-lg hover:bg-gold-500/30 transition-colors"
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* MODALE BROUILLON */}
      {showDraftModal && currentDraft && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setShowDraftModal(false)}>
          <div className="bg-midnight border border-gold-500/30 rounded-xl max-w-2xl w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-serif text-gold-500">
                {currentDraft.type === "email" ? "📧 Brouillon d'email" : "📄 Brouillon de document"}
              </h3>
              <button onClick={() => setShowDraftModal(false)} className="text-gray-400 hover:text-gold-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="bg-black/30 rounded-lg p-4 mb-4 max-h-96 overflow-y-auto">
              <pre className="text-sm text-ivory whitespace-pre-wrap font-sans">
                {currentDraft.content}
              </pre>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => copyToClipboard(currentDraft.content)}
                className="flex-1 py-2 bg-gold-500/20 text-gold-500 rounded-lg hover:bg-gold-500/30 transition-colors"
              >
                📋 Copier
              </button>
              <button
                onClick={() => setShowDraftModal(false)}
                className="flex-1 py-2 bg-white/10 text-gray-400 rounded-lg hover:bg-white/20 transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALE DONNÉES TABLE */}
        {showDataModal && currentData && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setShowDataModal(false)}>
            <div className="bg-midnight border border-gold-500/30 rounded-xl max-w-lg w-full p-6" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-serif text-gold-500">📊 {currentData.title}</h3>
                <button onClick={() => setShowDataModal(false)} className="text-gray-400 hover:text-gold-500">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="bg-black/30 rounded-lg p-4 mb-4 max-h-96 overflow-y-auto">
                <pre className="text-sm text-ivory whitespace-pre-wrap font-sans">
                  {currentData.content}
                </pre>
              </div>
              <button
                onClick={() => setShowDataModal(false)}
                className="w-full py-2 bg-gold-500/20 text-gold-500 rounded-lg hover:bg-gold-500/30"
              >
                Fermer
              </button>
            </div>
          </div>
        )}

        {showWhatsAppModal && currentWhatsApp && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-midnight border border-gold-500/30 rounded-xl max-w-md w-full p-6">
              <h3 className="text-lg font-serif text-gold-500 mb-2">✏️ Répondre à {currentWhatsApp.to}</h3>
              <p className="text-xs text-gray-400 mb-3">Message original : {currentWhatsApp.original_message}</p>
              <textarea
                value={customReply}
                onChange={(e) => setCustomReply(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-lg p-3 text-sm text-ivory"
                rows={4}
                placeholder="Ta réponse..."
              />
              <div className="flex gap-2 mt-4">
                <button
                  onClick={async () => {
                    await executeActionFn({
                      type: "whatsapp_reply",
                      params: { to: currentWhatsApp.to, message: customReply },
                      label: "Envoyer"
                    });
                    setShowWhatsAppModal(false);
                  }}
                  className="flex-1 py-2 bg-gold-500/20 text-gold-500 rounded-lg"
                >
                  📱 Envoyer
                </button>
                <button onClick={() => setShowWhatsAppModal(false)} className="flex-1 py-2 bg-white/10 text-gray-400 rounded-lg">
                  Annuler
                </button>
              </div>
            </div>
          </div>
        )}
    </>
  );
}
