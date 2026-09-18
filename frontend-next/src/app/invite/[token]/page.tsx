"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { api } from "@/lib/api"
import { useAuth } from "@/context/auth-context"

export default function InviteOnboardingPage() {
  const { token } = useParams()
  const router = useRouter()
  const { login } = useAuth()
  
  const [loading, setLoading] = useState(true)
  const [inviteData, setInviteData] = useState<{ school_name: string; email: string } | null>(null)
  const [error, setError] = useState("")

  // Form state
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [city, setCity] = useState("")
  const [phone, setPhone] = useState("")
  const [address, setAddress] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    // Validate token on load
    api.get(`/api/invite/${token}`, { skipAuth: true })
      .then((data) => {
        setInviteData(data)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message || "Invalid or expired invite link")
        setLoading(false)
      })
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError("")

    try {
      await api.post(`/api/invite/${token}/accept`, {
        password,
        name,
        city,
        phone,
        address
      }, { skipAuth: true })
      
      // Successfully created account, now log in automatically
      if (inviteData) {
        await login(inviteData.email, password)
        // Login will handle the redirect to /school
      }
    } catch (err: any) {
      setError(err.message || "Failed to complete onboarding")
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground text-sm">Validating invite...</p>
      </div>
    )
  }

  if (error && !inviteData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md w-full mx-4">
          <CardHeader className="text-center">
            <CardTitle className="text-destructive">Invalid Link</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button variant="outline" onClick={() => router.push("/")}>Return to Home</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background py-12 relative">
      <div className="absolute top-6 right-6">
        <ThemeToggle />
      </div>

      <Card className="w-full max-w-lg mx-4">
        <CardHeader className="text-center pb-6">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="h-8 w-8 rounded-lg bg-foreground flex items-center justify-center">
              <span className="text-background text-sm font-bold tracking-tight">JM</span>
            </div>
          </div>
          <CardTitle className="text-2xl font-semibold">Welcome to JaagrMind</CardTitle>
          <CardDescription>
            You've been invited to set up the admin account for <strong className="text-foreground">{inviteData?.school_name}</strong>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-sm font-medium border-b pb-2">Admin Details</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-muted-foreground">Admin Name</label>
                  <Input 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    placeholder="Your full name" 
                    required 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-muted-foreground">Email</label>
                  <Input value={inviteData?.email} disabled className="bg-muted" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">Set Password</label>
                <Input 
                  type="password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  placeholder="At least 8 characters" 
                  minLength={8}
                  required 
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-medium border-b pb-2">School Details</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-muted-foreground">City</label>
                  <Input 
                    value={city} 
                    onChange={(e) => setCity(e.target.value)} 
                    placeholder="School city" 
                    required 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-muted-foreground">Phone Number</label>
                  <Input 
                    value={phone} 
                    onChange={(e) => setPhone(e.target.value)} 
                    placeholder="Contact number" 
                    required 
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">Address</label>
                <Input 
                  value={address} 
                  onChange={(e) => setAddress(e.target.value)} 
                  placeholder="Full school address" 
                  required 
                />
              </div>
            </div>

            {error && <p className="text-sm text-destructive text-center">{error}</p>}

            <Button type="submit" className="w-full" size="lg" disabled={submitting}>
              {submitting ? "Completing Setup..." : "Complete Setup & Dashboard"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
