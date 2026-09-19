"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { BrandSidePanel } from "@/components/brand-side-panel";
import { useAuth } from "@/context/auth-context";
import {
  Building2,
  HeartHandshake,
  GraduationCap,
  ArrowRight,
} from "lucide-react";

interface WorkspaceItem {
  id: string;
  num: string;
  keyNumber: string;
  title: string;
  bracket?: string;
  subtitle: string;
  icon: any;
  accent: string;
  badge: string;
}

const workspaces: WorkspaceItem[] = [
  {
    id: "institutional",
    num: "01",
    keyNumber: "1",
    title: "Institutional",
    bracket: "(School Admin, Teacher, School Counselor)",
    subtitle: "School leadership, multi-branch telemetry, classroom & campus counseling",
    icon: Building2,
    accent: "#42B677",
    badge: "Campus",
  },
  {
    id: "family",
    num: "02",
    keyNumber: "2",
    title: "Family & Guardian",
    subtitle: "Parent growth radar, living atmosphere barometer & care advisory",
    icon: HeartHandshake,
    accent: "#42B677",
    badge: "Home Care",
  },
  {
    id: "student",
    num: "03",
    keyNumber: "3",
    title: "Student",
    subtitle: "Access ID check-in, centering breath & reflective dilemmas",
    icon: GraduationCap,
    accent: "#91D17C",
    badge: "Learner",
  },
];

