"use client";

import { motion } from "framer-motion";
import {
  Sun,
  CloudSun,
  CloudRain,
  Zap,
  Moon,
  Smile,
  Coffee,
  Smartphone,
} from "lucide-react";
import { playSelectSound } from "@/lib/assessment-sound";

export interface MindWeatherState {
  weather: "clear" | "clouds" | "fog" | "storm" | null;
  energyLevel: 25 | 50 | 75 | 100 | null;
  sleepQuality: "deep" | "average" | "broken" | "late" | null;
}

interface MindWeatherCheckProps {
  value: MindWeatherState;
  onChange: (val: MindWeatherState) => void;
}

const weatherOptions = [
  {
    id: "clear" as const,
    title: "Clear & Bright",
    tagline: "Alert, light, steady",
    icon: Sun,
    borderActive: "border-amber-500/60 ring-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400",
    badge: "Steady",
    accent: "text-amber-500",
  },
  {
    id: "clouds" as const,
    title: "Scattered Clouds",
    tagline: "Daydreaming, mostly okay",
    icon: CloudSun,
    borderActive: "border-sky-500/60 ring-sky-500/20 bg-sky-500/10 text-sky-600 dark:text-sky-400",
    badge: "Drifting",
    accent: "text-sky-500",
  },
  {
    id: "fog" as const,
    title: "Fog & Drizzle",
    tagline: "Quiet weight, low drive",
    icon: CloudRain,
    borderActive: "border-indigo-500/60 ring-indigo-500/20 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
    badge: "Gentle",
    accent: "text-indigo-400",
  },
  {
    id: "storm" as const,
    title: "Electric Wind",
    tagline: "Restless, racing mind",
    icon: Zap,
    borderActive: "border-purple-500/60 ring-purple-500/20 bg-purple-500/10 text-purple-600 dark:text-purple-400",
    badge: "Restless",
    accent: "text-purple-400",
  },
];

const energyBars = [
  { value: 25 as const, label: "25%", title: "Low Reserve", desc: "Carrying fatigue" },
  { value: 50 as const, label: "50%", title: "Steady Cruise", desc: "Moderate bandwidth" },
  { value: 75 as const, label: "75%", title: "Active Drive", desc: "Good focus flow" },
  { value: 100 as const, label: "100%", title: "Supercharged", desc: "High alertness" },
];

const sleepOptions = [
  { id: "deep" as const, label: "Deep & Restful", note: "Woke recharged", icon: Smile, iconColor: "text-amber-500" },
  { id: "average" as const, label: "Normal Sleep", note: "Steady waking", icon: Coffee, iconColor: "text-amber-600 dark:text-amber-400" },
  { id: "broken" as const, label: "Broken Sleep", note: "Woke up often", icon: Moon, iconColor: "text-indigo-500 dark:text-indigo-400" },
  { id: "late" as const, label: "Late Screen", note: "Slept very short", icon: Smartphone, iconColor: "text-sky-500" },
];

