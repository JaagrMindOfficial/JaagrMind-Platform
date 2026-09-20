"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  Search,
  Plus,
  UploadCloud,
  Edit,
  Trash2,
  Activity,
  History,
  ArrowUpRight,
  Download,
  FileSpreadsheet,
  Users,
  GraduationCap,
  CheckSquare,
  Square,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Check,
  X,
  RefreshCw,
  Clock,
  Calendar,
  FolderOpen,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { InfoTooltip } from "@/components/ui/info-tooltip"
import { MinimalUUID } from "@/components/ui/minimal-uuid"
import { api } from "@/lib/api"
import { useAuth } from "@/context/auth-context"
import { StudentHistoryDialog } from "@/components/student-history-dialog"
import { StudentDossierDialog, StudentProfileData } from "@/components/student-dossier-dialog"

interface Student {
  id: string
  access_id: string
  roll_number?: string
  stream?: string
  name: string
  grade: string
  section: string
  mobile_number?: string
  email?: string
  is_active?: boolean
}

interface ScheduledPromotion {
  id: string
  school_id: string
  from_grade: string
  to_grade: string
  scheduled_date: string
  status: string
  student_count: number
  created_at: string
}

export interface ValidatedUploadRow {
  rowNumber: number
  access_id: string
  roll_number?: string
  stream?: string
  name: string
  grade: string
  section: string
  mobile_number: string
  email: string
  isValid: boolean
  errors: string[]
}

