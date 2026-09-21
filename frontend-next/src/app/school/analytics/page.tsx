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
  Users,
  FolderOpen,
  BarChart3,
  Sparkles,
  Zap,
  Eye,
  HeartHandshake,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  Building2,
  GitBranch,
  Search,
  Filter,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  Minus,
  GraduationCap,
  Layers,
  BookOpen,
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
import { useAuth } from "@/context/auth-context"
import { StudentDossierDialog, StudentProfileData } from "@/components/student-dossier-dialog"

interface ArchetypeItem {
  id: string
  name: string
  count: number
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

interface BranchItem {
  id: string
  name: string
  city: string
  total_students: number
  completed_checkins: number
  avg_focus: number
  avg_resilience: number
  primary_friction: string
  dominant_archetype: string
}

interface ClassItem {
  grade: string
  section: string
  tier: string
  total_students: number
  completed_checkins: number
  // 4 Core Regulation Buckets
  attn_stability_score?: number
  load_regulation_score?: number
  self_safety_score?: number
  social_comfort_score?: number
  overall_status?: string
  primary_focus_area?: string
  dominant_profile?: string
  focus_score: number
  resilience_score: number
  peer_dynamics_score: number
  recovery_score: number
  primary_friction: string
  action_priority: string
  dominant_archetype: string
  teacher_action_playbook: string
}

interface SchoolAnalyticsResponse {
  overview: {
    total_students: number
    total_teachers: number
    total_results: number
    open_tickets: number
  }
  branches?: BranchItem[]
  classes?: ClassItem[]
  students?: StudentProfileData[]
  radar_dimensions?: Record<string, number>
  cohort_distribution?: {
    ATTN_STABILITY?: { stable: number; emerging: number; support_needed: number }
    LOAD_REGULATION?: { stable: number; emerging: number; support_needed: number }
    SELF_SAFETY?: { stable: number; emerging: number; support_needed: number }
    SOCIAL_COMFORT?: { stable: number; emerging: number; support_needed: number }
  }
  pathway_distribution?: Array<{
    track_id: string
    track_name: string
    count: number
    percent: number
    focus_area: string
  }>
  regulation_profiles?: Array<{
    id: string
    name: string
    percentage: number
    tag: string
    color: string
    description: string
    counselor_strategy?: string
    counselorStrategy?: string
  }>
  executive_banner: {
    primary_insight: string
    recommendation: string
    impact_score: string
  }
  friction_diagnostics: {
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
  archetypes: ArchetypeItem[]
  grade_heatmaps: GradeHeatmapItem[]
}

export default function SchoolAnalyticsPage() {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"
  const { user, isSchoolAdmin, isSuperAdmin, hasRole } = useAuth()
  const canManage = isSchoolAdmin || isSuperAdmin || hasRole("superadmin") || hasRole("school_admin")
  const isTeacherOnly = hasRole("teacher") && !canManage

  const [data, setData] = useState<SchoolAnalyticsResponse | null>(null)
  const [loading, setLoading] = useState(true)

  // Scope Tab: "overview" | "branches" | "classes" | "students"
  const [scopeTab, setScopeTab] = useState<"overview" | "branches" | "classes" | "students">("overview")

  // Class filtering states
  const [selectedGrade, setSelectedGrade] = useState<string>("9th")
  const [selectedSection, setSelectedSection] = useState<string>("A")

  // Student filtering states
  const [studentSearch, setStudentSearch] = useState<string>("")
  const [studentGradeFilter, setStudentGradeFilter] = useState<string>("all")

  useEffect(() => {
    if (isTeacherOnly && user?.metadata?.assigned_grade) {
      const g = user.metadata.assigned_grade
      setSelectedGrade(g.endsWith("th") ? g : `${g}th`)
      if (user.metadata.assigned_section) {
        setSelectedSection(user.metadata.assigned_section)
      }
    }
  }, [isTeacherOnly, user])

  // Student Dossier Modal
  const [selectedStudent, setSelectedStudent] = useState<StudentProfileData | null>(null)
  const [isDossierOpen, setIsDossierOpen] = useState(false)

  // Counselor Checklist
  const [checklist, setChecklist] = useState<Record<string, boolean>>({
    chk1: false,
    chk2: true,
    chk3: false,
    chk4: false,
  })

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await api.get("/api/school/analytics")
        setData(res)
      } catch (err) {
        console.error("Failed to load school analytics", err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const toggleCheck = (id: string) => {
    setChecklist((prev) => ({ ...prev, [id]: !prev[id] }))
  }

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
    return <div className="text-muted-foreground p-6">Failed to load analytics data.</div>
  }

  const branches = data.branches || []
  const classes = data.classes || []
  const students = data.students || []

  // Active Class for Class-Wise Tab
  const activeClass = classes.find(
    (c) => c.grade.toLowerCase() === selectedGrade.toLowerCase() && c.section.toUpperCase() === selectedSection.toUpperCase()
  ) || classes[0]

  const hasActiveClassData = !!(activeClass && activeClass.completed_checkins > 0)

  // Unified 4-Pole Diamond Radar (Top, Right, Bottom, Left)
  const activeClassAttn = hasActiveClassData && activeClass.attn_stability_score ? Math.round(((32 - activeClass.attn_stability_score) / 24) * 100) : 0
  const activeClassSocial = hasActiveClassData && activeClass.social_comfort_score ? Math.round(((32 - activeClass.social_comfort_score) / 24) * 100) : 0
  const activeClassLoad = hasActiveClassData && activeClass.load_regulation_score ? Math.round(((32 - activeClass.load_regulation_score) / 24) * 100) : 0
  const activeClassSafety = hasActiveClassData && activeClass.self_safety_score ? Math.round(((32 - activeClass.self_safety_score) / 24) * 100) : 0

  const schoolAttn = data?.radar_dimensions?.["Attention & Focus Flow"] ?? 0
  const schoolSocial = data?.radar_dimensions?.["Social Comfort & Belonging"] ?? 0
  const schoolLoad = data?.radar_dimensions?.["Calm & Stress Reset"] ?? 0
  const schoolSafety = data?.radar_dimensions?.["Inner Grounding & Confidence"] ?? 0

  const classRadarData = [
    {
      subject: "Attention & Focus Flow",
      classScore: activeClassAttn,
      schoolAvg: schoolAttn,
    },
    {
      subject: "Social Comfort & Belonging",
      classScore: activeClassSocial,
      schoolAvg: schoolSocial,
    },
    {
      subject: "Calm & Stress Reset",
      classScore: activeClassLoad,
      schoolAvg: schoolLoad,
    },
    {
      subject: "Inner Grounding & Confidence",
      classScore: activeClassSafety,
      schoolAvg: schoolSafety,
    },
  ]

  // Filtered Students for Student-Wise Tab
  const filteredStudents = students.filter((s) => {
    if (isTeacherOnly) {
      const cleanStGrade = (s.grade || "").replace(/(st|nd|rd|th)$/i, "").trim().toLowerCase()
      const cleanAssignedGrade = (user?.metadata?.assigned_grade || "9").trim().toLowerCase()
      if (cleanStGrade !== cleanAssignedGrade) return false
    }
    const matchesSearch = !studentSearch || (
      s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.access_id.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.grade.toLowerCase().includes(studentSearch.toLowerCase())
    )
    const matchesGrade = studentGradeFilter === "all" || s.grade.toLowerCase() === studentGradeFilter.toLowerCase()
    return matchesSearch && matchesGrade
  })

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Header & 4 Scope Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl border border-border/60 bg-card shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Behavioral Diagnostics & Learning Insights
            </h1>
            <Badge variant="outline" className="bg-sky-500/10 text-sky-600 border-sky-500/20 text-xs">
              Live Telemetry
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Diagnostic radar, cognitive launch barriers, and practical counselor guidance across campuses, classes, and individual students.
          </p>
        </div>

        {/* Scope Selector Tabs */}
        <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg border border-border/70 self-start md:self-auto overflow-x-auto max-w-full">
          {[
            { id: "overview", label: isTeacherOnly ? "Classroom Overview" : "Campus Overview", icon: Building2 },
            ...(!isTeacherOnly ? [{ id: "branches", label: "Branch-Wise", icon: GitBranch, badge: branches.length > 0 ? `${branches.length + 1}` : undefined }] : []),
            { id: "classes", label: isTeacherOnly ? "My Class Insights" : "Class-Wise", icon: Layers },
            { id: "students", label: isTeacherOnly ? "My Students" : "Student-Wise", icon: GraduationCap, badge: `${filteredStudents.length}` },
          ].map((tab) => {
            const Icon = tab.icon
            const isActive = scopeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setScopeTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all shrink-0 ${
                  isActive
                    ? "bg-background text-foreground shadow-xs border border-border/60"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
                {tab.badge && (
                  <Badge variant="outline" className="text-[10px] px-1 py-0 bg-muted/80">
                    {tab.badge}
                  </Badge>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {/* TAB 1: CAMPUS OVERVIEW */}
      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {scopeTab === "overview" && (
        <div className="space-y-6">
          {/* Executive Cohort Action Banner */}
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

          {/* Core Overview Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card className="border-border/60">
              <CardContent className="p-4 space-y-1">
                <span className="text-xs text-muted-foreground font-medium">Total Students</span>
                <div className="text-2xl font-bold text-foreground">{data.overview.total_students}</div>
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400">Enrolled & Roster Synced</span>
              </CardContent>
            </Card>

            <Card className="border-border/60">
              <CardContent className="p-4 space-y-1">
                <span className="text-xs text-muted-foreground font-medium">Completed Evaluations</span>
                <div className="text-2xl font-bold text-foreground">{data.overview.total_results}</div>
                <span className="text-[11px] text-sky-600 dark:text-sky-400">Actionable Check-ins</span>
              </CardContent>
            </Card>

            <Card className="border-border/60">
              <CardContent className="p-4 space-y-1">
                <span className="text-xs text-muted-foreground font-medium">Faculty & Staff</span>
                <div className="text-2xl font-bold text-foreground">{data.overview.total_teachers}</div>
                <span className="text-[11px] text-muted-foreground">Class Mentors</span>
              </CardContent>
            </Card>

            <Card className="border-border/60">
              <CardContent className="p-4 space-y-1">
                <span className="text-xs text-muted-foreground font-medium">Open Support Tickets</span>
                <div className="text-2xl font-bold text-foreground">{data.overview.open_tickets}</div>
                <span className="text-[11px] text-amber-600 dark:text-amber-400">Active Requests</span>
              </CardContent>
            </Card>
          </div>

          {/* 4 Core Regulation Buckets Telemetry */}
          <div>
            <div className="mb-3 space-y-0.5">
              <h3 className="text-base font-semibold text-foreground">
                4 Core Regulation Buckets Telemetry
              </h3>
              <p className="text-xs text-muted-foreground">
                School-wide wellbeing baseline across the 4 regulation domains: Attention, Calm, Grounding, and Social Comfort.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* 1. Attention & Focus Flow */}
              <Card className="border-border/60 shadow-xs">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-sky-500" />
                      Attention & Focus Flow
                    </span>
                    <span className="text-sm font-bold text-sky-600 dark:text-sky-400">
                      {data.radar_dimensions?.["Attention & Focus Flow"] ?? 0}%
                    </span>
                  </div>

                  {/* 3-Color Segmented Bar */}
                  <div className="h-2 w-full rounded-full bg-muted/50 overflow-hidden flex">
                    <div
                      style={{ width: `${data.cohort_distribution?.ATTN_STABILITY?.stable ?? 0}%` }}
                      className="bg-emerald-500 h-full"
                      title={`Stable: ${data.cohort_distribution?.ATTN_STABILITY?.stable ?? 0}%`}
                    />
                    <div
                      style={{ width: `${data.cohort_distribution?.ATTN_STABILITY?.emerging ?? 0}%` }}
                      className="bg-amber-500 h-full"
                      title={`Emerging: ${data.cohort_distribution?.ATTN_STABILITY?.emerging ?? 0}%`}
                    />
                    <div
                      style={{ width: `${data.cohort_distribution?.ATTN_STABILITY?.support_needed ?? 0}%` }}
                      className="bg-rose-500 h-full"
                      title={`Support Needed: ${data.cohort_distribution?.ATTN_STABILITY?.support_needed ?? 0}%`}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/30">
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                      {data.cohort_distribution?.ATTN_STABILITY?.stable ?? 0}% Stable
                    </span>
                    <span className="text-amber-600 dark:text-amber-400 font-medium">
                      {data.cohort_distribution?.ATTN_STABILITY?.emerging ?? 0}% Emerging
                    </span>
                    <span className="text-rose-600 dark:text-rose-400 font-medium">
                      {data.cohort_distribution?.ATTN_STABILITY?.support_needed ?? 0}% Needs Support
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* 2. Calm & Stress Reset */}
              <Card className="border-border/60 shadow-xs">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                      Calm & Stress Reset
                    </span>
                    <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
                      {data.radar_dimensions?.["Calm & Stress Reset"] ?? 0}%
                    </span>
                  </div>

                  <div className="h-2 w-full rounded-full bg-muted/50 overflow-hidden flex">
                    <div
                      style={{ width: `${data.cohort_distribution?.LOAD_REGULATION?.stable ?? 0}%` }}
                      className="bg-emerald-500 h-full"
                      title={`Stable: ${data.cohort_distribution?.LOAD_REGULATION?.stable ?? 0}%`}
                    />
                    <div
                      style={{ width: `${data.cohort_distribution?.LOAD_REGULATION?.emerging ?? 0}%` }}
                      className="bg-amber-500 h-full"
                      title={`Emerging: ${data.cohort_distribution?.LOAD_REGULATION?.emerging ?? 0}%`}
                    />
                    <div
                      style={{ width: `${data.cohort_distribution?.LOAD_REGULATION?.support_needed ?? 0}%` }}
                      className="bg-rose-500 h-full"
                      title={`Support Needed: ${data.cohort_distribution?.LOAD_REGULATION?.support_needed ?? 0}%`}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/30">
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                      {data.cohort_distribution?.LOAD_REGULATION?.stable ?? 0}% Stable
                    </span>
                    <span className="text-amber-600 dark:text-amber-400 font-medium">
                      {data.cohort_distribution?.LOAD_REGULATION?.emerging ?? 0}% Emerging
                    </span>
                    <span className="text-rose-600 dark:text-rose-400 font-medium">
                      {data.cohort_distribution?.LOAD_REGULATION?.support_needed ?? 0}% Needs Support
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* 3. Inner Grounding & Confidence */}
              <Card className="border-border/60 shadow-xs">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Eye className="h-3.5 w-3.5 text-rose-500" />
                      Inner Grounding & Confidence
                    </span>
                    <span className="text-sm font-bold text-rose-600 dark:text-rose-400">
                      {data.radar_dimensions?.["Inner Grounding & Confidence"] ?? 0}%
                    </span>
                  </div>

                  <div className="h-2 w-full rounded-full bg-muted/50 overflow-hidden flex">
                    <div
                      style={{ width: `${data.cohort_distribution?.SELF_SAFETY?.stable ?? 0}%` }}
                      className="bg-emerald-500 h-full"
                      title={`Stable: ${data.cohort_distribution?.SELF_SAFETY?.stable ?? 0}%`}
                    />
                    <div
                      style={{ width: `${data.cohort_distribution?.SELF_SAFETY?.emerging ?? 0}%` }}
                      className="bg-amber-500 h-full"
                      title={`Emerging: ${data.cohort_distribution?.SELF_SAFETY?.emerging ?? 0}%`}
                    />
                    <div
                      style={{ width: `${data.cohort_distribution?.SELF_SAFETY?.support_needed ?? 0}%` }}
                      className="bg-rose-500 h-full"
                      title={`Support Needed: ${data.cohort_distribution?.SELF_SAFETY?.support_needed ?? 0}%`}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/30">
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                      {data.cohort_distribution?.SELF_SAFETY?.stable ?? 0}% Stable
                    </span>
                    <span className="text-amber-600 dark:text-amber-400 font-medium">
                      {data.cohort_distribution?.SELF_SAFETY?.emerging ?? 0}% Emerging
                    </span>
                    <span className="text-rose-600 dark:text-rose-400 font-medium">
                      {data.cohort_distribution?.SELF_SAFETY?.support_needed ?? 0}% Needs Support
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* 4. Social Comfort & Belonging */}
              <Card className="border-border/60 shadow-xs">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <HeartHandshake className="h-3.5 w-3.5 text-emerald-500" />
                      Social Comfort & Belonging
                    </span>
                    <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                      {data.radar_dimensions?.["Social Comfort & Belonging"] ?? 0}%
                    </span>
                  </div>

                  <div className="h-2 w-full rounded-full bg-muted/50 overflow-hidden flex">
                    <div
                      style={{ width: `${data.cohort_distribution?.SOCIAL_COMFORT?.stable ?? 0}%` }}
                      className="bg-emerald-500 h-full"
                      title={`Stable: ${data.cohort_distribution?.SOCIAL_COMFORT?.stable ?? 0}%`}
                    />
                    <div
                      style={{ width: `${data.cohort_distribution?.SOCIAL_COMFORT?.emerging ?? 0}%` }}
                      className="bg-amber-500 h-full"
                      title={`Emerging: ${data.cohort_distribution?.SOCIAL_COMFORT?.emerging ?? 0}%`}
                    />
                    <div
                      style={{ width: `${data.cohort_distribution?.SOCIAL_COMFORT?.support_needed ?? 0}%` }}
                      className="bg-rose-500 h-full"
                      title={`Support Needed: ${data.cohort_distribution?.SOCIAL_COMFORT?.support_needed ?? 0}%`}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/30">
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                      {data.cohort_distribution?.SOCIAL_COMFORT?.stable ?? 0}% Stable
                    </span>
                    <span className="text-amber-600 dark:text-amber-400 font-medium">
                      {data.cohort_distribution?.SOCIAL_COMFORT?.emerging ?? 0}% Emerging
                    </span>
                    <span className="text-rose-600 dark:text-rose-400 font-medium">
                      {data.cohort_distribution?.SOCIAL_COMFORT?.support_needed ?? 0}% Needs Support
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Assigned 16-Track Pathway Distribution */}
          {data.pathway_distribution && data.pathway_distribution.length > 0 && (
            <Card className="border-border/60 shadow-xs">
              <CardHeader className="pb-3 border-b border-border/40">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <CardTitle className="text-base font-semibold">
                      Assigned 16-Track Wellbeing Curriculum Distribution
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Live enrollment across personalized 16-track regulation pathways.
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-mono">
                    {data.pathway_distribution.length} Active Tracks
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {data.pathway_distribution.map((track) => (
                    <div
                      key={track.track_id}
                      className="p-3 rounded-lg border border-border/60 bg-muted/10 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-[9px] font-mono">
                          {track.track_id}
                        </Badge>
                        <span className="text-xs font-bold text-foreground">
                          {track.percent}% ({track.count})
                        </span>
                      </div>
                      <span className="text-xs font-semibold text-foreground block">
                        {track.track_name}
                      </span>
                      <div className="h-1.5 w-full rounded-full bg-muted/40 overflow-hidden">
                        <div
                          style={{ width: `${track.percent}%` }}
                          className="bg-primary h-full rounded-full"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Student Regulation Focus Profiles & Actionable Counselor Strategies */}
          <div>
            <div className="mb-3 space-y-0.5">
              <h3 className="text-base font-semibold text-foreground">Cohort Regulation Focus Profiles</h3>
              <p className="text-xs text-muted-foreground">
                Distribution of learners across student regulation profiles with actionable faculty strategies.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {(data.regulation_profiles || data.archetypes).map((arch: any) => (
                <Card key={arch.id} className="border-border/60 flex flex-col justify-between shadow-xs">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm text-foreground">{arch.name}</span>
                      <span className="text-base font-bold text-foreground">{arch.percentage}%</span>
                    </div>
                    <Badge variant="outline" className="text-[10px] w-fit">
                      {arch.tag}
                    </Badge>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {arch.description}
                    </p>
                    <div className="pt-2 border-t border-border/40">
                      <span className="text-[10px] font-semibold text-primary block mb-1">
                        Counselor & Faculty Playbook:
                      </span>
                      <p className="text-[11px] text-foreground/90 leading-snug">
                        {arch.counselor_strategy || arch.counselorStrategy}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Action Checklist */}
          <Card className="border-border/70 shadow-xs">
            <CardHeader className="pb-3 border-b border-border/40">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <CardTitle className="text-base font-semibold">
                  School Counselor & Faculty Implementation Checklist
                </CardTitle>
              </div>
              <CardDescription className="text-xs">
                Key systematic adjustments recommended for faculty based on this term's check-in telemetry.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-2.5">
              {[
                { id: "chk1", label: "Calibrate online homework submission cutoff to 8:00 PM to curb late-night screen study cycles." },
                { id: "chk2", label: "Introduce anonymous digital query submission in secondary classrooms before major tests." },
                { id: "chk3", label: "Conduct 15-minute peer boundary and social mediator workshops during class advisory periods." },
                { id: "chk4", label: "Schedule 10-minute active recovery breaks between consecutive double STEM periods." },
              ].map((item) => (
                <div
                  key={item.id}
                  onClick={() => toggleCheck(item.id)}
                  className="flex items-start gap-3 p-2.5 rounded-lg border border-border/50 hover:bg-muted/30 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={checklist[item.id] || false}
                    onChange={() => {}}
                    className="mt-0.5 rounded border-muted-foreground text-primary focus:ring-primary"
                  />
                  <span className={`text-xs ${checklist[item.id] ? "line-through text-muted-foreground" : "text-foreground"}`}>
                    {item.label}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {/* TAB 2: BRANCH-WISE (SISTER CAMPUSES) */}
      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {scopeTab === "branches" && (
        <div className="space-y-6">
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <GitBranch className="h-4 w-4 text-primary" />
              Multi-Campus & Branch Telemetry
            </h2>
            <p className="text-xs text-muted-foreground">
              Compare focus, emotional stability, and participation metrics across flagship and sister campuses.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Flagship Campus Card */}
            <Card className="border-border/70 shadow-xs">
              <CardHeader className="pb-3 border-b border-border/40">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">
                    Flagship Main Campus
                  </Badge>
                  <span className="text-xs font-mono text-muted-foreground">Main Campus</span>
                </div>
                <CardTitle className="text-base font-bold pt-1">Oakwood Flagship Campus</CardTitle>
                <CardDescription className="text-xs">Bangalore Central Hub</CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 rounded bg-muted/20 border border-border/40">
                    <span className="text-[10px] text-muted-foreground">Enrolled Students</span>
                    <div className="text-lg font-bold text-foreground">{data.overview.total_students - 3}</div>
                  </div>
                  <div className="p-2 rounded bg-muted/20 border border-border/40">
                    <span className="text-[10px] text-muted-foreground">Evaluations</span>
                    <div className="text-lg font-bold text-foreground">{data.overview.total_results - 3}</div>
                  </div>
                </div>

                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Average Focus Index:</span>
                    <span className="font-semibold text-foreground">82/100</span>
                  </div>
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Resilience & Pacing:</span>
                    <span className="font-semibold text-foreground">68/100</span>
                  </div>
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Primary Friction:</span>
                    <span className="font-semibold text-amber-600 dark:text-amber-400">Classroom Voice Hesitancy</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Additional Branches */}
            {branches.map((b) => (
              <Card key={b.id} className="border-border/70 shadow-xs">
                <CardHeader className="pb-3 border-b border-border/40">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-[10px] bg-sky-500/10 text-sky-600 border-sky-500/20">
                      Sister Campus
                    </Badge>
                    <span className="text-xs font-mono text-muted-foreground">{b.city}</span>
                  </div>
                  <CardTitle className="text-base font-bold pt-1">{b.name}</CardTitle>
                  <CardDescription className="text-xs">Affiliated Regional Branch</CardDescription>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded bg-muted/20 border border-border/40">
                      <span className="text-[10px] text-muted-foreground">Enrolled Students</span>
                      <div className="text-lg font-bold text-foreground">{b.total_students || 3}</div>
                    </div>
                    <div className="p-2 rounded bg-muted/20 border border-border/40">
                      <span className="text-[10px] text-muted-foreground">Evaluations</span>
                      <div className="text-lg font-bold text-foreground">{b.completed_checkins || 3}</div>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Average Focus Index:</span>
                      <span className="font-semibold text-foreground">{b.avg_focus}/100</span>
                    </div>
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Resilience & Pacing:</span>
                      <span className="font-semibold text-foreground">{b.avg_resilience}/100</span>
                    </div>
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Primary Friction:</span>
                      <span className="font-semibold text-amber-600 dark:text-amber-400">{b.primary_friction}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {/* TAB 3: CLASS-WISE (GRADE & SECTION DRILLDOWN) */}
      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {scopeTab === "classes" && (
        <div className="space-y-6">
          {/* Grade & Section Selector Card */}
          <div className="p-4 rounded-xl border border-border/60 bg-card flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-0.5">
              <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" />
                Class-Level Behavioral Dynamics
              </h2>
              <p className="text-xs text-muted-foreground">
                Inspect classroom-level social friction, focus consistency, and tailored teacher strategies.
              </p>
            </div>

            {isTeacherOnly ? (
              <Badge variant="outline" className="h-8 px-3 text-xs font-mono border-primary/30 bg-primary/5 text-primary">
                Assigned: Class {selectedGrade} - Section {selectedSection}
              </Badge>
            ) : (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium text-muted-foreground">Class:</span>
                  <select
                    value={selectedGrade}
                    onChange={(e) => setSelectedGrade(e.target.value)}
                    className="h-8 rounded-md border border-input bg-background px-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-medium"
                  >
                    {["8th", "9th", "10th", "11th", "12th"].map((g) => (
                      <option key={g} value={g}>Class {g}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium text-muted-foreground">Section:</span>
                  <select
                    value={selectedSection}
                    onChange={(e) => setSelectedSection(e.target.value)}
                    className="h-8 rounded-md border border-input bg-background px-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-medium"
                  >
                    <option value="A">Section A</option>
                    <option value="B">Section B</option>
                    <option value="C">Section C</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Class Spotlight Banner */}
          <Card className="border-sky-500/20 bg-sky-500/5 shadow-xs">
            <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge className="bg-sky-500/20 text-sky-600 dark:text-sky-400 border-sky-500/30 text-xs">
                    Class {selectedGrade} - Section {selectedSection}
                  </Badge>
                  <span className="text-xs font-semibold text-foreground">
                    Action Priority: {activeClass?.action_priority || "Elevated"}
                  </span>
                </div>
                <p className="text-xs font-medium text-foreground">
                  Primary Friction: <span className="text-amber-600 dark:text-amber-400">{activeClass?.primary_friction || "Classroom Voice Hesitancy & Evaluative Doubt"}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  <strong className="text-foreground">Teacher Action Playbook:</strong>{" "}
                  {activeClass?.teacher_action_playbook || "Replace cold-calling with 2-minute paired turn-and-talk check-ins before plenary queries."}
                </p>
              </div>

              <Button
                size="sm"
                variant="outline"
                className="text-xs h-8 self-start sm:self-auto shrink-0 gap-1"
                onClick={() => {
                  setStudentGradeFilter(selectedGrade)
                  setScopeTab("students")
                }}
              >
                View Class Students
                <ArrowUpRight className="h-3 w-3" />
              </Button>
            </CardContent>
          </Card>

          {/* Radar Chart for Class vs School Average */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <Card className="border-border/70 shadow-xs">
              <CardHeader className="pb-2 border-b border-border/40">
                <CardTitle className="text-sm font-semibold">
                  Class {selectedGrade}-{selectedSection} Radar vs School Benchmark
                </CardTitle>
                <CardDescription className="text-xs">
                  Polygon showing strengths and asymmetrical friction vectors for this classroom.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                {!hasActiveClassData ? (
                  <div className="h-64 w-full flex flex-col items-center justify-center text-center p-4 border border-dashed rounded-lg">
                    <BarChart3 className="h-8 w-8 text-muted-foreground/30 mb-2" />
                    <p className="font-semibold text-xs text-foreground">Awaiting Classroom Check-ins</p>
                    <p className="text-[11px] text-muted-foreground mt-1 max-w-xs">
                      Classroom radar dimensions will plot dynamically once students in Class {selectedGrade}-{selectedSection} complete their check-ins.
                    </p>
                  </div>
                ) : (
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="75%" data={classRadarData}>
                        <PolarGrid stroke={isDark ? "#334155" : "#e2e8f0"} strokeDasharray="3 3" />
                        <PolarAngleAxis
                          dataKey="subject"
                          tick={{ fill: isDark ? "#f1f5f9" : "#1e293b", fontSize: 10, fontWeight: 500 }}
                        />
                        <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                        <Radar
                          name={`Class ${selectedGrade}-${selectedSection}`}
                          dataKey="classScore"
                          stroke="#0284c7"
                          fill="#0284c7"
                          fillOpacity={0.25}
                          strokeWidth={2}
                        />
                        <Radar
                          name="School Baseline"
                          dataKey="schoolAvg"
                          stroke={isDark ? "#64748b" : "#94a3b8"}
                          fill={isDark ? "#64748b" : "#94a3b8"}
                          fillOpacity={0.1}
                          strokeWidth={1.5}
                          strokeDasharray="2 2"
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

            {/* Class Behavioral Heatmap Table */}
            <Card className="border-border/70 shadow-xs">
              <CardHeader className="pb-2 border-b border-border/40">
                <CardTitle className="text-sm font-semibold">
                  All Classrooms Overview
                </CardTitle>
                <CardDescription className="text-xs">
                  Cross-class comparative resilience and focus scores.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto max-h-72 overflow-y-auto">
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow className="text-[11px]">
                        <TableHead>Class</TableHead>
                        <TableHead>Students</TableHead>
                        <TableHead title="Attention & Focus Flow">Attn /32</TableHead>
                        <TableHead title="Calm & Stress Reset">Calm /32</TableHead>
                        <TableHead title="Inner Grounding & Confidence">Ground /32</TableHead>
                        <TableHead title="Social Comfort & Belonging">Social /32</TableHead>
                        <TableHead>Primary Focus</TableHead>
                        <TableHead>Priority</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {classes.map((c, i) => (
                        <TableRow
                          key={i}
                          onClick={() => {
                            setSelectedGrade(c.grade)
                            setSelectedSection(c.section)
                          }}
                          className={`text-xs cursor-pointer hover:bg-muted/30 transition-colors ${
                            c.grade === selectedGrade && c.section === selectedSection ? "bg-muted/40 font-semibold" : ""
                          }`}
                        >
                          <TableCell>Class {c.grade} - {c.section}</TableCell>
                          <TableCell>{c.total_students}</TableCell>
                          <TableCell className="text-sky-600 dark:text-sky-400 font-semibold">
                            {c.attn_stability_score || Math.round(8 + (100 - (c.focus_score || 80)) * 24 / 100)}
                          </TableCell>
                          <TableCell className="text-amber-600 dark:text-amber-400 font-semibold">
                            {c.load_regulation_score || Math.round(8 + (100 - (c.recovery_score || 65)) * 24 / 100)}
                          </TableCell>
                          <TableCell className="text-rose-600 dark:text-rose-400 font-semibold">
                            {c.self_safety_score || Math.round(8 + (100 - (c.resilience_score || 70)) * 24 / 100)}
                          </TableCell>
                          <TableCell className="text-emerald-600 dark:text-emerald-400 font-semibold">
                            {c.social_comfort_score || Math.round(8 + (100 - (c.peer_dynamics_score || 78)) * 24 / 100)}
                          </TableCell>
                          <TableCell className="text-foreground text-[11px]">
                            {c.primary_focus_area || c.dominant_archetype || "Calm & Stress Reset"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px]">
                              {c.action_priority || c.overall_status || "Standard"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Card List View */}
                <div className="md:hidden divide-y divide-border/60 max-h-80 overflow-y-auto">
                  {classes.map((c, i) => (
                    <div
                      key={i}
                      onClick={() => {
                        setSelectedGrade(c.grade)
                        setSelectedSection(c.section)
                      }}
                      className={`p-3 space-y-2 cursor-pointer transition-colors ${
                        c.grade === selectedGrade && c.section === selectedSection ? "bg-muted/40" : "hover:bg-muted/20"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-foreground">Class {c.grade} - {c.section}</span>
                        <Badge variant="outline" className="text-[10px]">
                          {c.action_priority || c.overall_status || "Standard"}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-4 gap-1.5 text-center text-[10px]">
                        <div className="bg-sky-500/10 dark:bg-sky-500/20 rounded p-1">
                          <div className="text-muted-foreground text-[9px]">Attn</div>
                          <div className="font-semibold text-sky-600 dark:text-sky-400">
                            {c.attn_stability_score || Math.round(8 + (100 - (c.focus_score || 80)) * 24 / 100)}
                          </div>
                        </div>
                        <div className="bg-amber-500/10 dark:bg-amber-500/20 rounded p-1">
                          <div className="text-muted-foreground text-[9px]">Calm</div>
                          <div className="font-semibold text-amber-600 dark:text-amber-400">
                            {c.load_regulation_score || Math.round(8 + (100 - (c.recovery_score || 65)) * 24 / 100)}
                          </div>
                        </div>
                        <div className="bg-rose-500/10 dark:bg-rose-500/20 rounded p-1">
                          <div className="text-muted-foreground text-[9px]">Ground</div>
                          <div className="font-semibold text-rose-600 dark:text-rose-400">
                            {c.self_safety_score || Math.round(8 + (100 - (c.resilience_score || 70)) * 24 / 100)}
                          </div>
                        </div>
                        <div className="bg-emerald-500/10 dark:bg-emerald-500/20 rounded p-1">
                          <div className="text-muted-foreground text-[9px]">Social</div>
                          <div className="font-semibold text-emerald-600 dark:text-emerald-400">
                            {c.social_comfort_score || Math.round(8 + (100 - (c.peer_dynamics_score || 78)) * 24 / 100)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                        <span>{c.total_students} students</span>
                        <span className="text-foreground font-medium truncate max-w-[180px]">
                          {c.primary_focus_area || c.dominant_archetype || "Calm & Stress Reset"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {/* TAB 4: STUDENT-WISE (DIAGNOSTIC ROSTER & DOSSIER) */}
      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {scopeTab === "students" && (
        <div className="space-y-6">
          <Card className="border-border/70 shadow-xs">
            <CardHeader className="pb-3 border-b border-border/40">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-primary" />
                    <CardTitle className="text-base font-semibold">
                      Student Behavioral Diagnostic Profiles ({filteredStudents.length})
                    </CardTitle>
                  </div>
                  <CardDescription className="text-xs">
                    Search students, inspect individual cognitive friction tags, and view the comprehensive diagnostic dossier.
                  </CardDescription>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                  {isTeacherOnly ? (
                    <Badge variant="outline" className="h-8 px-3 text-xs font-mono border-primary/20 bg-primary/5 text-primary justify-center">
                      Class {user?.metadata?.assigned_grade || "9"}-{user?.metadata?.assigned_section || "A"} Roster
                    </Badge>
                  ) : (
                    <select
                      value={studentGradeFilter}
                      onChange={(e) => setStudentGradeFilter(e.target.value)}
                      className="h-8 rounded-md border border-input bg-background px-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-medium"
                    >
                      <option value="all">All Grades</option>
                      {["8th", "9th", "10th", "11th", "12th"].map((g) => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  )}

                  <div className="relative w-full sm:w-60">
                    <Search className="h-3.5 w-3.5 text-muted-foreground absolute left-2.5 top-2.5" />
                    <Input
                      placeholder="Search name or ID..."
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      className="h-8 pl-8 text-xs"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow className="text-[11px]">
                      <TableHead>Student Name</TableHead>
                      <TableHead>Class / Sec</TableHead>
                      <TableHead>Regulation Profile</TableHead>
                      <TableHead>Assigned Pathway</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Momentum</TableHead>
                      <TableHead className="text-right">Action</TableHead>
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
                            Class {st.grade} - {st.section}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px] font-medium border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300">
                              {st.regulation_profile || (st.is_balance_mode ? "Balance Mode" : st.primary_bucket ? st.primary_bucket.replace(/_/g, " ") : "Calm Reset")}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col space-y-0.5">
                              <span className="font-medium text-foreground text-[11px]">
                                {st.pathway_track_name || "Calm Reset – with Ground Support"}
                              </span>
                              <span className="text-[9px] font-mono text-muted-foreground">
                                {st.pathway_track_id || "TRACK_CR_GROUND"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={`text-[10px] ${
                                st.overall_status === "Support Needed"
                                  ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                                  : st.overall_status === "Emerging"
                                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                                  : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                              }`}
                            >
                              {st.overall_status || "Stable"}
                            </Badge>
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
                              <span className="capitalize">{st.momentum_trend || "stable"}</span>
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
                              Inspect Dossier
                              <ArrowUpRight className="h-3 w-3" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-6 text-muted-foreground text-xs">
                          No student records found matching your filters.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card List View */}
              <div className="md:hidden divide-y divide-border/60">
                {filteredStudents.length > 0 ? (
                  filteredStudents.map((st) => (
                    <div key={st.id} className="p-3.5 space-y-2.5 hover:bg-muted/10 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <span className="font-semibold text-xs text-foreground block truncate">{st.name}</span>
                          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                            <span className="font-mono">ID: {st.access_id}</span>
                            <span>•</span>
                            <span>Class {st.grade} - {st.section}</span>
                          </div>
                        </div>
                        <Badge
                          className={`text-[10px] shrink-0 ${
                            st.overall_status === "Support Needed"
                              ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                              : st.overall_status === "Emerging"
                              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                              : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                          }`}
                        >
                          {st.overall_status || "Stable"}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap text-[11px]">
                        <Badge variant="outline" className="text-[10px] font-medium border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300">
                          {st.regulation_profile || (st.is_balance_mode ? "Balance Mode" : st.primary_bucket ? st.primary_bucket.replace(/_/g, " ") : "Calm Reset")}
                        </Badge>
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          {st.momentum_trend === "improving" ? (
                            <TrendingUp className="h-3 w-3 text-emerald-500" />
                          ) : st.momentum_trend === "declining" ? (
                            <TrendingDown className="h-3 w-3 text-rose-500" />
                          ) : (
                            <Minus className="h-3 w-3 text-muted-foreground" />
                          )}
                          <span className="capitalize">{st.momentum_trend || "stable"}</span>
                        </div>
                      </div>

                      <div className="text-[11px] text-muted-foreground bg-muted/30 rounded p-2 flex items-center justify-between">
                        <span className="truncate pr-2">{st.pathway_track_name || "Calm Reset – with Ground Support"}</span>
                        <span className="text-[9px] font-mono shrink-0">{st.pathway_track_id || "TRACK_CR_GROUND"}</span>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-xs h-8 gap-1.5 justify-center"
                        onClick={() => {
                          setSelectedStudent(st)
                          setIsDossierOpen(true)
                        }}
                      >
                        <FolderOpen className="h-3.5 w-3.5" />
                        <span>Inspect Full Dossier</span>
                        <ArrowUpRight className="h-3 w-3" />
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground text-xs">
                    No student records found matching your filters.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Interactive Student Dossier Modal */}
      <StudentDossierDialog
        isOpen={isDossierOpen}
        onClose={() => setIsDossierOpen(false)}
        student={selectedStudent}
        isSuperAdmin={false}
      />
    </div>
  )
}
