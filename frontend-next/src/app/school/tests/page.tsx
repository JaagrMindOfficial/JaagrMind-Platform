"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
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
  TableRow 
} from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog"
import { 
  BookOpen, 
  Users, 
  Link as LinkIcon, 
  Eye, 
  RotateCcw, 
  Check, 
  CheckCircle2, 
  Clock, 
  Filter, 
  Send,
  Activity,
  History,
  QrCode,
  Printer,
  Sparkles,
  Download,
  AlertTriangle,
  Search,
  Building2,
  Layers,
  FolderOpen,
} from "lucide-react"
import QRCode from "qrcode"
import { Checkbox } from "@/components/ui/checkbox"
import { api } from "@/lib/api"
import { useAuth } from "@/context/auth-context"
import { StudentHistoryDialog } from "@/components/student-history-dialog"
import { StudentDossierDialog, StudentProfileData } from "@/components/student-dossier-dialog"

interface SchoolTest {
  id: string
  _id?: string
  title: string
  description: string
  tier?: string
  min_grade?: number
  max_grade?: number
  target_grades?: string[]
  questions: any
  question_count?: number
  is_default: boolean
  is_active: boolean
}

interface OtherAssignedTestSummary {
  assessmentId: string
  title: string
  tier?: string
  status: "completed" | "pending" | "reassigned"
  totalScore?: number
  assignedBucket?: string
}

interface StudentStatus {
  _id: string
  studentId: string
  name: string
  accessId: string
  class: string
  section: string
  status: "completed" | "pending" | "reassigned"
  totalScore: number
  assignedBucket: string
  completedAt?: string
  timeTaken: number
  otherAssignedTests?: OtherAssignedTestSummary[]
}

interface ClassOption {
  class: string
  sections: string[]
}

