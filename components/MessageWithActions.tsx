"use client";
import { useState } from "react";
import { CheckCircle, Loader2, Mail, FileText, ListTodo, Sparkles, DollarSign, Calendar } from "lucide-react";
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

export function MessageWithActions({ content, actions = [], onActionComplete }: MessageWithActionsProps) {
  const [executingActions, setExecutingActions] = useState<Set<number>>(new Set());
  const [executedActions, setExecutedActions] = useState<Set<number>>(new Set());

  const getActionIcon = (type: string) => {
    switch(type) {
      case "send_email": return <Mail className="w-3 h-3" />;
      case "create_task": return <CheckCircle className="w-3 h-3" />;
      case "create_draft": return <FileText className="w-3 h-3" />;
      case "create_checklist": return <ListTodo className="w-3 h-3" />;
      case "get_financial_summary": return <DollarSign className="w-3 h-3" />;
      case "create_calendar_event": return <Calendar className="w-3 h-3" />;
      default: return <Sparkles className="w-3 h-3" />;
    }
  };

const executeAction = async (index: number, action: Action) => {
    setExecutingActions(prev => new Set(prev).add(index));
    
    try {
      // ✅ Mapper les types d'action vers les endpoints directs
      let endpoint = "";
      let body: any = {};
      
      switch (action.type) {
        case "create_task":
          endpoint = `${API_URL}/api/execute/create-task`;
          body = action.params;
          break;
          
        case "send_email":
          endpoint = `${API_URL}/api/email/send`;
          body = action.params;
          break;
          
        case "create_checklist":
          endpoint = `${API_URL}/api/execute/create-checklist`;
          body = action.params;
          break;
          
        case "create_draft":
          endpoint = `${API_URL}/api/execute/create-draft`;
          body = action.params;
          break;
          
        case "get_financial_summary":
          endpoint = `${API_URL}/chat`;
          body = {
            messages: [{ role: "user", content: "get_financial_summary" }]
          };
          // Cas spécial : on affiche juste un toast
          toast.info("💰 Redirige vers la page Money pour voir le résumé");
          window.open("/money", "_self");
          setExecutedActions(prev => new Set(prev).add(index));
          onActionComplete?.();
          setExecutingActions(prev => {
            const next = new Set(prev);
            next.delete(index);
            return next;
          });
          return;
          
        case "create_calendar_event":
          endpoint = `${API_URL}/api/calendar/event`;
          body = action.params;
          break;
          
        case "write_to_table":
          endpoint = `${API_URL}/spending`;  // ou revenue selon le contexte
          body = { table: "spending", data: action.params };
          break;
          
        case "read_table":
          // Rediriger vers la page appropriée
          toast.info("📊 Redirection vers la page appropriée");
          const tableMap: any = {
            "tasks": "/tasks",
            "missions": "/missions",
            "spending": "/money",
            "revenue": "/money",
            "documents": "/documents",
            "family_events": "/family",
            "wins": "/wins"
          };
          const table = action.params?.table;
          if (table && tableMap[table]) {
            window.open(tableMap[table], "_self");
          }
          setExecutedActions(prev => new Set(prev).add(index));
          onActionComplete?.();
          return;
          
        default:
          // Fallback : utiliser le batch executor
          endpoint = `${API_URL}/api/executor/batch`;
          body = {
            actions: [{ action_type: action.type, params: action.params, requires_confirmation: false }],
            auto_confirm: true
          };
      }
      
      const method = endpoint.includes("/chat") ? "POST" : "POST";
      
      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`${response.status}: ${errText.substring(0, 100)}`);
      }
      
      const result = await response.json();
      
      if (result.success || result.reply) {
        toast.success(`✅ Action exécutée : ${action.label}`);
        setExecutedActions(prev => new Set(prev).add(index));
        onActionComplete?.();
      } else {
        toast.error(`❌ Erreur : ${result.error || "inconnue"}`);
      }
    } catch (error: any) {
      console.error("Erreur action:", error);
      toast.error(`❌ ${error.message || "Erreur de connexion"}`);
    } finally {
      setExecutingActions(prev => {
        const next = new Set(prev);
        next.delete(index);
        return next;
      });
    }
  };

  return (
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
        {content}
      </ReactMarkdown>
      
      {actions.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3 pt-2 border-t border-white/10">
          {actions.map((action, idx) => (
            <button
              key={idx}
              onClick={() => executeAction(idx, action)}
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
  );
}
