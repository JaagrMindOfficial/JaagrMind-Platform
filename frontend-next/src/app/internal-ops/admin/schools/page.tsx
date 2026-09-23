"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { 
  Search, Plus, Edit, ShieldBan, ShieldCheck, Trash2, 
  Building2, School as SchoolIcon, BarChart2, Check, AlertCircle, Phone, MapPin,
  Mail, Key, Copy, CheckCircle2, GitBranch, ExternalLink, History, RefreshCw, AlertTriangle
} from "lucide-react"
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, 
  DialogTrigger, DialogFooter, DialogDescription 
} from "@/components/ui/dialog"
import { InfoTooltip } from "@/components/ui/info-tooltip"
import { MinimalUUID } from "@/components/ui/minimal-uuid"
import { EventsAuditCard, AuditEvent } from "@/components/events-audit-card"
import { CreateBranchDialog } from "@/components/create-branch-dialog"
import { api } from "@/lib/api"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { INDIAN_STATES_AND_UTS, SCHOOL_DESIGNATIONS, generateSchoolCodePreview } from "@/lib/constants"

interface School {
  id: string
  name: string
  school_code: string
  city: string
  contact: string
  phone_number?: string
  parent_school_id?: string | null
  is_active: boolean
  is_blocked: boolean
  created_at: string
}

interface SchoolInvite {
  id: string
  school_name: string
  email: string
  token: string
  phone_number?: string
  temp_password?: string
  expires_at: string
  accepted_at?: string | null
  created_at: string
}

