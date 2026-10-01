"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sun,
  CloudSun,
  CloudRain,
  Zap,
  Moon,
  Smile,
  Coffee,
  Smartphone,
  ArrowRight,
  ArrowLeft,
  Check,
} from "lucide-react";
import { playSelectSound, playStepSound } from "@/lib/assessment-sound";
import { useAssessmentTheme } from "@/lib/assessment-theme";

export interface MindWeatherState {
  weather: "clear" | "clouds" | "fog" | "storm" | null;
  energyLevel: 25 | 50 | 75 | 100 | null;
  sleepQuality: "deep" | "average" | "broken" | "late" | null;
}

interface MindWeatherCheckProps {
  value: MindWeatherState;
  onChange: (val: MindWeatherState) => void;
  onComplete?: () => void;
  onBack?: () => void;
}

const weatherOptions = [
  {
    id: "clear" as const,
    title: "Clear & Calm",
    tagline: "Feeling pretty settled",
    icon: Sun,
    borderActive: "border-amber-500/60 ring-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400",
    badge: "Settled",
    accent: "text-amber-500",
  },
  {
    id: "clouds" as const,
    title: "A Little Cloudy",
    tagline: "Mind wandering a bit",
    icon: CloudSun,
    borderActive: "border-sky-500/60 ring-sky-500/20 bg-sky-500/10 text-sky-600 dark:text-sky-400",
    badge: "Wandering",
    accent: "text-sky-500",
  },
  {
    id: "fog" as const,
    title: "Lots Going On",
    tagline: "A few things on my mind",
    icon: CloudRain,
    borderActive: "border-indigo-500/60 ring-indigo-500/20 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
    badge: "Active",
    accent: "text-indigo-400",
  },
  {
    id: "storm" as const,
    title: "Thoughts Moving Fast",
    tagline: "Lots happening up there",
    icon: Zap,
    borderActive: "border-purple-500/60 ring-purple-500/20 bg-purple-500/10 text-purple-600 dark:text-purple-400",
    badge: "Fast",
    accent: "text-purple-400",
  },
];

const energyBars = [
  { value: 25 as const, label: "25%", title: "Running Low", desc: "Could use a breather" },
  { value: 50 as const, label: "50%", title: "Halfway There", desc: "Getting through the day" },
  { value: 75 as const, label: "75%", title: "Good to Go", desc: "Feeling fairly switched on" },
  { value: 100 as const, label: "100%", title: "Fully Charged", desc: "Ready for things" },
];

const sleepOptions = [
  { id: "deep" as const, label: "Really Good", note: "Woke up feeling rested", icon: Smile, iconColor: "text-amber-500" },
  { id: "average" as const, label: "Pretty Normal", note: "Nothing much to report", icon: Coffee, iconColor: "text-amber-600 dark:text-amber-400" },
  { id: "broken" as const, label: "Not Quite Enough", note: "Could use a little more", icon: Moon, iconColor: "text-indigo-500 dark:text-indigo-400" },
  { id: "late" as const, label: "Rough Night", note: "Late, broken or very little sleep", icon: Smartphone, iconColor: "text-sky-500" },
];

