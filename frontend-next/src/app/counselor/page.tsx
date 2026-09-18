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
  Clock,
  CheckCircle2,
  Loader2,
  AlertCircle,
  MessageSquare,
  FolderOpen,
  Inbox,
  Users,
  RefreshCw,
  Video,
  ExternalLink,
  Calendar,
  Send,
  GraduationCap,
  Sparkles,
  Activity,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { api } from "@/lib/api";
import { parseMeetingLink } from "@/lib/meeting-utils";
import { type InquiryMessageItem } from "@/components/parent/parent-conversation-thread-dialog";
import { StudentDossierDialog, StudentProfileData } from "@/components/student-dossier-dialog";
import Link from "next/link";

interface ParentInquiry {
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
  message: string;
  status: "pending" | "in_progress" | "resolved";
  resolution_notes?: string;
  meeting_date?: string;
  meeting_time?: string;
  meeting_link?: string;
  created_at: string;
}

interface StudentItem {
  id: string;
  name: string;
  grade: string;
  section: string;
  access_id: string;
  resilience_score?: number;
  focus_score?: number;
  primary_friction?: string;
  momentum_trend?: string;
}

export default function CounselorPortalPage() {
  const { user } = useAuth();
  const [inquiries, setInquiries] = useState<ParentInquiry[]>([]);
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [analyticsProfiles, setAnalyticsProfiles] = useState<StudentProfileData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Active Desk Tab: "inquiries" | "students"
  const [activeTab, setActiveTab] = useState<"inquiries" | "students">("inquiries");

  // Inquiries Filter & Search
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "in_progress" | "resolved">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Students Filter & Search
  const [studentSearch, setStudentSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [sectionFilter, setSectionFilter] = useState("all");

  // Case Modal State (for Parent Inquiries & Consultations)
  const [selectedCase, setSelectedCase] = useState<ParentInquiry | null>(null);
  const [caseStatus, setCaseStatus] = useState<"pending" | "in_progress" | "resolved">("pending");
  const [caseNotes, setCaseNotes] = useState("");
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

  // Student Dossier Dialog State
  const [isDossierOpen, setIsDossierOpen] = useState(false);
  const [dossierStudent, setDossierStudent] = useState<StudentProfileData | null>(null);

  // Fetch data
  const fetchData = async () => {
    try {
      const [inqData, stuData, analyticsRes] = await Promise.all([
        api.get<ParentInquiry[]>("/api/school/parent-inquiries").catch(() => []),
        api.get<any[]>("/api/school/students").catch(() => []),
        api.get<any>("/api/school/analytics").catch(() => null),
      ]);

      if (Array.isArray(inqData)) setInquiries(inqData);

      const profiles: StudentProfileData[] =
        analyticsRes?.students && Array.isArray(analyticsRes.students)
          ? analyticsRes.students
          : [];
      setAnalyticsProfiles(profiles);

      if (Array.isArray(stuData)) {
        const profileMap = new Map(profiles.map((p) => [p.id, p]));
        const formatted: StudentItem[] = stuData.map((s) => {
          const prof = profileMap.get(s.id);
          return {
            id: s.id,
            name: s.name,
            grade: s.grade,
            section: s.section,
            access_id: s.access_id,
            resilience_score: prof?.resilience_score ?? 70,
            focus_score: prof?.focus_score ?? 74,
            primary_friction: prof?.primary_friction ?? "Classroom voice hesitancy",
            momentum_trend: prof?.momentum_trend ?? "stable",
          };
        });
        setStudents(formatted);
      }
    } catch (err) {
      console.error("Failed to fetch counselor data:", err);
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

  // Open Case Modal (Parent Inquiry)
  const handleOpenCase = (inq: ParentInquiry) => {
    setSelectedCase(inq);
    setCaseStatus(inq.status);
    setCaseNotes(inq.resolution_notes || "");
    setMeetingDate(inq.meeting_date || "");
    setMeetingTime(inq.meeting_time || "");
    setMeetingLink(inq.meeting_link || "");
    setReplyText("");
    setCaseError("");
    setCaseSuccessMsg("");
    setIsCaseModalOpen(true);
    loadCaseMessages(inq.id);
  };

  const loadCaseMessages = async (inquiryId: string) => {
    setLoadingMessages(true);
    try {
      const msgs = await api.get<InquiryMessageItem[]>(`/api/school/parent-inquiries/${inquiryId}/messages`);
      setCaseMessages(Array.isArray(msgs) ? msgs : []);
    } catch (e) {
      console.error("Failed to load messages:", e);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSendReply = async () => {
    if (!selectedCase || !replyText.trim()) return;
    setSendingReply(true);
    setCaseError("");
    try {
      await api.post(`/api/school/parent-inquiries/${selectedCase.id}/reply`, {
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
      setCaseSuccessMsg("Reply posted and consultation schedule updated.");
      setTimeout(() => setCaseSuccessMsg(""), 3000);
    } catch (err: any) {
      setCaseError(err.message || "Failed to post reply.");
    } finally {
      setSendingReply(false);
    }
  };

  // Save Case Status & Notes
  const handleSaveCase = async () => {
    if (!selectedCase) return;
    setSavingCase(true);
    setCaseError("");
    setCaseSuccessMsg("");

    try {
      await api.put(`/api/school/parent-inquiries/${selectedCase.id}`, {
        status: caseStatus,
        resolution_notes: caseNotes,
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
                resolution_notes: caseNotes,
                meeting_date: meetingDate,
                meeting_time: meetingTime,
                meeting_link: meetingLink,
              }
            : item
        )
      );

      setCaseSuccessMsg("Case disposition updated successfully.");
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

  // Open Dossier Dialog
  const handleOpenDossier = (studentId: string, studentName: string) => {
    const existing = analyticsProfiles.find((p) => p.id === studentId);
    if (existing) {
      setDossierStudent(existing);
    } else {
      const basic = students.find((s) => s.id === studentId);
      setDossierStudent({
        id: studentId,
        access_id: basic?.access_id || "STU-REF",
        name: studentName,
        grade: basic?.grade || "9",
        section: basic?.section || "A",
        school_id: "",
        archetype: "sprinter",
        focus_score: 75,
        resilience_score: 68,
        academic_tenacity: 74,
        stress_adaptability: 65,
        primary_friction: "Classroom voice hesitancy & exam stress",
        momentum_trend: "stable",
        last_check_in_date: new Date().toISOString(),
        check_in_count: 2,
      });
    }
    setIsDossierOpen(true);
  };

  // Telemetry Counts
  const telemetry = useMemo(() => {
    const pending = inquiries.filter((i) => i.status === "pending").length;
    const inProgress = inquiries.filter((i) => i.status === "in_progress").length;
    const resolved = inquiries.filter((i) => i.status === "resolved").length;
    const totalStudents = students.length;

    return {
      pending,
      inProgress,
      resolved,
      totalStudents,
    };
  }, [inquiries, students]);

  // Filter inquiries
  const filteredInquiries = useMemo(() => {
    return inquiries.filter((item) => {
      const matchStatus = statusFilter === "all" || item.status === statusFilter;
      const q = searchQuery.toLowerCase();
      const matchQuery =
        !q ||
        item.student_name.toLowerCase().includes(q) ||
        item.parent_name.toLowerCase().includes(q) ||
        item.subject.toLowerCase().includes(q) ||
        item.message.toLowerCase().includes(q);
      return matchStatus && matchQuery;
    });
  }, [inquiries, statusFilter, searchQuery]);

  // Filter students
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const matchGrade = gradeFilter === "all" || s.grade === gradeFilter;
      const matchSection = sectionFilter === "all" || s.section.toLowerCase() === sectionFilter.toLowerCase();
      const q = studentSearch.toLowerCase();
      const matchSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.access_id.toLowerCase().includes(q);
      return matchGrade && matchSection && matchSearch;
    });
  }, [students, gradeFilter, sectionFilter, studentSearch]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground">
              Institutional Guidance Portal
            </span>
            {telemetry.pending > 0 ? (
              <Badge
                variant="outline"
                className="text-[10px] font-mono text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20"
              >
                {telemetry.pending} Case{telemetry.pending > 1 ? "s" : ""} Awaiting Review
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
              >
                All Clear
              </Badge>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mt-1 flex items-center gap-2.5">
            <HeartHandshake className="h-6 w-6 text-primary" />
            <span>Counselor Desk & Clinical Care</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Longitudinal student wellness monitoring, parent consultations, and developmental case disposition.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Link href="/counselor/dossiers">
            <Button size="sm" variant="outline" className="h-9 text-xs gap-1.5 border-border hover:bg-muted font-medium">
              <FolderOpen className="h-3.5 w-3.5 text-primary" />
              <span>Full Dossier Archive</span>
            </Button>
          </Link>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="h-9 text-xs gap-1.5"
            title="Refresh case data"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>

      {/* Counselor Telemetry KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Needs Review */}
        <Card className="rounded-xl border-border/70 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
                Needs Review
              </div>
              <div className="text-2xl font-bold mt-1 text-amber-600 dark:text-amber-400">
                {loading ? "..." : telemetry.pending}
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                Unanswered parent inquiries
              </div>
            </div>
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
              <Inbox className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* In Progress */}
        <Card className="rounded-xl border-border/70 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
                In Progress
              </div>
              <div className="text-2xl font-bold mt-1 text-sky-600 dark:text-sky-400">
                {loading ? "..." : telemetry.inProgress}
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                Active parent consultations
              </div>
            </div>
            <div className="h-10 w-10 rounded-xl bg-sky-500/10 text-sky-600 flex items-center justify-center shrink-0">
              <Clock className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Resolved */}
        <Card className="rounded-xl border-border/70 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
                Resolved
              </div>
              <div className="text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">
                {loading ? "..." : telemetry.resolved}
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                Concluded guidance cases
              </div>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Students in Care */}
        <Card className="rounded-xl border-border/70 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
                Student Cohort
              </div>
              <div className="text-2xl font-bold mt-1 text-foreground">
                {loading ? "..." : telemetry.totalStudents}
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                Enrolled campus cohort
              </div>
            </div>
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Users className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Desk Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-border/60 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("inquiries")}
          className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
            activeTab === "inquiries"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          }`}
        >
          <Inbox className="h-3.5 w-3.5" />
          <span>Parent Inquiries & Consultations</span>
          {telemetry.pending > 0 && (
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                activeTab === "inquiries"
                  ? "bg-primary-foreground/20 text-primary-foreground"
                  : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
              }`}
            >
              {telemetry.pending}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("students")}
          className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
            activeTab === "students"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          }`}
        >
          <Users className="h-3.5 w-3.5" />
          <span>Student Cohort & Dossiers</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
              activeTab === "students"
                ? "bg-primary-foreground/20 text-primary-foreground"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {telemetry.totalStudents}
          </span>
        </button>
      </div>

      {/* TAB 1: PARENT INQUIRIES & CONSULTATIONS */}
      {activeTab === "inquiries" && (
        <Card className="border-border/80 shadow-none">
          <CardHeader className="p-4 sm:p-5 border-b border-border/40 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Inbox className="h-4 w-4 text-primary" />
                  <span>Parent Inquiries & Virtual Consultations</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Direct inquiries, home observations, and counseling appointment requests submitted by parents.
                </CardDescription>
              </div>

              {/* Status Filter Tabs */}
              <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg border border-border/60">
                {(["all", "pending", "in_progress", "resolved"] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatusFilter(st)}
                    className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all ${
                      statusFilter === st
                        ? "bg-background text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {st === "all"
                      ? "All"
                      : st === "pending"
                      ? "Needs Review"
                      : st === "in_progress"
                      ? "In Progress"
                      : "Resolved"}
                  </button>
                ))}
              </div>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by student, parent, or keyword..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 text-xs pl-8"
              />
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {loading ? (
              <div className="p-12 text-center text-muted-foreground text-xs flex flex-col items-center justify-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span>Loading parent inquiries...</span>
              </div>
            ) : filteredInquiries.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground text-xs space-y-1">
                <p className="font-semibold text-foreground text-sm">No inquiries match your filter criteria.</p>
                <p>When parents submit questions or consultation requests, they will appear in this triage desk.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50 bg-secondary/20">
                    <TableHead className="text-xs font-bold font-mono uppercase">Student</TableHead>
                    <TableHead className="text-xs font-bold font-mono uppercase">Parent Contact</TableHead>
                    <TableHead className="text-xs font-bold font-mono uppercase">Subject & Concern</TableHead>
                    <TableHead className="text-xs font-bold font-mono uppercase">Status</TableHead>
                    <TableHead className="text-xs font-bold font-mono uppercase">Logged</TableHead>
                    <TableHead className="text-xs font-bold font-mono uppercase text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInquiries.map((inq) => (
                    <TableRow key={inq.id} className="border-border/40 hover:bg-secondary/10">
                      <TableCell>
                        <div className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                          <span>{inq.student_name}</span>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="text-xs space-y-0.5">
                          <div className="font-medium text-foreground">{inq.parent_name}</div>
                          <div className="text-[11px] text-muted-foreground font-mono">{inq.parent_email}</div>
                        </div>
                      </TableCell>

                      <TableCell className="max-w-xs">
                        <div className="text-xs font-medium text-foreground">{inq.subject}</div>
                        <div className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{inq.message}</div>
                      </TableCell>

                      <TableCell>
                        {inq.status === "pending" && (
                          <Badge
                            variant="outline"
                            className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 font-medium"
                          >
                            Needs Review
                          </Badge>
                        )}
                        {inq.status === "in_progress" && (
                          <Badge
                            variant="outline"
                            className="text-[10px] bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20 font-medium"
                          >
                            In Progress
                          </Badge>
                        )}
                        {inq.status === "resolved" && (
                          <Badge
                            variant="outline"
                            className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-medium"
                          >
                            Resolved
                          </Badge>
                        )}
                        {inq.meeting_link && (
                          <div className="pt-1">
                            <span className="inline-flex items-center gap-1 text-[10px] text-sky-600 dark:text-sky-400 font-mono">
                              <Video className="w-2.5 h-2.5" />
                              {parseMeetingLink(inq.meeting_link)?.label || "Consultation Set"}
                            </span>
                          </div>
                        )}
                      </TableCell>

                      <TableCell>
                        <span className="text-[11px] text-muted-foreground font-mono">
                          {new Date(inq.created_at).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                          })}
                        </span>
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenDossier(inq.student_id, inq.student_name)}
                            className="h-7 px-2 text-xs gap-1 border-border font-medium hover:bg-secondary/40"
                            title="Open Student Dossier"
                          >
                            <FolderOpen className="h-3 w-3 text-primary" />
                            <span className="hidden sm:inline">Dossier</span>
                          </Button>

                          <Button
                            size="sm"
                            onClick={() => handleOpenCase(inq)}
                            className="h-7 px-2.5 text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-xs"
                          >
                            <span>Take Action</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* TAB 2: STUDENT COHORT & DOSSIERS */}
      {activeTab === "students" && (
        <Card className="border-border/80 shadow-none">
          <CardHeader className="p-4 sm:p-5 border-b border-border/40 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  <span>Enrolled Student Cohort & Wellbeing Overview</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Inspect student developmental baselines, class distribution, and longitudinal behavioral dossiers.
                </CardDescription>
              </div>

              <Badge variant="outline" className="text-[10px] font-mono self-start sm:self-auto">
                {filteredStudents.length} of {students.length} Students
              </Badge>
            </div>

            {/* Filters Bar */}
            <div className="flex items-center gap-2 flex-wrap pt-1">
              <select
                value={gradeFilter}
                onChange={(e) => setGradeFilter(e.target.value)}
                className="h-8 rounded-md border border-input bg-background px-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-medium"
              >
                <option value="all">All Grades</option>
                <option value="6">Class 6th</option>
                <option value="7">Class 7th</option>
                <option value="8">Class 8th</option>
                <option value="9">Class 9th</option>
                <option value="10">Class 10th</option>
                <option value="11">Class 11th</option>
                <option value="12">Class 12th</option>
              </select>

              <select
                value={sectionFilter}
                onChange={(e) => setSectionFilter(e.target.value)}
                className="h-8 rounded-md border border-input bg-background px-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-medium"
              >
                <option value="all">All Sections</option>
                <option value="A">Section A</option>
                <option value="B">Section B</option>
                <option value="C">Section C</option>
              </select>

              <div className="relative flex-1 min-w-[200px]">
                <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by student name or Access ID..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  className="h-8 text-xs pl-8"
                />
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {loading ? (
              <div className="p-12 text-center text-muted-foreground text-xs flex flex-col items-center justify-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span>Loading student records...</span>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground text-xs space-y-1">
                <p className="font-semibold text-foreground text-sm">No students match your search criteria.</p>
                <p>Adjust your grade, section, or name filters above.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50 bg-secondary/20">
                    <TableHead className="text-xs font-bold font-mono uppercase">Student Name</TableHead>
                    <TableHead className="text-xs font-bold font-mono uppercase">Class & Section</TableHead>
                    <TableHead className="text-xs font-bold font-mono uppercase">Resilience</TableHead>
                    <TableHead className="text-xs font-bold font-mono uppercase">Focus Index</TableHead>
                    <TableHead className="text-xs font-bold font-mono uppercase">Primary Friction Area</TableHead>
                    <TableHead className="text-xs font-bold font-mono uppercase text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((s) => {
                    const isLowResilience = (s.resilience_score ?? 70) < 70;
                    return (
                      <TableRow key={s.id} className="border-border/40 hover:bg-secondary/10">
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-full bg-primary/10 border border-primary/20 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                              {s.name
                                .split(" ")
                                .map((p) => p[0])
                                .slice(0, 2)
                                .join("")
                                .toUpperCase()}
                            </div>
                            <div>
                              <div className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                                <span>{s.name}</span>
                                {isLowResilience && (
                                  <span className="h-1.5 w-1.5 rounded-full bg-rose-500" title="Low resilience baseline" />
                                )}
                              </div>
                              <div className="text-[11px] text-muted-foreground font-mono">ID: {s.access_id}</div>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <GraduationCap className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-xs font-medium text-foreground">
                              Class {s.grade}th - Sec {s.section}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-mono ${
                              (s.resilience_score ?? 70) >= 80
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                : (s.resilience_score ?? 70) < 70
                                ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                                : "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20"
                            }`}
                          >
                            {s.resilience_score ?? 70}/100
                          </Badge>
                        </TableCell>

                        <TableCell>
                          <span className="text-xs font-mono font-medium text-foreground">
                            {s.focus_score ?? 74}/100
                          </span>
                        </TableCell>

                        <TableCell className="max-w-xs">
                          <span className="text-xs text-muted-foreground truncate block">
                            {s.primary_friction || "Classroom voice hesitancy"}
                          </span>
                        </TableCell>

                        <TableCell className="text-right">
                          <div className="flex items-center justify-end">
                            <Button
                              size="sm"
                              onClick={() => handleOpenDossier(s.id, s.name)}
                              className="h-7 px-2.5 text-xs gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-xs"
                            >
                              <FolderOpen className="h-3 w-3" />
                              <span>Inspect Dossier</span>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Case Review & Action Modal (for Inquiries) */}
      <Dialog open={isCaseModalOpen} onOpenChange={setIsCaseModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[88vh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl border-border bg-card">
          <DialogHeader className="p-5 border-b border-border/60 bg-muted/20">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground">
                Counselor Case Review & Consultation
              </span>
              <Badge variant="outline" className="text-[10px] font-mono">
                Case #{selectedCase?.id.slice(0, 8)}
              </Badge>
            </div>
            <DialogTitle className="text-lg font-bold text-foreground">
              {selectedCase?.subject}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Student: <span className="font-semibold text-foreground">{selectedCase?.student_name}</span> &bull; Parent:{" "}
              <span className="font-semibold text-foreground">{selectedCase?.parent_name}</span> ({selectedCase?.parent_email})
            </DialogDescription>
          </DialogHeader>

          {selectedCase && (
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Student Quick Action Bar */}
              <div className="flex items-center justify-between p-3 rounded-xl border border-border/60 bg-muted/30">
                <div className="text-xs">
                  <span className="text-muted-foreground">Focus Student: </span>
                  <span className="font-semibold text-foreground">{selectedCase.student_name}</span>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => handleOpenDossier(selectedCase.student_id, selectedCase.student_name)}
                  className="h-7 px-2 text-xs gap-1.5 border-border hover:bg-muted font-medium"
                >
                  <FolderOpen className="h-3.5 w-3.5 text-primary" />
                  <span>View Student Dossier</span>
                </Button>
              </div>

              {/* Virtual Consultation Scheduler */}
              <div className="p-4 rounded-xl border border-border/70 bg-background space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Video className="w-4 h-4 text-sky-500" />
                    <span className="text-xs font-bold text-foreground">
                      Virtual Consultation Details
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
                      Session Date
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
                      Session Time
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

              {/* Chronological Conversation Thread */}
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
                      <p className="text-foreground whitespace-pre-wrap mt-0.5">{selectedCase.message}</p>
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
                              ({isParent ? "Parent" : "Counselor"})
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
                  <span>Send Message / Response to Parent</span>
                  <span className="text-[11px] font-normal text-muted-foreground">Delivered directly to parent portal</span>
                </label>
                <div className="flex items-end gap-2">
                  <Textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Type counselor guidance message, confirmation of meeting link, or instructions for the student..."
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

              {/* Case Disposition & Resolution Status */}
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

      {/* Student Dossier Dialog */}
      <StudentDossierDialog
        isOpen={isDossierOpen}
        onClose={() => setIsDossierOpen(false)}
        student={dossierStudent}
      />
    </div>
  );
}
