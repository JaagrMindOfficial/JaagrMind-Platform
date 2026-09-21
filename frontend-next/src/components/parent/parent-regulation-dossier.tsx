"use client";

import { useState } from "react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Target,
  Sparkles,
  ShieldCheck,
  Zap,
  Heart,
  Users,
  Moon,
  FolderOpen,
  ArrowUpRight,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import { StudentProfileData, StudentDossierDialog } from "@/components/student-dossier-dialog";

interface ParentRegulationDossierProps {
  dossier?: StudentProfileData | null;
  childName: string;
  onOpenCheckin?: () => void;
}

export function ParentRegulationDossier({
  dossier,
  childName,
  onOpenCheckin,
}: ParentRegulationDossierProps) {
  const [dossierModalOpen, setDossierModalOpen] = useState(false);
  const firstName = childName ? childName.split(" ")[0] : "Your child";

  const isUnassessed =
    !dossier ||
    !dossier.check_in_count ||
    dossier.check_in_count === 0 ||
    dossier.attn_tier === "Pending Assessment";

  // 4-Pole Diamond Radar values (10% to 100% stability)
  const attnVal =
    dossier?.radar_dimensions?.["Attention & Focus Flow"] ??
    (dossier?.attn_stability_score
      ? Math.round(((32 - dossier.attn_stability_score) / 24) * 100)
      : 0);
  const socialVal =
    dossier?.radar_dimensions?.["Social Comfort & Belonging"] ??
    (dossier?.social_comfort_score
      ? Math.round(((32 - dossier.social_comfort_score) / 24) * 100)
      : 0);
  const loadVal =
    dossier?.radar_dimensions?.["Calm & Stress Reset"] ??
    (dossier?.load_regulation_score
      ? Math.round(((32 - dossier.load_regulation_score) / 24) * 100)
      : 0);
  const safetyVal =
    dossier?.radar_dimensions?.["Inner Grounding & Confidence"] ??
    (dossier?.self_safety_score
      ? Math.round(((32 - dossier.self_safety_score) / 24) * 100)
      : 0);

  const radarData = isUnassessed
    ? [
        { subject: "Attention & Focus Flow", student: 0, benchmark: 0 },
        { subject: "Social Comfort & Belonging", student: 0, benchmark: 0 },
        { subject: "Calm & Stress Reset", student: 0, benchmark: 0 },
        { subject: "Inner Grounding & Confidence", student: 0, benchmark: 0 },
      ]
    : [
        {
          subject: "Attention & Focus Flow",
          student: Math.min(100, Math.max(10, Math.round(attnVal))),
          benchmark: 75,
        },
        {
          subject: "Social Comfort & Belonging",
          student: Math.min(100, Math.max(10, Math.round(socialVal))),
          benchmark: 80,
        },
        {
          subject: "Calm & Stress Reset",
          student: Math.min(100, Math.max(10, Math.round(loadVal))),
          benchmark: 68,
        },
        {
          subject: "Inner Grounding & Confidence",
          student: Math.min(100, Math.max(10, Math.round(safetyVal))),
          benchmark: 72,
        },
      ];

  const getTierBadge = (tier?: string) => {
    if (isUnassessed || tier === "Pending Assessment" || !tier) {
      return {
        label: "Pending Check-in",
        badgeClass: "border-muted-foreground/30 bg-muted/40 text-muted-foreground",
        barClass: "bg-muted-foreground/30",
      };
    }
    switch (tier) {
      case "Support Needed":
        return {
          label: "Support Needed",
          badgeClass: "border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400",
          barClass: "bg-rose-500",
        };
      case "Emerging":
        return {
          label: "Emerging",
          badgeClass: "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400",
          barClass: "bg-amber-500",
        };
      default:
        return {
          label: "Stable",
          badgeClass: "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
          barClass: "bg-emerald-500",
        };
    }
  };

  const getProfileHeader = () => {
    if (isUnassessed) {
      return {
        title: "Awaiting Baseline Check-in",
        subtitle: "Regulation profile and assigned pathway track will calibrate after the first check-in.",
        badge: "Pending Calibration",
        badgeColor: "bg-muted text-muted-foreground border-border",
      };
    }
    if (dossier?.is_balance_mode) {
      return {
        title: "All-Round Balance Mode",
        subtitle: `${firstName} demonstrates healthy regulation stability across all four core development areas.`,
        badge: "Balance Mode",
        badgeColor: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
      };
    }
    return {
      title: dossier?.pathway_track_name || "Personalized Regulation Pathway",
      subtitle: `Primary Skill Area: ${dossier?.primary_bucket || "LOAD_REGULATION"} • Support Area: ${dossier?.secondary_bucket || "ATTN_STABILITY"}`,
      badge: dossier?.pathway_track_id || "ACTIVE PATHWAY",
      badgeColor: "bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30",
    };
  };

  const profileHeader = getProfileHeader();

  return (
    <div className="space-y-6">
      {/* Top Banner: Assigned 16-Track Pathway or Balance Mode */}
      <div className="rounded-xl border border-border/70 bg-card p-6 sm:p-7 relative overflow-hidden transition-all shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
                WELLBEING REGULATION DOSSIER
              </span>
              <span className="text-muted-foreground/40">•</span>
              <Badge variant="outline" className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${profileHeader.badgeColor}`}>
                {profileHeader.badge}
              </Badge>
              {dossier?.overall_status && !isUnassessed && (
                <Badge variant="outline" className={`text-[10px] font-mono font-bold ${getTierBadge(dossier.overall_status).badgeClass}`}>
                  Overall Status: {dossier.overall_status}
                </Badge>
              )}
            </div>
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              {profileHeader.title}
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {profileHeader.subtitle}
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDossierModalOpen(true)}
              className="text-xs h-9 gap-2 rounded-lg border border-border/80 hover:bg-muted/50 font-medium cursor-pointer shadow-2xs"
            >
              <FolderOpen className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
              <span>Open Student Dossier</span>
              <ArrowUpRight className="h-3 w-3 opacity-60" />
            </Button>
            {isUnassessed && onOpenCheckin && (
              <Button
                size="sm"
                onClick={onOpenCheckin}
                className="text-xs h-9 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold cursor-pointer shadow-xs"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Start Check-in</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main Grid: Diamond 4-Pole Radar (Left) & 4 Core Regulation Buckets (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Column (5 cols): Diamond 4-Pole Radar Chart */}
        <div className="lg:col-span-5 rounded-xl border border-border/70 bg-card p-6 sm:p-7 relative overflow-hidden transition-all flex flex-col justify-between shadow-xs">
          <div className="space-y-1 pb-3 border-b border-border/40">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
                4-POLE REGULATION RADAR
              </span>
              <span className="text-[10px] font-mono text-muted-foreground">
                {isUnassessed ? "0 Check-ins" : `${dossier?.check_in_count || 1} Completed`}
              </span>
            </div>
            <h3 className="text-base font-semibold tracking-tight text-foreground">
              {firstName}&apos;s Stability Balance Map
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Four cardinal regulation poles evaluated against age-normative peer benchmarks.
            </p>
          </div>

          {isUnassessed ? (
            <div className="py-10 flex flex-col items-center justify-center text-center p-6 border border-dashed border-border/70 rounded-2xl my-4 space-y-2.5">
              <div className="h-12 w-12 rounded-full bg-muted/60 flex items-center justify-center text-muted-foreground">
                <Target className="h-6 w-6" />
              </div>
              <div className="space-y-1 max-w-xs">
                <p className="text-xs font-bold text-foreground">Awaiting Initial Check-in</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Once {firstName} completes their first wellbeing reflection, the 4-pole diamond radar will illuminate their regulation rhythm.
                </p>
              </div>
              {onOpenCheckin && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onOpenCheckin}
                  className="text-xs h-8 gap-1.5 mt-2 neo-well cursor-pointer"
                >
                  <Sparkles className="h-3 w-3 text-emerald-500" />
                  <span>Launch Reflection Now</span>
                </Button>
              )}
            </div>
          ) : (
            <div className="py-2 h-64 sm:h-72 w-full relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                  <PolarGrid stroke="currentColor" className="text-border/50" />
                  <PolarAngleAxis
                    dataKey="subject"
                    tickFormatter={(v: string) =>
                      v === "Attention & Focus Flow"
                        ? "Focus Flow"
                        : v === "Social Comfort & Belonging"
                        ? "Social Ease"
                        : v === "Calm & Stress Reset"
                        ? "Calm Reset"
                        : v === "Inner Grounding & Confidence"
                        ? "Grounding"
                        : v
                    }
                    tick={{ fill: "currentColor", fontSize: 10, fontWeight: 600 }}
                    className="text-foreground font-sans"
                  />
                  <RechartsTooltip
                    content={({ payload }) => {
                      if (!payload || !payload.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="p-2.5 rounded-xl bg-popover/95 border border-border shadow-md text-xs font-mono space-y-1">
                          <p className="font-bold text-foreground">{d.subject}</p>
                          <p className="text-sky-600 dark:text-sky-400">
                            {firstName}&apos;s Stability: {d.student}%
                          </p>
                          <p className="text-muted-foreground">Peer Benchmark: {d.benchmark}%</p>
                        </div>
                      );
                    }}
                  />
                  <Radar
                    name="Benchmark"
                    dataKey="benchmark"
                    stroke="#94a3b8"
                    strokeWidth={1.5}
                    strokeDasharray="3 3"
                    fill="#94a3b8"
                    fillOpacity={0.08}
                  />
                  <Radar
                    name="Student Stability"
                    dataKey="student"
                    stroke="#0ea5e9"
                    strokeWidth={2.5}
                    fill="#0ea5e9"
                    fillOpacity={0.25}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Radar Legend / Normative Indicator */}
          <div className="pt-3 border-t border-border/40 flex items-center justify-between text-[11px] text-muted-foreground font-mono">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-sky-500" />
              <span>{firstName}&apos;s Stability</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full border border-dashed border-slate-400" />
              <span>Peer Benchmark</span>
            </div>
          </div>
        </div>

        {/* Right Column (7 cols): 4 Core Regulation Buckets Grid */}
        <div className="lg:col-span-7 flex flex-col justify-between space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* 1. Calm & Stress Reset (LOAD_REGULATION) */}
            {(() => {
              const score = dossier?.load_regulation_score ?? 8;
              const tier = dossier?.load_tier;
              const badge = getTierBadge(tier);
              const pct = isUnassessed ? 0 : Math.round(((score - 8) / 24) * 100);

              return (
                <div className="rounded-xl border border-border/70 bg-card p-4 sm:p-5 relative overflow-hidden transition-all space-y-3 flex flex-col justify-between shadow-xs hover:border-amber-500/40">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                          <Moon className="h-4 w-4" />
                        </div>
                        <span className="text-xs font-bold text-foreground">
                          Calm & Stress Reset
                        </span>
                      </div>
                      <Badge variant="outline" className={`text-[10px] font-mono ${badge.badgeClass}`}>
                        {badge.label}
                      </Badge>
                    </div>

                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Sensory offloading and autonomic nervous system down-regulation after high study volume.
                    </p>
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-border/30">
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span className="text-muted-foreground">Friction Score</span>
                      <span className="font-bold text-foreground">
                        {isUnassessed ? "—" : `${score} / 32`}
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${badge.barClass}`}
                        style={{ width: `${isUnassessed ? 0 : Math.max(5, pct)}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* 2. Inner Grounding & Confidence (SELF_SAFETY) */}
            {(() => {
              const score = dossier?.self_safety_score ?? 8;
              const tier = dossier?.self_safety_tier;
              const badge = getTierBadge(tier);
              const pct = isUnassessed ? 0 : Math.round(((score - 8) / 24) * 100);

              return (
                <div className="rounded-xl border border-border/70 bg-card p-4 sm:p-5 relative overflow-hidden transition-all space-y-3 flex flex-col justify-between shadow-xs hover:border-rose-500/40">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
                          <Heart className="h-4 w-4" />
                        </div>
                        <span className="text-xs font-bold text-foreground">
                          Inner Grounding & Confidence
                        </span>
                      </div>
                      <Badge variant="outline" className={`text-[10px] font-mono ${badge.badgeClass}`}>
                        {badge.label}
                      </Badge>
                    </div>

                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Internal emotional security, freedom from evaluative shame, and confidence to make mistakes.
                    </p>
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-border/30">
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span className="text-muted-foreground">Friction Score</span>
                      <span className="font-bold text-foreground">
                        {isUnassessed ? "—" : `${score} / 32`}
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${badge.barClass}`}
                        style={{ width: `${isUnassessed ? 0 : Math.max(5, pct)}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* 3. Attention & Focus Flow (ATTN_STABILITY) */}
            {(() => {
              const score = dossier?.attn_stability_score ?? 8;
              const tier = dossier?.attn_tier;
              const badge = getTierBadge(tier);
              const pct = isUnassessed ? 0 : Math.round(((score - 8) / 24) * 100);

              return (
                <div className="rounded-xl border border-border/70 bg-card p-4 sm:p-5 relative overflow-hidden transition-all space-y-3 flex flex-col justify-between shadow-xs hover:border-sky-500/40">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
                          <Zap className="h-4 w-4" />
                        </div>
                        <span className="text-xs font-bold text-foreground">
                          Attention & Focus Flow
                        </span>
                      </div>
                      <Badge variant="outline" className={`text-[10px] font-mono ${badge.badgeClass}`}>
                        {badge.label}
                      </Badge>
                    </div>

                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Task initiation speed, cognitive resistance against distractions, and continuous study stamina.
                    </p>
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-border/30">
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span className="text-muted-foreground">Friction Score</span>
                      <span className="font-bold text-foreground">
                        {isUnassessed ? "—" : `${score} / 32`}
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${badge.barClass}`}
                        style={{ width: `${isUnassessed ? 0 : Math.max(5, pct)}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* 4. Social Comfort & Belonging (SOCIAL_COMFORT) */}
            {(() => {
              const score = dossier?.social_comfort_score ?? 8;
              const tier = dossier?.social_tier;
              const badge = getTierBadge(tier);
              const pct = isUnassessed ? 0 : Math.round(((score - 8) / 24) * 100);

              return (
                <div className="rounded-xl border border-border/70 bg-card p-4 sm:p-5 relative overflow-hidden transition-all space-y-3 flex flex-col justify-between shadow-xs hover:border-emerald-500/40">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                          <Users className="h-4 w-4" />
                        </div>
                        <span className="text-xs font-bold text-foreground">
                          Social Comfort & Belonging
                        </span>
                      </div>
                      <Badge variant="outline" className={`text-[10px] font-mono ${badge.badgeClass}`}>
                        {badge.label}
                      </Badge>
                    </div>

                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Peer boundary ease, navigating group dynamics without interpersonal fatigue or conflict drag.
                    </p>
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-border/30">
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span className="text-muted-foreground">Friction Score</span>
                      <span className="font-bold text-foreground">
                        {isUnassessed ? "—" : `${score} / 32`}
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${badge.barClass}`}
                        style={{ width: `${isUnassessed ? 0 : Math.max(5, pct)}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Quick Explanatory Footer */}
          <div className="p-3.5 rounded-xl neo-well flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
              <span className="text-[11px]">
                Scoring: Lower friction scores (&lt;15) represent high stability.
              </span>
            </div>
            <button
              onClick={() => setDossierModalOpen(true)}
              className="text-[11px] font-semibold text-sky-600 dark:text-sky-400 hover:underline cursor-pointer flex items-center gap-1"
            >
              <span>Full Wellbeing Breakdown</span>
              <ArrowUpRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Embedded Student Dossier Dialog (School-Matching) */}
      <StudentDossierDialog
        isOpen={dossierModalOpen}
        onClose={() => setDossierModalOpen(false)}
        student={dossier || null}
        isParent={true}
      />
    </div>
  );
}