export default function SchoolStudentsPage() {
  const { user, isSchoolAdmin, isSuperAdmin, hasRole } = useAuth()
  const canManage = isSchoolAdmin || isSuperAdmin || hasRole("superadmin") || hasRole("school_admin")
  const isTeacherOnly = hasRole("teacher") && !canManage
  const assignedGrade = user?.metadata?.assigned_grade
  const assignedSection = user?.metadata?.assigned_section

  const [search, setSearch] = useState("")
  const [selectedGrade, setSelectedGrade] = useState("all")
  const [selectedSection, setSelectedSection] = useState("all")
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)

  // Selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editingStudent, setEditingStudent] = useState<Student | null>(null)
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [isPromoteOpen, setIsPromoteOpen] = useState(false)
  const [deleteConfirmStudent, setDeleteConfirmStudent] = useState<Student | null>(null)
  const [isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen] = useState(false)

  // Student history modal state
  const [historyStudent, setHistoryStudent] = useState<Student | null>(null)

  // Student behavioral dossier modal state
  const [dossierStudent, setDossierStudent] = useState<StudentProfileData | null>(null)
  const [isDossierOpen, setIsDossierOpen] = useState(false)
  const [profilesMap, setProfilesMap] = useState<Record<string, StudentProfileData>>({})

  // Form states
  const [formData, setFormData] = useState({
    access_id: "",
    roll_number: "",
    stream: "",
    name: "",
    grade: "",
    section: "",
    mobile_number: "",
    email: "",
  })
  const [editFormData, setEditFormData] = useState({
    access_id: "",
    roll_number: "",
    stream: "",
    name: "",
    grade: "",
    section: "",
    mobile_number: "",
    email: "",
  })
  const [uploadError, setUploadError] = useState("")
  const [uploadStats, setUploadStats] = useState<{ parsed: number; ready: boolean } | null>(null)
  const [parsedUploadStudents, setParsedUploadStudents] = useState<any[]>([])
  const [validatedRows, setValidatedRows] = useState<ValidatedUploadRow[]>([])
  const [importOnlyValid, setImportOnlyValid] = useState(true)
  const [promoteMode, setPromoteMode] = useState<"selection" | "filter" | "annual_rollover">("selection")
  const [targetAcademicYear, setTargetAcademicYear] = useState("2026-2027")
  const [actionLoading, setActionLoading] = useState(false)

  // Scheduled promotions state
  const [scheduledPromotions, setScheduledPromotions] = useState<ScheduledPromotion[]>([])
  const [promoteTab, setPromoteTab] = useState<"immediate" | "schedule">("immediate")
  const [scheduleDate, setScheduleDate] = useState("")
  const [scheduleFromGrade, setScheduleFromGrade] = useState("")
  const [scheduleToGrade, setScheduleToGrade] = useState("")
  const [isScheduleAnnualRollover, setIsScheduleAnnualRollover] = useState(false)
  const [scheduleAcademicYear, setScheduleAcademicYear] = useState("2026-2027")

  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchStudents = async () => {
    setLoading(true)
    try {
      const data = await api.get("/api/school/students")
      setStudents(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error("Failed to fetch students:", err)
    } finally {
      setLoading(false)
    }
  }

  const fetchScheduledPromotions = async () => {
    if (isTeacherOnly) return
    try {
      const res = await api.get("/api/school/students/scheduled-promotions")
      setScheduledPromotions(Array.isArray(res) ? res : [])
    } catch (err) {
      console.error("Failed to fetch scheduled promotions:", err)
    }
  }

  const fetchAnalyticsProfiles = async () => {
    try {
      const res = await api.get<any>("/api/school/analytics")
      if (res?.students && Array.isArray(res.students)) {
        const map: Record<string, StudentProfileData> = {}
        res.students.forEach((st: StudentProfileData) => {
          if (st.id) map[st.id] = st
          if (st.access_id) map[st.access_id] = st
        })
        setProfilesMap(map)
      }
    } catch (err) {
      console.error("Failed to fetch student analytics profiles:", err)
    }
  }

  const handleOpenDossier = (student: Student) => {
    const existing = profilesMap[student.id] || profilesMap[student.access_id]
    if (existing) {
      setDossierStudent(existing)
    } else {
      setDossierStudent({
        id: student.id,
        access_id: student.access_id,
        name: student.name,
        grade: student.grade,
        section: student.section,
        school_id: "",
        archetype: "sprinter",
        focus_score: 75,
        resilience_score: 70,
        academic_tenacity: 72,
        stress_adaptability: 68,
        primary_friction: "Initial baseline profile pending first longitudinal check-in",
        momentum_trend: "stable",
        last_check_in_date: new Date().toISOString(),
        check_in_count: 0,
      })
    }
    setIsDossierOpen(true)
  }

  useEffect(() => {
    fetchStudents()
    if (!isTeacherOnly) {
      fetchScheduledPromotions()
    }
    fetchAnalyticsProfiles()
  }, [isTeacherOnly])

  const handleExecuteSchedule = async (id: string) => {
    if (!confirm("Execute this scheduled promotion now?")) return
    setActionLoading(true)
    try {
      const res = await api.post(`/api/school/students/scheduled-promotions/${id}/execute`, {})
      alert(res.message || "Promotion executed successfully!")
      await fetchScheduledPromotions()
      await fetchStudents()
    } catch (err) {
      alert("Failed to execute promotion")
    } finally {
      setActionLoading(false)
    }
  }

  const handleCancelSchedule = async (id: string) => {
    if (!confirm("Cancel this scheduled promotion?")) return
    setActionLoading(true)
    try {
      await api.delete(`/api/school/students/scheduled-promotions/${id}`)
      await fetchScheduledPromotions()
    } catch (err) {
      alert("Failed to cancel scheduled promotion")
    } finally {
      setActionLoading(false)
    }
  }

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!scheduleDate) {
      alert("Please select a scheduled execution date")
      return
    }
    if (!isScheduleAnnualRollover && (!scheduleFromGrade || !scheduleToGrade)) {
      alert("Please fill all schedule fields")
      return
    }
    setActionLoading(true)
    try {
      const payload: any = {
        scheduled_date: new Date(scheduleDate).toISOString(),
        is_annual_rollover: isScheduleAnnualRollover,
        academic_year: scheduleAcademicYear,
      }
      if (isScheduleAnnualRollover) {
        payload.from_grade = "All Classes"
        payload.to_grade = "+1 Grade (Annual Roll-over)"
      } else {
        payload.from_grade = scheduleFromGrade
        payload.to_grade = scheduleToGrade
      }
      await api.post("/api/school/students/schedule-promotion", payload)
      alert(isScheduleAnnualRollover ? "Whole-school annual roll-over scheduled successfully!" : "Class promotion scheduled successfully!")
      setIsPromoteOpen(false)
      setScheduleDate("")
      await fetchScheduledPromotions()
    } catch (err) {
      alert("Failed to schedule promotion")
    } finally {
      setActionLoading(false)
    }
  }

  // Unique Grades and Sections for filter selectors
  const uniqueGrades = useMemo(() => {
    const set = new Set<string>()
    students.forEach((s) => {
      if (s.grade) set.add(s.grade)
    })
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
  }, [students])

  const uniqueSections = useMemo(() => {
    const set = new Set<string>()
    students.forEach((s) => {
      if (s.section) set.add(s.section)
    })
    return Array.from(set).sort()
  }, [students])

  // Filtered Students
  const filtered = useMemo(() => {
    return students.filter((s) => {
      const matchSearch =
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.access_id.toLowerCase().includes(search.toLowerCase()) ||
        s.grade.toLowerCase().includes(search.toLowerCase())
      const matchGrade = selectedGrade === "all" || s.grade === selectedGrade
      const matchSection = selectedSection === "all" || s.section === selectedSection
      return matchSearch && matchGrade && matchSection
    })
  }, [students, search, selectedGrade, selectedSection])

  // Multi-selection handlers
  const handleSelectAll = () => {
    if (selectedIds.length === filtered.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(filtered.map((s) => s.id))
    }
  }

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  // Create Student
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setActionLoading(true)
    try {
      await api.post("/api/school/students", formData)
      setIsAddOpen(false)
      setFormData({ access_id: "", roll_number: "", stream: "", name: "", grade: "", section: "", mobile_number: "", email: "" })
      await fetchStudents()
    } catch (err: any) {
      console.error(err)
      alert(err?.message || err?.error || "Failed to add student. Please ensure roll number is unique in this class section.")
    } finally {
      setActionLoading(false)
    }
  }

  // Edit Student
  const handleOpenEdit = (student: Student) => {
    setEditingStudent(student)
    setEditFormData({
      access_id: student.access_id,
      roll_number: student.roll_number || "",
      stream: student.stream || "",
      name: student.name,
      grade: student.grade,
      section: student.section,
      mobile_number: student.mobile_number || "",
      email: student.email || "",
    })
    setIsEditOpen(true)
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingStudent) return
    setActionLoading(true)
    try {
      await api.put(`/api/school/students/${editingStudent.id}`, editFormData)
      setIsEditOpen(false)
      setEditingStudent(null)
      await fetchStudents()
    } catch (err) {
      console.error(err)
      alert("Failed to update student")
    } finally {
      setActionLoading(false)
    }
  }

  // Single Delete
  const handleDeleteConfirm = async () => {
    if (!deleteConfirmStudent) return
    setActionLoading(true)
    try {
      await api.delete(`/api/school/students/${deleteConfirmStudent.id}`)
      setDeleteConfirmStudent(null)
      setSelectedIds((prev) => prev.filter((id) => id !== deleteConfirmStudent.id))
      await fetchStudents()
    } catch (err) {
      console.error("Failed to delete student:", err)
      alert("Failed to delete student")
    } finally {
      setActionLoading(false)
    }
  }

  // Bulk Delete
  const handleBulkDeleteConfirm = async () => {
    if (selectedIds.length === 0) return
    setActionLoading(true)
    try {
      await api.post("/api/school/students/bulk-delete", { studentIds: selectedIds })
      setIsBulkDeleteConfirmOpen(false)
      setSelectedIds([])
      await fetchStudents()
    } catch (err) {
      console.error("Failed to bulk delete students:", err)
      alert("Failed to delete selected students")
    } finally {
      setActionLoading(false)
    }
  }

  // Class Promotion
  const handlePromoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setActionLoading(true)
    try {
      const payload: any = {}
      if (promoteMode === "annual_rollover") {
        payload.is_annual_rollover = true
        payload.academic_year = targetAcademicYear
      } else if (promoteMode === "selection" && selectedIds.length > 0) {
        payload.studentIds = selectedIds
      } else {
        if (selectedGrade !== "all") payload.filterGrade = selectedGrade
        if (selectedSection !== "all") payload.filterSection = selectedSection
      }

      const res = await api.put("/api/school/students/promote-class", payload)
      alert(res.message || "Class promotion completed successfully")
      setIsPromoteOpen(false)
      setSelectedIds([])
      await fetchStudents()
    } catch (err: any) {
      console.error("Failed to promote students:", err)
      alert(err?.message || "Failed to promote classes")
    } finally {
      setActionLoading(false)
    }
  }

  // File parsing & Pre-Validation for Bulk Upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    setUploadError("")
    setUploadStats(null)
    setValidatedRows([])
    setParsedUploadStudents([])
    if (!file) return

    if (!file.name.endsWith(".csv")) {
      setUploadError("Please select a valid .csv spreadsheet file.")
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string
        const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
        if (lines.length < 2) {
          setUploadError("The CSV file must contain a header row and at least one student record.")
          return
        }

        // Parse header row
        const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/^["']|["']$/g, ""))
        const accessIdIdx = headers.findIndex((h) => h.includes("access") || (h.includes("id") && !h.includes("school")))
        const rollIdx = headers.findIndex((h) => h.includes("roll"))
        const nameIdx = headers.findIndex((h) => h.includes("name") || h.includes("student"))
        const gradeIdx = headers.findIndex((h) => h.includes("grade") || h.includes("class"))
        const sectionIdx = headers.findIndex((h) => h.includes("section") || h.includes("sec"))
        const streamIdx = headers.findIndex((h) => h.includes("stream") || h.includes("branch"))
        const phoneIdx = headers.findIndex((h) => h.includes("phone") || h.includes("mobile") || h.includes("contact"))
        const emailIdx = headers.findIndex((h) => h.includes("email") || h.includes("mail"))

        const parsedRows: ValidatedUploadRow[] = []
        const seenInClass = new Set<string>()

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i]
          if (!line) continue
          const parts = line.split(",").map((p) => p.trim().replace(/^["']|["']$/g, ""))
          
          const rawRoll = (rollIdx !== -1 ? parts[rollIdx] : (accessIdIdx !== -1 ? parts[accessIdIdx] : parts[0])) || ""
          const rawAccessId = (accessIdIdx !== -1 ? parts[accessIdIdx] : (rollIdx !== -1 ? parts[rollIdx] : parts[0])) || ""
          const rawName = (nameIdx !== -1 ? parts[nameIdx] : parts[1]) || ""
          const rawGrade = (gradeIdx !== -1 ? parts[gradeIdx] : parts[2]) || "10"
          const rawSection = (sectionIdx !== -1 ? parts[sectionIdx] : parts[3]) || "A"
          const rawStream = (streamIdx !== -1 ? parts[streamIdx] : "") || ""
          const rawPhone = (phoneIdx !== -1 ? parts[phoneIdx] : parts[4]) || ""
          const rawEmail = (emailIdx !== -1 ? parts[emailIdx] : parts[5]) || ""

          const errors: string[] = []
          const identifier = rawRoll.trim() || rawAccessId.trim()
          if (!identifier) {
            errors.push("Missing Roll Number")
          } else {
            // Uniqueness is scoped per Class & Section & Stream (so Roll 1 in 9A and 9B are both allowed!)
            const classKey = `${rawGrade.trim().toLowerCase()}-${rawSection.trim().toUpperCase()}-${rawStream.trim().toLowerCase()}-${identifier.toUpperCase()}`
            if (seenInClass.has(classKey)) {
              errors.push(`Duplicate Roll No in Class ${rawGrade} ${rawSection}`)
            } else {
              seenInClass.add(classKey)
            }
          }

          if (!rawName.trim()) {
            errors.push("Missing Student Name")
          }

          if (rawPhone && !/^[0-9+\s-]{7,15}$/.test(rawPhone)) {
            errors.push("Invalid phone format")
          }

          if (rawEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)) {
            errors.push("Invalid email format")
          }

          parsedRows.push({
            rowNumber: i + 1,
            access_id: rawAccessId.trim(),
            roll_number: rawRoll.trim(),
            stream: rawStream.trim(),
            name: rawName.trim(),
            grade: rawGrade.trim() || "10",
            section: (rawSection.trim() || "A").toUpperCase(),
            mobile_number: rawPhone.trim(),
            email: rawEmail.trim(),
            isValid: errors.length === 0,
            errors,
          })
        }

        if (parsedRows.length === 0) {
          setUploadError("No student records found in this file.")
          return
        }

        const validCount = parsedRows.filter((r) => r.isValid).length
        setValidatedRows(parsedRows)
        setParsedUploadStudents(
          parsedRows
            .filter((r) => r.isValid)
            .map((r) => ({
              access_id: r.access_id,
              roll_number: r.roll_number || r.access_id,
              stream: r.stream,
              name: r.name,
              grade: r.grade,
              section: r.section,
              mobile_number: r.mobile_number,
              email: r.email,
            }))
        )
        setUploadStats({
          parsed: parsedRows.length,
          ready: validCount > 0,
        })
      } catch (err) {
        console.error("Error parsing CSV:", err)
        setUploadError("Error reading CSV file contents. Please check format.")
      }
    }
    reader.readAsText(file)
  }

  const handleBulkUploadSubmit = async () => {
    const toCommit = importOnlyValid 
      ? validatedRows.filter((r) => r.isValid) 
      : validatedRows
    
    if (toCommit.length === 0) {
      alert("No valid rows selected to import.")
      return
    }

    setActionLoading(true)
    try {
      await api.post("/api/school/students/bulk", { 
        students: toCommit.map((r) => ({
          access_id: r.access_id,
          roll_number: r.roll_number || r.access_id,
          stream: r.stream,
          name: r.name,
          grade: r.grade,
          section: r.section,
          mobile_number: r.mobile_number,
          email: r.email,
        }))
      })
      alert(`Successfully imported ${toCommit.length} student record(s)!`)
      setIsUploadOpen(false)
      setValidatedRows([])
      setParsedUploadStudents([])
      setUploadStats(null)
      if (fileInputRef.current) fileInputRef.current.value = ""
      await fetchStudents()
    } catch (err: any) {
      console.error("Bulk upload failed:", err)
      setUploadError(err?.message || "Failed to import students.")
    } finally {
      setActionLoading(false)
    }
  }

  // Template Downloader
  const downloadSampleTemplate = () => {
    const header = "roll_number,name,grade,section,stream,mobile_number,email\n"
    const sampleRows =
      "1,Aarav Sharma,10,A,,9876543210,aarav.sharma@example.com\n" +
      "2,Diya Patel,10,A,,9876543211,diya.patel@example.com\n" +
      "1,Rohan Verma,9,B,,9876543212,rohan.verma@example.com\n" +
      "2,Ananya Reddy,9,B,,9876543213,ananya.reddy@example.com\n" +
      "1,Kabir Mehta,11,A,Science,9876543214,kabir.mehta@example.com\n" +
      "1,Zara Khan,12,B,Commerce,9876543215,zara.khan@example.com\n"
    const blob = new Blob([header + sampleRows], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.setAttribute("download", "JaagrMind_Students_Template.csv")
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Export current list to CSV
  const exportStudentsToCSV = () => {
    const dataToExport = selectedIds.length > 0
      ? students.filter((s) => selectedIds.includes(s.id))
      : filtered

    if (dataToExport.length === 0) {
      alert("No students to export.")
      return
    }

    const headers = "Access ID,Name,Grade,Section,Mobile,Email\n"
    const rows = dataToExport
      .map(
        (s) =>
          `"${s.access_id}","${s.name}","${s.grade}","${s.section}","${s.mobile_number || ""}","${s.email || ""}"`
      )
      .join("\n")

    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.setAttribute(
      "download",
      `students_roster_${new Date().toISOString().split("T")[0]}.csv`
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6">
      {/* Header & Main Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {isTeacherOnly ? "Classroom Roster" : "Student Management"}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isTeacherOnly
              ? `Viewing enrolled students for assigned Grade ${assignedGrade || "9"}-${assignedSection || "A"}.`
              : "Manage your student roster, assign access IDs, track longitudinal check-ins, and manage class promotions."}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={exportStudentsToCSV}
            className="text-xs h-9 gap-1.5"
            title="Download CSV export"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </Button>

          {!isTeacherOnly && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setPromoteMode(selectedIds.length > 0 ? "selection" : "filter")
                  setIsPromoteOpen(true)
                }}
                className="text-xs h-9 gap-1.5"
                title="Promote class for new academic session"
              >
                <ArrowUpRight className="h-3.5 w-3.5 text-primary" />
                Promote Class
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setUploadError("")
                  setUploadStats(null)
                  setParsedUploadStudents([])
                  setIsUploadOpen(true)
                }}
                className="text-xs h-9 gap-1.5"
              >
                <UploadCloud className="h-3.5 w-3.5" />
                Bulk Upload
              </Button>
            </>
          )}

          <Button
            size="sm"
            onClick={() => {
              if (isTeacherOnly) {
                setFormData((prev) => ({
                  ...prev,
                  grade: assignedGrade || "9",
                  section: assignedSection || "A",
                }))
              }
              setIsAddOpen(true)
            }}
            className="text-xs h-9 gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Student
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5 flex !flex-row items-center justify-between border-border bg-card shadow-sm">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground flex items-center">
              Total Enrolled
              <InfoTooltip content="Active students registered in this institution with unique Access IDs." />
            </p>
            <p className="text-2xl font-bold tracking-tight mt-1">{students.length}</p>
          </div>
          <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <Users className="h-5 w-5" />
          </div>
        </Card>

        <Card className="p-5 flex !flex-row items-center justify-between border-border bg-card shadow-sm">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground flex items-center">
              Active Grades
              <InfoTooltip content="Total distinct grade cohorts currently configured in your school curriculum." />
            </p>
            <p className="text-2xl font-bold tracking-tight mt-1">{uniqueGrades.length}</p>
          </div>
          <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <GraduationCap className="h-5 w-5" />
          </div>
        </Card>

        <Card className="p-5 flex !flex-row items-center justify-between border-border bg-card shadow-sm">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground flex items-center">
              Filter Results
              <InfoTooltip content="Number of student records matching your current search query and filters." />
            </p>
            <p className="text-2xl font-bold tracking-tight mt-1">
              {filtered.length}{" "}
              <span className="text-xs font-normal text-muted-foreground">
                ({selectedIds.length} selected)
              </span>
            </p>
          </div>
          <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <CheckSquare className="h-5 w-5" />
          </div>
        </Card>
      </div>

      {/* Bulk Action Bar (when rows are selected) */}
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between p-3 rounded-lg border border-primary/30 bg-primary/5 text-xs animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground">
              {selectedIds.length} {selectedIds.length === 1 ? "student" : "students"} selected
            </span>
            <span className="text-muted-foreground">across roster</span>
          </div>

          <div className="flex items-center gap-2">
            {!isTeacherOnly && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setPromoteMode("selection")
                    setIsPromoteOpen(true)
                  }}
                  className="h-8 text-xs gap-1"
                >
                  <ArrowUpRight className="h-3 w-3 text-primary" />
                  Promote Selected
                </Button>

                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setIsBulkDeleteConfirmOpen(true)}
                  className="h-8 text-xs gap-1"
                >
                  <Trash2 className="h-3 w-3" />
                  Delete Selected
                </Button>
              </>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedIds([])}
              className="h-8 text-xs text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5 mr-1" />
              Clear Selection
            </Button>
          </div>
        </div>
      )}

      {/* Scheduled Promotions Notification Banner */}
      {!isTeacherOnly && scheduledPromotions.filter(p => p.status === 'pending').length > 0 && (
        <Card className="bg-primary/5 border-primary/25 p-3.5 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Clock className="h-4 w-4 text-primary shrink-0" />
              <div>
                <p className="text-xs font-semibold text-foreground">Scheduled Class Promotions Pending</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {scheduledPromotions.filter(p => p.status === 'pending').map((p) => (
                    <span key={p.id} className="text-xs text-muted-foreground bg-background/80 border border-border/60 px-2 py-0.5 rounded">
                      Class <strong>{p.from_grade}</strong> &rarr; <strong>{p.to_grade}</strong> on {new Date(p.scheduled_date).toLocaleDateString()} ({p.student_count} students)
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {scheduledPromotions.filter(p => p.status === 'pending').map((p) => (
                <div key={p.id} className="flex gap-1.5">
                  <Button size="sm" variant="default" className="h-7 text-xs" onClick={() => handleExecuteSchedule(p.id)} disabled={actionLoading}>
                    Run Now
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs text-muted-foreground" onClick={() => handleCancelSchedule(p.id)} disabled={actionLoading}>
                    Cancel
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Main Table Card */}
      <Card className="border-border shadow-none">
        <CardHeader className="pb-3 border-b border-border/40">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Search */}
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search by name, access ID, or grade..."
                className="pl-9 h-9 text-xs"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Filter Dropdowns */}
            <div className="flex items-center gap-2">
              {isTeacherOnly ? (
                <Badge variant="outline" className="h-9 px-3 text-xs font-mono border-primary/20 bg-primary/5 text-primary">
                  Class {assignedGrade || "9"}-{assignedSection || "A"} Roster
                </Badge>
              ) : (
                <>
                  <select
                    value={selectedGrade}
                    onChange={(e) => setSelectedGrade(e.target.value)}
                    className="h-9 px-2.5 rounded-md border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="all">All Grades</option>
                    {uniqueGrades.map((g) => (
                      <option key={g} value={g}>
                        Class {g}
                      </option>
                    ))}
                  </select>

                  <select
                    value={selectedSection}
                    onChange={(e) => setSelectedSection(e.target.value)}
                    className="h-9 px-2.5 rounded-md border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="all">All Sections</option>
                    {uniqueSections.map((sec) => (
                      <option key={sec} value={sec}>
                        Section {sec}
                      </option>
                    ))}
                  </select>
                </>
              )}

              {(search || selectedGrade !== "all" || selectedSection !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearch("")
                    setSelectedGrade("all")
                    setSelectedSection("all")
                  }}
                  className="h-9 text-xs text-muted-foreground hover:text-foreground px-2"
                  title="Reset filters"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center text-muted-foreground text-xs">
              <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent mb-2" />
              <p>Loading student directory...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground text-xs space-y-2">
              <Users className="h-8 w-8 text-muted-foreground/30 mx-auto" />
              <p className="font-medium text-foreground">No students match your criteria.</p>
              <p>Try clearing your search filters or click "Add Student" to create a record.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent bg-muted/20">
                    <TableHead className="w-[40px]">
                      <button
                        type="button"
                        onClick={handleSelectAll}
                        className="flex items-center text-muted-foreground hover:text-foreground"
                        title={selectedIds.length === filtered.length ? "Deselect all" : "Select all"}
                      >
                        {selectedIds.length > 0 && selectedIds.length === filtered.length ? (
                          <CheckSquare className="h-4 w-4 text-primary" />
                        ) : (
                          <Square className="h-4 w-4" />
                        )}
                      </button>
                    </TableHead>
                    <TableHead className="text-xs w-[140px]">
                      Roll No. / UUID
                      <InfoTooltip content="School-assigned identifier (Access ID) used by students for login. System UUID is underneath for secure indexing." />
                    </TableHead>
                    <TableHead className="text-xs">Student Name</TableHead>
                    <TableHead className="text-xs min-w-[150px]">
                      Class & Section
                      <InfoTooltip content="Current academic grade and section cohort. Promoted via Promote Class roll-overs." />
                    </TableHead>
                    <TableHead className="text-xs">Contact Info</TableHead>
                    <TableHead className="text-xs text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((student) => {
                    const isSelected = selectedIds.includes(student.id)
                    return (
                      <TableRow
                        key={student.id}
                        className={`text-xs transition-colors ${
                          isSelected ? "bg-primary/5 hover:bg-primary/10" : ""
                        }`}
                      >
                        <TableCell>
                          <button
                            type="button"
                            onClick={() => handleToggleSelect(student.id)}
                            className="flex items-center text-muted-foreground hover:text-foreground"
                          >
                            {isSelected ? (
                              <CheckSquare className="h-4 w-4 text-primary" />
                            ) : (
                              <Square className="h-4 w-4" />
                            )}
                          </button>
                        </TableCell>
                        <TableCell className="font-mono font-medium text-foreground">
                          <div className="flex flex-col space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-foreground">
                                Roll {student.roll_number || student.access_id}
                              </span>
                              {student.roll_number && student.access_id !== student.roll_number && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono text-muted-foreground">
                                  {student.access_id}
                                </Badge>
                              )}
                            </div>
                            <MinimalUUID uuid={student.id} length={4} />
                          </div>
                        </TableCell>
                        <TableCell className="font-medium text-foreground">
                          {student.name}
                        </TableCell>
                        <TableCell className="min-w-[150px]">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-medium inline-block">Class {student.grade}</span>
                            {student.section ? (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-normal">
                                Sec {student.section}
                              </Badge>
                            ) : null}
                            {student.stream ? (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal border-primary/30 text-primary bg-primary/5">
                                {student.stream}
                              </Badge>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {student.email || student.mobile_number || "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs text-primary hover:text-primary hover:bg-primary/10 font-medium"
                              onClick={() => handleOpenDossier(student)}
                              title="Inspect Longitudinal Behavioral Dossier & Cognitive Diagnostics"
                            >
                              <FolderOpen className="h-3.5 w-3.5 mr-1" />
                              Dossier
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                              onClick={() => setHistoryStudent(student)}
                              title="View performance & attempt trajectory"
                            >
                              <History className="h-3.5 w-3.5 mr-1 text-primary" />
                              History
                            </Button>

                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-foreground"
                              onClick={() => handleOpenEdit(student)}
                              title="Edit Student"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>

                            {!isTeacherOnly && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                onClick={() => setDeleteConfirmStudent(student)}
                                title="Delete Student"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Student History Dialog */}
      <StudentHistoryDialog
        isOpen={!!historyStudent}
        onClose={() => setHistoryStudent(null)}
        student={historyStudent}
        assessmentId="all"
      />

      {/* Student Longitudinal Behavioral Dossier Dialog */}
      <StudentDossierDialog
        isOpen={isDossierOpen}
        onClose={() => {
          setIsDossierOpen(false)
          setDossierStudent(null)
        }}
        student={dossierStudent}
      />

      {/* Add Student Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">Add New Student</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Register an individual student with a unique access ID.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddSubmit} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium">Roll Number</label>
                  <span className="text-[10px] text-muted-foreground">Class-scoped</span>
                </div>
                <Input
                  value={formData.roll_number || formData.access_id}
                  onChange={(e) => setFormData({ ...formData, roll_number: e.target.value, access_id: e.target.value })}
                  placeholder="e.g. 01, 15, or R01"
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Full Name *</label>
                <Input
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Student Name"
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Grade / Class *</label>
                <Input
                  required
                  value={formData.grade}
                  onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                  placeholder="e.g. 10 or 11"
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Section *</label>
                <Input
                  required
                  value={formData.section}
                  onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                  placeholder="e.g. A, B, C"
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Stream <span className="text-[10px] text-muted-foreground">(Optional)</span></label>
                <Input
                  value={formData.stream}
                  onChange={(e) => setFormData({ ...formData, stream: e.target.value })}
                  placeholder="e.g. Science, Commerce"
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Mobile Number</label>
                <Input
                  value={formData.mobile_number}
                  onChange={(e) => setFormData({ ...formData, mobile_number: e.target.value })}
                  placeholder="Optional"
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5 col-span-2">
                <label className="text-xs font-medium">Email</label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Optional parent/student email"
                  className="h-9 text-xs"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAddOpen(false)}
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={actionLoading}>
                {actionLoading ? "Saving..." : "Create Student"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Student Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">Edit Student Profile</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Update class roll number, section, stream, or contact details.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Roll Number *</label>
                <Input
                  required
                  value={editFormData.roll_number || editFormData.access_id}
                  onChange={(e) => setEditFormData({ ...editFormData, roll_number: e.target.value, access_id: e.target.value })}
                  className="h-9 text-xs"
                />
                {editingStudent && (
                  <p className="text-[10px] font-mono text-muted-foreground mt-0.5">
                    Access ID: <span className="select-all font-semibold text-foreground">{editingStudent.access_id}</span>
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Full Name *</label>
                <Input
                  required
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Grade / Class *</label>
                <Input
                  required
                  value={editFormData.grade}
                  onChange={(e) => setEditFormData({ ...editFormData, grade: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Section *</label>
                <Input
                  required
                  value={editFormData.section}
                  onChange={(e) => setEditFormData({ ...editFormData, section: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Stream <span className="text-[10px] text-muted-foreground">(Optional)</span></label>
                <Input
                  value={editFormData.stream}
                  onChange={(e) => setEditFormData({ ...editFormData, stream: e.target.value })}
                  placeholder="e.g. Science"
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Mobile Number</label>
                <Input
                  value={editFormData.mobile_number}
                  onChange={(e) => setEditFormData({ ...editFormData, mobile_number: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5 col-span-2">
                <label className="text-xs font-medium">Email</label>
                <Input
                  type="email"
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsEditOpen(false)}
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={actionLoading}>
                {actionLoading ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Single Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteConfirmStudent}
        onOpenChange={(open) => !open && setDeleteConfirmStudent(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-destructive flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Confirm Student Deletion
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground pt-1 leading-relaxed">
              Are you sure you want to remove <strong className="text-foreground">{deleteConfirmStudent?.name}</strong> (ID: {deleteConfirmStudent?.access_id})?
              All assessment results, tickets, and check-in records for this student will be deleted.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteConfirmStudent(null)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteConfirm}
              disabled={actionLoading}
            >
              {actionLoading ? "Deleting..." : "Delete Student"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Confirmation Dialog */}
      <Dialog open={isBulkDeleteConfirmOpen} onOpenChange={setIsBulkDeleteConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-destructive flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Delete {selectedIds.length} Selected Students
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground pt-1 leading-relaxed">
              This action cannot be undone. All selected students, their access keys, and their historical assessment scores will be permanently deleted from your school.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsBulkDeleteConfirmOpen(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleBulkDeleteConfirm}
              disabled={actionLoading}
            >
              {actionLoading ? "Deleting..." : `Delete ${selectedIds.length} Students`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Class Promotion Dialog */}
      <Dialog open={isPromoteOpen} onOpenChange={setIsPromoteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold flex items-center gap-2">
              <ArrowUpRight className="h-4 w-4 text-primary" />
              Promote Class (Academic Roll-Over)
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground pt-1 leading-relaxed">
              Advance student grade levels immediately or schedule a scheduled roll-over for a future term.
            </DialogDescription>
          </DialogHeader>

          {/* Promotion Tab Toggle */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-muted/50 rounded-lg text-xs">
            <button
              type="button"
              onClick={() => setPromoteTab("immediate")}
              className={`py-1.5 px-3 rounded-md font-medium transition-all ${
                promoteTab === "immediate" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Promote Now
            </button>
            <button
              type="button"
              onClick={() => {
                setPromoteTab("schedule")
                if (!scheduleFromGrade && uniqueGrades.length > 0) {
                  setScheduleFromGrade(uniqueGrades[0])
                  const num = parseInt(uniqueGrades[0].replace(/\D/g, ""))
                  setScheduleToGrade(isNaN(num) ? "" : `${num + 1}th`)
                }
              }}
              className={`py-1.5 px-3 rounded-md font-medium transition-all flex items-center justify-center gap-1.5 ${
                promoteTab === "schedule" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Calendar className="h-3.5 w-3.5" />
              Schedule Promotion
            </button>
          </div>

          {promoteTab === "immediate" ? (
            <form onSubmit={handlePromoteSubmit} className="space-y-4 pt-2">
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium flex items-center">
                    Target Scope
                    <InfoTooltip content="Choose individual selected students, current filter criteria, or whole-school annual academic roll-over." />
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setPromoteMode("selection")}
                      disabled={selectedIds.length === 0}
                      className={`p-2 text-xs text-left rounded-md border transition-colors ${
                        promoteMode === "selection"
                          ? "border-primary bg-primary/5 font-semibold text-foreground"
                          : "border-border text-muted-foreground hover:bg-muted/40"
                      } ${selectedIds.length === 0 ? "opacity-40 cursor-not-allowed" : ""}`}
                    >
                      <div>Selected ({selectedIds.length})</div>
                      <div className="text-[10px] text-muted-foreground font-normal">
                        Specific students
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPromoteMode("filter")}
                      className={`p-2 text-xs text-left rounded-md border transition-colors ${
                        promoteMode === "filter"
                          ? "border-primary bg-primary/5 font-semibold text-foreground"
                          : "border-border text-muted-foreground hover:bg-muted/40"
                      }`}
                    >
                      <div>By Filters</div>
                      <div className="text-[10px] text-muted-foreground font-normal">
                        {selectedGrade === "all" ? "All Grades" : `Gr ${selectedGrade}`}{" "}
                        {selectedSection === "all" ? "" : `Sec ${selectedSection}`}
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPromoteMode("annual_rollover")}
                      className={`p-2 text-xs text-left rounded-md border transition-colors ${
                        promoteMode === "annual_rollover"
                          ? "border-primary bg-primary/5 font-semibold text-foreground ring-1 ring-primary/30"
                          : "border-border text-muted-foreground hover:bg-muted/40"
                      }`}
                    >
                      <div className="flex items-center gap-1 font-semibold text-foreground">
                        <span>AY Roll-over</span>
                        <Badge variant="secondary" className="text-[9px] px-1 py-0 bg-primary/10 text-primary">+1 All</Badge>
                      </div>
                      <div className="text-[10px] text-muted-foreground font-normal">
                        Entire School
                      </div>
                    </button>
                  </div>
                </div>

                {promoteMode === "annual_rollover" && (
                  <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground">Annual Academic Year (AY) Roll-over</span>
                      <Badge variant="outline" className="text-[10px] border-primary/30 text-primary font-mono">
                        {students.length} Students
                      </Badge>
                    </div>
                    <p className="text-muted-foreground text-[11px] leading-relaxed">
                      Every active student across all grades advances by +1 (Class 9→10, 10→11, 11→12, and Class 12 moves to Alumni/Graduated).
                    </p>
                    <div className="pt-1">
                      <label className="text-[11px] font-medium text-foreground block mb-1">Target Academic Year (AY) *</label>
                      <Input
                        required
                        value={targetAcademicYear}
                        onChange={(e) => setTargetAcademicYear(e.target.value)}
                        placeholder="e.g. 2026-2027"
                        className="h-8 text-xs font-mono"
                      />
                    </div>
                  </div>
                )}

                {promoteMode === "filter" && (
                  <div className="p-3 rounded-md bg-muted/40 border border-border text-xs space-y-1">
                    <p className="font-medium text-foreground">Target Filter Details:</p>
                    <p className="text-muted-foreground">
                      Grade: <strong className="text-foreground">{selectedGrade === "all" ? "All (Entire Roster)" : selectedGrade}</strong>
                    </p>
                    <p className="text-muted-foreground">
                      Section: <strong className="text-foreground">{selectedSection === "all" ? "All Sections" : selectedSection}</strong>
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsPromoteOpen(false)}
                  disabled={actionLoading}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={actionLoading}>
                  {actionLoading ? "Promoting..." : promoteMode === "annual_rollover" ? "Confirm AY Roll-over (+1)" : "Confirm & Promote Now"}
                </Button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleScheduleSubmit} className="space-y-4 pt-2">
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Scheduled Execution Date *</label>
                  <Input
                    required
                    type="date"
                    value={scheduleDate}
                    min={new Date().toISOString().split("T")[0]}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    className="h-9 text-xs"
                  />
                  <p className="text-[11px] text-muted-foreground">The platform will queue this promotion for automated/one-click execution.</p>
                </div>

                {/* Rollover Toggle */}
                <div 
                  onClick={() => setIsScheduleAnnualRollover(!isScheduleAnnualRollover)}
                  className={`p-3 rounded-lg border transition-colors cursor-pointer flex items-center justify-between ${
                    isScheduleAnnualRollover ? "bg-primary/5 border-primary/30" : "bg-muted/30 border-border"
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                      <span>Schedule Whole-School Academic Year Roll-over</span>
                      <InfoTooltip content="Automatically increments every student in every class by +1 grade and moves Grade 12 to Alumni." />
                    </div>
                    <p className="text-[11px] text-muted-foreground">Promote all classes (+1) at once on the scheduled date.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={isScheduleAnnualRollover}
                    onChange={(e) => setIsScheduleAnnualRollover(e.target.checked)}
                    className="h-4 w-4 rounded border-input text-primary accent-primary"
                  />
                </div>

                {isScheduleAnnualRollover ? (
                  <div className="space-y-1.5 p-3 rounded-md bg-muted/40 border">
                    <label className="text-xs font-medium">Target Academic Year (AY) *</label>
                    <Input
                      required
                      value={scheduleAcademicYear}
                      onChange={(e) => setScheduleAcademicYear(e.target.value)}
                      placeholder="e.g. 2026-2027"
                      className="h-8 text-xs font-mono"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Will advance all <strong className="text-foreground">{students.length} active students</strong> across all classes by +1.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium">From Grade *</label>
                        <select
                          required
                          value={scheduleFromGrade}
                          onChange={(e) => {
                            setScheduleFromGrade(e.target.value)
                            const num = parseInt(e.target.value.replace(/\D/g, ""))
                            if (!isNaN(num)) setScheduleToGrade(`${num + 1}th`)
                          }}
                          className="w-full h-9 px-2.5 rounded-md border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                        >
                          <option value="">Select Grade</option>
                          {uniqueGrades.map((g) => (
                            <option key={g} value={g}>Class {g}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-medium">To Grade *</label>
                        <Input
                          required
                          value={scheduleToGrade}
                          onChange={(e) => setScheduleToGrade(e.target.value)}
                          placeholder="e.g. 10th"
                          className="h-9 text-xs"
                        />
                      </div>
                    </div>

                    {scheduleFromGrade && (
                      <div className="p-2.5 rounded bg-muted/40 border text-xs text-muted-foreground">
                        Estimated Students to Promote: <strong className="text-foreground">{students.filter(s => s.grade === scheduleFromGrade).length}</strong>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsPromoteOpen(false)}
                  disabled={actionLoading}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={actionLoading}>
                  {actionLoading ? "Scheduling..." : isScheduleAnnualRollover ? "Schedule AY Roll-over (+1)" : "Schedule Promotion"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Bulk Upload Dialog with Pre-Validation Preview */}
      <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold flex items-center gap-2">
              <UploadCloud className="h-4 w-4 text-primary" />
              Bulk Import Students (CSV)
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Import student rosters via standard CSV spreadsheet with instant in-browser pre-validation.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2 overflow-y-auto pr-1">
            {/* Format Instructions & Sample Download */}
            <div className="p-3 rounded-lg bg-muted/30 border border-border space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                  <FileSpreadsheet className="h-3.5 w-3.5 text-primary" />
                  Required CSV Columns
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={downloadSampleTemplate}
                  className="text-xs h-7 gap-1.5 text-primary border-primary/30 hover:bg-primary/10"
                >
                  <Download className="h-3 w-3" />
                  Download Sample Template (CSV)
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground font-mono bg-background/60 p-2 rounded border border-border/60 overflow-x-auto">
                access_id, name, grade, section, mobile_number, email
              </p>
              <div className="text-[11px] text-muted-foreground flex items-center gap-3 flex-wrap">
                <span>• <strong className="text-foreground">access_id</strong>: School Roll Number / Access ID</span>
                <span>• <strong className="text-foreground">name</strong>: Student Full Name</span>
                <span>• <strong className="text-foreground">grade & section</strong>: e.g. 10, A</span>
              </div>
            </div>

            {/* File Dropzone / Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Select Spreadsheet (.csv)</label>
              <Input
                type="file"
                accept=".csv"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="text-xs file:text-xs file:font-medium file:text-foreground"
              />
            </div>

            {uploadError && (
              <div className="p-2.5 rounded-md bg-destructive/10 border border-destructive/20 text-xs text-destructive flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            {/* Pre-validation Preview Table */}
            {validatedRows.length > 0 && (
              <div className="space-y-2.5 pt-1">
                {/* Status Summary Banner */}
                <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/20 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      {validatedRows.filter((r) => r.isValid).length} Valid Records
                    </Badge>
                    {validatedRows.filter((r) => !r.isValid).length > 0 && (
                      <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 text-xs">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        {validatedRows.filter((r) => !r.isValid).length} Rows with Issues
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <label className="flex items-center gap-1.5 cursor-pointer text-muted-foreground hover:text-foreground select-none">
                      <input
                        type="checkbox"
                        checked={importOnlyValid}
                        onChange={(e) => setImportOnlyValid(e.target.checked)}
                        className="rounded border-border text-primary accent-primary"
                      />
                      <span>Import only valid rows</span>
                    </label>
                  </div>
                </div>

                {/* Preview Table */}
                <div className="border border-border rounded-lg overflow-hidden max-h-[260px] overflow-y-auto">
                  <Table className="text-xs">
                    <TableHeader className="bg-muted/50 sticky top-0 z-10">
                      <TableRow>
                        <TableHead className="w-[50px]">Row</TableHead>
                        <TableHead className="w-[110px]">Status</TableHead>
                        <TableHead>Roll No / Access ID</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead className="w-[80px]">Class</TableHead>
                        <TableHead>Contact</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {validatedRows.map((row) => (
                        <TableRow key={row.rowNumber} className={!row.isValid ? "bg-destructive/5" : ""}>
                          <TableCell className="font-mono text-muted-foreground">{row.rowNumber}</TableCell>
                          <TableCell>
                            {row.isValid ? (
                              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] py-0 px-1.5">
                                <Check className="h-2.5 w-2.5 mr-1" /> Ready
                              </Badge>
                            ) : (
                              <Badge variant="destructive" className="text-[10px] py-0 px-1.5" title={row.errors.join(", ")}>
                                {row.errors[0] || "Invalid"}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="font-mono font-medium">{row.access_id || "—"}</TableCell>
                          <TableCell className="font-medium">{row.name || "—"}</TableCell>
                          <TableCell className="font-mono">
                            {row.grade}-{row.section}
                          </TableCell>
                          <TableCell className="text-muted-foreground font-mono text-[11px]">
                            {row.mobile_number || row.email || "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-between items-center pt-3 border-t border-border mt-auto">
            <span className="text-xs text-muted-foreground">
              {validatedRows.length > 0 && (
                <>
                  {importOnlyValid
                    ? `Ready to commit ${validatedRows.filter((r) => r.isValid).length} of ${validatedRows.length} rows`
                    : `Committing all ${validatedRows.length} rows`}
                </>
              )}
            </span>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsUploadOpen(false)
                  setValidatedRows([])
                  setUploadStats(null)
                  if (fileInputRef.current) fileInputRef.current.value = ""
                }}
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleBulkUploadSubmit}
                disabled={validatedRows.filter((r) => r.isValid).length === 0 || actionLoading}
              >
                {actionLoading
                  ? "Importing..."
                  : `Import ${
                      importOnlyValid
                        ? validatedRows.filter((r) => r.isValid).length
                        : validatedRows.length
                    } Students`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
