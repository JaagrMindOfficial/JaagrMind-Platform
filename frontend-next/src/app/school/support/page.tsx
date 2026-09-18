"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Plus, MessageSquare, CheckCircle, Clock, Info, AlertTriangle, HelpCircle, Layers } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { api } from "@/lib/api"

interface Ticket {
  id: string
  subject: string
  description: string
  priority: string
  category: string
  status: string
  admin_reply: string
  created_at: string
}

export default function SchoolSupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [formData, setFormData] = useState({ 
    subject: "", 
    description: "",
    priority: "medium",
    category: "Technical Issue"
  })

  const fetchTickets = async () => {
    setLoading(true)
    try {
      const data = await api.get("/api/school/tickets")
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

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post("/api/school/tickets", formData)
      setIsAddOpen(false)
      setFormData({ 
        subject: "", 
        description: "",
        priority: "medium",
        category: "Technical Issue"
      })
      fetchTickets()
    } catch (err) {
      alert("Failed to submit ticket")
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Support & Tickets</h1>
          <p className="text-sm text-muted-foreground mt-1">Contact the JaagrMind platform team for support, technical assistance, or campus inquiries.</p>
        </div>
        
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger render={<Button size="sm"><Plus className="mr-1.5 h-3.5 w-3.5" /> Create Ticket</Button>} />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Submit a Support Ticket</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddSubmit} className="space-y-4 py-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Subject *</label>
                <Input required value={formData.subject} onChange={e => setFormData({...formData, subject: e.target.value})} placeholder="Brief summary of your issue" className="h-9 text-xs" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Category</label>
                  <select
                    value={formData.category}
                    onChange={e => setFormData({...formData, category: e.target.value})}
                    className="w-full h-9 px-2.5 rounded-md border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="Technical Issue">Technical Issue</option>
                    <option value="Account Request">Account Request</option>
                    <option value="Check-in Help">Check-in Help</option>
                    <option value="Student Roster">Student Roster</option>
                    <option value="General">General Inquiry</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={e => setFormData({...formData, priority: e.target.value})}
                    className="w-full h-9 px-2.5 rounded-md border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium">Description *</label>
                <Textarea 
                  required 
                  rows={4}
                  value={formData.description} 
                  onChange={e => setFormData({...formData, description: e.target.value})} 
                  placeholder="Please provide details about the problem or request..." 
                  className="text-xs"
                />
              </div>
              <Button type="submit" className="w-full h-9 text-xs">Submit Ticket</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-4">
          {loading ? (
            <Card className="animate-pulse h-40" />
          ) : tickets.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                <MessageSquare className="h-10 w-10 mb-4 opacity-20" />
                <p className="text-sm">You haven't submitted any tickets yet.</p>
              </CardContent>
            </Card>
          ) : (
            tickets.map(ticket => (
              <Card key={ticket.id} className="border transition-all hover:border-primary/30">
                <CardHeader className="pb-3 flex flex-row items-start justify-between space-y-0">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CardTitle className="text-base leading-snug">{ticket.subject}</CardTitle>
                      {getPriorityBadge(ticket.priority)}
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">
                        {ticket.category || "General"}
                      </Badge>
                    </div>
                    <CardDescription className="text-xs">
                      Submitted on {new Date(ticket.created_at).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  <Badge 
                    variant={ticket.status === 'closed' || ticket.status === 'resolved' ? "default" : "secondary"}
                    className={ticket.status === 'closed' || ticket.status === 'resolved' ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px]" : "text-[11px]"}
                  >
                    {ticket.status === 'closed' || ticket.status === 'resolved' ? 'Resolved' : 'Open'}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-foreground/80 mb-3 whitespace-pre-wrap">{ticket.description}</p>
                  
                  {ticket.admin_reply && (
                    <div className="bg-primary/5 border border-primary/20 rounded-md p-3 text-xs mt-3">
                      <div className="flex items-center gap-1.5 font-medium text-primary mb-1">
                        <MessageSquare className="h-3.5 w-3.5" /> Response from JaagrMind Support
                      </div>
                      <p className="text-foreground/90 whitespace-pre-wrap">{ticket.admin_reply}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <div>
          <Card className="bg-muted/30 border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Info className="h-4 w-4 text-primary" /> Dedicated School Support
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs text-muted-foreground">
              <p>For urgent matters regarding your school roster, check-in assignments, or staff access, submit a ticket with <strong>High</strong> or <strong>Urgent</strong> priority.</p>
              <p>Our platform engineering team monitors priority tickets with guaranteed response SLA within 4-12 hours.</p>
              <div className="pt-3 border-t space-y-1">
                <div><strong>Direct Email:</strong> support@jaagrmind.com</div>
                <div><strong>Response Hours:</strong> 24/7 Platform Health</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
