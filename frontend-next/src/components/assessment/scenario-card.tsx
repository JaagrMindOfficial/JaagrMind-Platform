"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, ChevronLeft, ChevronRight, Sparkles, Loader2, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { playSelectSound, playStepSound } from "@/lib/assessment-sound";

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

  const options = question.options && question.options.length > 0 ? question.options : [
    { label: "Not true for me", marks: 1 },
    { label: "Sometimes true", marks: 2 },
    { label: "Often true", marks: 3 },
    { label: "Almost always true", marks: 4 },
  ];

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      ) {
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
      <Card className="border shadow-sm overflow-hidden min-h-[400px] flex flex-col justify-between bg-card">
        <CardContent className="p-6 sm:p-9 space-y-6 sm:space-y-7 flex-1 flex flex-col justify-center">
          {/* Header Metadata */}
          <div className="space-y-2.5 text-left">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-mono font-semibold text-primary uppercase tracking-widest bg-primary/10 px-2.5 py-0.5 rounded-md">
                Question {questionIndex + 1}
              </span>

              {question.phase && (
                <Badge
                  variant="outline"
                  className="text-[11px] font-medium bg-muted/40 border-border/80 text-foreground"
                >
                  {question.phase}
                </Badge>
              )}

              {question.category && (
                <span className="text-xs text-muted-foreground hidden sm:inline">
                  • {question.category}
                </span>
              )}
            </div>

            <h2 className="text-lg sm:text-xl md:text-2xl font-semibold tracking-tight text-foreground leading-snug">
              {question.text}
            </h2>
          </div>

          {/* Interactive Option Cards */}
          <div className="flex flex-col gap-2.5 w-full">
            {options.map((opt, index) => {
              const isSelected = selectedIndex === index;
              const letter = OPTION_LETTERS[index] || String(index + 1);
              const isKeyActive = pressedKey === letter || pressedKey === OPTION_NUMBERS[index];

              return (
                <motion.button
                  key={index}
                  type="button"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => handleOptionClick(index)}
                  className={`p-3.5 sm:p-4 rounded-xl border text-left flex items-start gap-3.5 transition-all relative group ${
                    isSelected
                      ? "border-primary bg-primary/10 text-foreground ring-1 ring-primary/40 shadow-sm"
                      : "border-border/80 hover:border-primary/40 hover:bg-muted/40 text-muted-foreground hover:text-foreground"
                  } ${isKeyActive ? "scale-[0.99] ring-2 ring-primary" : ""}`}
                >
                  {/* Key pill */}
                  <span
                    className={`h-6 w-6 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                      isSelected
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-muted text-muted-foreground group-hover:bg-primary/20 group-hover:text-primary"
                    }`}
                  >
                    {letter}
                  </span>

                  {/* Scenario text */}
                  <span
                    className={`flex-1 text-sm sm:text-base leading-relaxed ${
                      isSelected ? "font-medium text-foreground" : ""
                    }`}
                  >
                    {opt.label}
                  </span>

                  {/* Tactile indicator */}
                  {isSelected ? (
                    <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  ) : (
                    <div className="h-5 w-5 rounded-full border border-muted-foreground/30 shrink-0 mt-0.5 group-hover:border-primary/50" />
                  )}
                </motion.button>
              );
            })}
          </div>

          {/* Discreet keyboard shortcut helper */}
          <div className="text-[11px] text-muted-foreground/60 flex items-center justify-between pt-1">
            <span className="hidden sm:inline">
              Tip: Press <kbd className="font-mono px-1.5 py-0.5 bg-muted rounded border text-[10px]">A-D</kbd> or <kbd className="font-mono px-1.5 py-0.5 bg-muted rounded border text-[10px]">1-4</kbd> on your keyboard
            </span>
            <span className="ml-auto font-mono text-[10px]">
              {questionIndex + 1} / {totalQuestions}
            </span>
          </div>
        </CardContent>

        {/* Error notification if submission failed */}
        {errorMessage && (
          <div className="mx-6 sm:mx-8 mb-3 p-3 text-xs bg-destructive/10 text-destructive rounded-xl border border-destructive/20 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Footer Navigation */}
        <div className="border-t p-4 sm:px-8 flex justify-between items-center bg-muted/20">
          <Button
            variant="ghost"
            size="sm"
            disabled={questionIndex === 0 || isSubmitting}
            onClick={() => {
              playStepSound();
              onPrev();
            }}
            className="text-xs"
          >
            <ChevronLeft className="h-4 w-4 mr-1" /> Previous
          </Button>

          {isLastQuestion ? (
            <Button
              size="sm"
              disabled={selectedIndex === undefined || isSubmitting}
              onClick={() => {
                playStepSound();
                onNext();
              }}
              className="px-6 text-xs shadow-sm min-w-[145px]"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Submitting...</span>
                </span>
              ) : (
                "Complete Check-in ✓"
              )}
            </Button>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              disabled={selectedIndex === undefined || isSubmitting}
              onClick={() => {
                playStepSound();
                onNext();
              }}
              className="text-xs"
            >
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </Card>
    </motion.div>
  );
}
