"use client";

import { useState } from "react";
import { Smile, Sun, CloudSun, Moon, BookOpen, Heart, CheckCircle2, Sparkles, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface DailyPulseWell {
  day: string;
  date: string;
  state: string;
  score: number;
}

interface EmotionalAtmosphereProps {
  atmosphere: {
    equilibrium_score: number;
    weather_state: string;
    weather_label: string;
    summary: string;
    last_checkin_date: string;
    daily_pulse: DailyPulseWell[];
  };
  childName: string;
}

export function ParentAtmosphereBarometer({ atmosphere, childName }: EmotionalAtmosphereProps) {
  const firstName = childName.split(" ")[0] || "Your child";
  const score = atmosphere.equilibrium_score || 78;
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  // Friendly mood icon mapping (warm, human, culturally reassuring)
  const getMoodIcon = (state: string) => {
    switch (state) {
      case "sunny_calm":
        return <Smile className="h-8 w-8 text-emerald-500 transition-transform group-hover:scale-110" />;
      case "focused_breeze":
        return <Sun className="h-8 w-8 text-amber-500 animate-spin-slow transition-transform group-hover:scale-110" />;
      case "passing_cloud":
        return <CloudSun className="h-8 w-8 text-sky-500 transition-transform group-hover:scale-110" />;
      default:
        return <Smile className="h-8 w-8 text-rose-400 transition-transform group-hover:scale-110" />;
    }
  };

  const getDayDotColor = (state: string) => {
    switch (state) {
      case "optimal":
        return "bg-emerald-500 shadow-xs shadow-emerald-500/50";
      case "calm":
        return "bg-sky-500 shadow-xs shadow-sky-500/50";
      case "mild_tension":
        return "bg-amber-500 shadow-xs shadow-amber-500/50";
      default:
        return "bg-rose-500 shadow-xs shadow-rose-500/50";
    }
  };

  const getDayLabel = (state: string) => {
    switch (state) {
      case "optimal":
        return "Calm & Happy";
      case "calm":
        return "Relaxed";
      case "mild_tension":
        return "Study Stress";
      default:
        return "Tired";
    }
  };

  return (
    <div className="clay-card p-6 sm:p-8 relative overflow-hidden transition-all group">
      {/* Top liquid specular rim line */}
      <div className="absolute top-0 left-8 right-8 h-[1px] bg-gradient-to-r from-transparent via-foreground/20 to-transparent" />

      {/* Subtle ambient mood glow behind dial */}
      <div className="absolute -top-24 -left-24 w-80 h-80 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-6 border-b border-border/50 relative z-10">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              TODAY&apos;S MOOD & PEACE OF MIND
            </span>
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
            How {firstName} is Feeling Today
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="text-[11px] font-mono bg-secondary/60 border-border/80 px-3 py-1 rounded-full shadow-2xs"
          >
            Updated {atmosphere.last_checkin_date}
          </Badge>
          <div className="p-2 rounded-xl neo-well text-emerald-600 dark:text-emerald-400">
            <Heart className="h-4 w-4" />
          </div>
        </div>
      </div>

      {/* Main Instrument Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-7 items-center relative z-10">
        {/* Left: Tactile Living Mood Dial */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center p-6 rounded-3xl neo-well relative">
          <div className="relative flex items-center justify-center">
            {/* Outer tactile claymorphic bezel with subtle tick markers */}
            <div className="h-44 w-44 sm:h-48 sm:w-48 barometer-bezel p-3.5 flex items-center justify-center relative">
              {/* Circular progress arc */}
              <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  className="stroke-muted/25 dark:stroke-muted/40"
                  strokeWidth="6.5"
                  fill="transparent"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  className="stroke-emerald-500 dark:stroke-emerald-400 transition-all duration-1000 ease-out"
                  strokeWidth="6.5"
                  fill="transparent"
                  strokeDasharray="264"
                  strokeDashoffset={264 - (264 * score) / 100}
                  strokeLinecap="round"
                />
              </svg>

              {/* Central Living Stone Core */}
              <div className="absolute inset-4 rounded-full bg-gradient-to-b from-card to-card/90 dark:from-slate-900 dark:to-slate-950 flex flex-col items-center justify-center text-center shadow-inner border border-border/60">
                <div className="mb-0.5 p-2 rounded-full bg-emerald-500/10 text-emerald-500">
                  {getMoodIcon(atmosphere.weather_state)}
                </div>
                <div className="text-3xl sm:text-4xl font-black tracking-tight text-foreground font-mono">
                  {score}<span className="text-sm text-muted-foreground font-sans font-medium">%</span>
                </div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground font-semibold">
                  Peace of Mind
                </span>
              </div>
            </div>
          </div>

          {/* Status Capsule */}
          <div className="mt-4 text-center">
            <span className="inline-flex items-center gap-2 text-xs font-bold text-foreground px-3.5 py-1.5 rounded-full bg-background border border-border/80 shadow-xs">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              {atmosphere.weather_label || "Calm & Happy"}
            </span>
          </div>

          {/* 3 Practical Quick Signals for Indian Parents */}
          <div className="grid grid-cols-3 gap-2 w-full mt-4 pt-4 border-t border-border/40 text-center">
            <div className="p-1.5 rounded-xl bg-background/60 border border-border/40">
              <Moon className="h-3.5 w-3.5 text-indigo-500 mx-auto mb-0.5" />
              <div className="text-[10px] font-mono font-semibold text-foreground">8.5 Hrs</div>
              <div className="text-[9px] text-muted-foreground">Sleep Rested</div>
            </div>
            <div className="p-1.5 rounded-xl bg-background/60 border border-border/40">
              <BookOpen className="h-3.5 w-3.5 text-amber-500 mx-auto mb-0.5" />
              <div className="text-[10px] font-mono font-semibold text-foreground">Manageable</div>
              <div className="text-[9px] text-muted-foreground">Study Load</div>
            </div>
            <div className="p-1.5 rounded-xl bg-background/60 border border-border/40">
              <Smile className="h-3.5 w-3.5 text-emerald-500 mx-auto mb-0.5" />
              <div className="text-[10px] font-mono font-semibold text-foreground">Comfortable</div>
              <div className="text-[9px] text-muted-foreground">With Friends</div>
            </div>
          </div>
        </div>

        {/* Right: Plain-English Daily Guidance & 7-Day Tactile Tablets */}
        <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
          {/* Summary Box */}
          <div className="p-5 rounded-2xl bg-card border border-border/70 shadow-xs space-y-2 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="h-3 w-3 text-amber-500" />
                This Week&apos;s Update for Parents
              </span>
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Good Steady Routine
              </span>
            </div>
            <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed font-normal">
              {atmosphere.summary}
            </p>
          </div>

          {/* 7-Day Pulse Tablets */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono font-semibold text-muted-foreground uppercase tracking-wider text-[11px]">
                Past 7 Days Mood Pattern
              </span>
              <span className="font-mono text-xs text-foreground font-bold">
                Weekly Stability: 91% (Consistent)
              </span>
            </div>

            <div className="grid grid-cols-7 gap-2">
              {atmosphere.daily_pulse?.map((dayWell, idx) => {
                const isSelected = selectedDay === idx;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedDay(isSelected ? null : idx)}
                    className={`neo-well p-2.5 rounded-2xl flex flex-col items-center justify-between text-center min-h-[76px] transition-all hover:-translate-y-1 cursor-pointer focus:outline-none ${
                      isSelected
                        ? "ring-2 ring-emerald-500 bg-emerald-500/10 border-emerald-500/40"
                        : "hover:border-foreground/20"
                    }`}
                  >
                    <span className="text-[11px] font-mono font-bold text-muted-foreground">
                      {dayWell.day}
                    </span>
                    <div className={`h-3 w-3 rounded-full ${getDayDotColor(dayWell.state)} ring-2 ring-card/80`} />
                    <span className="text-[11px] font-mono text-foreground font-bold">
                      {dayWell.score}%
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Micro helper text when clicking a day */}
            <div className="text-center pt-1">
              <span className="text-[11px] text-muted-foreground font-mono">
                {selectedDay !== null && atmosphere.daily_pulse[selectedDay] ? (
                  <span className="text-foreground font-semibold">
                    {atmosphere.daily_pulse[selectedDay].day} ({atmosphere.daily_pulse[selectedDay].date}):{" "}
                    {getDayLabel(atmosphere.daily_pulse[selectedDay].state)} • {atmosphere.daily_pulse[selectedDay].score}%
                  </span>
                ) : (
                  `Tap any day to see how ${firstName} felt on that day`
                )}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
