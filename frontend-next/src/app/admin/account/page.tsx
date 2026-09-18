"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  ShieldCheck,
  User,
  Mail,
  Lock,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Save,
  Server,
  Activity,
  Calendar
} from "lucide-react"
import { api } from "@/lib/api"
import { InfoTooltip } from "@/components/ui/info-tooltip"
import { MinimalUUID } from "@/components/ui/minimal-uuid"

interface AdminAccount {
  id: string
  name: string
  email: string
  role: string
  created_at?: string
}

export default function AdminAccountPage() {
  const [account, setAccount] = useState<AdminAccount | null>(null)
  const [loading, setLoading] = useState(true)

  // Profile State
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileSuccess, setProfileSuccess] = useState("")
  const [profileError, setProfileError] = useState("")

  // Password State
  const [passwordData, setPasswordData] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  })
  const [changingPassword, setChangingPassword] = useState(false)
  const [passwordSuccess, setPasswordSuccess] = useState("")
  const [passwordError, setPasswordError] = useState("")

  const fetchAccount = async () => {
    setLoading(true)
    try {
      const data = await api.get("/api/admin/account")
      if (data) {
        setAccount(data)
        setName(data.name || "")
        setEmail(data.email || "")
      }
    } catch (err) {
      console.error("Failed to load admin account", err)
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
    setSavingProfile(true)

    try {
      await api.put("/api/admin/account", { name, email })
      setProfileSuccess("Administrator profile updated successfully.")
      fetchAccount()
    } catch (err: any) {
      setProfileError(err?.message || "Failed to update profile.")
    } finally {
      setSavingProfile(false)
    }
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordSuccess("")
    setPasswordError("")

    if (passwordData.new_password.length < 8) {
      setPasswordError("Superadmin password must be at least 8 characters for enhanced security.")
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
      setPasswordSuccess("Master administrator password changed successfully!")
      setPasswordData({ current_password: "", new_password: "", confirm_password: "" })
    } catch (err: any) {
      setPasswordError(err?.message || "Failed to change password. Please verify current password.")
    } finally {
      setChangingPassword(false)
    }
  }

  if (loading) {
    return (
      <div className="p-12 text-center text-muted-foreground text-xs">
        Loading platform administrator profile...
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Superadmin Account</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage system administrator credentials, security access, and root platform permissions.
        </p>
      </div>

      {/* Top 3 Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5 border-border shadow-none flex !flex-row items-center justify-between">
          <div>
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Privilege Level
            </div>
            <div className="text-base font-semibold mt-1 flex items-center gap-1.5 text-primary">
              <ShieldCheck className="h-4 w-4" /> Super Administrator
            </div>
          </div>
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <ShieldCheck className="h-4 w-4" />
          </div>
        </Card>
        <Card className="p-5 border-border shadow-none flex !flex-row items-center justify-between">
          <div>
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Security Status
            </div>
            <div className="text-base font-semibold mt-1 flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" /> Argon2 Protected
            </div>
          </div>
          <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 shrink-0">
            <Lock className="h-4 w-4" />
          </div>
        </Card>
        <Card className="p-5 border-border shadow-none flex !flex-row items-center justify-between">
          <div>
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Engine Status
            </div>
            <div className="text-base font-semibold mt-1 flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
              <Activity className="h-4 w-4" /> Operational
            </div>
          </div>
          <div className="h-9 w-9 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600 shrink-0">
            <Server className="h-4 w-4" />
          </div>
        </Card>
      </div>

      {/* Profile & Password Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Card */}
        <Card className="border-border shadow-none">
          <CardHeader className="border-b border-border/40 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" />
                  Administrator Profile
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Your platform identity and master notification address.
                </CardDescription>
              </div>
              {account?.id && <MinimalUUID id={account.id} label="Admin UUID" />}
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
                  Full Name
                  <InfoTooltip text="Displayed on ticket resolution replies and audit logs." />
                </label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Platform Administrator"
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                  Email Address
                  <InfoTooltip text="Master login email with unrestricted platform access." />
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@jaagrmind.com"
                    className="pl-9 h-9 text-xs"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Access Role</label>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono text-xs px-2 py-0.5 border-primary/40 bg-primary/10 text-primary">
                    superadmin
                  </Badge>
                  <span className="text-[11px] text-muted-foreground">Full read, write, and promote authority</span>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Button type="submit" size="sm" disabled={savingProfile} className="gap-2">
                  <Save className="h-3.5 w-3.5" />
                  {savingProfile ? "Saving..." : "Save Admin Profile"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Change Password Card */}
        <Card className="border-border shadow-none">
          <CardHeader className="border-b border-border/40 pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-primary" />
              Master Password
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Update your root password. Ensure high entropy (at least 8 characters).
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
                    placeholder="Current superadmin password"
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
                    placeholder="Min 8 characters"
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
                    placeholder="Confirm new password"
                    className="pl-9 h-9 text-xs"
                    required
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Button type="submit" size="sm" disabled={changingPassword} className="gap-2">
                  <KeyRound className="h-3.5 w-3.5" />
                  {changingPassword ? "Updating..." : "Update Master Password"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
