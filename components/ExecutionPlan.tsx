"use client";

import { useState } from "react";
import { CheckCircle, Circle, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

interface ExecutionPlanProps {
  planId: string;
  title: string;
  steps: string[];
  onStepComplete: (stepIndex: number) => void;
  onPlanComplete: () => void;
  onAskHelp: (stepIndex: number, question: string) => void;
}

export function ExecutionPlan({ 
  planId, 
  title, 
  steps, 
  onStepComplete, 
  onPlanComplete,
  onAskHelp 
}: ExecutionPlanProps) {
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [helpQuestion, setHelpQuestion] = useState("");

  const progress = (completedSteps.length / steps.length) * 100;

  const completeStep = (index: number) => {
    if (completedSteps.includes(index)) return;
    
    const newCompleted = [...completedSteps, index];
    setCompletedSteps(newCompleted);
    onStepComplete(index);
    
    // Passer à l'étape suivante
    if (index + 1 < steps.length) {
      setCurrentStep(index + 1);
    } else {
      onPlanComplete();
    }
  };

  const askHelp = () => {
    if (helpQuestion.trim()) {
      onAskHelp(currentStep, helpQuestion);
      setHelpQuestion("");
    }
  };

  return (
    <div className="bg-gradient-to-r from-gold-500/10 to-transparent border border-gold-500/30 rounded-xl overflow-hidden">
      {/* En-tête */}
      <div className="p-4 border-b border-gold-500/20 bg-gold-500/5">
        <h3 className="text-lg font-serif text-gold-500">{title}</h3>
        <div className="flex items-center justify-between mt-2">
          <div className="text-xs text-gray-500">Progression: {Math.round(progress)}%</div>
          <div className="w-32 h-1.5 bg-white/10 rounded-full">
            <div className="h-1.5 bg-gold-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      {/* Liste des étapes */}
      <div className="p-4 space-y-3">
        {steps.map((step, idx) => {
          const isCompleted = completedSteps.includes(idx);
          const isCurrent = idx === currentStep && !isCompleted;
          
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
                  onClick={() => completeStep(idx)}
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
                  <div className="flex gap-2">
                    <button
                      onClick={() => setHelpQuestion("Je veux plus de détails sur cette étape")}
                      className="text-xs text-gold-500 hover:underline"
                    >
                      ❓ Aide
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Zone d'aide contextuelle */}
      {currentStep < steps.length && !completedSteps.includes(currentStep) && (
        <div className="p-3 border-t border-gold-500/20 bg-gold-500/5">
          <div className="flex gap-2">
            <input
              type="text"
              value={helpQuestion}
              onChange={(e) => setHelpQuestion(e.target.value)}
              placeholder="Besoin d'aide sur cette étape ?"
              className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-ivory placeholder:text-gray-500 focus:outline-none focus:border-gold-500"
            />
            <button
              onClick={askHelp}
              disabled={!helpQuestion.trim()}
              className="px-3 py-2 bg-gold-500/20 text-gold-500 rounded-lg text-sm hover:bg-gold-500/30 transition-colors disabled:opacity-50"
            >
              Demander
            </button>
          </div>
        </div>
      )}

      {/* Pied de page motivant */}
      <div className="p-2 text-center border-t border-gold-500/20 bg-gold-500/5">
        <p className="text-[10px] text-gray-500">
          {completedSteps.length === steps.length 
            ? "🎉 Mission accomplie !" 
            : `💡 Étape ${currentStep + 1}/${steps.length}. Une chose à la fois.`}
        </p>
      </div>
    </div>
  );
}
