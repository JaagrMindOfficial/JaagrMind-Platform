"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ParentHeader } from "@/components/parent/parent-header";
import { ParentAtmosphereBarometer } from "@/components/parent/parent-atmosphere-barometer";
import { ParentRegulationDossier } from "@/components/parent/parent-regulation-dossier";
import { ParentCounselorDialog } from "@/components/parent/parent-counselor-dialog";
import { ParentAddChildDialog } from "@/components/parent/parent-add-child-dialog";
import { ParentEditChildDialog } from "@/components/parent/parent-edit-child-dialog";
import { ParentStandardCheckins, type StudentGradeCheckin } from "@/components/parent/parent-standard-checkins";
import { ParentConversationThreadDialog, type ParentInquiryItem } from "@/components/parent/parent-conversation-thread-dialog";
import { StudentDossierDialog } from "@/components/student-dossier-dialog";
import { MeetingCard } from "@/components/parent/meeting-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  HeartHandshake,
  Loader2,
  AlertTriangle,
  UserPlus,
  Building2,
  Mail,
  Clock,
  Sparkles,
  Pencil,
  School,
  MessageSquare,
  CheckCircle2,
  FolderOpen,
  ArrowUpRight,
  ShieldCheck,
} from "lucide-react";

export default function ParentDashboardPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [overview, setOverview] = useState<any>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");

  // Modals
  const [counselorModalOpen, setCounselorModalOpen] = useState(false);
  const [addChildModalOpen, setAddChildModalOpen] = useState(false);
  const [editChildModalOpen, setEditChildModalOpen] = useState(false);
  const [fullDossierModalOpen, setFullDossierModalOpen] = useState(false);
  const [selectedCheckin, setSelectedCheckin] = useState<StudentGradeCheckin | null>(null);
  const [checkinModalOpen, setCheckinModalOpen] = useState(false);

  // Two-Way Consultation Threads
  const [inquiries, setInquiries] = useState<ParentInquiryItem[]>([]);
  const [selectedInquiryForThread, setSelectedInquiryForThread] = useState<ParentInquiryItem | null>(null);
  const [threadModalOpen, setThreadModalOpen] = useState(false);

  const handleStartCheckin = (checkin: StudentGradeCheckin) => {
    if (!activeChild?.id) return;
    router.push(`/parent/assessment?childId=${activeChild.id}&test=${checkin.id}`);
  };

  const fetchInquiries = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
      const res = await fetch(`${apiBase}/api/parent/inquiries`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setInquiries(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Failed to load inquiries:", err);
    }
  };

  const fetchOverview = async (studentId?: string) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }

      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
      const url = studentId
        ? `${apiBase}/api/parent/overview?student_id=${encodeURIComponent(studentId)}`
        : `${apiBase}/api/parent/overview`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        if (res.status === 401) {
          router.push("/login");
          return;
        }
        throw new Error("Failed to load guardian overview.");
      }

      const data = await res.json();
      setOverview(data);
      if (data.active_child?.id) {
        setSelectedStudentId(data.active_child.id);
      }
      fetchInquiries();
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
    fetchInquiries();
  }, [router]);

  const handleSelectChild = (childId: string) => {
    setSelectedStudentId(childId);
    fetchOverview(childId);
  };

  const handleChildLinked = (newChild: any) => {
    fetchOverview(newChild.id);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500 mx-auto" />
          <p className="text-xs text-muted-foreground font-mono">
            Loading your family space...
          </p>
        </div>
      </div>
    );
  }

  if (error || !overview) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="clay-card p-8 max-w-md text-center space-y-4">
          <div className="h-12 w-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-foreground">Could Not Load Dashboard</h3>
            <p className="text-xs text-muted-foreground">{error || "Please check your network and session."}</p>
          </div>
          <Button onClick={() => fetchOverview()} variant="outline" className="text-xs">
            Retry Loading
          </Button>
        </div>
      </div>
    );
  }

  const hasChildren = !!(overview.all_children && overview.all_children.length > 0 && overview.active_child && overview.active_child.id);
  const activeChild = overview.active_child || {};
  const preferredName = activeChild.nickname || activeChild.name || "Your child";
  const firstName = activeChild.nickname || (activeChild.name ? activeChild.name.split(" ")[0] : "Your child");
  const counselor = overview.counselor || {
    name: "JaagrMind Platform Counselor",
    role: "Central Wellness & Child Psychology Desk",
    is_platform: true,
  };
  const isPlatformCounselor = counselor?.is_platform;

  return (
    <div className="min-h-screen bg-background flex flex-col antialiased">
      {/* Header Bar */}
      <ParentHeader
        parentName={overview.parent_name}
        activeChild={activeChild}
        allChildren={overview.all_children || []}
        onSelectChild={handleSelectChild}
        onOpenAddChildModal={() => setAddChildModalOpen(true)}
        onOpenCounselorModal={() => setCounselorModalOpen(true)}
      />

      {/* Main Dashboard Canvas */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 lg:p-8 space-y-6 relative z-10">
        {!hasChildren ? (
          <section className="space-y-6">
            <div className="rounded-xl border border-border/70 bg-card p-8 sm:p-12 text-center max-w-2xl mx-auto space-y-6 relative overflow-hidden shadow-xs">
              <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/20">
                <Sparkles className="h-7 w-7" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                  Welcome to Your Family Space, {overview.parent_name ? overview.parent_name.split(" ")[0] : "Parent"}
                </h2>
                <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
                  Connect your child using their School Access Code or add an independent student profile to view their 4-bucket clinical regulation rhythm, focus cadence, and care support.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <Button
                  size="default"
                  onClick={() => setAddChildModalOpen(true)}
                  className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-2 px-5 cursor-pointer shadow-xs"
                >
                  <UserPlus className="h-4 w-4" />
                  <span>Connect or Add Student Profile</span>
                </Button>
              </div>

              <div className="pt-6 border-t border-border/40 grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
                <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60 space-y-1">
                  <span className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    School Sync
                  </span>
                  <p className="text-[11px] text-muted-foreground">
                    Direct sync with campus check-ins and educator regulation track.
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60 space-y-1">
                  <span className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    4 Core Buckets
                  </span>
                  <p className="text-[11px] text-muted-foreground">
                    Calm, Grounding, Focus Flow, and Social Ease metrics matching school dossiers.
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60 space-y-1">
                  <span className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    Care Desk
                  </span>
                  <p className="text-[11px] text-muted-foreground">
                    Direct confidential guidance desk for family and student support.
                  </p>
                </div>
              </div>
            </div>
          </section>
        ) : (
          <>
            {/* Top Child Identity & Action Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                    {preferredName}&apos;s Family Space
                  </h1>
                  <Badge variant="outline" className="font-mono text-xs px-2.5 py-0.5 bg-primary/10 text-primary border-primary/30">
                    Class {activeChild.grade || "10"}
                  </Badge>
                  {activeChild.is_linked ? (
                    <Badge variant="outline" className="font-mono text-xs px-2 py-0.5 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20">
                      {activeChild.school_name}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="font-mono text-xs px-2 py-0.5 text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20">
                      Independent Study
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1 flex items-center gap-3 flex-wrap">
                  <span>Welcome back, <span className="font-medium text-foreground">{overview.parent_name || "Parent"}</span></span>
                  <span>•</span>
                  <span>4-bucket clinical regulation & care desk</span>
                </p>
              </div>

              {/* Quick Actions Bar */}
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFullDossierModalOpen(true)}
                  className="text-xs h-8 gap-1.5 border-border/80 hover:bg-muted/50 font-medium cursor-pointer shadow-2xs text-foreground"
                >
                  <FolderOpen className="h-3.5 w-3.5 text-sky-500" />
                  <span>View Student Dossier</span>
                  <ArrowUpRight className="h-3 w-3 opacity-60" />
                </Button>
                {!activeChild.is_linked && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditChildModalOpen(true)}
                    className="text-xs h-8 gap-1.5 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 font-medium cursor-pointer shadow-2xs"
                  >
                    <School className="h-3.5 w-3.5" />
                    <span>Link School</span>
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditChildModalOpen(true)}
                  className="text-xs h-8 gap-1.5 border-border/80 hover:bg-muted/50 font-medium cursor-pointer"
                >
                  <Pencil className="h-3 w-3 text-muted-foreground" />
                  <span>Edit Child</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAddChildModalOpen(true)}
                  className="text-xs h-8 gap-1.5 border-border/80 hover:bg-muted/50 font-medium cursor-pointer"
                >
                  <UserPlus className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Add Child</span>
                </Button>
              </div>
            </div>

            {/* Living Atmosphere Barometer */}
            <section className="space-y-4">
              <ParentAtmosphereBarometer
                atmosphere={overview.atmosphere}
                childName={preferredName}
              />
            </section>

            {/* Comprehensive 4-Bucket Regulation Dossier (School-Aligned) */}
            <section className="space-y-4">
              <ParentRegulationDossier
                dossier={overview.dossier}
                childName={preferredName}
                onOpenCheckin={() => {
                  if (overview.standard_checkins && overview.standard_checkins.length > 0) {
                    handleStartCheckin(overview.standard_checkins[0]);
                  }
                }}
              />
            </section>

            {/* Direct Counselor & Care Support Row */}
            <section className="space-y-4">
              <div className="rounded-xl border border-border/70 bg-card p-6 sm:p-7 relative overflow-hidden transition-all flex flex-col justify-between shadow-xs">
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between pb-4 border-b border-border/40 gap-3">
                    <div className="space-y-0.5">
                      <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
                        {isPlatformCounselor ? "JAAGRMIND STUDENT CARE DESK" : "CAMPUS ASSIGNED COUNSELOR"}
                      </span>
                      <h3 className="text-lg font-bold tracking-tight text-foreground">
                        Direct Counseling & Family Advisory for {firstName}
                      </h3>
                    </div>
                    <div className="p-2 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
                      <HeartHandshake className="h-5 w-5" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                    <div className="md:col-span-8 p-4 rounded-xl bg-muted/30 border border-border/60 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <h4 className="text-sm font-bold text-foreground">
                            {counselor.name}
                          </h4>
                          <p className="text-xs text-muted-foreground font-mono">
                            {counselor.role}
                          </p>
                        </div>
                        {isPlatformCounselor ? (
                          <Badge variant="outline" className="text-[10px] font-mono text-sky-600 dark:text-sky-400 bg-sky-500/10 border-sky-500/20">
                            Platform Support Desk
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20">
                            Campus Assigned
                          </Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-border/40 text-xs text-muted-foreground font-mono">
                        {!isPlatformCounselor && counselor.school_name && (
                          <div className="flex items-center gap-2">
                            <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="truncate">{counselor.school_name}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="truncate">{counselor.available_hours || "Mon-Fri, 9:00 AM - 4:00 PM"}</span>
                        </div>
                        {counselor.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="truncate">{counselor.email}</span>
                          </div>
                        )}
                      </div>

                      <p className="text-xs text-muted-foreground leading-relaxed pt-1">
                        {isPlatformCounselor
                          ? `Because ${firstName} is studying independently, you have direct access to JaagrMind's central clinical desk for study routine planning, screen balance, and emotional regulation guidance.`
                          : `Your family is directly connected to ${counselor.name} at ${counselor.school_name} for coordinated academic and wellbeing guidance.`}
                      </p>
                    </div>

                    <div className="md:col-span-4 flex flex-col justify-center gap-3">
                      <Button
                        onClick={() => setCounselorModalOpen(true)}
                        className="w-full bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs h-10 gap-2 shadow-xs cursor-pointer"
                      >
                        <MessageSquare className="h-4 w-4" />
                        <span>{isPlatformCounselor ? "Message Care Desk" : "Consult Counselor"}</span>
                      </Button>
                      <p className="text-[11px] text-muted-foreground text-center font-mono">
                        Responses typically within 24 hours. Fully confidential.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Active Two-Way Consultations & Scheduled Follow-ups */}
            {inquiries.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <div className="space-y-0.5">
                    <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
                      TWO-WAY COUNSELOR DIALOGUES
                    </span>
                    <h2 className="text-xl font-bold tracking-tight text-foreground">
                      Conversations & Scheduled Sessions
                    </h2>
                  </div>
                  <Badge variant="outline" className="text-xs font-mono">
                    {inquiries.length} {inquiries.length === 1 ? "Active Thread" : "Active Threads"}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {inquiries.map((inq) => {
                    const hasMeeting = Boolean(inq.meeting_link || inq.meeting_date || inq.meeting_time);
                    return (
                      <div
                        key={inq.id}
                        className="rounded-xl border border-border/70 bg-card p-5 space-y-3 flex flex-col justify-between hover:border-foreground/30 transition-all shadow-xs"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
                              {inq.counselor_type === "school_counselor" ? "Campus Counselor" : "JaagrMind Central"}
                            </span>
                            <Badge
                              variant="outline"
                              className={`text-[10px] font-mono capitalize ${
                                inq.status === "resolved"
                                  ? "text-emerald-600 border-emerald-500/20 bg-emerald-500/10"
                                  : inq.status === "in_progress"
                                  ? "text-sky-600 border-sky-500/20 bg-sky-500/10"
                                  : "text-amber-600 border-amber-500/20 bg-amber-500/10"
                              }`}
                            >
                              {inq.status === "resolved"
                                ? "Resolved"
                                : inq.status === "in_progress"
                                ? "In Progress"
                                : "Open"}
                            </Badge>
                          </div>

                          <h4 className="text-sm font-semibold text-foreground line-clamp-1">
                            {inq.subject}
                          </h4>
                          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                            {inq.note || ""}
                          </p>

                          {hasMeeting && (
                            <MeetingCard
                              meetingDate={inq.meeting_date}
                              meetingTime={inq.meeting_time}
                              meetingLink={inq.meeting_link}
                              compact={true}
                            />
                          )}

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedInquiryForThread(inq);
                              setThreadModalOpen(true);
                            }}
                            className="w-full h-8 text-xs font-medium gap-1.5 rounded-lg border-border hover:bg-muted/50 cursor-pointer"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>View Discussion & Reply</span>
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Standard Grade Check-ins (Launchable from Portal) */}
            <ParentStandardCheckins
              childName={activeChild.name}
              preferredName={activeChild.nickname || activeChild.name}
              grade={activeChild.grade}
              checkins={overview.standard_checkins || []}
              onStartCheckin={handleStartCheckin}
            />
          </>
        )}
      </main>

      {/* Modals & Dialogs */}
      <ParentCounselorDialog
        open={counselorModalOpen}
        onOpenChange={setCounselorModalOpen}
        counselorName={counselor.name}
        schoolName={counselor.school_name}
        branchName={counselor.branch_name}
        isPlatform={isPlatformCounselor}
        studentId={activeChild.id}
        childName={activeChild.name}
        onSuccess={() => {
          fetchOverview(activeChild.id);
          fetchInquiries();
        }}
      />

      <ParentConversationThreadDialog
        inquiry={selectedInquiryForThread}
        isOpen={threadModalOpen}
        onClose={() => {
          setThreadModalOpen(false);
          setSelectedInquiryForThread(null);
        }}
        onInquiryUpdated={() => {
          fetchInquiries();
        }}
      />

      <ParentAddChildDialog
        open={addChildModalOpen}
        onOpenChange={setAddChildModalOpen}
        onChildAdded={handleChildLinked}
      />

      <ParentEditChildDialog
        open={editChildModalOpen}
        onOpenChange={setEditChildModalOpen}
        child={activeChild}
        onChildUpdated={(updated) => fetchOverview(updated.id)}
      />

      {/* Full Clinical Student Dossier Dialog */}
      <StudentDossierDialog
        isOpen={fullDossierModalOpen}
        onClose={() => setFullDossierModalOpen(false)}
        student={overview.dossier || null}
        isParent={true}
      />
    </div>
  );
}
