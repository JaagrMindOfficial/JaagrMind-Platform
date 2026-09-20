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
import { useRouter } from "next/navigation"
import { Search, Plus, Check, Copy, Lock, AlertCircle } from "lucide-react"
import { api } from "@/lib/api"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { useAuth } from "@/context/auth-context"

interface Teacher {
  id: string
  email: string
  name: string
  phone?: string
  created_at: string
  metadata?: {
    assigned_grade?: string
    assigned_section?: string
    designation?: string
    phone?: string
  }
}

export default function TeachersPage() {
  const { isSchoolAdmin, isSuperAdmin, hasRole } = useAuth()
  const router = useRouter()
  const canManage = isSchoolAdmin || isSuperAdmin || hasRole("superadmin") || hasRole("school_admin")
  const isTeacherOnly = hasRole("teacher") && !canManage

  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  // Add teacher state
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [designation, setDesignation] = useState("Class Teacher")
  const [assignedGrade, setAssignedGrade] = useState("10")
  const [assignedSection, setAssignedSection] = useState("A")
  const [adding, setAdding] = useState(false)
  const [addResult, setAddResult] = useState<{ temp_password: string; assigned_grade?: string; assigned_section?: string; designation?: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!isTeacherOnly) {
      fetchTeachers()
    } else {
      setLoading(false)
    }
  }, [isTeacherOnly])

  const fetchTeachers = async () => {
    try {
      const data = await api.get("/api/school/teachers")
      setTeachers(data)
    } catch (error) {
      console.error("Failed to fetch teachers", error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddTeacher = async (e: React.FormEvent) => {
    e.preventDefault()
    setAdding(true)
    setError("")
    try {
      const data = await api.post("/api/school/teachers", {
        name,
        email,
        phone,
        designation,
        assigned_grade: assignedGrade,
        assigned_section: assignedSection,
      })
      setAddResult({
        temp_password: data.temp_password,
        assigned_grade: data.assigned_grade || assignedGrade,
        assigned_section: data.assigned_section || assignedSection,
        designation: data.designation || designation,
      })
      fetchTeachers() // refresh list
    } catch (err: any) {
      setError(err.message || "Failed to add teacher")
    } finally {
      setAdding(false)
    }
  }

  const copyToClipboard = () => {
    if (addResult) {
      const loginUrl = typeof window !== "undefined" ? `${window.location.origin}/login` : "/login"
      navigator.clipboard.writeText(
        `Teacher Credentials Provisioned:\nName: ${name}\nDesignation: ${addResult.designation || designation}\nPhone: ${phone}\nEmail: ${email}\nTemporary Password: ${addResult.temp_password}\nAssigned Class: Class ${addResult.assigned_grade || assignedGrade}th - Section ${addResult.assigned_section || assignedSection}\nLogin URL: ${loginUrl}`
      )
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const resetForm = () => {
    setName("")
    setEmail("")
    setPhone("")
    setDesignation("Class Teacher")
    setAssignedGrade("10")
    setAssignedSection("A")
    setAddResult(null)
    setError("")
    setIsAddOpen(false)
  }

  const filtered = teachers.filter((t) => 
    t.name.toLowerCase().includes(search.toLowerCase()) || 
    t.email.toLowerCase().includes(search.toLowerCase())
  )

  if (isTeacherOnly) {
    return (
      <div className="p-6 sm:p-8 max-w-3xl mx-auto space-y-6 pt-16">
        <div className="rounded-xl border border-border bg-card p-8 text-center space-y-4 shadow-sm">
          <div className="h-12 w-12 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
            <Lock className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Access Restricted</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
            Institutional faculty management is reserved for School Administrators. Classroom teachers do not have authorization to view peer educator accounts or provision staff credentials.
          </p>
          <div className="pt-2">
            <Button variant="outline" onClick={() => router.push("/school")}>
              Return to Classroom Dashboard
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Teacher & Class Access</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Grant portal credentials to class teachers and counselors to monitor their classes, conduct check-ins, and view student reports.
          </p>
        </div>
        
        {isSchoolAdmin && (
          <Dialog open={isAddOpen} onOpenChange={(open) => {
            setIsAddOpen(open)
            if (!open) setTimeout(resetForm, 300)
          }}>
            <DialogTrigger render={<Button size="sm"><Plus className="mr-1.5 h-3.5 w-3.5" /> Grant Educator Access</Button>} />
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Grant Educator Portal Access</DialogTitle>
                <DialogDescription>
                  Provision portal login credentials for a class teacher or school counselor.
                </DialogDescription>
              </DialogHeader>

              {!addResult ? (
                <form onSubmit={handleAddTeacher} className="space-y-4 py-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Full Name</label>
                    <Input 
                      placeholder="e.g. Jane Doe" 
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium">Email Address</label>
                      <Input 
                        type="email"
                        placeholder="teacher@school.edu" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium">Phone Number</label>
                      <Input 
                        type="tel"
                        placeholder="+91 98765 43210" 
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="text-xs"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium">Designation / Role</label>
                    <select
                      value={designation}
                      onChange={(e) => setDesignation(e.target.value)}
                      className="w-full h-9 text-xs rounded-md border border-input bg-background px-2.5"
                    >
                      <option value="Class Teacher">Class Teacher (Class Lead)</option>
                      <option value="Subject Teacher">Subject Teacher</option>
                      <option value="Assistant Teacher">Assistant / Support Educator</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium">Assigned Grade</label>
                      <select
                        value={assignedGrade}
                        onChange={(e) => setAssignedGrade(e.target.value)}
                        className="w-full h-9 text-xs rounded-md border border-input bg-background px-2.5"
                      >
                        <option value="6">Class 6th</option>
                        <option value="7">Class 7th</option>
                        <option value="8">Class 8th</option>
                        <option value="9">Class 9th</option>
                        <option value="10">Class 10th</option>
                        <option value="11">Class 11th</option>
                        <option value="12">Class 12th</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium">Assigned Section</label>
                      <select
                        value={assignedSection}
                        onChange={(e) => setAssignedSection(e.target.value)}
                        className="w-full h-9 text-xs rounded-md border border-input bg-background px-2.5"
                      >
                        <option value="A">Section A</option>
                        <option value="B">Section B</option>
                        <option value="C">Section C</option>
                        <option value="All">All Sections</option>
                      </select>
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Class teacher view will be scoped strictly to Class {assignedGrade}th - Section {assignedSection}.
                  </p>
                  {error && <p className="text-sm text-destructive">{error}</p>}
                  <DialogFooter>
                    <Button type="submit" disabled={adding} className="w-full sm:w-auto">
                      {adding ? "Adding..." : "Add Teacher"}
                    </Button>
                  </DialogFooter>
                </form>
              ) : (
                <div className="space-y-4 py-2">
                  <div className="p-3.5 bg-muted/40 rounded-xl border border-border/70 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground font-mono">Teacher Name:</span>
                      <span className="font-semibold text-foreground">{name}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground font-mono">Designation:</span>
                      <span className="font-medium text-foreground">{addResult.designation || designation}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground font-mono">Assigned Scope:</span>
                      <span className="font-medium text-foreground">Class {addResult.assigned_grade || assignedGrade}th - Section {addResult.assigned_section || assignedSection}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground font-mono">Login Email:</span>
                      <span className="font-mono text-foreground font-medium">{email}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground font-mono">Temporary Password:</span>
                      <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        {addResult.temp_password}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground font-mono">Full Login Route:</span>
                      <span className="font-mono text-sky-600 dark:text-sky-400">
                        {typeof window !== "undefined" ? `${window.location.origin}/login` : "/login"}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-xs text-amber-800 dark:text-amber-300 space-y-1">
                    <div className="flex items-center gap-1.5 font-semibold">
                      <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                      One-Time Credential Display Warning
                    </div>
                    <p className="text-[11px] leading-relaxed">
                      This temporary password will <strong>not</strong> be shown again and cannot be retrieved after closing this window. Please copy and securely share it with the educator now.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <Button onClick={copyToClipboard} className="flex-1 text-xs gap-2" variant="default">
                      {copied ? <Check className="h-4 w-4 text-emerald-300" /> : <Copy className="h-4 w-4" />}
                      {copied ? "Credentials Copied to Clipboard!" : "Copy Full Credentials"}
                    </Button>
                    <Button variant="outline" size="sm" onClick={resetForm} className="text-xs">
                      Done
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="p-3.5 rounded-xl border border-sky-500/20 bg-sky-500/5 text-xs text-sky-700 dark:text-sky-300 flex items-center justify-between">
        <span>
          <strong>Confidentiality Scoping:</strong> Teachers assigned to a classroom have their analytics, student diagnostic dossiers, and action playbooks restricted to their assigned grade & section.
        </span>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              className="pl-9 h-9 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              Loading teachers...
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Teacher / Educator</TableHead>
                  <TableHead>Designation</TableHead>
                  <TableHead>Contact Phone</TableHead>
                  <TableHead>Assigned Classroom</TableHead>
                  <TableHead className="text-right">Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">
                      <div>
                        <p className="font-medium text-foreground">{t.name || "—"}</p>
                        <p className="text-[11px] text-muted-foreground font-mono">{t.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-muted border border-border">
                        {t.metadata?.designation || "Class Teacher"}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono">
                      {t.phone || t.metadata?.phone || "—"}
                    </TableCell>
                    <TableCell>
                      {t.metadata?.assigned_grade ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-primary/10 text-primary border border-primary/20">
                          Class {t.metadata.assigned_grade}th - Sec {t.metadata.assigned_section || "A"}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">General Faculty</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground text-sm">
                      {new Date(t.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      No teachers found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
