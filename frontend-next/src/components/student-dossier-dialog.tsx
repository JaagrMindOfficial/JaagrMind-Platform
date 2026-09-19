"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from "recharts"
import {
  Clock,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  Activity,
  FolderOpen,
  Building2,
  Home,
  User,
  GraduationCap,
  Lightbulb,
  ShieldCheck,
  Plus,
  Calendar,
  UserCheck,
  FileText,
  BookOpen,
  CheckCircle2,
  Copy,
  Check,
  RotateCcw,
} from "lucide-react"
import { api } from "@/lib/api"
import { useTheme } from "next-themes"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"

export interface StudentAssignedCheckin {
  assessmentId: string
  title: string
  description?: string
  tier?: string
  targetGrades?: string[]
  status: "completed" | "reassigned" | "pending"
  totalScore?: number
  assignedBucket?: string
  sectionScores?: any
  completedAt?: string
  timeTaken?: number
  attemptsCount: number
  directLink?: string
}

export interface CounselorNote {
  id: string
  school_id: string
  student_id: string
  author_id?: string
  author_name: string
  intervention_type: string
  status: string
  notes: string
  next_follow_up_date?: string
  created_at: string
}

export interface StudentProfileData {
  id: string
  access_id: string
  name: string
  grade: string
  section: string
  school_id: string
  school_name?: string
  // 4 Core Regulation Buckets (raw scores 8-32)
  attn_stability_score?: number
  load_regulation_score?: number
  self_safety_score?: number
  social_comfort_score?: number
  // Tiers ("Stable", "Emerging", "Support Needed")
  attn_tier?: "Stable" | "Emerging" | "Support Needed" | string
  load_tier?: "Stable" | "Emerging" | "Support Needed" | string
  self_safety_tier?: "Stable" | "Emerging" | "Support Needed" | string
  social_tier?: "Stable" | "Emerging" | "Support Needed" | string
  overall_status?: "Stable" | "Emerging" | "Support Needed" | string
  // Assigned 16-Track Pathway
  pathway_track_id?: string
  pathway_track_name?: string
  primary_bucket?: string
  secondary_bucket?: string
  is_balance_mode?: boolean
  // Dynamic Regulation Profile (replaces exaggerated archetypes)
  regulation_profile?: string
  // Legacy / Compatibility fields
  archetype?: string
  focus_score?: number
  resilience_score?: number
  academic_tenacity?: number
  stress_adaptability?: number
  primary_friction?: string
  momentum_trend?: string
  last_check_in_date?: string
  check_in_count?: number
  radar_dimensions?: Record<string, number>
}

interface StudentDossierDialogProps {
  isOpen: boolean
  onClose: () => void
  student: StudentProfileData | null
  isSuperAdmin?: boolean
  isParent?: boolean
}

