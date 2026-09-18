"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { playStepSound } from "@/lib/assessment-sound";

interface CenteringBreathProps {
  onComplete: () => void;
}

export function CenteringBreath({ onComplete }: CenteringBreathProps) {
  const [phase, setPhase] = useState<"inhale" | "exhale" | "ready">("inhale");

  useEffect(() => {
    // 0s to 2s: inhale
    const t1 = setTimeout(() => {
      setPhase("exhale");
    }, 2000);

    // 2s to 3.8s: exhale
    const t2 = setTimeout(() => {
      setPhase("ready");
    }, 3800);

    // 4.2s: auto complete
    const t3 = setTimeout(() => {
      playStepSound();
      onComplete();
    }, 4400);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.key === "Enter") {
        e.preventDefault();
        playStepSound();
        onComplete();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onComplete]);

  return (
    <div className="w-full max-w-md mx-auto text-center space-y-8 py-6">
      {/* Visual Breathing Orb */}
      <div className="relative h-44 w-44 mx-auto flex items-center justify-center">
        {/* Outer Ripple Wave */}
        <motion.div
          animate={{
            scale: phase === "inhale" ? [1, 1.45] : [1.45, 1],
            opacity: phase === "inhale" ? [0.2, 0.6] : [0.6, 0.2],
          }}
          transition={{ duration: 2, ease: "easeInOut" }}
          className="absolute inset-0 rounded-full border border-primary/30 bg-primary/5 filter blur-xs"
        />

        {/* Middle Pulse Ring */}
        <motion.div
          animate={{
            scale: phase === "inhale" ? [0.9, 1.25] : [1.25, 0.9],
            opacity: phase === "inhale" ? [0.35, 0.75] : [0.75, 0.35],
          }}
          transition={{ duration: 2, ease: "easeInOut" }}
          className="absolute inset-4 rounded-full border-2 border-primary/40 bg-gradient-to-tr from-primary/15 via-sky-400/10 to-transparent"
        />

        {/* Inner Breathing Core */}
        <motion.div
          animate={{
            scale: phase === "inhale" ? [0.75, 1.15] : [1.15, 0.75],
            opacity: phase === "inhale" ? [0.6, 0.95] : [0.95, 0.6],
          }}
          transition={{ duration: 2, ease: "easeInOut" }}
          className="relative h-20 w-20 rounded-full bg-primary/25 backdrop-blur-md flex items-center justify-center shadow-inner border border-primary/40"
        >
          {/* Subtle center glowing droplet */}
          <motion.div
            animate={{
              scale: phase === "inhale" ? [0.8, 1.3] : [1.3, 0.8],
            }}
            transition={{ duration: 2, ease: "easeInOut" }}
            className="h-4 w-4 rounded-full bg-primary shadow-sm shadow-primary/50"
          />
        </motion.div>
      </div>

      <div className="space-y-2">
        <motion.h3
          key={phase}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xl font-semibold tracking-tight text-foreground"
        >
          {phase === "inhale" && "Take a gentle breath in..."}
          {phase === "exhale" && "Release... and soften your shoulders."}
          {phase === "ready" && "You are ready."}
        </motion.h3>

        <p className="text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
          No scores, no timer stress. Just an honest reflection of your everyday rhythm.
        </p>
      </div>

      <div className="pt-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            playStepSound();
            onComplete();
          }}
          className="text-xs text-muted-foreground hover:text-foreground border-border/80"
        >
          Skip & Start Now <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
        </Button>
        <span className="block text-[10px] text-muted-foreground/60 font-mono mt-1.5">
          Press Spacebar to jump in
        </span>
      </div>
    </div>
  );
}
