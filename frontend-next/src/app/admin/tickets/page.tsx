"use client"
 
import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Search,
  MessageSquare,
  CheckCircle,
  Clock,
  Filter,
  AlertTriangle,
  Building2,
  Phone,
  Mail,
  MapPin,
  Calendar,
  User,
  LifeBuoy
} from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { api } from "@/lib/api"
import { InfoTooltip } from "@/components/ui/info-tooltip"
import { MinimalUUID } from "@/components/ui/minimal-uuid"

interface Ticket {
  id: string
  school_id: string
  school_name?: string
  school_code?: string
  school_city?: string
  school_phone?: string
  school_email?: string
  reported_by: string
  subject: string
  description: string
  priority: string
  category: string
  status: string
  admin_reply: string
  created_at: string
}

export default function AdminTicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filterPriority, setFilterPriority] = useState("all")
  const [filterStatus, setFilterStatus] = useState("all")

  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [replyText, setReplyText] = useState("")

  const fetchTickets = async () => {
    setLoading(true)
    try {
      const data = await api.get("/api/admin/tickets")
      setTickets(data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTickets()
  }, [])

  const handleReplySubmit = async (e: React.FormEvent, closeTicket: boolean) => {
    e.preventDefault()
    if (!selectedTicket) return

    try {
      await api.put(`/api/admin/tickets/${selectedTicket.id}/reply`, {
        reply: replyText,
        status: closeTicket ? "closed" : "open"
      })
      setSelectedTicket(null)
      setReplyText("")
      fetchTickets()
    } catch (err) {
      alert("Failed to send reply")
    }
  }

  const getPriorityBadge = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case "urgent":
        return <Badge variant="destructive" className="text-[10px] px-1.5 py-0 bg-rose-500/15 text-rose-600 border-rose-500/30">Urgent</Badge>
      case "high":
        return <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-amber-500/15 text-amber-600 border-amber-500/30">High</Badge>
      case "low":
        return <Badge variant="secondary" className="text-[10px] px-1.5 py-0 text-muted-foreground">Low</Badge>
      default:
        return <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-blue-500/15 text-blue-600 border-blue-500/30">Medium</Badge>
    }
  }

  const filtered = tickets.filter((t) => {
    const matchesSearch = 
      t.subject.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase()) ||
      (t.category && t.category.toLowerCase().includes(search.toLowerCase()))

    const matchesPriority = filterPriority === "all" || t.priority?.toLowerCase() === filterPriority.toLowerCase()
    const matchesStatus = filterStatus === "all" || 
      (filterStatus === "open" && t.status !== "closed" && t.status !== "resolved") ||
      (filterStatus === "closed" && (t.status === "closed" || t.status === "resolved"))

    return matchesSearch && matchesPriority && matchesStatus
  })

  const totalTickets = tickets.length
  const openTickets = tickets.filter(t => t.status !== "closed" && t.status !== "resolved").length
  const resolvedTickets = tickets.filter(t => t.status === "closed" || t.status === "resolved").length

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Support Tickets</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Resolve technical, student roster, and account requests submitted by school administrators.
          </p>
        </div>
      </div>

      {/* Top 3 Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5 border-border shadow-none flex !flex-row items-center justify-between">
          <div>
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Total Tickets
            </div>
            <div className="text-2xl font-semibold mt-1">{totalTickets}</div>
          </div>
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <LifeBuoy className="h-4 w-4" />
          </div>
        </Card>
        <Card className="p-5 border-border shadow-none flex !flex-row items-center justify-between">
          <div>
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Pending / Open
            </div>
            <div className="text-2xl font-semibold mt-1 text-amber-600 dark:text-amber-400">
              {openTickets}
            </div>
          </div>
          <div className="h-9 w-9 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600 shrink-0">
            <Clock className="h-4 w-4" />
          </div>
        </Card>
        <Card className="p-5 border-border shadow-none flex !flex-row items-center justify-between">
          <div>
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Resolved & Closed
            </div>
            <div className="text-2xl font-semibold mt-1 text-emerald-600 dark:text-emerald-400">
              {resolvedTickets}
            </div>
          </div>
          <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 shrink-0">
            <CheckCircle className="h-4 w-4" />
          </div>
        </Card>
      </div>

      <Card className="border-border shadow-none">
        <CardHeader className="pb-3 border-b border-border/40">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search tickets by school, subject, category..."
                className="pl-9 h-9 text-xs"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="h-9 px-2.5 rounded-md border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="all">All Priorities</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="h-9 px-2.5 rounded-md border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="all">All Statuses</option>
                <option value="open">Open</option>
                <option value="closed">Resolved / Closed</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground text-xs">Loading tickets...</div>
          ) : tickets.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground text-xs flex flex-col items-center">
              <MessageSquare className="h-10 w-10 mb-3 opacity-20" />
              <p>No support tickets submitted yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {filtered.map((ticket) => (
                <div
                  key={ticket.id}
                  className="p-4 hover:bg-muted/40 cursor-pointer transition-colors flex items-start gap-4"
                  onClick={() => {
                    setSelectedTicket(ticket)
                    setReplyText(ticket.admin_reply || "")
                  }}
                >
                  <div className="mt-1 shrink-0">
                    {ticket.status === "closed" || ticket.status === "resolved" ? (
                      <CheckCircle className="h-5 w-5 text-emerald-500" />
                    ) : (
                      <Clock className="h-5 w-5 text-amber-500" />
                    )}
                  </div>
                  <div className="flex-1 space-y-1.5 min-w-0">
                    {/* School Origin Details */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 font-medium text-xs text-foreground bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                        <Building2 className="h-3 w-3 text-primary shrink-0" />
                        <span className="font-semibold">{ticket.school_name || "Institution"}</span>
                        {ticket.school_code && (
                          <span className="font-mono text-[10px] text-muted-foreground">({ticket.school_code})</span>
                        )}
                      </div>
                      {ticket.school_city && (
                        <span className="flex items-center gap-1 text-[11px] text-muted-foreground font-medium">
                          <MapPin className="h-3 w-3 text-muted-foreground/70" /> {ticket.school_city}
                        </span>
                      )}
                      {ticket.school_phone && (
                        <span className="flex items-center gap-1 text-[11px] text-muted-foreground font-mono">
                          <Phone className="h-3 w-3 text-muted-foreground/70" /> {ticket.school_phone}
                        </span>
                      )}
                      <span className="text-[11px] text-muted-foreground">
                        by <span className="font-medium text-foreground">{ticket.reported_by || "Admin"}</span>
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm text-foreground">{ticket.subject}</p>
                        {getPriorityBadge(ticket.priority)}
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">
                          {ticket.category || "General"}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground font-mono">
                        {new Date(ticket.created_at).toLocaleString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground line-clamp-2">{ticket.description}</p>
                    {ticket.admin_reply && (
                      <div className="mt-2 text-xs bg-muted/60 p-2.5 rounded-md border border-border/50 text-foreground/85">
                        <span className="font-semibold text-primary">Your Reply:</span> {ticket.admin_reply}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedTicket} onOpenChange={(open) => !open && setSelectedTicket(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2 text-base">
                <MessageSquare className="h-4 w-4 text-primary" />
                Ticket Resolution
              </DialogTitle>
              {selectedTicket && <MinimalUUID id={selectedTicket.id} label="Ticket ID" />}
            </div>
          </DialogHeader>
          {selectedTicket && (
            <div className="space-y-4 py-2">
              {/* School Origin Card */}
              <div className="p-3 bg-muted/30 rounded-lg border border-border/60 space-y-2 text-xs">
                <div className="flex items-center justify-between border-b border-border/40 pb-2">
                  <div className="flex items-center gap-1.5 font-semibold text-foreground">
                    <Building2 className="h-4 w-4 text-primary" />
                    <span>{selectedTicket.school_name || "School Support Request"}</span>
                    {selectedTicket.school_code && (
                      <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0">
                        {selectedTicket.school_code}
                      </Badge>
                    )}
                  </div>
                  {getPriorityBadge(selectedTicket.priority)}
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-3 w-3 text-muted-foreground/70" />
                    <span>City: <strong className="text-foreground">{selectedTicket.school_city || "Not specified"}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Phone className="h-3 w-3 text-muted-foreground/70" />
                    <span>Contact: <strong className="text-foreground">{selectedTicket.school_phone || "Not provided"}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Mail className="h-3 w-3 text-muted-foreground/70" />
                    <span>Email: <strong className="text-foreground">{selectedTicket.school_email || "Not provided"}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3 w-3 text-muted-foreground/70" />
                    <span>Submitted: <strong className="text-foreground">{new Date(selectedTicket.created_at).toLocaleString()}</strong></span>
                  </div>
                </div>
              </div>

              {/* Ticket Details */}
              <div className="p-3 bg-card rounded-lg border border-border/50 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground text-sm">{selectedTicket.subject}</span>
                  <Badge variant="secondary" className="text-[10px]">
                    {selectedTicket.category || "General"}
                  </Badge>
                </div>
                <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed pt-1">
                  {selectedTicket.description}
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground flex items-center justify-between">
                  <span>Administrator Response</span>
                  <span className="text-[10px] text-muted-foreground">Will be notified to school portal</span>
                </label>
                <Textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type your official response to the school administrator here..."
                  rows={4}
                  className="text-xs"
                />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <Button variant="outline" size="sm" onClick={(e) => handleReplySubmit(e, false)}>
                  Reply & Keep Open
                </Button>
                <Button size="sm" onClick={(e) => handleReplySubmit(e, true)}>
                  Resolve & Close Ticket
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