export function MindWeatherCheck({ value, onChange }: MindWeatherCheckProps) {
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 text-left w-full items-stretch">
      {/* ─────────────────────────────────────────────────────────────
          COLUMN 1: Mind Weather Atmosphere
      ────────────────────────────────────────────────────────────── */}
      <div className="p-3 sm:p-3.5 rounded-2xl border border-border/80 bg-card/70 flex flex-col justify-between space-y-2.5 shadow-2xs">
        <div>
          <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-primary">
            Station 1 • Atmosphere
          </span>
          <h3 className="text-xs sm:text-sm font-semibold tracking-tight text-foreground leading-snug">
            What is the weather in your head?
          </h3>
        </div>

        <div className="flex flex-col gap-1.5">
          {weatherOptions.map((w) => {
            const Icon = w.icon;
            const isSelected = value.weather === w.id;
            return (
              <motion.button
                key={w.id}
                type="button"
                whileHover={{ scale: 1.012 }}
                whileTap={{ scale: 0.988 }}
                onClick={() => handleWeather(w.id)}
                className={`w-full px-2.5 py-1.5 rounded-xl border text-left transition-all relative flex items-center justify-between cursor-pointer ${
                  isSelected
                    ? `${w.borderActive} ring-2 shadow-xs`
                    : "border-border/70 hover:border-primary/40 bg-background hover:bg-muted/40"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div
                    className={`h-7 w-7 shrink-0 rounded-lg flex items-center justify-center transition-colors ${
                      isSelected ? "bg-primary/20" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${isSelected ? w.accent : ""}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-semibold leading-tight text-foreground truncate">
                        {w.title}
                      </span>
                      <span className="text-[9px] text-slate-500 dark:text-slate-400 font-mono font-bold shrink-0">
                        {w.badge}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-600 dark:text-slate-300 leading-tight truncate">
                      {w.tagline}
                    </p>
                  </div>
                </div>
                {isSelected && (
                  <motion.div
                    layoutId="weather-ring"
                    className="h-2 w-2 shrink-0 rounded-full bg-primary ml-1.5"
                  />
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          COLUMN 2: Fuel Battery Gauge
      ────────────────────────────────────────────────────────────── */}
      <div className="p-3 sm:p-3.5 rounded-2xl border border-border/80 bg-card/70 flex flex-col justify-between space-y-2.5 shadow-2xs">
        <div>
          <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-primary">
            Station 2 • Fuel Tank
          </span>
          <h3 className="text-xs sm:text-sm font-semibold tracking-tight text-foreground leading-snug">
            How full is your mental battery?
          </h3>
        </div>

        <div className="flex flex-col gap-1.5">
          {energyBars.map((bar) => {
            const isSelected = value.energyLevel === bar.value;
            return (
              <motion.button
                key={bar.value}
                type="button"
                whileHover={{ scale: 1.012 }}
                whileTap={{ scale: 0.988 }}
                onClick={() => handleEnergy(bar.value)}
                className={`w-full px-2.5 py-1.5 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                  isSelected
                    ? "border-primary bg-primary/10 ring-2 ring-primary/30 text-foreground shadow-xs"
                    : "border-border/70 hover:border-primary/40 bg-background hover:bg-muted/40 text-muted-foreground hover:text-foreground"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="w-9 shrink-0 flex flex-col items-center justify-center">
                    <span className={`text-xs font-mono font-bold ${isSelected ? "text-primary" : "text-foreground"}`}>
                      {bar.label}
                    </span>
                    <div className="h-1.5 w-7 bg-muted rounded-full overflow-hidden mt-0.5">
                      <div
                        className={`h-full transition-all ${
                          isSelected ? "bg-primary" : "bg-muted-foreground/30"
                        }`}
                        style={{ width: `${bar.value}%` }}
                      />
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold leading-tight text-foreground truncate">
                      {bar.title}
                    </div>
                    <p className="text-[10px] text-slate-600 dark:text-slate-300 leading-tight truncate">
                      {bar.desc}
                    </p>
                  </div>
                </div>
                {isSelected && (
                  <span className="h-2 w-2 shrink-0 rounded-full bg-primary ml-1.5" />
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          COLUMN 3: Sleep Pacing & Recharge
      ────────────────────────────────────────────────────────────── */}
      <div className="p-3 sm:p-3.5 rounded-2xl border border-border/80 bg-card/70 flex flex-col justify-between space-y-2.5 shadow-2xs">
        <div>
          <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-primary">
            Station 3 • Recharge
          </span>
          <h3 className="text-xs sm:text-sm font-semibold tracking-tight text-foreground leading-snug">
            How was your sleep recharge?
          </h3>
        </div>

        <div className="flex flex-col gap-1.5">
          {sleepOptions.map((s) => {
            const isSelected = value.sleepQuality === s.id;
            return (
              <motion.button
                key={s.id}
                type="button"
                whileHover={{ scale: 1.012 }}
                whileTap={{ scale: 0.988 }}
                onClick={() => handleSleep(s.id)}
                className={`w-full px-2.5 py-1.5 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                  isSelected
                    ? "border-primary bg-primary/10 ring-2 ring-primary/30 text-foreground shadow-xs"
                    : "border-border/70 hover:border-primary/40 bg-background hover:bg-muted/40 text-muted-foreground hover:text-foreground"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="h-7 w-7 shrink-0 rounded-lg bg-muted flex items-center justify-center">
                    <s.icon className={`h-4 w-4 ${s.iconColor}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold leading-tight text-foreground truncate">
                      {s.label}
                    </div>
                    <p className="text-[10px] text-slate-600 dark:text-slate-300 leading-tight truncate">
                      {s.note}
                    </p>
                  </div>
                </div>
                {isSelected && (
                  <span className="h-2 w-2 shrink-0 rounded-full bg-primary ml-1.5" />
                )}
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
