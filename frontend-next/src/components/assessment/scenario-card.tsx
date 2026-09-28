"use client";

import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Loader2,
  AlertCircle,
  Lightbulb,
  Target,
  Users,
  Smartphone,
  MessageSquare,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

const OPTION_LETTERS = ["A", "B", "C", "D"];
const OPTION_NUMBERS = ["1", "2", "3", "4"];

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
  const [pressedKey, setPressedKey] = useState<string | null>(null);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [noteText, setNoteText] = useState("");

  const { currentThemeId } = useAssessmentTheme();
  const theme = ASSESSMENT_THEMES[currentThemeId] || ASSESSMENT_THEMES["duo-green"];

  const options =
    question.options && question.options.length > 0
      ? question.options
      : [
          { label: "Not like me", marks: 1 },
          { label: "A little like me", marks: 2 },
          { label: "Quite like me", marks: 3 },
          { label: "Very much like me", marks: 4 },
        ];

  // Domain theme helper (Design 2 & Document 2 v4.0 Spec)
  const domainTheme = useMemo(() => {
    const sec = (question.section || "").toUpperCase();
    const name = (question.sectionName || question.category || "").toLowerCase();

    if (sec === "A" || name.includes("focus") || name.includes("attention")) {
      return {
        label: "FOCUS & ATTENTION",
        icon: Target,
        badgeClass: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
        activeBorder: "border-sky-500 ring-2 ring-sky-500/20",
        activeBg: "bg-sky-500/5 dark:bg-sky-500/10",
        bubbleActive: "bg-sky-500 border-sky-500",
        radioActive: "bg-sky-500 text-white",
      };
    } else if (sec === "B" || name.includes("confidence") || name.includes("grounding")) {
      return {
        label: "INNER CONFIDENCE",
        icon: Sparkles,
        badgeClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
        activeBorder: "border-amber-500 ring-2 ring-amber-500/20",
        activeBg: "bg-amber-500/5 dark:bg-amber-500/10",
        bubbleActive: "bg-amber-500 border-amber-500",
        radioActive: "bg-amber-500 text-white",
      };
    } else if (sec === "C" || name.includes("social") || name.includes("peer")) {
      return {
        label: "SOCIAL INTERACTION",
        icon: Users,
        badgeClass: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
        activeBorder: "border-rose-500 ring-2 ring-rose-500/20",
        activeBg: "bg-rose-500/5 dark:bg-rose-500/10",
        bubbleActive: "bg-rose-500 border-rose-500",
        radioActive: "bg-rose-500 text-white",
      };
    } else {
      return {
        label: "HEALTHY DIGITAL HABITS",
        icon: Smartphone,
        badgeClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
        activeBorder: "border-emerald-500 ring-2 ring-emerald-500/20",
        activeBg: "bg-emerald-500/5 dark:bg-emerald-500/10",
        bubbleActive: "bg-emerald-500 border-emerald-500",
        radioActive: "bg-emerald-500 text-white",
      };
    }
  }, [question]);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") {
        return;
      }

      const key = e.key.toUpperCase();
      let pickedIdx = -1;

      if (key === "A" || key === "1") pickedIdx = 0;
      else if (key === "B" || key === "2") pickedIdx = 1;
      else if (key === "C" || key === "3") pickedIdx = 2;
      else if (key === "D" || key === "4") pickedIdx = 3;

      if (pickedIdx >= 0 && pickedIdx < options.length) {
        e.preventDefault();
        setPressedKey(key);
        setTimeout(() => setPressedKey(null), 200);
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
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className="w-full"
    >
      {/* Duolingo-inspired chunky 3D sticker container */}
      <Card id="assessment-main-card" className="border-2 border-b-[5px] border-slate-200 dark:border-slate-800 border-b-slate-300 dark:border-b-slate-700 rounded-3xl overflow-hidden flex flex-col justify-between bg-card w-full shadow-sm transition-all">
        <CardContent className="p-3.5 sm:p-4 space-y-2 sm:space-y-2.5 flex-1 flex flex-col justify-center">
          {/* Header Metadata & Reassurance Tip */}
          <div className="space-y-1.5 text-left">
            <div className="flex flex-wrap items-center justify-between gap-1.5">
              <div className="flex items-center gap-1.5">
                <div className={`px-2.5 py-0.5 rounded-lg border-2 border-b-3 flex items-center gap-1.5 text-[11px] font-bold font-mono ${domainTheme.badgeClass}`}>
                  <domainTheme.icon className="h-3 w-3" />
                  <span>{domainTheme.label}</span>
                </div>
                {question.phase && (
                  <Badge variant="outline" className="text-[10px] font-semibold bg-muted/40 border-2 border-slate-200 dark:border-slate-700 rounded-lg px-2 py-0 text-foreground">
                    {question.phase}
                  </Badge>
                )}
              </div>

              <span className="text-[11px] font-mono font-semibold text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-md border border-border/50">
                Question {questionIndex + 1} of {totalQuestions}
              </span>
            </div>

            {/* Reassurance Tip Callout - Compact Duolingo sticker banner */}
            <div className="py-1.5 px-3 rounded-xl bg-amber-500/10 border-2 border-b-3 border-amber-500/25 flex items-center gap-2 text-[11px] text-amber-900 dark:text-amber-200 font-medium">
              <Lightbulb className="h-3.5 w-3.5 text-amber-500 shrink-0" />
              <span>There are no right or wrong answers — just your honest experience.</span>
            </div>

            {/* Statement Text - 2 to 3 lines cleanly */}
            <div className="pt-0.5">
              <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground leading-snug line-clamp-3">
                <span className="font-mono mr-2" style={{ color: theme.primary }}>{questionIndex + 1}.</span>
                {question.text}
              </h2>
            </div>
          </div>

          {/* Friendly Guidance Hint - Tactile Buttony Capsule Box matching Theme Color */}
          <div className="w-full pt-1 pb-0.5 flex items-center justify-center">
            <div
              className="inline-flex items-center gap-2.5 px-5 py-1.5 rounded-full border-2 border-b-[3.5px] shadow-xs select-none transition-all duration-300"
              style={{
                borderColor: theme.primary,
                borderBottomColor: theme.primaryDark,
                backgroundColor: `color-mix(in srgb, ${theme.primary} 22%, var(--background))`,
              }}
            >
              <span className="text-base leading-none">
                ✨
              </span>
              <span className="text-xs sm:text-[13px] font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Choose what feels most true for you
              </span>
            </div>
          </div>

          {/* Duolingo Tactile 3D Circular Number Buttons with Press Depression */}
          <div className="py-1.5 sm:py-2.5 w-full max-w-xl mx-auto">
            <div className="flex items-start justify-between gap-2 sm:gap-3 w-full">
              {options.map((opt, index) => {
                const isSelected = selectedIndex === index;
                const letter = OPTION_LETTERS[index] || String(index + 1);
                const isKeyActive = pressedKey === letter || pressedKey === OPTION_NUMBERS[index];

                return (
                  <div
                    key={index}
                    onClick={() => handleOptionClick(index)}
                    className="flex-1 flex flex-col items-center text-center cursor-pointer group select-none"
                  >
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.06 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOptionClick(index);
                      }}
                      className={`w-11 h-11 sm:w-13 sm:h-13 rounded-full flex items-center justify-center text-sm sm:text-base font-extrabold transition-all cursor-pointer relative select-none ${
                        isSelected
                          ? `${theme.activeRadioClass} scale-105 active:translate-y-[2px] active:border-b-2`
                          : "border-2 border-b-4 border-slate-200 dark:border-slate-700 border-b-slate-300 dark:border-b-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-750 active:border-b-2 active:translate-y-[2px]"
                      } ${isKeyActive ? `ring-4 ${theme.ringColor} scale-105` : ""}`}
                    >
                      {/* Top subtle shine bubble for 3D sticker look */}
                      {isSelected && (
                        <div className="absolute top-1 inset-x-2 h-1 rounded-full bg-white/40 pointer-events-none" />
                      )}
                      <span>{index + 1}</span>
                    </motion.button>

                    {/* Psychology Today Under-Label (High contrast in light & dark mode) */}
                    <div className="mt-1.5 space-y-0.5 max-w-[115px]">
                      <p className={`text-[11px] sm:text-xs leading-tight transition-colors line-clamp-2 ${
                        isSelected
                          ? "font-bold text-foreground"
                          : "font-semibold text-slate-700 dark:text-slate-200 group-hover:text-foreground"
                      }`}>
                        {opt.label}
                      </p>
                      {index === 0 && (
                        <span className="block text-[9px] text-slate-500 dark:text-slate-400 font-mono uppercase tracking-wider font-bold">
                          Disagree
                        </span>
                      )}
                      {index === options.length - 1 && (
                        <span className="block text-[9px] text-slate-500 dark:text-slate-400 font-mono uppercase tracking-wider font-bold">
                          Agree
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Optional Context Note (Duolingo sticker input toggle) */}
          <div className="pt-0.5">
            {!showNoteInput && !noteText ? (
              <button
                type="button"
                onClick={() => setShowNoteInput(true)}
                className="text-[11px] text-slate-600 dark:text-slate-300 hover:text-foreground flex items-center gap-1.5 cursor-pointer font-semibold transition-colors px-2 py-0.5 rounded-lg hover:bg-muted/50"
              >
                <MessageSquare className="h-3 w-3 text-slate-500 dark:text-slate-400" />
                <span>Want to add context?</span>
                <span className="font-bold hover:underline" style={{ color: theme.primary }}>+ Add a note</span>
              </button>
            ) : (
              <div className="p-2.5 rounded-xl border-2 border-b-3 border-slate-200 dark:border-slate-700 bg-card space-y-1.5">
                <div className="flex items-center justify-between text-[10px] text-slate-600 dark:text-slate-300 font-semibold">
                  <span className="flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" style={{ color: theme.primary }} />
                    Optional Personal Note
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowNoteInput(false)}
                    className="text-slate-600 dark:text-slate-300 hover:text-foreground text-[10px] font-bold"
                  >
                    Hide
                  </button>
                </div>
                <textarea
                  rows={2}
                  placeholder="Jot down a quick thought (optional)..."
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border-2 border-border/80 bg-background focus:outline-none focus:border-primary font-medium text-foreground placeholder:text-muted-foreground/70"
                />
              </div>
            )}
          </div>
        </CardContent>

        {/* Error notification if submission failed */}
        {errorMessage && (
          <div className="mx-4 mb-2 p-2.5 text-xs bg-destructive/10 text-destructive rounded-xl border-2 border-b-3 border-destructive/30 flex items-center gap-2 font-medium">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Footer Navigation with Duolingo 3D Pressable Buttons */}
        <div className="border-t-2 border-slate-200/80 dark:border-slate-800 py-2.5 px-4 sm:px-6 flex justify-between items-center bg-muted/20">
          <Button
            variant="outline"
            size="sm"
            disabled={questionIndex === 0 || isSubmitting}
            onClick={() => {
              playStepSound();
              onPrev();
            }}
            className="text-xs h-9 px-4 rounded-xl border-2 border-b-4 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 active:border-b-2 active:translate-y-[2px] font-bold cursor-pointer transition-all"
          >
            <ChevronLeft className="h-4 w-4 mr-1" /> Previous
          </Button>

          <div className="hidden sm:flex items-center gap-2 text-[10px] text-slate-600 dark:text-slate-300 font-mono font-medium">
            <span>Press</span>
            <kbd className="px-1.5 py-0.5 rounded bg-muted border-2 border-b-3 border-slate-300 dark:border-slate-700 text-[9px] font-bold text-foreground">Enter</kbd>
            <span>{isLastQuestion ? "to finish & submit" : "to continue"} • Or press 1–4</span>
          </div>

          {isLastQuestion ? (
            <button
              disabled={selectedIndex === undefined || isSubmitting}
              onClick={() => {
                playStepSound();
                onNext();
              }}
              className={`h-9 px-5 text-xs font-bold rounded-xl min-w-[150px] cursor-pointer transition-all uppercase tracking-wider flex items-center justify-center gap-2 ${
                selectedIndex === undefined || isSubmitting
                  ? "opacity-50 cursor-not-allowed bg-slate-300 dark:bg-slate-700 text-slate-500 border-2 border-slate-400"
                  : theme.buttonClass
              }`}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Submitting...</span>
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <span>Finish &amp; View Reflection</span>
                  <Sparkles className="h-3.5 w-3.5" />
                </span>
              )}
            </button>
          ) : (
            <button
              disabled={selectedIndex === undefined || isSubmitting}
              onClick={() => {
                playStepSound();
                onNext();
              }}
              className={`h-9 px-5 text-xs font-bold rounded-xl min-w-[120px] cursor-pointer transition-all uppercase tracking-wider flex items-center justify-center gap-2 ${
                selectedIndex === undefined || isSubmitting
                  ? "opacity-50 cursor-not-allowed bg-slate-300 dark:bg-slate-700 text-slate-500 border-2 border-slate-400"
                  : theme.buttonClass
              }`}
            >
              <span>Continue</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </Card>
    </motion.div>
  );
}
