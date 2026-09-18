"use client"

import { useEffect, useState, useMemo } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Users,
  GraduationCap,
  FileText,
  QrCode,
  FolderOpen,
  LifeBuoy,
  BookOpen,
  Settings,
  ArrowRight,
  Plus,
  TrendingUp,
  Calendar,
  MapPin,
  Phone,
  ShieldCheck,
  CheckCircle2,
  Clock,
  BarChart3,
  Sparkles,
  GitBranch,
  ArrowUpRight,
  TrendingDown,
  Minus,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from "recharts"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { api } from "@/lib/api"
import { useAuth } from "@/context/auth-context"
import { InfoTooltip } from "@/components/ui/info-tooltip"
import { MinimalUUID } from "@/components/ui/minimal-uuid"

import { EventsAuditCard, AuditEvent } from "@/components/events-audit-card"
import { StudentDossierDialog, StudentProfileData } from "@/components/student-dossier-dialog"
import { CreateBranchDialog } from "@/components/create-branch-dialog"

interface SchoolDashboardData {
  school?: {
    id: string
    name: string
    code?: string
    school_code?: string
    city?: string
    state?: string
    contact_phone?: string
    contact_email?: string
    is_active?: boolean
    parent_school_id?: string
  }
  total_students: number
  total_teachers: number
}

interface StudentRecord {
  id: string
  access_id: string
  name: string
  grade: string
  section: string
}

interface ScheduledPromotion {
  id: string
  from_grade: string
  to_grade: string
  scheduled_date: string
  status: string
  student_count: number
}

interface TestItem {
  id: string
  _id?: string
  title: string
  is_active: boolean
}

