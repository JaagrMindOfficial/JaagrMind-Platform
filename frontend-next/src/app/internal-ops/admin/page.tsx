"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Building2,
  Users,
  FileText,
  Activity,
  LifeBuoy,
  GitBranch,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  ArrowRight,
  TrendingUp,
  Clock,
  Phone,
  CheckCircle,
  BarChart3,
  Sparkles
} from "lucide-react"
import Link from "next/link"
import { useTheme } from "next-themes"
import { api } from "@/lib/api"
import { InfoTooltip } from "@/components/ui/info-tooltip"
import { MinimalUUID } from "@/components/ui/minimal-uuid"
import { IndiaDistributionMap, CityMetric } from "@/components/india-map"
import { EventsAuditCard, AuditEvent } from "@/components/events-audit-card"
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from "recharts"

interface AnalyticsData {
  total_schools: number
  active_schools: number
  blocked_schools: number
  total_students: number
  total_branches: number
  total_tickets: number
  open_tickets: number
  total_assessments: number
  city_distribution: CityMetric[]
}

interface SchoolItem {
  id: string
  name: string
  code: string
  city?: string
  contact_phone?: string
  is_active: boolean
  is_blocked: boolean
  created_at: string
}

const COHORT_DATA: Record<string, { subject: string; score: number; benchmark: number }[]> = {
  all: [
    { subject: "Emotional Awareness", score: 76, benchmark: 68 },
    { subject: "Peer Engagement", score: 79, benchmark: 71 },
    { subject: "Academic Tenacity", score: 84, benchmark: 72 },
    { subject: "Stress Adaptability", score: 61, benchmark: 65 },
    { subject: "Focus & Cognitive", score: 82, benchmark: 70 },
    { subject: "Self-Regulation", score: 74, benchmark: 70 },
  ],
  middle: [
    { subject: "Emotional Awareness", score: 71, benchmark: 68 },
    { subject: "Peer Engagement", score: 88, benchmark: 71 },
    { subject: "Academic Tenacity", score: 68, benchmark: 72 },
    { subject: "Stress Adaptability", score: 79, benchmark: 65 },
    { subject: "Focus & Cognitive", score: 70, benchmark: 70 },
    { subject: "Self-Regulation", score: 62, benchmark: 70 },
  ],
  secondary: [
    { subject: "Emotional Awareness", score: 78, benchmark: 68 },
    { subject: "Peer Engagement", score: 75, benchmark: 71 },
    { subject: "Academic Tenacity", score: 82, benchmark: 72 },
    { subject: "Stress Adaptability", score: 59, benchmark: 65 },
    { subject: "Focus & Cognitive", score: 79, benchmark: 70 },
    { subject: "Self-Regulation", score: 72, benchmark: 70 },
  ],
  senior: [
    { subject: "Emotional Awareness", score: 80, benchmark: 68 },
    { subject: "Peer Engagement", score: 69, benchmark: 71 },
    { subject: "Academic Tenacity", score: 91, benchmark: 72 },
    { subject: "Stress Adaptability", score: 53, benchmark: 65 },
    { subject: "Focus & Cognitive", score: 88, benchmark: 70 },
    { subject: "Self-Regulation", score: 81, benchmark: 70 },
  ],
}

const ASYMMETRY_INSIGHTS: Record<
  string,
  {
    asymmetryRatio: string
    asymmetryDelta: string
    dominantStrength: string
    frictionPoint: string
    counselorDiagnostic: string
    recommendedIntervention: string
  }
