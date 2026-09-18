"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { ShieldCheck, Lock, Mail, Phone, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowRight } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ThemeToggle } from "@/components/theme-toggle"

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const [token, setToken] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    const urlToken = searchParams.get("token")
    if (urlToken) {
      setToken(urlToken)
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!token.trim()) {
      setError("Reset verification token is missing. Please use the link provided in your email or invitation.")
      return
    }
    if (!email.trim()) {
      setError("Please enter your registered institution email address.")
      return
    }
    if (!phone.trim()) {
      setError("Please enter your registered mobile number for identity verification.")
      return
    }
    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters long.")
      return
    }
    if (newPassword !== confirmPassword) {
      setError("Password confirmation does not match.")
      return
    }

    setLoading(true)
    try {
      const res = await fetch("http://127.0.0.1:8080/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: token.trim(),
          email: email.trim(),
          phone: phone.trim(),
          new_password: newPassword,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Identity verification failed")
      }

      setSuccess(true)
      if (data.token) {
        localStorage.setItem("token", data.token)
        localStorage.setItem("user", JSON.stringify(data.user))
        setTimeout(() => {
          router.push("/school")
        }, 2000)
      }
    } catch (err: any) {
      setError(err.message || "Failed to reset password. Please check your credentials.")
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <Card className="w-full max-w-md border-emerald-500/30 bg-card/90 shadow-2xl backdrop-blur-md">
        <CardContent className="pt-8 pb-8 text-center space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
            <CheckCircle2 className="h-10 w-10" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">Password Verified & Updated</h2>
          <p className="text-sm text-muted-foreground">
            Your identity has been verified and your new password is now active. Directing you to the institution portal...
          </p>
          <div className="pt-2">
            <Button
              onClick={() => router.push("/school")}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
            >
              Continue to Portal Now <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md border-border/60 bg-card/80 shadow-2xl backdrop-blur-md">
      <CardHeader className="space-y-2 text-center pb-4">
        <div className="flex justify-center mb-1">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
            <ShieldCheck className="h-6 w-6" />
          </div>
        </div>
        <CardTitle className="text-2xl font-bold tracking-tight">
          Set Up / Reset Password
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground max-w-sm mx-auto">
          To protect institutional access, please verify your registered email address and mobile number before setting your new password.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {error && (
          <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <div className="leading-relaxed">{error}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {!searchParams.get("token") && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Reset Token</label>
              <Input
                type="text"
                placeholder="Paste reset token from email"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                required
                className="h-9 text-xs"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 text-muted-foreground" /> Registered Email Address
            </label>
            <Input
              type="email"
              placeholder="e.g. principal@oakwood.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-9 text-xs"
            />
            <p className="text-[10px] text-muted-foreground">The primary administrative email on file.</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5 text-muted-foreground" /> Registered Mobile Number
            </label>
            <Input
              type="tel"
              placeholder="e.g. 9876543210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              className="h-9 text-xs"
            />
            <p className="text-[10px] text-muted-foreground">The 10-digit mobile number registered during onboarding.</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 text-muted-foreground" /> New Password
            </label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Minimum 8 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="h-9 text-xs pr-9"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 text-muted-foreground" /> Confirm New Password
            </label>
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="Re-enter password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="h-9 text-xs"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-9 mt-2 text-xs font-medium"
          >
            {loading ? "Verifying Identity..." : "Verify Identity & Update Password"}
          </Button>

          <div className="pt-2 text-center text-xs text-muted-foreground">
            Remember your credentials?{" "}
            <Link href="/login" className="text-primary hover:underline font-medium">
              Back to Sign In
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex flex-col justify-between bg-background text-foreground relative overflow-hidden">
      {/* Top Header */}
      <header className="p-4 sm:p-6 flex items-center justify-between border-b border-border/40 backdrop-blur-sm z-10">
        <Link href="/" className="flex items-center gap-2">
          <div className="relative w-32 h-9">
            <Image
              src="/DarkColorLogo.svg"
              alt="JaagrMind Logo"
              fill
              className="object-contain dark:hidden"
              priority
            />
            <Image
              src="/LightColorLogo.svg"
              alt="JaagrMind Logo"
              fill
              className="object-contain hidden dark:block"
              priority
            />
          </div>
        </Link>
        <ThemeToggle />
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4 z-10">
        <Suspense fallback={<div className="text-xs text-muted-foreground">Loading reset verification...</div>}>
          <ResetPasswordForm />
        </Suspense>
      </main>

      {/* Footer */}
      <footer className="p-4 text-center text-xs text-muted-foreground border-t border-border/40 z-10">
        JaagrMind Behavioral Health & Learning Readiness Platform • Institutional Governance
      </footer>
    </div>
  )
}
