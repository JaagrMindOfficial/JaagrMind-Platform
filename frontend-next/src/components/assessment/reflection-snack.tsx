"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { Sparkles, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { playStepSound } from "@/lib/assessment-sound";

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
      className="w-full max-w-xl mx-auto"
    >
      <Card className="border shadow-md text-center p-6 sm:p-10 bg-card">
        <CardContent className="space-y-6">
          <div className="h-14 w-14 rounded-2xl bg-primary/10 text-primary mx-auto flex items-center justify-center shadow-inner">
            <Sparkles className="h-7 w-7" />
          </div>

          <div className="space-y-3">
            <span className="text-xs font-mono font-semibold uppercase tracking-widest text-primary bg-primary/10 px-2.5 py-0.5 rounded-full">
              {title}
            </span>
            <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
              Take a breath. You're doing great.
            </h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed border-l-2 border-primary/40 pl-3.5 py-1 text-left bg-muted/20 rounded-r-lg italic">
              "{chosenInsight}"
            </p>
          </div>

          <div className="pt-2">
            <Button
              size="lg"
              onClick={() => {
                playStepSound();
                onContinue();
              }}
              className="px-8 shadow-sm gap-2"
            >
              Continue Journey <ArrowRight className="h-4 w-4" />
            </Button>
            <span className="block text-[10px] text-muted-foreground/60 font-mono mt-2">
              Press Spacebar or Enter to continue
            </span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
