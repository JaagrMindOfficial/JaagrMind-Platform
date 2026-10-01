"use client";

import { motion } from "framer-motion";
import { Palette, Check } from "lucide-react";
import { useState } from "react";
import {
  useAssessmentTheme,
  ASSESSMENT_THEMES,
  ADMIN_AVAILABLE_THEMES,
} from "@/lib/assessment-theme";

export function ThemeSelectorPill() {
  const { currentThemeId, setThemeId } = useAssessmentTheme();
  const [open, setOpen] = useState(false);
  const activeConfig = ASSESSMENT_THEMES[currentThemeId] || ASSESSMENT_THEMES["jm-signature"];

  return (
    <div className="relative inline-block text-left z-30">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900/90 text-xs font-medium text-slate-700 dark:text-slate-200 shadow-xs cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
        title="Change Theme Palette"
      >
        <span
          className="h-2.5 w-2.5 rounded-full shrink-0"
          style={{ backgroundColor: activeConfig.primary }}
        />
        <span className="hidden sm:inline font-medium">{activeConfig.name}</span>
        <Palette className="h-3 w-3 text-slate-400 ml-0.5" />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
            className="absolute right-0 mt-2 w-48 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1.5 shadow-xl z-50 space-y-1"
          >
            <div className="px-2.5 py-1 text-[10px] font-semibold tracking-wider uppercase text-slate-400">
              Theme Palette
            </div>
            {ADMIN_AVAILABLE_THEMES.map((th) => {
              const isSelected = th.id === currentThemeId;
              return (
                <button
                  key={th.id}
                  type="button"
                  onClick={() => {
                    setThemeId(th.id);
                    setOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
                      : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: th.primary }}
                    />
                    <span>{th.name}</span>
                  </div>
                  {isSelected && <Check className="h-3.5 w-3.5 text-slate-500" />}
                </button>
              );
            })}
          </motion.div>
        </>
      )}
    </div>
  );
}