export default function SchoolDashboardPage() {
  const { user, isSchoolAdmin, isSuperAdmin, hasRole } = useAuth()
  const searchParams = useSearchParams()
  const view = searchParams.get("view")
  const canManage = isSchoolAdmin || isSuperAdmin || hasRole("superadmin") || hasRole("school_admin")
  const isStrictTeacher = hasRole("teacher") && !canManage
  const isTeacherView = isStrictTeacher || (hasRole("teacher") && view === "teacher")
  const assignedGrade = user?.metadata?.assigned_grade || "9"
  const assignedSection = user?.metadata?.assigned_section || "A"

  const [data, setData] = useState<SchoolDashboardData | null>(null)
  const [students, setStudents] = useState<StudentRecord[]>([])
  const [tests, setTests] = useState<TestItem[]>([])
  const [promotions, setPromotions] = useState<ScheduledPromotion[]>([])
  const [events, setEvents] = useState<AuditEvent[]>([])
  const [eventsLoading, setEventsLoading] = useState(false)
  const [loading, setLoading] = useState(true)

  // Satellite branch creation modal
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false)

  // Student behavioral dossiers state
  const [studentProfiles, setStudentProfiles] = useState<StudentProfileData[]>([])
  const [selectedDossierStudent, setSelectedDossierStudent] = useState<StudentProfileData | null>(null)
  const [isDossierOpen, setIsDossierOpen] = useState(false)
  const [dossierSearch, setDossierSearch] = useState("")
  const [dossierGradeFilter, setDossierGradeFilter] = useState("all")
  const [dossierPage, setDossierPage] = useState(1)
  const DOSSIER_PAGE_SIZE = 6

  async function loadEvents() {
    setEventsLoading(true)
    try {
      const res = await api.get<AuditEvent[]>("/api/school/events")
      if (Array.isArray(res)) setEvents(res)
    } catch (err) {
      console.error("Failed to load school events", err)
    } finally {
      setEventsLoading(false)
    }
  }

  async function loadSchoolData() {
    setLoading(true)
    try {
      const [dashRes, studentsRes, testsRes, promoRes, eventsRes, analyticsRes] = await Promise.all([
        api.get("/api/school/dashboard").catch(() => null),
        api.get("/api/school/students").catch(() => []),
        api.get("/api/school/tests").catch(() => []),
        api.get("/api/school/students/scheduled-promotions").catch(() => []),
        api.get("/api/school/events").catch(() => []),
        api.get<any>("/api/school/analytics").catch(() => null),
      ])

      if (dashRes) setData(dashRes)
      if (Array.isArray(studentsRes)) setStudents(studentsRes)
      if (Array.isArray(testsRes)) setTests(testsRes)
      if (Array.isArray(promoRes)) setPromotions(promoRes)
      if (Array.isArray(eventsRes)) setEvents(eventsRes)

      let profiles: StudentProfileData[] = []
      if (analyticsRes?.students && Array.isArray(analyticsRes.students)) {
        profiles = analyticsRes.students
      }

      if (Array.isArray(studentsRes) && studentsRes.length > 0) {
        const existingIds = new Set(profiles.map((p) => p.id))
        studentsRes.forEach((s: StudentRecord) => {
          if (!existingIds.has(s.id)) {
            profiles.push({
              id: s.id,
              access_id: s.access_id,
              name: s.name,
              grade: s.grade,
              section: s.section,
              school_id: dashRes?.school?.id || "",
              school_name: dashRes?.school?.name || "",
              archetype: "sprinter",
              focus_score: 75,
              resilience_score: 72,
              academic_tenacity: 70,
              stress_adaptability: 68,
              primary_friction: "Initial baseline profile pending first longitudinal check-in",
              momentum_trend: "stable",
              last_check_in_date: new Date().toISOString(),
              check_in_count: 0,
            })
          }
        })
      }
      setStudentProfiles(profiles)
    } catch (err) {
      console.error("Dashboard error", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSchoolData()
  }, [])

  // Calculate grade distribution
  const gradeDistribution = useMemo(() => {
    const counts: Record<string, number> = {}
    students.forEach((s) => {
      const g = (s.grade || "")
        .replace(/^(Class|Grade)\s+/i, "")
        .replace(/(st|nd|rd|th)$/i, "")
        .trim()
      if (g) {
        counts[g] = (counts[g] || 0) + 1
      }
    })

    // Standard secondary and senior secondary grades
    const standardGrades = ["6", "7", "8", "9", "10", "11", "12"]

    // Include all standard grades plus any additional grades found in student records
    const allGradeKeys = Array.from(new Set([...standardGrades, ...Object.keys(counts)]))
      .sort((a, b) => {
        const numA = parseInt(a, 10)
        const numB = parseInt(b, 10)
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB
        return a.localeCompare(b)
      })

    return allGradeKeys.map((grade) => ({
      grade: `Class ${grade}`,
      students: counts[grade] || 0,
    }))
  }, [students])

  const totalStudents = data?.total_students ?? students.length
  const totalTeachers = data?.total_teachers ?? 0
  const activeTestsCount = tests.length
  const pendingPromotions = promotions.filter((p) => p.status === "scheduled")

  // Filtered & Paginated Behavioral Dossiers
  const filteredDossierStudents = useMemo(() => {
    const cleanFilter = (dossierGradeFilter || "")
      .replace(/^(Class|Grade)\s+/i, "")
      .replace(/(st|nd|rd|th)$/i, "")
      .trim()
      .toLowerCase()

    return studentProfiles.filter((st) => {
      const matchesSearch =
        dossierSearch === "" ||
        st.name.toLowerCase().includes(dossierSearch.toLowerCase()) ||
        st.access_id.toLowerCase().includes(dossierSearch.toLowerCase())

      const cleanStGrade = (st.grade || "")
        .replace(/^(Class|Grade)\s+/i, "")
        .replace(/(st|nd|rd|th)$/i, "")
        .trim()
        .toLowerCase()

      const matchesGrade =
        dossierGradeFilter === "all" || cleanStGrade === cleanFilter

      return matchesSearch && matchesGrade
    })
  }, [studentProfiles, dossierSearch, dossierGradeFilter])

  const totalDossierPages = Math.ceil(filteredDossierStudents.length / DOSSIER_PAGE_SIZE) || 1
  const paginatedDossierStudents = useMemo(() => {
    const start = (dossierPage - 1) * DOSSIER_PAGE_SIZE
    return filteredDossierStudents.slice(start, start + DOSSIER_PAGE_SIZE)
  }, [filteredDossierStudents, dossierPage])

  return (
    <div className="space-y-6">
      {/* Institution / Classroom Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-semibold tracking-tight">
              {isTeacherView
                ? `Classroom Dashboard: Grade ${assignedGrade}-${assignedSection}`
                : data?.school?.name || "Institution Dashboard"}
            </h1>
            {isTeacherView ? (
              <Badge variant="outline" className="font-mono text-xs px-2.5 py-0.5 bg-primary/10 text-primary border-primary/30">
                Classroom Portal
              </Badge>
            ) : (
              <>
                {(data?.school?.school_code || data?.school?.code) && (
                  <Badge variant="outline" className="font-mono text-xs px-2 py-0.5">
                    {data.school.school_code || data.school.code}
                  </Badge>
                )}
                {data?.school?.id && (
                  <MinimalUUID id={data.school.id} label="Campus UUID" />
                )}
                {data?.school?.parent_school_id ? (
                  <Badge variant="outline" className="text-purple-600 bg-purple-500/10 border-purple-500/20 text-xs">
                    <GitBranch className="h-3 w-3 mr-1" /> Branch Campus
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-blue-600 bg-blue-500/10 border-blue-500/20 text-xs">
                    Main Campus
                  </Badge>
                )}
              </>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-3 flex-wrap">
            <span>
              Welcome back, <span className="font-medium text-foreground">{user?.name || user?.email}</span> (
              {isTeacherView
                ? `Class Teacher — Grade ${assignedGrade}-${assignedSection}`
                : isSchoolAdmin
                ? "School Administrator"
                : "Faculty / Educator"}
              )
            </span>
            {data?.school?.city && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3 text-primary" /> {data.school.city}
              </span>
            )}
            {data?.school?.contact_phone && (
              <span className="flex items-center gap-1 font-mono">
                <Phone className="h-3 w-3 text-muted-foreground" /> {data.school.contact_phone}
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isTeacherView ? (
            <>
              <Link href="/school/students">
                <Button size="sm" variant="outline" className="gap-1.5 text-xs">
                  <Users className="h-3.5 w-3.5" />
                  Class Roster
                </Button>
              </Link>
              <Link href="/school/tests">
                <Button size="sm" className="gap-1.5 text-xs">
                  <FileText className="h-3.5 w-3.5" />
                  Active Check-ins
                </Button>
              </Link>
            </>
          ) : (
            <>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs border-primary/30 text-primary hover:bg-primary/5 font-medium"
                onClick={() => setIsBranchModalOpen(true)}
              >
                <GitBranch className="h-3.5 w-3.5 text-primary" />
                Add Satellite Branch
              </Button>
              <Link href="/school/account">
                <Button size="sm" variant="outline" className="gap-1.5 text-xs">
                  <Settings className="h-3.5 w-3.5" />
                  Campus Settings
                </Button>
              </Link>
              <Link href="/school/tests">
                <Button size="sm" className="gap-1.5 text-xs">
                  <FileText className="h-3.5 w-3.5" />
                  Active Check-ins
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Top 4 Metric KPI Cards with Aligned Row Layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Enrolled Students */}
        <Card className="p-5 border-border shadow-none flex !flex-row items-center justify-between">
          <div>
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <span>Enrolled Students</span>
              <InfoTooltip text="Total registered student profiles in this institution roster." />
            </div>
            <div className="text-2xl font-semibold mt-1">
              {loading ? "..." : totalStudents}
            </div>
            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" /> Longitudinal profiles
            </div>
          </div>
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <Users className="h-5 w-5" />
          </div>
        </Card>

        {/* Teacher & Class Access / Assigned Class */}
        <Card className="p-5 border-border shadow-none flex !flex-row items-center justify-between">
          <div>
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <span>{isTeacherView ? "Assigned Section" : "Teacher & Class Access"}</span>
              <InfoTooltip text={isTeacherView ? "Your assigned classroom section for this academic term." : "Authorized class teachers and counselors with portal credentials to conduct check-ins."} />
            </div>
            <div className="text-2xl font-semibold mt-1">
              {isTeacherView ? `Sec ${assignedSection}` : (loading ? "..." : totalTeachers)}
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              {isTeacherView ? `Grade ${assignedGrade} Cohort` : "Assigned class teachers"}
            </div>
          </div>
          <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
            {isTeacherView ? <BookOpen className="h-5 w-5" /> : <GraduationCap className="h-5 w-5" />}
          </div>
        </Card>

        {/* Active Check-in Instruments */}
        <Card className="p-5 border-border shadow-none flex !flex-row items-center justify-between">
          <div>
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <span>Active Check-ins</span>
              <InfoTooltip text="Wellness check-ins and developmental assessments available to your students." />
            </div>
            <div className="text-2xl font-semibold mt-1 text-indigo-600 dark:text-indigo-400">
              {loading ? "..." : activeTestsCount}
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              Psychological vectors
            </div>
          </div>
          <div className="h-10 w-10 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
            <FileText className="h-5 w-5" />
          </div>
        </Card>

        {/* Academic Year Cycle */}
        <Card className="p-5 border-border shadow-none flex !flex-row items-center justify-between">
          <div>
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <span>Academic Cycle</span>
              <InfoTooltip text="Active academic session and status of automated annual class promotions." />
            </div>
            <div className="text-lg font-semibold mt-1 text-foreground">
              AY 2026-27
            </div>
            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" /> Active Session
            </div>
          </div>
          <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 shrink-0">
            <Calendar className="h-5 w-5" />
          </div>
        </Card>
      </div>

      {/* Quick Actions Command Bar */}
      <Card className="border-border shadow-none bg-muted/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
                Quick Actions
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {!isTeacherView && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs gap-1.5 bg-background border-primary/30 text-primary hover:bg-primary/5"
                  onClick={() => setIsBranchModalOpen(true)}
                >
                  <GitBranch className="h-3.5 w-3.5" /> Add Satellite Campus
                </Button>
              )}
              <a href="#student-dossiers">
                <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 bg-background">
                  <FolderOpen className="h-3.5 w-3.5 text-sky-600" /> Student Dossiers
                </Button>
              </a>
              <Link href="/school/students">
                <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 bg-background">
                  <Plus className="h-3.5 w-3.5 text-primary" /> {isTeacherView ? "Class Roster" : "Add / Manage Students"}
                </Button>
              </Link>
              {!isTeacherView && (
                <Link href="/school/students">
                  <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 bg-background">
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-600" /> Class Promotions & AY Rollover
                  </Button>
                </Link>
              )}
              <Link href="/school/tests">
                <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 bg-background">
                  <QrCode className="h-3.5 w-3.5 text-indigo-600" /> Check-in Links & QR
                </Button>
              </Link>
              {!isTeacherView && (
                <Link href="/school/tickets">
                  <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 bg-background">
                    <LifeBuoy className="h-3.5 w-3.5 text-amber-600" /> Support Desk
                  </Button>
                </Link>
              )}
              <Link href="/school/guide">
                <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 bg-background">
                  <BookOpen className="h-3.5 w-3.5 text-blue-600" /> Platform Guide
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grade Distribution & Operational Activity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Grade-wise Enrollment Bar Chart */}
        <Card className="lg:col-span-7 border-border shadow-none flex flex-col justify-between">
          <CardHeader className="border-b border-border/40 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  Grade-wise Student Enrollment
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Distribution of active student records across secondary and senior classes.
                </CardDescription>
              </div>
              <Badge variant="outline" className="font-mono text-xs">
                {totalStudents} Total
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-4 pb-2">
            <div className="h-[270px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={gradeDistribution} margin={{ top: 15, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradeBarGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0284c7" stopOpacity={1} />
                      <stop offset="100%" stopColor="#0369a1" stopOpacity={0.75} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="grade"
                    tick={{ fill: "currentColor", fontSize: 11 }}
                    axisLine={{ stroke: "var(--border)" }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "currentColor", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <RechartsTooltip
                    cursor={{ fill: "var(--muted)", opacity: 0.15 }}
                    contentStyle={{
                      backgroundColor: "var(--card)",
                      borderColor: "var(--border)",
                      borderRadius: "8px",
                      fontSize: "12px",
                      color: "var(--foreground)",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                    }}
                    formatter={(val: any) => [`${val} Students`, "Enrolled"]}
                  />
                  <Bar
                    dataKey="students"
                    fill="url(#gradeBarGrad)"
                    radius={[5, 5, 0, 0]}
                    maxBarSize={45}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-border/40 text-[11px] text-muted-foreground">
              <span>Includes active roster submissions for AY 2026-27</span>
              <Link href="/school/students" className="text-primary hover:underline flex items-center gap-1 font-medium">
                Manage Class Rosters <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Operational Activity & Readiness Telemetry */}
        <Card className="lg:col-span-5 border-border shadow-none flex flex-col justify-between">
          <CardHeader className="border-b border-border/40 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  Operational Telemetry & Readiness
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Academic rollover jobs, student check-in readiness, and system alerts.
                </CardDescription>
              </div>
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">
                Active
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0 divide-y divide-border/50 text-xs">
            {/* Scheduled Promotions Status */}
            <div className="p-3.5 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-primary" /> Academic Year Promotions
                </span>
                {pendingPromotions.length > 0 ? (
                  <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px]">
                    {pendingPromotions.length} Scheduled
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">
                    Current
                  </Badge>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">
                {pendingPromotions.length > 0
                  ? `Next promotion: ${pendingPromotions[0].from_grade} → ${pendingPromotions[0].to_grade} on ${new Date(pendingPromotions[0].scheduled_date).toLocaleDateString()}`
                  : "No pending rollover schedules. Class rosters are up to date for the current academic session."}
              </p>
            </div>

            {/* Check-ins Assignment Status */}
            <div className="p-3.5 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-indigo-600" /> Wellness Check-in Instruments
                </span>
                <Badge variant="outline" className="font-mono text-[10px]">
                  {tests.length} Published
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {tests.length > 0
                  ? `Active instrument: "${tests[0].title}". Students can access via direct links and QR codes.`
                  : "No active check-ins configured. Superadmins can assign developmental templates."}
              </p>
            </div>

            {/* Student ID & Roll Number Identification */}
            <div className="p-3.5 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> Student Access Identity
                </span>
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">
                  Configured
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground">
                System UUIDs are auto-generated for security. Students identify using their School Roll Number / Access ID during check-ins.
              </p>
            </div>
          </CardContent>

          <div className="p-3 border-t border-border/40 bg-muted/20 text-[11px] text-muted-foreground flex items-center justify-between">
            <span>Need curriculum or technical assistance?</span>
            <Link href="/school/support" className="text-primary hover:underline flex items-center gap-1 font-medium">
              Open Support Ticket <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </Card>
      </div>

      {/* Student Longitudinal Behavioral Dossiers Section */}
      <Card id="student-dossiers" className="border-border shadow-none">
        <CardHeader className="border-b border-border/40 pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <FolderOpen className="h-4 w-4 text-primary" />
                <CardTitle className="text-base font-semibold">
                  Student Behavioral Dossiers & Profiles
                </CardTitle>
                <Badge variant="outline" className="font-mono text-xs">
                  {filteredDossierStudents.length} Active
                </Badge>
              </div>
              <CardDescription className="text-xs mt-0.5">
                Multi-dimensional cognitive radar profiles, primary friction indicators, and counselor intervention logs.
              </CardDescription>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={dossierGradeFilter}
                onChange={(e) => {
                  setDossierGradeFilter(e.target.value)
                  setDossierPage(1)
                }}
                className="h-8 rounded-md border border-input bg-background px-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-medium"
              >
                <option value="all">All Grades</option>
                {["6", "7", "8", "9", "10", "11", "12"].map((g) => (
                  <option key={g} value={g}>Class {g}</option>
                ))}
              </select>

              <div className="relative w-48 sm:w-60">
                <Search className="h-3.5 w-3.5 text-muted-foreground absolute left-2.5 top-2.5" />
                <Input
                  placeholder="Search name or ID..."
                  value={dossierSearch}
                  onChange={(e) => {
                    setDossierSearch(e.target.value)
                    setDossierPage(1)
                  }}
                  className="h-8 pl-8 text-xs"
                />
              </div>

              <Link href="/school/analytics">
                <Button size="sm" variant="outline" className="h-8 text-xs gap-1">
                  View Full Analytics
                  <ArrowUpRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="text-[11px]">
                  <TableHead>Student Name & ID</TableHead>
                  <TableHead>Class / Sec</TableHead>
                  <TableHead>Behavioral Archetype</TableHead>
                  <TableHead>Focus / Resilience</TableHead>
                  <TableHead>Primary Friction Vector</TableHead>
                  <TableHead>Momentum Trend</TableHead>
                  <TableHead className="text-right">Dossier Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedDossierStudents.length > 0 ? (
                  paginatedDossierStudents.map((st) => (
                    <TableRow key={st.id} className="text-xs hover:bg-muted/20">
                      <TableCell>
                        <div>
                          <span className="font-semibold text-foreground">{st.name}</span>
                          <div className="text-[10px] font-mono text-muted-foreground">ID: {st.access_id}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        Class {st.grade} {st.section ? `- ${st.section}` : ""}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            st.archetype === "sprinter"
                              ? "bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px] font-medium"
                              : st.archetype === "observer"
                                ? "bg-sky-500/10 text-sky-600 border-sky-500/20 text-[10px] font-medium"
                                : st.archetype === "loyalist"
                                  ? "bg-rose-500/10 text-rose-600 border-rose-500/20 text-[10px] font-medium"
                                  : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] font-medium"
                          }
                        >
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
                      <TableCell className="text-muted-foreground text-[11px] max-w-[240px] truncate" title={st.primary_friction}>
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
                          className="text-xs h-7 gap-1 border-primary/30 text-primary hover:bg-primary/5 font-medium"
                          onClick={() => {
                            setSelectedDossierStudent(st)
                            setIsDossierOpen(true)
                          }}
                        >
                          <FolderOpen className="h-3.5 w-3.5 text-primary" />
                          Inspect Dossier
                          <ArrowUpRight className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-28 text-center text-muted-foreground text-xs">
                      No student behavioral dossiers matched your criteria.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Controls */}
          {filteredDossierStudents.length > DOSSIER_PAGE_SIZE && (
            <div className="flex items-center justify-between p-3 border-t border-border/40 text-xs text-muted-foreground">
              <span>
                Showing {(dossierPage - 1) * DOSSIER_PAGE_SIZE + 1} to{" "}
                {Math.min(dossierPage * DOSSIER_PAGE_SIZE, filteredDossierStudents.length)} of{" "}
                {filteredDossierStudents.length} dossiers
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 w-7 p-0"
                  disabled={dossierPage === 1}
                  onClick={() => setDossierPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <span className="px-2 text-xs font-medium">
                  {dossierPage} / {totalDossierPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 w-7 p-0"
                  disabled={dossierPage >= totalDossierPages}
                  onClick={() => setDossierPage((p) => Math.min(totalDossierPages, p + 1))}
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Institutional Activity & Governance Events Audit Card */}
      {!isTeacherView && (
        <EventsAuditCard
          events={events}
          loading={eventsLoading}
          onRefresh={loadEvents}
          isAdminView={false}
          title="School Activity & Governance Audit Trail"
          description="Live audit trail of student roster promotions, instrument assignments, counselor escalations, and institution security changes."
        />
      )}

      {/* Student Dossier Dialog */}
      <StudentDossierDialog
        isOpen={isDossierOpen}
        onClose={() => {
          setIsDossierOpen(false)
          setSelectedDossierStudent(null)
        }}
        student={selectedDossierStudent}
      />

      {/* Satellite Branch Campus Dialog */}
      <CreateBranchDialog
        isOpen={isBranchModalOpen}
        onClose={() => setIsBranchModalOpen(false)}
        onSuccess={() => {
          loadSchoolData()
          loadEvents()
        }}
        parentSchool={
          data?.school
            ? {
              id: data.school.id,
              name: data.school.name,
              school_code: data.school.school_code || data.school.code,
              city: data.school.city,
            }
            : null
        }
        isAdminMode={false}
      />
    </div>
  )
}
