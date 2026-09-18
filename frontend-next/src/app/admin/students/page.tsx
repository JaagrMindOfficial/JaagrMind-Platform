"use client"

import { useState, useEffect } from "react"
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
  Users,
  GraduationCap,
  School,
  Building2,
  Edit,
  Trash2,
  AlertCircle,
  ShieldCheck,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { api } from "@/lib/api"
import { InfoTooltip } from "@/components/ui/info-tooltip"
import { MinimalUUID } from "@/components/ui/minimal-uuid"

interface Student {
  id: string
  school_id: string
  school_name: string
  school_code: string
  access_id: string
  name: string
  grade: string
  section: string
  mobile_number?: string
  email?: string
  is_active?: boolean
  created_at?: string
}

export default function AdminStudentsPage() {
  const [search, setSearch] = useState("")
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)

  // Edit State
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editingStudent, setEditingStudent] = useState<Student | null>(null)
  const [editFormData, setEditFormData] = useState({
    access_id: "",
    name: "",
    grade: "",
    section: "",
    mobile_number: "",
    email: "",
  })

  // Delete State
  const [deleteConfirmStudent, setDeleteConfirmStudent] = useState<Student | null>(null)
  const [deleteSubmitting, setDeleteSubmitting] = useState(false)

  const fetchStudents = async () => {
    setLoading(true)
    try {
      const data = await api.get("/api/admin/students")
      setStudents(data || [])
    } catch (err) {
      console.error("Failed to load students", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStudents()
  }, [])

  const handleOpenEdit = (student: Student) => {
    setEditingStudent(student)
    setEditFormData({
      access_id: student.access_id,
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
    try {
      await api.put(`/api/admin/students/${editingStudent.id}`, editFormData)
      setIsEditOpen(false)
      setEditingStudent(null)
      fetchStudents()
    } catch (err) {
      console.error("Failed to update student", err)
      alert("Failed to update student")
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmStudent) return
    setDeleteSubmitting(true)
    try {
      await api.delete(`/api/admin/students/${deleteConfirmStudent.id}`)
      setDeleteConfirmStudent(null)
      fetchStudents()
    } catch (err) {
      alert("Failed to delete student")
    } finally {
      setDeleteSubmitting(false)
    }
  }

  const filtered = students.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.access_id.toLowerCase().includes(search.toLowerCase()) ||
      (s.school_name && s.school_name.toLowerCase().includes(search.toLowerCase())) ||
      (s.school_code && s.school_code.toLowerCase().includes(search.toLowerCase())) ||
      s.grade.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Platform Students (Audit View)</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Global compliance and aggregate student audit view across registered partner schools and independent learners.
          </p>
        </div>
      </div>

      {/* Scale & Privacy Advisory */}
      <div className="p-4 rounded-xl border border-sky-500/20 bg-sky-500/5 flex items-start gap-3 text-xs text-muted-foreground">
        <ShieldCheck className="h-5 w-5 text-sky-500 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-semibold text-foreground">
            Tenant-Isolated Student Architecture (Privacy & Scale)
          </div>
          <p>
            Individual student rosters, class sections, and roll numbers are strictly managed tenant-wise inside each institution&apos;s School Portal (<code className="text-sky-600 dark:text-sky-400">/school/students</code>). As a platform owner, Superadmin manages partner schools and curriculum to uphold child data privacy (DPDPA / COPPA).
          </p>
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5 border-border shadow-none flex !flex-row items-center justify-between">
          <div>
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Total Enrolled
            </div>
            <div className="text-2xl font-semibold mt-1">{students.length}</div>
          </div>
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <Users className="h-4 w-4" />
          </div>
        </Card>
        <Card className="p-5 border-border shadow-none flex !flex-row items-center justify-between">
          <div>
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Participating Schools
            </div>
            <div className="text-2xl font-semibold mt-1">
              {new Set(students.map((s) => s.school_id)).size}
            </div>
          </div>
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <School className="h-4 w-4" />
          </div>
        </Card>
        <Card className="p-5 border-border shadow-none flex !flex-row items-center justify-between">
          <div>
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Unique Grade Cohorts
            </div>
            <div className="text-2xl font-semibold mt-1">
              {new Set(students.map((s) => s.grade)).size}
            </div>
          </div>
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <GraduationCap className="h-4 w-4" />
          </div>
        </Card>
      </div>

      {/* Table Card */}
      <Card className="border-border shadow-none">
        <CardHeader className="pb-3 border-b border-border/40">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search by student, roll no, or school..."
              className="pl-9 h-9 text-xs"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center text-muted-foreground text-xs">
              Loading students...
            </div>
          ) : students.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground text-xs">
              No students enrolled across schools yet.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs w-[170px]">
                    <div className="flex items-center gap-1">
                      <span>Roll No.</span>
                      <InfoTooltip text="School roll identifier. Hover or copy the badge below for the platform UUID." />
                    </div>
                  </TableHead>
                  <TableHead className="text-xs">Student Name</TableHead>
                  <TableHead className="text-xs">School</TableHead>
                  <TableHead className="text-xs min-w-[150px]">
                    <div className="flex items-center gap-1">
                      <span>Class & Section</span>
                      <InfoTooltip text="Student cohort. Promotion schedules increment this class automatically." />
                    </div>
                  </TableHead>
                  <TableHead className="text-xs">Contact</TableHead>
                  <TableHead className="text-right text-xs">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell className="text-xs">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-mono font-semibold text-foreground">{student.access_id}</span>
                        <MinimalUUID id={student.id} label="Student UUID" />
                      </div>
                    </TableCell>
                    <TableCell className="text-xs font-medium">
                      {student.name}
                    </TableCell>
                    <TableCell className="text-xs">
                      <div className="flex items-center gap-1.5">
                        <School className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="font-medium text-foreground">{student.school_name || "Unknown"}</span>
                        {student.school_code && (
                          <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0 h-4">
                            {student.school_code}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs min-w-[140px]">
                      <div className="flex items-center">
                        <span className="font-medium inline-block w-[72px]">Class {student.grade}</span>
                        {student.section && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-normal">
                            Sec {student.section}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {student.email || student.mobile_number || "—"}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-muted"
                        onClick={() => handleOpenEdit(student)}
                        title="Edit Student"
                      >
                        <Edit className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-rose-500/10 text-muted-foreground hover:text-rose-600"
                        onClick={() => setDeleteConfirmStudent(student)}
                        title="Delete Student"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground text-xs">
                      No matching students found for "{search}".
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Student Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">Edit Student Record</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Roll Number *</label>
                <Input
                  required
                  value={editFormData.access_id}
                  onChange={(e) => setEditFormData({ ...editFormData, access_id: e.target.value })}
                  className="h-9 text-xs font-mono"
                />
                {editingStudent && (
                  <p className="text-[10px] font-mono text-muted-foreground">
                    UUID: {editingStudent.id}
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
            </div>

            <div className="grid grid-cols-2 gap-4">
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
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Mobile Number</label>
                <Input
                  value={editFormData.mobile_number}
                  onChange={(e) => setEditFormData({ ...editFormData, mobile_number: e.target.value })}
                  placeholder="+91 90000 00000"
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Email Address</label>
                <Input
                  type="email"
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  placeholder="student@school.com"
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsEditOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm">
                Save Changes
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Student Dialog */}
      <Dialog open={!!deleteConfirmStudent} onOpenChange={(open) => !open && setDeleteConfirmStudent(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" /> Delete Student Record
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete <strong className="text-foreground">{deleteConfirmStudent?.name}</strong> (Roll: {deleteConfirmStudent?.access_id}) from {deleteConfirmStudent?.school_name}?
            </DialogDescription>
          </DialogHeader>
          <div className="text-xs text-muted-foreground py-1">
            This will remove the student record and any associated assessment responses.
          </div>
          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setDeleteConfirmStudent(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={deleteSubmitting}>
              {deleteSubmitting ? "Deleting..." : "Delete Permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
