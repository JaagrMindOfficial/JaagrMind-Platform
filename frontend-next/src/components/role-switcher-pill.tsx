"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import {
  ShieldCheck,
  GraduationCap,
  HeartHandshake,
  Users,
  Lock,
  CheckCircle2,
  ArrowRight,
  Loader2,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

export function RoleSwitcherPill() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, hasRole, enableParentRole } = useAuth();

  const [guideOpen, setGuideOpen] = useState(false);
  const [activating, setActivating] = useState(false);
  const [isTeacherView, setIsTeacherView] = useState(false);

  const isInternalUser = !!user?.is_internal || hasRole("superadmin") || (user?.email?.toLowerCase().endsWith("@jaagrmind.com") ?? false);
  const isSchoolAdmin = hasRole("school_admin");
  const isTeacher = hasRole("teacher");
  const isCounselor = hasRole("counselor");
  const isParent = hasRole("parent") || hasRole("relative");

  useEffect(() => {
    if (searchParams?.get("view") === "teacher") {
      setIsTeacherView(true);
    } else {
      setIsTeacherView(false);
    }
  }, [searchParams]);

  if (!user) return null;

  // 1. JaagrMind Internal Operations members cannot switch roles. They are strictly what they are assigned.
  if (isInternalUser) {
    return null;
  }

  // 2. Pure Parent users cannot switch to counselor or teacher. Counselor is an invite-only role assigned by a school.
  if (isParent && !isSchoolAdmin && !isTeacher && !isCounselor) {
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted/60 border border-border/70 text-xs font-semibold text-foreground shadow-2xs">
        <Users className="h-3.5 w-3.5 text-emerald-500" />
        <span>Parent Portal</span>
      </div>
    );
  }

  // Determine active pill
  let activeRole = "";
  if (pathname.startsWith("/parent")) {
    activeRole = "parent";
  } else if (pathname.startsWith("/counselor")) {
    activeRole = "counselor";
  } else if (isSchoolAdmin && isTeacher) {
    activeRole = isTeacherView ? "teacher" : "school_admin";
  } else if (isSchoolAdmin) {
    activeRole = "school_admin";
  } else if (isTeacher) {
    activeRole = "teacher";
  } else if (isCounselor) {
    activeRole = "counselor";
  } else if (isParent) {
    activeRole = "parent";
  }

  const handleSchoolAdminClick = () => {
    setIsTeacherView(false);
    router.push("/school");
  };

  const handleTeacherClick = () => {
    if (isSchoolAdmin && isTeacher) {
      setIsTeacherView(true);
      router.push("/school?view=teacher");
    } else {
      router.push("/school");
    }
  };

  const handleCounselorClick = () => {
    router.push("/counselor");
  };

  const handleParentClick = () => {
    if (isParent) {
      router.push("/parent");
    } else {
      setGuideOpen(true);
    }
  };

  const handleActivateParent = async () => {
    try {
      setActivating(true);
      await enableParentRole();
      setGuideOpen(false);
      router.push("/parent");
    } catch (err) {
      console.error("Failed to activate parent role", err);
    } finally {
      setActivating(false);
    }
  };

  return (
    <>
      <div className="inline-flex items-center p-0.5 rounded-full bg-muted/70 border border-border shadow-2xs">
        {/* 1. School Admin Role (Visible ONLY for accounts with school_admin) */}
        {isSchoolAdmin && (
          <button
            type="button"
            onClick={handleSchoolAdminClick}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all duration-150 cursor-pointer ${
              activeRole === "school_admin"
                ? "bg-background text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground hover:bg-background/40"
            }`}
            title="School Administrator Portal"
          >
            <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-primary" />
            <span>School Admin</span>
          </button>
        )}

        {/* 2. Teacher Role (Visible ONLY for accounts with teacher) */}
        {isTeacher && (
          <button
            type="button"
            onClick={handleTeacherClick}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all duration-150 cursor-pointer ${
              activeRole === "teacher"
                ? "bg-background text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground hover:bg-background/40"
            }`}
            title="Classroom Teacher Portal"
          >
            <GraduationCap className="h-3.5 w-3.5 shrink-0 text-blue-500" />
            <span>Teacher</span>
          </button>
        )}

        {/* 3. Counselor Role (Visible ONLY for accounts with counselor role given by school) */}
        {isCounselor && (
          <button
            type="button"
            onClick={handleCounselorClick}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all duration-150 cursor-pointer ${
              activeRole === "counselor"
                ? "bg-background text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground hover:bg-background/40"
            }`}
            title="School Counselor Desk"
          >
            <HeartHandshake className="h-3.5 w-3.5 shrink-0 text-amber-500" />
            <span>Counselor</span>
          </button>
        )}

        {/* 4. Parent Role (Visible for all, with 1-click enable if not yet activated) */}
        <button
          type="button"
          onClick={handleParentClick}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all duration-150 cursor-pointer ${
            activeRole === "parent"
              ? "bg-background text-foreground shadow-xs font-semibold"
              : isParent
              ? "text-muted-foreground hover:text-foreground hover:bg-background/40"
              : "text-muted-foreground hover:text-primary hover:bg-primary/10 border border-dashed border-primary/30"
          }`}
          title={isParent ? "Parent & Guardian Portal" : "Click to view guide and enable Parent Portal"}
        >
          <Users className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
          <span>Parent</span>
          {!isParent && (
            <Badge variant="outline" className="ml-1 text-[9px] px-1 py-0 h-3.5 bg-primary/5 text-primary border-primary/20">
              Enable
            </Badge>
          )}
        </button>
      </div>

      {/* Guide Dialog for Enabling Parent Dashboard */}
      <Dialog open={guideOpen} onOpenChange={setGuideOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold">Enable Parent Dashboard</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Connect your educator or counselor profile to your family role under a single login.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs text-muted-foreground">
            <div className="p-3 rounded-lg bg-muted/40 border border-border space-y-2">
              <p className="font-medium text-foreground text-[13px] flex items-center gap-1.5">
                <Info className="h-4 w-4 text-primary" />
                Who is the Parent Dashboard for?
              </p>
              <p className="leading-relaxed">
                The Parent Dashboard is designed for mothers, fathers, and legal guardians who want to monitor their child&apos;s holistic developmental progress, cognitive resilience, and school wellness assessments.
              </p>
            </div>

            <div className="space-y-2">
              <p className="font-semibold text-foreground text-[11px] uppercase tracking-wider font-mono">
                Key Features Included:
              </p>
              <div className="grid gap-2">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span><strong>Student Linkage:</strong> Connect with your child&apos;s unique School Access ID.</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span><strong>Growth Radar:</strong> View 6-dimensional developmental cognitive insights.</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span><strong>Instant Switching:</strong> Toggle between your school staff view and parenting view via the header pill slider at any time.</span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setGuideOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={activating}
              onClick={handleActivateParent}
              className="text-xs font-semibold gap-1.5"
            >
              {activating ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Activating...</span>
                </>
              ) : (
                <>
                  <span>Activate Parent Dashboard</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
