"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, Volume2, Heart, Sparkles, Settings, Check } from "lucide-react";
import { playStepSound, playSelectSound } from "@/lib/assessment-sound";
import { useAssessmentTheme } from "@/lib/assessment-theme";

interface CenteringBreathProps {
  onComplete: () => void;
}

const groundingActions = [
  {
    id: "see",
    label: "See one thing.",
    cue: "Look around your space and notice any object, shape, or light.",
    icon: Eye,
    activeColor: "text-emerald-600 dark:text-emerald-400",
    bgActive: "bg-emerald-500/10 border-emerald-500/40 text-emerald-900 dark:text-emerald-200",
    ringColor: "border-emerald-500/30",
  },
  {
    id: "hear",
    label: "Hear one thing.",
    cue: "Listen for a nearby sound, gentle hum, or the room's quiet.",
    icon: Volume2,
    activeColor: "text-sky-600 dark:text-sky-400",
    bgActive: "bg-sky-500/10 border-sky-500/40 text-sky-900 dark:text-sky-200",
    ringColor: "border-sky-500/30",
  },
  {
    id: "feel",
    label: "Feel one thing.",
    cue: "Notice the chair supporting you, your feet, or your natural breath.",
    icon: Heart,
    activeColor: "text-rose-500 dark:text-rose-400",
    bgActive: "bg-rose-500/10 border-rose-500/40 text-rose-900 dark:text-rose-200",
    ringColor: "border-rose-500/30",
  },
  {
    id: "done",
    label: "That’s it.",
    cue: "You’ve arrived in this moment. Steady, grounded, and ready.",
    icon: Sparkles,
    activeColor: "text-amber-500 dark:text-amber-400",
    bgActive: "bg-amber-500/10 border-amber-500/40 text-amber-900 dark:text-amber-200",
    ringColor: "border-amber-500/30",
  },
];

