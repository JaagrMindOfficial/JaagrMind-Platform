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
import { Plus, UserPlus, Copy, Check, Loader2, HeartHandshake, Building2, Mail, Phone, User } from "lucide-react"
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
  const [counselorRole, setCounselorRole] = useState("JaagrMind Central Counselor")
  const [counselorSchoolId, setCounselorSchoolId] = useState("")
  const [onboarding, setOnboarding] = useState(false)
  const [onboardResult, setOnboardResult] = useState<{ temp_password: string; portal_url: string; email: string; name: string } | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetchAdmins()
    fetchCounselors()
  }, [])

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
    setOnboarding(true)
    try {
      const data = await api.post("/api/admin/counselors", {
        name: counselorName,
        email: counselorEmail,
        phone: counselorPhone,
        role: counselorRole,
        school_id: counselorSchoolId || undefined,
      })
      setOnboardResult({
        temp_password: data.temp_password,
        portal_url: data.portal_url,
        email: data.email,
        name: data.name,
      })
      fetchCounselors()
    } catch (error) {
      console.error("Failed to onboard counselor", error)
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
    setCounselorRole("JaagrMind Central Counselor")
    setCounselorSchoolId("")
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
                  <label className="text-sm font-medium">Email *</label>
                  <Input 
                    type="email"
                    placeholder="counselor@example.com" 
                    value={counselorEmail}
                    onChange={(e) => setCounselorEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Phone</label>
                  <Input 
                    placeholder="+91 98765 43210" 
                    value={counselorPhone}
                    onChange={(e) => setCounselorPhone(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Role</label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={counselorRole === "JaagrMind Central Counselor" ? "default" : "outline"}
                      size="sm"
                      onClick={() => { setCounselorRole("JaagrMind Central Counselor"); setCounselorSchoolId(""); }}
                      className="text-xs flex-1"
                    >
                      Central (Care Desk)
                    </Button>
                    <Button
                      type="button"
                      variant={counselorRole === "School Wellness Counselor" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCounselorRole("School Wellness Counselor")}
                      className="text-xs flex-1"
                    >
                      School Counselor
                    </Button>
                  </div>
                </div>
                {counselorRole === "School Wellness Counselor" && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">School ID (UUID)</label>
                    <Input 
                      placeholder="School UUID (from Schools page)" 
                      value={counselorSchoolId}
                      onChange={(e) => setCounselorSchoolId(e.target.value)}
                    />
                    <p className="text-[10px] text-muted-foreground">Optional. Copy the School ID from the Schools management page.</p>
                  </div>
                )}
                <DialogFooter>
                  <Button type="submit" disabled={onboarding} className="w-full sm:w-auto">
                    {onboarding ? "Creating..." : "Create Counselor Account"}
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
                <div className="text-xs text-muted-foreground">
                  Portal: <code className="font-mono text-foreground">{onboardResult.portal_url}</code>
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Hours</TableHead>
                  <TableHead>Status</TableHead>
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
