"use client";

import { motion } from "framer-motion";
import { Sun, CloudSun, CloudRain, Zap, Battery, BatteryCharging, BatteryFull, Moon, Sparkles, Coffee, Smartphone } from "lucide-react";
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
    tagline: "Alert, light, steady headspace",
    icon: Sun,
    color: "from-amber-500/20 via-orange-500/10 to-transparent",
    borderActive: "border-amber-500/60 ring-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400",
    badge: "Steady",
    accent: "text-amber-500",
  },
  {
    id: "clouds" as const,
    title: "Scattered Clouds",
    tagline: "Daydreaming, drifting, mostly okay",
    icon: CloudSun,
    color: "from-sky-500/20 via-blue-500/10 to-transparent",
    borderActive: "border-sky-500/60 ring-sky-500/20 bg-sky-500/10 text-sky-600 dark:text-sky-400",
    badge: "Drifting",
    accent: "text-sky-500",
  },
  {
    id: "fog" as const,
    title: "Fog & Heavy Drizzle",
    tagline: "Carrying quiet weight, low motivation",
    icon: CloudRain,
    color: "from-indigo-500/20 via-slate-500/10 to-transparent",
    borderActive: "border-indigo-500/60 ring-indigo-500/20 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
    badge: "Gentle",
    accent: "text-indigo-400",
  },
  {
    id: "storm" as const,
    title: "Electric Wind",
    tagline: "Restless, racing mind, buzzing tension",
    icon: Zap,
    color: "from-purple-500/20 via-pink-500/10 to-transparent",
    borderActive: "border-purple-500/60 ring-purple-500/20 bg-purple-500/10 text-purple-600 dark:text-purple-400",
    badge: "Restless",
    accent: "text-purple-400",
  },
];

const energyBars = [
  { value: 25 as const, label: "25%", title: "Low Reserve", desc: "Carrying fatigue, go gentle" },
  { value: 50 as const, label: "50%", title: "Steady Cruise", desc: "Moderate, getting through" },
  { value: 75 as const, label: "75%", title: "Active Drive", desc: "Good focus bandwidth" },
  { value: 100 as const, label: "100%", title: "Supercharged", desc: "High alertness & curiosity" },
];

const sleepOptions = [
  { id: "deep" as const, label: "Deep & Restful", note: "Woke up recharged", icon: Sparkles, iconColor: "text-amber-500" },
  { id: "average" as const, label: "Normal Sleep", note: "Took a bit to wake up", icon: Coffee, iconColor: "text-amber-600 dark:text-amber-400" },
  { id: "broken" as const, label: "Broken Sleep", note: "Tossed or woke up often", icon: Moon, iconColor: "text-indigo-500 dark:text-indigo-400" },
  { id: "late" as const, label: "Late Night Screen", note: "Slept late / very short", icon: Smartphone, iconColor: "text-sky-500" },
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
    <div className="space-y-8 text-left">
      {/* 1. Mind Weather Orb Selection */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[11px] font-mono font-semibold tracking-wider uppercase text-primary">
              Station 1 • Atmosphere
            </span>
            <h3 className="text-base sm:text-lg font-semibold tracking-tight text-foreground">
              What is the weather in your head right now?
            </h3>
          </div>
          <Sparkles className="h-4 w-4 text-primary/70 animate-pulse hidden sm:block" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {weatherOptions.map((w, idx) => {
            const Icon = w.icon;
            const isSelected = value.weather === w.id;
            return (
              <motion.button
                key={w.id}
                type="button"
                whileHover={{ scale: 1.015 }}
                whileTap={{ scale: 0.985 }}
                onClick={() => handleWeather(w.id)}
                className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between min-h-[96px] ${
                  isSelected
                    ? `${w.borderActive} ring-2 shadow-sm`
                    : "border-border/80 hover:border-primary/40 bg-card hover:bg-muted/40"
                }`}
              >
                <div className="flex items-start justify-between w-full">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`h-9 w-9 rounded-xl flex items-center justify-center transition-colors ${
                        isSelected ? "bg-primary/20" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <Icon className={`h-5 w-5 ${isSelected ? w.accent : ""}`} />
                    </div>
                    <div>
                      <div className="text-sm font-semibold leading-none">{w.title}</div>
                      <span className="text-[10px] text-muted-foreground font-mono tracking-wide">
                        {w.badge}
                      </span>
                    </div>
                  </div>
                  {isSelected && (
                    <motion.div
                      layoutId="weather-ring"
                      className="h-2.5 w-2.5 rounded-full bg-primary"
                    />
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-2 leading-snug">
                  {w.tagline}
                </p>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* 2. Fuel Battery Gauge */}
      <div className="space-y-3">
        <div>
          <span className="text-[11px] font-mono font-semibold tracking-wider uppercase text-primary">
            Station 2 • Fuel Tank
          </span>
          <h3 className="text-base sm:text-lg font-semibold tracking-tight text-foreground">
            How full is your mental battery today?
          </h3>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {energyBars.map((bar) => {
            const isSelected = value.energyLevel === bar.value;
            return (
              <motion.button
                key={bar.value}
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleEnergy(bar.value)}
                className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  isSelected
                    ? "border-primary bg-primary/10 ring-1 ring-primary/40 text-foreground shadow-sm"
                    : "border-border/80 hover:border-primary/30 bg-card hover:bg-muted/30 text-muted-foreground hover:text-foreground"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs font-mono font-bold ${isSelected ? "text-primary" : ""}`}>
                    {bar.label}
                  </span>
                  <div className="h-2 w-8 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        isSelected ? "bg-primary" : "bg-muted-foreground/30"
                      }`}
                      style={{ width: `${bar.value}%` }}
                    />
                  </div>
                </div>
                <div className="text-xs font-semibold">{bar.title}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                  {bar.desc}
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* 3. Sleep Pacing */}
      <div className="space-y-3">
        <div>
          <span className="text-[11px] font-mono font-semibold tracking-wider uppercase text-primary">
            Station 3 • Recharge
          </span>
          <h3 className="text-base sm:text-lg font-semibold tracking-tight text-foreground">
            How was your sleep recharge last night?
          </h3>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {sleepOptions.map((s) => {
            const isSelected = value.sleepQuality === s.id;
            return (
              <motion.button
                key={s.id}
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleSleep(s.id)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  isSelected
                    ? "border-primary bg-primary/10 ring-1 ring-primary/40 text-foreground shadow-sm"
                    : "border-border/80 hover:border-primary/30 bg-card hover:bg-muted/30 text-muted-foreground hover:text-foreground"
                }`}
              >
                <div className="mb-2">
                  <s.icon className={`h-5 w-5 ${s.iconColor}`} />
                </div>
                <div className="text-xs font-semibold leading-tight">{s.label}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5 leading-tight">
                  {s.note}
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
