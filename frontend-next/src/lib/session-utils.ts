import { Building2, HeartHandshake, GraduationCap, ShieldCheck } from "lucide-react";
import type { User } from "@/context/auth-context";

export interface ActiveSessionDetails {
  space: string;
  spaceBadge: string;
  role: string;
  subtitle: string;
  destination: string;
  icon: any;
  accent: string;
}

export function getActiveSessionDetails(
  user: User | null,
  hasRole: (role: string) => boolean
): ActiveSessionDetails | null {
  if (!user) return null;

  const isInternal = hasRole("superadmin") || Boolean(user.is_internal);
  const isCounselor = hasRole("counselor");
  const isSchoolAdmin = hasRole("school_admin");
  const isTeacher = hasRole("teacher");
  const isStudent = hasRole("student") || (user as any).role === "student";
  const isParent = hasRole("parent") || hasRole("relative");

  if (isInternal) {
    return {
      space: "Internal Operations",
      spaceBadge: "ORG. Admin",
      role: "Platform Administrator",
      subtitle: "Platform telemetry, institutional onboarding & access governance",
      destination: "/internal-ops/admin",
      icon: ShieldCheck,
      accent: "#42B677",
    };
  }

  if (isCounselor) {
    return {
      space: "Institutional",
      spaceBadge: "Counselor Desk",
      role: "School Counselor",
      subtitle: "Student psychological safety, 4-pole clinical dossier & direct guidance",
      destination: "/counselor",
      icon: Building2,
      accent: "#42B677",
    };
  }

  if (isSchoolAdmin) {
    return {
      space: "Institutional",
      spaceBadge: "Campus Leadership",
      role: "School Administrator",
      subtitle: "Institutional roster telemetry, counselor allocation & class oversight",
      destination: "/school",
      icon: Building2,
      accent: "#42B677",
    };
  }

  if (isTeacher) {
    return {
      space: "Institutional",
      spaceBadge: "Academic Faculty",
      role: "Classroom Teacher",
      subtitle: "Classroom behavioral trends, student engagement & academic roster",
      destination: "/school",
      icon: Building2,
      accent: "#42B677",
    };
  }

  if (isParent) {
    return {
      space: "Family & Guardian",
      spaceBadge: "Caregiver Circle",
      role: hasRole("relative") ? "Guardian / Relative" : "Parent",
      subtitle: "Child emotional radar, living atmosphere barometer & care advisory",
      destination: "/parent",
      icon: HeartHandshake,
      accent: "#42B677",
    };
  }

  if (isStudent) {
    return {
      space: "Student",
      spaceBadge: "Learner Portal",
      role: "Adolescent Learner",
      subtitle: "Access check-in, centering breath & reflective dilemmas",
      destination: "/student",
      icon: GraduationCap,
      accent: "#91D17C",
    };
  }

  return {
    space: "Workspace",
    spaceBadge: "Verified",
    role: user.role || "Member",
    subtitle: "Access your authorized JaagrMind workspace",
    destination: "/dashboard",
    icon: Building2,
    accent: "#42B677",
  };
}