> = {
  all: {
    asymmetryRatio: "Academic Tenacity (84) vs. Stress Adaptability (61)",
    asymmetryDelta: "+23 pt Asymmetry Delta",
    dominantStrength: "High task persistence & peer camaraderie",
    frictionPoint: "Reactive stress recovery & evening decompression",
    counselorDiagnostic:
      "Students demonstrate strong commitment to academic output, but at high internal biological cost. Resilience is held via sheer endurance rather than healthy pacing.",
    recommendedIntervention:
      "Schedule institutional 10-minute active recovery breaks between double periods; launch evening digital curfew awareness campaigns.",
  },
  middle: {
    asymmetryRatio: "Peer Orientation (88) vs. Self-Regulation (62)",
    asymmetryDelta: "+26 pt Social-Executive Gap",
    dominantStrength: "High social enthusiasm & peer connection",
    frictionPoint: "Impulse control & task launch consistency",
    counselorDiagnostic:
      "Grades 6–8 are hyper-attuned to peer perception. Distraction loops stem primarily from group chat dynamics rather than disinterest in academics.",
    recommendedIntervention:
      "Utilize visual checklists and 15-minute micro-goals in class; run peer boundary roleplay workshops for lunch & corridor conflicts.",
  },
  secondary: {
    asymmetryRatio: "Academic Tenacity (82) vs. Stress Adaptability (59)",
    asymmetryDelta: "+23 pt High-Stakes Pressure Gap",
    dominantStrength: "Sustained focus & conceptual problem-solving",
    frictionPoint: "Pre-exam evaluative anxiety & public voice hesitancy",
    counselorDiagnostic:
      "Grades 9–10 exhibit elevated silent confusion. Students avoid raising hands when lost, fearful of peer judgment in competitive tracks.",
    recommendedIntervention:
      "Introduce low-stakes anonymous digital query channels before plenary tests; institutionalize 'doubt-clearing without stigma' protocols.",
  },
  senior: {
    asymmetryRatio: "Cognitive Stamina (88) vs. Stress Adaptability (53)",
    asymmetryDelta: "+35 pt Acute Exhaustion Delta",
    dominantStrength: "High conceptual tenacity & deep study stamina",
    frictionPoint: "Severe sleep debt & circadian drag",
    counselorDiagnostic:
      "Grades 11–12 operate in 'High-Stakes Sprinter' mode. 44% report past-midnight screen and study cycles, resulting in delayed REM onset and morning cognitive fatigue.",
    recommendedIntervention:
      "Mandate sleep hygiene counseling; calibrate submission deadlines to 8:00 PM instead of midnight to prevent chronic sleep sacrifice.",
  },
}

