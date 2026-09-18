"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Building2,
  Phone,
  Mail,
  MapPin,
  Lock,
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  GitBranch,
  Save,
  Users,
  Plus
} from "lucide-react"
import { api } from "@/lib/api"
import { InfoTooltip } from "@/components/ui/info-tooltip"
import { MinimalUUID } from "@/components/ui/minimal-uuid"
import { CreateBranchDialog } from "@/components/create-branch-dialog"

interface SchoolAccount {
  id: string
  name: string
  code: string
  city: string
  contact_phone: string
  contact_email: string
  status: string
  branches?: Array<{
    id: string
    name: string
    code: string
    city: string
    contact_phone?: string
    is_active?: boolean
  }>
}

export default function SchoolAccountPage() {
  const [account, setAccount] = useState<SchoolAccount | null>(null)
  const [loading, setLoading] = useState(true)

  // Profile Form State
  const [profileData, setProfileData] = useState({
    name: "",
    contact_phone: "",
    contact_email: "",
    city: "",
  })
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileSuccess, setProfileSuccess] = useState("")
  const [profileError, setProfileError] = useState("")

  // Password Form State
  const [passwordData, setPasswordData] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  })
  const [changingPassword, setChangingPassword] = useState(false)
  const [passwordSuccess, setPasswordSuccess] = useState("")
  const [passwordError, setPasswordError] = useState("")
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false)

  const fetchAccount = async () => {
    setLoading(true)
    try {
      const data = await api.get("/api/school/account")
      if (data) {
        setAccount(data)
        setProfileData({
          name: data.name || "",
          contact_phone: data.contact_phone || "",
          contact_email: data.contact_email || "",
          city: data.city || "",
        })
      }
    } catch (err) {
      console.error("Failed to load school account", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAccount()
  }, [])

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setProfileSuccess("")
    setProfileError("")

    if (!profileData.contact_phone.trim()) {
      setProfileError("Mandatory contact phone number is required for institutional communication.")
      return
    }

    setSavingProfile(true)
    try {
      await api.put("/api/school/account", profileData)
      setProfileSuccess("Institution details updated successfully.")
      fetchAccount()
    } catch (err: any) {
      setProfileError(err?.message || "Failed to update school details.")
    } finally {
      setSavingProfile(false)
    }
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordSuccess("")
    setPasswordError("")

    if (passwordData.new_password.length < 6) {
      setPasswordError("New password must be at least 6 characters.")
      return
    }

    if (passwordData.new_password !== passwordData.confirm_password) {
      setPasswordError("New password and confirmation do not match.")
      return
    }

    setChangingPassword(true)
    try {
      await api.post("/api/auth/change-password", {
        current_password: passwordData.current_password,
        new_password: passwordData.new_password,
      })
      setPasswordSuccess("Password updated successfully! Keep your credentials secure.")
      setPasswordData({ current_password: "", new_password: "", confirm_password: "" })
    } catch (err: any) {
      setPasswordError(err?.message || "Failed to change password. Verify your current password.")
    } finally {
      setChangingPassword(false)
    }
  }

  if (loading) {
    return (
      <div className="p-12 text-center text-muted-foreground text-xs">
        Loading account settings...
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Account Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your school institution profile, contact details, security credentials, and branch campuses.
          </p>
        </div>
      </div>

      {/* Top 3 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5 border-border shadow-none flex !flex-row items-center justify-between">
          <div>
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Institution Code
            </div>
            <div className="text-xl font-mono font-bold mt-1 text-primary">
              {account?.code || "—"}
            </div>
          </div>
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <Building2 className="h-4 w-4" />
          </div>
        </Card>
        <Card className="p-5 border-border shadow-none flex !flex-row items-center justify-between">
          <div>
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Account Status
            </div>
            <div className="text-base font-semibold mt-1 flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="h-4 w-4" /> Active & Verified
            </div>
          </div>
          <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 shrink-0">
            <CheckCircle2 className="h-4 w-4" />
          </div>
        </Card>
        <Card className="p-5 border-border shadow-none flex !flex-row items-center justify-between">
          <div>
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Branch Campuses
            </div>
            <div className="text-2xl font-semibold mt-1">
              {account?.branches?.length || 0}
            </div>
          </div>
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <GitBranch className="h-4 w-4" />
          </div>
        </Card>
      </div>

      {/* Main Grid: Profile + Password */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Card */}
        <Card className="border-border shadow-none">
          <CardHeader className="border-b border-border/40 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" />
                  Institution Profile
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Update your official school name, mandated phone number, and location.
                </CardDescription>
              </div>
              {account?.id && <MinimalUUID id={account.id} label="School UUID" />}
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              {profileSuccess && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs rounded-lg flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>{profileSuccess}</span>
                </div>
              )}
              {profileError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs rounded-lg flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{profileError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                  Institution Name
                  <InfoTooltip text="Official school name displayed across all student assessments and certificates." />
                </label>
                <Input
                  value={profileData.name}
                  onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                  placeholder="e.g. Oakridge International School"
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                  Mandatory Contact Phone
                  <InfoTooltip text="Mandated phone contact for administrative alerts, verification, and support." />
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={profileData.contact_phone}
                    onChange={(e) => setProfileData({ ...profileData, contact_phone: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="pl-9 h-9 text-xs font-mono"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                  Official Contact Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    type="email"
                    value={profileData.contact_email}
                    onChange={(e) => setProfileData({ ...profileData, contact_email: e.target.value })}
                    placeholder="admin@school.edu.in"
                    className="pl-9 h-9 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                  City / Campus Location
                  <InfoTooltip text="Used in national analytics to map regional school distributions across India." />
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={profileData.city}
                    onChange={(e) => setProfileData({ ...profileData, city: e.target.value })}
                    placeholder="e.g. Hyderabad, Telangana"
                    className="pl-9 h-9 text-xs"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Button type="submit" size="sm" disabled={savingProfile} className="gap-2">
                  <Save className="h-3.5 w-3.5" />
                  {savingProfile ? "Saving Changes..." : "Save Profile Details"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Password & Security Card */}
        <Card className="border-border shadow-none">
          <CardHeader className="border-b border-border/40 pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-primary" />
              Security & Password
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Change your portal password. Argon2 cryptographic verification ensures protection.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              {passwordSuccess && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs rounded-lg flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>{passwordSuccess}</span>
                </div>
              )}
              {passwordError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs rounded-lg flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{passwordError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Current Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    type="password"
                    value={passwordData.current_password}
                    onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
                    placeholder="Enter current password"
                    className="pl-9 h-9 text-xs"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    type="password"
                    value={passwordData.new_password}
                    onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                    placeholder="At least 6 characters"
                    className="pl-9 h-9 text-xs"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Confirm New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    type="password"
                    value={passwordData.confirm_password}
                    onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                    placeholder="Repeat new password"
                    className="pl-9 h-9 text-xs"
                    required
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Button type="submit" size="sm" disabled={changingPassword} className="gap-2">
                  <KeyRound className="h-3.5 w-3.5" />
                  {changingPassword ? "Updating..." : "Change Password"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Campus Branches Section */}
      <Card className="border-border shadow-none">
        <CardHeader className="border-b border-border/40 pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <GitBranch className="h-4 w-4 text-primary" />
                Affiliated Campus Branches {account?.branches ? `(${account.branches.length})` : "(0)"}
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Satellite campuses and sister branches registered under your institutional network umbrella.
              </CardDescription>
            </div>
            <Button
              size="sm"
              className="text-xs gap-1.5 self-start sm:self-auto"
              onClick={() => setIsBranchModalOpen(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              Add Satellite Campus
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {account?.branches && account.branches.length > 0 ? (
            <div className="divide-y divide-border/50">
              {account.branches.map((branch) => (
                <div key={branch.id} className="p-4 flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-foreground">{branch.name}</span>
                      <Badge variant="outline" className="font-mono text-[10px] px-1.5 py-0">
                        {branch.code}
                      </Badge>
                      <MinimalUUID id={branch.id} label="Branch UUID" />
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                      {branch.city && (
                        <span className="flex items-center gap-1 font-medium">
                          <MapPin className="h-3 w-3 text-primary" /> {branch.city}
                        </span>
                      )}
                      {branch.contact_phone && (
                        <span className="flex items-center gap-1 font-mono">
                          <Phone className="h-3 w-3 text-muted-foreground/70" /> {branch.contact_phone}
                        </span>
                      )}
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[11px]">
                    Active Campus
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center space-y-3">
              <div className="p-3 bg-muted/40 rounded-full w-12 h-12 mx-auto flex items-center justify-center text-muted-foreground">
                <GitBranch className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">No Satellite Branches Registered</p>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Expand your institutional network by registering satellite campuses. All branches automatically inherit your active check-in curriculum.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="text-xs gap-1.5 mt-1"
                onClick={() => setIsBranchModalOpen(true)}
              >
                <Plus className="h-3.5 w-3.5" />
                Register First Satellite Campus
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dedicated Create Branch Dialog */}
      <CreateBranchDialog
        isOpen={isBranchModalOpen}
        onClose={() => setIsBranchModalOpen(false)}
        parentSchool={
          account
            ? {
                id: account.id,
                name: account.name,
                school_code: account.code,
                city: account.city,
              }
            : null
        }
        onSuccess={() => fetchAccount()}
        isAdminMode={false}
      />
    </div>
  )
}

