"use client";

import { useState } from "react";
import { CheckCircle, Circle, Loader2, Sparkles, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

const API_URL = "https://sovereign-bridge.onrender.com";

interface Step {
  description: string;
  action_type: string;
  estimated_minutes: number;
}

interface ExecutionPlan {
  title: string;
  estimated_duration: string;
  steps: Step[];
  success_criteria: string;
  next_steps_hint: string;
}

interface ExecutionGuideProps {
  planId: string;
  plan: ExecutionPlan;
  onComplete?: () => void;
  onClose?: () => void;
  onUpdate?: (completedSteps: number[]) => void; 
}

export function ExecutionGuide({ planId, plan, onComplete, onClose }: ExecutionGuideProps) {
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const progress = (completedSteps.length / plan.steps.length) * 100;

  const completeStep = async (index: number) => {
  if (completedSteps.includes(index) || isCompleting) return;
  
  setIsCompleting(true);
  const newCompleted = [...completedSteps, index];
  setCompletedSteps(newCompleted);
  
  // Appeler la prop de mise à jour pour sauvegarder dans le message parent
  if (onUpdate) {
    onUpdate(newCompleted);
  }
    try {
      const response = await fetch(`${API_URL}/api/execute/complete-step`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan_id: planId, step_index: index })
      });
      const data = await response.json();

      if (data.success) {
        setCompletedSteps(prev => [...prev, index]);
        toast.success(`✅ ${plan.steps[index].description.substring(0, 50)}...`);
        
        if (data.is_complete) {
          setIsComplete(true);
          toast.success("🎉 Mission accomplie !");
          onComplete?.();
        }
      } else {
        toast.error("Erreur: " + (data.error || "Inconnue"));
      }
    } catch (error) {
      console.error("Erreur completeStep:", error);
      toast.error("Erreur de connexion");
    } finally {
      setIsCompleting(false);
    }
  };

  const getActionIcon = (type: string) => {
    switch (type) {
      case "task": return "📋";
      case "email": return "📧";
      case "document": return "📄";
      case "call": return "📞";
      case "decision": return "🤔";
      case "research": return "🔍";
      case "wait": return "⏳";
      case "celebrate": return "🎉";
      case "rest": return "🌿";
      default: return "✨";
    }
  };

  if (isComplete) {
    return (
      <div className="bg-gradient-to-r from-emerald-500/10 to-transparent border border-emerald-500/30 rounded-xl p-6 text-center">
        <div className="text-4xl mb-3">🎉</div>
        <h3 className="text-lg font-serif text-gold-500 mb-2">Mission accomplie !</h3>
        <p className="text-sm text-gray-400 mb-4">{plan.success_criteria}</p>
        <p className="text-xs text-gray-500 italic">{plan.next_steps_hint}</p>
        <button
          onClick={onClose}
          className="mt-4 px-4 py-2 bg-gold-500/20 text-gold-500 rounded-full text-sm"
        >
          Continuer
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-gold-500/10 to-transparent border border-gold-500/30 rounded-xl overflow-hidden">
      {/* En-tête */}
      <div className="p-4 border-b border-gold-500/20 bg-gold-500/5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-serif text-gold-500">{plan.title}</h3>
            <p className="text-xs text-gray-500">⏱️ {plan.estimated_duration}</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gold-500">{Math.round(progress)}%</div>
            <div className="w-24 h-1.5 bg-white/10 rounded-full mt-1">
              <div 
                className="h-1.5 bg-gold-500 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Liste des étapes */}
      <div className="p-4 space-y-3">
        {plan.steps.map((step, idx) => {
          const isCompleted = completedSteps.includes(idx);
          const isCurrent = !isCompleted && (idx === 0 || completedSteps.includes(idx - 1));
          
          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className={`flex items-start gap-3 p-3 rounded-xl transition-all ${
                isCompleted 
                  ? "bg-emerald-500/10 border border-emerald-500/20" 
                  : isCurrent 
                    ? "bg-gold-500/10 border border-gold-500/30" 
                    : "bg-white/5 border border-white/10"
              }`}
            >
              <button
                onClick={() => completeStep(idx)}
                disabled={isCompleting || isCompleted}
                className="flex-shrink-0 mt-0.5"
              >
                {isCompleted ? (
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                ) : (
                  <Circle className="w-5 h-5 text-gray-500 hover:text-gold-500 transition-colors" />
                )}
              </button>
              
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-ivory">{step.description}</span>
                  <span className="text-[10px] text-gray-500 bg-white/5 px-2 py-0.5 rounded-full">
                    {getActionIcon(step.action_type)} {step.estimated_minutes} min
                  </span>
                </div>
              </div>
              
              {isCurrent && !isCompleted && (
                <Sparkles className="w-4 h-4 text-gold-500 animate-pulse" />
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Pied de page */}
      <div className="p-3 border-t border-gold-500/20 bg-gold-500/5 text-center">
        <p className="text-[10px] text-gray-500">
          💡 Une étape à la fois. Coche au fur et à mesure.
        </p>
      </div>
    </div>
  );
}
