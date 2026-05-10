"use client";
import { useState } from "react";
import { CheckCircle, Loader2, Mail, FileText, ListTodo, Sparkles, DollarSign, Calendar, Phone, X } from "lucide-react";
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
      
      // ========== LECTURE TABLE ==========
      case "read_table":
        const tableMap: Record<string, string> = {
          "tasks": "/tasks",
          "missions": "/missions",
          "spending": "/money",
          "revenue": "/money",
          "documents": "/documents",
          "family_events": "/family",
          "wins": "/wins",
          "checklists": "/checklists"
        };
        const targetPage = tableMap[params.table];
        if (targetPage) {
          toast.info(`📊 Redirection vers ${targetPage}`, { duration: 1000 });
          setTimeout(() => window.open(targetPage, "_self"), 500);
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
  
  // États pour les modales
  const [showChecklistModal, setShowChecklistModal] = useState(false);
  const [currentChecklist, setCurrentChecklist] = useState<{ title: string; steps: string[] } | null>(null);
  
  const [showDraftModal, setShowDraftModal] = useState(false);
  const [currentDraft, setCurrentDraft] = useState<{ content: string; type: string } | null>(null);

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
      
      // Vérifier si c'est un brouillon à afficher
      if (result.data?.type === "draft") {
        setCurrentDraft({
          content: result.data.content,
          type: result.data.draftType
        });
        setShowDraftModal(true);
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
    </>
  );
}
