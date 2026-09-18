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
import { Search, Plus, Send, Copy, Check } from "lucide-react"
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

export default function AdminsPage() {
  const [admins, setAdmins] = useState<Admin[]>([])
  const [loading, setLoading] = useState(true)
  
  // Invite state
  const [isInviteOpen, setIsInviteOpen] = useState(false)
  const [inviteSchool, setInviteSchool] = useState("")
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviting, setInviting] = useState(false)
  const [inviteResult, setInviteResult] = useState<{ link: string; token: string } | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetchAdmins()
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

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setInviting(true)
    try {
      const data = await api.post("/api/admin/invite-school", {
        school_name: inviteSchool,
        email: inviteEmail,
      })
      setInviteResult({ link: data.invite_link, token: data.token })
    } catch (error) {
      console.error("Failed to invite school", error)
    } finally {
      setInviting(false)
    }
  }

  const copyToClipboard = () => {
    if (inviteResult) {
      navigator.clipboard.writeText(inviteResult.link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const resetInvite = () => {
    setInviteSchool("")
    setInviteEmail("")
    setInviteResult(null)
    setIsInviteOpen(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Admin & Access</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage platform admins and invite new schools.
          </p>
        </div>
        
        <Dialog open={isInviteOpen} onOpenChange={(open) => {
          setIsInviteOpen(open)
          if (!open) setTimeout(resetInvite, 300)
        }}>
          <DialogTrigger render={<Button size="sm"><Send className="mr-1.5 h-3.5 w-3.5" /> Invite School</Button>} />
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Invite a New School</DialogTitle>
              <DialogDescription>
                Send an invitation link for a school to set up their own admin account and details.
              </DialogDescription>
            </DialogHeader>

            {!inviteResult ? (
              <form onSubmit={handleInvite} className="space-y-4 py-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">School Name</label>
                  <Input 
                    placeholder="e.g. Oakwood High School" 
                    value={inviteSchool}
                    onChange={(e) => setInviteSchool(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Admin Email</label>
                  <Input 
                    type="email"
                    placeholder="admin@school.edu" 
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    required
                  />
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={inviting} className="w-full sm:w-auto">
                    {inviting ? "Generating..." : "Generate Invite"}
                  </Button>
                </DialogFooter>
              </form>
            ) : (
              <div className="space-y-4 py-4">
                <div className="p-3 bg-muted/50 rounded-md border text-sm text-muted-foreground">
                  The invitation has been generated. In production, this would be emailed automatically. For now, share this link with the school:
                </div>
                <div className="flex items-center gap-2">
                  <Input value={inviteResult.link} readOnly className="font-mono text-xs" />
                  <Button size="icon" variant="outline" onClick={copyToClipboard} className="shrink-0">
                    {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

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
    </div>
  )
}