export function MindWeatherCheck({ value, onChange, onComplete, onBack }: MindWeatherCheckProps) {
  const { theme } = useAssessmentTheme();
  // subStep: 0 = Headspace, 1 = Energy, 2 = Sleep
  const [subStep, setSubStep] = useState<0 | 1 | 2>(0);
  const [direction, setDirection] = useState<1 | -1>(1);

  const handleWeather = (id: MindWeatherState["weather"]) => {
    playSelectSound(0);
    onChange({ ...value, weather: id });
  };

  const handleEnergy = (lvl: MindWeatherState["energyLevel"]) => {
    playSelectSound(1);
    onChange({ ...value, energyLevel: lvl });
  };

  const handleSleep = (id: MindWeatherState["sleepQuality"]) => {
    playSelectSound(2);
    onChange({ ...value, sleepQuality: id });
  };

  const goNext = () => {
    playStepSound();
    if (subStep < 2) {
      setDirection(1);
      setSubStep((prev) => (prev + 1) as 0 | 1 | 2);
    } else {
      onComplete?.();
    }
  };

  const goBack = () => {
    playStepSound();
    if (subStep > 0) {
      setDirection(-1);
      setSubStep((prev) => (prev - 1) as 0 | 1 | 2);
    } else {
      onBack?.();
    }
  };

  const isCurrentStepAnswered =
    subStep === 0 ? Boolean(value.weather) : subStep === 1 ? Boolean(value.energyLevel) : Boolean(value.sleepQuality);

  return (
    <div className="w-full space-y-4">
      {/* Top Bar with Step Badge Box */}
      <div className="w-full select-none space-y-2">
        <div className="flex items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/90 border border-slate-200/90 dark:border-slate-700/80 shadow-2xs">
            <span
              className="h-2 w-2 rounded-full shrink-0"
              style={{ backgroundColor: theme.primary || "#0B4F48" }}
            />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-100 tracking-wide font-mono">
              {subStep + 1} of 3
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {[0, 1, 2].map((idx) => (
              <div
                key={idx}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  idx === subStep
                    ? "w-7"
                    : idx < subStep
                    ? "w-3 opacity-60"
                    : "w-3 bg-slate-200 dark:bg-slate-700/80"
                }`}
                style={idx <= subStep ? { backgroundColor: theme.primary || "#0B4F48" } : undefined}
              />
            ))}
          </div>
        </div>

        <div className="space-y-0.5">
          <h2 className="text-base sm:text-lg font-bold text-foreground tracking-tight">
            Before we start, take a quick look at where you&apos;re at.
          </h2>
          <p className="text-xs text-muted-foreground">
            No overthinking. No right or wrong. Just pick what feels closest today.
          </p>
        </div>
      </div>

      {/* Screen Card Content with Animated Transition */}
      <AnimatePresence mode="wait" custom={direction}>
        {/* ─────────────────────────────────────────────────────────────
            SCREEN 1 OF 3: HEADSPACE
        ────────────────────────────────────────────────────────────── */}
        {subStep === 0 && (
          <motion.div
            key="substep-headspace"
            custom={direction}
            initial={{ opacity: 0, x: direction * 18 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -direction * 18 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="space-y-3.5"
          >
            <div className="space-y-0.5">
              <span className="text-[11px] font-bold tracking-wider uppercase text-primary">
                HEADSPACE
              </span>
              <h3 className="text-base sm:text-lg font-bold tracking-tight text-foreground">
                What&apos;s the weather up there?
              </h3>
            </div>

            <div className="space-y-2.5" role="radiogroup" aria-label="Headspace options">
              {weatherOptions.map((w) => {
                const Icon = w.icon;
                const isSelected = value.weather === w.id;

                return (
                  <button
                    key={w.id}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => handleWeather(w.id)}
                    className={`w-full p-3 sm:p-3.5 rounded-xl sm:rounded-2xl border-2 text-left transition-all relative flex items-center justify-between cursor-pointer select-none ${
                      isSelected
                        ? "bg-white dark:bg-slate-900 border-b-[5px] shadow-sm -translate-y-0.5"
                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 border-b-[4px] border-b-slate-300 dark:border-b-slate-700/80 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50/60 dark:hover:bg-slate-800/40"
                    } active:translate-y-[2px] active:border-b-2`}
                    style={
                      isSelected
                        ? {
                            borderColor: theme.primary || "#0B4F48",
                            borderBottomColor: theme.primaryDark || "#083E38",
                            backgroundColor: theme.id === "jm-crayon" ? "#F5FBF7" : undefined,
                          }
                        : undefined
                    }
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div
                        className={`h-9 w-9 shrink-0 rounded-xl flex items-center justify-center transition-colors ${
                          isSelected ? "bg-primary/20" : "bg-muted text-muted-foreground"
                        }`}
                      >
                        <Icon className={`h-4.5 w-4.5 ${isSelected ? w.accent : ""}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-sm font-bold tracking-tight ${
                              isSelected ? "text-foreground" : "text-slate-800 dark:text-slate-200"
                            }`}
                          >
                            {w.title}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono font-bold bg-muted/60 px-2 py-0.5 rounded-full">
                            {w.badge}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-tight mt-0.5">
                          {w.tagline}
                        </p>
                      </div>
                    </div>

                    <div
                      className={`w-6 h-6 rounded-full shrink-0 flex items-center justify-center ml-2 transition-all ${
                        isSelected
                          ? "shadow-xs"
                          : "border-2 border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/70"
                      }`}
                      style={{
                        backgroundColor: isSelected ? theme.primary || "#0B4F48" : undefined,
                      }}
                    >
                      {isSelected && <Check className="h-3.5 w-3.5 text-white stroke-[3]" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            SCREEN 2 OF 3: ENERGY
        ────────────────────────────────────────────────────────────── */}
        {subStep === 1 && (
          <motion.div
            key="substep-energy"
            custom={direction}
            initial={{ opacity: 0, x: direction * 18 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -direction * 18 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="space-y-3.5"
          >
            <div className="space-y-0.5">
              <span className="text-[11px] font-bold tracking-wider uppercase text-primary">
                ENERGY
              </span>
              <h3 className="text-base sm:text-lg font-bold tracking-tight text-foreground">
                How&apos;s your battery today?
              </h3>
            </div>

            <div className="space-y-2.5" role="radiogroup" aria-label="Energy options">
              {energyBars.map((bar) => {
                const isSelected = value.energyLevel === bar.value;

                return (
                  <button
                    key={bar.value}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => handleEnergy(bar.value)}
                    className={`w-full p-3 sm:p-3.5 rounded-xl sm:rounded-2xl border-2 text-left transition-all relative flex items-center justify-between cursor-pointer select-none ${
                      isSelected
                        ? "bg-white dark:bg-slate-900 border-b-[5px] shadow-sm -translate-y-0.5"
                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 border-b-[4px] border-b-slate-300 dark:border-b-slate-700/80 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50/60 dark:hover:bg-slate-800/40"
                    } active:translate-y-[2px] active:border-b-2`}
                    style={
                      isSelected
                        ? {
                            borderColor: theme.primary || "#0B4F48",
                            borderBottomColor: theme.primaryDark || "#083E38",
                            backgroundColor: theme.id === "jm-crayon" ? "#F5FBF7" : undefined,
                          }
                        : undefined
                    }
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-11 shrink-0 flex flex-col items-center justify-center bg-muted/60 p-1.5 rounded-xl border border-border/60">
                        <span
                          className={`text-xs font-mono font-bold ${
                            isSelected ? "text-primary" : "text-foreground"
                          }`}
                        >
                          {bar.label}
                        </span>
                        <div className="h-1.5 w-8 bg-muted-foreground/20 rounded-full overflow-hidden mt-0.5">
                          <div
                            className={`h-full transition-all ${
                              isSelected ? "bg-primary" : "bg-muted-foreground/40"
                            }`}
                            style={{ width: `${bar.value}%` }}
                          />
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <span
                          className={`text-sm font-bold tracking-tight block ${
                            isSelected ? "text-foreground" : "text-slate-800 dark:text-slate-200"
                          }`}
                        >
                          {bar.title}
                        </span>
                        <p className="text-xs text-muted-foreground leading-tight mt-0.5">
                          {bar.desc}
                        </p>
                      </div>
                    </div>

                    <div
                      className={`w-6 h-6 rounded-full shrink-0 flex items-center justify-center ml-2 transition-all ${
                        isSelected
                          ? "shadow-xs"
                          : "border-2 border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/70"
                      }`}
                      style={{
                        backgroundColor: isSelected ? theme.primary || "#0B4F48" : undefined,
                      }}
                    >
                      {isSelected && <Check className="h-3.5 w-3.5 text-white stroke-[3]" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            SCREEN 3 OF 3: SLEEP
        ────────────────────────────────────────────────────────────── */}
        {subStep === 2 && (
          <motion.div
            key="substep-sleep"
            custom={direction}
            initial={{ opacity: 0, x: direction * 18 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -direction * 18 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="space-y-3.5"
          >
            <div className="space-y-0.5">
              <span className="text-[11px] font-bold tracking-wider uppercase text-primary">
                SLEEP
              </span>
              <h3 className="text-base sm:text-lg font-bold tracking-tight text-foreground">
                How did your recharge go?
              </h3>
            </div>

            <div className="space-y-2.5" role="radiogroup" aria-label="Sleep options">
              {sleepOptions.map((s) => {
                const Icon = s.icon;
                const isSelected = value.sleepQuality === s.id;

                return (
                  <button
                    key={s.id}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => handleSleep(s.id)}
                    className={`w-full p-3 sm:p-3.5 rounded-xl sm:rounded-2xl border-2 text-left transition-all relative flex items-center justify-between cursor-pointer select-none ${
                      isSelected
                        ? "bg-white dark:bg-slate-900 border-b-[5px] shadow-sm -translate-y-0.5"
                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 border-b-[4px] border-b-slate-300 dark:border-b-slate-700/80 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50/60 dark:hover:bg-slate-800/40"
                    } active:translate-y-[2px] active:border-b-2`}
                    style={
                      isSelected
                        ? {
                            borderColor: theme.primary || "#0B4F48",
                            borderBottomColor: theme.primaryDark || "#083E38",
                            backgroundColor: theme.id === "jm-crayon" ? "#F5FBF7" : undefined,
                          }
                        : undefined
                    }
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div
                        className={`h-9 w-9 shrink-0 rounded-xl flex items-center justify-center transition-colors ${
                          isSelected ? "bg-primary/20" : "bg-muted text-muted-foreground"
                        }`}
                      >
                        <Icon className={`h-4.5 w-4.5 ${s.iconColor}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span
                          className={`text-sm font-bold tracking-tight block ${
                            isSelected ? "text-foreground" : "text-slate-800 dark:text-slate-200"
                          }`}
                        >
                          {s.label}
                        </span>
                        <p className="text-xs text-muted-foreground leading-tight mt-0.5">
                          {s.note}
                        </p>
                      </div>
                    </div>

                    <div
                      className={`w-6 h-6 rounded-full shrink-0 flex items-center justify-center ml-2 transition-all ${
                        isSelected
                          ? "shadow-xs"
                          : "border-2 border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/70"
                      }`}
                      style={{
                        backgroundColor: isSelected ? theme.primary || "#0B4F48" : undefined,
                      }}
                    >
                      {isSelected && <Check className="h-3.5 w-3.5 text-white stroke-[3]" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Integrated Navigation Buttons (Back & Next / Before We Jump In) */}
      <div className="flex gap-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80">
        <button
          type="button"
          onClick={goBack}
          className="h-10 px-5 rounded-xl sm:rounded-full border-2 border-slate-300 dark:border-slate-700 border-b-[4px] border-b-slate-400 dark:border-b-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 font-bold text-xs sm:text-sm active:translate-y-[2px] active:border-b-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back</span>
        </button>

        <button
          type="button"
          disabled={!isCurrentStepAnswered}
          onClick={goNext}
          style={{
            backgroundColor: theme.primary || "#0B4F48",
            borderBottomColor: theme.primaryDark || "#083E38",
          }}
          className="flex-1 h-10 px-5 rounded-xl sm:rounded-full border-b-[5px] text-white font-bold text-xs sm:text-sm active:translate-y-[2px] active:border-b-2 hover:brightness-105 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-xs flex items-center justify-center gap-1.5"
        >
          <span>{subStep === 2 ? "Before We Jump In →" : "Next"}</span>
          {subStep < 2 && <ArrowRight className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  );
}
