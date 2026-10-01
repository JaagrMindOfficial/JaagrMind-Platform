"use client";

import { motion } from "framer-motion";
import { Volume2, VolumeX } from "lucide-react";
import { getSoundEnabled, setSoundEnabled } from "@/lib/assessment-sound";
import { useState, useEffect } from "react";
import { useAssessmentTheme, ASSESSMENT_THEMES } from "@/lib/assessment-theme";

interface JourneyTimelineProps {
  currentIdx: number;
  totalCount: number;
  currentPhase?: string;
}

export function JourneyTimeline({ currentIdx, totalCount }: JourneyTimelineProps) {
  const [soundOn, setSoundOn] = useState(false);
  const { currentThemeId } = useAssessmentTheme();
  const theme = ASSESSMENT_THEMES[currentThemeId] || ASSESSMENT_THEMES["jm-signature"];

  useEffect(() => {
    setSoundOn(getSoundEnabled());
  }, []);

  const toggleSound = () => {
    const nextState = !soundOn;
    setSoundEnabled(nextState);
    setSoundOn(nextState);
  };

  const progressPercent = totalCount > 0 ? Math.round(((currentIdx + 1) / totalCount) * 100) : 0;

  return (
    <div className="w-full max-w-2xl mx-auto space-y-1.5 mb-2.5 sm:mb-3 select-none">
      {/* Top Labels: "Question X of Y" on left, "Z%" and sound on right */}
      <div className="flex items-center justify-between text-xs sm:text-sm font-medium">
        <span className={theme.id === "jm-crayon" ? "font-semibold text-[#1E3A2F] dark:text-emerald-300 text-xs sm:text-sm" : "font-semibold text-slate-700 dark:text-slate-200"}>
          Question {currentIdx + 1} of {totalCount}
        </span>
        <div className="flex items-center gap-2.5">
          <span className={theme.id === "jm-crayon" ? "font-semibold text-[#1E3A2F] dark:text-emerald-300 text-xs sm:text-sm" : "font-semibold text-slate-700 dark:text-slate-200"}>
            {progressPercent}%
          </span>
          <button
            type="button"
            onClick={toggleSound}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1 rounded-md"
            title={soundOn ? "Sound On (Click to mute)" : "Sound Off (Click to unmute)"}
            aria-label="Toggle assessment sound"
          >
            {soundOn ? (
              <Volume2 className="h-3.5 w-3.5 text-slate-600 dark:text-slate-300" />
            ) : (
              <VolumeX className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
            )}
          </button>
        </div>
      </div>

      {/* 3D Glass Score Progress Bar matching reference screenshot */}
      <div
        className="h-3.5 sm:h-4 w-full rounded-full p-[2px] overflow-hidden transition-all shadow-inner border border-slate-200/90 dark:border-slate-800 bg-[#E5E9EC] dark:bg-slate-800/90"
        style={{
          backgroundColor: theme.progressBarTrack || "#E5E9EC",
        }}
        role="progressbar"
        aria-valuenow={progressPercent}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <motion.div
          className="h-full rounded-full relative flex items-center overflow-hidden transition-all shadow-xs"
          style={{
            backgroundColor: theme.progressBarColor || theme.primary || "#1A5D3F",
            width: `${Math.max(4, progressPercent)}%`,
          }}
          initial={false}
          animate={{ width: `${Math.max(4, progressPercent)}%` }}
          transition={{ duration: 0.35, ease: "easeOut" }}
        >
          {/* White Glass Shine Pill inside score bar */}
          <div
            className="w-full mx-1.5 sm:mx-2 h-[4px] sm:h-[4.5px] rounded-full bg-white/45 dark:bg-white/40 shadow-[0_1px_1px_rgba(255,255,255,0.4)]"
          />
        </motion.div>
      </div>
    </div>
  );
}
