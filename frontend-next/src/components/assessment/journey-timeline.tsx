"use client";

import { motion } from "framer-motion";
import { Volume2, VolumeX, Check, Compass, Award, BookOpen, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSoundEnabled, setSoundEnabled } from "@/lib/assessment-sound";
import { useState, useEffect } from "react";

import { useAssessmentTheme, ASSESSMENT_THEMES } from "@/lib/assessment-theme";

interface JourneyTimelineProps {
  currentIdx: number;
  totalCount: number;
  currentPhase?: string;
}

const PHASES = [
  { id: "notice", label: "Notice", subtitle: "Be aware of your actions", icon: Compass },
  { id: "reflect", label: "Reflect", subtitle: "Explore what feels true", icon: Layers },
  { id: "takeaway", label: "Takeaway", subtitle: "Insights & next steps", icon: Award },
];

export function JourneyTimeline({ currentIdx, totalCount, currentPhase }: JourneyTimelineProps) {
  const [soundOn, setSoundOn] = useState(false);
  const { currentThemeId } = useAssessmentTheme();
  const theme = ASSESSMENT_THEMES[currentThemeId] || ASSESSMENT_THEMES["duo-green"];

  useEffect(() => {
    setSoundOn(getSoundEnabled());
  }, []);

  const toggleSound = () => {
    const nextState = !soundOn;
    setSoundEnabled(nextState);
    setSoundOn(nextState);
  };

  const progressPercent = totalCount > 0 ? Math.round(((currentIdx + 1) / totalCount) * 100) : 0;
  
  // Phase 1 (Q1-11), Phase 2 (Q12-24), Phase 3 (Q25-32)
  const activePhaseIdx = totalCount > 0 ? (currentIdx < 11 ? 0 : currentIdx < 24 ? 1 : 2) : 0;

  return (
    <div className="w-full space-y-3">
      {/* Top 3-Phase Stepper with Sound Toggle (Duolingo 3D Sticker Pills) */}
      <div className="flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 overflow-x-auto py-1">
          {PHASES.map((p, idx) => {
            const isActive = idx === activePhaseIdx;
            const isDone = idx < activePhaseIdx;
            return (
              <motion.div
                key={p.id}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-2xl text-xs transition-all border-2 border-b-4 ${
                  isActive
                    ? "bg-white dark:bg-slate-900 shadow-sm font-bold active:border-b-2 active:translate-y-[2px]"
                    : isDone
                    ? "bg-[#58cc02]/15 text-[#46a302] dark:text-[#58cc02] border-[#58cc02]/40 border-b-[#46a302] font-semibold"
                    : "text-slate-600 dark:text-slate-300 bg-slate-100/90 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 border-b-slate-300 dark:border-b-slate-700 font-medium"
                }`}
                style={
                  isActive
                    ? {
                        borderColor: theme.primaryDark,
                        borderBottomColor: theme.primaryDark,
                        color: theme.primary,
                      }
                    : {}
                }
              >
                <div
                  className={`h-4 w-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    isDone
                      ? "bg-[#58cc02] text-white"
                      : isActive
                      ? "text-white"
                      : "bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-200"
                  }`}
                  style={isActive ? { backgroundColor: theme.primary } : {}}
                >
                  {isDone ? <Check className="h-2.5 w-2.5" /> : idx + 1}
                </div>
                <span>{p.label}</span>
              </motion.div>
            );
          })}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            type="button"
            onClick={toggleSound}
            className="h-8 px-2.5 text-xs text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white cursor-pointer rounded-xl border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white/70 dark:bg-slate-900/80 font-semibold"
            title={soundOn ? "Mute soothing sound" : "Enable soothing chime feedback"}
          >
            {soundOn ? (
              <Volume2 className="h-3.5 w-3.5 text-primary" />
            ) : (
              <VolumeX className="h-3.5 w-3.5 opacity-60" />
            )}
            <span className="hidden sm:inline ml-1.5 text-[11px] font-medium">
              {soundOn ? "Sound On" : "Sound Off"}
            </span>
          </Button>
        </div>
      </div>

      {/* Duolingo Capsule Progress Bar with Top Gloss Reflection */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-center text-[11px] font-bold text-slate-800 dark:text-slate-100">
          <span className="tracking-wide">Question {currentIdx + 1} of {totalCount}</span>
          <span className="font-mono text-primary dark:text-[#58cc02] bg-primary/10 dark:bg-[#58cc02]/20 px-2.5 py-0.5 rounded-full border border-primary/20 dark:border-[#58cc02]/30 font-bold">
            {progressPercent}% Complete
          </span>
        </div>
        <div className="h-3.5 sm:h-4 w-full bg-slate-200/90 dark:bg-slate-900 rounded-full p-0.5 border-2 border-slate-300/80 dark:border-slate-800 shadow-inner overflow-hidden">
          <motion.div
            className="h-full rounded-full relative overflow-hidden shadow-xs transition-all"
            style={{
              backgroundColor: theme.primary,
              width: `${Math.max(4, progressPercent)}%`,
            }}
            animate={{ width: `${Math.max(4, progressPercent)}%` }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
          >
            {/* Gloss reflection line across top half (Duolingo signature shine) */}
            <div className="absolute top-0.5 left-2 right-2 h-1 bg-white/45 rounded-full" />
          </motion.div>
        </div>
      </div>
    </div>
  );
}
