"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { playStepSound } from "@/lib/assessment-sound";
import { useAssessmentTheme } from "@/lib/assessment-theme";

interface ReflectionSnackProps {
  onContinue: () => void;
  title?: string;
  insight?: string;
}

const DEFAULT_INSIGHTS = [
  "Notice: Over 70% of students say starting the first 5 minutes of tough study is where almost all friction lives. Once you begin, friction drops significantly.",
  "In morning assembly and busy corridors, almost everyone looks confident on the outside. Underneath, nearly every student is just waking up and finding their rhythm.",
  "Making a mistake on the blackboard or a quiz isn't a sign of inability — it's the exact moment your brain rewires and strengthens its connections.",
];

export function ReflectionSnack({
  onContinue,
  title = "Halfway Checkpoint",
  insight,
}: ReflectionSnackProps) {
  const { theme } = useAssessmentTheme();
  const chosenInsight = insight || DEFAULT_INSIGHTS[0];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.key === "Enter") {
        e.preventDefault();
        playStepSound();
        onContinue();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onContinue]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      className="w-full max-w-2xl mx-auto"
    >
      <Card data-assessment-card="true" className="border shadow-md text-center p-6 sm:p-10 bg-card">
        <CardContent className="space-y-6">
          <div className="h-14 w-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 mx-auto flex items-center justify-center p-3 shadow-xs">
            <img src="/JM-Dark.svg" alt="JaagrMind" className="h-full w-auto object-contain dark:hidden" />
            <img src="/JM-White.svg" alt="JaagrMind" className="h-full w-auto object-contain hidden dark:block" />
          </div>

          <div className="space-y-3">
            <span className="text-xs font-mono font-semibold uppercase tracking-widest text-primary bg-primary/10 px-2.5 py-0.5 rounded-full">
              {title}
            </span>
            <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
              Take a breath. You're doing great.
            </h2>
            <p className="text-sm text-slate-700 dark:text-slate-200 max-w-md mx-auto leading-relaxed border-l-2 border-primary/40 pl-3.5 py-1 text-left bg-muted/40 rounded-r-lg italic">
              "{chosenInsight}"
            </p>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={() => {
                playStepSound();
                onContinue();
              }}
              style={{
                backgroundColor: theme.primary || "#0B4F48",
                borderBottomColor: theme.primaryDark || "#083E38",
              }}
              className="px-8 sm:px-10 py-3 rounded-xl sm:rounded-full border-b-[5px] text-white font-bold text-sm sm:text-base shadow-xs inline-flex items-center gap-2 active:translate-y-[2px] active:border-b-2 hover:brightness-105 transition-all cursor-pointer select-none"
            >
              <span>Continue Journey</span>
              <ArrowRight className="h-4 w-4 stroke-[2.5]" />
            </button>
            <span className="block text-[10px] text-slate-600 dark:text-slate-300 font-mono mt-2 font-medium">
              Press Spacebar or Enter to continue
            </span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
