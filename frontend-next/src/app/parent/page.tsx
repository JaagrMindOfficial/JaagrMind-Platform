"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ParentHeader } from "@/components/parent/parent-header";
import { ParentAtmosphereBarometer } from "@/components/parent/parent-atmosphere-barometer";
import { ParentGrowthRadar } from "@/components/parent/parent-growth-radar";
import { ParentCounselorDialog } from "@/components/parent/parent-counselor-dialog";
import { ParentAddChildDialog } from "@/components/parent/parent-add-child-dialog";
import { ParentEditChildDialog } from "@/components/parent/parent-edit-child-dialog";
import { ParentStandardCheckins, type StudentGradeCheckin } from "@/components/parent/parent-standard-checkins";
import { ParentCheckinDialog } from "@/components/parent/parent-checkin-dialog";
import { ParentConversationThreadDialog, type ParentInquiryItem } from "@/components/parent/parent-conversation-thread-dialog";
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
  Video,
  Calendar,
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
  const [selectedCheckin, setSelectedCheckin] = useState<StudentGradeCheckin | null>(null);
  const [checkinModalOpen, setCheckinModalOpen] = useState(false);

  // Two-Way Consultation Threads
  const [inquiries, setInquiries] = useState<ParentInquiryItem[]>([]);
  const [selectedInquiryForThread, setSelectedInquiryForThread] = useState<ParentInquiryItem | null>(null);
  const [threadModalOpen, setThreadModalOpen] = useState(false);

  const handleStartCheckin = (checkin: StudentGradeCheckin) => {
    setSelectedCheckin(checkin);
    setCheckinModalOpen(true);
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

  const activeChild = overview.active_child;
  const preferredName = activeChild.nickname || activeChild.name;
  const firstName = activeChild.nickname || (activeChild.name ? activeChild.name.split(" ")[0] : "Your child");
  const counselor = overview.counselor;
  const isPlatformCounselor = counselor?.is_platform;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-card/10 to-background flex flex-col antialiased selection:bg-emerald-500/20 relative overflow-x-hidden">
      {/* Subtle atmospheric ambient glows */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-0 w-80 h-80 bg-sky-500/5 dark:bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Liquid Glass Header */}
      <ParentHeader
        parentName={overview.parent_name}
        activeChild={activeChild}
        allChildren={overview.all_children || []}
        onSelectChild={handleSelectChild}
        onOpenAddChildModal={() => setAddChildModalOpen(true)}
        onOpenCounselorModal={() => setCounselorModalOpen(true)}
      />

      {/* Main Dashboard Canvas */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 relative z-10">
        {/* Top Greeting & Child Identity */}
        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3 px-1">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
                  Parent Portal
                </span>
                <span className="text-muted-foreground/40">•</span>
                <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                  {activeChild.nickname ? `${activeChild.nickname} (${activeChild.name})` : activeChild.name} • Class {activeChild.grade}
                </span>
                {activeChild.is_linked ? (
                  <Badge variant="outline" className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20">
                    {activeChild.school_name}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] font-mono text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20">
                    Independent Study
                  </Badge>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground mt-1">
                Welcome back, {overview.parent_name ? overview.parent_name.split(" ")[0] : "Parent"}
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Daily wellbeing overview and practical support for {preferredName}.
              </p>
            </div>

            {/* Quick Actions: Link to School if Independent + Edit Child Profile */}
            <div className="flex items-center gap-2 flex-wrap">
              {!activeChild.is_linked && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditChildModalOpen(true)}
                  className="text-xs h-8 gap-1.5 border-sky-500/40 text-sky-600 dark:text-sky-400 bg-sky-500/10 hover:bg-sky-500/20 font-semibold cursor-pointer shadow-2xs"
                >
                  <School className="h-3.5 w-3.5" />
                  <span>Link to School</span>
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditChildModalOpen(true)}
                className="text-xs h-8 gap-1.5 neo-well hover:bg-muted/40 font-medium cursor-pointer"
              >
                <Pencil className="h-3 w-3 text-muted-foreground" />
                <span>Edit Profile</span>
              </Button>
              <div className="sm:hidden">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAddChildModalOpen(true)}
                  className="text-xs h-8 gap-1.5 neo-well cursor-pointer"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  <span>Add Child</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Living Mood Dial & 7-Day Pulse Tablets */}
          <ParentAtmosphereBarometer
            atmosphere={overview.atmosphere}
            childName={preferredName}
          />
        </section>

        {/* Core Practical Row: Routine & Study Balance + Direct Counselor Desk */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-stretch">
          {/* Left (7 cols): Routine & Study Balance Matrix */}
          <div className="lg:col-span-7">
            <ParentGrowthRadar
              pillars={overview.pillars}
              childName={activeChild.name}
            />
          </div>

          {/* Right (5 cols): Dynamic Counselor Card (School or JaagrMind) */}
          <div className="lg:col-span-5">
            <div className="clay-card p-6 sm:p-8 relative overflow-hidden transition-all flex flex-col justify-between h-full group">
              {/* Top liquid specular line */}
              <div className="absolute top-0 left-6 right-6 h-[1px] bg-gradient-to-r from-transparent via-foreground/15 to-transparent" />

              <div className="space-y-4">
                <div className="flex items-center justify-between pb-4 border-b border-border/40">
                  <div className="space-y-0.5">
                    <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
                      {isPlatformCounselor ? "JAAGRMIND STUDENT CARE DESK" : "SCHOOL COUNSELOR"}
                    </span>
                    <h3 className="text-lg font-bold tracking-tight text-foreground">
                      Direct Support for {firstName}
                    </h3>
                  </div>
                  <div className="p-2 rounded-xl neo-well text-sky-600 dark:text-sky-400">
                    <HeartHandshake className="h-4 w-4" />
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-card border border-border/70 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
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
                        Platform Support
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20">
                        On Campus
                      </Badge>
                    )}
                  </div>

                  <p className="text-xs text-foreground/85 leading-relaxed font-normal">
                    {isPlatformCounselor
                      ? `Because ${firstName} is studying independently, you have direct access to JaagrMind's platform counseling team. Any questions or notes you submit are handled directly by our senior team.`
                      : `Available for private guidance on exam nervousness, study concentration, and teacher feedback at ${counselor.school_name}.`}
                  </p>

                  <div className="pt-1 flex flex-col gap-1.5 text-[11px] text-muted-foreground font-mono">
                    <div className="flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5 shrink-0 text-foreground/60" />
                      <span>{counselor.school_name}{counselor.branch_name ? ` • ${counselor.branch_name}` : ""}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 shrink-0 text-foreground/60" />
                      <span>{counselor.available_hours}</span>
                    </div>
                  </div>
                </div>

                {/* Direct Action */}
                <Button
                  onClick={() => setCounselorModalOpen(true)}
                  className="w-full h-11 text-xs font-bold gap-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl shadow-xs tactile-pill cursor-pointer"
                >
                  <HeartHandshake className="h-4 w-4" />
                  <span>
                    {isPlatformCounselor ? "Message JaagrMind Counselor" : "Message School Counselor"}
                  </span>
                </Button>

                {/* Active Consultation Threads & Virtual Meetings */}
                {inquiries.length > 0 && (
                  <div className="pt-3 space-y-2 border-t border-border/40">
                    <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                      <span className="flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-sky-500" />
                        Active Inquiries & Discussions ({inquiries.length})
                      </span>
                    </div>

                    <div className="space-y-2 max-h-[340px] overflow-y-auto pr-0.5">
                      {inquiries.map((inq) => {
                        const hasMeeting = Boolean(inq.meeting_link || inq.meeting_date || inq.meeting_time);
                        return (
                          <div
                            key={inq.id}
                            className="p-3.5 rounded-xl border border-border/70 bg-card/90 space-y-2.5 shadow-xs"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <h5 className="text-xs font-bold text-foreground truncate">
                                  {inq.subject}
                                </h5>
                                <p className="text-[11px] text-muted-foreground">
                                  {inq.created_at ? new Date(inq.created_at).toLocaleDateString() : ""} &bull; {inq.student_name}
                                </p>
                              </div>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-medium border shrink-0 ${
                                  inq.status === "resolved"
                                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                                    : inq.status === "in_progress"
                                    ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                                    : "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                                }`}
                              >
                                {inq.status === "resolved"
                                  ? "Resolved"
                                  : inq.status === "in_progress"
                                  ? "In Progress"
                                  : "Open"}
                              </span>
                            </div>

                            {/* Recognized Meeting Card Banner with direct Click to Join button */}
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
                              className="w-full h-8 text-xs font-medium gap-1.5 rounded-lg border-border hover:bg-muted/50"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              <span>View Discussion & Reply</span>
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Practical Guidance Note */}
              <div className="mt-6 pt-5 border-t border-border/40 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  <span>Confidential Support</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {isPlatformCounselor
                    ? "Inquiries submitted here route securely to JaagrMind platform supervisors. We follow up with you via email."
                    : `Notes sent here are private between you and the school wellness counselor.`}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Standard Check-ins Set by Superadmin for this Grade */}
        <ParentStandardCheckins
          childName={activeChild.name}
          preferredName={activeChild.nickname || activeChild.name}
          grade={activeChild.grade}
          checkins={overview.standard_checkins || []}
          onStartCheckin={handleStartCheckin}
        />
      </main>

      {/* Modals */}
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

      <ParentCheckinDialog
        open={checkinModalOpen}
        onOpenChange={setCheckinModalOpen}
        checkin={selectedCheckin}
        studentId={activeChild.id}
        childName={activeChild.name}
        preferredName={activeChild.nickname || activeChild.name}
        grade={activeChild.grade}
        onSuccess={() => fetchOverview(activeChild.id)}
      />
    </div>
  );
}