export function CenteringBreath({ onComplete }: CenteringBreathProps) {
  const { theme } = useAssessmentTheme();
  // Stage: "lookAround" (Screen 5) | "transition" (Screen 6)
  const [stage, setStage] = useState<"lookAround" | "transition">("lookAround");
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    if (stage !== "lookAround") return;

    // Smoothly step through the 4 actions across ~10 seconds
    const t1 = setTimeout(() => setActiveIdx(1), 2500);
    const t2 = setTimeout(() => setActiveIdx(2), 5200);
    const t3 = setTimeout(() => setActiveIdx(3), 7800);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.key === "Enter") {
        e.preventDefault();
        playStepSound();
        if (stage === "lookAround") {
          setStage("transition");
        } else {
          onComplete();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [stage, onComplete]);

  return (
    <div className="w-full max-w-md mx-auto text-center select-none py-1">
      <AnimatePresence mode="wait">
        {/* ─────────────────────────────────────────────────────────────
            SCREEN 5: Look Around | 10-Second Grounding
        ────────────────────────────────────────────────────────────── */}
        {stage === "lookAround" && (
          <motion.div
            key="screen-5-grounding"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.25 }}
            className="space-y-4"
          >
            {/* Header Badge & Title */}
            <div className="space-y-1">
              <span className="text-[10px] sm:text-[11px] font-mono font-bold tracking-wider uppercase text-primary inline-flex items-center gap-1.5">
                <Settings className="h-3 w-3" />
                <span>BEFORE WE JUMP IN…</span>
              </span>
              <h2 className="text-base sm:text-lg font-bold text-foreground tracking-tight">
                Look up from your screen for a second.
              </h2>
            </div>

            {/* 4 Grounding Actions Stack with Rich Micro-Animations */}
            <div className="space-y-2 text-left">
              {groundingActions.map((action, index) => {
                const Icon = action.icon;
                const isActive = activeIdx === index;
                const isPast = activeIdx > index;

                return (
                  <motion.div
                    key={action.id}
                    onClick={() => {
                      playSelectSound(index);
                      setActiveIdx(index);
                    }}
                    animate={{
                      scale: isActive ? 1.015 : 1,
                      opacity: isActive ? 1 : isPast ? 0.85 : 0.6,
                    }}
                    className={`p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border transition-all cursor-pointer relative overflow-hidden flex items-center justify-between ${
                      isActive
                        ? `${action.bgActive} shadow-xs ring-1 ring-primary/20`
                        : "border-border/70 bg-card/60 hover:bg-card/90 text-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {/* Animated Icon Container */}
                      <div className="relative h-8 w-8 rounded-xl bg-background/80 border border-border/60 shrink-0 flex items-center justify-center">
                        {/* Action 1 Specific Animation: Expanding Vision Radar / Iris Pulse */}
                        {action.id === "see" && isActive && (
                          <motion.span
                            animate={{
                              scale: [1, 1.45, 1],
                              opacity: [0.6, 0.1, 0.6],
                            }}
                            transition={{
                              duration: 2.2,
                              repeat: Infinity,
                              ease: "easeInOut",
                            }}
                            className="absolute inset-0 rounded-xl border-2 border-emerald-500/50 pointer-events-none"
                          />
                        )}

                        {/* Action 2 Specific Animation: Concentric Sound Wave Acoustic Ripple */}
                        {action.id === "hear" && isActive && (
                          <motion.span
                            animate={{
                              scale: [0.9, 1.5],
                              opacity: [0.75, 0],
                            }}
                            transition={{
                              duration: 1.8,
                              repeat: Infinity,
                              ease: "easeOut",
                            }}
                            className="absolute inset-0 rounded-xl border border-sky-500/60 pointer-events-none"
                          />
                        )}

                        {/* Action 3 Specific Animation: Warm Grounding Heartbeat Rhythm */}
                        {action.id === "feel" && isActive && (
                          <motion.span
                            animate={{
                              scale: [1, 1.15, 1, 1.1, 1],
                              opacity: [0.5, 0.9, 0.5],
                            }}
                            transition={{
                              duration: 1.9,
                              repeat: Infinity,
                              ease: "easeInOut",
                            }}
                            className="absolute inset-0 rounded-xl border border-rose-500/50 bg-rose-500/10 pointer-events-none"
                          />
                        )}

                        {/* Action 4 Specific Animation: Soft Twinkling Sparkle Shimmer */}
                        {action.id === "done" && isActive && (
                          <motion.span
                            animate={{
                              rotate: [0, 18, -18, 0],
                              scale: [1, 1.15, 1],
                            }}
                            transition={{
                              duration: 2.2,
                              repeat: Infinity,
                              ease: "easeInOut",
                            }}
                            className="absolute inset-0 rounded-xl border border-amber-500/50 bg-amber-500/10 pointer-events-none"
                          />
                        )}

                        <Icon className={`h-4 w-4 ${isActive ? action.activeColor : "text-muted-foreground"}`} />
                      </div>

                      {/* Action Copy */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs sm:text-sm font-bold tracking-tight text-foreground">
                            {action.label}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground leading-tight truncate">
                          {action.cue}
                        </p>
                      </div>
                    </div>

                    {/* Checkmark or Active Indicator */}
                    <div className="shrink-0 ml-2">
                      {isPast ? (
                        <div className="h-5 w-5 rounded-full bg-primary/20 text-primary flex items-center justify-center">
                          <Check className="h-3 w-3 stroke-[3]" />
                        </div>
                      ) : isActive ? (
                        <motion.div
                          animate={{ scale: [0.9, 1.15, 0.9] }}
                          transition={{ duration: 1.6, repeat: Infinity }}
                          className="h-2.5 w-2.5 rounded-full bg-primary"
                        />
                      ) : (
                        <div className="h-2 w-2 rounded-full bg-border" />
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* CTA Button: I'M READY → */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => {
                  playStepSound();
                  setStage("transition");
                }}
                style={{
                  backgroundColor: theme.primary || "#0B4F48",
                  borderBottomColor: theme.primaryDark || "#083E38",
                }}
                className="w-full h-10 px-6 rounded-xl sm:rounded-full border-b-[5px] text-white font-bold text-xs sm:text-sm active:translate-y-[2px] active:border-b-2 hover:brightness-105 transition-all cursor-pointer shadow-xs select-none"
              >
                I&apos;M READY →
              </button>
            </div>
          </motion.div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            SCREEN 6: Transition to Assessment
        ────────────────────────────────────────────────────────────── */}
        {stage === "transition" && (
          <motion.div
            key="screen-6-transition"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.25 }}
            className="space-y-4 py-2"
          >
            {/* Clean Transition Heading */}
            <div className="space-y-1">
              <h2 className="text-lg sm:text-xl font-bold text-foreground tracking-tight">
                Nothing to fix. Nothing to change.
              </h2>
              <p className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">
                Just notice where you’re starting from.
              </p>
            </div>

            {/* Supporting Text Card */}
            <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/80 text-xs text-muted-foreground leading-relaxed max-w-sm mx-auto">
              The next few questions are just about you. There are no right or wrong answers.
            </div>

            {/* CTA: READY? LET’S GO → */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  playStepSound();
                  onComplete();
                }}
                style={{
                  backgroundColor: theme.primary || "#0B4F48",
                  borderBottomColor: theme.primaryDark || "#083E38",
                }}
                className="w-full h-11 px-8 rounded-xl sm:rounded-full border-b-[5px] text-white font-bold text-sm active:translate-y-[2px] active:border-b-2 hover:brightness-105 transition-all cursor-pointer shadow-xs select-none"
              >
                READY? LET’S GO →
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