export default function AdminSchoolsPage() {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [schools, setSchools] = useState<School[]>([])
  const [loading, setLoading] = useState(true)
  const [pendingApplicationsCount, setPendingApplicationsCount] = useState(0)

  // Tab navigation
  const [activeTab, setActiveTab] = useState<"campuses" | "invites">("campuses")

  // Invites state
  const [invites, setInvites] = useState<SchoolInvite[]>([])
  const [loadingInvites, setLoadingInvites] = useState(false)
  const [copiedInviteId, setCopiedInviteId] = useState<string | null>(null)
  const [revokeTarget, setRevokeTarget] = useState<SchoolInvite | null>(null)
  const [revoking, setRevoking] = useState(false)

  // Native invite success modal
  const [inviteSuccessModal, setInviteSuccessModal] = useState<{
    school_name: string
    email: string
    token: string
    invite_link: string
    temp_password?: string
  } | null>(null)
  const [inviteCopied, setInviteCopied] = useState(false)

  // Action error message modal
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Invite modal state
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [inviteData, setInviteData] = useState({
    school_name: "",
    email: "",
    phone_number: "",
    temp_password: "",
  })
  const [inviteSubmitting, setInviteSubmitting] = useState(false)

  const generateRandomPassword = () => {
    const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ"
    const lower = "abcdefghjkmnpqrstuvwxyz"
    const digits = "23456789"
    const special = "!@#$%"
    const all = upper + lower + digits + special
    let pwd = "JM-"
    for (let i = 0; i < 8; i++) {
      pwd += all.charAt(Math.floor(Math.random() * all.length))
    }
    setInviteData((prev) => ({ ...prev, temp_password: pwd }))
  }

  // Provision School state
  const [isProvisionOpen, setIsProvisionOpen] = useState(false)
  const [provisionForm, setProvisionForm] = useState({
    name: "",
    school_code: "",
    city: "",
    state: "Delhi (NCT)",
    admin_name: "",
    designation: "Principal / Head of School",
    admin_email: "",
    phone_number: "",
    password: "",
    send_email: false,
  })
  const [provisionSubmitting, setProvisionSubmitting] = useState(false)
  const [provisionSuccessModal, setProvisionSuccessModal] = useState<{
    school_id: string
    school_name: string
    school_code: string
    admin_name: string
    admin_email: string
    admin_phone: string
    temp_password: string
    email_sent: boolean
    login_url: string
  } | null>(null)
  const [provisionCopied, setProvisionCopied] = useState(false)

  const generateProvisionPassword = () => {
    const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ"
    const lower = "abcdefghjkmnpqrstuvwxyz"
    const digits = "23456789"
    const special = "!@#$%"
    const all = upper + lower + digits + special
    let pwd = "JM-"
    for (let i = 0; i < 8; i++) {
      pwd += all.charAt(Math.floor(Math.random() * all.length))
    }
    setProvisionForm((prev) => ({ ...prev, password: pwd }))
  }

  // Server validation — fired on blur, not on every keystroke
  const lastAutoCode = useRef<string>("")

  const fetchUniqueCode = useCallback(async (name: string, city: string) => {
    if (!name.trim()) return
    try {
      const res = await api.get(`/api/admin/schools/generate-code?name=${encodeURIComponent(name)}&city=${encodeURIComponent(city)}`)
      if (res?.code) {
        lastAutoCode.current = res.code
        setProvisionForm((prev) => {
          const preview = generateSchoolCodePreview(prev.name, prev.city)
          if (prev.school_code === preview || prev.school_code === lastAutoCode.current || prev.school_code === "") {
            return { ...prev, school_code: res.code }
          }
          return prev
        })
      }
    } catch {
      // Silently fall back to client-side preview
    }
  }, [])

  const handleProvisionSchoolNameChange = (name: string) => {
    setProvisionForm((prev) => {
      const prevPreview = generateSchoolCodePreview(prev.name, prev.city)
      const shouldAutoUpdateCode = !prev.school_code || prev.school_code === prevPreview || prev.school_code === lastAutoCode.current

      let newCode = prev.school_code
      if (shouldAutoUpdateCode && name.trim()) {
        newCode = generateSchoolCodePreview(name, prev.city)
        lastAutoCode.current = newCode
      }

      return {
        ...prev,
        name,
        school_code: shouldAutoUpdateCode ? newCode : prev.school_code,
      }
    })
  }

  // Fires server validation when user leaves the name or city field
  const handleProvisionNameOrCityBlur = () => {
    setProvisionForm((prev) => {
      const preview = generateSchoolCodePreview(prev.name, prev.city)
      const shouldFetch = !prev.school_code || prev.school_code === preview || prev.school_code === lastAutoCode.current
      if (shouldFetch && prev.name.trim()) {
        fetchUniqueCode(prev.name, prev.city)
      }
      return prev
    })
  }

  const handleProvisionCityChange = (city: string) => {
    setProvisionForm((prev) => {
      const prevPreview = generateSchoolCodePreview(prev.name, prev.city)
      const shouldAutoUpdateCode = !prev.school_code || prev.school_code === prevPreview || prev.school_code === lastAutoCode.current

      let newCode = prev.school_code
      if (shouldAutoUpdateCode && prev.name.trim()) {
        newCode = generateSchoolCodePreview(prev.name, city)
        lastAutoCode.current = newCode
      }

      return {
        ...prev,
        city,
        school_code: shouldAutoUpdateCode ? newCode : prev.school_code,
      }
    })
  }

  const handleOpenProvision = () => {
    const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ"
    const lower = "abcdefghjkmnpqrstuvwxyz"
    const digits = "23456789"
    const special = "!@#$%"
    const all = upper + lower + digits + special
    let pwd = "JM-"
    for (let i = 0; i < 8; i++) {
      pwd += all.charAt(Math.floor(Math.random() * all.length))
    }
    setProvisionForm({
      name: "",
      school_code: "",
      city: "",
      state: "Delhi (NCT)",
      admin_name: "",
      designation: "Principal / Head of School",
      admin_email: "",
      phone_number: "",
      password: pwd,
      send_email: false,
    })
    setIsProvisionOpen(true)
  }

  const handleProvisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setProvisionSubmitting(true)
    try {
      const res = await api.post("/api/admin/schools/provision", provisionForm)
      setIsProvisionOpen(false)
      setProvisionSuccessModal({
        school_id: res.school_id || res.school?.id,
        school_name: res.school_name || provisionForm.name,
        school_code: res.school_code || provisionForm.school_code,
        admin_name: res.admin_name || provisionForm.admin_name,
        admin_email: res.admin_email || provisionForm.admin_email,
        admin_phone: res.admin_phone || provisionForm.phone_number,
        temp_password: res.temp_password || provisionForm.password,
        email_sent: !!res.email_sent,
        login_url: res.login_url || `${window.location.origin}/login`,
      })
      fetchSchools()
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to provision school institution")
    } finally {
      setProvisionSubmitting(false)
    }
  }

  const copyProvisionCredentials = () => {
    if (!provisionSuccessModal) return
    const text = `JaagrMind School Portal Access Details:
Institution: ${provisionSuccessModal.school_name}
School Code: ${provisionSuccessModal.school_code}
Administrator: ${provisionSuccessModal.admin_name}
Login Email: ${provisionSuccessModal.admin_email}
Temporary Password: ${provisionSuccessModal.temp_password}
Portal Sign-In: ${provisionSuccessModal.login_url}`
    navigator.clipboard.writeText(text)
    setProvisionCopied(true)
    setTimeout(() => setProvisionCopied(false), 2000)
  }

  // Edit modal state
  const [editingSchool, setEditingSchool] = useState<School | null>(null)
  const [editForm, setEditForm] = useState({
    name: "",
    school_code: "",
    city: "",
    contact: "",
    phone_number: "",
    parent_school_id: ""
  })
  const [editSubmitting, setEditSubmitting] = useState(false)

  // Delete modal state
  const [deletingSchool, setDeletingSchool] = useState<School | null>(null)
  const [deleteSubmitting, setDeleteSubmitting] = useState(false)

  // Setup / Reset Link dialog state
  const [resetLinkModal, setResetLinkModal] = useState<{
    isOpen: boolean
    schoolName: string
    adminEmail: string
    phone: string
    resetUrl: string
  } | null>(null)
  const [copiedResetUrl, setCopiedResetUrl] = useState(false)
  const [impersonatingId, setImpersonatingId] = useState<string | null>(null)
  const [blockingSchool, setBlockingSchool] = useState<School | null>(null)
  const [blockSubmitting, setBlockSubmitting] = useState(false)
  const [auditSchool, setAuditSchool] = useState<School | null>(null)
  const [schoolEvents, setSchoolEvents] = useState<AuditEvent[]>([])
  const [schoolEventsLoading, setSchoolEventsLoading] = useState(false)
  const [branchParentSchool, setBranchParentSchool] = useState<School | null>(null)

  const openAuditModal = async (school: School) => {
    setAuditSchool(school)
    setSchoolEventsLoading(true)
    try {
      const res = await api.get<AuditEvent[]>(`/api/admin/events?school_id=${school.id}`)
      setSchoolEvents(Array.isArray(res) ? res : [])
    } catch (err) {
      console.error("Failed to load school audit events", err)
    } finally {
      setSchoolEventsLoading(false)
    }
  }

  const fetchSchools = async () => {
    setLoading(true)
    try {
      const data = await api.get("/api/admin/schools")
      setSchools(data || [])
      const apps = await api.get("/api/admin/institution-applications")
      if (Array.isArray(apps)) {
        setPendingApplicationsCount(apps.filter((a: any) => a.status === "pending").length)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const fetchInvites = async () => {
    setLoadingInvites(true)
    try {
      const data = await api.get("/api/admin/school-invites")
      setInvites(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error("Failed to load school invitations", err)
    } finally {
      setLoadingInvites(false)
    }
  }

  useEffect(() => {
    fetchSchools()
    fetchInvites()
  }, [])

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setInviteSubmitting(true)
    try {
      const res = await api.post("/api/admin/invite-school", inviteData)
      setIsAddOpen(false)
      const link = `${window.location.origin}/invite/${res.token}`
      setInviteSuccessModal({
        school_name: inviteData.school_name,
        email: inviteData.email,
        token: res.token,
        invite_link: link,
        temp_password: inviteData.temp_password || res.temp_password || "",
      })
      setInviteData({ school_name: "", email: "", phone_number: "", temp_password: "" })
      fetchSchools()
      fetchInvites()
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to send invitation")
    } finally {
      setInviteSubmitting(false)
    }
  }

  const handleConfirmRevoke = async () => {
    if (!revokeTarget) return
    setRevoking(true)
    try {
      await api.delete(`/api/admin/school-invites/${revokeTarget.id}`)
      setRevokeTarget(null)
      fetchInvites()
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to revoke invitation")
    } finally {
      setRevoking(false)
    }
  }

  const handleResendInvite = async (inv: SchoolInvite) => {
    try {
      const res = await api.post("/api/admin/invite-school", {
        school_name: inv.school_name,
        email: inv.email,
      })
      const link = res.invite_link || `${window.location.origin}/invite/${res.token}`
      setInviteSuccessModal({
        school_name: inv.school_name,
        email: inv.email,
        token: res.token,
        invite_link: link,
      })
      fetchInvites()
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to renew invitation")
    }
  }

  const openEditModal = (school: School) => {
    setEditingSchool(school)
    setEditForm({
      name: school.name || "",
      school_code: school.school_code || "",
      city: school.city || "",
      contact: school.contact || "",
      phone_number: school.phone_number || "",
      parent_school_id: school.parent_school_id || ""
    })
  }

  const openAddBranchModal = (parentSchool: School) => {
    setBranchParentSchool(parentSchool)
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingSchool) return

    setEditSubmitting(true)
    try {
      if (editingSchool.id) {
        await api.put(`/api/admin/schools/${editingSchool.id}`, {
          name: editForm.name,
          school_code: editForm.school_code,
          city: editForm.city,
          contact: editForm.contact,
          phone_number: editForm.phone_number,
          parent_school_id: editForm.parent_school_id ? editForm.parent_school_id : null
        })
      } else {
        await api.post(`/api/admin/schools`, {
          name: editForm.name,
          school_code: editForm.school_code,
          city: editForm.city,
          contact: editForm.contact,
          phone_number: editForm.phone_number,
          parent_school_id: editForm.parent_school_id ? editForm.parent_school_id : null
        })
      }
      setEditingSchool(null)
      fetchSchools()
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to update school")
    } finally {
      setEditSubmitting(false)
    }
  }

  const handleDeleteSubmit = async () => {
    if (!deletingSchool) return

    setDeleteSubmitting(true)
    try {
      await api.delete(`/api/admin/schools/${deletingSchool.id}`)
      setDeletingSchool(null)
      fetchSchools()
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to delete school")
    } finally {
      setDeleteSubmitting(false)
    }
  }

  const handleImpersonate = async (school: School) => {
    setImpersonatingId(school.id)
    try {
      const res = await api.post(`/api/admin/schools/${school.id}/impersonate`, {})
      if (res.token) {
        sessionStorage.setItem("superadmin_original_token", localStorage.getItem("token") || "")
        sessionStorage.setItem("superadmin_original_user", localStorage.getItem("user") || "")
        localStorage.setItem("superadmin_impersonating", JSON.stringify({ schoolName: school.name, schoolId: school.id }))
        localStorage.setItem("token", res.token)
        localStorage.setItem("user", JSON.stringify(res.user))
        window.location.href = "/school"
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to enter school portal")
    } finally {
      setImpersonatingId(null)
    }
  }

  const handleSendResetLink = async (school: School) => {
    try {
      const res = await api.post(`/api/admin/schools/${school.id}/send-reset-link`, {})
      setResetLinkModal({
        isOpen: true,
        schoolName: res.school_name || school.name,
        adminEmail: res.email || school.contact,
        phone: res.phone || school.phone_number || "",
        resetUrl: res.reset_url || `${window.location.origin}/reset-password?token=${res.token}`,
      })
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to generate setup link")
    }
  }


  const handleBlockSubmit = async () => {
    if (!blockingSchool) return
    setBlockSubmitting(true)
    try {
      await api.patch(`/api/admin/schools/${blockingSchool.id}/block`, { is_blocked: !blockingSchool.is_blocked })
      setBlockingSchool(null)
      fetchSchools()
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to update institution access status")
    } finally {
      setBlockSubmitting(false)
    }
  }

  const filtered = schools.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.city.toLowerCase().includes(search.toLowerCase()) ||
      s.school_code.toLowerCase().includes(search.toLowerCase()) ||
      (s.phone_number && s.phone_number.toLowerCase().includes(search.toLowerCase())) ||
      (s.contact && s.contact.toLowerCase().includes(search.toLowerCase()))
  )

  const activeCount = schools.filter(s => !s.is_blocked).length
  const blockedCount = schools.filter(s => s.is_blocked).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">School Institutions</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage registered campuses, branch hierarchies, mandated contacts, and school credentials.</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={handleOpenProvision}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-xs cursor-pointer"
          >
            <Building2 className="mr-1.5 h-3.5 w-3.5" />
            <span>Provision School</span>
          </Button>

          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger render={<Button size="sm" variant="outline"><Plus className="mr-1.5 h-3.5 w-3.5" /> Invite School</Button>} />
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Invite New School</DialogTitle>
              <DialogDescription>
                Send an onboarding invitation to a new school administrator.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleInviteSubmit} className="space-y-4 py-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">School Name *</label>
                <Input required value={inviteData.school_name} onChange={e => setInviteData({...inviteData, school_name: e.target.value})} placeholder="e.g. Oakwood High School" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Admin Email *</label>
                <Input required type="email" value={inviteData.email} onChange={e => setInviteData({...inviteData, email: e.target.value})} placeholder="admin@school.com" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Contact Phone Number (Optional)</label>
                <Input value={inviteData.phone_number} onChange={e => setInviteData({...inviteData, phone_number: e.target.value})} placeholder="+91 98765 43210" />
                <p className="text-[11px] text-muted-foreground">Optional. If provided, will be pre-filled on the school onboarding page.</p>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Temporary Password (Optional)</label>
                  <button
                    type="button"
                    onClick={generateRandomPassword}
                    className="text-[11px] text-primary hover:underline font-medium cursor-pointer"
                  >
                    Generate Random
                  </button>
                </div>
                <Input
                  value={inviteData.temp_password}
                  onChange={e => setInviteData({...inviteData, temp_password: e.target.value})}
                  placeholder="Leave blank to let school set password, or enter / generate"
                  className="font-mono text-xs"
                />
                <p className="text-[11px] text-muted-foreground">If set, the administrator can also use this password to sign in immediately.</p>
              </div>
              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={inviteSubmitting}>
                  {inviteSubmitting ? "Generating..." : "Send Invitation"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Pending Inbound Applications Banner */}
      {pendingApplicationsCount > 0 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-300 shrink-0">
              <Building2 className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-semibold">
                {pendingApplicationsCount} School Onboarding {pendingApplicationsCount === 1 ? "Query" : "Queries"} Awaiting Review
              </p>
              <p className="text-[11px] text-amber-700/80 dark:text-amber-300/80">
                Inbound partnership applications from prospective campuses are waiting for 1-click provisioning.
              </p>
            </div>
          </div>
          <Link href="/internal-ops/admin/institution-applications">
            <Button size="sm" className="h-8 text-xs bg-amber-600 hover:bg-amber-500 text-white gap-1 shrink-0">
              Review & Provision Schools &rarr;
            </Button>
          </Link>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5 flex !flex-row items-center justify-between border-border/60 shadow-sm">
          <div className="space-y-1">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center">
              Total Schools
              <InfoTooltip content="Total recognized educational institutions registered across the platform." />
            </div>
            <div className="text-2xl font-bold tracking-tight mt-1">{schools.length}</div>
          </div>
          <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <SchoolIcon className="h-5 w-5" />
          </div>
        </Card>
        <Card className="p-5 flex !flex-row items-center justify-between border-border/60 shadow-sm">
          <div className="space-y-1">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center">
              Active Campuses
              <InfoTooltip content="Operational campuses currently authorized to conduct wellness check-ins." />
            </div>
            <div className="text-2xl font-bold tracking-tight mt-1 text-emerald-600 dark:text-emerald-400">{activeCount}</div>
          </div>
          <div className="h-11 w-11 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <ShieldCheck className="h-5 w-5" />
          </div>
        </Card>
        <Card className="p-5 flex !flex-row items-center justify-between border-border/60 shadow-sm">
          <div className="space-y-1">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center">
              Blocked / Suspended
              <InfoTooltip content="Institutions with administrative holds or pending onboarding verifications." />
            </div>
            <div className="text-2xl font-bold tracking-tight mt-1 text-rose-600 dark:text-rose-400">{blockedCount}</div>
          </div>
          <div className="h-11 w-11 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
            <ShieldBan className="h-5 w-5" />
          </div>
        </Card>
      </div>

      {/* Views Switcher: Registered Campuses vs Sent Invitations */}
      <div className="flex items-center gap-2 border-b border-border/60 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab("campuses")}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeTab === "campuses"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          }`}
        >
          <Building2 className="h-3.5 w-3.5" />
          <span>Active Campuses</span>
          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${activeTab === "campuses" ? "border-primary-foreground/30 text-primary-foreground" : ""}`}>
            {schools.length}
          </Badge>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("invites")}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeTab === "invites"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          }`}
        >
          <Mail className="h-3.5 w-3.5" />
          <span>Sent Invitations</span>
          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${activeTab === "invites" ? "border-primary-foreground/30 text-primary-foreground" : "bg-amber-500/10 text-amber-600 border-amber-500/30"}`}>
            {invites.filter(i => !i.accepted_at).length} Pending
          </Badge>
        </button>
      </div>

      {/* Table Card */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-3 border-b border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder={activeTab === "campuses" ? "Search by name, code, phone, or city..." : "Search invitations by school name or email..."}
              className="pl-9 h-9 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {activeTab === "invites" && (
            <Button size="sm" variant="outline" onClick={fetchInvites} disabled={loadingInvites} className="h-8 text-xs gap-1.5 cursor-pointer">
              <RefreshCw className={`h-3 w-3 ${loadingInvites ? "animate-spin" : ""}`} />
              <span>Refresh Invitations</span>
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {activeTab === "invites" ? (
            loadingInvites ? (
              <div className="p-12 text-center text-muted-foreground text-sm">Loading invitations...</div>
            ) : invites.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground space-y-2">
                <Mail className="h-8 w-8 mx-auto text-muted-foreground/40" />
                <p className="text-sm font-medium text-foreground">No School Invitations Dispatched Yet</p>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Click &quot;Invite School&quot; in the header above to dispatch a secure 7-day onboarding invitation.
                </p>
              </div>
            ) : (
              <>
                {/* Desktop / Tablet Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Institution Name</TableHead>
                        <TableHead>Admin Recipient</TableHead>
                        <TableHead>Dispatched On</TableHead>
                        <TableHead>Expiration Status</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Direct Onboarding Link</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invites
                        .filter(inv =>
                          !search ||
                          inv.school_name.toLowerCase().includes(search.toLowerCase()) ||
                          inv.email.toLowerCase().includes(search.toLowerCase())
                        )
                        .map((inv) => {
                          const isAccepted = Boolean(inv.accepted_at)
                          const isExpired = !isAccepted && new Date(inv.expires_at).getTime() <= Date.now()
                          const inviteUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/invite/${inv.token}`

                          return (
                            <TableRow key={inv.id} className="hover:bg-muted/40 transition-colors">
                              <TableCell className="font-semibold text-foreground">
                                <div className="flex items-center gap-2">
                                  <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                                  <span>{inv.school_name}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-muted-foreground font-mono text-xs">
                                {inv.email}
                              </TableCell>
                              <TableCell className="text-muted-foreground text-xs font-mono">
                                {inv.created_at ? new Date(inv.created_at).toLocaleDateString() : "—"}
                              </TableCell>
                              <TableCell className="text-xs">
                                {isAccepted ? (
                                  <span className="text-muted-foreground font-mono text-[11px]">
                                    Activated {new Date(inv.accepted_at!).toLocaleDateString()}
                                  </span>
                                ) : isExpired ? (
                                  <span className="text-rose-600 dark:text-rose-400 font-mono text-[11px]">
                                    Expired on {new Date(inv.expires_at).toLocaleDateString()}
                                  </span>
                                ) : (
                                  <span className="text-amber-600 dark:text-amber-400 font-mono text-[11px]">
                                    Valid until {new Date(inv.expires_at).toLocaleDateString()}
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>
                                {isAccepted ? (
                                  <Badge variant="outline" className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20">
                                    Accepted & Active
                                  </Badge>
                                ) : isExpired ? (
                                  <Badge variant="outline" className="text-[10px] font-mono text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20">
                                    Expired
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-[10px] font-mono text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20">
                                    Pending Activation
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1.5">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-xs gap-1.5 cursor-pointer font-mono"
                                    onClick={() => {
                                      navigator.clipboard.writeText(inviteUrl)
                                      setCopiedInviteId(inv.id)
                                      setTimeout(() => setCopiedInviteId(null), 2000)
                                    }}
                                  >
                                    {copiedInviteId === inv.id ? (
                                      <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                                    ) : (
                                      <Copy className="h-3 w-3 text-muted-foreground" />
                                    )}
                                    <span>{copiedInviteId === inv.id ? "Copied" : "Copy Link"}</span>
                                  </Button>
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                  {!isAccepted && (
                                    <>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 text-xs text-sky-600 hover:text-sky-700 hover:bg-sky-500/10 cursor-pointer"
                                        onClick={() => handleResendInvite(inv)}
                                        title="Renew & Re-dispatch Invitation"
                                      >
                                        <RefreshCw className="h-3 w-3 mr-1" />
                                        <span>Renew</span>
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-500/10 cursor-pointer"
                                        onClick={() => setRevokeTarget(inv)}
                                        title="Revoke and cancel invitation"
                                      >
                                        <Trash2 className="h-3 w-3 mr-1" />
                                        <span>Revoke</span>
                                      </Button>
                                    </>
                                  )}
                                  {isAccepted && (
                                    <span className="text-[11px] text-muted-foreground italic mr-2">
                                      Completed
                                    </span>
                                  )}
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
                  {invites
                    .filter(inv =>
                      !search ||
                      inv.school_name.toLowerCase().includes(search.toLowerCase()) ||
                      inv.email.toLowerCase().includes(search.toLowerCase())
                    )
                    .map((inv) => {
                      const isAccepted = Boolean(inv.accepted_at)
                      const isExpired = !isAccepted && new Date(inv.expires_at).getTime() <= Date.now()
                      const inviteUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/invite/${inv.token}`

                      return (
                        <div key={inv.id} className="p-4 space-y-3 hover:bg-muted/20 transition-colors">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-1.5 font-semibold text-sm text-foreground">
                                <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                                <span>{inv.school_name}</span>
                              </div>
                              <div className="text-xs text-muted-foreground font-mono mt-0.5">{inv.email}</div>
                            </div>
                            <div>
                              {isAccepted ? (
                                <Badge variant="outline" className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20">
                                  Accepted
                                </Badge>
                              ) : isExpired ? (
                                <Badge variant="outline" className="text-[10px] font-mono text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20">
                                  Expired
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-[10px] font-mono text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20">
                                  Pending
                                </Badge>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono bg-muted/30 p-2 rounded-lg border border-border/40">
                            <span>Sent: {inv.created_at ? new Date(inv.created_at).toLocaleDateString() : "—"}</span>
                            <span>
                              {isAccepted
                                ? `Active ${new Date(inv.accepted_at!).toLocaleDateString()}`
                                : isExpired
                                ? `Expired ${new Date(inv.expires_at).toLocaleDateString()}`
                                : `Expires ${new Date(inv.expires_at).toLocaleDateString()}`}
                            </span>
                          </div>

                          <div className="flex items-center justify-between pt-1 border-t border-border/30 gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs gap-1.5 cursor-pointer font-mono"
                              onClick={() => {
                                navigator.clipboard.writeText(inviteUrl)
                                setCopiedInviteId(inv.id)
                                setTimeout(() => setCopiedInviteId(null), 2000)
                              }}
                            >
                              {copiedInviteId === inv.id ? (
                                <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                              ) : (
                                <Copy className="h-3 w-3 text-muted-foreground" />
                              )}
                              <span>{copiedInviteId === inv.id ? "Copied" : "Copy Link"}</span>
                            </Button>

                            <div className="flex items-center gap-1">
                              {!isAccepted && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2 text-xs text-sky-600 hover:text-sky-700 hover:bg-sky-500/10 cursor-pointer"
                                    onClick={() => handleResendInvite(inv)}
                                    title="Renew Invitation"
                                  >
                                    <RefreshCw className="h-3 w-3 mr-1" />
                                    <span>Renew</span>
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-500/10 cursor-pointer"
                                    onClick={() => setRevokeTarget(inv)}
                                    title="Revoke Invitation"
                                  >
                                    <Trash2 className="h-3 w-3 mr-1" />
                                    <span>Revoke</span>
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                </div>
              </>
            )
          ) : (
            loading ? (
            <div className="p-12 text-center text-muted-foreground text-sm">Loading institutions...</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground text-sm">No institutions found.</div>
          ) : (
            <>
              {/* Desktop / Tablet Table View */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[120px]">Code / UUID</TableHead>
                      <TableHead>
                        Institution Name
                        <InfoTooltip content="Super-schools manage independent campus hierarchies. Branches are subordinate facilities." />
                      </TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>
                        Contact Details
                        <InfoTooltip content="Mandatory verified phone line and official email for institutional security." />
                      </TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((school) => {
                      const isBranch = !!school.parent_school_id
                      const branches = schools.filter(s => s.parent_school_id === school.id)
                      const parentSchool = isBranch ? schools.find(p => p.id === school.parent_school_id) : null

                      return (
                        <TableRow key={school.id} className={`hover:bg-muted/40 transition-colors ${isBranch ? "bg-muted/10" : ""}`}>
                          <TableCell className="font-mono text-xs font-medium">
                            <div className="space-y-1">
                              <span className="px-2 py-0.5 rounded bg-muted/70 text-foreground font-semibold inline-block">
                                {school.school_code}
                              </span>
                              <div>
                                <MinimalUUID uuid={school.id} length={4} />
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-sm text-foreground">{school.name}</span>
                              {isBranch ? (
                                <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-normal text-muted-foreground bg-muted/40 flex items-center gap-1">
                                  <GitBranch className="h-3 w-3 text-muted-foreground" />
                                  Branch of {parentSchool?.name || "Parent"}
                                </Badge>
                              ) : (
                                branches.length > 0 && (
                                  <Badge variant="secondary" className="text-[10px] py-0 px-1.5 font-normal bg-primary/10 text-primary border-primary/20">
                                    {branches.length} {branches.length === 1 ? "Branch" : "Branches"}
                                  </Badge>
                                )
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-xs">
                            <div className="flex items-center gap-1.5">
                              <MapPin className="h-3 w-3 text-muted-foreground/70" />
                              <span>{school.city || "Not specified"}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-xs">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5 text-foreground font-medium">
                                <Phone className="h-3 w-3 text-primary/80" />
                                <span>{school.phone_number || "No phone added"}</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
                                <Mail className="h-3 w-3 text-muted-foreground/60" />
                                <span>{school.contact || "N/A"}</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {school.is_blocked ? (
                              <Badge variant="destructive" className="text-[11px] font-normal">
                                Blocked
                              </Badge>
                            ) : (
                              <Badge variant="default" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 text-[11px] font-normal">
                                Active
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right space-x-1">
                            {/* Add Branch Button for Non-Branch Schools */}
                            {!isBranch && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-muted-foreground hover:text-primary"
                                onClick={() => openAddBranchModal(school)}
                                title="Add Branch School"
                              >
                                <Building2 className="h-3.5 w-3.5" />
                              </Button>
                            )}

                            {/* Visit School Portal as Superadmin */}
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-primary hover:bg-primary/10"
                              onClick={() => handleImpersonate(school)}
                              disabled={impersonatingId === school.id}
                              title="Visit School Portal as Superadmin (Ghost Access)"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Button>

                            {/* Send Setup / Password Reset Link */}
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-muted-foreground hover:text-amber-500"
                              onClick={() => handleSendResetLink(school)}
                              title="Send Setup / Password Reset Link"
                            >
                              <Key className="h-3.5 w-3.5" />
                            </Button>

                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              onClick={() => router.push(`/internal-ops/admin/analytics?school_id=${school.id}`)}
                              title="View Analytics"
                            >
                              <BarChart2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-muted-foreground hover:text-primary"
                              onClick={() => openAuditModal(school)}
                              title="View Institution Audit Trail & Events"
                            >
                              <History className="h-3.5 w-3.5" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              onClick={() => openEditModal(school)}
                              title="Edit School Details"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8"
                              onClick={() => setBlockingSchool(school)}
                              title={school.is_blocked ? "Unblock School Access" : "Block School Access"}
                            >
                              {school.is_blocked ? (
                                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 hover:text-emerald-600" />
                              ) : (
                                <ShieldBan className="h-3.5 w-3.5 text-rose-500 hover:text-rose-600" />
                              )}
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-muted-foreground hover:text-rose-600"
                              onClick={() => setDeletingSchool(school)}
                              title="Delete School"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden divide-y divide-border/60">
                {filtered.map((school) => {
                  const isBranch = !!school.parent_school_id
                  const branches = schools.filter(s => s.parent_school_id === school.id)
                  const parentSchool = isBranch ? schools.find(p => p.id === school.parent_school_id) : null

                  return (
                    <div key={school.id} className={`p-4 space-y-3 transition-colors ${isBranch ? "bg-muted/10" : "hover:bg-muted/20"}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm text-foreground">{school.name}</span>
                            {isBranch ? (
                              <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-normal text-muted-foreground bg-muted/40 flex items-center gap-1">
                                <GitBranch className="h-3 w-3 text-muted-foreground" />
                                Branch of {parentSchool?.name || "Parent"}
                              </Badge>
                            ) : (
                              branches.length > 0 && (
                                <Badge variant="secondary" className="text-[10px] py-0 px-1.5 font-normal bg-primary/10 text-primary border-primary/20">
                                  {branches.length} {branches.length === 1 ? "Branch" : "Branches"}
                                </Badge>
                              )
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="px-1.5 py-0.5 rounded bg-muted/70 text-foreground font-mono font-semibold text-[11px]">
                              {school.school_code}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              UUID: {school.id.slice(0, 8)}...
                            </span>
                          </div>
                        </div>
                        <div>
                          {school.is_blocked ? (
                            <Badge variant="destructive" className="text-[10px] font-normal">
                              Blocked
                            </Badge>
                          ) : (
                            <Badge variant="default" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-normal">
                              Active
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs py-2 px-2.5 rounded-lg bg-muted/30 border border-border/40">
                        <div>
                          <span className="text-[10px] text-muted-foreground uppercase font-medium block">Location</span>
                          <div className="flex items-center gap-1 text-foreground font-medium mt-0.5 truncate">
                            <MapPin className="h-3 w-3 text-muted-foreground/70 shrink-0" />
                            <span className="truncate">{school.city || "Not specified"}</span>
                          </div>
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-foreground uppercase font-medium block">Contact</span>
                          <div className="flex items-center gap-1 text-foreground font-medium mt-0.5 truncate">
                            <Phone className="h-3 w-3 text-primary/80 shrink-0" />
                            <span className="truncate">{school.phone_number || "No phone added"}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-border/30 gap-1 flex-wrap">
                        <div className="flex items-center gap-1 flex-wrap">
                          {!isBranch && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-7 px-2 text-xs gap-1 cursor-pointer"
                              onClick={() => openAddBranchModal(school)}
                              title="Add Branch School"
                            >
                              <Building2 className="h-3 w-3" />
                              <span>Branch</span>
                            </Button>
                          )}
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-7 px-2 text-xs gap-1 text-primary hover:bg-primary/10 cursor-pointer"
                            onClick={() => handleImpersonate(school)}
                            disabled={impersonatingId === school.id}
                            title="Visit School Portal"
                          >
                            <ExternalLink className="h-3 w-3" />
                            <span>Ghost</span>
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-7 px-2 text-xs gap-1 text-muted-foreground cursor-pointer"
                            onClick={() => handleSendResetLink(school)}
                            title="Send Setup Link"
                          >
                            <Key className="h-3 w-3" />
                            <span>Reset</span>
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-7 px-2 text-xs gap-1 text-muted-foreground cursor-pointer"
                            onClick={() => router.push(`/internal-ops/admin/analytics?school_id=${school.id}`)}
                            title="View Analytics"
                          >
                            <BarChart2 className="h-3 w-3" />
                            <span>Stats</span>
                          </Button>
                        </div>

                        <div className="flex items-center gap-0.5 ml-auto">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-7 w-7 p-0 cursor-pointer text-muted-foreground hover:text-foreground"
                            onClick={() => openEditModal(school)}
                            title="Edit School"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-7 w-7 p-0 cursor-pointer"
                            onClick={() => setBlockingSchool(school)}
                            title={school.is_blocked ? "Unblock School" : "Block School"}
                          >
                            {school.is_blocked ? (
                              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 hover:text-emerald-600" />
                            ) : (
                              <ShieldBan className="h-3.5 w-3.5 text-rose-500 hover:text-rose-600" />
                            )}
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-7 w-7 p-0 cursor-pointer text-muted-foreground hover:text-rose-600"
                            onClick={() => setDeletingSchool(school)}
                            title="Delete School"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          ) )}
        </CardContent>
      </Card>

      {/* Edit School Modal */}
      <Dialog open={!!editingSchool} onOpenChange={(open) => !open && setEditingSchool(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingSchool?.id ? "Edit Institution" : "Add Branch Campus"}</DialogTitle>
            <DialogDescription>
              Update school details, mandated contact phone, and network hierarchy.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">School Name *</label>
                <Input 
                  required 
                  value={editForm.name} 
                  onChange={e => setEditForm({...editForm, name: e.target.value})} 
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">School Code *</label>
                <Input 
                  required 
                  value={editForm.school_code} 
                  onChange={e => setEditForm({...editForm, school_code: e.target.value.toUpperCase()})} 
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Contact Phone *</label>
                <Input 
                  required
                  value={editForm.phone_number} 
                  onChange={e => setEditForm({...editForm, phone_number: e.target.value})} 
                  placeholder="+91 98765 43210"
                />
                <p className="text-[10px] text-muted-foreground">Mandatory telephone number.</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Contact Email</label>
                <Input 
                  value={editForm.contact} 
                  onChange={e => setEditForm({...editForm, contact: e.target.value})} 
                  placeholder="admin@school.edu"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">City / Region</label>
              <Input 
                value={editForm.city} 
                onChange={e => setEditForm({...editForm, city: e.target.value})} 
                placeholder="e.g. Bangalore, KA"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Parent Institution (Super School)</label>
              <select
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                value={editForm.parent_school_id}
                onChange={e => setEditForm({...editForm, parent_school_id: e.target.value})}
              >
                <option value="">None (Independent / Super School)</option>
                {schools
                  .filter(s => editingSchool && s.id !== editingSchool.id && !s.parent_school_id)
                  .map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.school_code})</option>
                  ))
                }
              </select>
              <p className="text-[11px] text-muted-foreground">Assigning a parent institution links this campus as a subordinate branch.</p>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setEditingSchool(null)}>Cancel</Button>
              <Button type="submit" disabled={editSubmitting}>
                {editSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Send Setup / Password Reset Link Modal */}
      <Dialog open={!!resetLinkModal} onOpenChange={(open) => !open && setResetLinkModal(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-4 w-4 text-amber-500" />
              Account Setup & Password Reset Link
            </DialogTitle>
            <DialogDescription>
              A secure identity-verified reset link for <strong>{resetLinkModal?.schoolName}</strong>.
            </DialogDescription>
          </DialogHeader>

          {resetLinkModal && (
            <div className="space-y-4 py-2 text-xs">
              <div className="rounded-lg bg-muted/50 p-3.5 border border-border/80 space-y-2.5">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Recipient Admin Email:</span>
                  <span className="font-medium text-foreground">{resetLinkModal.adminEmail}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Registered Mobile Phone:</span>
                  <span className="font-medium text-foreground">{resetLinkModal.phone || "Not recorded"}</span>
                </div>
                <div className="flex justify-between items-center text-[11px] text-emerald-600 dark:text-emerald-400">
                  <span>Plain Password Exposure:</span>
                  <span className="font-semibold">None (Encrypted Token)</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-medium text-foreground">Secure Reset URL:</label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={resetLinkModal?.resetUrl ?? ""}
                    className="h-8 text-xs font-mono bg-background"
                  />
                  <Button
                    size="sm"
                    className="h-8 text-xs shrink-0"
                    onClick={() => {
                      navigator.clipboard.writeText(resetLinkModal.resetUrl)
                      setCopiedResetUrl(true)
                      setTimeout(() => setCopiedResetUrl(false), 2000)
                    }}
                  >
                    {copiedResetUrl ? <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
                    {copiedResetUrl ? "Copied" : "Copy Link"}
                  </Button>
                </div>
              </div>

              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-[11px] text-amber-700 dark:text-amber-300 leading-relaxed">
                <strong>Identity Verification Mandate:</strong> When the school administrator visits this link, they will be required to verify both their registered email address and mobile number before setting their new password.
              </div>
            </div>
          )}

          <DialogFooter>
            <Button className="w-full h-8 text-xs" onClick={() => setResetLinkModal(null)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete School Confirmation Dialog */}
      <Dialog open={!!deletingSchool} onOpenChange={(open) => !open && setDeletingSchool(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" /> Delete School Institution
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong className="text-foreground">{deletingSchool?.name}</strong>?
            </DialogDescription>
          </DialogHeader>
          <div className="text-xs text-muted-foreground space-y-2 py-1">
            <p>This action will permanently delete this institution and its student records from the live database.</p>
          </div>
          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setDeletingSchool(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteSubmit} disabled={deleteSubmitting}>
              {deleteSubmitting ? "Deleting..." : "Delete Permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Block/Unblock School Confirmation Dialog */}
      <Dialog open={!!blockingSchool} onOpenChange={(open) => !open && setBlockingSchool(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className={`flex items-center gap-2 ${blockingSchool?.is_blocked ? 'text-emerald-500' : 'text-amber-500'}`}>
              {blockingSchool?.is_blocked ? (
                <><ShieldCheck className="h-5 w-5" /> Unblock School Institution</>
              ) : (
                <><ShieldBan className="h-5 w-5" /> Block School Institution Access</>
              )}
            </DialogTitle>
            <DialogDescription>
              {blockingSchool?.is_blocked ? (
                <>Are you sure you want to restore portal access for <strong className="text-foreground">{blockingSchool?.name}</strong>?</>
              ) : (
                <>Are you sure you want to suspend portal access for <strong className="text-foreground">{blockingSchool?.name}</strong>?</>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="text-xs text-muted-foreground space-y-2 py-1">
            {blockingSchool?.is_blocked ? (
              <p>Unblocking will immediately restore access for enrolled students, class teachers, and administrators belonging to this institution.</p>
            ) : (
              <p>Blocking this school will immediately prevent all associated students, class teachers, and school administrators from signing in or submitting check-ins.</p>
            )}
          </div>
          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setBlockingSchool(null)}>Cancel</Button>
            <Button 
              variant={blockingSchool?.is_blocked ? "default" : "destructive"} 
              onClick={handleBlockSubmit} 
              disabled={blockSubmitting}
            >
              {blockSubmitting 
                ? (blockingSchool?.is_blocked ? "Restoring..." : "Suspending...") 
                : (blockingSchool?.is_blocked ? "Restore Access" : "Block Institution")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* School Audit Trail & Events Dialog */}
      <Dialog open={!!auditSchool} onOpenChange={(open) => !open && setAuditSchool(null)}>
        <DialogContent className="w-[95vw] sm:max-w-3xl lg:max-w-4xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader className="pb-2 border-b border-border/40">
            <DialogTitle className="flex items-center gap-2 text-base">
              <History className="h-5 w-5 text-primary" />
              Institutional Audit Trail & Governance Log
            </DialogTitle>
            <DialogDescription className="text-xs">
              Audit records for <strong className="text-foreground">{auditSchool?.name}</strong> ({auditSchool?.school_code}).
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            <EventsAuditCard
              events={schoolEvents}
              loading={schoolEventsLoading}
              onRefresh={() => auditSchool && openAuditModal(auditSchool)}
              isAdminView={false}
              title={`${auditSchool?.name || "Institution"} Events`}
              description="Live audit records of roster promotions, instrument assignments, staff security updates, and counselor escalations."
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Dedicated Add Satellite Branch Campus Dialog */}
      <CreateBranchDialog
        isOpen={!!branchParentSchool}
        onClose={() => setBranchParentSchool(null)}
        parentSchool={
          branchParentSchool
            ? {
                id: branchParentSchool.id,
                name: branchParentSchool.name,
                school_code: branchParentSchool.school_code,
                city: branchParentSchool.city,
              }
            : null
        }
        onSuccess={() => fetchSchools()}
        isAdminMode={true}
      />

      {/* Native School Invitation Dispatched Dialog */}
      <Dialog open={!!inviteSuccessModal} onOpenChange={(open) => !open && setInviteSuccessModal(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <Mail className="h-4 w-4 text-sky-500" />
              School Onboarding Invitation Dispatched
            </DialogTitle>
            <DialogDescription>
              A secure onboarding token has been generated for <strong>{inviteSuccessModal?.school_name}</strong>.
            </DialogDescription>
          </DialogHeader>

          {inviteSuccessModal && (
            <div className="space-y-4 py-2 text-xs">
              <div className="rounded-lg bg-muted/50 p-3.5 border border-border/80 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-mono">Institution Name:</span>
                  <span className="font-semibold text-foreground">{inviteSuccessModal.school_name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-mono">Admin Recipient:</span>
                  <span className="font-mono text-foreground font-medium">{inviteSuccessModal.email}</span>
                </div>
                {inviteSuccessModal.temp_password && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground font-mono">Temporary Password:</span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      {inviteSuccessModal.temp_password}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-mono">Full Login Route:</span>
                  <span className="font-mono text-sky-600 dark:text-sky-400">
                    {typeof window !== "undefined" ? `${window.location.origin}/login` : "/login"}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[11px] text-emerald-600 dark:text-emerald-400">
                  <span>Validity Window:</span>
                  <span className="font-semibold">7 Days Active</span>
                </div>
              </div>

              {inviteSuccessModal.temp_password && (
                <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-xs text-amber-800 dark:text-amber-300 space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                    One-Time Password Display Warning
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    This temporary password will <strong>not</strong> be displayed again. Please copy and securely share it with the school administrator now.
                  </p>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="font-medium text-foreground">Direct Onboarding Link:</label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={inviteSuccessModal.invite_link}
                    className="h-8 text-xs font-mono bg-background"
                  />
                  <Button
                    size="sm"
                    className="h-8 text-xs shrink-0 cursor-pointer"
                    onClick={() => {
                      const text = `School Onboarding Invitation:\nInstitution: ${inviteSuccessModal.school_name}\nAdmin Email: ${inviteSuccessModal.email}${inviteSuccessModal.temp_password ? `\nTemporary Password: ${inviteSuccessModal.temp_password}` : ""}\nLogin URL: ${window.location.origin}/login\nOnboarding Link: ${inviteSuccessModal.invite_link}`
                      navigator.clipboard.writeText(text)
                      setInviteCopied(true)
                      setTimeout(() => setInviteCopied(false), 2000)
                    }}
                  >
                    {inviteCopied ? <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
                    {inviteCopied ? "Copied All" : "Copy Credentials"}
                  </Button>
                </div>
              </div>

              <div className="rounded-lg border border-sky-500/30 bg-sky-500/10 p-3 text-[11px] text-sky-700 dark:text-sky-300 leading-relaxed">
                The school administrator can follow this secure link to set up their custom password, or log in directly if you provisioned a temporary password.
              </div>
            </div>
          )}

          <DialogFooter>
            <Button className="w-full h-8 text-xs cursor-pointer" onClick={() => setInviteSuccessModal(null)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke Invitation Confirmation Dialog */}
      <Dialog open={!!revokeTarget} onOpenChange={(open) => !open && setRevokeTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              Revoke School Invitation
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to revoke the onboarding invitation for <strong>{revokeTarget?.school_name}</strong> ({revokeTarget?.email})?
            </DialogDescription>
          </DialogHeader>
          <div className="text-xs text-muted-foreground py-2">
            This will immediately invalidate the onboarding token and prevent the recipient from completing registration with this link.
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setRevokeTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={revoking}
              onClick={handleConfirmRevoke}
            >
              {revoking ? "Revoking..." : "Yes, Revoke Invitation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* PROVISION SCHOOL DIRECTLY DIALOG                                          */}
      {/* ========================================================================= */}
      <Dialog open={isProvisionOpen} onOpenChange={setIsProvisionOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Building2 className="h-4 w-4 text-primary" />
              <span>Provision School Institution</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Instantly create a campus profile and school administrator account for trial setups or concierge onboarding.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleProvisionSubmit} className="space-y-4 py-1 text-xs">
            {/* Section 1: Institution Details */}
            <div className="space-y-2.5 p-3 rounded-xl bg-muted/40 border border-border/70">
              <div className="flex items-center gap-1.5 font-semibold text-foreground text-xs">
                <SchoolIcon className="h-3.5 w-3.5 text-primary" />
                <span>Institution Profile</span>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-foreground">
                  School Name <span className="text-destructive">*</span>
                </label>
                <Input
                  required
                  value={provisionForm.name}
                  onChange={(e) => handleProvisionSchoolNameChange(e.target.value)}
                  onBlur={handleProvisionNameOrCityBlur}
                  placeholder="e.g. Delhi Public School, Vasant Kunj"
                  className="h-8 text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-foreground">
                    State / Region <span className="text-destructive">*</span>
                  </label>
                  <select
                    required
                    value={provisionForm.state}
                    onChange={(e) => setProvisionForm({ ...provisionForm, state: e.target.value })}
                    className="flex h-8 w-full rounded-md border border-input bg-background px-2.5 py-1 text-xs shadow-2xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-medium"
                  >
                    <option value="" disabled>Select State / Region</option>
                    {INDIAN_STATES_AND_UTS.map((st) => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-foreground">
                    City <span className="text-destructive">*</span>
                  </label>
                  <Input
                    required
                    value={provisionForm.city}
                    onChange={(e) => handleProvisionCityChange(e.target.value)}
                    onBlur={handleProvisionNameOrCityBlur}
                    placeholder="e.g. New Delhi"
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-foreground flex items-center justify-between">
                  <span>School Code (Unique Portal Identifier)</span>
                  <span className="text-[10px] text-muted-foreground font-mono">Used for student logins</span>
                </label>
                <Input
                  value={provisionForm.school_code}
                  onChange={(e) => setProvisionForm({ ...provisionForm, school_code: e.target.value.toUpperCase() })}
                  placeholder="e.g. DPSVK"
                  className="h-8 text-xs font-mono uppercase"
                />
              </div>
            </div>

            {/* Section 2: Administrator Profile */}
            <div className="space-y-2.5 p-3 rounded-xl bg-muted/40 border border-border/70">
              <div className="flex items-center gap-1.5 font-semibold text-foreground text-xs">
                <Key className="h-3.5 w-3.5 text-primary" />
                <span>School Administrator Credentials</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-foreground">
                    Admin Contact Name <span className="text-destructive">*</span>
                  </label>
                  <Input
                    required
                    value={provisionForm.admin_name}
                    onChange={(e) => setProvisionForm({ ...provisionForm, admin_name: e.target.value })}
                    placeholder="e.g. Dr. Sunita Sharma"
                    className="h-8 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-foreground">
                    Designation / Title
                  </label>
                  <select
                    value={provisionForm.designation}
                    onChange={(e) => setProvisionForm({ ...provisionForm, designation: e.target.value })}
                    className="flex h-8 w-full rounded-md border border-input bg-background px-2.5 py-1 text-xs shadow-2xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-medium"
                  >
                    {SCHOOL_DESIGNATIONS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-foreground">
                    Admin Email Address <span className="text-destructive">*</span>
                  </label>
                  <Input
                    required
                    type="email"
                    value={provisionForm.admin_email}
                    onChange={(e) => setProvisionForm({ ...provisionForm, admin_email: e.target.value })}
                    placeholder="principal@school.edu"
                    className="h-8 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-foreground">
                    Contact Phone Number
                  </label>
                  <Input
                    value={provisionForm.phone_number}
                    onChange={(e) => setProvisionForm({ ...provisionForm, phone_number: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-foreground flex items-center justify-between">
                  <span>Initial Admin Password <span className="text-destructive">*</span></span>
                  <button
                    type="button"
                    onClick={generateProvisionPassword}
                    className="text-[10px] text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 font-mono cursor-pointer"
                  >
                    <RefreshCw className="h-2.5 w-2.5" />
                    <span>Generate New</span>
                  </button>
                </label>
                <Input
                  required
                  value={provisionForm.password}
                  onChange={(e) => setProvisionForm({ ...provisionForm, password: e.target.value })}
                  placeholder="Initial Password"
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>

            {/* Section 3: Notification Delivery Option (Default: false) */}
            <div className="p-3 rounded-xl border border-sky-500/20 bg-sky-500/5 space-y-2">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={provisionForm.send_email}
                  onChange={(e) => setProvisionForm({ ...provisionForm, send_email: e.target.checked })}
                  className="h-4 w-4 mt-0.5 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <div className="space-y-0.5">
                  <span className="font-semibold text-xs text-foreground block">
                    Send Welcome & Login Email to School Administrator
                  </span>
                  <span className="text-[11px] text-muted-foreground block leading-relaxed">
                    Default is off. Leave unchecked to provision the school silently so you can set up classes, tests, or counselors before notifying the school.
                  </span>
                </div>
              </label>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsProvisionOpen(false)}
                disabled={provisionSubmitting}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={provisionSubmitting || !provisionForm.name || !provisionForm.admin_email}
                className="text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
              >
                {provisionSubmitting ? (
                  <>
                    <RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    <span>Provisioning Institution...</span>
                  </>
                ) : (
                  <>
                    <Building2 className="mr-1.5 h-3.5 w-3.5" />
                    <span>Provision School</span>
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* PROVISION SUCCESS MODAL                                                   */}
      {/* ========================================================================= */}
      <Dialog open={!!provisionSuccessModal} onOpenChange={(open) => !open && setProvisionSuccessModal(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span>Institution Provisioned Successfully</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              The school profile and administrator account are active and ready for configuration.
            </DialogDescription>
          </DialogHeader>

          {provisionSuccessModal && (
            <div className="space-y-4 py-1 text-xs">
              <div className="p-3.5 bg-muted/40 border border-border/70 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground font-mono">School:</span>
                  <span className="font-semibold text-foreground">{provisionSuccessModal.school_name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground font-mono">School Code:</span>
                  <span className="font-mono text-primary font-bold bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                    {provisionSuccessModal.school_code}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground font-mono">Administrator:</span>
                  <span className="font-medium text-foreground">{provisionSuccessModal.admin_name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground font-mono">Login Email:</span>
                  <span className="font-mono text-foreground">{provisionSuccessModal.admin_email}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground font-mono">Temporary Password:</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    {provisionSuccessModal.temp_password}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground font-mono">Email Status:</span>
                  <span className="text-[11px] font-medium">
                    {provisionSuccessModal.email_sent ? (
                      <span className="text-emerald-600 dark:text-emerald-400">Welcome email dispatched</span>
                    ) : (
                      <span className="text-amber-600 dark:text-amber-400">Silent setup (No email sent)</span>
                    )}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-xs text-amber-800 dark:text-amber-300 space-y-1">
                <div className="flex items-center gap-1.5 font-semibold">
                  <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  Administrator Credentials
                </div>
                <p className="text-[11px] leading-relaxed">
                  Please copy and securely record these credentials now. You can also impersonate this school immediately to configure branches, assign counselors, or import students.
                </p>
              </div>

              <DialogFooter className="gap-2 sm:gap-0 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={copyProvisionCredentials}
                  className="text-xs gap-1.5"
                >
                  {provisionCopied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>Copy Credentials</span>
                    </>
                  )}
                </Button>

                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    const schoolObj = schools.find((s) => s.id === provisionSuccessModal.school_id) || {
                      id: provisionSuccessModal.school_id,
                      name: provisionSuccessModal.school_name,
                      school_code: provisionSuccessModal.school_code,
                      city: "",
                      contact: provisionSuccessModal.admin_email,
                      is_active: true,
                      is_blocked: false,
                      created_at: new Date().toISOString(),
                    }
                    setProvisionSuccessModal(null)
                    handleImpersonate(schoolObj)
                  }}
                  className="text-xs gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Enter School Portal</span>
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Action Error / Notice Dialog */}
      <Dialog open={!!errorMessage} onOpenChange={(open) => !open && setErrorMessage(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <AlertCircle className="h-4 w-4" />
              Action Notice
            </DialogTitle>
            <DialogDescription className="text-xs pt-1">
              {errorMessage}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setErrorMessage(null)} className="h-8 text-xs cursor-pointer">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