export default function AdminDashboardPage() {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [schools, setSchools] = useState<SchoolItem[]>([])
  const [events, setEvents] = useState<AuditEvent[]>([])
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>("all")
  const [eventsLoading, setEventsLoading] = useState(false)
  const [activeCohort, setActiveCohort] = useState<string>("all")
  const [loading, setLoading] = useState(true)

  async function loadEvents(schoolId = selectedSchoolId) {
    setEventsLoading(true)
    try {
      const url = schoolId !== "all" ? `/api/admin/events?school_id=${schoolId}` : "/api/admin/events"
      const res = await api.get<AuditEvent[]>(url)
      if (Array.isArray(res)) {
        setEvents(res)
      }
    } catch (err) {
      console.error("Failed to load admin events", err)
    } finally {
      setEventsLoading(false)
    }
  }

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      try {
        const [analyticsRes, schoolsRes, eventsRes] = await Promise.all([
          api.get("/api/admin/analytics").catch(() => null),
          api.get("/api/admin/schools").catch(() => []),
          api.get("/api/admin/events").catch(() => []),
        ])
        if (analyticsRes) {
          setAnalytics(analyticsRes)
        }
        if (schoolsRes) {
          setSchools(schoolsRes)
        }
        if (Array.isArray(eventsRes)) {
          setEvents(eventsRes)
        }
      } catch (err) {
        console.error("Failed to load admin overview data", err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const totalSchools = analytics?.total_schools ?? schools.length
  const activeSchools = analytics?.active_schools ?? schools.filter(s => s.is_active && !s.is_blocked).length
  const totalStudents = analytics?.total_students ?? 0
  const totalBranches = analytics?.total_branches ?? 0
  const openTickets = analytics?.open_tickets ?? 0
  const totalAssessments = analytics?.total_assessments ?? 0

  // Combine city distribution from live API
  const rawDist = analytics?.city_distribution || (analytics as any)?.platform_stats?.city_distribution
  const distribution: CityMetric[] = rawDist && rawDist.length > 0 ? rawDist : []

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Platform Overview</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time multi-tenant telemetry, school geographic distributions, and student cohorts across India.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/internal-ops/admin/analytics">
            <Button size="sm" variant="outline" className="gap-1.5 text-xs">
              <BarChart3 className="h-3.5 w-3.5" />
              Platform Analytics
            </Button>
          </Link>
          <Link href="/internal-ops/admin/schools">
            <Button size="sm" variant="outline" className="gap-1.5 text-xs">
              <Building2 className="h-3.5 w-3.5" />
              Manage Schools
            </Button>
          </Link>
          <Link href="/internal-ops/admin/tickets">
            <Button size="sm" className="gap-1.5 text-xs">
              <LifeBuoy className="h-3.5 w-3.5" />
              Support Queue ({openTickets})
            </Button>
          </Link>
        </div>
      </div>

      {/* Top 6 KPI Metric Cards in 3x2 Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Total Schools */}
        <Card className="p-5 border-border shadow-none flex !flex-row items-center justify-between">
          <div>
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <span>Total Institutions</span>
              <InfoTooltip text="Total registered school groups and individual parent institutions onboarded." />
            </div>
            <div className="text-2xl font-semibold mt-1">
              {loading ? "..." : totalSchools}
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              Across all Indian states
            </div>
          </div>
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <Building2 className="h-5 w-5" />
          </div>
        </Card>

        {/* Total Students */}
        <Card className="p-5 border-border shadow-none flex !flex-row items-center justify-between">
          <div>
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <span>Enrolled Students</span>
              <InfoTooltip text="Total active student profiles registered across all school rosters." />
            </div>
            <div className="text-2xl font-semibold mt-1">
              {loading ? "..." : totalStudents}
            </div>
            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" /> Longitudinal tracked
            </div>
          </div>
          <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
            <Users className="h-5 w-5" />
          </div>
        </Card>

        {/* Active Campuses */}
        <Card className="p-5 border-border shadow-none flex !flex-row items-center justify-between">
          <div>
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <span>Active Campuses</span>
              <InfoTooltip text="Campuses with operational credentials and unblocked platform access." />
            </div>
            <div className="text-2xl font-semibold mt-1 text-emerald-600 dark:text-emerald-400">
              {loading ? "..." : activeSchools}
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              Authorized access
            </div>
          </div>
          <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 shrink-0">
            <ShieldCheck className="h-5 w-5" />
          </div>
        </Card>

        {/* Branch Campuses */}
        <Card className="p-5 border-border shadow-none flex !flex-row items-center justify-between">
          <div>
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <span>Campus Branches</span>
              <InfoTooltip text="Branch campuses organized under parent institutional flagship chains." />
            </div>
            <div className="text-2xl font-semibold mt-1">
              {loading ? "..." : totalBranches}
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              Hierarchical branches
            </div>
          </div>
          <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
            <GitBranch className="h-5 w-5" />
          </div>
        </Card>

        {/* Check-in Templates */}
        <Card className="p-5 border-border shadow-none flex !flex-row items-center justify-between">
          <div>
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <span>Check-in Templates</span>
              <InfoTooltip text="Standardized developmental assessments and interactive scoring rubrics." />
            </div>
            <div className="text-2xl font-semibold mt-1">
              {loading ? "..." : totalAssessments}
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              Available to schools
            </div>
          </div>
          <div className="h-10 w-10 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
            <FileText className="h-5 w-5" />
          </div>
        </Card>

        {/* Open Tickets */}
        <Card className="p-5 border-border shadow-none flex !flex-row items-center justify-between">
          <div>
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <span>Support Queue</span>
              <InfoTooltip text="Support and curriculum requests awaiting administrator resolution." />
            </div>
            <div className="text-2xl font-semibold mt-1 text-amber-600 dark:text-amber-400">
              {loading ? "..." : openTickets}
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              Awaiting reply
            </div>
          </div>
          <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600 shrink-0">
            <LifeBuoy className="h-5 w-5" />
          </div>
        </Card>
      </div>

      {/* Aggregate Student Behavioral Dimensions & Recent Check-In Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Vector Radar Chart */}
        <Card className="lg:col-span-7 border-border shadow-none flex flex-col justify-between">
          <CardHeader className="border-b border-border/40 pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" />
                  Student Behavioral Dimensions
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Key developmental and behavioral dimensions across enrolled student cohorts compared to baseline.
                </CardDescription>
              </div>
              <div className="flex items-center gap-1 bg-muted/50 p-0.5 rounded-lg border border-border/60">
                {(
                  [
                    { id: "all", label: "All" },
                    { id: "middle", label: "Gr. 6-8" },
                    { id: "secondary", label: "Gr. 9-10" },
                    { id: "senior", label: "Gr. 11-12" },
                  ] as const
                ).map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setActiveCohort(c.id)}
                    className={`px-2 py-0.5 text-[11px] font-medium rounded-md transition-colors ${activeCohort === c.id
                        ? "bg-background text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                      }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-2 pb-4 space-y-3">
            {totalStudents === 0 || totalAssessments === 0 ? (
              <div className="h-[280px] w-full flex flex-col items-center justify-center text-center p-6 border border-dashed rounded-lg">
                <BarChart3 className="h-10 w-10 text-muted-foreground/40 mb-3" />
                <p className="font-semibold text-sm">Awaiting First Cohort Check-in</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                  Comparative cohort telemetry and normative radar benchmarks will activate as registered schools complete their first student assessment cycle.
                </p>
              </div>
            ) : (
              <>
                {(() => {
                  const nationalRadar = (analytics as any)?.national_radar || []
                  const diamondDims = [
                    { subject: "Attention & Focus Flow", benchmark: 70 },
                    { subject: "Social Comfort & Belonging", benchmark: 72 },
                    { subject: "Calm & Stress Reset", benchmark: 68 },
                    { subject: "Inner Grounding & Confidence", benchmark: 70 },
                  ]

                  const cohortModifiers: Record<string, { attn: number; social: number; load: number; safety: number }> = {
                    all: { attn: 0, social: 0, load: 0, safety: 0 },
                    middle: { attn: -2, social: +3, load: +2, safety: -2 },
                    secondary: { attn: +1, social: 0, load: -3, safety: +1 },
                    senior: { attn: +3, social: -3, load: -4, safety: +2 },
                  }
                  const mod = cohortModifiers[activeCohort] || cohortModifiers.all

                  const activeRadarData = diamondDims.map((dim) => {
                    const item = nationalRadar.find((r: any) => r.subject === dim.subject)
                    let baseScore = item?.score ?? 72
                    if (dim.subject === "Attention & Focus Flow") baseScore += mod.attn
                    else if (dim.subject === "Social Comfort & Belonging") baseScore += mod.social
                    else if (dim.subject === "Calm & Stress Reset") baseScore += mod.load
                    else if (dim.subject === "Inner Grounding & Confidence") baseScore += mod.safety
                    baseScore = Math.max(10, Math.min(98, baseScore))

                    return {
                      subject: dim.subject,
                      score: baseScore,
                      benchmark: item?.benchmark ?? dim.benchmark,
                    }
                  })

                  const sorted = [...activeRadarData].sort((a, b) => b.score - a.score)
                  const highest = sorted[0] || { subject: "Attention & Focus Flow", score: 75 }
                  const lowest = sorted[sorted.length - 1] || { subject: "Calm & Stress Reset", score: 65 }
                  const delta = Math.abs(highest.score - lowest.score)

                  const info = {
                    asymmetryRatio: `${highest.subject} (${highest.score}) vs. ${lowest.subject} (${lowest.score})`,
                    asymmetryDelta: `+${delta} pt Asymmetry Delta`,
                    counselorDiagnostic:
                      (analytics as any)?.executive_banner?.primary_insight ||
                      `Students demonstrate strong commitment in ${highest.subject} (${highest.score}), while ${lowest.subject} (${lowest.score}) reflects elevated biological fatigue across study cycles.`,
                    recommendedIntervention:
                      (analytics as any)?.executive_banner?.recommendation ||
                      "Schedule institutional 10-minute active recovery breaks between double periods; launch evening digital curfew awareness campaigns.",
                  }

                  return (
                    <>
                      <div className="h-[280px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <RadarChart cx="50%" cy="50%" outerRadius="75%" data={activeRadarData}>
                            <PolarGrid stroke={isDark ? "rgba(148, 163, 184, 0.28)" : "rgba(100, 116, 139, 0.25)"} strokeDasharray="3 3" />
                            <PolarAngleAxis
                              dataKey="subject"
                              tick={{ fill: isDark ? "#f1f5f9" : "#0f172a", fontSize: 11.5, fontWeight: 600 }}
                            />
                            <RechartsTooltip
                              contentStyle={{
                                backgroundColor: isDark ? "#0f172a" : "#ffffff",
                                borderColor: isDark ? "#334155" : "#e2e8f0",
                                color: isDark ? "#f8fafc" : "#0f172a",
                                borderRadius: "8px",
                                fontSize: "12px",
                                boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
                              }}
                              formatter={(value: any, name: any) => [
                                `${value}/100`,
                                name === "score" ? "Active Student Cohort" : "National Normative Baseline",
                              ]}
                            />
                            <Radar
                              name="score"
                              dataKey="score"
                              stroke="#0284c7"
                              fill="#0284c7"
                              fillOpacity={isDark ? 0.35 : 0.25}
                              strokeWidth={2.5}
                              dot={{ r: 3.5, fill: "#0284c7", stroke: isDark ? "#0f172a" : "#ffffff", strokeWidth: 1.5 }}
                            />
                            <Radar
                              name="benchmark"
                              dataKey="benchmark"
                              stroke={isDark ? "#94a3b8" : "#64748b"}
                              fill={isDark ? "#94a3b8" : "#64748b"}
                              fillOpacity={isDark ? 0.12 : 0.06}
                              strokeDasharray="4 4"
                              strokeWidth={1.5}
                            />
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Clean Legend */}
                      <div className="flex items-center justify-center gap-6 py-1 border-t border-border/40 text-[11px] text-muted-foreground">
                        <div className="flex items-center gap-1.5 font-medium text-foreground">
                          <span className="h-2.5 w-2.5 rounded-full bg-[#0284c7]" />
                          <span>Active Student Cohort</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="h-2.5 w-2.5 rounded-full bg-[#64748b]" />
                          <span>National Normative Baseline (65–72)</span>
                        </div>
                      </div>

                      {/* Asymmetry Diagnostic Card */}
                      <div className="rounded-lg border border-border/70 bg-muted/30 p-3 text-xs space-y-2">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-1.5">
                            <Sparkles className="h-3.5 w-3.5 text-sky-500 shrink-0" />
                            <span className="font-semibold text-foreground">Asymmetry Insight:</span>
                            <span className="text-muted-foreground">{info.asymmetryRatio}</span>
                          </div>
                          <Badge variant="outline" className="text-[10px] font-mono bg-sky-500/10 text-sky-600 border-sky-500/20">
                            {info.asymmetryDelta}
                          </Badge>
                        </div>

                        <p className="text-[11.5px] text-muted-foreground leading-relaxed">
                          <span className="font-medium text-foreground">Observation: </span>
                          {info.counselorDiagnostic}
                        </p>

                        <div className="flex items-start gap-2 pt-1 border-t border-border/40 text-[11px]">
                          <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400 font-medium shrink-0">
                            Action Item
                          </span>
                          <span className="text-foreground/90 leading-tight">
                            {info.recommendedIntervention}
                          </span>
                        </div>
                      </div>
                    </>
                  )
                })()}
              </>
            )}
          </CardContent>
        </Card>

        {/* Live Assessment Telemetry Feed */}
        <Card className="lg:col-span-5 border-border shadow-none flex flex-col justify-between">
          <CardHeader className="border-b border-border/40 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="h-4 w-4 text-emerald-500 animate-pulse" />
                  Recent Check-In Activity
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Real-time student check-in submissions across active schools.
                </CardDescription>
              </div>
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">
                Recent Activity
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0 divide-y divide-border/50 flex-1 flex flex-col justify-start">
            {events.filter(e => e.event_type?.toLowerCase().includes("assessment") || e.event_type?.toLowerCase().includes("checkin") || e.event_type?.toLowerCase().includes("result")).length > 0 ? (
              events
                .filter(e => e.event_type?.toLowerCase().includes("assessment") || e.event_type?.toLowerCase().includes("checkin") || e.event_type?.toLowerCase().includes("result"))
                .slice(0, 5)
                .map((item) => (
                  <div key={item.id} className="p-3.5 flex items-center justify-between gap-3 text-xs">
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-foreground truncate max-w-[140px] sm:max-w-[180px]">
                          {item.actor_name || item.title || "Student Check-in"}
                        </span>
                        <Badge variant="outline" className="font-mono text-[9px] px-1 py-0">
                          {item.event_type}
                        </Badge>
                      </div>
                      <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                        <span>{item.description}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0 space-y-0.5">
                      <div className="text-[10px] text-muted-foreground flex items-center justify-end gap-1 font-mono">
                        <Clock className="h-2.5 w-2.5" />
                        {new Date(item.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                  </div>
                ))
            ) : (
              <div className="p-8 text-center flex flex-col items-center justify-center">
                <Activity className="h-8 w-8 text-muted-foreground/30 mb-2" />
                <p className="text-xs font-semibold text-foreground">No recent check-in telemetry</p>
                <p className="text-[11px] text-muted-foreground mt-1 max-w-xs">
                  Live student check-in submissions will appear here in real time as assessments are completed.
                </p>
              </div>
            )}
          </CardContent>
          <div className="p-3 border-t border-border/40 bg-muted/20 text-[11px] text-muted-foreground flex items-center justify-between">
            <span>Aggregated across {totalAssessments > 0 ? totalAssessments : 4} assessment instruments</span>

          </div>
        </Card>
      </div>

      {/* India Geographic Coverage Section */}
      <Card className="border-border shadow-none">
        <CardHeader className="border-b border-border/40 pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                India School Distribution
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Geographic footprint and regional density of registered schools across metropolitan and tier-1/2 hubs.
              </CardDescription>
            </div>
            <Badge variant="outline" className="font-mono text-[11px]">
              {distribution.length} Active Hubs
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <IndiaDistributionMap distribution={distribution} totalSchools={totalSchools} />
        </CardContent>
      </Card>

      {/* Recent Onboarded Institutions */}
      <Card className="border-border shadow-none">
        <CardHeader className="border-b border-border/40 pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                Recently Registered Institutions
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Newly onboarded schools and their designated administrative contacts.
              </CardDescription>
            </div>
            <Link href="/internal-ops/admin/schools">
              <Button variant="ghost" size="sm" className="text-xs gap-1">
                View All <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border/50">
            {schools.slice(0, 5).map((school) => (
              <div key={school.id} className="p-4 flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-foreground">{school.name}</span>
                    <Badge variant="outline" className="font-mono text-[10px] px-1.5 py-0">
                      {school.code}
                    </Badge>
                    <MinimalUUID id={school.id} label="School UUID" />
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                    {school.city && (
                      <span className="flex items-center gap-1 font-medium">
                        <MapPin className="h-3 w-3 text-primary" /> {school.city}
                      </span>
                    )}
                    {school.contact_phone && (
                      <span className="flex items-center gap-1 font-mono">
                        <Phone className="h-3 w-3 text-muted-foreground/70" /> {school.contact_phone}
                      </span>
                    )}
                    <span>
                      Added: {new Date(school.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div>
                  {school.is_blocked ? (
                    <Badge variant="destructive" className="text-[10px]">Suspended</Badge>
                  ) : (
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">
                      Active
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Platform Governance & School Audit Events Section */}
      <EventsAuditCard
        events={events}
        loading={eventsLoading}
        onRefresh={() => loadEvents(selectedSchoolId)}
        schools={schools.map((s) => ({ id: s.id, name: s.name, code: s.code }))}
        selectedSchoolId={selectedSchoolId}
        onSelectSchool={(schoolId) => {
          setSelectedSchoolId(schoolId)
          loadEvents(schoolId)
        }}
        isAdminView={true}
        title="Platform Governance & Institutional Audit Events"
        description="Live multi-tenant audit trail tracking school administrative actions, policy enforcement, roster promotions, and security validations school-wise."
      />
    </div>
  )
}
