"use client";

import { motion } from "framer-motion";
import { Palette, Leaf, Wind, Sun } from "lucide-react";
import { useState } from "react";
import {
  useAssessmentTheme,
  ASSESSMENT_THEMES,
  type AssessmentThemeId,
} from "@/lib/assessment-theme";

function ThemeIconRender({ id, className = "h-3.5 w-3.5" }: { id: AssessmentThemeId; className?: string }) {
  if (id === "duo-green") return <Leaf className={`${className} text-[#58cc02]`} />;
  if (id === "spark-blue") return <Wind className={`${className} text-[#1cb0f6]`} />;
  if (id === "sunny-amber") return <Sun className={`${className} text-[#ff9600]`} />;
  return <Leaf className={`${className} text-[#58cc02]`} />;
}

export function ThemeSelectorPill() {
  const { currentThemeId, setThemeId } = useAssessmentTheme();
  const [open, setOpen] = useState(false);
  const activeConfig = ASSESSMENT_THEMES[currentThemeId] || ASSESSMENT_THEMES["duo-green"];

  return (
    <div className="relative inline-block text-left z-30">
      <motion.button
        type="button"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 border-b-3 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-xs cursor-pointer hover:border-slate-400 active:border-b-2 active:translate-y-[1px] transition-all"
        title="Change Playful Assessment Theme"
      >
        <ThemeIconRender id={activeConfig.id} className="h-3.5 w-3.5 shrink-0" />
        <span className="hidden sm:inline font-mono">{activeConfig.name}</span>
        <Palette className="h-3 w-3 text-muted-foreground ml-0.5" />
      </motion.button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.95 }}
            className="absolute right-0 mt-2 w-48 rounded-2xl border-2 border-b-4 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 shadow-xl z-50 space-y-1"
          >
            <div className="px-2 py-1 text-[10px] font-mono font-bold tracking-wider uppercase text-muted-foreground">
              Theme Palette
            </div>
            {Object.values(ASSESSMENT_THEMES).map((theme) => {
              const isSelected = theme.id === currentThemeId;
              return (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => {
                    setThemeId(theme.id);
                    setOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-semibold cursor-pointer border-2 transition-all ${
                    isSelected
                      ? "border-primary bg-primary/10 text-primary border-b-3 font-bold"
                      : "border-transparent text-foreground hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <ThemeIconRender id={theme.id} className="h-3.5 w-3.5 shrink-0" />
                    <span>{theme.name}</span>
                  </div>
                  <span
                    className="h-3.5 w-3.5 rounded-full border border-black/10 shrink-0"
                    style={{ backgroundColor: theme.primary }}
                  />
                </button>
              );
            })}
          </motion.div>
        </>
      )}
    </div>
  );
}
