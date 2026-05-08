"use client";
import { useState } from "react";
import { CheckCircle, XCircle, Loader2, Send, FileText, Mail, ListTodo } from "lucide-react";
import { toast } from "sonner";

const API_URL = "https://sovereign-bridge.onrender.com";

type Action = {
  type: string;
  params: any;
  label: string;
  confirm?: boolean;
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
      case "create_subtasks": return <ListTodo className="w-3 h-3" />;
      default: return <Send className="w-3 h-3" />;
    }
  };

  const executeAction = async (index: number, action: Action) => {
    setExecutingActions(prev => new Set(prev).add(index));
    
    try {
      const response = await fetch(`${API_URL}/api/executor/batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actions: [{ action_type: action.type, params: action.params, requires_confirmation: false }],
          auto_confirm: true
        })
      });
      
      const result = await response.json();
      
      if (result.success && result.results[0]?.success) {
        toast.success(`✅ Action exécutée : ${action.label}`);
        setExecutedActions(prev => new Set(prev).add(index));
        onActionComplete?.();
      } else {
        toast.error(`❌ Erreur : ${result.results[0]?.error || "inconnue"}`);
      }
    } catch (error) {
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
      <div className="prose prose-invert max-w-none">
        {content.split('\n').map((line, i) => (
          <p key={i} className="text-sm text-ivory">{line}</p>
        ))}
      </div>
      
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
              {executedActions.has(idx) ? "Fait" : action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
