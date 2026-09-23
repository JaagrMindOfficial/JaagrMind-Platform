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
  Plus,
  LogOut,
  UploadCloud,
  ImageIcon,
} from "lucide-react"
import { api } from "@/lib/api"
import { useAuth } from "@/context/auth-context"
import { InfoTooltip } from "@/components/ui/info-tooltip"
import { MinimalUUID } from "@/components/ui/minimal-uuid"
import { CreateBranchDialog } from "@/components/create-branch-dialog"
import { INDIAN_STATES_AND_UTS } from "@/lib/constants"

interface SchoolAccount {
  id: string
  name: string
  code: string
  city: string
  state?: string
  contact_phone: string
  contact_email: string
  status: string
  logo?: string
  branches?: Array<{
    id: string
    name: string
    code: string
    city: string
    state?: string
    contact_phone?: string
    is_active?: boolean
  }>
}

export default function SchoolAccountPage() {
  const { logout } = useAuth()
  const [account, setAccount] = useState<SchoolAccount | null>(null)
  const [loading, setLoading] = useState(true)

  // Profile Form State
  const [profileData, setProfileData] = useState({
    name: "",
    contact_phone: "",
    contact_email: "",
    city: "",
    state: "",
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

  // Logo Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [logoSuccess, setLogoSuccess] = useState("")
  const [logoError, setLogoError] = useState("")

  const fetchAccount = async () => {
    setLoading(true)
    try {
      const data = await api.get("/api/school/account")
      if (data) {
        const s = data.school || data
        setAccount({
          id: s.id,
          name: s.name || "",
          code: s.school_code || s.code || "",
          city: s.city || "",
          state: s.state || "",
          contact_phone: s.phone_number || s.contact_phone || "",
          contact_email: s.contact || s.contact_email || "",
          status: s.is_active !== false ? "active" : "inactive",
          logo: s.logo || "",
          branches: data.branches || s.branches || [],
        })
        setProfileData({
          name: s.name || "",
          contact_phone: s.phone_number || s.contact_phone || "",
          contact_email: s.contact || s.contact_email || "",
          city: s.city || "",
          state: s.state || "",
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

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLogoError("")
    setLogoSuccess("")
    const file = e.target.files?.[0]
    if (!file) return

    // 1. Size check: max 2MB
    if (file.size > 2 * 1024 * 1024) {
      setLogoError("File size exceeds 2MB limit. Please upload an image under 2MB.")
      return
    }

    // 2. Type check
    const allowed = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"]
    if (!allowed.includes(file.type)) {
      setLogoError("Invalid file format. Allowed formats: PNG, JPG, JPEG, WebP, SVG.")
      return
    }

    // 3. Dimension check
    const objectUrl = URL.createObjectURL(file)
    setPreviewUrl(objectUrl)
    setSelectedFile(file)

    if (file.type !== "image/svg+xml") {
      const img = new Image()
      img.src = objectUrl
      img.onload = () => {
        setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight })
        if (img.naturalWidth < 100 || img.naturalHeight < 100) {
          setLogoError("Image dimensions are below recommended 100x100px. It may appear blurry on reports.")
        }
      }
    } else {
      setImageDimensions({ width: 256, height: 256 })
    }
  }

  const handleLogoUpload = async () => {
    if (!selectedFile) return
    setUploadingLogo(true)
    setLogoError("")
    setLogoSuccess("")

    try {
      const token = localStorage.getItem("token")
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"
      const formData = new FormData()
      formData.append("logo", selectedFile)

      const res = await fetch(`${apiBase}/api/school/logo`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to upload logo.")
      }

      setLogoSuccess("Institution crest uploaded and applied successfully across portals!")
      if (data.logo_url && account) {
        setAccount({ ...account, logo: data.logo_url })
      }
      setSelectedFile(null)
    } catch (err: any) {
      setLogoError(err.message || "Failed to upload logo.")
    } finally {
      setUploadingLogo(false)
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
        <Button
          variant="outline"
          size="sm"
          onClick={() => logout()}
          className="text-xs gap-1.5 text-destructive hover:bg-destructive/10 border-destructive/30 shrink-0 self-start sm:self-auto cursor-pointer"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span>Sign Out</span>
        </Button>
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                    City / Campus Hub
                    <InfoTooltip text="City where this campus is located." />
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      value={profileData.city}
                      onChange={(e) => setProfileData({ ...profileData, city: e.target.value })}
                      placeholder="e.g. Dehradun"
                      className="pl-9 h-9 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                    State / Union Territory
                    <InfoTooltip text="State/UT used to correctly position and correlate regional analytics." />
                  </label>
                  <select
                    value={profileData.state}
                    onChange={(e) => setProfileData({ ...profileData, state: e.target.value })}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus:outline-hidden focus:ring-1 focus:ring-ring"
                  >
                    <option value="">Select State / UT</option>
                    {INDIAN_STATES_AND_UTS.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
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

        {/* Institution Logo & Branding Card */}
        <Card className="border-border shadow-none">
          <CardHeader className="border-b border-border/40 pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-primary" />
              Institution Logo & Branding
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Upload your official school logo or crest. This is displayed on student assessment reports, completion certificates, and portal headers.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            {logoSuccess && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs rounded-lg flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{logoSuccess}</span>
              </div>
            )}
            {logoError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs rounded-lg flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{logoError}</span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              {/* Current or Preview Logo */}
              <div className="flex flex-col items-center gap-2 shrink-0">
                <div className="h-24 w-24 rounded-xl border border-dashed border-border bg-muted/30 flex items-center justify-center overflow-hidden relative">
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt="Logo preview"
                      className="h-full w-full object-contain p-1"
                    />
                  ) : account?.logo ? (
                    <img
                      src={account.logo}
                      alt="Current logo"
                      className="h-full w-full object-contain p-1"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-muted-foreground p-2 text-center">
                      <Building2 className="h-8 w-8 stroke-1 opacity-50 mb-1" />
                      <span className="text-[10px] leading-tight">No crest</span>
                    </div>
                  )}
                </div>
                {imageDimensions && (
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {imageDimensions.width} × {imageDimensions.height} px
                  </span>
                )}
              </div>

              {/* Upload Controls & Guidelines */}
              <div className="flex-1 space-y-3 w-full">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">Select Crest / Logo File</label>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    onChange={handleLogoSelect}
                    className="block w-full text-xs text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-primary/10 file:text-primary hover:file:bg-primary/20 file:cursor-pointer cursor-pointer border border-input rounded-md bg-background"
                  />
                </div>

                <div className="text-[11px] text-muted-foreground leading-relaxed space-y-1">
                  <p>• <strong>Dimensions:</strong> Square (1:1) aspect ratio recommended (min 100×100 px, optimal 256×256 px).</p>
                  <p>• <strong>File size limit:</strong> Under 2.0 MB.</p>
                  <p>• <strong>Supported formats:</strong> PNG (transparent background recommended), JPG, WebP, SVG.</p>
                </div>

                {selectedFile && (
                  <div className="pt-1 flex items-center gap-3">
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleLogoUpload}
                      disabled={uploadingLogo}
                      className="gap-2"
                    >
                      <UploadCloud className="h-3.5 w-3.5" />
                      {uploadingLogo ? "Uploading & Applying..." : "Upload & Save Logo"}
                    </Button>
                    <span className="text-xs text-muted-foreground font-mono">
                      {(selectedFile.size / 1024).toFixed(1)} KB
                    </span>
                  </div>
                )}
              </div>
            </div>
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
                      {(branch.city || branch.state) && (
                        <span className="flex items-center gap-1 font-medium">
                          <MapPin className="h-3 w-3 text-primary" />
                          {[branch.city, branch.state].filter(Boolean).join(", ")}
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
                state: account.state,
              }
            : null
        }
        onSuccess={() => fetchAccount()}
        isAdminMode={false}
      />
    </div>
  )
}