export default function SchoolTestsPage() {
  const router = useRouter()
  const { user, schoolId } = useAuth()
  
  const [tests, setTests] = useState<SchoolTest[]>([])
  const [selectedTest, setSelectedTest] = useState<SchoolTest | null>(null)
  const [studentStatus, setStudentStatus] = useState<StudentStatus[]>([])
  const [classes, setClasses] = useState<ClassOption[]>([])
  const [schoolDetails, setSchoolDetails] = useState<{ code?: string; name?: string } | null>(null)
  
  const [loading, setLoading] = useState(true)
  const [statusLoading, setStatusLoading] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [shareLinkModal, setShareLinkModal] = useState<{ title: string; link: string } | null>(null)
  const [qrModal, setQrModal] = useState<{
    title: string
    testId: string
    qrDataUrl: string
    link: string
    questionCount: number
  } | null>(null)
  const [historyStudent, setHistoryStudent] = useState<{ id: string; name: string; access_id?: string; grade?: string; section?: string } | null>(null)

  // Roster Modal, Quick Peek, and Holistic Dossier States
  const [isRosterModalOpen, setIsRosterModalOpen] = useState(false)
  const [peekStudent, setPeekStudent] = useState<StudentStatus | null>(null)
  const [dossierStudent, setDossierStudent] = useState<StudentProfileData | null>(null)
  const [isDossierOpen, setIsDossierOpen] = useState(false)

  // Filters
  const [filterClass, setFilterClass] = useState("")
  const [filterSection, setFilterSection] = useState("")
  const [tableSearchTerm, setTableSearchTerm] = useState("")

  // Assign Modal & Selection States
  const [isAssignOpen, setIsAssignOpen] = useState(false)
  const [assignData, setAssignData] = useState({ targetType: "all", targetClass: "", targetSection: "" })
  const [schoolStudents, setSchoolStudents] = useState<any[]>([])
  const [studentsLoading, setStudentsLoading] = useState(false)
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set())
  const [studentSearchTerm, setStudentSearchTerm] = useState("")
  const [studentGradeFilter, setStudentGradeFilter] = useState("all")
  const [recentCompletionsWarning, setRecentCompletionsWarning] = useState<{
    count: number
    students: any[]
  } | null>(null)
  const [assignSubmitting, setAssignSubmitting] = useState(false)

  const loadSchoolStudents = async () => {
    if (schoolStudents.length > 0) return
    try {
      setStudentsLoading(true)
      const data = await api.get("/api/school/students")
      setSchoolStudents(data || [])
    } catch (err) {
      console.error("Failed to load school students", err)
    } finally {
      setStudentsLoading(false)
    }
  }

  useEffect(() => {
    fetchTestsAndClasses()
  }, [])

  const fetchTestsAndClasses = async () => {
    try {
      setLoading(true)
      const [testsData, classesData, dashData] = await Promise.all([
        api.get("/api/school/tests"),
        api.get("/api/school/classes").catch(() => ({ classes: [] })),
        api.get("/api/school/dashboard").catch(() => null),
      ])

      const loadedTests = testsData || []
      setTests(loadedTests)
      setClasses(classesData?.classes || [])

      if (dashData?.school) {
        setSchoolDetails({
          code: dashData.school.code || dashData.school.school_code,
          name: dashData.school.name,
        })
      }

      // Note: We intentionally do NOT eagerly fetch student status for the first test on mount.
      // Cards render immediately, eliminating 1 redundant heavy DB query and speeding up initial page load.
    } catch (err) {
      console.error("Failed to load school tests", err)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenRoster = (test: SchoolTest) => {
    setSelectedTest(test)
    setIsRosterModalOpen(true)
    setTableSearchTerm("")
    setFilterClass("")
    setFilterSection("")
    fetchTestStatus(test.id || test._id, "", "")
  }

  const handleOpenDossierFromStatus = (s: StudentStatus) => {
    setDossierStudent({
      id: s.studentId,
      access_id: s.accessId,
      name: s.name,
      grade: s.class,
      section: s.section || "",
      school_id: schoolId || "",
      school_name: schoolDetails?.name || "",
      archetype: s.assignedBucket || "Evaluated",
      focus_score: 70,
      resilience_score: 70,
      academic_tenacity: 70,
      stress_adaptability: 70,
      primary_friction: "None reported",
      momentum_trend: "stable",
      last_check_in_date: s.completedAt || "",
      check_in_count: s.status === "completed" ? 1 : 0,
    })
    setIsDossierOpen(true)
  }

  const fetchTestStatus = async (assessmentId?: string, cFilter = filterClass, sFilter = filterSection) => {
    const aId = assessmentId || selectedTest?.id || selectedTest?._id
    if (!aId) return

    try {
      setStatusLoading(true)
      let url = `/api/school/test-status?assessmentId=${aId}`
      if (cFilter) url += `&class=${encodeURIComponent(cFilter)}`
      if (sFilter) url += `&section=${encodeURIComponent(sFilter)}`
      
      const data = await api.get(url)
      setStudentStatus(data || [])
    } catch (err) {
      console.error("Failed to fetch test status", err)
    } finally {
      setStatusLoading(false)
    }
  }

  const handleCopyLink = async (test: SchoolTest, accessId?: string) => {
    const testId = test.id || test._id
    if (!testId) return

    let finalLink = ""
    try {
      const res = await api.get(`/api/school/assessment-link/${testId}`)
      finalLink = res?.link || ""
    } catch (err) {
      console.error("Failed to fetch assessment link", err)
    }

    if (!finalLink) {
      const schoolParam = schoolDetails?.code || schoolId || ""
      finalLink = `${window.location.origin}/student/login?test=${testId}`
      if (schoolParam) {
        finalLink += `&school=${encodeURIComponent(schoolParam)}`
      }
    }

    if (accessId) {
      finalLink += `&accessId=${accessId}`
    }

    setShareLinkModal({
      title: test.title,
      link: finalLink,
    })

    try {
      await navigator.clipboard.writeText(finalLink)
      setCopiedId(accessId || testId)
      setTimeout(() => setCopiedId(null), 2500)
    } catch (err) {
      // In headless or ungranted permissions, modal still shows the link
    }
  }

  const handleOpenQrModal = async (test: SchoolTest) => {
    const testId = test.id || test._id
    if (!testId) return

    const schoolParam = schoolDetails?.code || schoolId || ""
    let link = `${window.location.origin}/student/login?test=${testId}`
    if (schoolParam) {
      link += `&school=${encodeURIComponent(schoolParam)}`
    }

    try {
      const qrDataUrl = await QRCode.toDataURL(link, {
        width: 360,
        margin: 2,
        color: {
          dark: "#0f172a",
          light: "#ffffff",
        },
      })

      setQrModal({
        title: test.title,
        testId,
        qrDataUrl,
        link,
        questionCount: getQuestionCount(test),
      })
    } catch (err) {
      console.error("Failed to generate QR code", err)
    }
  }

  const handlePrintPoster = () => {
    if (!qrModal) return
    const printWindow = window.open("", "_blank", "width=850,height=950")
    if (!printWindow) return

    const schoolName = schoolDetails?.name || "Institution Campus"
    const schoolCode = schoolDetails?.code || ""

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Classroom Check-in Poster - ${qrModal.title}</title>
          <style>
            @page { size: A4 portrait; margin: 12mm; }
            * { box-sizing: border-box; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; text-align: center; color: #0f172a; margin: 0; padding: 24px; background: #fff; }
            .poster { border: 3px solid #0f172a; border-radius: 20px; padding: 36px 28px; max-width: 640px; margin: 0 auto; }
            .brand { font-size: 13px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: #0284c7; margin-bottom: 8px; }
            .school { font-size: 22px; font-weight: 700; color: #1e293b; margin-bottom: 6px; }
            .code-pill { font-family: monospace; font-size: 13px; background: #f1f5f9; padding: 4px 12px; border-radius: 6px; display: inline-block; margin-bottom: 20px; border: 1px solid #cbd5e1; font-weight: 600; }
            .title { font-size: 26px; font-weight: 800; margin: 0 0 8px; line-height: 1.25; }
            .desc { font-size: 14px; color: #64748b; margin-bottom: 24px; }
            .qr-box { background: #ffffff; border: 2px solid #cbd5e1; border-radius: 16px; padding: 16px; display: inline-block; margin-bottom: 20px; box-shadow: 0 4px 14px rgba(0,0,0,0.06); }
            .qr-box img { width: 260px; height: 260px; display: block; }
            .steps { text-align: left; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px 20px; margin: 20px 0; }
            .step { margin-bottom: 12px; font-size: 14px; display: flex; align-items: flex-start; gap: 12px; color: #334155; }
            .step:last-child { margin-bottom: 0; }
            .num { background: #0284c7; color: white; border-radius: 50%; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; flex-shrink: 0; margin-top: 1px; }
            .url { font-family: monospace; font-size: 11px; color: #64748b; word-break: break-all; margin-top: 14px; padding: 6px 12px; background: #f8fafc; border-radius: 6px; }
            .footer { font-size: 11px; color: #94a3b8; margin-top: 20px; border-top: 1px solid #e2e8f0; padding-top: 12px; }
          </style>
        </head>
        <body>
          <div class="poster">
            <div class="brand">JaagrMind Developmental Platform</div>
            <div class="school">${schoolName}</div>
            ${schoolCode ? '<div class="code-pill">School Code: ' + schoolCode + '</div>' : ''}
            <h1 class="title">${qrModal.title}</h1>
            <div class="desc">Student Reflection & Wellbeing Check-in (~10 mins • Confidential)</div>
            
            <div class="qr-box">
              <img src="${qrModal.qrDataUrl}" alt="Check-in QR Code" />
            </div>

            <div class="steps">
              <div class="step">
                <div class="num">1</div>
                <div><strong>Scan the QR Code</strong> using your phone camera, tablet, or browser scanner.</div>
              </div>
              <div class="step">
                <div class="num">2</div>
                <div><strong>Enter your School Roll Number / Access ID</strong> to sign in.</div>
              </div>
              <div class="step">
                <div class="num">3</div>
                <div><strong>Complete the check-in questions</strong> honestly to track your wellbeing.</div>
              </div>
            </div>

            <div class="url">Direct Student Link: ${qrModal.link}</div>
            <div class="footer">Empowering emotional awareness, resilience & academic growth • JaagrMind Platform</div>
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 400);
            }
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  const handleReset = async (studentId: string) => {
    const testId = selectedTest?.id || selectedTest?._id
    if (!testId) return

    if (typeof window !== "undefined" && !window.confirm("Are you sure you want to reset this student's check-in? They will be able to retake it.")) {
      return
    }

    try {
      await api.put(`/api/school/students/${studentId}/reset`, { assessmentId: testId })
      fetchTestStatus()
    } catch (err) {
      alert("Failed to reset student check-in")
    }
  }

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const testId = selectedTest?.id || selectedTest?._id
    if (!testId) return

    if (assignData.targetType === "students" && selectedStudentIds.size === 0) {
      alert("Please select at least one student to assign the check-in.")
      return
    }

    setAssignSubmitting(true)
    try {
      const checkRes = await api.post<any>(
        "/api/school/tests/check-recent",
        {
          assessmentId: testId,
          targetType: assignData.targetType,
          targetClass: assignData.targetClass,
          targetSection: assignData.targetSection,
          studentIds: assignData.targetType === "students" ? Array.from(selectedStudentIds) : [],
        }
      )

      if (checkRes?.hasRecent && checkRes.students && checkRes.students.length > 0) {
        setRecentCompletionsWarning({
          count: checkRes.count,
          students: checkRes.students,
        })
        setAssignSubmitting(false)
        return
      }

      await executeAssignment({ forceReassign: false, excludeRecent: false })
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || "Failed to verify recent completions")
      setAssignSubmitting(false)
    }
  }

  const executeAssignment = async (opts: { forceReassign?: boolean; excludeRecent?: boolean }) => {
    const testId = selectedTest?.id || selectedTest?._id
    if (!testId) return

    setAssignSubmitting(true)
    try {
      await api.post("/api/school/tests/assign", {
        assessmentId: testId,
        targetType: assignData.targetType,
        targetClass: assignData.targetClass,
        targetSection: assignData.targetSection,
        studentIds: assignData.targetType === "students" ? Array.from(selectedStudentIds) : [],
        forceReassign: !!opts.forceReassign,
        excludeRecent: !!opts.excludeRecent,
      })

      setIsAssignOpen(false)
      setRecentCompletionsWarning(null)
      fetchTestStatus()
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || "Failed to assign check-in")
    } finally {
      setAssignSubmitting(false)
    }
  }

  const getQuestionCount = (t: SchoolTest) => {
    if (t.question_count) return t.question_count
    if (Array.isArray(t.questions)) return t.questions.length
    return 32
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Active Check-ins</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Monitor check-ins assigned to your school, copy student direct links, and track completion progress.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="h-24 bg-muted/50 rounded-t-xl" />
              <CardContent className="h-32" />
            </Card>
          ))}
        </div>
      ) : tests.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center h-[260px] text-muted-foreground">
            <BookOpen className="h-10 w-10 mb-4 opacity-50" />
            <p>No active check-ins assigned to your school yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tests.map((test) => {
            const testId = test.id || test._id
            return (
              <Card 
                key={testId} 
                className="flex flex-col justify-between border cursor-pointer transition-all hover:border-primary/50 hover:shadow-md bg-card"
                onClick={() => handleOpenRoster(test)}
              >
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge variant="default" className="bg-primary/10 text-primary hover:bg-primary/20 text-[11px]">
                        Active
                      </Badge>
                      {test.is_default && (
                        <Badge variant="secondary" className="text-[11px]">Default</Badge>
                      )}
                      {test.tier && test.tier !== "all" ? (
                        <Badge variant="outline" className="text-[10px] font-mono bg-sky-500/10 text-sky-600 border-sky-500/20">
                          {test.tier === "middle" ? "Grades 6–8 (Middle)" : test.tier === "secondary" ? "Grades 9–10 (Secondary)" : "Grades 11–12 (Senior)"}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] font-mono text-muted-foreground">
                          Grades 6–12 (All)
                        </Badge>
                      )}
                    </div>
                    <span className="text-[11px] font-mono text-muted-foreground">
                      {getQuestionCount(test)} items
                    </span>
                  </div>
                  <CardTitle className="text-lg">{test.title}</CardTitle>
                  <CardDescription className="line-clamp-2 mt-1 text-xs">
                    {test.description || "Standard quarterly wellness check-in."}
                  </CardDescription>
                </CardHeader>

                <CardContent className="pt-0 space-y-4">
                  <div className="flex items-center gap-3 text-xs text-muted-foreground pt-2 border-t">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" /> ~10 mins
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" /> Student portal ready
                    </span>
                  </div>

                  <div className="flex flex-col gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="default"
                        size="sm"
                        className="text-xs h-8.5 gap-1.5 bg-primary font-medium"
                        onClick={() => handleOpenQrModal(test)}
                      >
                        <QrCode className="h-3.5 w-3.5" /> QR & Poster
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-8.5 gap-1.5 font-medium border-primary/30 text-primary hover:bg-primary/10"
                        onClick={() => {
                          setSelectedTest(test)
                          setAssignData({ targetType: "all", targetClass: "", targetSection: "" })
                          setSelectedStudentIds(new Set())
                          setRecentCompletionsWarning(null)
                          setIsAssignOpen(true)
                          loadSchoolStudents()
                        }}
                      >
                        <Send className="h-3.5 w-3.5" /> Assign / Reassign
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant={copiedId === testId ? "default" : "outline"}
                        size="sm"
                        className="text-xs h-8"
                        onClick={() => handleCopyLink(test)}
                      >
                        {copiedId === testId ? (
                          <>
                            <Check className="mr-1.5 h-3.5 w-3.5 text-emerald-500" /> Copied!
                          </>
                        ) : (
                          <>
                            <LinkIcon className="mr-1.5 h-3.5 w-3.5" /> Get Link
                          </>
                        )}
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-8"
                        onClick={() => router.push(`/preview/assessment/${testId}`)}
                      >
                        <Eye className="mr-1.5 h-3.5 w-3.5" /> Preview
                      </Button>
                    </div>

                    <div className="pt-2 border-t flex items-center justify-between gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="w-full text-xs h-8 gap-1.5 font-semibold text-primary border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleOpenRoster(test)
                        }}
                      >
                        <Users className="h-3.5 w-3.5" /> View Assigned Students
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Assigned Students Roster Modal */}
      <Dialog open={isRosterModalOpen} onOpenChange={setIsRosterModalOpen}>
        <DialogContent className="w-[95vw] sm:max-w-5xl xl:max-w-6xl max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden bg-card border-border shadow-2xl rounded-2xl">
          {selectedTest && (
            <>
              <DialogHeader className="p-6 pb-4 border-b bg-muted/20 pr-10">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                        <Users className="h-4 w-4" />
                      </div>
                      <div>
                        <DialogTitle className="text-base font-semibold">
                          Assigned Students: {selectedTest.title}
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                          Manage student submissions, track real-time scores, and verify simultaneously assigned check-ins.
                        </DialogDescription>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-8 gap-1.5 font-medium border-primary/30 text-primary hover:bg-primary/10"
                      onClick={() => {
                        setAssignData({ targetType: "all", targetClass: "", targetSection: "" })
                        setSelectedStudentIds(new Set())
                        setRecentCompletionsWarning(null)
                        setIsAssignOpen(true)
                        loadSchoolStudents()
                      }}
                    >
                      <Send className="h-3.5 w-3.5" /> Assign / Reassign
                    </Button>
                  </div>
                </div>

                {/* Cohort Stats & Filter Bar */}
                <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t mt-4">
                  {/* Quick summary metrics */}
                  <div className="flex items-center gap-2 flex-wrap text-xs">
                    <Badge variant="outline" className="text-xs py-0.5 px-2 font-normal">
                      Cohort: <strong className="ml-1 text-foreground">{studentStatus.length}</strong>
                    </Badge>
                    <Badge variant="secondary" className="text-xs py-0.5 px-2 font-normal bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      Completed: <strong className="ml-1 font-semibold">{studentStatus.filter(s => s.status === "completed").length}</strong>
                    </Badge>
                    <Badge variant="secondary" className="text-xs py-0.5 px-2 font-normal bg-amber-500/10 text-amber-600 dark:text-amber-400">
                      Retake Ready: <strong className="ml-1 font-semibold">{studentStatus.filter(s => s.status === "reassigned").length}</strong>
                    </Badge>
                    <Badge variant="secondary" className="text-xs py-0.5 px-2 font-normal text-muted-foreground">
                      Pending: <strong className="ml-1 font-semibold">{studentStatus.filter(s => s.status === "pending").length}</strong>
                    </Badge>
                  </div>

                  {/* Filter & Search controls */}
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        placeholder="Search student or ID..."
                        value={tableSearchTerm}
                        onChange={(e) => setTableSearchTerm(e.target.value)}
                        className="h-8 pl-8 pr-2.5 text-xs w-[160px] sm:w-[180px] bg-background"
                      />
                    </div>

                    <select
                      value={filterClass}
                      onChange={(e) => {
                        setFilterClass(e.target.value)
                        fetchTestStatus(selectedTest.id || selectedTest._id, e.target.value, filterSection)
                      }}
                      className="h-8 text-xs rounded-md border border-input bg-background px-2.5 outline-none focus:ring-1 focus:ring-ring"
                    >
                      <option value="">All Classes</option>
                      {classes.map((c) => (
                        <option key={c.class} value={c.class}>Class {c.class}</option>
                      ))}
                    </select>

                    <select
                      value={filterSection}
                      onChange={(e) => {
                        setFilterSection(e.target.value)
                        fetchTestStatus(selectedTest.id || selectedTest._id, filterClass, e.target.value)
                      }}
                      className="h-8 text-xs rounded-md border border-input bg-background px-2.5 outline-none focus:ring-1 focus:ring-ring"
                    >
                      <option value="">All Sections</option>
                      {["A", "B", "C", "D"].map((s) => (
                        <option key={s} value={s}>Section {s}</option>
                      ))}
                    </select>

                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs px-2.5"
                      onClick={() => fetchTestStatus(selectedTest.id || selectedTest._id)}
                      disabled={statusLoading}
                      title="Refresh roster statuses"
                    >
                      <RotateCcw className={`h-3.5 w-3.5 ${statusLoading ? "animate-spin" : ""}`} />
                    </Button>
                  </div>
                </div>
              </DialogHeader>

              {/* Table / Card Container */}
              <div className="flex-1 overflow-y-auto max-h-[55vh] p-0">
                {(() => {
                  const filteredStatusList = studentStatus.filter((s) => {
                    if (!tableSearchTerm.trim()) return true
                    const q = tableSearchTerm.toLowerCase()
                    return (
                      s.name.toLowerCase().includes(q) ||
                      s.accessId.toLowerCase().includes(q) ||
                      s.class.toLowerCase().includes(q)
                    )
                  })

                  if (statusLoading) {
                    return (
                      <div className="flex flex-col items-center justify-center py-12 text-xs text-muted-foreground gap-2">
                        <RotateCcw className="h-5 w-5 animate-spin text-primary" />
                        <span>Loading student statuses for {selectedTest.title}...</span>
                      </div>
                    )
                  }

                  if (filteredStatusList.length === 0) {
                    return (
                      <div className="text-center py-12 text-xs text-muted-foreground">
                        {tableSearchTerm ? "No students match your search query." : "No students found matching current filters."}
                      </div>
                    )
                  }

                  return (
                    <>
                      {/* Desktop Table View */}
                      <div className="hidden md:block overflow-x-auto">
                        <Table>
                          <TableHeader className="sticky top-0 bg-card z-10 shadow-xs">
                            <TableRow className="hover:bg-transparent">
                              <TableHead className="w-[110px] text-xs">Access ID</TableHead>
                              <TableHead className="text-xs">Student Name</TableHead>
                              <TableHead className="text-xs">Class / Section</TableHead>
                              <TableHead className="text-xs">Status</TableHead>
                              <TableHead className="text-xs">Score / Result</TableHead>
                              <TableHead className="text-xs">Simultaneous Tests</TableHead>
                              <TableHead className="text-right text-xs">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredStatusList.map((s) => {
                              const isDone = s.status === "completed"
                              const isReassigned = s.status === "reassigned"
                              const otherTestsCount = s.otherAssignedTests?.length || 0
                              return (
                                <TableRow key={s.studentId} className="hover:bg-muted/40 transition-colors">
                                  <TableCell className="font-mono text-xs font-medium">{s.accessId}</TableCell>
                                  <TableCell className="text-xs font-medium">
                                    <button
                                      type="button"
                                      className="hover:underline hover:text-primary text-left"
                                      onClick={() => handleOpenDossierFromStatus(s)}
                                      title="Open Student Holistic Dossier"
                                    >
                                      {s.name}
                                    </button>
                                  </TableCell>
                                  <TableCell className="text-xs text-muted-foreground">
                                    Class {s.class} {s.section ? `(${s.section})` : ""}
                                  </TableCell>
                                  <TableCell>
                                    {isDone ? (
                                      <Badge variant="default" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] gap-1">
                                        <CheckCircle2 className="h-3 w-3" /> Completed
                                      </Badge>
                                    ) : isReassigned ? (
                                      <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[11px] gap-1">
                                        <RotateCcw className="h-3 w-3" /> Retake Ready
                                      </Badge>
                                    ) : (
                                      <Badge variant="secondary" className="text-[11px] text-muted-foreground">
                                        Pending
                                      </Badge>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-xs">
                                    {isDone ? (
                                      <div className="flex items-center gap-1.5">
                                        <span className="font-medium text-foreground">{s.assignedBucket || "Evaluated"}</span>
                                        {s.totalScore > 0 && (
                                          <span className="text-muted-foreground font-mono">({s.totalScore} pts)</span>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="text-muted-foreground">—</span>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-xs">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-7 px-2 text-xs gap-1.5 border-primary/20 hover:bg-primary/10 hover:border-primary/40 text-foreground group"
                                      onClick={() => setPeekStudent(s)}
                                      title="Quick peek at other simultaneously assigned check-ins"
                                    >
                                      <Layers className="h-3.5 w-3.5 text-primary group-hover:scale-110 transition-transform" />
                                      <span>{otherTestsCount} Other{otherTestsCount === 1 ? "" : "s"}</span>
                                      {otherTestsCount > 0 && (
                                        <span className="flex items-center gap-0.5 ml-0.5">
                                          {s.otherAssignedTests?.some(t => t.status === "completed") && (
                                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" title="Completed check-ins exist" />
                                          )}
                                          {s.otherAssignedTests?.some(t => t.status === "pending") && (
                                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" title="Pending check-ins exist" />
                                          )}
                                        </span>
                                      )}
                                    </Button>
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-1">
                                      {(isDone || isReassigned) && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => setHistoryStudent({
                                            id: s.studentId,
                                            name: s.name,
                                            access_id: s.accessId,
                                            grade: s.class,
                                            section: s.section,
                                          })}
                                          className="text-xs h-7 text-muted-foreground hover:text-foreground"
                                          title="View student performance history"
                                        >
                                          <History className="h-3 w-3 mr-1 text-primary" /> History
                                        </Button>
                                      )}
                                      {isDone ? (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleReset(s.studentId)}
                                          className="text-xs h-7 text-muted-foreground hover:text-destructive"
                                          title="Archive and allow retake"
                                        >
                                          <RotateCcw className="h-3 w-3 mr-1" /> Reset
                                        </Button>
                                      ) : (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="text-xs h-7 text-muted-foreground hover:text-foreground"
                                          onClick={() => handleCopyLink(selectedTest, s.accessId)}
                                          title="Copy direct student access link"
                                        >
                                          <LinkIcon className="h-3 w-3 mr-1" /> Link
                                        </Button>
                                      )}
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-xs h-7 text-muted-foreground hover:text-primary"
                                        onClick={() => handleOpenDossierFromStatus(s)}
                                        title="Open Longitudinal Student Dossier"
                                      >
                                        <FolderOpen className="h-3 w-3 mr-1 text-primary" /> Dossier
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              )
                            })}
                          </TableBody>
                        </Table>
                      </div>

                      {/* Mobile Card View */}
                      <div className="md:hidden divide-y divide-border/60">
                        {filteredStatusList.map((s) => {
                          const isDone = s.status === "completed"
                          const isReassigned = s.status === "reassigned"
                          const otherTestsCount = s.otherAssignedTests?.length || 0
                          return (
                            <div key={s.studentId} className="p-3.5 space-y-2.5">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <button
                                    type="button"
                                    className="font-semibold text-sm text-foreground hover:underline hover:text-primary text-left truncate block max-w-[200px]"
                                    onClick={() => handleOpenDossierFromStatus(s)}
                                    title="Open Student Holistic Dossier"
                                  >
                                    {s.name}
                                  </button>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className="font-mono text-xs font-bold text-foreground">ID: {s.accessId}</span>
                                    <span className="text-xs text-muted-foreground">Class {s.class} {s.section ? `(${s.section})` : ""}</span>
                                  </div>
                                </div>

                                <div className="shrink-0">
                                  {isDone ? (
                                    <Badge variant="default" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] gap-1">
                                      <CheckCircle2 className="h-3 w-3" /> Completed
                                    </Badge>
                                  ) : isReassigned ? (
                                    <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px] gap-1">
                                      <RotateCcw className="h-3 w-3" /> Retake
                                    </Badge>
                                  ) : (
                                    <Badge variant="secondary" className="text-[10px] text-muted-foreground">
                                      Pending
                                    </Badge>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center justify-between gap-2 text-xs pt-0.5">
                                <div>
                                  {isDone && (
                                    <span className="font-medium text-foreground">
                                      {s.assignedBucket || "Evaluated"} {s.totalScore > 0 ? `(${s.totalScore} pts)` : ""}
                                    </span>
                                  )}
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-6 px-2 text-[10px] gap-1 border-primary/20 hover:bg-primary/10 text-foreground"
                                  onClick={() => setPeekStudent(s)}
                                >
                                  <Layers className="h-3 w-3 text-primary" />
                                  <span>{otherTestsCount} Other{otherTestsCount === 1 ? "" : "s"}</span>
                                </Button>
                              </div>

                              <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-border/40 text-xs">
                                {(isDone || isReassigned) && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setHistoryStudent({
                                      id: s.studentId,
                                      name: s.name,
                                      access_id: s.accessId,
                                      grade: s.class,
                                      section: s.section,
                                    })}
                                    className="text-xs h-7 px-2 text-muted-foreground hover:text-foreground"
                                  >
                                    <History className="h-3 w-3 mr-1 text-primary" /> History
                                  </Button>
                                )}
                                {isDone ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleReset(s.studentId)}
                                    className="text-xs h-7 px-2 text-muted-foreground hover:text-destructive"
                                  >
                                    <RotateCcw className="h-3 w-3 mr-1" /> Reset
                                  </Button>
                                ) : (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-xs h-7 px-2 text-muted-foreground hover:text-foreground"
                                    onClick={() => handleCopyLink(selectedTest, s.accessId)}
                                  >
                                    <LinkIcon className="h-3 w-3 mr-1" /> Link
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  className="text-xs h-7 px-2.5 bg-primary text-primary-foreground font-medium"
                                  onClick={() => handleOpenDossierFromStatus(s)}
                                >
                                  <FolderOpen className="h-3 w-3 mr-1" /> Dossier
                                </Button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </>
                  )
                })()}
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-between p-4 border-t bg-muted/20 text-xs text-muted-foreground">
                <span>
                  Showing <strong>{studentStatus.length}</strong> assigned student{studentStatus.length === 1 ? "" : "s"} for this check-in.
                </span>
                <Button variant="outline" size="sm" onClick={() => setIsRosterModalOpen(false)}>
                  Done
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Quick Peek Dialog for Simultaneous Assigned Tests */}
      <Dialog open={!!peekStudent} onOpenChange={(open) => !open && setPeekStudent(null)}>
        <DialogContent className="w-[95vw] sm:max-w-xl max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden bg-card border-border shadow-2xl rounded-2xl">
          {peekStudent && (
            <>
              <DialogHeader className="p-6 pb-4 border-b bg-muted/20 pr-10">
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <Layers className="h-5 w-5" />
                  </div>
                  <div>
                    <DialogTitle className="text-base font-semibold">
                      Assigned Check-ins: {peekStudent.name}
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                      Access ID: <span className="font-mono text-foreground font-medium">{peekStudent.accessId}</span> • Class {peekStudent.class} {peekStudent.section ? `(${peekStudent.section})` : ""}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="p-6 space-y-4 overflow-y-auto max-h-[60vh]">
                {/* Active check-in being inspected */}
                {selectedTest && (
                  <div className="p-3 rounded-xl border border-primary/30 bg-primary/5 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-primary uppercase tracking-wider">
                        Currently Viewed Check-in
                      </span>
                      {peekStudent.status === "completed" ? (
                        <Badge variant="default" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Completed
                        </Badge>
                      ) : peekStudent.status === "reassigned" ? (
                        <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px] gap-1">
                          <RotateCcw className="h-3 w-3" /> Retake Ready
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px] text-muted-foreground">
                          Pending
                        </Badge>
                      )}
                    </div>
                    <div className="font-medium text-sm text-foreground">{selectedTest.title}</div>
                    {peekStudent.status === "completed" && (
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        <span>Score: <strong className="text-foreground">{peekStudent.totalScore} pts</strong></span>
                        <span>•</span>
                        <span>Result: <strong className="text-foreground">{peekStudent.assignedBucket || "Evaluated"}</strong></span>
                      </div>
                    )}
                  </div>
                )}

                {/* Other Simultaneous Check-ins */}
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-foreground flex items-center justify-between">
                    <span>Other Assigned Check-ins ({peekStudent.otherAssignedTests?.length || 0})</span>
                    <span className="text-[11px] font-normal text-muted-foreground">Assigned to same cohort</span>
                  </div>

                  {(!peekStudent.otherAssignedTests || peekStudent.otherAssignedTests.length === 0) ? (
                    <div className="p-4 rounded-xl border border-dashed text-center text-xs text-muted-foreground">
                      No other assessments are currently assigned to this student&apos;s grade cohort.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {peekStudent.otherAssignedTests.map((other) => (
                        <div
                          key={other.assessmentId}
                          className="p-3 rounded-xl border border-border bg-card hover:bg-muted/30 transition-colors flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="space-y-1">
                            <div className="font-medium text-foreground">{other.title}</div>
                            <div className="flex items-center gap-2">
                              {other.tier && other.tier !== "all" ? (
                                <Badge variant="outline" className="text-[10px] font-mono bg-sky-500/10 text-sky-600 border-sky-500/20">
                                  {other.tier === "middle" ? "Grades 6–8" : other.tier === "secondary" ? "Grades 9–10" : "Grades 11–12"}
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-[10px] font-mono text-muted-foreground">
                                  Grades 6–12
                                </Badge>
                              )}
                              {other.status === "completed" && other.totalScore !== undefined && (
                                <span className="text-[11px] text-muted-foreground font-mono">
                                  Score: {other.totalScore} pts ({other.assignedBucket || "Evaluated"})
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="shrink-0">
                            {other.status === "completed" ? (
                              <Badge variant="default" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] gap-1">
                                <CheckCircle2 className="h-3 w-3" /> Completed
                              </Badge>
                            ) : other.status === "reassigned" ? (
                              <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[11px] gap-1">
                                <RotateCcw className="h-3 w-3" /> Retake Ready
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-[11px] text-muted-foreground">
                                Pending
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Peek Footer */}
              <div className="flex items-center justify-between p-4 border-t bg-muted/20">
                <Button
                  variant="default"
                  size="sm"
                  className="text-xs h-8 gap-1.5"
                  onClick={() => {
                    handleOpenDossierFromStatus(peekStudent)
                    setPeekStudent(null)
                  }}
                >
                  <FolderOpen className="h-3.5 w-3.5" /> Open Full Student Dossier
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-8"
                  onClick={() => setPeekStudent(null)}
                >
                  Close
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Share Assessment Link Dialog */}
      <Dialog open={!!shareLinkModal} onOpenChange={(open) => !open && setShareLinkModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">Assessment Access Link</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Share this direct student access URL for <strong className="text-foreground">{shareLinkModal?.title}</strong>:
            </p>
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={shareLinkModal?.link || ""}
                className="font-mono text-xs h-9 bg-muted/40 selection:bg-primary/20"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <Button
                size="sm"
                className="h-9 px-3 shrink-0"
                onClick={async () => {
                  if (shareLinkModal?.link) {
                    try {
                      await navigator.clipboard.writeText(shareLinkModal.link)
                      setCopiedId("share-modal")
                      setTimeout(() => setCopiedId(null), 2000)
                    } catch {
                      // Fallback
                    }
                  }
                }}
              >
                {copiedId === "share-modal" ? (
                  <span className="flex items-center gap-1 text-emerald-500 font-medium">
                    <Check className="h-3.5 w-3.5" /> Copied!
                  </span>
                ) : (
                  "Copy"
                )}
              </Button>
            </div>
            <div className="flex justify-between items-center pt-2 border-t text-xs">
              <span className="text-muted-foreground">Students can use this link with their Access ID</span>
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-8"
                onClick={() => {
                  if (shareLinkModal?.link) {
                    window.open(shareLinkModal.link, "_blank")
                  }
                }}
              >
                Open Student Portal &rarr;
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Classroom QR & Smartboard Poster Dialog */}
      <Dialog open={!!qrModal} onOpenChange={(open) => !open && setQrModal(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <QrCode className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold">
                  Classroom QR & Smartboard Poster
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Display on classroom smartboard or print as a physical wall poster for students.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {qrModal && (
            <div className="space-y-4 pt-2">
              <div className="p-4 rounded-xl border border-border bg-muted/20 flex flex-col items-center text-center">
                <div className="mb-2">
                  <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                    {schoolDetails?.name || "Institution Campus"}
                  </span>
                  <h3 className="text-base font-bold text-foreground mt-0.5">{qrModal.title}</h3>
                  <div className="flex items-center justify-center gap-2 mt-1">
                    <Badge variant="outline" className="font-mono text-[10px]">
                      {schoolDetails?.code ? `School Code: ${schoolDetails.code}` : "Direct Link"}
                    </Badge>
                    <Badge variant="secondary" className="text-[10px]">
                      ~10 mins check-in
                    </Badge>
                  </div>
                </div>

                <div className="p-3 bg-white rounded-xl border-2 border-border shadow-xs my-2">
                  <img
                    src={qrModal.qrDataUrl}
                    alt="Classroom QR Code"
                    className="w-48 h-48 sm:w-56 sm:h-56 object-contain"
                  />
                </div>

                <div className="text-left w-full space-y-2 bg-background/90 p-3 rounded-lg border border-border/70 text-xs">
                  <div className="font-semibold text-foreground flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    How Students Join in Class:
                  </div>
                  <ol className="list-decimal list-inside space-y-1 text-muted-foreground text-[11px] pl-1">
                    <li>Scan this QR Code with phone, tablet, or smartboard camera.</li>
                    <li>School code is automatically pre-filled; enter Roll Number / Access ID.</li>
                    <li>Complete the wellness check-in privately and submit.</li>
                  </ol>
                </div>
              </div>

              {/* Direct Link Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Direct Student URL</label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={qrModal.link}
                    className="font-mono text-xs h-9 bg-muted/40 selection:bg-primary/20"
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                  <Button
                    size="sm"
                    className="h-9 px-3 shrink-0"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(qrModal.link)
                        setCopiedId("qr-modal")
                        setTimeout(() => setCopiedId(null), 2000)
                      } catch {}
                    }}
                  >
                    {copiedId === "qr-modal" ? (
                      <span className="flex items-center gap-1 text-emerald-500 font-medium">
                        <Check className="h-3.5 w-3.5" /> Copied!
                      </span>
                    ) : (
                      "Copy"
                    )}
                  </Button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-border gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-9 gap-1.5 text-foreground"
                  onClick={handlePrintPoster}
                >
                  <Printer className="h-3.5 w-3.5" />
                  Print Classroom Poster
                </Button>

                <Button
                  size="sm"
                  className="text-xs h-9 gap-1.5"
                  onClick={() => window.open(qrModal.link, "_blank")}
                >
                  Open Student Portal &rarr;
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Assign Test Modal with Tier Constraint Validation & Granular Selection */}
      <Dialog open={isAssignOpen} onOpenChange={(open) => {
        setIsAssignOpen(open)
        if (!open) {
          setRecentCompletionsWarning(null)
        }
      }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden bg-card border-border shadow-2xl rounded-2xl">
          <DialogHeader className="p-6 pb-4 border-b bg-muted/20">
            <DialogTitle className="text-base font-semibold flex items-center gap-2">
              <Send className="h-4 w-4 text-primary" />
              <span>Assign Check-in to Cohort</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-0.5">
              Assign to entire grade tiers, specific classes, or select individual students with recent retake safeguards.
            </DialogDescription>
          </DialogHeader>

          {selectedTest && (() => {
            const allowedGrades = selectedTest.target_grades && selectedTest.target_grades.length > 0
              ? selectedTest.target_grades
              : ["6", "7", "8", "9", "10", "11", "12"]
            
            const isTierMismatch = Boolean(assignData.targetType === "class" && assignData.targetClass && !allowedGrades.includes(assignData.targetClass))

            // Filter students for individual assignment
            const eligibleStudents = schoolStudents.filter((st) => {
              const cleanGrade = (st.grade || "")
                .replace(/^Class\s+/i, "")
                .replace(/(st|nd|rd|th)$/i, "")
                .trim()
              const matchesAllowedTier = allowedGrades.some((g) => {
                const cleanG = g.replace(/^Class\s+/i, "").replace(/(st|nd|rd|th)$/i, "").trim()
                return cleanG.toLowerCase() === cleanGrade.toLowerCase()
              })
              if (!matchesAllowedTier) return false

              if (studentGradeFilter !== "all") {
                const cleanFilter = studentGradeFilter
                  .replace(/^Class\s+/i, "")
                  .replace(/(st|nd|rd|th)$/i, "")
                  .trim()
                if (cleanGrade.toLowerCase() !== cleanFilter.toLowerCase()) return false
              }

              if (studentSearchTerm.trim()) {
                const term = studentSearchTerm.toLowerCase()
                const matchesName = (st.name || "").toLowerCase().includes(term)
                const matchesAccess = (st.access_id || "").toLowerCase().includes(term)
                if (!matchesName && !matchesAccess) return false
              }

              return true
            })

            const handleToggleStudent = (sId: string) => {
              setSelectedStudentIds((prev) => {
                const next = new Set(prev)
                if (next.has(sId)) {
                  next.delete(sId)
                } else {
                  next.add(sId)
                }
                return next
              })
            }

            const handleSelectAllFiltered = () => {
              setSelectedStudentIds((prev) => {
                const next = new Set(prev)
                eligibleStudents.forEach((st) => next.add(st.id))
                return next
              })
            }

            const handleClearStudentSelection = () => {
              setSelectedStudentIds((prev) => {
                const next = new Set(prev)
                eligibleStudents.forEach((st) => next.delete(st.id))
                return next
              })
            }

            // If a warning about recent completions is active, show the Advisory & Confirmation View
            if (recentCompletionsWarning) {
              return (
                <div className="p-6 space-y-4 overflow-y-auto max-h-[75vh]">
                  <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 space-y-2">
                    <div className="flex items-start gap-2.5 text-amber-600 dark:text-amber-400">
                      <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-xs font-semibold">Recent Attempts Advisory</h4>
                        <p className="text-[11px] text-amber-700/90 dark:text-amber-300/90 mt-0.5 leading-relaxed">
                          <strong>{recentCompletionsWarning.count} student(s)</strong> in your selection have already completed this check-in in the last 30 days. Please decide whether to unlock a new attempt or exclude them.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* List of affected students */}
                  <div className="border rounded-xl overflow-hidden divide-y bg-background text-xs">
                    <div className="bg-muted/40 p-2.5 font-semibold text-[11px] grid grid-cols-12 text-muted-foreground">
                      <span className="col-span-5">Student</span>
                      <span className="col-span-3">Class & Section</span>
                      <span className="col-span-4 text-right">Last Attempt</span>
                    </div>
                    <div className="max-h-[220px] overflow-y-auto divide-y">
                      {recentCompletionsWarning.students.map((st: any, idx: number) => (
                        <div key={`${st.student_id}-${st.completed_at || idx}`} className="p-2.5 grid grid-cols-12 items-center text-xs">
                          <div className="col-span-5">
                            <span className="font-medium text-foreground">{st.student_name}</span>
                            <span className="block text-[10px] text-muted-foreground font-mono">{st.access_id}</span>
                          </div>
                          <div className="col-span-3">
                            <Badge variant="outline" className="text-[10px]">
                              {st.grade} {st.section ? `- ${st.section}` : ""}
                            </Badge>
                          </div>
                          <div className="col-span-4 text-right">
                            <span className="text-[11px] text-foreground block">
                              {new Date(st.completed_at).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              Score: {st.total_score} ({st.assigned_bucket || "Evaluated"})
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Decision Actions */}
                  <div className="space-y-2 pt-2">
                    <button
                      type="button"
                      onClick={() => executeAssignment({ forceReassign: true })}
                      disabled={assignSubmitting}
                      className="w-full p-3 rounded-xl border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-left transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                          <RotateCcw className="h-3.5 w-3.5" />
                          Confirm & Reassign All (Allow Retake)
                        </span>
                        <Badge className="bg-amber-500 text-white text-[10px]">Recommended for Retest</Badge>
                      </div>
                      <p className="text-[10px] text-amber-700/80 dark:text-amber-300/80 mt-1 leading-relaxed">
                        Past attempts will be archived safely and preserved in student dossiers/history. Students will be immediately unlocked to take the test again.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => executeAssignment({ excludeRecent: true })}
                      disabled={assignSubmitting}
                      className="w-full p-3 rounded-xl border border-border bg-card hover:bg-muted/40 text-left transition-all"
                    >
                      <span className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                        Assign Only Remaining (Exclude Completed)
                      </span>
                      <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">
                        Only students who haven't completed this check-in recently will be assigned. Students who already completed it will keep their existing result and won't retake.
                      </p>
                    </button>
                  </div>

                  <div className="flex justify-start pt-2 border-t">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-xs"
                      onClick={() => setRecentCompletionsWarning(null)}
                      disabled={assignSubmitting}
                    >
                      &larr; Back to Selection
                    </Button>
                  </div>
                </div>
              )
            }

            // Default: Scope Configuration View
            return (
              <form onSubmit={handleAssignSubmit} className="flex flex-col flex-1 overflow-hidden">
                <div className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
                  {/* Test Info Pill */}
                  <div className="p-3 bg-muted/40 rounded-xl border border-border/70 text-xs space-y-1">
                    <div className="font-semibold text-foreground">{selectedTest.title}</div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge variant="outline" className="text-[10px] font-mono bg-sky-500/10 text-sky-600 border-sky-500/20">
                        Tier: {selectedTest.tier === "middle" ? "Middle School" : selectedTest.tier === "secondary" ? "Secondary" : selectedTest.tier === "senior" ? "Senior Secondary" : "All Grades"}
                      </Badge>
                      <span className="text-[11px] text-muted-foreground">
                        Calibrated for Grades: <strong className="text-foreground">{allowedGrades.join(", ")}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Scope Selector: 3 options */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-foreground">Target Scope</label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setAssignData({ ...assignData, targetType: "all", targetClass: "" })}
                        className={`p-2.5 rounded-xl border text-left text-xs transition-all ${
                          assignData.targetType === "all"
                            ? "border-primary bg-primary/10 text-primary font-medium"
                            : "border-border hover:bg-muted/40 text-muted-foreground"
                        }`}
                      >
                        <div>All Allowed Grades</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">Grades {allowedGrades.join(", ")}</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setAssignData({ ...assignData, targetType: "class" })}
                        className={`p-2.5 rounded-xl border text-left text-xs transition-all ${
                          assignData.targetType === "class"
                            ? "border-primary bg-primary/10 text-primary font-medium"
                            : "border-border hover:bg-muted/40 text-muted-foreground"
                        }`}
                      >
                        <div>Specific Class</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">Target entire grade</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setAssignData({ ...assignData, targetType: "students", targetClass: "" })
                          loadSchoolStudents()
                        }}
                        className={`p-2.5 rounded-xl border text-left text-xs transition-all ${
                          assignData.targetType === "students"
                            ? "border-primary bg-primary/10 text-primary font-medium"
                            : "border-border hover:bg-muted/40 text-muted-foreground"
                        }`}
                      >
                        <div>Individual Students</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">Select specific roster</div>
                      </button>
                    </div>
                  </div>

                  {/* Specific Class Option */}
                  {assignData.targetType === "class" && (
                    <div className="space-y-3 pt-1">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-foreground">Select Grade</label>
                        <select
                          value={assignData.targetClass}
                          onChange={(e) => setAssignData({ ...assignData, targetClass: e.target.value })}
                          className="w-full h-9 rounded-xl border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        >
                          <option value="">-- Select Grade --</option>
                          {["6", "7", "8", "9", "10", "11", "12"].map((g) => {
                            const isAllowed = allowedGrades.includes(g)
                            return (
                              <option key={g} value={g}>
                                Class {g} {isAllowed ? "✓ (Permitted)" : "✗ (Tier Mismatch)"}
                              </option>
                            )
                          })}
                        </select>
                      </div>

                      {isTierMismatch && (
                        <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs flex items-start gap-2">
                          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                          <div>
                            <strong>Tier Constraint Violation: </strong>
                            This check-in is calibrated for Grades {allowedGrades.join(", ")}. It cannot be assigned to Class {assignData.targetClass}.
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Individual Students Selector */}
                  {assignData.targetType === "students" && (
                    <div className="space-y-3 pt-1">
                      {/* Filter & Search Bar */}
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                        <div className="relative sm:col-span-8">
                          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                          <Input
                            placeholder="Search by student name or roll number..."
                            value={studentSearchTerm}
                            onChange={(e) => setStudentSearchTerm(e.target.value)}
                            className="pl-8 h-8 text-xs rounded-xl"
                          />
                        </div>

                        <div className="sm:col-span-4">
                          <select
                            value={studentGradeFilter}
                            onChange={(e) => setStudentGradeFilter(e.target.value)}
                            className="w-full h-8 rounded-xl border border-input bg-background px-2.5 text-xs text-foreground focus:outline-none"
                          >
                            <option value="all">All Allowed Grades</option>
                            {allowedGrades.map((g) => (
                              <option key={g} value={g}>Class {g}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Selection Toolbar */}
                      <div className="flex items-center justify-between text-xs text-muted-foreground px-0.5">
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleSelectAllFiltered}
                            disabled={eligibleStudents.length === 0}
                            className="h-6 text-[11px] px-2"
                          >
                            Select Filtered ({eligibleStudents.length})
                          </Button>
                          <span>•</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleClearStudentSelection}
                            disabled={selectedStudentIds.size === 0}
                            className="h-6 text-[11px] px-2"
                          >
                            Clear
                          </Button>
                        </div>

                        <span className="font-medium text-foreground">
                          Selected: <strong className="text-primary">{selectedStudentIds.size}</strong> student{selectedStudentIds.size !== 1 ? "s" : ""}
                        </span>
                      </div>

                      {/* Roster Table */}
                      <div className="border rounded-xl overflow-hidden bg-background">
                        {studentsLoading ? (
                          <div className="p-8 text-center text-xs text-muted-foreground">
                            Loading student roster...
                          </div>
                        ) : eligibleStudents.length === 0 ? (
                          <div className="p-8 text-center text-xs text-muted-foreground">
                            No eligible students found matching your filters.
                          </div>
                        ) : (
                          <div className="max-h-[220px] overflow-y-auto divide-y">
                            {eligibleStudents.map((st) => {
                              const isChecked = selectedStudentIds.has(st.id)
                              return (
                                <div
                                  key={st.id}
                                  onClick={() => handleToggleStudent(st.id)}
                                  className={`p-2.5 flex items-center justify-between text-xs cursor-pointer select-none transition-colors ${
                                    isChecked ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-muted/30"
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5">
                                    <Checkbox
                                      checked={isChecked}
                                      onCheckedChange={() => handleToggleStudent(st.id)}
                                      onClick={(e: React.MouseEvent) => e.stopPropagation()}
                                    />
                                    <div>
                                      <div className="font-medium text-foreground">{st.name}</div>
                                      <div className="text-[10px] text-muted-foreground font-mono">{st.access_id}</div>
                                    </div>
                                  </div>

                                  <Badge variant="outline" className="text-[10px]">
                                    {st.grade} {st.section ? `- ${st.section}` : ""}
                                  </Badge>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Modal Footer */}
                <div className="flex justify-end gap-2 p-4 border-t bg-muted/20">
                  <Button type="button" variant="outline" size="sm" onClick={() => setIsAssignOpen(false)} disabled={assignSubmitting}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={
                      assignSubmitting ||
                      isTierMismatch ||
                      (assignData.targetType === "class" && !assignData.targetClass) ||
                      (assignData.targetType === "students" && selectedStudentIds.size === 0)
                    }
                  >
                    {assignSubmitting ? "Verifying..." : "Confirm Assignment"}
                  </Button>
                </div>
              </form>
            )
          })()}
        </DialogContent>
      </Dialog>

      <StudentHistoryDialog
        isOpen={!!historyStudent}
        onClose={() => setHistoryStudent(null)}
        student={historyStudent}
        assessmentId={selectedTest?.id || selectedTest?._id || "all"}
        assessmentTitle={selectedTest?.title}
      />

      <StudentDossierDialog
        isOpen={isDossierOpen}
        onClose={() => {
          setIsDossierOpen(false)
          setDossierStudent(null)
        }}
        student={dossierStudent}
      />
    </div>
  )
}
