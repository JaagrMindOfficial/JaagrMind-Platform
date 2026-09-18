"use client";

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Target, Sparkles, BookOpen, Lightbulb, CheckCircle2 } from "lucide-react";

interface PillarScoresProps {
  pillars: {
    focus_endurance?: number;
    emotional_resilience?: number;
    social_ease?: number;
    self_expression?: number;
    rest_and_energy?: number;
    attn_stability?: number;
    load_regulation?: number;
    self_safety?: number;
    social_comfort?: number;
    superpowers?: string[];
    growth_observation?: string;
  };
  childName: string;
}

export function ParentGrowthRadar({ pillars, childName }: PillarScoresProps) {
  const firstName = childName.split(" ")[0] || "Your child";

  const studyFocusVal = pillars.attn_stability ?? pillars.focus_endurance ?? 86;
  const friendsVal = pillars.social_comfort ?? pillars.social_ease ?? 88;
  const calmResetVal = pillars.load_regulation ?? pillars.rest_and_energy ?? 76;
  const confidenceVal = pillars.self_safety ?? pillars.emotional_resilience ?? 82;

  // Unified 4-Pole Diamond Radar (Top, Right, Bottom, Left)
  const radarData = [
    { subject: "Study Focus & Flow", value: studyFocusVal, fullMark: 100 },
    { subject: "Friends & Belonging", value: friendsVal, fullMark: 100 },
    { subject: "Daily Calm & Reset", value: calmResetVal, fullMark: 100 },
    { subject: "Inner Confidence", value: confidenceVal, fullMark: 100 },
  ];

  return (
    <div className="clay-card p-6 sm:p-7 relative overflow-hidden transition-all flex flex-col justify-between h-full group">
      {/* Top liquid specular line */}
      <div className="absolute top-0 left-6 right-6 h-[1px] bg-gradient-to-r from-transparent via-foreground/15 to-transparent" />

      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-border/40">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
              DAILY REGULATION & BALANCE
            </span>
          </div>
          <h3 className="text-base sm:text-lg font-bold tracking-tight text-foreground">
            {firstName}&apos;s Daily Routine Balance
          </h3>
        </div>
        <div className="p-2 rounded-xl neo-well text-sky-600 dark:text-sky-400">
          <Target className="h-4 w-4" />
        </div>
      </div>

      {/* Radar Chart */}
      <div className="py-2 h-56 sm:h-60 w-full relative flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="72%" data={radarData}>
            <PolarGrid stroke="currentColor" className="text-border/50" />
            <PolarAngleAxis
              dataKey="subject"
              tick={{ fill: "currentColor", fontSize: 11, fontWeight: 600 }}
              className="text-foreground font-sans"
            />
            <Radar
              name="Score"
              dataKey="value"
              stroke="#0ea5e9"
              strokeWidth={2}
              fill="#0ea5e9"
              fillOpacity={0.22}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Quick Score Bars for Instant Reading */}
      <div className="grid grid-cols-2 gap-2 pt-1 pb-3">
        <div className="p-2 rounded-xl bg-background/60 border border-border/50 flex items-center justify-between">
          <span className="text-[11px] font-medium text-muted-foreground">Study Focus & Flow</span>
          <span className="text-xs font-mono font-bold text-sky-600 dark:text-sky-400">
            {studyFocusVal}%
          </span>
        </div>
        <div className="p-2 rounded-xl bg-background/60 border border-border/50 flex items-center justify-between">
          <span className="text-[11px] font-medium text-muted-foreground">Friends & Belonging</span>
          <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
            {friendsVal}%
          </span>
        </div>
        <div className="p-2 rounded-xl bg-background/60 border border-border/50 flex items-center justify-between">
          <span className="text-[11px] font-medium text-muted-foreground">Daily Calm & Reset</span>
          <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">
            {calmResetVal}%
          </span>
        </div>
        <div className="p-2 rounded-xl bg-background/60 border border-border/50 flex items-center justify-between">
          <span className="text-[11px] font-medium text-muted-foreground">Inner Confidence</span>
          <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
            {confidenceVal}%
          </span>
        </div>
      </div>

      {/* Superpowers / Strengths */}
      <div className="space-y-3 pt-2 border-t border-border/40">
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            <span>Things {firstName} is Doing Great At</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {pillars.superpowers?.map((power, idx) => (
              <Badge
                key={idx}
                variant="outline"
                className="text-[11px] font-semibold bg-secondary/50 border-border/80 text-foreground py-1 px-2.5 rounded-lg shadow-2xs"
              >
                ✦ {power}
              </Badge>
            ))}
          </div>
        </div>

        {/* Practical Growth Observation for Parents */}
        <div className="p-3 rounded-xl neo-well text-xs text-muted-foreground leading-relaxed flex items-start gap-2.5">
          <Lightbulb className="h-4 w-4 shrink-0 text-amber-500 mt-0.5" />
          <span className="text-foreground/90">{pillars.growth_observation}</span>
        </div>
      </div>
    </div>
  );
}
