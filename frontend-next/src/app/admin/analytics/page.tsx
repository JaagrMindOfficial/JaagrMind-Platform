"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  School,
  Users,
  FolderOpen,
  Eye,
  HeartHandshake,
  Clock,
  Sparkles,
  ArrowUpRight,
  CheckCircle2,
  Lightbulb,
  Building2,
  GitBranch,
  Search,
  Filter,
  ArrowLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  GraduationCap,
  Layers,
  BarChart3,
} from "lucide-react"
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from "recharts"
import { api } from "@/lib/api"
import { useTheme } from "next-themes"
import { StudentDossierDialog, StudentProfileData } from "@/components/student-dossier-dialog"

interface ArchetypeItem {
  id: string
  name: string
  percentage: number
  tag: string
  color: "emerald" | "amber" | "sky" | "rose"
  description: string
  counselorStrategy: string
}

interface GradeHeatmapItem {
  grade: string
  tier: string
  focusScore: number
  resilienceScore: number
  peerDynamicsScore: number
  recoveryScore: number
  primaryFriction: string
  actionPriority: "Standard" | "Moderate" | "Elevated" | "High Alert" | "Urgent"
  actionGuide: string
}

interface SchoolComparisonItem {
  id: string
  name: string
  school_code: string
  city: string
  state: string
  branch_count: number
  total_students: number
  completed_checkins: number
  completion_rate: number
  avg_focus: number
  avg_resilience: number
  dominant_friction: string
  dominant_archetype: string
  status: string
}

interface AdminAnalyticsResponse {
  total_schools?: number
  active_schools?: number
  blocked_schools?: number
  total_students?: number
  total_assessments?: number
  national_radar?: Array<{
    subject: string
    score: number
    benchmark: number
  }>
  platform_stats: {
    total_schools: number
    active_schools: number
    blocked_schools: number
    total_students: number
    total_assessments: number
  }
  support_stats: {
    total_tickets: number
    open_tickets: number
  }
  executive_banner?: {
    primary_insight: string
    recommendation: string
    impact_score: string
  }
  friction_diagnostics?: {
    task_initiation: {
      high_barrier: number
      moderate_latency: number
      fluid_flow: number
      diagnostic: string
    }
    classroom_voice: {
      evaluative_silence: number
      selective_asking: number
      active_inquiry: number
      diagnostic: string
    }
    peer_boundary_strain: {
      acute_mediation: number
      moderate_crosscurrents: number
      grounded: number
      diagnostic: string
    }
    screen_drag: {
      severe_sleep_debt: number
      mild_evening_drag: number
      restorative: number
      diagnostic: string
    }
  }
  archetypes?: ArchetypeItem[]
  grade_heatmaps?: GradeHeatmapItem[]
  schools_comparison?: SchoolComparisonItem[]
  schools_list?: Array<{ id: string; name: string; city: string; school_code: string }>
}

