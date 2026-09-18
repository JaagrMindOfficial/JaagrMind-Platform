"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
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
  Plus,
  Search,
  Trash2,
  Mail,
  Phone,
  Clock,
  CheckCircle2,
  Loader2,
  Pencil,
  Building2,
  ShieldCheck,
  AlertCircle,
  UserCheck,
  UserX,
  MessageSquare,
  FileText,
  FolderOpen,
  KeyRound,
  Copy,
  Check,
  ArrowUpRight,
  TrendingUp,
  Inbox,
  Sparkles,
  Lock,
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { StudentDossierDialog, StudentProfileData } from "@/components/student-dossier-dialog";
import { api } from "@/lib/api";

interface SchoolCounselor {
  id: string;
  school_id: string;
  branch_id?: string;
  school_name?: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  branch_name: string;
  available_hours: string;
  is_active: boolean;
  created_at: string;
}

interface ParentInquiry {
  id: string;
  parent_id: string;
  student_id: string;
  student_name: string;
  school_id?: string;
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
  created_at: string;
}

interface SchoolBranch {
  id: string;
  name: string;
  city?: string;
}

export default function SchoolCounselorsPage() {
  const { user, isSchoolAdmin, isSuperAdmin, hasRole } = useAuth();
  const router = useRouter();

  const canManageCounselors = isSchoolAdmin || isSuperAdmin || hasRole("superadmin") || hasRole("school_admin");
  const isTeacherOnly = hasRole("teacher") && !canManageCounselors;
  
  // Navigation tabs: "inquiries" | "staff"
  const [activeTab, setActiveTab] = useState<"inquiries" | "staff">("inquiries");

  // Counselors state
  const [counselors, setCounselors] = useState<SchoolCounselor[]>([]);
  const [branches, setBranches] = useState<SchoolBranch[]>([]);
  const [counselorsLoading, setCounselorsLoading] = useState(true);
  const [staffSearch, setStaffSearch] = useState("");

  // Inquiries / Cases state
  const [inquiries, setInquiries] = useState<ParentInquiry[]>([]);
  const [inquiriesLoading, setInquiriesLoading] = useState(true);
  const [inquirySearch, setInquirySearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "in_progress" | "resolved">("all");

  // Add Counselor Modal State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [branchName, setBranchName] = useState("Main Campus");
  const [role, setRole] = useState("School Wellness Counselor");
  const [availableHours, setAvailableHours] = useState("Mon-Fri, 9:00 AM - 3:30 PM");
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState("");
  const [addSuccessMsg, setAddSuccessMsg] = useState("");

  // Edit Counselor Modal State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingCounselor, setEditingCounselor] = useState<SchoolCounselor | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editBranchId, setEditBranchId] = useState("");
  const [editBranchName, setEditBranchName] = useState("Main Campus");
  const [editRole, setEditRole] = useState("School Wellness Counselor");
  const [editAvailableHours, setEditAvailableHours] = useState("Mon-Fri, 9:00 AM - 3:30 PM");
  const [editIsActive, setEditIsActive] = useState(true);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");
  const [editSuccessMsg, setEditSuccessMsg] = useState("");

  // Manage Case Modal State
  const [isCaseModalOpen, setIsCaseModalOpen] = useState(false);
  const [selectedCase, setSelectedCase] = useState<ParentInquiry | null>(null);
  const [caseStatus, setCaseStatus] = useState<"pending" | "in_progress" | "resolved">("pending");
  const [caseNotes, setCaseNotes] = useState("");
  const [caseSaving, setCaseSaving] = useState(false);
  const [caseError, setCaseError] = useState("");
  const [caseSuccessMsg, setCaseSuccessMsg] = useState("");

  // Student Dossier Quick View State
  const [dossierStudent, setDossierStudent] = useState<StudentProfileData | null>(null);
  const [isDossierOpen, setIsDossierOpen] = useState(false);

  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

  const getAuthHeaders = () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
    if (typeof window !== "undefined") {
      const imp = localStorage.getItem("superadmin_impersonating");
      if (imp) {
        try {
          const parsed = JSON.parse(imp);
          if (parsed?.schoolId) {
            headers["X-School-ID"] = parsed.schoolId;
          }
        } catch {}
      }
    }
    return headers;
  };

  // Fetch Counselors
  const fetchCounselors = async () => {
    if (isTeacherOnly) return;
    try {
      setCounselorsLoading(true);
      const data = await api.get<SchoolCounselor[]>("/api/school/counselors");
      setCounselors(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error("Failed to load counselors:", err);
    } finally {
      setCounselorsLoading(false);
    }
  };

  // Fetch Inquiries
  const fetchInquiries = async () => {
    if (isTeacherOnly) return;
    try {
      setInquiriesLoading(true);
      const data = await api.get<ParentInquiry[]>("/api/school/parent-inquiries");
      setInquiries(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error("Failed to load parent inquiries:", err);
    } finally {
      setInquiriesLoading(false);
    }
  };

  // Fetch Branches
  const fetchBranches = async () => {
    if (isTeacherOnly) return;
    try {
      const data = await api.get<any[]>("/api/school/branches");
      if (Array.isArray(data)) setBranches(data);
    } catch (err) {
      console.error("Failed to load branches:", err);
    }
  };

  useEffect(() => {
    if (!isTeacherOnly) {
      fetchCounselors();
      fetchInquiries();
      fetchBranches();
    }
  }, [isTeacherOnly]);

  // Open Manage Case Dialog
  const handleOpenCase = (inq: ParentInquiry) => {
    setSelectedCase(inq);
    setCaseStatus(inq.status);
    setCaseNotes(inq.resolution_notes || "");
    setCaseError("");
    setCaseSuccessMsg("");
    setIsCaseModalOpen(true);
  };

  // Save Case Update
  const handleSaveCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCase) return;

    setCaseSaving(true);
    setCaseError("");
    setCaseSuccessMsg("");

    try {
      const res = await fetch(`${apiBase}/api/school/parent-inquiries/${selectedCase.id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          status: caseStatus,
          resolution_notes: caseNotes.trim(),
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to update case");
      }

      setCaseSuccessMsg("Case details and notes saved successfully!");
      fetchInquiries();
      setTimeout(() => {
        setIsCaseModalOpen(false);
        setCaseSuccessMsg("");
      }, 1000);
    } catch (err: any) {
      setCaseError(err.message || "Failed to save case update.");
    } finally {
      setCaseSaving(false);
    }
  };

  // Open Dossier for a Student
  const handleInspectStudent = async (studentId: string, studentName: string) => {
    try {
      const res = await fetch(`${apiBase}/api/school/students`, {
        headers: getAuthHeaders(),
      });
      let studentRecord: any = null;
      if (res.ok) {
        const allStudents = await res.json();
        if (Array.isArray(allStudents)) {
          studentRecord = allStudents.find((s: any) => s.id === studentId);
        }
      }

      setDossierStudent({
        id: studentId,
        access_id: studentRecord?.access_id || "101",
        name: studentName,
        grade: studentRecord?.grade || "10th",
        section: studentRecord?.section || "A",
        school_id: studentRecord?.school_id || "",
        school_name: studentRecord?.school_name || "Oakwood High School",
        archetype: "sprinter",
        focus_score: 80,
        resilience_score: 70,
        academic_tenacity: 78,
        stress_adaptability: 65,
        primary_friction: "Classroom voice hesitancy & evaluative doubt",
        momentum_trend: "stable",
        last_check_in_date: new Date().toISOString(),
        check_in_count: 3,
      });
      setIsDossierOpen(true);
    } catch (err) {
      console.error("Failed to inspect student:", err);
    }
  };

  // Add Counselor Handler
  const handleAddCounselor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    setAddSaving(true);
    setAddError("");
    setAddSuccessMsg("");

    try {
      const res = await fetch(`${apiBase}/api/school/counselors`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          branch_id: selectedBranchId || null,
          branch_name: branchName.trim() || "Main Campus",
          role: role.trim() || "School Wellness Counselor",
          available_hours: availableHours.trim() || "Mon-Fri, 9:00 AM - 3:30 PM",
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to add counselor");
      }

      setAddSuccessMsg("Counselor connected successfully!");
      setName("");
      setEmail("");
      setPhone("");
      setSelectedBranchId("");
      setBranchName("Main Campus");
      fetchCounselors();
      setTimeout(() => {
        setIsAddOpen(false);
        setAddSuccessMsg("");
      }, 1000);
    } catch (err: any) {
      setAddError(err.message || "Something went wrong.");
    } finally {
      setAddSaving(false);
    }
  };

  // Open Edit Counselor Modal
  const handleOpenEdit = (c: SchoolCounselor) => {
    setEditingCounselor(c);
    setEditName(c.name || "");
    setEditEmail(c.email || "");
    setEditPhone(c.phone || "");
    setEditBranchId(c.branch_id || "");
    setEditBranchName(c.branch_name || "Main Campus");
    setEditRole(c.role || "School Wellness Counselor");
    setEditAvailableHours(c.available_hours || "Mon-Fri, 9:00 AM - 3:30 PM");
    setEditIsActive(c.is_active ?? true);
    setEditError("");
    setEditSuccessMsg("");
    setIsEditOpen(true);
  };

  // Update Counselor Handler
  const handleUpdateCounselor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCounselor || !editName.trim() || !editEmail.trim()) return;

    setEditSaving(true);
    setEditError("");
    setEditSuccessMsg("");

    try {
      const res = await fetch(`${apiBase}/api/school/counselors/${editingCounselor.id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: editName.trim(),
          email: editEmail.trim(),
          phone: editPhone.trim(),
          branch_id: editBranchId || null,
          branch_name: editBranchName.trim() || "Main Campus",
          role: editRole.trim() || "School Wellness Counselor",
          available_hours: editAvailableHours.trim() || "Mon-Fri, 9:00 AM - 3:30 PM",
          is_active: editIsActive,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to update counselor");
      }

      setEditSuccessMsg("Counselor profile updated successfully!");
      fetchCounselors();
      setTimeout(() => {
        setIsEditOpen(false);
        setEditSuccessMsg("");
      }, 1000);
    } catch (err: any) {
      setEditError(err.message || "Something went wrong.");
    } finally {
      setEditSaving(false);
    }
  };

  // Delete Counselor Handler
  const handleDeleteCounselor = async (id: string, counselorName: string) => {
    if (
      !confirm(
        `Are you sure you want to remove ${counselorName}? Parents will route to JaagrMind central desk if no active counselor is available.`
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`${apiBase}/api/school/counselors/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        fetchCounselors();
      }
    } catch (err) {
      console.error("Failed to delete counselor:", err);
    }
  };

  // Provision Portal Access State & Handlers
  const [accessResult, setAccessResult] = useState<{
    email: string;
    name: string;
    temp_password: string;
    portal_url: string;
  } | null>(null);
  const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);
  const [accessLoading, setAccessLoading] = useState(false);
  const [accessCopied, setAccessCopied] = useState(false);

  const handleProvisionAccess = async (c: SchoolCounselor) => {
    setAccessLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/school/counselors/${c.id}/provision-access`, {
        method: "POST",
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to provision access");
      setAccessResult(data);
      setIsAccessModalOpen(true);
    } catch (err: any) {
      alert(err.message || "Failed to provision counselor access");
    } finally {
      setAccessLoading(false);
    }
  };

  const copyCredentials = () => {
    if (accessResult) {
      navigator.clipboard.writeText(
        `Counselor Portal Access:\nEmail: ${accessResult.email}\nTemporary Password: ${accessResult.temp_password}\nPortal URL: ${window.location.origin}/counselor`
      );
      setAccessCopied(true);
      setTimeout(() => setAccessCopied(false), 2000);
    }
  };

  // Telemetry Calculations
  const pendingCount = inquiries.filter((inq) => inq.status === "pending").length;
  const inProgressCount = inquiries.filter((inq) => inq.status === "in_progress").length;
  const resolvedCount = inquiries.filter((inq) => inq.status === "resolved").length;
  const activeCounselorsCount = counselors.filter((c) => c.is_active).length;

  // Filtered Inquiries
  const filteredInquiries = useMemo(() => {
    return inquiries.filter((inq) => {
      const matchesStatus = statusFilter === "all" || inq.status === statusFilter;
      const q = inquirySearch.toLowerCase();
      const matchesSearch =
        !q ||
        inq.student_name.toLowerCase().includes(q) ||
        inq.parent_name.toLowerCase().includes(q) ||
        inq.parent_email.toLowerCase().includes(q) ||
        inq.subject.toLowerCase().includes(q) ||
        (inq.counselor_name && inq.counselor_name.toLowerCase().includes(q));
      return matchesStatus && matchesSearch;
    });
  }, [inquiries, statusFilter, inquirySearch]);

  // Filtered Counselors
  const filteredCounselors = useMemo(() => {
    const q = staffSearch.toLowerCase();
    return counselors.filter((c) => {
      return (
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.branch_name.toLowerCase().includes(q) ||
        c.role.toLowerCase().includes(q)
      );
    });
  }, [counselors, staffSearch]);

  if (isTeacherOnly) {
    return (
      <div className="p-6 sm:p-8 max-w-3xl mx-auto space-y-6 pt-16">
        <div className="rounded-xl border border-border bg-card p-8 text-center space-y-4 shadow-sm">
          <div className="h-12 w-12 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
            <Lock className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Access Restricted</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
            The Counselor Desk and clinical student escalation oversight are restricted to School Administrators and Certified Counselors. Classroom teachers do not have authorization to manage faculty wellness personnel or view clinical parent inquiries.
          </p>
          <div className="pt-2">
            <Button variant="outline" onClick={() => router.push("/school")}>
              Return to Classroom Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 sm:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground">
              Counselor Desk
            </span>
            {pendingCount > 0 ? (
              <Badge
                variant="outline"
                className="text-[10px] font-mono text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20"
              >
                {pendingCount} Case{pendingCount > 1 ? "s" : ""} Awaiting Review
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
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mt-1">
            Counselor Desk & Inquiries
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Parent inquiry queue, case resolution tracking, and campus counselor staff management.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setIsAddOpen(true)}
            className="h-9 text-xs font-bold gap-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl shadow-xs"
          >
            <Plus className="h-4 w-4" />
            <span>Connect Counselor</span>
          </Button>
        </div>
      </div>

      {/* Counselor Telemetry KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pending Inquiries */}
        <Card className="rounded-xl border-border/70 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
                Needs Review
              </div>
              <div className="text-2xl font-bold mt-1 text-amber-600 dark:text-amber-400">
                {pendingCount}
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                Unanswered parent notes
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
                Active Interventions
              </div>
              <div className="text-2xl font-bold mt-1 text-sky-600 dark:text-sky-400">
                {inProgressCount}
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                Teacher alignment & check-in
              </div>
            </div>
            <div className="h-10 w-10 rounded-xl bg-sky-500/10 text-sky-600 flex items-center justify-center shrink-0">
              <Clock className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Resolved Cases */}
        <Card className="rounded-xl border-border/70 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
                Resolved Guidance
              </div>
              <div className="text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">
                {resolvedCount}
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                Closed guidance loops
              </div>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Active Campus Counselors */}
        <Card className="rounded-xl border-border/70 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
                Active Wellness Staff
              </div>
              <div className="text-2xl font-bold mt-1 text-foreground">
                {activeCounselorsCount}
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                {counselors.length} total registered staff
              </div>
            </div>
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <UserCheck className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Navigation Tab Pills */}
      <div className="flex items-center gap-2 border-b border-border/60 pb-2">
        <button
          onClick={() => setActiveTab("inquiries")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
            activeTab === "inquiries"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
          }`}
        >
          <Inbox className="h-3.5 w-3.5" />
          <span>Parent Inquiries & Cases</span>
          <Badge
            variant="secondary"
            className={`text-[10px] ml-1 px-1.5 py-0 h-4 font-mono ${
              activeTab === "inquiries"
                ? "bg-primary-foreground/20 text-primary-foreground"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {inquiries.length}
          </Badge>
        </button>

        <button
          onClick={() => setActiveTab("staff")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
            activeTab === "staff"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
          }`}
        >
          <HeartHandshake className="h-3.5 w-3.5" />
          <span>Counseling Staff & Campus Desks</span>
          <Badge
            variant="secondary"
            className={`text-[10px] ml-1 px-1.5 py-0 h-4 font-mono ${
              activeTab === "staff"
                ? "bg-primary-foreground/20 text-primary-foreground"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {counselors.length}
          </Badge>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: PARENT INQUIRIES & CASE MANAGEMENT DESK                            */}
      {/* ========================================================================= */}
      {activeTab === "inquiries" && (
        <Card className="clay-card border-border/70 overflow-hidden">
          <CardHeader className="p-5 border-b border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-sky-500" />
                Active Parent Inquiries & Counselor Cases
              </CardTitle>
              <CardDescription className="text-xs">
                Private notes sent by parents requesting behavioral guidance, routine alignment, or teacher feedback.
              </CardDescription>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="h-8 rounded-md border border-input bg-background px-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-medium"
              >
                <option value="all">All Case Statuses</option>
                <option value="pending">Pending Review</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
              </select>

              {/* Search */}
              <div className="relative w-full sm:w-60">
                <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search student, parent, note..."
                  value={inquirySearch}
                  onChange={(e) => setInquirySearch(e.target.value)}
                  className="h-8 text-xs pl-8"
                />
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {inquiriesLoading ? (
              <div className="p-12 text-center text-xs text-muted-foreground font-mono">
                <Loader2 className="h-6 w-6 animate-spin text-sky-500 mx-auto mb-2" />
                Loading counselor case queue...
              </div>
            ) : filteredInquiries.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <Inbox className="h-10 w-10 text-muted-foreground/40 mx-auto" />
                <p className="text-xs font-semibold text-foreground">No inquiries found</p>
                <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
                  {inquirySearch || statusFilter !== "all"
                    ? "No parent guidance cases match your active filters."
                    : "No confidential inquiries currently pending from parents. New parent notes appear here automatically."}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50 bg-secondary/20">
                    <TableHead className="text-xs font-bold font-mono uppercase">Student & Subject</TableHead>
                    <TableHead className="text-xs font-bold font-mono uppercase">Parent Details</TableHead>
                    <TableHead className="text-xs font-bold font-mono uppercase">Addressed To</TableHead>
                    <TableHead className="text-xs font-bold font-mono uppercase">Status</TableHead>
                    <TableHead className="text-xs font-bold font-mono uppercase">Logged Date</TableHead>
                    <TableHead className="text-xs font-bold font-mono uppercase text-right">Case Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInquiries.map((inq) => (
                    <TableRow key={inq.id} className="border-border/40 hover:bg-secondary/10">
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs text-foreground">
                              {inq.student_name}
                            </span>
                          </div>
                          <div className="text-xs font-medium text-foreground/90">
                            {inq.subject}
                          </div>
                          <p className="text-[11px] text-muted-foreground line-clamp-1 max-w-sm">
                            &quot;{inq.message}&quot;
                          </p>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="space-y-0.5 text-xs text-muted-foreground font-mono">
                          <div className="font-medium text-foreground/90">{inq.parent_name}</div>
                          <div className="flex items-center gap-1.5 text-[11px]">
                            <Mail className="h-3 w-3 text-muted-foreground" />
                            <span>{inq.parent_email}</span>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="space-y-0.5">
                          <div className="text-xs font-semibold text-foreground">
                            {inq.counselor_name || "Campus Wellness Desk"}
                          </div>
                          <Badge variant="outline" className="text-[9px] font-mono text-muted-foreground">
                            {inq.counselor_type === "school_counselor" ? "Institutional Staff" : "Platform Desk"}
                          </Badge>
                        </div>
                      </TableCell>

                      <TableCell>
                        {inq.status === "pending" ? (
                          <Badge
                            variant="outline"
                            className="text-[10px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 flex items-center gap-1 w-fit"
                          >
                            <AlertCircle className="h-3 w-3" /> Pending Review
                          </Badge>
                        ) : inq.status === "in_progress" ? (
                          <Badge
                            variant="outline"
                            className="text-[10px] font-medium bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20 flex items-center gap-1 w-fit"
                          >
                            <Clock className="h-3 w-3" /> In Progress
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 flex items-center gap-1 w-fit"
                          >
                            <CheckCircle2 className="h-3 w-3" /> Resolved
                          </Badge>
                        )}
                      </TableCell>

                      <TableCell className="text-xs font-mono text-muted-foreground">
                        {new Date(inq.created_at).toLocaleDateString()}
                        <div className="text-[10px] text-muted-foreground/70">
                          {new Date(inq.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleInspectStudent(inq.student_id, inq.student_name)}
                            className="h-7 px-2 text-[11px] gap-1 text-muted-foreground hover:text-foreground"
                            title="Open Student Dossier"
                          >
                            <FolderOpen className="h-3 w-3 text-sky-500" />
                            <span className="hidden sm:inline">Dossier</span>
                          </Button>

                          <Button
                            size="sm"
                            onClick={() => handleOpenCase(inq)}
                            className="h-7 px-2.5 text-xs gap-1.5 bg-primary text-primary-foreground font-medium"
                          >
                            <MessageSquare className="h-3 w-3" />
                            <span>Manage Case</span>
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

      {/* ========================================================================= */}
      {/* TAB 2: COUNSELING STAFF & CAMPUS DESKS DIRECTORY                          */}
      {/* ========================================================================= */}
      {activeTab === "staff" && (
        <Card className="clay-card border-border/70 overflow-hidden">
          <CardHeader className="p-5 border-b border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <HeartHandshake className="h-4 w-4 text-sky-500" />
                Designated Counseling Personnel ({counselors.length})
              </CardTitle>
              <CardDescription className="text-xs">
                Staff members managing student emotional check-ins, routine friction, and parent inquiries.
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, role, or branch..."
                value={staffSearch}
                onChange={(e) => setStaffSearch(e.target.value)}
                className="h-8 text-xs pl-8"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {counselorsLoading ? (
              <div className="p-8 text-center text-xs text-muted-foreground font-mono">
                <Loader2 className="h-6 w-6 animate-spin text-sky-500 mx-auto mb-2" />
                Loading campus counselors...
              </div>
            ) : filteredCounselors.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <HeartHandshake className="h-8 w-8 text-muted-foreground/40 mx-auto" />
                <p className="text-xs font-semibold text-foreground">No counselors found</p>
                <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
                  {staffSearch
                    ? "No counselors matched your search query."
                    : "Connect your first school or branch counselor so parents can reach out for student guidance."}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50 bg-secondary/20">
                    <TableHead className="text-xs font-bold font-mono uppercase">Counselor Profile</TableHead>
                    <TableHead className="text-xs font-bold font-mono uppercase">Role & Campus</TableHead>
                    <TableHead className="text-xs font-bold font-mono uppercase">Direct Contact</TableHead>
                    <TableHead className="text-xs font-bold font-mono uppercase">Available Hours</TableHead>
                    <TableHead className="text-xs font-bold font-mono uppercase">Portal Status</TableHead>
                    <TableHead className="text-xs font-bold font-mono uppercase text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCounselors.map((c) => (
                    <TableRow key={c.id} className="border-border/40 hover:bg-secondary/10">
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-600 dark:text-sky-400 font-bold text-xs flex items-center justify-center shrink-0">
                            {c.name
                              .split(" ")
                              .map((part) => part[0])
                              .slice(0, 2)
                              .join("")
                              .toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-xs text-foreground">{c.name}</div>
                            <div className="text-[11px] text-muted-foreground font-mono">{c.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="text-xs font-medium text-foreground">{c.role}</div>
                          <Badge variant="outline" className="text-[10px] font-mono text-muted-foreground bg-muted/30">
                            <Building2 className="h-2.5 w-2.5 mr-1 text-muted-foreground" />
                            {c.branch_name || "Main Campus"}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5 text-xs text-muted-foreground font-mono">
                          {c.phone ? (
                            <div className="flex items-center gap-1.5 text-foreground/90">
                              <Phone className="h-3 w-3 text-sky-500" />
                              <span>{c.phone}</span>
                            </div>
                          ) : (
                            <span className="text-[11px] text-muted-foreground/70 italic">No phone logged</span>
                          )}
                          <div className="flex items-center gap-1.5 text-[11px]">
                            <Mail className="h-3 w-3 text-muted-foreground" />
                            <span>{c.email}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span>{c.available_hours || "Mon-Fri, 9:00 AM - 3:30 PM"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {c.is_active ? (
                          <Badge
                            variant="outline"
                            className="text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 flex items-center gap-1 w-fit"
                          >
                            <UserCheck className="h-3 w-3" /> Active & Visible
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-[10px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 flex items-center gap-1 w-fit"
                          >
                            <UserX className="h-3 w-3" /> On Leave (Desk Fallback)
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleProvisionAccess(c)}
                            disabled={accessLoading}
                            className="h-7 px-2 text-xs gap-1 border-sky-500/30 text-sky-600 dark:text-sky-400 hover:bg-sky-500/10 font-medium"
                            title="Provision Counselor Portal login credentials"
                          >
                            <KeyRound className="h-3 w-3" />
                            <span>Portal Access</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenEdit(c)}
                            className="h-7 px-2 text-xs gap-1 border-primary/30 text-primary hover:bg-primary/5 font-medium"
                            title="Edit counselor details"
                          >
                            <Pencil className="h-3 w-3" />
                            <span>Edit</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteCounselor(c.id, c.name)}
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            title="Remove counselor"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
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

      {/* ========================================================================= */}
      {/* MANAGE CASE & LOG COUNSELOR RESOLUTION DIALOG                             */}
      {/* ========================================================================= */}
      <Dialog open={isCaseModalOpen} onOpenChange={setIsCaseModalOpen}>
        <DialogContent className="sm:max-w-xl clay-card p-6">
          <DialogHeader className="space-y-1 pb-3 border-b border-border/40">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-sky-500" />
                Counselor Case Management
              </DialogTitle>
              {selectedCase && (
                <Badge
                  variant="outline"
                  className={
                    caseStatus === "pending"
                      ? "text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/20"
                      : caseStatus === "in_progress"
                      ? "text-[10px] bg-sky-500/10 text-sky-600 border-sky-500/20"
                      : "text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                  }
                >
                  {caseStatus === "pending" ? "Pending Review" : caseStatus === "in_progress" ? "In Progress" : "Resolved"}
                </Badge>
              )}
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Review parent request, coordinate with academic staff, and document confidential resolution notes.
            </DialogDescription>
          </DialogHeader>

          {caseSuccessMsg ? (
            <div className="py-8 text-center space-y-2">
              <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" />
              <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                {caseSuccessMsg}
              </p>
            </div>
          ) : selectedCase ? (
            <form onSubmit={handleSaveCase} className="space-y-4 pt-2">
              {/* Student Header Bar with Quick Dossier Link */}
              <div className="p-3 rounded-xl bg-muted/40 border border-border/50 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono uppercase text-muted-foreground block">
                    Student Subject
                  </span>
                  <span className="text-xs font-bold text-foreground">
                    {selectedCase.student_name}
                  </span>
                </div>

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => handleInspectStudent(selectedCase.student_id, selectedCase.student_name)}
                  className="h-7 text-xs gap-1.5 border-indigo-500/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/5 font-medium"
                >
                  <FolderOpen className="h-3.5 w-3.5" />
                  <span>Inspect Student Dossier</span>
                  <ArrowUpRight className="h-3 w-3" />
                </Button>
              </div>

              {/* Parent Message Card */}
              <div className="space-y-1.5 p-3.5 rounded-xl border border-sky-500/20 bg-sky-500/5">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="font-semibold text-foreground flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-sky-500" />
                    <span>From: {selectedCase.parent_name}</span>
                    <span className="text-[11px] font-mono text-muted-foreground">({selectedCase.parent_email})</span>
                  </div>
                  <span className="text-[10px] font-mono">
                    {new Date(selectedCase.created_at).toLocaleDateString()}
                  </span>
                </div>

                <div className="pt-1">
                  <span className="text-xs font-bold text-foreground">
                    Subject: {selectedCase.subject}
                  </span>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed bg-background/60 p-2.5 rounded-lg border border-border/40 italic">
                    &quot;{selectedCase.message}&quot;
                  </p>
                </div>
              </div>

              {/* Case Status Selector */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">
                  Case Action Status <span className="text-destructive">*</span>
                </label>
                <select
                  value={caseStatus}
                  onChange={(e) => setCaseStatus(e.target.value as any)}
                  className="w-full h-9 rounded-md border border-input bg-background px-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-medium"
                >
                  <option value="pending">Pending Review (Awaiting counselor action)</option>
                  <option value="in_progress">In Progress (Teacher coordination / check-in scheduled)</option>
                  <option value="resolved">Resolved (Guidance & recommendations provided)</option>
                </select>
              </div>

              {/* Counselor Follow-up & Resolution Notes */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                  <span>Counselor Follow-up & Resolution Notes</span>
                </label>
                <Textarea
                  placeholder="Document your clinical follow-up, discussions with teachers, or recommendations communicated to the parent..."
                  value={caseNotes}
                  onChange={(e) => setCaseNotes(e.target.value)}
                  rows={4}
                  className="text-xs leading-relaxed"
                />
                <p className="text-[11px] text-muted-foreground">
                  Documenting notes logs an audit trail on the student&apos;s institutional record.
                </p>
              </div>

              {caseError && (
                <p className="text-xs text-destructive text-center font-medium bg-destructive/10 p-2 rounded-md">
                  {caseError}
                </p>
              )}

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCaseModalOpen(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={caseSaving}
                  size="sm"
                  className="text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                >
                  {caseSaving ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                      <span>Saving Updates...</span>
                    </>
                  ) : (
                    "Save Case Updates"
                  )}
                </Button>
              </DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* CONNECT NEW COUNSELOR DIALOG                                              */}
      {/* ========================================================================= */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-md clay-card p-6">
          <DialogHeader className="space-y-1 pb-3 border-b border-border/40">
            <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <HeartHandshake className="h-4 w-4 text-sky-500" />
              Connect New School Counselor
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Enter details for your campus counselor. Once connected, parents of enrolled students will see this contact on their portal.
            </DialogDescription>
          </DialogHeader>

          {addSuccessMsg ? (
            <div className="py-6 text-center space-y-2">
              <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" />
              <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                {addSuccessMsg}
              </p>
            </div>
          ) : (
            <form onSubmit={handleAddCounselor} className="space-y-3.5 pt-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">
                  Full Name <span className="text-destructive">*</span>
                </label>
                <Input
                  placeholder="e.g. Dr. Sunita Rao"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">
                    Email Address <span className="text-destructive">*</span>
                  </label>
                  <Input
                    type="email"
                    placeholder="counselor@school.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Phone Number</label>
                  <Input
                    placeholder="+91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Campus / Branch</label>
                  {branches.length > 0 ? (
                    <select
                      value={selectedBranchId}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSelectedBranchId(val);
                        const match = branches.find((b) => b.id === val);
                        setBranchName(match ? match.name : "Main Campus");
                      }}
                      className="w-full h-9 rounded-md border border-input bg-background px-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-medium"
                    >
                      <option value="">Main Campus</option>
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Input
                      placeholder="e.g. Main Campus"
                      value={branchName}
                      onChange={(e) => setBranchName(e.target.value)}
                      className="text-xs"
                    />
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Designation / Role</label>
                  <Input
                    placeholder="e.g. Senior Wellness Specialist"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Office / Available Hours</label>
                <Input
                  placeholder="e.g. Mon-Fri, 9:00 AM - 3:30 PM"
                  value={availableHours}
                  onChange={(e) => setAvailableHours(e.target.value)}
                  className="text-xs"
                />
              </div>

              {addError && (
                <p className="text-xs text-destructive text-center font-medium bg-destructive/10 p-2 rounded-md">
                  {addError}
                </p>
              )}

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddOpen(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={addSaving || !name.trim() || !email.trim()}
                  size="sm"
                  className="text-xs bg-sky-600 hover:bg-sky-700 text-white"
                >
                  {addSaving ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    "Save Counselor"
                  )}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* EDIT COUNSELOR PROFILE DIALOG                                             */}
      {/* ========================================================================= */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-md clay-card p-6">
          <DialogHeader className="space-y-1 pb-3 border-b border-border/40">
            <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <Pencil className="h-4 w-4 text-primary" />
              Edit Counselor Profile
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Update details, campus assignment, office hours, or leave availability for this counselor.
            </DialogDescription>
          </DialogHeader>

          {editSuccessMsg ? (
            <div className="py-6 text-center space-y-2">
              <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" />
              <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                {editSuccessMsg}
              </p>
            </div>
          ) : (
            <form onSubmit={handleUpdateCounselor} className="space-y-3.5 pt-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">
                  Full Name <span className="text-destructive">*</span>
                </label>
                <Input
                  placeholder="e.g. Dr. Sunita Rao"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  className="text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">
                    Email Address <span className="text-destructive">*</span>
                  </label>
                  <Input
                    type="email"
                    placeholder="counselor@school.edu"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    required
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Phone Number</label>
                  <Input
                    placeholder="+91 98765 43210"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Campus / Branch</label>
                  {branches.length > 0 ? (
                    <select
                      value={editBranchId}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEditBranchId(val);
                        const match = branches.find((b) => b.id === val);
                        setEditBranchName(match ? match.name : "Main Campus");
                      }}
                      className="w-full h-9 rounded-md border border-input bg-background px-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-medium"
                    >
                      <option value="">Main Campus</option>
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Input
                      placeholder="e.g. Main Campus"
                      value={editBranchName}
                      onChange={(e) => setEditBranchName(e.target.value)}
                      className="text-xs"
                    />
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Designation / Role</label>
                  <Input
                    placeholder="e.g. Senior Wellness Specialist"
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value)}
                    className="text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Office / Available Hours</label>
                <Input
                  placeholder="e.g. Mon-Fri, 9:00 AM - 3:30 PM"
                  value={editAvailableHours}
                  onChange={(e) => setEditAvailableHours(e.target.value)}
                  className="text-xs"
                />
              </div>

              {/* Status / Routing Selector */}
              <div className="space-y-1 pt-1">
                <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                  <span>Parent Portal Availability</span>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {editIsActive ? "Routing active" : "Auto-fallback to Desk"}
                  </span>
                </label>
                <select
                  value={editIsActive ? "active" : "inactive"}
                  onChange={(e) => setEditIsActive(e.target.value === "active")}
                  className="w-full h-9 rounded-md border border-input bg-background px-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-medium"
                >
                  <option value="active">Active • Visible on Parent Portal (Receives inquiries)</option>
                  <option value="inactive">On Leave / Inactive • Route inquiries to JaagrMind Desk</option>
                </select>
                <p className="text-[11px] text-muted-foreground">
                  When set to &quot;On Leave&quot;, parents can still submit inquiries which safely fall back to the platform psychology desk.
                </p>
              </div>

              {editError && (
                <p className="text-xs text-destructive text-center font-medium bg-destructive/10 p-2 rounded-md">
                  {editError}
                </p>
              )}

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditOpen(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={editSaving || !editName.trim() || !editEmail.trim()}
                  size="sm"
                  className="text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                >
                  {editSaving ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* COUNSELOR PORTAL CREDENTIALS MODAL                                        */}
      {/* ========================================================================= */}
      <Dialog open={isAccessModalOpen} onOpenChange={setIsAccessModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <KeyRound className="h-4 w-4 text-sky-500" />
              <span>Counselor Portal Access</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Portal login credentials provisioned for this school counselor.
            </DialogDescription>
          </DialogHeader>

          {accessResult && (
            <div className="space-y-4 py-2 text-xs">
              <div className="p-3.5 bg-muted/40 border border-border/70 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground font-mono">Counselor:</span>
                  <span className="font-semibold text-foreground">{accessResult.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground font-mono">Login Email:</span>
                  <span className="font-mono text-foreground font-medium">{accessResult.email}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground font-mono">Temporary Password:</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    {accessResult.temp_password}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground font-mono">Portal URL:</span>
                  <span className="font-mono text-sky-600 dark:text-sky-400">/counselor</span>
                </div>
              </div>

              <div className="p-3 rounded-xl border border-sky-500/20 bg-sky-500/5 text-[11px] text-muted-foreground space-y-1">
                <p className="font-medium text-foreground">Instructions for School Admin:</p>
                <p>
                  Share these credentials with the counselor. They can log in from the main sign-in page and will be automatically directed to their Counselor Desk.
                </p>
              </div>

              <DialogFooter className="gap-2 sm:gap-0 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAccessModalOpen(false)}
                  className="text-xs"
                >
                  Close
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={copyCredentials}
                  className="text-xs gap-1.5 bg-sky-600 hover:bg-sky-700 text-white font-medium"
                >
                  {accessCopied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-white" />
                      <span>Copied to Clipboard!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>Copy Credentials</span>
                    </>
                  )}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* STUDENT CLINICAL DOSSIER POPUP (INTEGRATED)                               */}
      {/* ========================================================================= */}
      <StudentDossierDialog
        isOpen={isDossierOpen}
        onClose={() => setIsDossierOpen(false)}
        student={dossierStudent}
      />
    </div>
  );
}
