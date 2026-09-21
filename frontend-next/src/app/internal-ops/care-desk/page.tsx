"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Mail,
  Clock,
  CheckCircle2,
  Loader2,
  AlertCircle,
  MessageSquare,
  FileText,
  Building2,
  RefreshCw,
  Video,
  ExternalLink,
  Calendar,
  Send,
  ShieldCheck,
  FolderOpen,
  Eye,
  Lock,
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { api } from "@/lib/api";
import { parseMeetingLink } from "@/lib/meeting-utils";
import { type InquiryMessageItem } from "@/components/parent/parent-conversation-thread-dialog";
import { StudentDossierDialog, StudentProfileData } from "@/components/student-dossier-dialog";

interface CentralInquiry {
  id: string;
  parent_id: string;
  student_id: string;
  student_name: string;
  school_id: string;
  school_name?: string;
  counselor_id?: string;
  counselor_name?: string;
  counselor_type: string;
  target_recipient: string;
  parent_name: string;
  parent_email: string;
  subject: string;
  note: string;
  status: "pending" | "in_progress" | "resolved";
  resolution_notes?: string;
  meeting_date?: string;
  meeting_time?: string;
  meeting_link?: string;
  created_at: string;
}

export default function CareDeskPage() {
  const { user, isSuperAdmin } = useAuth();

  const [inquiries, setInquiries] = useState<CentralInquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "independent" | "school" | "meetings">("all");

  // Clinical Review Modal State
  const [selectedCase, setSelectedCase] = useState<CentralInquiry | null>(null);
  const [caseStatus, setCaseStatus] = useState<"pending" | "in_progress" | "resolved">("pending");
  const [meetingDate, setMeetingDate] = useState("");
  const [meetingTime, setMeetingTime] = useState("");
  const [meetingLink, setMeetingLink] = useState("");
  const [caseMessages, setCaseMessages] = useState<InquiryMessageItem[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [isCaseModalOpen, setIsCaseModalOpen] = useState(false);
  const [savingCase, setSavingCase] = useState(false);
  const [caseSuccessMsg, setCaseSuccessMsg] = useState("");
  const [caseError, setCaseError] = useState("");

  // Student Dossier & Concurrency Claim State
  const [isDossierOpen, setIsDossierOpen] = useState(false);
  const [dossierStudent, setDossierStudent] = useState<StudentProfileData | null>(null);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const inqData = await api.get<CentralInquiry[]>("/api/care-desk/inquiries").catch(() => []);
      setInquiries(Array.isArray(inqData) ? inqData : []);
    } catch (err) {
      console.error("Failed to load Care Desk data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // Open Clinical Case Review Modal
  const handleOpenCase = (inq: CentralInquiry) => {
    setSelectedCase(inq);
    setCaseStatus((inq.status as any) || "pending");
    setMeetingDate(inq.meeting_date || "");
    setMeetingTime(inq.meeting_time || "");
    setMeetingLink(inq.meeting_link || "");
    setCaseSuccessMsg("");
    setCaseError("");
    setReplyText("");
    setIsCaseModalOpen(true);
    loadCaseMessages(inq.id);
  };

  const handleClaimCase = async (inquiryId: string) => {
    try {
      setClaimingId(inquiryId);
      const res: any = await api.post(`/api/care-desk/inquiries/${inquiryId}/claim`, {});
      if (res?.success) {
        await fetchData();
        if (selectedCase && selectedCase.id === inquiryId) {
          setSelectedCase((prev) =>
            prev
              ? {
                  ...prev,
                  counselor_id: res.counselor_id,
                  counselor_name: res.claimed_by,
                  status: "in_progress",
                }
              : null
          );
        }
      }
    } catch (err: any) {
      alert(err.message || "Failed to claim inquiry.");
      await fetchData();
    } finally {
      setClaimingId(null);
    }
  };

  const handleOpenDossier = (studentId: string, studentName: string, schoolName?: string) => {
    if (!studentId) return;
    setDossierStudent({
      id: studentId,
      access_id: "STUDENT-PROFILE",
      name: studentName,
      grade: "—",
      section: "—",
      school_id: "",
      school_name: schoolName || "Independent Family",
      archetype: "sprinter",
      focus_score: 72,
      resilience_score: 70,
      academic_tenacity: 74,
      stress_adaptability: 68,
      primary_friction: "Family-Reported Psychological Concern",
      momentum_trend: "stable",
      last_check_in_date: new Date().toISOString(),
      check_in_count: 1,
    });
    setIsDossierOpen(true);
  };

  const loadCaseMessages = async (inquiryId: string) => {
    setLoadingMessages(true);
    try {
      const msgs = await api.get<InquiryMessageItem[]>(`/api/care-desk/inquiries/${inquiryId}/messages`);
      setCaseMessages(Array.isArray(msgs) ? msgs : []);
    } catch (e) {
      console.error("Failed to load inquiry messages", e);
    } finally {
      setLoadingMessages(false);
    }
  };

  // Send Two-Way Reply
  const handleSendReply = async () => {
    if (!selectedCase || !replyText.trim()) return;
    setSendingReply(true);
    setCaseError("");
    try {
      await api.post(`/api/care-desk/inquiries/${selectedCase.id}/reply`, {
        message: replyText.trim(),
        meeting_date: meetingDate,
        meeting_time: meetingTime,
        meeting_link: meetingLink,
        status: caseStatus,
      });
      setReplyText("");
      await loadCaseMessages(selectedCase.id);
      setInquiries((prev) =>
        prev.map((item) =>
          item.id === selectedCase.id
            ? {
                ...item,
                status: caseStatus,
                meeting_date: meetingDate,
                meeting_time: meetingTime,
                meeting_link: meetingLink,
              }
            : item
        )
      );
      setCaseSuccessMsg("Care response delivered and consultation details updated.");
      setTimeout(() => setCaseSuccessMsg(""), 3000);
    } catch (err: any) {
      setCaseError(err.message || "Failed to post reply.");
    } finally {
      setSendingReply(false);
    }
  };

  // Save Case Schedule & Disposition
  const handleSaveCase = async () => {
    if (!selectedCase) return;
    setSavingCase(true);
    setCaseError("");
    setCaseSuccessMsg("");

    try {
      await api.put(`/api/care-desk/inquiries/${selectedCase.id}`, {
        status: caseStatus,
        meeting_date: meetingDate,
        meeting_time: meetingTime,
        meeting_link: meetingLink,
      });

      setInquiries((prev) =>
        prev.map((item) =>
          item.id === selectedCase.id
            ? {
                ...item,
                status: caseStatus,
                meeting_date: meetingDate,
                meeting_time: meetingTime,
                meeting_link: meetingLink,
              }
            : item
        )
      );

      setCaseSuccessMsg("Consultation schedule and case status saved successfully.");
      setTimeout(() => {
        setIsCaseModalOpen(false);
        setCaseSuccessMsg("");
      }, 1200);
    } catch (err: any) {
      setCaseError(err.message || "Failed to update case.");
    } finally {
      setSavingCase(false);
    }
  };

  // Telemetry Aggregates
  const totalInquiries = inquiries.length;
  const pendingCases = inquiries.filter((i) => i.status === "pending" || i.status === "in_progress").length;
  const scheduledMeetings = inquiries.filter((i) => Boolean(i.meeting_link || i.meeting_date)).length;
  const resolvedCases = inquiries.filter((i) => i.status === "resolved").length;

  // Filtered List
  const filteredInquiries = useMemo(() => {
    return inquiries.filter((inq) => {
      // Tab filter
      if (activeTab === "independent") {
        if (inq.target_recipient !== "superadmin" && inq.school_name) return false;
      } else if (activeTab === "school") {
        if (!inq.school_name && inq.target_recipient === "superadmin") return false;
      } else if (activeTab === "meetings") {
        if (!inq.meeting_link && !inq.meeting_date) return false;
      }

      // Search filter
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        inq.subject?.toLowerCase().includes(q) ||
        inq.student_name?.toLowerCase().includes(q) ||
        inq.parent_name?.toLowerCase().includes(q) ||
        inq.parent_email?.toLowerCase().includes(q) ||
        inq.school_name?.toLowerCase().includes(q)
      );
    });
  }, [inquiries, activeTab, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Top Banner & Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              JaagrMind Care Desk
            </h1>
            <Badge variant="outline" className="text-xs font-mono border-primary/30 text-primary bg-primary/10">
              Central Care Telemetry
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Centralized consultation queue, virtual appointment scheduling, and care specialist roster.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="text-xs gap-1.5 h-9"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Metric Telemetry Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-xl border-border/70 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider">
                Total Inquiries
              </p>
              <h3 className="text-2xl font-bold text-foreground mt-1">{totalInquiries}</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Platform consultation intake</p>
            </div>
            <div className="p-2.5 rounded-xl bg-muted text-muted-foreground">
              <MessageSquare className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-border/70 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider">
                Awaiting Response
              </p>
              <h3 className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
                {pendingCases}
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Needs review or in-progress</p>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Clock className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-border/70 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider">
                Virtual Sessions
              </p>
              <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                {scheduledMeetings}
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Google Meet & WhatsApp links</p>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Video className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-border/70 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider">
                Resolved Consultations
              </p>
              <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{resolvedCases}</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Completed care cycles</p>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Triage Queue & Tabs */}
      <Card className="rounded-2xl border-border/70 shadow-xs">
        <CardHeader className="p-5 pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5 border border-border/70 p-1 rounded-xl bg-muted/30">
              <Button
                size="sm"
                variant={activeTab === "all" ? "default" : "ghost"}
                onClick={() => setActiveTab("all")}
                className="h-7 px-3 text-xs"
              >
                All Cases ({inquiries.length})
              </Button>
              <Button
                size="sm"
                variant={activeTab === "independent" ? "default" : "ghost"}
                onClick={() => setActiveTab("independent")}
                className="h-7 px-3 text-xs"
              >
                Independent Families
              </Button>
              <Button
                size="sm"
                variant={activeTab === "school" ? "default" : "ghost"}
                onClick={() => setActiveTab("school")}
                className="h-7 px-3 text-xs"
              >
                School Inquiries
              </Button>
              <Button
                size="sm"
                variant={activeTab === "meetings" ? "default" : "ghost"}
                onClick={() => setActiveTab("meetings")}
                className="h-7 px-3 text-xs"
              >
                Virtual Consultations
              </Button>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter by subject, student, parent..."
                className="pl-8 h-8 text-xs bg-background"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              Loading inquiry queue...
            </div>
          ) : filteredInquiries.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              No inquiries found matching the current criteria.
            </div>
          ) : (
            <>
              {/* Desktop / Tablet Table View */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Case & Subject</TableHead>
                      <TableHead className="text-xs">Student</TableHead>
                      <TableHead className="text-xs">Parent / Guardian</TableHead>
                      <TableHead className="text-xs">Affiliation</TableHead>
                      <TableHead className="text-xs">Status & Session</TableHead>
                      <TableHead className="text-xs">Date</TableHead>
                      <TableHead className="text-xs text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInquiries.map((inq) => {
                      const meetingInfo = parseMeetingLink(inq.meeting_link);
                      return (
                        <TableRow key={inq.id} className="hover:bg-muted/30">
                          <TableCell>
                            <div className="font-semibold text-xs text-foreground">
                              {inq.subject}
                            </div>
                            <div className="text-[10px] font-mono text-muted-foreground">
                              #{inq.id.slice(0, 8)}
                            </div>
                          </TableCell>

                          <TableCell className="text-xs font-medium text-foreground">
                            <div>{inq.student_name}</div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenDossier(inq.student_id, inq.student_name, inq.school_name);
                              }}
                              className="text-[10px] text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 mt-0.5 cursor-pointer"
                            >
                              <FolderOpen className="h-3 w-3" />
                              <span>View Dossier</span>
                            </button>
                          </TableCell>

                          <TableCell className="text-xs text-muted-foreground">
                            <div className="font-medium text-foreground">{inq.parent_name}</div>
                            <div className="text-[11px]">{inq.parent_email}</div>
                          </TableCell>

                          <TableCell className="text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              <Building2 className="w-3 h-3 text-muted-foreground/70" />
                              {inq.school_name || "JaagrMind Central"}
                            </span>
                          </TableCell>

                          <TableCell>
                            <div className="space-y-1">
                              <Badge
                                variant="outline"
                                className={`text-[10px] font-mono ${
                                  inq.status === "resolved"
                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                    : inq.status === "in_progress"
                                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                                    : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                                }`}
                              >
                                {inq.status === "resolved"
                                  ? "Resolved"
                                  : inq.status === "in_progress"
                                  ? "In Progress"
                                  : "Needs Review"}
                              </Badge>

                              {/* Concurrency / Claim Badge */}
                              {inq.counselor_name ? (
                                <div className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                                  <ShieldCheck className="h-3 w-3 text-sky-500 shrink-0" />
                                  <span className="truncate max-w-[120px]">{inq.counselor_name}</span>
                                </div>
                              ) : (
                                <div className="text-[10px] text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                                  <Clock className="h-3 w-3 text-amber-500 shrink-0" />
                                  <span>Open • Unassigned</span>
                                </div>
                              )}

                              {meetingInfo && (
                                <div>
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${meetingInfo.badgeClass}`}>
                                    <Video className="w-2.5 h-2.5" />
                                    {meetingInfo.label}
                                  </span>
                                </div>
                              )}
                            </div>
                          </TableCell>

                          <TableCell className="text-[11px] text-muted-foreground font-mono">
                            {inq.created_at ? new Date(inq.created_at).toLocaleDateString() : ""}
                          </TableCell>

                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenDossier(inq.student_id, inq.student_name, inq.school_name)}
                                className="h-7 px-2 text-xs gap-1 border-border font-medium hover:bg-muted/50 cursor-pointer"
                                title="Open Student Wellbeing Dossier"
                              >
                                <FolderOpen className="h-3 w-3 text-primary" />
                                <span className="hidden sm:inline">Dossier</span>
                              </Button>

                              {!inq.counselor_id ? (
                                <Button
                                  size="sm"
                                  disabled={claimingId === inq.id}
                                  onClick={() => handleClaimCase(inq.id)}
                                  className="h-7 px-2.5 text-xs bg-amber-600 hover:bg-amber-700 text-white font-medium shadow-xs cursor-pointer gap-1"
                                >
                                  {claimingId === inq.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <ShieldCheck className="h-3 w-3" />}
                                  <span>Claim & Review</span>
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  onClick={() => handleOpenCase(inq)}
                                  className="h-7 px-3 text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-xs cursor-pointer"
                                >
                                  Review & Schedule
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden divide-y divide-border/60">
                {filteredInquiries.map((inq) => {
                  const meetingInfo = parseMeetingLink(inq.meeting_link);
                  return (
                    <div key={inq.id} className="p-4 space-y-3 hover:bg-muted/20 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-semibold text-xs text-foreground leading-snug">
                            {inq.subject}
                          </div>
                          <div className="text-[10px] font-mono text-muted-foreground mt-0.5">
                            #{inq.id.slice(0, 8)} &bull; {inq.created_at ? new Date(inq.created_at).toLocaleDateString() : ""}
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-mono shrink-0 ${
                            inq.status === "resolved"
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                              : inq.status === "in_progress"
                              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                              : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                          }`}
                        >
                          {inq.status === "resolved"
                            ? "Resolved"
                            : inq.status === "in_progress"
                            ? "In Progress"
                            : "Needs Review"}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs py-2 px-2.5 rounded-lg bg-muted/30 border border-border/40">
                        <div>
                          <span className="text-[10px] text-muted-foreground uppercase font-medium block">Student</span>
                          <span className="font-medium text-foreground block truncate">{inq.student_name}</span>
                          <button
                            type="button"
                            onClick={() => handleOpenDossier(inq.student_id, inq.student_name, inq.school_name)}
                            className="text-[10px] text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 mt-0.5 cursor-pointer"
                          >
                            <FolderOpen className="h-3 w-3" />
                            <span>Dossier</span>
                          </button>
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-foreground uppercase font-medium block">Parent</span>
                          <span className="font-medium text-foreground block truncate">{inq.parent_name}</span>
                          <span className="text-[10px] text-muted-foreground block truncate">{inq.parent_email}</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                            <Building2 className="w-3 h-3 text-muted-foreground/70" />
                            {inq.school_name || "JaagrMind Central"}
                          </span>
                          {inq.counselor_name ? (
                            <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                              <ShieldCheck className="h-3 w-3 text-sky-500 shrink-0" />
                              <span className="truncate max-w-[100px]">{inq.counselor_name}</span>
                            </span>
                          ) : (
                            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                              <Clock className="h-3 w-3 text-amber-500 shrink-0" />
                              <span>Unassigned</span>
                            </span>
                          )}
                        </div>
                        {meetingInfo && (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${meetingInfo.badgeClass}`}>
                            <Video className="w-2.5 h-2.5" />
                            {meetingInfo.label}
                          </span>
                        )}
                      </div>

                      <div className="pt-1 flex items-center gap-2">
                        {!inq.counselor_id ? (
                          <Button
                            size="sm"
                            disabled={claimingId === inq.id}
                            onClick={() => handleClaimCase(inq.id)}
                            className="w-full h-8 text-xs bg-amber-600 hover:bg-amber-700 text-white font-medium shadow-xs cursor-pointer gap-1.5"
                          >
                            {claimingId === inq.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                            <span>Claim & Review Case</span>
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handleOpenCase(inq)}
                            className="w-full h-8 text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-xs cursor-pointer"
                          >
                            Review & Schedule
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Clinical Review & Scheduling Modal */}
      <Dialog open={isCaseModalOpen} onOpenChange={setIsCaseModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[88vh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl border-border bg-card">
          <DialogHeader className="p-5 border-b border-border/60 bg-muted/20">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground">
                Central Care Consultation Case
              </span>
              <Badge variant="outline" className="text-[10px] font-mono">
                Case #{selectedCase?.id.slice(0, 8)}
              </Badge>
            </div>
            <DialogTitle className="text-lg font-bold text-foreground">
              {selectedCase?.subject}
            </DialogTitle>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
              <DialogDescription className="text-xs">
                Student: <span className="font-semibold text-foreground">{selectedCase?.student_name}</span> &bull; Parent:{" "}
                <span className="font-semibold text-foreground">{selectedCase?.parent_name}</span> ({selectedCase?.parent_email})
              </DialogDescription>
              {selectedCase && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenDossier(selectedCase.student_id, selectedCase.student_name, selectedCase.school_name)}
                  className="h-7 text-xs gap-1.5 border-sky-500/30 text-sky-600 dark:text-sky-400 bg-sky-500/5 hover:bg-sky-500/10 cursor-pointer self-start sm:self-auto"
                >
                  <FolderOpen className="h-3.5 w-3.5" />
                  <span>View Student Dossier</span>
                </Button>
              )}
            </div>
          </DialogHeader>

          {selectedCase && (
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Virtual Consultation Scheduler */}
              <div className="p-4 rounded-xl border border-border/70 bg-background space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Video className="w-4 h-4 text-primary" />
                    <span className="text-xs font-bold text-foreground">
                      Virtual Consultation Scheduler
                    </span>
                  </div>
                  {(() => {
                    const info = parseMeetingLink(meetingLink);
                    if (!info) return null;
                    return (
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${info.badgeClass}`}>
                        {info.label}
                      </span>
                    );
                  })()}
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-muted-foreground">
                    Meeting Link (Google Meet, WhatsApp Meet, Zoom)
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      value={meetingLink}
                      onChange={(e) => setMeetingLink(e.target.value)}
                      placeholder="e.g. https://meet.google.com/xyz-abcd-efg or https://wa.me/919876543210"
                      className="text-xs h-9 font-mono"
                    />
                    {meetingLink.trim() && (
                      <a
                        href={meetingLink.startsWith("http") ? meetingLink : `https://${meetingLink}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium bg-muted hover:bg-muted/80 text-foreground shrink-0 border border-border"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Test</span>
                      </a>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Date
                    </label>
                    <Input
                      type="date"
                      value={meetingDate}
                      onChange={(e) => setMeetingDate(e.target.value)}
                      className="text-xs h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Time
                    </label>
                    <Input
                      type="time"
                      value={meetingTime}
                      onChange={(e) => setMeetingTime(e.target.value)}
                      className="text-xs h-9"
                    />
                  </div>
                </div>
              </div>

              {/* Chronological Conversation History */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5" />
                    Conversation History ({caseMessages.length})
                  </span>
                  {loadingMessages && <Loader2 className="w-3 h-3 animate-spin" />}
                </div>

                <div className="max-h-56 overflow-y-auto p-3.5 rounded-xl border border-border/60 bg-muted/20 space-y-3">
                  {caseMessages.length === 0 ? (
                    <div className="p-3 rounded-lg bg-background border border-border/40 text-xs">
                      <span className="font-semibold text-muted-foreground block text-[11px]">Initial Parent Note:</span>
                      <p className="text-foreground whitespace-pre-wrap mt-0.5">{selectedCase.note}</p>
                    </div>
                  ) : (
                    caseMessages.map((m) => {
                      const isParent = m.sender_role === "parent";
                      return (
                        <div
                          key={m.id}
                          className={`flex flex-col ${isParent ? "items-start" : "items-end"}`}
                        >
                          <div className="flex items-center gap-1.5 mb-1 px-1">
                            <span className="text-[11px] font-semibold text-foreground">
                              {m.sender_name}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              ({isParent ? "Parent" : "Central Counselor"})
                            </span>
                            <span className="text-[10px] text-muted-foreground ml-1">
                              {m.created_at ? new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                            </span>
                          </div>
                          <div
                            className={`max-w-[85%] rounded-xl px-3.5 py-2 text-xs shadow-xs leading-relaxed ${
                              isParent
                                ? "bg-background text-foreground border border-border/70 rounded-tl-xs"
                                : "bg-primary text-primary-foreground rounded-tr-xs"
                            }`}
                          >
                            <p className="whitespace-pre-wrap">{m.message}</p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Two-Way Reply Input */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                  <span>Send Direct Message to Parent</span>
                  <span className="text-[11px] font-normal text-muted-foreground">Appears immediately in parent portal</span>
                </label>
                <div className="flex items-end gap-2">
                  <Textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Provide guidance to the parent, confirmation of meeting link, or instructions..."
                    rows={2}
                    className="text-xs resize-none"
                  />
                  <Button
                    type="button"
                    size="sm"
                    disabled={sendingReply || !replyText.trim()}
                    onClick={handleSendReply}
                    className="h-14 px-4 bg-primary gap-1.5 shrink-0 text-xs"
                  >
                    {sendingReply ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    <span>Reply</span>
                  </Button>
                </div>
              </div>

              {/* Case Disposition Controls */}
              <div className="space-y-2 pt-2 border-t border-border/60">
                <label className="text-xs font-semibold text-foreground">Case Disposition</label>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    type="button"
                    variant={caseStatus === "pending" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCaseStatus("pending")}
                    className="h-8 text-xs font-medium"
                  >
                    Needs Review
                  </Button>
                  <Button
                    type="button"
                    variant={caseStatus === "in_progress" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCaseStatus("in_progress")}
                    className="h-8 text-xs font-medium"
                  >
                    In Progress
                  </Button>
                  <Button
                    type="button"
                    variant={caseStatus === "resolved" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCaseStatus("resolved")}
                    className="h-8 text-xs font-medium"
                  >
                    Resolved
                  </Button>
                </div>
              </div>

              {caseError && (
                <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{caseError}</span>
                </div>
              )}

              {caseSuccessMsg && (
                <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  <span>{caseSuccessMsg}</span>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="p-4 border-t border-border/60 bg-muted/20">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsCaseModalOpen(false)}
              className="text-xs"
            >
              Close
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSaveCase}
              disabled={savingCase}
              className="text-xs bg-primary gap-1.5"
            >
              {savingCase ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              <span>Save Schedule & Disposition</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Full Clinical Student Dossier Dialog */}
      <StudentDossierDialog
        isOpen={isDossierOpen}
        onClose={() => setIsDossierOpen(false)}
        student={dossierStudent}
        isCareDesk={true}
      />
    </div>
  );
}