export default function AdminAnalyticsPage() {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"

  const [data, setData] = useState<AdminAnalyticsResponse | null>(null)
  const [loading, setLoading] = useState(true)

  // School drilldown state
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>("all")
  const [schoolData, setSchoolData] = useState<any | null>(null)
  const [schoolLoading, setSchoolLoading] = useState(false)

  // Filter states
  const [selectedTier, setSelectedTier] = useState<string>("all")
  const [selectedBranch, setSelectedBranch] = useState<string>("all")
  const [selectedGrade, setSelectedGrade] = useState<string>("all")
  const [selectedSection, setSelectedSection] = useState<string>("all")
  const [studentSearch, setStudentSearch] = useState<string>("")

  // Student dossier modal state
  const [selectedStudent, setSelectedStudent] = useState<StudentProfileData | null>(null)
  const [isDossierOpen, setIsDossierOpen] = useState(false)

  // Fetch National / Platform-wide Analytics
  useEffect(() => {
    async function fetchData() {
      try {
        const res = await api.get("/api/admin/analytics")
        setData(res)
      } catch (err) {
        console.error("Failed to load admin analytics", err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  // Fetch Individual School Analytics when a school is selected
  useEffect(() => {
    if (selectedSchoolId === "all") {
      setSchoolData(null)
      return
    }

    async function fetchSchoolDetails() {
      setSchoolLoading(true)
      try {
        const params = new URLSearchParams()
        params.append("school_id", selectedSchoolId)
        if (selectedBranch !== "all") params.append("branch_id", selectedBranch)
        if (selectedGrade !== "all") params.append("grade", selectedGrade)
        if (selectedSection !== "all") params.append("section", selectedSection)

        const res = await api.get(`/api/admin/analytics?${params.toString()}`)
        setSchoolData(res)
      } catch (err) {
        console.error("Failed to load individual school analytics", err)
      } finally {
        setSchoolLoading(false)
      }
    }

    fetchSchoolDetails()
  }, [selectedSchoolId, selectedBranch, selectedGrade, selectedSection])

  if (loading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto pb-10">
        <div className="h-8 w-64 bg-muted/60 animate-pulse rounded" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="h-28 animate-pulse bg-muted/30" />
          ))}
        </div>
      </div>
    )
  }

  if (!data) {
    return <div className="text-muted-foreground p-6">Failed to load platform analytics.</div>
  }

  const schoolsList = data.schools_list || []
  const schoolsComparison = data.schools_comparison || []

  // National Radar Data from API aligned with 4-Pole Diamond Radar standard
  const diamondOrder = [
    "Attention & Focus Flow",
    "Social Comfort & Belonging",
    "Calm & Stress Reset",
    "Inner Grounding & Confidence",
  ]
  const nationalRadarData: Array<{ subject: string; score: number; benchmark: number }> =
    data.national_radar && data.national_radar.length > 0
      ? diamondOrder.map((dim) => {
          const match = data.national_radar?.find((r: any) => r.subject === dim)
          return {
            subject: dim,
            score: match?.score ?? 0,
            benchmark: match?.benchmark ?? (dim === "Social Comfort & Belonging" ? 72 : dim === "Calm & Stress Reset" ? 68 : 70),
          }
        })
      : diamondOrder.map((dim) => ({ subject: dim, score: 0, benchmark: 70 }))

  const totalEvaluationsCount =
    schoolsComparison.reduce((acc: number, s: any) => acc + (s.completed_checkins || 0), 0) ||
    (data.total_assessments || 0)
  const hasNationalRadarData = totalEvaluationsCount > 0 && nationalRadarData.some((r) => r.score > 0)

  // Filtered Students for School Drilldown
  const filteredStudents: StudentProfileData[] = (schoolData?.students || []).filter((s: StudentProfileData) => {
    if (!studentSearch) return true
    const term = studentSearch.toLowerCase()
    return (
      s.name.toLowerCase().includes(term) ||
      s.access_id.toLowerCase().includes(term) ||
      s.grade.toLowerCase().includes(term) ||
      (s.archetype || s.regulation_profile || "").toLowerCase().includes(term)
    )
  })

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Top Header & School Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 rounded-xl border border-border/60 bg-card shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Institutional Behavioral Insights
            </h1>
            <Badge variant="outline" className="text-[11px] font-medium bg-primary/10 text-primary border-primary/20">
              {selectedSchoolId === "all" ? "Pan-Campus Aggregate" : "School Drilldown"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {selectedSchoolId === "all"
              ? "Comparative diagnostic telemetry, cohort friction signals, and institutional resilience benchmarks."
              : `Deep behavioral diagnostic profile, class dynamics, and student rosters for ${schoolData?.school_name || "selected institution"}.`}
          </p>
        </div>

        {/* Top School Switcher Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">View Scope:</span>
          <select
            value={selectedSchoolId}
            onChange={(e) => {
              setSelectedSchoolId(e.target.value)
              setSelectedBranch("all")
              setSelectedGrade("all")
              setSelectedSection("all")
              setStudentSearch("")
            }}
            className="flex h-9 rounded-lg border border-input bg-background px-3 py-1 text-xs shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-medium text-foreground min-w-[220px]"
          >
            <option value="all">All Schools (National Overview)</option>
            {schoolsList.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.city})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {/* MODE 1: ALL SCHOOLS (NATIONAL & COMPARATIVE BENCHMARK) */}
      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {selectedSchoolId === "all" && (
        <div className="space-y-6">
          {/* Executive Cohort Banner */}
          {data.executive_banner && (
            <Card className="border-sky-500/20 bg-gradient-to-r from-sky-500/10 via-primary/5 to-transparent shadow-xs">
              <CardContent className="p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 shrink-0">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-sky-600 dark:text-sky-400">
                        {data.executive_banner.impact_score}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-foreground leading-snug">
                      {data.executive_banner.primary_insight}
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      <strong className="text-foreground">Counselor Directive:</strong> {data.executive_banner.recommendation}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Platform Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card className="border-border/60">
              <CardContent className="p-4 space-y-1">
                <span className="text-xs text-muted-foreground font-medium">Affiliated Institutions</span>
                <div className="text-2xl font-bold text-foreground">{data.platform_stats.total_schools}</div>
                <div className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  {data.platform_stats.active_schools} Active Campuses
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60">
              <CardContent className="p-4 space-y-1">
                <span className="text-xs text-muted-foreground font-medium">Enrolled Students</span>
                <div className="text-2xl font-bold text-foreground">{data.platform_stats.total_students}</div>
                <span className="text-[11px] text-muted-foreground">Across Grades 6–12</span>
              </CardContent>
            </Card>

            <Card className="border-border/60">
              <CardContent className="p-4 space-y-1">
                <span className="text-xs text-muted-foreground font-medium">Completed Evaluations</span>
                <div className="text-2xl font-bold text-foreground">
                  {schoolsComparison.reduce((acc, s) => acc + s.completed_checkins, 0)}
                </div>
                <span className="text-[11px] text-sky-600 dark:text-sky-400">Multi-Vector Check-ins</span>
              </CardContent>
            </Card>

            <Card className="border-border/60">
              <CardContent className="p-4 space-y-1">
                <span className="text-xs text-muted-foreground font-medium">Support Inquiries</span>
                <div className="text-2xl font-bold text-foreground">{data.support_stats.total_tickets}</div>
                <span className="text-[11px] text-amber-600 dark:text-amber-400">
                  {data.support_stats.open_tickets} Pending Follow-ups
                </span>
              </CardContent>
            </Card>
          </div>

          {/* Cross-School Comparative Intelligence Table */}
          <Card className="border-border/70 shadow-xs">
            <CardHeader className="pb-3 border-b border-border/40">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <School className="h-4 w-4 text-primary" />
                    <CardTitle className="text-base font-semibold">
                      School-by-School Comparative Diagnostics
                    </CardTitle>
                  </div>
                  <CardDescription className="text-xs">
                    Individual school resilience indices, check-in completion rates, and primary friction hotspots. Click any school to inspect its full dossier.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-[11px] font-mono self-start sm:self-auto">
                  {schoolsComparison.length} Schools Benchmarked
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow className="text-[11px]">
                      <TableHead>Institution</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Students & Branches</TableHead>
                      <TableHead>Check-In Rate</TableHead>
                      <TableHead>Focus / Resilience</TableHead>
                      <TableHead>Dominant Friction Hotspot</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {schoolsComparison.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-32 text-center text-muted-foreground text-xs">
                          No affiliated institutions benchmarked yet. Campuses will populate as they onboard and sync student cohorts.
                        </TableCell>
                      </TableRow>
                    ) : (
                      schoolsComparison.map((s) => (
                      <TableRow key={s.id} className="text-xs hover:bg-muted/20 transition-colors">
                        <TableCell>
                          <div className="space-y-0.5">
                            <span className="font-semibold text-foreground">{s.name}</span>
                            <div className="text-[10px] font-mono text-muted-foreground">{s.school_code}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-muted-foreground">{s.city}, {s.state}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <Users className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="font-medium text-foreground">{s.total_students}</span>
                            {s.branch_count > 0 && (
                              <Badge variant="outline" className="text-[10px] py-0 px-1.5 bg-muted/50">
                                {s.branch_count} {s.branch_count === 1 ? "branch" : "branches"}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1 w-28">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-semibold text-foreground">{s.completion_rate}%</span>
                              <span className="text-[10px] text-muted-foreground">({s.completed_checkins})</span>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full transition-all"
                                style={{ width: `${s.completion_rate}%` }}
                              />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px] bg-sky-500/10 text-sky-600 border-sky-500/20">
                              Focus: {s.avg_focus}
                            </Badge>
                            <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                              Resilience: {s.avg_resilience}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/5">
                            {s.dominant_friction}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="default"
                            className="text-xs h-8 gap-1"
                            onClick={() => setSelectedSchoolId(s.id)}
                          >
                            Inspect School
                            <ArrowUpRight className="h-3 w-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* National Radar Chart & Friction Diagnostics */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <Card className="lg:col-span-5 border-border/70 shadow-xs">
              <CardHeader className="pb-2 border-b border-border/40">
                <CardTitle className="text-base font-semibold">National Behavioral Radar</CardTitle>
                <CardDescription className="text-xs">
                  Active aggregate cohort polygon vs normative school baseline.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                {!hasNationalRadarData ? (
                  <div className="h-72 w-full flex flex-col items-center justify-center text-center p-6 border border-dashed rounded-lg">
                    <BarChart3 className="h-10 w-10 text-muted-foreground/30 mb-3" />
                    <p className="font-semibold text-sm text-foreground">Awaiting Cohort Telemetry</p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                      National behavioral polygon will render dynamically once affiliated campuses or independent students complete diagnostic check-ins.
                    </p>
                  </div>
                ) : (
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="75%" data={nationalRadarData}>
                        <PolarGrid stroke={isDark ? "#334155" : "#e2e8f0"} strokeDasharray="3 3" />
                        <PolarAngleAxis
                          dataKey="subject"
                          tick={{ fill: isDark ? "#f1f5f9" : "#1e293b", fontSize: 11, fontWeight: 500 }}
                        />
                        <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                        <Radar
                          name="Active Cohort"
                          dataKey="score"
                          stroke="#0284c7"
                          fill="#0284c7"
                          fillOpacity={0.25}
                          strokeWidth={2}
                        />
                        <Radar
                          name="Baseline Norm"
                          dataKey="benchmark"
                          stroke={isDark ? "#64748b" : "#94a3b8"}
                          fill={isDark ? "#64748b" : "#94a3b8"}
                          fillOpacity={0.1}
                          strokeWidth={1.5}
                          strokeDasharray="3 3"
                        />
                        <RechartsTooltip
                          contentStyle={{
                            backgroundColor: isDark ? "#0f172a" : "#ffffff",
                            borderColor: isDark ? "#334155" : "#e2e8f0",
                            fontSize: "11px",
                          }}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 4 Friction Gauges */}
            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card className="border-border/60 shadow-xs">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-sky-500" />
                      Task Initiation Barrier
                    </span>
                    {(() => {
                      const high = data.friction_diagnostics?.task_initiation?.high_barrier ?? 0
                      const mod = data.friction_diagnostics?.task_initiation?.moderate_latency ?? 0
                      if (totalEvaluationsCount === 0) {
                        return <Badge variant="outline" className="text-[10px] text-muted-foreground border-border/60">0% Pending Data</Badge>
                      }
                      if (high > 0) {
                        return <Badge variant="outline" className="text-[10px] text-amber-600 bg-amber-500/10 border-amber-500/20">{high}% Elevated Inertia</Badge>
                      }
                      if (mod > 0) {
                        return <Badge variant="outline" className="text-[10px] text-sky-600 bg-sky-500/10 border-sky-500/20">{mod}% Moderate Latency</Badge>
                      }
                      return <Badge variant="outline" className="text-[10px] text-emerald-600 bg-emerald-500/10 border-emerald-500/20">0% Fluid Flow</Badge>
                    })()}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {data.friction_diagnostics?.task_initiation?.diagnostic || "Awaiting initial assessment telemetry to calculate task initiation friction."}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border/60 shadow-xs">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Eye className="h-3.5 w-3.5 text-indigo-500" />
                      Classroom Voice Hesitancy
                    </span>
                    {(() => {
                      const high = data.friction_diagnostics?.classroom_voice?.evaluative_silence ?? 0
                      const mod = data.friction_diagnostics?.classroom_voice?.selective_asking ?? 0
                      if (totalEvaluationsCount === 0) {
                        return <Badge variant="outline" className="text-[10px] text-muted-foreground border-border/60">0% Pending Data</Badge>
                      }
                      if (high > 0) {
                        return <Badge variant="outline" className="text-[10px] text-rose-600 bg-rose-500/10 border-rose-500/20">{high}% Evaluative Silence</Badge>
                      }
                      if (mod > 0) {
                        return <Badge variant="outline" className="text-[10px] text-amber-600 bg-amber-500/10 border-amber-500/20">{mod}% Selective Asking</Badge>
                      }
                      return <Badge variant="outline" className="text-[10px] text-emerald-600 bg-emerald-500/10 border-emerald-500/20">0% Active Inquiry</Badge>
                    })()}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {data.friction_diagnostics?.classroom_voice?.diagnostic || "Awaiting assessment telemetry to calibrate classroom query hesitations."}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border/60 shadow-xs">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <HeartHandshake className="h-3.5 w-3.5 text-rose-500" />
                      Peer Boundary Strain
                    </span>
                    {(() => {
                      const high = data.friction_diagnostics?.peer_boundary_strain?.acute_mediation ?? 0
                      const mod = data.friction_diagnostics?.peer_boundary_strain?.moderate_crosscurrents ?? 0
                      if (totalEvaluationsCount === 0) {
                        return <Badge variant="outline" className="text-[10px] text-muted-foreground border-border/60">0% Pending Data</Badge>
                      }
                      if (high > 0) {
                        return <Badge variant="outline" className="text-[10px] text-amber-600 bg-amber-500/10 border-amber-500/20">{high}% Mediation Fatigue</Badge>
                      }
                      if (mod > 0) {
                        return <Badge variant="outline" className="text-[10px] text-sky-600 bg-sky-500/10 border-sky-500/20">{mod}% Moderate Strain</Badge>
                      }
                      return <Badge variant="outline" className="text-[10px] text-emerald-600 bg-emerald-500/10 border-emerald-500/20">0% Grounded Peer Bonds</Badge>
                    })()}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {data.friction_diagnostics?.peer_boundary_strain?.diagnostic || "Awaiting peer dynamic responses to evaluate social boundary strain."}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border/60 shadow-xs">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-violet-500" />
                      Evening Screen Drag
                    </span>
                    {(() => {
                      const high = data.friction_diagnostics?.screen_drag?.severe_sleep_debt ?? 0
                      const mod = data.friction_diagnostics?.screen_drag?.mild_evening_drag ?? 0
                      if (totalEvaluationsCount === 0) {
                        return <Badge variant="outline" className="text-[10px] text-muted-foreground border-border/60">0% Pending Data</Badge>
                      }
                      if (high > 0) {
                        return <Badge variant="outline" className="text-[10px] text-rose-600 bg-rose-500/10 border-rose-500/20">{high}% Sleep Debt</Badge>
                      }
                      if (mod > 0) {
                        return <Badge variant="outline" className="text-[10px] text-amber-600 bg-amber-500/10 border-amber-500/20">{mod}% Mild Evening Drag</Badge>
                      }
                      return <Badge variant="outline" className="text-[10px] text-emerald-600 bg-emerald-500/10 border-emerald-500/20">0% Restorative Hygiene</Badge>
                    })()}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {data.friction_diagnostics?.screen_drag?.diagnostic || "Awaiting evening recovery and sleep hygiene diagnostic data."}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {/* MODE 2: INDIVIDUAL SCHOOL DRILLDOWN */}
      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {selectedSchoolId !== "all" && (
        <div className="space-y-6">
          {schoolLoading ? (
            <div className="space-y-4">
              <div className="h-20 bg-muted/40 animate-pulse rounded-xl" />
              <div className="h-64 bg-muted/30 animate-pulse rounded-xl" />
            </div>
          ) : schoolData ? (
            <>
              {/* Back to All Schools & School Header Banner */}
              <div className="p-4 sm:p-5 rounded-xl border border-primary/20 bg-primary/5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedSchoolId("all")}
                      className="text-xs h-8 gap-1 text-muted-foreground hover:text-foreground"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      All Schools
                    </Button>
                    <span className="text-muted-foreground">/</span>
                    <h2 className="text-lg font-bold text-foreground">{schoolData.school_name}</h2>
                    <Badge variant="outline" className="font-mono text-xs">
                      {schoolData.school_code}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{schoolData.city}</span>
                    <span>•</span>
                    <span className="font-semibold text-foreground">{schoolData.total_students} Students</span>
                    <span>•</span>
                    <span>{schoolData.total_results} Check-ins</span>
                  </div>
                </div>

                {/* Filter Scope Bar */}
                <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-border/40">
                  {/* Branch Filter */}
                  {schoolData.branches && schoolData.branches.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium text-muted-foreground">Branch:</span>
                      <select
                        value={selectedBranch}
                        onChange={(e) => setSelectedBranch(e.target.value)}
                        className="h-8 rounded-md border border-input bg-background px-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      >
                        <option value="all">All Campuses ({schoolData.branches.length + 1})</option>
                        <option value={selectedSchoolId}>Flagship Main Campus</option>
                        {schoolData.branches.map((b: any) => (
                          <option key={b.id} value={b.id}>
                            {b.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Grade Filter */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium text-muted-foreground">Class / Grade:</span>
                    <select
                      value={selectedGrade}
                      onChange={(e) => setSelectedGrade(e.target.value)}
                      className="h-8 rounded-md border border-input bg-background px-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <option value="all">All Grades</option>
                      {["6th", "7th", "8th", "9th", "10th", "11th", "12th"].map((g) => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>

                  {/* Section Filter */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium text-muted-foreground">Section:</span>
                    <select
                      value={selectedSection}
                      onChange={(e) => setSelectedSection(e.target.value)}
                      className="h-8 rounded-md border border-input bg-background px-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <option value="all">All Sections</option>
                      <option value="A">Section A</option>
                      <option value="B">Section B</option>
                      <option value="C">Section C</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Class Resilience Heatmap for this School */}
              {schoolData.classes && schoolData.classes.length > 0 && (
                <Card className="border-border/70 shadow-xs">
                  <CardHeader className="pb-3 border-b border-border/40">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <CardTitle className="text-base font-semibold">
                          Class-by-Class Dynamics & Action Priority
                        </CardTitle>
                        <CardDescription className="text-xs">
                          Granular metrics and teacher intervention directives per classroom in {schoolData.school_name}.
                        </CardDescription>
                      </div>
                      <Badge variant="outline" className="text-[11px] font-mono">
                        {schoolData.classes.length} Classes Evaluated
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader className="bg-muted/30">
                          <TableRow className="text-[11px]">
                            <TableHead>Class</TableHead>
                            <TableHead>Tier</TableHead>
                            <TableHead>Students</TableHead>
                            <TableHead>Focus</TableHead>
                            <TableHead>Resilience</TableHead>
                            <TableHead>Primary Friction</TableHead>
                            <TableHead>Action Priority</TableHead>
                            <TableHead>Teacher Guidance</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {schoolData.classes.map((c: any, idx: number) => (
                            <TableRow key={idx} className="text-xs hover:bg-muted/20">
                              <TableCell className="font-semibold text-foreground">
                                Class {c.grade} - {c.section}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-[10px]">
                                  {c.tier}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-muted-foreground">{c.total_students}</TableCell>
                              <TableCell className="font-semibold text-sky-600 dark:text-sky-400">
                                {c.focus_score}/100
                              </TableCell>
                              <TableCell className="font-semibold text-emerald-600 dark:text-emerald-400">
                                {c.resilience_score}/100
                              </TableCell>
                              <TableCell>
                                <span className="text-[11px] text-muted-foreground font-medium">
                                  {c.primary_friction}
                                </span>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  className={`text-[10px] ${
                                    c.action_priority === "High Alert"
                                      ? "bg-rose-500/10 text-rose-600 border-rose-500/30"
                                      : c.action_priority === "Elevated"
                                      ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
                                      : "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                                  }`}
                                  variant="outline"
                                >
                                  {c.action_priority}
                                </Badge>
                              </TableCell>
                              <TableCell className="max-w-xs text-[11px] text-muted-foreground">
                                {c.teacher_action_playbook}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Student Diagnostic Roster */}
              <Card className="border-border/70 shadow-xs">
                <CardHeader className="pb-3 border-b border-border/40">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <GraduationCap className="h-4 w-4 text-primary" />
                        <CardTitle className="text-base font-semibold">
                          Student Diagnostic Dossiers ({filteredStudents.length})
                        </CardTitle>
                      </div>
                      <CardDescription className="text-xs">
                        Inspect individual student archetypes, friction triggers, and longitudinal attempt trajectories.
                      </CardDescription>
                    </div>

                    <div className="relative w-full sm:w-64">
                      <Search className="h-3.5 w-3.5 text-muted-foreground absolute left-3 top-2.5" />
                      <Input
                        placeholder="Search student or roll ID..."
                        value={studentSearch}
                        onChange={(e) => setStudentSearch(e.target.value)}
                        className="h-8 pl-8 text-xs"
                      />
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-muted/30">
                        <TableRow className="text-[11px]">
                          <TableHead>Student Name</TableHead>
                          <TableHead>Class</TableHead>
                          <TableHead>Behavioral Archetype</TableHead>
                          <TableHead>Focus / Resilience</TableHead>
                          <TableHead>Primary Friction</TableHead>
                          <TableHead>Momentum</TableHead>
                          <TableHead className="text-right">Dossier</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredStudents.length > 0 ? (
                          filteredStudents.map((st) => (
                            <TableRow key={st.id} className="text-xs hover:bg-muted/20">
                              <TableCell>
                                <div>
                                  <span className="font-semibold text-foreground">{st.name}</span>
                                  <div className="text-[10px] font-mono text-muted-foreground">ID: {st.access_id}</div>
                                </div>
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {st.grade} - {st.section}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-[10px] capitalize font-medium">
                                  {st.archetype === "sprinter"
                                    ? "High-Stakes Sprinter"
                                    : st.archetype === "observer"
                                    ? "Quiet Observer"
                                    : st.archetype === "loyalist"
                                    ? "Overburdened Loyalist"
                                    : "Deep Pacer"}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <span className="font-medium text-foreground">{st.focus_score}</span>
                                <span className="text-muted-foreground"> / {st.resilience_score}</span>
                              </TableCell>
                              <TableCell className="text-muted-foreground text-[11px]">
                                {st.primary_friction}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1 text-[11px]">
                                  {st.momentum_trend === "improving" ? (
                                    <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                                  ) : st.momentum_trend === "declining" ? (
                                    <TrendingDown className="h-3.5 w-3.5 text-rose-500" />
                                  ) : (
                                    <Minus className="h-3.5 w-3.5 text-muted-foreground" />
                                  )}
                                  <span className="capitalize">{st.momentum_trend}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-xs h-7 gap-1"
                                  onClick={() => {
                                    setSelectedStudent(st)
                                    setIsDossierOpen(true)
                                  }}
                                >
                                  <FolderOpen className="h-3.5 w-3.5 mr-1" />
                                  View Dossier
                                  <ArrowUpRight className="h-3 w-3" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-6 text-muted-foreground text-xs">
                              No students found matching your search.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <div className="p-6 text-center text-muted-foreground text-xs">
              Unable to load school details.
            </div>
          )}
        </div>
      )}

      {/* Interactive Student Dossier Dialog */}
      <StudentDossierDialog
        isOpen={isDossierOpen}
        onClose={() => setIsDossierOpen(false)}
        student={selectedStudent}
        isSuperAdmin={true}
      />
    </div>
  )
}
