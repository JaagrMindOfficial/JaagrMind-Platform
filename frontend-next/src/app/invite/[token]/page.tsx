"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ThemeToggle } from "@/components/theme-toggle"
import {
  Building2,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Lock,
  Phone,
  MapPin,
  User,
  ArrowRight,
  KeyRound,
  Check,
} from "lucide-react"
import { api } from "@/lib/api"
import { useAuth } from "@/context/auth-context"
import { INDIAN_STATES_AND_UTS } from "@/lib/constants"

export default function InviteOnboardingPage() {
  const { token } = useParams()
  const router = useRouter()
  const { login } = useAuth()

  const [loading, setLoading] = useState(true)
  const [inviteData, setInviteData] = useState<{
    school_name: string
    email: string
    phone_number?: string
    temp_password?: string
  } | null>(null)
  const [error, setError] = useState("")
  const [isAlreadyAccepted, setIsAlreadyAccepted] = useState(false)
  const [isExpired, setIsExpired] = useState(false)

  // Form state
  const [name, setName] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [city, setCity] = useState("")
  const [state, setState] = useState("")
  const [phone, setPhone] = useState("")
  const [address, setAddress] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [prefilledPhone, setPrefilledPhone] = useState(false)

  useEffect(() => {
    // Validate token on load
    api.get(`/api/invite/${token}`, { skipAuth: true })
      .then((data) => {
        setInviteData(data)
        if (data.phone_number) {
          setPhone(data.phone_number)
          setPrefilledPhone(true)
        }
        if (data.temp_password) {
          setPassword(data.temp_password)
          setConfirmPassword(data.temp_password)
        }
        setLoading(false)
      })
      .catch((err: any) => {
        const msg = String(err.message || "").toLowerCase()
        if (msg.includes("already") || err.code === "ALREADY_ACCEPTED" || err.status === 410) {
          setIsAlreadyAccepted(true)
        } else if (msg.includes("expire") || err.code === "EXPIRED") {
          setIsExpired(true)
        }
        setError(err.message || "Invalid or expired onboarding invite link")
        setLoading(false)
      })
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.")
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match. Please verify both password fields.")
      return
    }

    setSubmitting(true)

    try {
      const res = await api.post(
        `/api/invite/${token}/accept`,
        {
          password,
          name: name.trim(),
          city: city.trim(),
          state: state.trim(),
          phone: phone.trim(),
          address: address.trim(),
        },
        { skipAuth: true }
      )

      // Direct, guaranteed login & redirect to /school dashboard
      if (res?.token && res?.user) {
        localStorage.setItem("token", res.token)
        localStorage.setItem("user", JSON.stringify(res.user))
        document.cookie = `auth_token=${res.token}; path=/; max-age=604800; SameSite=Lax`
        window.location.href = "/school"
      } else if (inviteData) {
        await login(inviteData.email, password)
        window.location.href = "/school"
      } else {
        router.push("/school")
      }
    } catch (err: any) {
      setError(err.message || "Failed to complete onboarding setup")
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-9 w-9 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-muted-foreground text-xs font-mono">Validating institution invite...</p>
        </div>
      </div>
    )
  }

  // Handle if invite was already accepted or closed before setting/remembering password
  if (isAlreadyAccepted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 relative">
        <div className="absolute top-6 right-6">
          <ThemeToggle />
        </div>
        <Card className="max-w-md w-full border-border/80 shadow-md">
          <CardHeader className="text-center pb-4">
            <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-2 border border-emerald-500/20">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <CardTitle className="text-xl font-bold text-foreground">
              Account Already Activated
            </CardTitle>
            <CardDescription className="text-xs mt-1.5 leading-relaxed">
              This onboarding invitation has already been accepted and configured. If you closed your browser earlier or need to log in, you can sign in directly or reset your password.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            <div className="space-y-2">
              <Button
                className="w-full text-xs font-semibold gap-2"
                onClick={() => router.push("/login")}
              >
                <span>Sign In to School Portal</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="outline"
                className="w-full text-xs gap-2"
                onClick={() => router.push(`/forgot-password${inviteData?.email ? `?email=${encodeURIComponent(inviteData.email)}` : ""}`)}
              >
                <KeyRound className="h-3.5 w-3.5" />
                <span>Forgot / Reset Password</span>
              </Button>
            </div>
            <div className="text-center pt-1">
              <Link href="/" className="text-[11px] text-muted-foreground hover:text-foreground underline">
                Return to JaagrMind Home
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error && !inviteData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 relative">
        <div className="absolute top-6 right-6">
          <ThemeToggle />
        </div>
        <Card className="max-w-md w-full border-border shadow-md">
          <CardHeader className="text-center pb-4">
            <div className="h-12 w-12 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto mb-2 border border-rose-500/20">
              <AlertCircle className="h-6 w-6" />
            </div>
            <CardTitle className="text-lg font-bold text-destructive">
              {isExpired ? "Invitation Expired" : "Invalid Invite Link"}
            </CardTitle>
            <CardDescription className="text-xs mt-1 leading-relaxed">
              {error}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-2">
            <p className="text-xs text-muted-foreground text-center">
              Please contact your JaagrMind institutional manager or school administrator for a renewed invitation.
            </p>
            <div className="flex flex-col gap-2 pt-2">
              <Button variant="default" size="sm" onClick={() => router.push("/login")} className="text-xs">
                Go to Sign In
              </Button>
              <Button variant="outline" size="sm" onClick={() => router.push("/")} className="text-xs">
                Return to Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 relative">
      <div className="absolute top-6 right-6">
        <ThemeToggle />
      </div>

      <Card className="w-full max-w-lg border-border/80 shadow-md">
        <CardHeader className="text-center pb-5">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="h-9 w-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-xs">
              <Building2 className="h-5 w-5" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Welcome to JaagrMind</CardTitle>
          <CardDescription className="text-xs mt-1">
            You&apos;ve been invited to configure and administer the campus workspace for{" "}
            <strong className="text-foreground font-semibold">{inviteData?.school_name}</strong>.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Admin Details Section */}
            <div className="space-y-3 p-4 bg-muted/30 rounded-xl border border-border/60">
              <div className="flex items-center justify-between border-b border-border/40 pb-2">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-primary" />
                  Primary Administrator Details
                </span>
                <Badge variant="outline" className="text-[10px] font-mono">
                  School Admin
                </Badge>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">Admin Full Name *</label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Dr. Ramesh Gupta"
                    className="h-9 text-xs"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Official Email</label>
                  <Input value={inviteData?.email} disabled className="h-9 text-xs bg-muted font-mono" />
                </div>
              </div>

              {/* Set Password Section */}
              <div className="space-y-3 pt-1">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground flex items-center justify-between">
                    <span>Set Account Password *</span>
                    <span className="text-[10px] text-muted-foreground font-mono">Min 8 characters</span>
                  </label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter a secure password"
                      minLength={8}
                      className="h-9 text-xs pr-9 font-mono"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer p-1"
                    >
                      {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground flex items-center justify-between">
                    <span>Confirm Password *</span>
                    {confirmPassword && (
                      <span className={`text-[10px] font-medium flex items-center gap-1 ${
                        password === confirmPassword ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"
                      }`}>
                        {password === confirmPassword ? (
                          <>
                            <Check className="h-3 w-3" /> Passwords match
                          </>
                        ) : (
                          "Passwords do not match"
                        )}
                      </span>
                    )}
                  </label>
                  <div className="relative">
                    <Input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter password to confirm"
                      minLength={8}
                      className="h-9 text-xs pr-9 font-mono"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer p-1"
                    >
                      {showConfirmPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* School Campus Details Section */}
            <div className="space-y-3 p-4 bg-muted/30 rounded-xl border border-border/60">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5 border-b border-border/40 pb-2">
                <Building2 className="h-3.5 w-3.5 text-primary" />
                Institution Campus Details
              </span>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">City / Campus Hub *</label>
                  <div className="relative">
                    <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="e.g. Dehradun"
                      className="pl-8 h-9 text-xs"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">State / Union Territory *</label>
                  <select
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus:outline-hidden focus:ring-1 focus:ring-ring"
                    required
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

              <div className="grid gap-3 sm:grid-cols-2">

                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground flex items-center justify-between">
                    <span>Contact Phone *</span>
                    {prefilledPhone && (
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                        Pre-filled
                      </span>
                    )}
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value)
                        setPrefilledPhone(false)
                      }}
                      placeholder="+91 98765 43210"
                      className="pl-8 h-9 text-xs font-mono"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Campus Address (Optional)</label>
                <Input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Street / Sector / Campus landmark"
                  className="h-9 text-xs"
                />
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button
              type="submit"
              className="w-full text-xs h-10 font-semibold gap-2 shadow-xs cursor-pointer"
              disabled={submitting}
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>{submitting ? "Finalizing Workspace Setup..." : "Complete Setup & Launch Dashboard"}</span>
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