export default function Home() {
  const router = useRouter();
  const { user, loading, hasRole } = useAuth();
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const getWorkspaceDestination = (workspaceId: string): string => {
    // Check if session / cookies / token are valid
    const token = typeof window !== "undefined"
      ? localStorage.getItem("token") || (document.cookie.match(/(?:^|; )token=([^;]*)/)?.[1] ?? null)
      : null;
    const isValidSession = Boolean(token && user);

    if (workspaceId === "institutional") {
      if (isValidSession) {
        if (hasRole("counselor")) return "/counselor";
        if (hasRole("school_admin") || hasRole("teacher")) return "/school";
        if (hasRole("superadmin") || user?.is_internal) return "/internal-ops/admin";
        return "/school";
      }
      return "/login?redirect=/school";
    }

    if (workspaceId === "family") {
      if (isValidSession) return "/parent";
      return "/login?redirect=/parent&role=parent";
    }

    if (workspaceId === "student") {
      if (isValidSession && (hasRole("student") || (user as any)?.role === "student")) return "/student";
      return "/student/login";
    }

    return "/";
  };

  const handleWorkspaceClick = (e: React.MouseEvent, item: WorkspaceItem) => {
    e.preventDefault();
    const dest = getWorkspaceDestination(item.id);
    router.push(dest);
  };

  // Keyboard shortcut listener: Press 1, 2, or 3 to immediately enter
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const target = workspaces.find((w) => w.keyNumber === e.key);
      if (target) {
        const dest = getWorkspaceDestination(target.id);
        router.push(dest);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router, user, loading]);

  return (
    <div className="h-screen max-h-screen overflow-hidden w-screen bg-[#FFF8F0] dark:bg-[#121212] text-[#222222] dark:text-[#FFF8F0] flex flex-col md:flex-row relative select-none">

      {/* ── Discreet Top-Right Theme Toggle ──────────────────────────── */}
      <div className="absolute top-5 right-6 z-30">
        <ThemeToggle />
      </div>

      {/* ── LEFT SIDE: Brand Kit Architectural Graphics ──────────────── */}
      <BrandSidePanel />

      {/* ── RIGHT SIDE: Workspace Portal Launcher ─────────────────────── */}
      <div className="w-full md:w-7/12 lg:w-[54%] h-full flex flex-col justify-center px-8 sm:px-12 lg:px-16 py-8 relative">

        {/* Subtle Ambient Radial Glow */}
        <div className="absolute top-1/4 right-1/4 w-80 h-80 bg-[#42B677]/8 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-xl w-full mx-auto space-y-6 relative z-10">

          {/* Header */}
          <div className="space-y-1.5">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#222222] dark:text-[#FFF8F0]">
              Select your space
            </h2>
            <p className="text-xs text-[#222222]/60 dark:text-[#FFF8F0]/60 flex items-center gap-2">
              <span>Choose a portal to enter or press</span>
              <span className="inline-flex items-center font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#222222]/10 dark:bg-white/10 text-[#222222] dark:text-white">
                1 – 3
              </span>
            </p>
          </div>

          {/* 3 Sleek Horizontal Workspace Rows */}
          <div className="space-y-3">
            {workspaces.map((item) => {
              const Icon = item.icon;
              const isHovered = hoveredId === item.id;
              const destination = getWorkspaceDestination(item.id);

              return (
                <Link
                  key={item.id}
                  href={destination}
                  onClick={(e) => handleWorkspaceClick(e, item)}
                  onMouseEnter={() => setHoveredId(item.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  className={`group w-full p-4 rounded-2xl border transition-all duration-200 flex items-center justify-between cursor-pointer relative overflow-hidden ${isHovered
                      ? "border-[#222222] dark:border-[#42B677] bg-white dark:bg-[#1a1a1a] shadow-md -translate-y-0.5"
                      : "border-[#222222]/15 dark:border-white/10 bg-white/70 dark:bg-[#181818]/60 backdrop-blur-sm hover:border-[#222222]/40"
                    }`}
                >
                  {/* Left Pill Accent on hover */}
                  <div
                    className={`absolute left-0 top-0 bottom-0 w-1 transition-all duration-200 ${isHovered ? "bg-[#42B677] opacity-100" : "opacity-0"
                      }`}
                  />

                  <div className="flex items-center gap-3.5 pl-1.5">
                    {/* Number & Key indicator */}
                    <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-[#222222]/40 dark:text-white/40 group-hover:text-[#42B677] transition-colors">
                      <span>{item.num}</span>
                      <span className="hidden sm:inline-block text-[10px] text-[#222222]/30 dark:text-white/30">
                        [{item.keyNumber}]
                      </span>
                    </div>

                    {/* Icon */}
                    <div className="h-9 w-9 rounded-xl bg-[#222222]/5 dark:bg-white/5 flex items-center justify-center text-[#222222] dark:text-[#FFF8F0] group-hover:bg-[#42B677] group-hover:text-white transition-colors">
                      <Icon className="h-4 w-4" />
                    </div>

                    {/* Titles */}
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-bold text-[#222222] dark:text-[#FFF8F0] group-hover:text-[#005456] dark:group-hover:text-[#91D17C] transition-colors">
                          {item.title}
                        </h3>
                        {item.bracket && (
                          <span className="text-xs text-[#222222]/70 dark:text-[#FFF8F0]/70 font-medium">
                            {item.bracket}
                          </span>
                        )}
                        <span className="text-[10px] uppercase font-bold tracking-wider text-[#42B677]">
                          {item.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#222222]/65 dark:text-[#FFF8F0]/65 mt-0.5 line-clamp-1">
                        {item.subtitle}
                      </p>
                    </div>
                  </div>

                  {/* Right Arrow */}
                  <div className="h-8 w-8 rounded-full border border-[#222222]/15 dark:border-white/15 flex items-center justify-center text-[#222222]/50 dark:text-white/50 group-hover:border-[#222222] dark:group-hover:border-[#42B677] group-hover:text-[#222222] dark:group-hover:text-[#42B677] group-hover:bg-[#42B677]/10 transition-all shrink-0 ml-3">
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Quick Sign In / Onboarding Alternative */}
          <div className="pt-2 flex items-center justify-between text-xs text-[#222222]/60 dark:text-[#FFF8F0]/60">
            <Link
              href="/login"
              className="font-medium hover:text-[#42B677] transition-colors"
            >
              Have existing credentials? <span className="underline underline-offset-4 text-[#222222] dark:text-[#FFF8F0]">Sign In</span>
            </Link>
            <Link
              href="/signup?tab=institute"
              className="font-medium hover:text-[#42B677] transition-colors"
            >
              New school? <span className="underline underline-offset-4 text-[#42B677]">Apply here</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ── Discrete Bottom-Right Copyright Overlay ──────────────────── */}
      <div className="absolute bottom-5 right-6 z-20 text-[11px] font-mono tracking-wider text-[#222222]/40 dark:text-[#FFF8F0]/40 pointer-events-none">
        JaagrMind © 2026
      </div>
    </div>
  );
}
