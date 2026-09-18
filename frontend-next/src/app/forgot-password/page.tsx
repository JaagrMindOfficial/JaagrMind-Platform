"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { useTheme } from "next-themes"
import { api } from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ShieldCheck, Mail, Phone, Lock, CheckCircle2, AlertTriangle, ArrowLeft, KeyRound, Sparkles } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"

export default function ForgotPasswordPage() {
  const router = useRouter()
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"

  // Step 1 = Identity Check, Step 2 = OTP Verification, Step 3 = Set New Password, Step 4 = Success
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)

  // Form states
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [otp, setOtp] = useState("")
  const [verifiedToken, setVerifiedToken] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  // Status & demo helper
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [demoOtp, setDemoOtp] = useState<string | null>(null)

  // Step 1: Request OTP with pre-verification
  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await api.post("/api/auth/forgot-password/request-otp", {
        email: email.trim(),
        phone: phone.trim(),
      })

      if (res.demo_otp) {
        setDemoOtp(res.demo_otp)
      }
      setStep(2)
    } catch (err: any) {
      setError(err.message || "Failed to verify identity. Please ensure details match your registered institution.")
    } finally {
      setLoading(false)
    }
  }

  // Step 2: Verify OTP
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await api.post("/api/auth/forgot-password/verify-otp", {
        email: email.trim(),
        otp: otp.trim(),
      })

      if (res.token) {
        setVerifiedToken(res.token)
        setStep(3)
      } else {
        throw new Error("Invalid response from verification server")
      }
    } catch (err: any) {
      setError(err.message || "Invalid or expired verification code.")
    } finally {
      setLoading(false)
    }
  }

  // Step 3: Update Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long")
      return
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    setLoading(true)
    try {
      await api.post("/api/auth/reset-password", {
        token: verifiedToken,
        email: email.trim(),
        phone: phone.trim(),
        new_password: newPassword,
      })

      setStep(4)
    } catch (err: any) {
      setError(err.message || "Failed to update password. Please try requesting a new code.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4 relative">
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md space-y-6">
        {/* Brand Logo */}
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center justify-center gap-2">
            <Image
              src={isDark ? "/LightColorLogo.svg" : "/DarkColorLogo.svg"}
              alt="JaagrMind"
              width={160}
              height={40}
              priority
              className="h-10 w-auto"
            />
          </Link>
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
            Institutional Governance & Credential Security
          </p>
        </div>

        <Card className="border-border/60 shadow-lg bg-card">
          <CardHeader className="space-y-1 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <KeyRound className="h-5 w-5 text-primary" />
              <CardTitle className="text-xl font-bold">
                {step === 1 && "Identity Verification"}
                {step === 2 && "Enter Verification Code"}
                {step === 3 && "Set New Password"}
                {step === 4 && "Password Updated"}
              </CardTitle>
            </div>
            <CardDescription className="text-xs leading-relaxed">
              {step === 1 && "Verify your registered institutional credentials to generate a secure email OTP."}
              {step === 2 && `Enter the 6-digit security code sent to ${email}.`}
              {step === 3 && "Choose a strong new password for your administrative portal account."}
              {step === 4 && "Your credentials have been securely updated. You can sign in immediately."}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Warning / Institutional Enrollment Note (Steps 1-3) */}
            {step === 1 && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300 leading-relaxed space-y-1">
                <div className="font-semibold flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  Institutional Enrollment Notice
                </div>
                <p>
                  Password reset is strictly available for enrolled and provisioned school administrators and educators. You must verify both your registered institutional email and mobile number.
                </p>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* STEP 1: Enter Email & Mobile */}
            {step === 1 && (
              <form onSubmit={handleRequestOTP} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                    Registered Administrative Email
                  </label>
                  <Input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. principal@oakwood.edu"
                    className="h-9 text-xs"
                  />
                  <p className="text-[10px] text-muted-foreground">The primary email associated with your school tenant.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                    Registered Mobile Number
                  </label>
                  <Input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. 9876543210"
                    className="h-9 text-xs"
                  />
                  <p className="text-[10px] text-muted-foreground">10-digit mobile number registered during onboarding.</p>
                </div>

                <Button type="submit" disabled={loading} className="w-full h-9 text-xs font-medium">
                  {loading ? "Verifying Credentials..." : "Verify Identity & Send Email OTP"}
                </Button>
              </form>
            )}

            {/* STEP 2: Enter Email OTP */}
            {step === 2 && (
              <form onSubmit={handleVerifyOTP} className="space-y-4">
                {demoOtp && (
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-2.5 text-xs text-primary flex items-center justify-between">
                    <span>Demo Security Code: <strong className="font-mono tracking-wider">{demoOtp}</strong></span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 text-[11px] px-2 text-primary"
                      onClick={() => setOtp(demoOtp)}
                    >
                      Autofill Code
                    </Button>
                  </div>
                )}

                <div className="space-y-1.5 text-center">
                  <label className="text-xs font-medium text-foreground">6-Digit Verification Code</label>
                  <Input
                    type="text"
                    required
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="123456"
                    className="h-12 text-center text-xl font-mono tracking-widest bg-background"
                  />
                  <p className="text-[10px] text-muted-foreground">Valid for 15 minutes. Check your spam/junk folder if not received.</p>
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(1)}
                    className="w-1/3 h-9 text-xs"
                  >
                    Back
                  </Button>
                  <Button type="submit" disabled={loading || otp.length < 6} className="w-2/3 h-9 text-xs font-medium">
                    {loading ? "Verifying Code..." : "Verify Code"}
                  </Button>
                </div>
              </form>
            )}

            {/* STEP 3: Set New Password */}
            {step === 3 && (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                    <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                    New Password
                  </label>
                  <Input
                    type="password"
                    required
                    minLength={8}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                    <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                    Confirm New Password
                  </label>
                  <Input
                    type="password"
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="h-9 text-xs"
                  />
                </div>

                <Button type="submit" disabled={loading} className="w-full h-9 text-xs font-medium">
                  {loading ? "Updating Password..." : "Update Password & Activate"}
                </Button>
              </form>
            )}

            {/* STEP 4: Success Confirmation */}
            {step === 4 && (
              <div className="space-y-5 text-center py-3">
                <div className="h-12 w-12 rounded-full bg-emerald-500/10 text-emerald-500 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="h-7 w-7" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-foreground">Password Updated Successfully</h3>
                  <p className="text-xs text-muted-foreground">
                    Your institutional password has been updated and your account is active.
                  </p>
                </div>

                <Button
                  onClick={() => router.push(`/login?email=${encodeURIComponent(email)}`)}
                  className="w-full h-10 text-xs font-semibold bg-primary text-primary-foreground shadow-md hover:bg-primary/90"
                >
                  Sign In Now
                </Button>
              </div>
            )}

            {/* Bottom Navigation */}
            {step !== 4 && (
              <div className="pt-2 text-center border-t border-border/40">
                <Link
                  href="/login"
                  className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 font-medium transition-colors"
                >
                  <ArrowLeft className="h-3 w-3" /> Back to Sign In
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
