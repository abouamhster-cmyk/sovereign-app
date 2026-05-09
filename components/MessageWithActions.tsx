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
      let response;
      let result;
      
      // ✅ Router vers le bon endpoint selon le type d'action
      switch (action.type) {
        case "create_task":
          response = await fetch(`${API_URL}/api/execute/create-task`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: action.params.title,
              due_date: action.params.due_date || null,
              priority: action.params.priority || "normal"
            })
          });
          result = await response.json();
          break;
          
        case "send_email":
          response = await fetch(`${API_URL}/api/email/send`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              to: action.params.to,
              subject: action.params.subject,
              body: action.params.body
            })
          });
          result = await response.json();
          break;
          
        case "create_checklist":
          response = await fetch(`${API_URL}/api/execute/create-checklist`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: action.params.title,
              steps: action.params.steps || []
            })
          });
          result = await response.json();
          break;
          
        case "create_draft":
          response = await fetch(`${API_URL}/api/execute/create-draft`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: action.params.type || "email",
              context: action.params.context || ""
            })
          });
          result = await response.json();
          break;
          
        case "get_financial_summary":
          response = await fetch(`${API_URL}/financials/summary`);
          result = await response.json();
          break;
          
        case "create_calendar_event":
          response = await fetch(`${API_URL}/api/calendar/event`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              summary: action.params.summary,
              start_datetime: action.params.start_datetime,
              end_datetime: action.params.end_datetime,
              description: action.params.description || ""
            })
          });
          result = await response.json();
          break;
          
        default:
          // Fallback : utiliser l'executor batch
          response = await fetch(`${API_URL}/api/executor/batch`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              actions: [{ action_type: action.type, params: action.params, requires_confirmation: false }],
              auto_confirm: true
            })
          });
          result = await response.json();
          result = { success: result.success && result.results?.[0]?.success, error: result.results?.[0]?.error };
      }
      
      if (result && result.success) {
        toast.success(`✅ ${action.label}`);
        setExecutedActions(prev => new Set(prev).add(index));
        onActionComplete?.();
      } else {
        toast.error(`❌ ${result?.error || "Erreur inconnue"}`);
      }
    } catch (error) {
      console.error("Erreur action:", error);
      toast.error("Erreur de connexion");
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
