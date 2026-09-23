"use client"

import { useState, useEffect } from "react"
import { 
  Building2, CheckCircle2, XCircle, Clock, Search, Copy, Check, 
  Users, Mail, Phone, MapPin, Calendar, Eye, Key, AlertCircle, RefreshCw 
} from "lucide-react"
import { api } from "@/lib/api"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"

export interface InstitutionApplication {
  id: string
  institute_name: string
  institute_type: string
  city: string
  state: string
  contact_name: string
  designation?: string
  email: string
  phone: string
  estimated_students: number
  message?: string
  status: "pending" | "approved" | "rejected"
  created_at: string
}

interface InstitutionRequestsTabProps {
  onSchoolProvisioned?: () => void
  onPendingCountChange?: (count: number) => void
}

export function InstitutionRequestsTab({
  onSchoolProvisioned,
  onPendingCountChange,
}: InstitutionRequestsTabProps) {
  const [applications, setApplications] = useState<InstitutionApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)

  // Success dialog state after approving an institution
  const [approvedModal, setApprovedModal] = useState<{
    isOpen: boolean
    instituteName: string
    schoolCode?: string
    adminEmail?: string
    adminPhone?: string
    resetUrl: string
  } | null>(null)
  const [copiedLink, setCopiedLink] = useState(false)

  // Full detail modal state
  const [selectedAppForView, setSelectedAppForView] = useState<InstitutionApplication | null>(null)

  useEffect(() => {
    fetchApplications()
  }, [])

  const fetchApplications = async () => {
    try {
      setLoading(true)
      const data = await api.get("/api/admin/institution-applications")
      const list: InstitutionApplication[] = data || []
      setApplications(list)
      const pCount = list.filter((a) => a.status === "pending").length
      onPendingCountChange?.(pCount)
    } catch (err) {
      console.error("Failed to load applications", err)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (app: InstitutionApplication) => {
    setActionLoadingId(app.id)
    setActionError(null)
    setActionSuccess(null)
    try {
      const res = await api.post(`/api/admin/institution-applications/${app.id}/approve`, {})
      setApprovedModal({
        isOpen: true,
        instituteName: app.institute_name,
        schoolCode: res.school?.school_code,
        adminEmail: res.admin_email || app.email,
        adminPhone: res.admin_phone || app.phone,
        resetUrl: res.reset_url || `${window.location.origin}/reset-password`,
      })
      setActionSuccess(`Institution "${app.institute_name}" provisioned successfully!`)
      fetchApplications()
      onSchoolProvisioned?.()
    } catch (err: any) {
      setActionError(err.message || "Failed to approve application")
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleReject = async (app: InstitutionApplication) => {
    setActionLoadingId(app.id)
    setActionError(null)
    setActionSuccess(null)
    try {
      await api.post(`/api/admin/institution-applications/${app.id}/reject`, {})
      setActionSuccess(`Application for "${app.institute_name}" has been declined.`)
      fetchApplications()
    } catch (err: any) {
      setActionError(err.message || "Failed to decline application")
    } finally {
      setActionLoadingId(null)
    }
  }

  const copyResetUrl = () => {
    if (approvedModal) {
      navigator.clipboard.writeText(approvedModal.resetUrl)
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
    }
  }

  const filtered = applications.filter((app) => {
    const matchesSearch =
      app.institute_name.toLowerCase().includes(search.toLowerCase()) ||
      app.city.toLowerCase().includes(search.toLowerCase()) ||
      app.contact_name.toLowerCase().includes(search.toLowerCase()) ||
      app.email.toLowerCase().includes(search.toLowerCase()) ||
      app.phone.includes(search)

    const matchesStatus = statusFilter === "all" || app.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const pendingCount = applications.filter((a) => a.status === "pending").length
  const approvedCount = applications.filter((a) => a.status === "approved").length

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Total Inbound Requests</p>
              <h3 className="text-2xl font-bold text-foreground mt-1">{applications.length}</h3>
            </div>
            <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Building2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-500/20 bg-amber-500/5 backdrop-blur-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-amber-500 font-medium">Pending Review</p>
              <h3 className="text-2xl font-bold text-foreground mt-1">{pendingCount}</h3>
            </div>
            <div className="h-10 w-10 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Clock className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-500/20 bg-emerald-500/5 backdrop-blur-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-emerald-500 font-medium">Provisioned Institutions</p>
              <h3 className="text-2xl font-bold text-foreground mt-1">{approvedCount}</h3>
            </div>
            <div className="h-10 w-10 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search by institution, city, contact, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5 bg-muted/40 p-1 rounded-lg border border-border/40">
            {["all", "pending", "approved", "rejected"].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 text-xs rounded-md font-medium capitalize transition-all cursor-pointer ${
                  statusFilter === st
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {st}
              </button>
            ))}
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={fetchApplications}
            disabled={loading}
            className="h-8 text-xs gap-1.5 cursor-pointer shrink-0"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {actionError && (
        <div className="flex items-center gap-2 p-3 text-xs bg-destructive/10 text-destructive border border-destructive/20 rounded-lg">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}
      {actionSuccess && (
        <div className="flex items-center gap-2 p-3 text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-lg">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Applications Table Card */}
      <Card className="border-border/60 shadow-sm">
        <CardContent className="p-0">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Institution</TableHead>
                  <TableHead className="text-xs">Location</TableHead>
                  <TableHead className="text-xs">Contact Person</TableHead>
                  <TableHead className="text-xs">Contact Details</TableHead>
                  <TableHead className="text-xs">Est. Students</TableHead>
                  <TableHead className="text-xs">Submitted</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center text-xs text-muted-foreground">
                      Loading applications...
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center text-xs text-muted-foreground">
                      No institution onboarding requests found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((app) => (
                    <TableRow key={app.id}>
                      <TableCell>
                        <div className="font-semibold text-xs text-foreground">{app.institute_name}</div>
                        <Badge variant="secondary" className="text-[10px] mt-0.5 capitalize">
                          {app.institute_type?.replace(/_/g, " ") || "School"}
                        </Badge>
                        {app.message && (
                          <button
                            type="button"
                            onClick={() => setSelectedAppForView(app)}
                            className="text-[10px] text-muted-foreground hover:text-primary mt-1 max-w-xs block text-left truncate underline underline-offset-2 cursor-pointer"
                            title="Click to view full message"
                          >
                            &quot;{app.message}&quot;
                          </button>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3 shrink-0" />
                          {app.city}, {app.state}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs font-medium text-foreground">{app.contact_name}</div>
                        <div className="text-[10px] text-muted-foreground">{app.designation || "Administrator"}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Mail className="h-3 w-3 shrink-0" />
                          <span className="truncate max-w-[140px]">{app.email}</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                          <Phone className="h-3 w-3 shrink-0" />
                          <span>{app.phone}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-xs font-medium text-foreground">
                          <Users className="h-3 w-3 text-muted-foreground" />
                          {app.estimated_students || 500}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs text-foreground font-medium flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          {app.created_at ? new Date(app.created_at).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                        </div>
                        <div className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Clock className="h-2.5 w-2.5" />
                          {app.created_at ? new Date(app.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : ""}
                        </div>
                      </TableCell>
                      <TableCell>
                        {app.status === "pending" && (
                          <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-500 border-amber-500/30">
                            Pending
                          </Badge>
                        )}
                        {app.status === "approved" && (
                          <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-500 border-emerald-500/30">
                            Approved
                          </Badge>
                        )}
                        {app.status === "rejected" && (
                          <Badge variant="outline" className="text-[10px] bg-rose-500/10 text-rose-500 border-rose-500/30">
                            Declined
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedAppForView(app)}
                            className="h-8 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                            title="View Full Application"
                          >
                            <Eye className="h-3.5 w-3.5 mr-1" /> View
                          </Button>
                          {app.status === "pending" && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleApprove(app)}
                                disabled={actionLoadingId === app.id}
                                className="h-8 text-xs bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                                {actionLoadingId === app.id ? "Provisioning..." : "Approve & Provision"}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleReject(app)}
                                disabled={actionLoadingId === app.id}
                                className="h-8 text-xs text-muted-foreground hover:text-destructive cursor-pointer"
                              >
                                <XCircle className="h-3.5 w-3.5 mr-1" /> Decline
                              </Button>
                            </>
                          )}
                          {app.status === "approved" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleApprove(app)}
                              disabled={actionLoadingId === app.id}
                              className="h-8 text-xs text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 cursor-pointer"
                              title="View School Code & Setup Reset Link"
                            >
                              <Key className="h-3.5 w-3.5 mr-1" />
                              {actionLoadingId === app.id ? "Loading..." : "Setup Details"}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden divide-y divide-border/60">
            {loading ? (
              <div className="h-24 flex items-center justify-center text-xs text-muted-foreground">
                Loading applications...
              </div>
            ) : filtered.length === 0 ? (
              <div className="h-24 flex items-center justify-center text-xs text-muted-foreground">
                No institution onboarding requests found.
              </div>
            ) : (
              filtered.map((app) => (
                <div key={app.id} className="p-4 space-y-3 hover:bg-muted/20 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold text-sm text-foreground">{app.institute_name}</div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Badge variant="secondary" className="text-[10px] capitalize">
                          {app.institute_type?.replace(/_/g, " ") || "School"}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3 shrink-0" />
                          {app.city}, {app.state}
                        </span>
                      </div>
                    </div>
                    <div>
                      {app.status === "pending" && (
                        <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-500 border-amber-500/30">
                          Pending
                        </Badge>
                      )}
                      {app.status === "approved" && (
                        <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-500 border-emerald-500/30">
                          Approved
                        </Badge>
                      )}
                      {app.status === "rejected" && (
                        <Badge variant="outline" className="text-[10px] bg-rose-500/10 text-rose-500 border-rose-500/30">
                          Declined
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs py-2 px-2.5 rounded-lg bg-muted/30 border border-border/40">
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase font-medium block">Contact Person</span>
                      <span className="font-medium text-foreground block truncate">{app.contact_name}</span>
                      <span className="text-[10px] text-muted-foreground block truncate">{app.designation || "Administrator"}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase font-medium block">Contact Info</span>
                      <span className="text-[10px] text-muted-foreground block truncate">{app.email}</span>
                      <span className="text-[10px] text-muted-foreground block truncate">{app.phone}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      ~{app.estimated_students || 500} students
                    </span>
                    <span>
                      {app.created_at ? new Date(app.created_at).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                    </span>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-border/30">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedAppForView(app)}
                      className="h-8 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                      title="View Full Application"
                    >
                      <Eye className="h-3.5 w-3.5 mr-1" /> View
                    </Button>
                    {app.status === "pending" && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleApprove(app)}
                          disabled={actionLoadingId === app.id}
                          className="h-8 text-xs bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                          {actionLoadingId === app.id ? "Provisioning..." : "Approve"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleReject(app)}
                          disabled={actionLoadingId === app.id}
                          className="h-8 text-xs text-muted-foreground hover:text-destructive cursor-pointer"
                        >
                          <XCircle className="h-3.5 w-3.5 mr-1" /> Decline
                        </Button>
                      </>
                    )}
                    {app.status === "approved" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleApprove(app)}
                        disabled={actionLoadingId === app.id}
                        className="h-8 text-xs text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 cursor-pointer"
                      >
                        <Key className="h-3.5 w-3.5 mr-1" />
                        {actionLoadingId === app.id ? "Loading..." : "Setup Details"}
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Approved / Setup Details Modal */}
      <Dialog open={!!approvedModal?.isOpen} onOpenChange={(open) => !open && setApprovedModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 mb-2">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <DialogTitle className="text-xl">Institution Successfully Provisioned</DialogTitle>
            <DialogDescription className="text-xs">
              <strong>{approvedModal?.instituteName}</strong> has been created as an active school tenant.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="rounded-lg border border-border/60 bg-muted/30 p-3 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Generated School Code:</span>
                <span className="font-mono font-bold text-foreground">{approvedModal?.schoolCode}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Registered Admin Email:</span>
                <span className="font-medium text-foreground">{approvedModal?.adminEmail}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Registered Mobile Phone:</span>
                <span className="font-medium text-foreground">{approvedModal?.adminPhone}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Secure Identity-Verified Setup Link:</label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={approvedModal?.resetUrl ?? ""}
                  className="h-8 text-xs font-mono bg-background"
                />
                <Button size="sm" onClick={copyResetUrl} className="h-8 text-xs shrink-0 cursor-pointer">
                  {copiedLink ? <Check className="h-3.5 w-3.5 mr-1" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
                  {copiedLink ? "Copied" : "Copy"}
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                When opening this link, the school administrator will be asked to verify their registered email and mobile number before setting their new password.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              className="w-full h-8 text-xs cursor-pointer"
              onClick={() => setApprovedModal(null)}
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Full Application Details Modal */}
      <Dialog open={!!selectedAppForView} onOpenChange={(open) => !open && setSelectedAppForView(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <DialogTitle className="text-base font-semibold">
                {selectedAppForView?.institute_name}
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs">
              Inbound institutional application received via public signup portal.
            </DialogDescription>
          </DialogHeader>

          {selectedAppForView && (
            <div className="space-y-4 py-2 text-xs">
              {/* Meta pills */}
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="capitalize">
                  {selectedAppForView.institute_type?.replace(/_/g, " ") || "School"}
                </Badge>
                <Badge variant="outline" className="flex items-center gap-1">
                  <MapPin className="h-3 w-3 text-muted-foreground" />
                  {selectedAppForView.city}, {selectedAppForView.state}
                </Badge>
                <Badge variant="outline" className="flex items-center gap-1">
                  <Users className="h-3 w-3 text-muted-foreground" />
                  {selectedAppForView.estimated_students || 500} Est. Students
                </Badge>
                <Badge 
                  variant="outline"
                  className={`capitalize ${
                    selectedAppForView.status === "pending"
                      ? "bg-amber-500/10 text-amber-500 border-amber-500/30"
                      : selectedAppForView.status === "approved"
                      ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
                      : "bg-rose-500/10 text-rose-500 border-rose-500/30"
                  }`}
                >
                  Status: {selectedAppForView.status}
                </Badge>
              </div>

              {/* Submitted timestamp */}
              <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5 flex items-center justify-between text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-primary" />
                  Submitted: {selectedAppForView.created_at ? new Date(selectedAppForView.created_at).toLocaleDateString("en-IN", { weekday: "short", month: "short", day: "numeric", year: "numeric" }) : "—"}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {selectedAppForView.created_at ? new Date(selectedAppForView.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : ""}
                </span>
              </div>

              {/* Contact Information */}
              <div className="rounded-lg border border-border/60 p-3 space-y-2 bg-card">
                <div className="text-[11px] font-semibold text-foreground uppercase tracking-wider">Primary Administrative Contact</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Name:</span>
                    <p className="font-medium text-foreground">{selectedAppForView.contact_name}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Designation:</span>
                    <p className="font-medium text-foreground">{selectedAppForView.designation || "Administrator"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Email:</span>
                    <p className="font-medium text-foreground flex items-center gap-1">
                      <Mail className="h-3 w-3 text-muted-foreground" />
                      {selectedAppForView.email}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Mobile Phone:</span>
                    <p className="font-medium text-foreground flex items-center gap-1">
                      <Phone className="h-3 w-3 text-muted-foreground" />
                      {selectedAppForView.phone}
                    </p>
                  </div>
                </div>
              </div>

              {/* Inbound Message */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-semibold text-foreground uppercase tracking-wider">Institution Objectives & Message</div>
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-foreground leading-relaxed italic text-xs whitespace-pre-wrap">
                  {selectedAppForView.message || "No custom message provided."}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex items-center justify-between sm:justify-between pt-2 border-t border-border/40">
            <Button variant="outline" size="sm" onClick={() => setSelectedAppForView(null)}>
              Close
            </Button>
            {selectedAppForView?.status === "pending" && (
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    const app = selectedAppForView
                    setSelectedAppForView(null)
                    handleReject(app)
                  }}
                  className="text-xs text-muted-foreground hover:text-destructive cursor-pointer"
                >
                  <XCircle className="h-3.5 w-3.5 mr-1" /> Decline
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    const app = selectedAppForView
                    setSelectedAppForView(null)
                    handleApprove(app)
                  }}
                  className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Approve & Provision
                </Button>
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
