// components/ExecutionPlan.tsx
"use client";

import { CheckCircle, Circle, HelpCircle } from "lucide-react";
import { motion } from "framer-motion";

interface ExecutionPlanProps {
  planId: string;
  title: string;
  steps: string[];
  completedSteps: number[];
  onStepComplete: (stepIndex: number) => void;
  onPlanComplete: () => void;
  onAskHelp: (stepIndex: number, question: string) => void;
}

export function ExecutionPlan({ 
  planId, 
  title, 
  steps, 
  completedSteps, 
  onStepComplete, 
  onPlanComplete,
  onAskHelp 
}: ExecutionPlanProps) {
  const progress = (completedSteps.length / steps.length) * 100;
  const isComplete = completedSteps.length === steps.length;

  if (isComplete) {
    return (
      <div className="bg-gradient-to-r from-emerald-500/10 to-transparent border border-emerald-500/30 rounded-xl p-6 text-center">
        <div className="text-4xl mb-3">🎉</div>
        <h3 className="text-lg font-serif text-gold-500 mb-2">Mission accomplie !</h3>
        <p className="text-sm text-gray-400 mb-4">Tu as terminé toutes les étapes.</p>
        <button
          onClick={onPlanComplete}
          className="px-4 py-2 bg-gold-500/20 text-gold-500 rounded-full text-sm hover:bg-gold-500/30 transition-colors"
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
        <h3 className="text-lg font-serif text-gold-500">{title}</h3>
        <div className="flex items-center justify-between mt-2">
          <div className="text-xs text-gray-500">Progression: {Math.round(progress)}%</div>
          <div className="w-32 h-1.5 bg-white/10 rounded-full">
            <div className="h-1.5 bg-gold-500 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      {/* Liste des étapes */}
      <div className="p-4 space-y-3">
        {steps.map((step, idx) => {
          const isCompleted = completedSteps.includes(idx);
          const isCurrent = idx === completedSteps.length && !isCompleted;
          
          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className={`p-3 rounded-xl transition-all ${
                isCompleted 
                  ? "bg-emerald-500/10 border border-emerald-500/30"
                  : isCurrent
                  ? "bg-gold-500/10 border border-gold-500/30"
                  : "bg-white/5 border border-white/10"
              }`}
            >
              <div className="flex items-start gap-3">
                <button
                  onClick={() => !isCompleted && onStepComplete(idx)}
                  disabled={isCompleted}
                  className="flex-shrink-0 mt-0.5"
                >
                  {isCompleted ? (
                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <Circle className="w-5 h-5 text-gray-500 hover:text-gold-500 transition-colors" />
                  )}
                </button>
                <div className="flex-1">
                  <p className={`text-sm ${isCompleted ? "text-gray-400 line-through" : "text-ivory"}`}>
                    {idx + 1}. {step}
                  </p>
                </div>
                {isCurrent && !isCompleted && (
                  <button
                    onClick={() => {
                      const question = prompt("Quelle aide as-tu besoin sur cette étape ?", "Je veux plus de détails");
                      if (question) onAskHelp(idx, question);
                    }}
                    className="text-xs text-gold-500 hover:underline flex items-center gap-1"
                  >
                    <HelpCircle className="w-3 h-3" /> Aide
                  </button>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Pied de page */}
      <div className="p-2 text-center border-t border-gold-500/20 bg-gold-500/5">
        <p className="text-[10px] text-gray-500">
          💡 Étape {completedSteps.length + 1}/{steps.length}. Une chose à la fois.
        </p>
      </div>
    </div>
  );
}
