"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  HeartHandshake,
  Search,
  CheckCircle2,
  Clock,
  Mail,
  User,
  Building2,
  Loader2,
  ShieldCheck,
  MessageSquare,
  Sparkles,
  Eye,
  ShieldAlert,
  Lock,
} from "lucide-react";

interface ParentInquiry {
  id: string;
  parent_id: string;
  student_id: string;
  student_name: string;
  school_id?: string;
  school_name?: string;
  counselor_id?: string;
  counselor_type: string;
  target_recipient: string;
  parent_name: string;
  parent_email: string;
  subject: string;
  message: string;
  status: string;
  resolution_notes?: string;
  created_at: string;
}

export default function AdminCounselingPage() {
  const [inquiries, setInquiries] = useState<ParentInquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | "jaagrmind" | "school">("all");

  // View / Resolve Modal State
  const [activeInquiry, setActiveInquiry] = useState<ParentInquiry | null>(null);
  const [resolutionStatus, setResolutionStatus] = useState("resolved");
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [updating, setUpdating] = useState(false);

  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

  const fetchInquiries = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const res = await fetch(`${apiBase}/api/admin/parent-inquiries`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setInquiries(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Failed to load parent inquiries:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInquiries();
  }, []);

  const handleOpenModal = (inq: ParentInquiry) => {
    setActiveInquiry(inq);
    setResolutionStatus(inq.status || "resolved");
    setResolutionNotes(inq.resolution_notes || "");
  };

  const handleUpdateInquiry = async () => {
    if (!activeInquiry) return;
    setUpdating(true);

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${apiBase}/api/admin/parent-inquiries/${activeInquiry.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: resolutionStatus,
          resolution_notes: resolutionNotes,
        }),
      });

      if (res.ok) {
        fetchInquiries();
        setActiveInquiry(null);
      }
    } catch (err) {
      console.error("Failed to update inquiry:", err);
    } finally {
      setUpdating(false);
    }
  };

  const filtered = inquiries.filter((inq) => {
    const q = search.toLowerCase();
    const matchesSearch =
      inq.parent_name.toLowerCase().includes(q) ||
      inq.parent_email.toLowerCase().includes(q) ||
      inq.student_name.toLowerCase().includes(q) ||
      inq.subject.toLowerCase().includes(q) ||
      inq.message.toLowerCase().includes(q);

    if (!matchesSearch) return false;
    if (filterType === "jaagrmind") return inq.target_recipient === "superadmin";
    if (filterType === "school") return inq.target_recipient === "school_counselor";
    return true;
  });

  const pendingCount = inquiries.filter((i) => i.status === "pending").length;
  const jaagrMindCount = inquiries.filter((i) => i.target_recipient === "superadmin").length;

  return (
    <div className="p-6 sm:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground">
              Superadmin Care Desk
            </span>
            {pendingCount > 0 && (
              <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px] font-mono">
                {pendingCount} Pending Response
              </Badge>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground mt-1">
            Parent Counseling Inquiries
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Confidential inquiries sent by parents. Independent students and schools without local counselors route directly to JaagrMind counselors here.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={filterType === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterType("all")}
            className="text-xs h-8"
          >
            All ({inquiries.length})
          </Button>
          <Button
            variant={filterType === "jaagrmind" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterType("jaagrmind")}
            className="text-xs h-8"
          >
            JaagrMind Route ({jaagrMindCount})
          </Button>
          <Button
            variant={filterType === "school" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterType("school")}
            className="text-xs h-8"
          >
            School Route ({inquiries.length - jaagrMindCount})
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-card border border-border/70 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-mono text-muted-foreground uppercase">Pending Inquiries</div>
            <div className="text-2xl font-black text-amber-500 font-mono mt-0.5">{pendingCount}</div>
          </div>
          <Clock className="h-6 w-6 text-amber-500/40" />
        </div>
        <div className="p-4 rounded-2xl bg-card border border-border/70 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-mono text-muted-foreground uppercase">Direct JaagrMind Desk</div>
            <div className="text-2xl font-black text-sky-500 font-mono mt-0.5">{jaagrMindCount}</div>
          </div>
          <HeartHandshake className="h-6 w-6 text-sky-500/40" />
        </div>
        <div className="p-4 rounded-2xl bg-card border border-border/70 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-mono text-muted-foreground uppercase">Total Inquiries Logged</div>
            <div className="text-2xl font-black text-foreground font-mono mt-0.5">{inquiries.length}</div>
          </div>
          <ShieldCheck className="h-6 w-6 text-emerald-500/40" />
        </div>
      </div>

      {/* Table Card */}
      <Card className="clay-card border-border/70 overflow-hidden">
        <CardHeader className="p-5 border-b border-border/40 flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle className="text-base font-bold">Incoming Parent Notes</CardTitle>
            <CardDescription className="text-xs">
              Manage queries, review context, and record guidance notes.
            </CardDescription>
          </div>
          <div className="relative w-64">
            <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search parent, student, topic..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 text-xs pl-8"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-xs text-muted-foreground font-mono">
              <Loader2 className="h-6 w-6 animate-spin text-sky-500 mx-auto mb-2" />
              Loading parent inquiries...
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <MessageSquare className="h-8 w-8 text-muted-foreground/40 mx-auto" />
              <p className="text-xs font-semibold text-foreground">No parent inquiries found</p>
              <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
                Parent messages sent via the guardian dashboard will appear here immediately.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border/50 bg-secondary/20">
                  <TableHead className="text-xs font-bold font-mono uppercase">Parent & Student</TableHead>
                  <TableHead className="text-xs font-bold font-mono uppercase">Route Target</TableHead>
                  <TableHead className="text-xs font-bold font-mono uppercase">Subject & Message</TableHead>
                  <TableHead className="text-xs font-bold font-mono uppercase">Status</TableHead>
                  <TableHead className="text-xs font-bold font-mono uppercase">Date</TableHead>
                  <TableHead className="text-xs font-bold font-mono uppercase text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((inq) => (
                  <TableRow key={inq.id} className="border-border/40 hover:bg-secondary/10">
                    <TableCell>
                      <div className="space-y-0.5">
                        <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          <User className="h-3 w-3 text-muted-foreground" />
                          <span>{inq.parent_name}</span>
                        </div>
                        <div className="text-[11px] text-muted-foreground font-mono">
                          {inq.parent_email}
                        </div>
                        <div className="text-[11px] text-sky-600 dark:text-sky-400 font-semibold">
                          Child: {inq.student_name}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {inq.target_recipient === "superadmin" ? (
                          <Badge variant="outline" className="text-[10px] font-mono text-sky-600 dark:text-sky-400 bg-sky-500/10 border-sky-500/20">
                            JaagrMind Desk
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20">
                            School Counselor
                          </Badge>
                        )}
                        <div className="text-[10px] text-muted-foreground flex items-center gap-1 font-mono">
                          <Building2 className="h-2.5 w-2.5" />
                          <span>{inq.school_name || "Independent"}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <div className="space-y-0.5">
                        <div className="text-xs font-semibold text-foreground line-clamp-1">
                          {inq.subject}
                        </div>
                        <p className="text-[11px] text-muted-foreground line-clamp-2">
                          {inq.message}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {inq.status === "resolved" ? (
                        <Badge variant="outline" className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20">
                          Resolved
                        </Badge>
                      ) : inq.status === "in_progress" ? (
                        <Badge variant="outline" className="text-[10px] font-mono text-sky-600 dark:text-sky-400 bg-sky-500/10 border-sky-500/20">
                          In Progress
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] font-mono text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20">
                          Pending
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">
                      {inq.created_at ? inq.created_at.split("T")[0] : "Recent"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenModal(inq)}
                        className="text-xs h-7 neo-well"
                      >
                        {inq.target_recipient === "school_counselor" || inq.counselor_type === "school_counselor" ? (
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Eye className="h-3 w-3 text-amber-500" /> View Only
                          </span>
                        ) : (
                          "Review Note"
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Review & Resolution Dialog */}
      {activeInquiry && (() => {
        const isSchoolCounselorInquiry =
          activeInquiry.target_recipient === "school_counselor" ||
          activeInquiry.counselor_type === "school_counselor";

        return (
          <Dialog open={!!activeInquiry} onOpenChange={() => setActiveInquiry(null)}>
            <DialogContent className="sm:max-w-lg clay-card p-6">
              <DialogHeader className="space-y-1 pb-3 border-b border-border/40">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold uppercase text-sky-600 dark:text-sky-400">
                    {isSchoolCounselorInquiry ? "SCHOOL COUNSELOR INQUIRY" : "JAAGRMIND DESK QUERY"}
                  </span>
                  {isSchoolCounselorInquiry ? (
                    <Badge variant="outline" className="text-[10px] font-mono border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10 flex items-center gap-1">
                      <Eye className="h-3 w-3" /> View Only (School Counselor)
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] font-mono">
                      From {activeInquiry.parent_name}
                    </Badge>
                  )}
                </div>
                <DialogTitle className="text-base font-bold text-foreground">
                  {activeInquiry.subject}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Relating to student: <strong className="text-foreground">{activeInquiry.student_name}</strong> • School: {activeInquiry.school_name}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 pt-2">
                {/* School Counselor View-Only Warning Notice */}
                {isSchoolCounselorInquiry && (
                  <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-xs text-amber-800 dark:text-amber-300 space-y-1">
                    <div className="font-semibold flex items-center gap-1.5 text-amber-700 dark:text-amber-300">
                      <ShieldAlert className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                      School Counselor Assigned (View-Only Privileges)
                    </div>
                    <p className="text-[11px] leading-relaxed text-muted-foreground">
                      This inquiry is confidential and was routed directly to the designated school counselor at <strong className="text-foreground">{activeInquiry.school_name}</strong>. As JaagrMind Superadmin, you have view-only monitoring access to oversee platform wellbeing. You cannot reply to or resolve queries assigned to institutional school counselors.
                    </p>
                  </div>
                )}

                {/* Message Box */}
                <div className="p-4 rounded-2xl bg-secondary/30 neo-well space-y-1.5">
                  <div className="text-[10px] font-mono uppercase text-muted-foreground font-semibold">
                    Parent Message
                  </div>
                  <p className="text-xs text-foreground/95 whitespace-pre-wrap leading-relaxed">
                    {activeInquiry.message}
                  </p>
                  <div className="text-[10px] text-muted-foreground font-mono pt-1">
                    Contact: <a href={`mailto:${activeInquiry.parent_email}`} className="text-sky-600 dark:text-sky-400 underline">{activeInquiry.parent_email}</a>
                  </div>
                </div>

                {/* Read-Only Status & Resolution if School Counselor Inquiry */}
                {isSchoolCounselorInquiry ? (
                  <div className="space-y-1.5 pt-1">
                    <div className="text-[10px] font-mono uppercase text-muted-foreground font-semibold flex items-center gap-1">
                      <Lock className="h-3 w-3" /> Counselor Response & Status
                    </div>
                    <div className="p-3 rounded-xl neo-well border border-border/60 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Inquiry Status:</span>
                        <Badge variant="outline" className="text-[10px] font-mono capitalize">
                          {activeInquiry.status}
                        </Badge>
                      </div>
                      {activeInquiry.resolution_notes ? (
                        <div className="pt-2 border-t border-border/40">
                          <span className="text-[11px] font-medium text-foreground block mb-1">
                            School Counselor Notes:
                          </span>
                          <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                            {activeInquiry.resolution_notes}
                          </p>
                        </div>
                      ) : (
                        <p className="text-[11px] text-muted-foreground italic">
                          No resolution notes logged yet by the school counselor.
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Status Selector for JaagrMind Central Desk Inquiries */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">Inquiry Status</label>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant={resolutionStatus === "pending" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setResolutionStatus("pending")}
                          className="text-xs h-8"
                        >
                          Pending
                        </Button>
                        <Button
                          type="button"
                          variant={resolutionStatus === "in_progress" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setResolutionStatus("in_progress")}
                          className="text-xs h-8"
                        >
                          In Progress
                        </Button>
                        <Button
                          type="button"
                          variant={resolutionStatus === "resolved" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setResolutionStatus("resolved")}
                          className="text-xs h-8"
                        >
                          Resolved
                        </Button>
                      </div>
                    </div>

                    {/* Resolution Notes for JaagrMind Central Desk Inquiries */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">Counselor Follow-up / Resolution Notes</label>
                      <Textarea
                        placeholder="Record what guidance was provided or follow-up email sent to the parent..."
                        value={resolutionNotes}
                        onChange={(e) => setResolutionNotes(e.target.value)}
                        rows={3}
                        className="text-xs resize-none"
                      />
                    </div>
                  </>
                )}
              </div>

              <DialogFooter className="pt-3 border-t border-border/40">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveInquiry(null)}
                  className="text-xs"
                >
                  {isSchoolCounselorInquiry ? "Close View" : "Cancel"}
                </Button>
                {!isSchoolCounselorInquiry && (
                  <Button
                    size="sm"
                    onClick={handleUpdateInquiry}
                    disabled={updating}
                    className="text-xs bg-sky-600 hover:bg-sky-700 text-white"
                  >
                    {updating ? "Saving..." : "Save Update"}
                  </Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        );
      })()}
    </div>
  );
}