export function StudentDossierDialog({
  isOpen,
  onClose,
  student,
  isSuperAdmin = false,
  isParent = false,
}: StudentDossierDialogProps) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  // Assigned Checkins State
  const [assignedCheckins, setAssignedCheckins] = useState<StudentAssignedCheckin[]>([])
  const [loadingCheckins, setLoadingCheckins] = useState(false)
  const [copiedCheckinId, setCopiedCheckinId] = useState<string | null>(null)

  // Counselor Notes State
  const [counselorNotes, setCounselorNotes] = useState<CounselorNote[]>([])
  const [loadingNotes, setLoadingNotes] = useState(false)
  const [showNoteForm, setShowNoteForm] = useState(false)
  const [noteType, setNoteType] = useState("1-on-1 Boundary Coaching")
  const [noteStatus, setNoteStatus] = useState("in_progress")
  const [noteText, setNoteText] = useState("")
  const [noteFollowUp, setNoteFollowUp] = useState("")
  const [savingNote, setSavingNote] = useState(false)

  useEffect(() => {
    if (isOpen && student?.id) {
      fetchHistory()
      fetchNotes()
      fetchAssignedCheckins()
    } else {
      setHistory([])
      setCounselorNotes([])
      setAssignedCheckins([])
      setShowNoteForm(false)
    }
  }, [isOpen, student?.id])

  const fetchAssignedCheckins = async () => {
    if (!student?.id || isParent) return
    setLoadingCheckins(true)
    try {
      const endpoint = isSuperAdmin
        ? `/api/admin/students/${student.id}/assigned-checkins`
        : `/api/school/students/${student.id}/assigned-checkins`

      const data = await api.get(endpoint)
      setAssignedCheckins(Array.isArray(data) ? data : [])
    } catch {
      setAssignedCheckins([])
    } finally {
      setLoadingCheckins(false)
    }
  }

  const handleCopyTestLink = async (checkin: StudentAssignedCheckin) => {
    if (!checkin.directLink) return
    const fullUrl = `${window.location.origin}${checkin.directLink}`
    try {
      await navigator.clipboard.writeText(fullUrl)
      setCopiedCheckinId(checkin.assessmentId)
      setTimeout(() => setCopiedCheckinId(null), 2500)
    } catch (err) {
      console.error("Failed to copy link", err)
    }
  }

  const fetchHistory = async () => {
    if (!student?.id) return
    setLoading(true)
    try {
      const endpoint = isParent
        ? `/api/parent/student/${student.id}/attempts`
        : isSuperAdmin
        ? `/api/admin/analytics/student/${student.id}/attempts`
        : `/api/school/analytics/student/${student.id}/attempts`

      const data = await api.get(endpoint)
      setHistory(Array.isArray(data) ? data : [])
    } catch {
      setHistory([])
    } finally {
      setLoading(false)
    }
  }

  const fetchNotes = async () => {
    if (!student?.id || isParent) return
    setLoadingNotes(true)
    try {
      const data = await api.get(`/api/school/students/${student.id}/notes`)
      setCounselorNotes(Array.isArray(data) ? data : [])
    } catch {
      setCounselorNotes([])
    } finally {
      setLoadingNotes(false)
    }
  }

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!student?.id || !noteText.trim()) return
    setSavingNote(true)
    try {
      const created = await api.post(`/api/school/students/${student.id}/notes`, {
        intervention_type: noteType,
        status: noteStatus,
        notes: noteText.trim(),
        next_follow_up_date: noteFollowUp || undefined,
      })
      setCounselorNotes([created, ...counselorNotes])
      setNoteText("")
      setNoteFollowUp("")
      setShowNoteForm(false)
    } catch (err: any) {
      alert(err.message || "Failed to save counselor note")
    } finally {
      setSavingNote(false)
    }
  }

  if (!student) return null

  const isUnassessed = !student.check_in_count || student.check_in_count === 0 || student.attn_tier === "Pending Assessment"

  // 4-Pole Diamond Radar (Top, Right, Bottom, Left)
  const attnVal = student.radar_dimensions?.["Attention & Focus Flow"] ?? (student.attn_stability_score ? Math.round(((32 - student.attn_stability_score) / 24) * 100) : 0)
  const socialVal = student.radar_dimensions?.["Social Comfort & Belonging"] ?? (student.social_comfort_score ? Math.round(((32 - student.social_comfort_score) / 24) * 100) : 0)
  const loadVal = student.radar_dimensions?.["Calm & Stress Reset"] ?? (student.load_regulation_score ? Math.round(((32 - student.load_regulation_score) / 24) * 100) : 0)
  const safetyVal = student.radar_dimensions?.["Inner Grounding & Confidence"] ?? (student.self_safety_score ? Math.round(((32 - student.self_safety_score) / 24) * 100) : 0)

  const radarData = isUnassessed
    ? [
        { subject: "Attention & Focus Flow", student: 0, classAvg: 0 },
        { subject: "Social Comfort & Belonging", student: 0, classAvg: 0 },
        { subject: "Calm & Stress Reset", student: 0, classAvg: 0 },
        { subject: "Inner Grounding & Confidence", student: 0, classAvg: 0 },
      ]
    : [
        {
          subject: "Attention & Focus Flow",
          student: Math.min(100, Math.max(10, attnVal)),
          classAvg: 75,
        },
        {
          subject: "Social Comfort & Belonging",
          student: Math.min(100, Math.max(10, socialVal)),
          classAvg: 80,
        },
        {
          subject: "Calm & Stress Reset",
          student: Math.min(100, Math.max(10, loadVal)),
          classAvg: 68,
        },
        {
          subject: "Inner Grounding & Confidence",
          student: Math.min(100, Math.max(10, safetyVal)),
          classAvg: 72,
        },
      ]

  const getTierBadge = (tier?: string) => {
    if (isUnassessed || tier === "Pending Assessment") {
      return {
        label: "Pending Assessment",
        color: "border-muted-foreground/30 bg-muted/40 text-muted-foreground",
      }
    }
    switch (tier) {
      case "Support Needed":
        return {
          label: "Support Needed",
          color: "border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400",
        }
      case "Emerging":
        return {
          label: "Emerging",
          color: "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400",
        }
      default:
        return {
          label: "Stable",
          color: "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
        }
    }
  }

  const getProfileInfo = () => {
    if (isUnassessed) {
      return {
        name: "Pending Assessment",
        color: "border-muted-foreground/30 bg-muted/40 text-muted-foreground",
        desc: "Student has been registered but has not yet completed a baseline regulation check-in.",
        strategy: "Schedule and guide the student to launch their first assessment check-in.",
      }
    }

    if (student.is_balance_mode) {
      return {
        name: "All-Round Balance Mode",
        color: "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
        desc: "Demonstrates stable self-regulation and healthy emotional balance across all four core regulation areas.",
        strategy: "Provide self-directed inquiry challenges, open collaborative roles, and peer-mentoring opportunities.",
      }
    }

    const prof = student.regulation_profile || student.primary_bucket || ""
    if (prof.includes("Attention") || prof === "ATTN_STABILITY" || student.archetype === "observer") {
      return {
        name: "Attention & Focus Flow",
        color: "border-sky-500/40 bg-sky-500/10 text-sky-600 dark:text-sky-400",
        desc: "Focus fluctuates or takes longer to settle into study rhythms. Responsive to structured visual timers and chunked goals.",
        strategy: "Utilize 15-minute visual focus intervals, remove desk clutter, and celebrate micro-milestone completion.",
      }
    }
    if (prof.includes("Inner Grounding") || prof === "SELF_SAFETY") {
      return {
        name: "Inner Grounding & Confidence",
        color: "border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400",
        desc: "Reflective and thoughtful, but experiences evaluative hesitancy or self-doubt when speaking in plenary groups.",
        strategy: "Replace cold-calling with 2-minute paired turn-and-talk check-ins and anonymous question channels.",
      }
    }
    if (prof.includes("Social") || prof === "SOCIAL_COMFORT" || student.archetype === "loyalist") {
      return {
        name: "Social Comfort & Belonging",
        color: "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
        desc: "Navigating group dynamics, peer feedback, or interpersonal mediation strain during team projects.",
        strategy: "Establish structured collaborative partner roles and mentor on setting clear, healthy social boundaries.",
      }
    }
    return {
      name: "Calm & Stress Reset",
      color: "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400",
      desc: "Accumulates daily cognitive load or performance pressure, exacerbated by evening screen study cycles.",
      strategy: "Incorporate 2-minute physiological calm resets and encourage an 8:00 PM digital study wind-down boundary.",
    }
  }

  const profileInfo = getProfileInfo()

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[95vw] sm:max-w-4xl md:max-w-5xl xl:max-w-6xl max-h-[92vh] overflow-y-auto p-6 sm:p-8 rounded-2xl shadow-2xl">
        <DialogHeader className="border-b border-border/50 pb-4 pr-10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <FolderOpen className="h-5 w-5 text-primary" />
                <DialogTitle className="text-lg font-bold text-foreground">
                  {student.name}
                </DialogTitle>
                <Badge variant="outline" className="font-mono text-xs">
                  ID: {student.access_id}
                </Badge>
              </div>
              <DialogDescription className="text-xs text-muted-foreground">
                Class {student.grade} - Section {student.section}
                {student.school_name ? ` • ${student.school_name}` : ""}
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={`text-xs px-2.5 py-1 ${profileInfo.color}`}>
                {profileInfo.name}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* Assigned 16-Track Pathway Banner */}
          {isUnassessed ? (
            <div className="p-4 rounded-xl border border-dashed border-border bg-muted/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] font-mono text-muted-foreground">
                    UNASSESSED
                  </Badge>
                  <span className="text-xs font-semibold text-foreground">
                    Regulation Pathway Status:
                  </span>
                  <span className="text-xs font-medium text-muted-foreground">
                    Awaiting Initial Student Check-in
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Assigned 16-Track Pathway and clinical regulation profile will generate automatically after the first submission.
                </p>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-background/80 border border-border/60 text-xs text-muted-foreground font-mono">
                0 Check-ins Completed
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl border border-sky-500/30 bg-gradient-to-r from-sky-500/10 via-primary/5 to-transparent flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge className="bg-sky-500/20 text-sky-700 dark:text-sky-300 border-sky-500/30 text-[10px] font-mono">
                    {student.pathway_track_id}
                  </Badge>
                  <span className="text-xs font-semibold text-foreground">
                    Assigned Regulation Pathway:
                  </span>
                  <span className="text-xs font-bold text-primary">
                    {student.pathway_track_name}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {student.is_balance_mode
                    ? "Student is in Balance Mode across all 4 regulation skill areas."
                    : `Primary Focus: ${student.primary_bucket} • Support Focus: ${student.secondary_bucket}`}
                </p>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-background/80 border border-border/60 text-xs">
                  {student.momentum_trend === "improving" ? (
                    <>
                      <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">Improving</span>
                    </>
                  ) : student.momentum_trend === "declining" ? (
                    <>
                      <TrendingDown className="h-3.5 w-3.5 text-rose-500" />
                      <span className="text-rose-600 dark:text-rose-400 font-medium">Declining</span>
                    </>
                  ) : (
                    <>
                      <Minus className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground font-medium">Stable</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 4 Core Regulation Bucket Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* 1. Attention & Focus Flow */}
            <div className="p-3 rounded-lg border border-border/60 bg-muted/20 space-y-1.5">
              <span className="text-[11px] text-muted-foreground font-medium block">
                Attention & Focus Flow
              </span>
              <div className="text-xl font-bold text-foreground flex items-baseline gap-1">
                {isUnassessed ? "—" : student.attn_stability_score}
                {!isUnassessed && <span className="text-xs text-muted-foreground font-normal">/32</span>}
              </div>
              <Badge className={`text-[10px] px-2 py-0.5 ${getTierBadge(student.attn_tier).color}`}>
                {getTierBadge(student.attn_tier).label}
              </Badge>
            </div>

            {/* 2. Calm & Stress Reset */}
            <div className="p-3 rounded-lg border border-border/60 bg-muted/20 space-y-1.5">
              <span className="text-[11px] text-muted-foreground font-medium block">
                Calm & Stress Reset
              </span>
              <div className="text-xl font-bold text-foreground flex items-baseline gap-1">
                {isUnassessed ? "—" : student.load_regulation_score}
                {!isUnassessed && <span className="text-xs text-muted-foreground font-normal">/32</span>}
              </div>
              <Badge className={`text-[10px] px-2 py-0.5 ${getTierBadge(student.load_tier).color}`}>
                {getTierBadge(student.load_tier).label}
              </Badge>
            </div>

            {/* 3. Inner Grounding & Confidence */}
            <div className="p-3 rounded-lg border border-border/60 bg-muted/20 space-y-1.5">
              <span className="text-[11px] text-muted-foreground font-medium block">
                Inner Grounding & Confidence
              </span>
              <div className="text-xl font-bold text-foreground flex items-baseline gap-1">
                {isUnassessed ? "—" : student.self_safety_score}
                {!isUnassessed && <span className="text-xs text-muted-foreground font-normal">/32</span>}
              </div>
              <Badge className={`text-[10px] px-2 py-0.5 ${getTierBadge(student.self_safety_tier).color}`}>
                {getTierBadge(student.self_safety_tier).label}
              </Badge>
            </div>

            {/* 4. Social Comfort & Belonging */}
            <div className="p-3 rounded-lg border border-border/60 bg-muted/20 space-y-1.5">
              <span className="text-[11px] text-muted-foreground font-medium block">
                Social Comfort & Belonging
              </span>
              <div className="text-xl font-bold text-foreground flex items-baseline gap-1">
                {isUnassessed ? "—" : student.social_comfort_score}
                {!isUnassessed && <span className="text-xs text-muted-foreground font-normal">/32</span>}
              </div>
              <Badge className={`text-[10px] px-2 py-0.5 ${getTierBadge(student.social_tier).color}`}>
                {getTierBadge(student.social_tier).label}
              </Badge>
            </div>
          </div>

          {/* 4-Pole Diamond Radar & Counselor Directive */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            <div className="p-3 rounded-xl border border-border/60 bg-card">
              <div className="flex items-center justify-between pb-2 border-b border-border/40">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Activity className="h-3.5 w-3.5 text-primary" />
                  4-Pole Diamond Radar (Regulation Stability)
                </span>
                {!isUnassessed && (
                  <div className="flex items-center gap-3 text-[10px]">
                    <span className="flex items-center gap-1 text-sky-600 dark:text-sky-400">
                      <span className="h-2 w-2 rounded-full bg-sky-500" /> Student
                    </span>
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <span className="h-2 w-2 rounded-full bg-muted-foreground/60" /> Class Avg
                    </span>
                  </div>
                )}
              </div>

              <div className="h-60 w-full pt-2 flex items-center justify-center">
                {isUnassessed ? (
                  <div className="flex flex-col items-center justify-center text-center p-4 text-xs text-muted-foreground">
                    <Activity className="h-8 w-8 text-muted-foreground/30 mb-2" />
                    <p className="font-semibold text-foreground">Awaiting Check-in Telemetry</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 max-w-[200px]">
                      Diamond radar poles will map dynamically once student submits their first check-in.
                    </p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="72%" data={radarData}>
                      <PolarGrid stroke={isDark ? "#334155" : "#e2e8f0"} strokeDasharray="3 3" />
                      <PolarAngleAxis
                        dataKey="subject"
                        tick={{ fill: isDark ? "#94a3b8" : "#475569", fontSize: 10, fontWeight: 500 }}
                      />
                      <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                      <Radar
                        name="Student"
                        dataKey="student"
                        stroke="#0284c7"
                        fill="#0284c7"
                        fillOpacity={0.25}
                        strokeWidth={2}
                      />
                      <Radar
                        name="Class Avg"
                        dataKey="classAvg"
                        stroke={isDark ? "#64748b" : "#94a3b8"}
                        fill={isDark ? "#64748b" : "#94a3b8"}
                        fillOpacity={0.1}
                        strokeWidth={1.5}
                        strokeDasharray="2 2"
                      />
                      <RechartsTooltip
                        formatter={(val: any) => [`${val}% Stability`, "Score"]}
                        contentStyle={{
                          backgroundColor: isDark ? "#0f172a" : "#ffffff",
                          borderColor: isDark ? "#334155" : "#e2e8f0",
                          fontSize: "11px",
                        }}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Profile Insights & Actionable Playbook */}
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl border border-sky-500/30 bg-sky-500/5 space-y-1.5">
                <span className="text-[11px] font-semibold text-sky-600 dark:text-sky-400 flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Primary Regulation Focus: {profileInfo.name}
                </span>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {profileInfo.desc}
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-1.5">
                <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <Lightbulb className="h-3.5 w-3.5" />
                  Actionable Teacher & Counselor Playbook
                </span>
                <p className="text-[11px] text-foreground font-medium leading-relaxed">
                  {profileInfo.strategy}
                </p>
              </div>
            </div>
          </div>


          {/* Assigned Check-ins & Evaluation Status Section */}
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <BookOpen className="h-4 w-4 text-primary" />
                Assigned Check-ins & Evaluation Status
              </span>
              {assignedCheckins.length > 0 && (
                <Badge variant="outline" className="text-[10px] font-normal text-muted-foreground">
                  {assignedCheckins.filter(c => c.status === "completed").length} of {assignedCheckins.length} Completed
                </Badge>
              )}
            </div>

            {loadingCheckins ? (
              <div className="h-20 bg-muted/40 animate-pulse rounded-xl" />
            ) : assignedCheckins.length > 0 ? (
              <div className="border border-border/60 rounded-xl overflow-x-auto bg-card shadow-xs">
                <Table className="w-full min-w-[680px]">
                  <TableHeader className="bg-muted/30">
                    <TableRow className="text-[11px]">
                      <TableHead className="min-w-[220px]">Check-in Title & Tier</TableHead>
                      <TableHead className="w-32 min-w-[110px]">Target Cohort</TableHead>
                      <TableHead className="min-w-[170px]">Current Status</TableHead>
                      <TableHead className="text-center w-24 min-w-[70px]">Attempts</TableHead>
                      <TableHead className="text-right w-32 min-w-[110px]">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assignedCheckins.map((checkin) => {
                      const isDone = checkin.status === "completed"
                      const isReassigned = checkin.status === "reassigned"

                      return (
                        <TableRow key={checkin.assessmentId} className="text-xs">
                          <TableCell className="font-medium text-foreground">
                            <div className="flex flex-col space-y-0.5">
                              <span className="font-semibold text-foreground">{checkin.title}</span>
                              {checkin.tier && checkin.tier !== "all" && (
                                <span className="text-[10px] text-muted-foreground capitalize">
                                  {checkin.tier.replace(/_/g, " ")}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-[10px] font-normal">
                              {checkin.targetGrades && checkin.targetGrades.length > 0
                                ? `Grades ${checkin.targetGrades.join(", ")}`
                                : "All Grades"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {isDone ? (
                              <div className="flex flex-col space-y-0.5">
                                <div className="flex items-center gap-1.5">
                                  <Badge variant="default" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] gap-1 px-1.5 py-0 border-emerald-500/20">
                                    <CheckCircle2 className="h-2.5 w-2.5" /> Completed
                                  </Badge>
                                  <span className="font-semibold text-[11px] text-foreground">
                                    {checkin.assignedBucket || "Evaluated"}
                                  </span>
                                </div>
                                <div className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                                  {checkin.totalScore !== undefined && checkin.totalScore > 0 && (
                                    <span>Score: {checkin.totalScore} pts</span>
                                  )}
                                  {checkin.completedAt && (
                                    <>
                                      <span>•</span>
                                      <span>{new Date(checkin.completedAt).toLocaleDateString()}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            ) : isReassigned ? (
                              <div className="flex flex-col space-y-0.5">
                                <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px] gap-1 px-1.5 py-0 w-fit">
                                  <RotateCcw className="h-2.5 w-2.5" /> Retake Unlocked
                                </Badge>
                                <span className="text-[10px] text-muted-foreground">
                                  Reassigned for new submission
                                </span>
                              </div>
                            ) : (
                              <Badge variant="secondary" className="text-[10px] text-muted-foreground font-normal">
                                Pending / Not Started
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-center font-mono text-xs">
                            {checkin.attemptsCount > 0 ? (
                              <span className="font-semibold">{checkin.attemptsCount}</span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {checkin.directLink && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCopyTestLink(checkin)}
                                className="h-7 text-[11px] px-2 gap-1 text-primary hover:text-primary hover:bg-primary/10"
                                title="Copy direct student test login link"
                              >
                                {copiedCheckinId === checkin.assessmentId ? (
                                  <>
                                    <Check className="h-3 w-3 text-emerald-500" />
                                    <span>Copied</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="h-3 w-3" />
                                    <span>Copy Link</span>
                                  </>
                                )}
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="p-4 rounded-lg border border-dashed border-border/60 bg-muted/10 text-center text-xs text-muted-foreground">
                No active check-ins currently targeted to this student's grade ({student.grade}).
              </div>
            )}
          </div>

          {/* Historical Attempts Table */}
          <div className="space-y-2.5">
            <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              Check-In History & Longitudinal Record
            </span>

            {history.some((a) => a.is_prior_school) && (
              <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-700 dark:text-purple-300 flex items-center gap-2.5">
                <Building2 className="h-5 w-5 text-purple-600 shrink-0" />
                <div>
                  <span className="font-semibold block">Academic Transfer Records Detected</span>
                  <span className="text-[11px] text-muted-foreground">Historical records from student&apos;s previous school enrollment are retained for counseling continuity. Institutional identity is anonymized.</span>
                </div>
              </div>
            )}

            {loading ? (
              <div className="h-20 bg-muted/40 animate-pulse rounded-xl" />
            ) : history.length > 0 ? (
              <div className="border border-border/60 rounded-xl overflow-x-auto bg-card shadow-xs">
                <Table className="w-full min-w-[550px]">
                  <TableHeader className="bg-muted/30">
                    <TableRow className="text-[11px]">
                      <TableHead className="w-16">Attempt</TableHead>
                      <TableHead className="min-w-[130px]">Origin / Environment</TableHead>
                      <TableHead className="min-w-[100px]">Date</TableHead>
                      <TableHead className="min-w-[90px]">Score</TableHead>
                      <TableHead className="min-w-[120px]">Archetype Result</TableHead>
                      <TableHead className="min-w-[90px]">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((att, idx) => (
                      <TableRow key={att.id || idx} className="text-xs">
                        <TableCell className="font-mono font-medium">#{history.length - idx}</TableCell>
                        <TableCell>
                          {att.is_prior_school ? (
                            <div className="flex flex-col gap-0.5">
                              <Badge variant="outline" className="text-[9px] font-medium border-purple-500/30 text-purple-600 dark:text-purple-400 bg-purple-500/5 inline-flex items-center gap-1 w-fit">
                                <Building2 className="h-3 w-3" />
                                <span>Prior Institution</span>
                              </Badge>
                              <span className="text-[9px] text-muted-foreground font-mono">Academic Transfer</span>
                            </div>
                          ) : att.origin === "parent" ? (
                            <Badge variant="outline" className="text-[9px] font-medium border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/5 inline-flex items-center gap-1">
                              <Home className="h-3 w-3" />
                              <span>Home Check-in</span>
                            </Badge>
                          ) : att.origin === "student" ? (
                            <Badge variant="outline" className="text-[9px] font-medium border-slate-500/30 text-slate-600 dark:text-slate-400 bg-slate-500/5 inline-flex items-center gap-1">
                              <User className="h-3 w-3" />
                              <span>Student Direct</span>
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[9px] font-medium border-sky-500/30 text-sky-600 dark:text-sky-400 bg-sky-500/5 inline-flex items-center gap-1">
                              <GraduationCap className="h-3 w-3" />
                              <span>{att.school_name && !att.is_prior_school ? att.school_name : "School Session"}</span>
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground font-mono text-[11px]">
                          {att.completed_at ? new Date(att.completed_at).toLocaleDateString() : "Recent"}
                        </TableCell>
                        <TableCell className="font-bold text-foreground">{att.total_score ?? 80}/100</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] capitalize">
                            {att.assigned_bucket || "Standard"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/30 bg-emerald-500/5">
                            Completed
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="p-4 rounded-lg border border-border/40 bg-muted/10 text-center text-xs text-muted-foreground">
                First check-in completed on {new Date(student.last_check_in_date || Date.now()).toLocaleDateString()}. Additional attempt history will aggregate on subsequent quarterly evaluations.
              </div>
            )}
          </div>

          {/* Confidential Counselor Action Log & Case Notes (School Counselor Scoped) */}
          {!isParent && (
          <div className="space-y-3 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  Counselor Action Log & Case Notes
                </span>
                <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                  Counselor Scoped
                </Badge>
              </div>

              {!isSuperAdmin && (
                <Button
                  size="sm"
                  variant={showNoteForm ? "secondary" : "outline"}
                  onClick={() => setShowNoteForm(!showNoteForm)}
                  className="h-7 text-xs flex items-center gap-1"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {showNoteForm ? "Cancel Entry" : "Log Intervention"}
                </Button>
              )}
            </div>

            {/* Inline Note Creation Form */}
            {showNoteForm && (
              <form onSubmit={handleSaveNote} className="rounded-xl border border-border/80 bg-muted/30 p-3.5 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-foreground">Intervention Type</label>
                    <select
                      value={noteType}
                      onChange={(e) => setNoteType(e.target.value)}
                      className="w-full h-8 text-xs rounded-md border border-input bg-background px-2"
                    >
                      <option value="1-on-1 Boundary Coaching">1-on-1 Boundary Coaching</option>
                      <option value="Peer Mediation & Drama Detox">Peer Mediation & Drama Detox</option>
                      <option value="Sleep & Screen Curfew Pacing">Sleep & Screen Curfew Pacing</option>
                      <option value="Evaluative Hesitancy & Pair-Share">Evaluative Hesitancy & Pair-Share</option>
                      <option value="Academic Tenacity & Exam Anxiety">Academic Tenacity & Exam Anxiety</option>
                      <option value="Routine & Transition Support">Routine & Transition Support</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-foreground">Status</label>
                    <select
                      value={noteStatus}
                      onChange={(e) => setNoteStatus(e.target.value)}
                      className="w-full h-8 text-xs rounded-md border border-input bg-background px-2"
                    >
                      <option value="in_progress">In Progress</option>
                      <option value="monitoring">Monitoring</option>
                      <option value="resolved">Resolved</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-foreground">Next Follow-Up Date</label>
                    <Input
                      type="date"
                      value={noteFollowUp}
                      onChange={(e) => setNoteFollowUp(e.target.value)}
                      className="h-8 text-xs bg-background"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-foreground">Clinical & Counselor Notes</label>
                  <Textarea
                    placeholder="Document 1-on-1 session highlights, agreed student behavioral commitments, or teacher coordination actions..."
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    required
                    rows={3}
                    className="text-xs bg-background resize-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowNoteForm(false)}
                    className="h-7 text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={savingNote || !noteText.trim()}
                    size="sm"
                    className="h-7 text-xs bg-primary text-primary-foreground"
                  >
                    {savingNote ? "Saving..." : "Save Case Note"}
                  </Button>
                </div>
              </form>
            )}

            {/* Notes List */}
            {loadingNotes ? (
              <div className="h-20 bg-muted/40 animate-pulse rounded-lg" />
            ) : counselorNotes.length > 0 ? (
              <div className="space-y-2.5">
                {counselorNotes.map((note) => (
                  <div
                    key={note.id}
                    className="p-3.5 rounded-xl border border-border/60 bg-card/60 space-y-2 text-xs"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-border/40 pb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-[10px] font-medium bg-primary/10 text-primary border-primary/20">
                          {note.intervention_type}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            note.status === "resolved"
                              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                              : note.status === "monitoring"
                              ? "bg-sky-500/10 text-sky-600 border-sky-500/30"
                              : "bg-amber-500/10 text-amber-600 border-amber-500/30"
                          }`}
                        >
                          {note.status === "resolved"
                            ? "Resolved"
                            : note.status === "monitoring"
                            ? "Monitoring"
                            : "In Progress"}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        <span className="font-medium text-foreground">{note.author_name}</span>
                        <span>•</span>
                        <span>{new Date(note.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <p className="text-xs text-foreground leading-relaxed">
                      {note.notes}
                    </p>

                    {note.next_follow_up_date && (
                      <div className="flex items-center gap-1.5 text-[10px] font-medium text-amber-600 dark:text-amber-400 pt-0.5">
                        <Calendar className="h-3 w-3" />
                        Next Follow-Up Scheduled: {note.next_follow_up_date}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-lg border border-dashed border-border/60 bg-muted/10 text-center text-xs text-muted-foreground">
                No counselor intervention notes logged yet for this student. Click "Log Intervention" above to document a 1-on-1 check-in or action plan.
              </div>
            )}
          </div>
          )}
        </div>

        <div className="pt-4 border-t border-border/40 flex justify-end">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
            Close Dossier
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
