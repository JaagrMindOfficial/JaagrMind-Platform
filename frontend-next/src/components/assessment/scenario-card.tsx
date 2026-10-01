"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  AlertCircle,
  MessageSquare,
  Check,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { playSelectSound, playStepSound } from "@/lib/assessment-sound";
import { useAssessmentTheme, ASSESSMENT_THEMES } from "@/lib/assessment-theme";

export interface ScenarioQuestion {
  text: string;
  phase?: string;
  category?: string;
  section?: string;
  sectionName?: string;
  options?: Array<{ label: string; marks?: number; score?: number }>;
}

interface ScenarioCardProps {
  question: ScenarioQuestion;
  questionIndex: number;
  totalQuestions: number;
  selectedIndex?: number;
  onSelectOption: (optionIndex: number) => void;
  onNext: () => void;
  onPrev: () => void;
  isLastQuestion: boolean;
  isSubmitting?: boolean;
  errorMessage?: string;
}

const OPTION_KEYS = ["1", "2", "3", "4", "5"];
const OPTION_LETTERS = ["A", "B", "C", "D", "E"];

export function ScenarioCard({
  question,
  questionIndex,
  totalQuestions,
  selectedIndex,
  onSelectOption,
  onNext,
  onPrev,
  isLastQuestion,
  isSubmitting,
  errorMessage,
}: ScenarioCardProps) {
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [noteText, setNoteText] = useState("");

  const { currentThemeId } = useAssessmentTheme();
  const theme = ASSESSMENT_THEMES[currentThemeId] || ASSESSMENT_THEMES["jm-signature"];

  // Default options match the exact 5-point wellness scale shown in the screenshot
  const options =
    question.options && question.options.length > 0
      ? question.options
      : [
          { label: "Never", marks: 1 },
          { label: "Rarely", marks: 2 },
          { label: "Sometimes", marks: 3 },
          { label: "Often", marks: 4 },
          { label: "Almost always", marks: 5 },
        ];

  // Keyboard shortcut listener for swift, accessible navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      ) {
        return;
      }

      const key = e.key.toUpperCase();
      let pickedIdx = -1;

      if (key === "1" || key === "A") pickedIdx = 0;
      else if (key === "2" || key === "B") pickedIdx = 1;
      else if (key === "3" || key === "C") pickedIdx = 2;
      else if (key === "4" || key === "D") pickedIdx = 3;
      else if (key === "5" || key === "E") pickedIdx = 4;

      if (pickedIdx >= 0 && pickedIdx < options.length) {
        e.preventDefault();
        playSelectSound(pickedIdx);
        onSelectOption(pickedIdx);
        return;
      }

      if (isSubmitting) return;

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (questionIndex > 0) {
          playStepSound();
          onPrev();
        }
      } else if (e.key === "ArrowRight" || e.key === "Enter") {
        if (selectedIndex !== undefined) {
          e.preventDefault();
          playStepSound();
          onNext();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [options.length, onSelectOption, onNext, onPrev, questionIndex, selectedIndex, isSubmitting]);

  const handleOptionClick = (idx: number) => {
    playSelectSound(idx);
    onSelectOption(idx);
  };

  return (
    <motion.div
      key={questionIndex}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="w-full max-w-2xl mx-auto"
    >
      {/* Pristine modern white card matching reference screenshot */}
      <Card
        id="assessment-main-card"
        data-assessment-main-card="true"
        data-assessment-card="true"
        className={`px-5 sm:px-8 py-4 sm:py-5.5 overflow-hidden transition-all text-left ${
          theme.id === "jm-crayon"
            ? "rounded-[24px] sm:rounded-[28px] border border-[#E8E2D5] dark:border-slate-800 bg-[#FCFBF8]/95 dark:bg-[#15201A]/95 shadow-[0_12px_40px_rgba(30,45,35,0.06)] dark:shadow-none"
            : "rounded-2xl sm:rounded-3xl border border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-900 shadow-[0_4px_24px_rgba(0,0,0,0.03)] dark:shadow-none"
        }`}
      >
        {/* Question Index Badge & Sparkle */}
        {theme.id === "jm-crayon" ? (
          <div className="flex items-center justify-between mb-2 sm:mb-2.5 select-none">
            <div className="flex items-center gap-2 text-sm sm:text-base font-bold text-[#1A5D3F] dark:text-emerald-400">
              <span>{String(questionIndex + 1).padStart(2, "0")}</span>
              <span className="w-5 h-[2px] bg-[#1A5D3F] dark:bg-emerald-400 rounded-full inline-block" />
            </div>
            {/* 3 Playful Yellow Crayon Sunbeams / Sparkle */}
            <div className="text-amber-400 shrink-0">
              <svg width="26" height="26" viewBox="0 0 34 34" fill="none">
                <path d="M6 22 L16 16" stroke="#F5A623" strokeWidth="2.8" strokeLinecap="round" />
                <path d="M12 10 L20 12" stroke="#F8C846" strokeWidth="3" strokeLinecap="round" />
                <path d="M22 6 L22 16" stroke="#F5A623" strokeWidth="2.8" strokeLinecap="round" />
              </svg>
            </div>
          </div>
        ) : theme.id === "jm-serene" ? (
          <div className="flex items-center gap-2 mb-2 text-xs sm:text-sm font-semibold select-none text-[#205A44] dark:text-emerald-400">
            <span>{String(questionIndex + 1).padStart(2, "0")}</span>
            <span className="w-5 h-[2px] bg-[#205A44] dark:bg-emerald-400 rounded-full inline-block" />
          </div>
        ) : null}

        {/* Question Statement */}
        <div className="mb-3 sm:mb-4">
          <h2 className="text-lg sm:text-[20px] font-bold tracking-tight text-slate-900 dark:text-slate-50 leading-snug">
            {question.text}
          </h2>
        </div>

        {/* Vertical Options Stack with 3D Buttony Feel */}
        <div className="space-y-2 sm:space-y-2.5" role="radiogroup" aria-label={question.text}>
          {options.map((opt, index) => {
            const isSelected = selectedIndex === index;

            return (
              <button
                key={index}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => handleOptionClick(index)}
                className={`w-full flex items-center gap-3 sm:gap-3.5 px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl sm:rounded-full text-left cursor-pointer group select-none transition-all duration-150 ${
                  isSelected
                    ? "bg-white dark:bg-slate-900 border-2 border-b-[5px] shadow-sm -translate-y-0.5"
                    : "bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 border-b-[4px] border-b-slate-300 dark:border-b-slate-700/80 hover:border-slate-300 dark:hover:border-slate-700 hover:border-b-slate-400 dark:hover:border-b-slate-600 hover:bg-slate-50/60 dark:hover:bg-slate-800/40"
                } active:translate-y-[2px] active:border-b-2`}
                style={
                  isSelected
                    ? {
                        borderColor: theme.primary || "#1A5D3F",
                        borderBottomColor: theme.primaryDark || "#11402B",
                        backgroundColor: theme.id === "jm-crayon" ? "#F5FBF7" : undefined,
                      }
                    : undefined
                }
              >
                {/* 3D Buttony Indicator Circle (no number, just buttony tactile icon) */}
                <div
                  className={`w-6 h-6 rounded-full shrink-0 flex items-center justify-center transition-all ${
                    isSelected
                      ? "shadow-xs"
                      : "border-2 border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/70 group-hover:border-slate-400"
                  }`}
                  style={{
                    backgroundColor: isSelected ? theme.primary || "#1A5D3F" : undefined,
                  }}
                >
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    >
                      <Check className="h-3.5 w-3.5 text-white stroke-[3]" />
                    </motion.div>
                  )}
                </div>

                {/* Option Text */}
                <span
                  className={`text-sm sm:text-base tracking-tight transition-colors ${
                    isSelected
                      ? "font-bold"
                      : "font-semibold text-slate-700 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white"
                  }`}
                  style={{
                    color: isSelected ? theme.primary || "#1A5D3F" : undefined,
                  }}
                >
                  {opt.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Optional Context Note Toggle */}
        <div className="pt-3">
          {!showNoteInput && !noteText ? (
            <button
              type="button"
              onClick={() => setShowNoteInput(true)}
              className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span>Add an optional reflection note</span>
            </button>
          ) : (
            <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/60 space-y-2 mt-2">
              <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                <span className="flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5 text-[#0B4F48] dark:text-emerald-400" />
                  Personal Note (Optional)
                </span>
                <button
                  type="button"
                  onClick={() => setShowNoteInput(false)}
                  className="text-slate-400 hover:text-slate-600 text-xs"
                >
                  Close
                </button>
              </div>
              <textarea
                rows={2}
                placeholder="Jot down a quick personal thought or context..."
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-[#0B4F48] text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
              />
            </div>
          )}
        </div>

        {/* Error notification if submission failed */}
        {errorMessage && (
          <div className="mt-4 p-3 text-xs bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 rounded-xl border border-rose-200 dark:border-rose-900 flex items-center gap-2 font-medium">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Bottom Navigation matching screenshot */}
        <div className="mt-3.5 sm:mt-4 pt-3 sm:pt-3.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
          {/* Previous Button (Clean 3D Buttony Outline) */}
          <button
            type="button"
            disabled={questionIndex === 0 || isSubmitting}
            onClick={() => {
              playStepSound();
              onPrev();
            }}
            className="px-5 sm:px-6 h-9 sm:h-10 rounded-xl sm:rounded-full border-2 border-slate-300 dark:border-slate-700 border-b-[4px] border-b-slate-400 dark:border-b-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-400 text-xs sm:text-sm font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed select-none active:translate-y-[2px] active:border-b-2"
          >
            <ArrowLeft className="h-3.5 w-3.5 stroke-[2.5]" />
            <span>Previous</span>
          </button>

          {/* Next / Submit Button (Rich Solid 3D Buttony Fill) */}
          {isLastQuestion ? (
            <button
              type="button"
              disabled={selectedIndex === undefined || isSubmitting}
              onClick={() => {
                playStepSound();
                onNext();
              }}
              style={{
                backgroundColor: theme.primary || "#0B4F48",
                borderBottomColor: theme.primaryDark || "#083E38",
              }}
              className="px-7 sm:px-9 h-9 sm:h-10 rounded-xl sm:rounded-full border-b-[5px] text-white text-xs sm:text-sm font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed select-none hover:brightness-105 active:translate-y-[2px] active:border-b-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <span>Submit</span>
                  <ArrowRight className="h-3.5 w-3.5 stroke-[2.5]" />
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              disabled={selectedIndex === undefined || isSubmitting}
              onClick={() => {
                playStepSound();
                onNext();
              }}
              style={{
                backgroundColor: theme.primary || "#0B4F48",
                borderBottomColor: theme.primaryDark || "#083E38",
              }}
              className="px-7 sm:px-9 h-9 sm:h-10 rounded-xl sm:rounded-full border-b-[5px] text-white text-xs sm:text-sm font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed select-none hover:brightness-105 active:translate-y-[2px] active:border-b-2"
            >
              <span>Next</span>
              <ArrowRight className="h-3.5 w-3.5 stroke-[2.5]" />
            </button>
          )}
        </div>
      </Card>
    </motion.div>
  );
}
