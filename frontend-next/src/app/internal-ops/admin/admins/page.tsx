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
import { Plus, UserPlus, Copy, Check, Loader2, HeartHandshake, Building2, Mail, Phone, User, AlertCircle, AlertTriangle, Pencil, Trash2, ShieldAlert, ShieldCheck } from "lucide-react"
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

interface Admin {
  id: string
  email: string
  name: string
  created_at: string
}

interface Counselor {
  id: string
  name: string
  email: string
  phone: string
  role: string
  school_id?: string
  is_active: boolean
  available_hours: string
  created_at: string
}

export default function AdminsPage() {
  const [admins, setAdmins] = useState<Admin[]>([])
  const [counselors, setCounselors] = useState<Counselor[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingCounselors, setLoadingCounselors] = useState(true)

  // Counselor onboard state
  const [isOnboardOpen, setIsOnboardOpen] = useState(false)
  const [counselorName, setCounselorName] = useState("")
  const [counselorEmail, setCounselorEmail] = useState("")
  const [counselorPhone, setCounselorPhone] = useState("")
  const [counselorRole, setCounselorRole] = useState("Internal Platform Counselor")
  const [counselorType, setCounselorType] = useState<"internal" | "school">("internal")
  const [counselorSchoolId, setCounselorSchoolId] = useState("")
  const [schools, setSchools] = useState<any[]>([])
  const [onboarding, setOnboarding] = useState(false)
  const [onboardResult, setOnboardResult] = useState<{ temp_password: string; portal_url: string; email: string; name: string } | null>(null)
  const [onboardError, setOnboardError] = useState("")
  const [copied, setCopied] = useState(false)

  // Counselor edit state
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editingCounselor, setEditingCounselor] = useState<Counselor | null>(null)
  const [editName, setEditName] = useState("")
  const [editPhone, setEditPhone] = useState("")
  const [editRole, setEditRole] = useState("")
  const [editAvailableHours, setEditAvailableHours] = useState("")
  const [editIsActive, setEditIsActive] = useState(true)
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState("")
  const [editSuccess, setEditSuccess] = useState("")

  // Counselor delete state
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [deletingCounselor, setDeletingCounselor] = useState<Counselor | null>(null)
  const [deleteSaving, setDeleteSaving] = useState(false)
  const [deleteError, setDeleteError] = useState("")

  const openEdit = (c: Counselor) => {
    setEditingCounselor(c)
    setEditName(c.name)
    setEditPhone(c.phone || "")
    setEditRole(c.role || "")
    setEditAvailableHours(c.available_hours || "")
    setEditIsActive(c.is_active)
    setEditError("")
    setEditSuccess("")
    setIsEditOpen(true)
  }

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingCounselor) return
    setEditSaving(true)
    setEditError("")
    try {
      await api.put(`/api/admin/counselors/${editingCounselor.id}`, {
        name: editName.trim(),
        phone: editPhone.trim(),
        role: editRole.trim(),
        available_hours: editAvailableHours.trim(),
        is_active: editIsActive,
      })
      setEditSuccess("Counselor updated successfully.")
      fetchCounselors()
      setTimeout(() => {
        setIsEditOpen(false)
        setEditingCounselor(null)
        setEditSuccess("")
      }, 750)
    } catch (err: any) {
      setEditError(err.message || err.error || "Failed to update counselor")
    } finally {
      setEditSaving(false)
    }
  }

  const handleToggleStatus = async (c: Counselor) => {
    try {
      await api.put(`/api/admin/counselors/${c.id}`, { is_active: !c.is_active })
      fetchCounselors()
    } catch (err: any) {
      console.error("Failed to toggle counselor status", err)
    }
  }

  const openDelete = (c: Counselor) => {
    setDeletingCounselor(c)
    setDeleteError("")
    setIsDeleteOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!deletingCounselor) return
    setDeleteSaving(true)
    setDeleteError("")
    try {
      await api.delete(`/api/admin/counselors/${deletingCounselor.id}`)
      setIsDeleteOpen(false)
      setDeletingCounselor(null)
      fetchCounselors()
    } catch (err: any) {
      setDeleteError(err.message || err.error || "Failed to remove counselor")
    } finally {
      setDeleteSaving(false)
    }
  }

  useEffect(() => {
    fetchAdmins()
    fetchCounselors()
  }, [])

  const fetchSchools = async () => {
    try {
      const data = await api.get("/api/admin/schools")
      setSchools(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error("Failed to fetch schools", e)
    }
  }

  const fetchAdmins = async () => {
    try {
      const data = await api.get("/api/admin/admins")
      setAdmins(data)
    } catch (error) {
      console.error("Failed to fetch admins", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchCounselors = async () => {
    try {
      const data = await api.get("/api/admin/counselors")
      setCounselors(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error("Failed to fetch counselors", error)
    } finally {
      setLoadingCounselors(false)
    }
  }

  const handleOnboard = async (e: React.FormEvent) => {
    e.preventDefault()
    setOnboardError("")
    if (counselorType === "school" && !counselorSchoolId) {
      setOnboardError("Please select a partner school to assign this School Counselor to.")
      return
    }
    if (counselorType === "internal" && !counselorEmail.trim().toLowerCase().endsWith("@jaagrmind.com")) {
      setOnboardError("Internal counselors must use an @jaagrmind.com email address to be able to sign in via the Internal-Ops portal (/internal-ops/signin).")
      return
    }
    setOnboarding(true)
    try {
      const data: any = await api.post("/api/admin/counselors", {
        name: counselorName,
        email: counselorEmail,
        phone: counselorPhone,
        role: counselorType === "school" ? "School Wellness Counselor" : "Internal Platform Counselor",
        counselor_type: counselorType,
        school_id: counselorType === "school" ? counselorSchoolId : "",
      })
      setOnboardResult({
        temp_password: data.temp_password,
        portal_url: data.portal_url,
        email: data.email,
        name: data.name,
      })
      fetchCounselors()
    } catch (error: any) {
      console.error("Failed to onboard counselor", error)
      setOnboardError(error.message || error.error || "Failed to onboard counselor.")
    } finally {
      setOnboarding(false)
    }
  }

  const copyPassword = () => {
    if (onboardResult) {
      navigator.clipboard.writeText(onboardResult.temp_password)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const resetOnboard = () => {
    setCounselorName("")
    setCounselorEmail("")
    setCounselorPhone("")
    setCounselorRole("Internal Platform Counselor")
    setCounselorType("internal")
    setCounselorSchoolId("")
    setOnboardError("")
    setOnboardResult(null)
    setIsOnboardOpen(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Admin & Access</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage platform admins and onboard counselors.
          </p>
        </div>
        
        <Dialog open={isOnboardOpen} onOpenChange={(open) => {
          setIsOnboardOpen(open)
          if (!open) setTimeout(resetOnboard, 300)
        }}>
          <DialogTrigger render={<Button size="sm"><UserPlus className="mr-1.5 h-3.5 w-3.5" /> Onboard Counselor</Button>} />
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Onboard a New Counselor</DialogTitle>
              <DialogDescription>
                Create login credentials for a JaagrMind Central or School Wellness Counselor. They will receive an onboarding email with their temporary password.
              </DialogDescription>
            </DialogHeader>

            {!onboardResult ? (
              <form onSubmit={handleOnboard} className="space-y-4 py-2">
                {onboardError && (
                  <div className="p-3 bg-destructive/10 text-destructive border border-destructive/20 rounded-lg text-xs flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{onboardError}</span>
                  </div>
                )}

                {/* Counselor Type Toggle */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-foreground">Counselor Type & Affiliation *</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setCounselorType("internal")
                        setCounselorSchoolId("")
                        setCounselorRole("Internal Platform Counselor")
                      }}
                      className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                        counselorType === "internal"
                          ? "border-primary bg-primary/10 text-primary font-semibold ring-1 ring-primary/20"
                          : "border-border/80 bg-background text-muted-foreground hover:bg-muted/40"
                      }`}
                    >
                      <div className="text-xs">Internal Platform</div>
                      <div className="text-[10px] opacity-80 mt-0.5">Central Care Desk</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setCounselorType("school")
                        setCounselorRole("School Wellness Counselor")
                        if (schools.length === 0) fetchSchools()
                      }}
                      className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                        counselorType === "school"
                          ? "border-primary bg-primary/10 text-primary font-semibold ring-1 ring-primary/20"
                          : "border-border/80 bg-background text-muted-foreground hover:bg-muted/40"
                      }`}
                    >
                      <div className="text-xs">School Counselor</div>
                      <div className="text-[10px] opacity-80 mt-0.5">Assigned to 1 School</div>
                    </button>
                  </div>
                </div>

                {/* School Selector (when School Counselor is selected) */}
                {counselorType === "school" && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Assign to School Campus *</label>
                    <select
                      value={counselorSchoolId}
                      onChange={(e) => setCounselorSchoolId(e.target.value)}
                      required
                      className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <option value="">-- Select Partner School --</option>
                      {schools.map((sc) => (
                        <option key={sc.id} value={sc.id}>
                          {sc.name} ({sc.school_code || sc.city || "Campus"})
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-muted-foreground italic">
                      Strict constraint: Each counselor can serve exactly one school campus.
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-medium">Counselor Name *</label>
                  <Input 
                    placeholder="e.g. Dr. Priya Sharma" 
                    value={counselorName}
                    onChange={(e) => setCounselorName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Email *</label>
                    {counselorType === "internal" && (
                      <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 font-mono">
                        @jaagrmind.com required
                      </span>
                    )}
                  </div>
                  <Input 
                    type="email"
                    placeholder={counselorType === "internal" ? "counselor@jaagrmind.com" : "counselor@school.edu"} 
                    value={counselorEmail}
                    onChange={(e) => setCounselorEmail(e.target.value)}
                    required
                  />
                  {counselorType === "internal" && (
                    <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                      <div className="space-y-0.5">
                        <p className="font-semibold text-[11px] tracking-tight text-amber-800 dark:text-amber-300">
                          Internal-Ops Login Requirement
                        </p>
                        <p className="text-[11px] leading-relaxed">
                          Please use only an official <strong className="font-mono text-foreground font-semibold">@jaagrmind.com</strong> email for internal counselors. Only @jaagrmind.com accounts are authorized to sign in through the <strong>Internal-Ops Gateway</strong> (<code className="font-mono text-[10px] bg-amber-500/20 px-1 py-0.5 rounded text-foreground">/internal-ops/signin</code>).
                        </p>
                      </div>
                    </div>
                  )}
                  {counselorType === "internal" && counselorEmail.trim() && !counselorEmail.trim().toLowerCase().endsWith("@jaagrmind.com") && (
                    <div className="p-2 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-1.5">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      <span className="text-[11px] font-medium">
                        Warning: Email must end with <strong>@jaagrmind.com</strong> to log in via internal-ops!
                      </span>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Phone</label>
                  <Input 
                    placeholder="+91 98765 43210" 
                    value={counselorPhone}
                    onChange={(e) => setCounselorPhone(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5 p-3 rounded-lg bg-muted/40 border border-border/60">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">
                      Role: {counselorType === "school" ? "School Wellness Counselor" : "Internal Care Desk Counselor"}
                    </span>
                    <Badge variant="outline" className="text-[10px] font-mono text-sky-600 dark:text-sky-400 bg-sky-500/10 border-sky-500/20">
                      {counselorType === "school" ? "School Portal" : "JaagrMind Internal"}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {counselorType === "school"
                      ? "This counselor will access the School Counselor Portal via general public login to manage their assigned school's student dossiers and parent inquiries."
                      : "This counselor will access the Central Care Desk via Internal-Ops sign-in to review unassigned independent family inquiries."}
                  </p>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={onboarding} className="w-full sm:w-auto cursor-pointer">
                    {onboarding ? "Provisioning..." : `Provision ${counselorType === "school" ? "School" : "Central"} Counselor`}
                  </Button>
                </DialogFooter>
              </form>
            ) : (
              <div className="space-y-4 py-4">
                <div className="p-3 bg-emerald-500/10 rounded-md border border-emerald-500/20 text-sm text-emerald-700 dark:text-emerald-300">
                  <strong>{onboardResult.name}</strong> has been onboarded successfully. An onboarding email has been dispatched to <strong>{onboardResult.email}</strong>.
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Temporary Password</label>
                  <div className="flex items-center gap-2">
                    <Input value={onboardResult.temp_password} readOnly className="font-mono text-xs" />
                    <Button size="icon" variant="outline" onClick={copyPassword} className="shrink-0">
                      {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground flex flex-col gap-1">
                  <div>
                    Access Portal: <code className="font-mono text-foreground font-semibold">{onboardResult.portal_url}</code>
                  </div>
                  {counselorType === "internal" ? (
                    <p className="text-[11px] text-amber-700 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 p-2 rounded">
                      This internal counselor must sign in via <strong>/internal-ops/signin</strong> using their <strong>@jaagrmind.com</strong> email.
                    </p>
                  ) : (
                    <p className="text-[11px] text-muted-foreground">
                      This school counselor will sign in via general school login using their institutional credentials.
                    </p>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Super Admins Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">Super Admins</CardTitle>
          <CardDescription>Users with full access to the JaagrMind platform.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              Loading admins...
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {admins.map((admin) => (
                      <TableRow key={admin.id}>
                        <TableCell className="font-medium">{admin.name || "—"}</TableCell>
                        <TableCell className="text-muted-foreground">{admin.email}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="font-normal">Super Admin</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {admins.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                          No admins found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden divide-y divide-border/60">
                {admins.map((admin) => (
                  <div key={admin.id} className="p-3.5 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-foreground truncate">{admin.name || "—"}</p>
                      <p className="text-xs text-muted-foreground font-mono truncate">{admin.email}</p>
                    </div>
                    <Badge variant="secondary" className="font-normal text-[11px] shrink-0">Super Admin</Badge>
                  </div>
                ))}
                {admins.length === 0 && (
                  <div className="p-8 text-center text-xs text-muted-foreground">
                    No admins found.
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Counselors Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <HeartHandshake className="h-4 w-4 text-sky-500" />
            <CardTitle className="text-base font-medium">Platform Counselors</CardTitle>
          </div>
          <CardDescription>All onboarded JaagrMind Central and School Wellness Counselors.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loadingCounselors ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-sky-500" />
              Loading counselors...
            </div>
          ) : counselors.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <HeartHandshake className="h-8 w-8 text-muted-foreground/40 mx-auto" />
              <p className="text-sm font-medium text-foreground">No counselors onboarded yet</p>
              <p className="text-xs text-muted-foreground">
                Use the &quot;Onboard Counselor&quot; button above to add your first counselor.
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Hours</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {counselors.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.name}</TableCell>
                        <TableCell className="text-muted-foreground text-xs font-mono">{c.email}</TableCell>
                        <TableCell className="text-muted-foreground text-xs">{c.phone || "—"}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              c.school_id
                                ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20 text-[10px] font-mono"
                                : "text-sky-600 dark:text-sky-400 bg-sky-500/10 border-sky-500/20 text-[10px] font-mono"
                            }
                          >
                            {c.school_id ? "School" : "Central"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{c.available_hours || "—"}</TableCell>
                        <TableCell>
                          <Badge variant={c.is_active ? "default" : "secondary"} className="text-[10px]">
                            {c.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                              onClick={() => openEdit(c)}
                              title="Edit Counselor Details"
                            >
                              <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className={`h-7 px-2 text-xs ${
                                c.is_active
                                  ? "text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                                  : "text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
                              }`}
                              onClick={() => handleToggleStatus(c)}
                              title={c.is_active ? "Deactivate / Block counselor access" : "Activate counselor access"}
                            >
                              {c.is_active ? (
                                <>
                                  <ShieldAlert className="h-3.5 w-3.5 mr-1" /> Deactivate
                                </>
                              ) : (
                                <>
                                  <ShieldCheck className="h-3.5 w-3.5 mr-1" /> Activate
                                </>
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10"
                              onClick={() => openDelete(c)}
                              title="Delete Counselor & Revoke Access"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden divide-y divide-border/60">
                {counselors.map((c) => (
                  <div key={c.id} className="p-3.5 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-foreground truncate">{c.name}</p>
                        <p className="text-xs text-muted-foreground font-mono truncate">{c.email}</p>
                      </div>
                      <Badge variant={c.is_active ? "default" : "secondary"} className="text-[10px] shrink-0">
                        {c.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between gap-2 text-xs pt-0.5">
                      <Badge
                        variant="outline"
                        className={
                          c.school_id
                            ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20 text-[10px] font-mono"
                            : "text-sky-600 dark:text-sky-400 bg-sky-500/10 border-sky-500/20 text-[10px] font-mono"
                        }
                      >
                        {c.school_id ? "School Counselor" : "Central Counselor"}
                      </Badge>
                      {c.phone && <span className="text-[11px] text-muted-foreground font-mono">{c.phone}</span>}
                    </div>

                    {c.available_hours && (
                      <div className="text-[10px] text-muted-foreground font-mono pt-1 border-t border-border/40">
                        Hours: {c.available_hours}
                      </div>
                    )}

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => openEdit(c)}
                      >
                        <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className={`h-7 px-2 text-xs ${
                          c.is_active ? "text-amber-600 border-amber-500/30" : "text-emerald-600 border-emerald-500/30"
                        }`}
                        onClick={() => handleToggleStatus(c)}
                      >
                        {c.is_active ? "Deactivate" : "Activate"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
                        onClick={() => openDelete(c)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Edit Counselor Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Counselor Details</DialogTitle>
            <DialogDescription>
              Update contact information, hours, or toggle platform account access.
            </DialogDescription>
          </DialogHeader>

          {editingCounselor && (
            <form onSubmit={handleSaveEdit} className="space-y-4 py-2">
              {editError && (
                <div className="p-3 bg-destructive/10 text-destructive border border-destructive/20 rounded-lg text-xs flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{editError}</span>
                </div>
              )}
              {editSuccess && (
                <div className="p-3 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 rounded-lg text-xs">
                  {editSuccess}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-semibold">Full Name</label>
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} required />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold">Email Address (Read-only)</label>
                <Input value={editingCounselor.email} disabled className="bg-muted font-mono text-xs" />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold">Phone</label>
                <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="+91 98765 43210" />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold">Role Title</label>
                <Input value={editRole} onChange={(e) => setEditRole(e.target.value)} />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold">Available Hours</label>
                <Input value={editAvailableHours} onChange={(e) => setEditAvailableHours(e.target.value)} placeholder="Mon-Fri, 9:00 AM - 3:30 PM" />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border/60">
                <div>
                  <p className="text-xs font-semibold">Account Status</p>
                  <p className="text-[11px] text-muted-foreground">
                    {editIsActive ? "Active: Can sign in and receive student inquiries" : "Inactive: Login access suspended"}
                  </p>
                </div>
                <Button
                  type="button"
                  variant={editIsActive ? "default" : "secondary"}
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => setEditIsActive(!editIsActive)}
                >
                  {editIsActive ? "Active" : "Inactive"}
                </Button>
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={editSaving}>
                  {editSaving ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Counselor Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" /> Remove Counselor
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to remove <strong>{deletingCounselor?.name}</strong>?
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 text-xs text-muted-foreground space-y-2">
            <p>
              This will remove the counselor from the directory and revoke their login privileges across the Counselor Portal.
            </p>
            {deleteError && (
              <div className="p-3 bg-destructive/10 text-destructive border border-destructive/20 rounded-lg text-xs flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{deleteError}</span>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setIsDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteSaving}
              onClick={handleConfirmDelete}
            >
              {deleteSaving ? "Removing..." : "Confirm & Revoke Access"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
