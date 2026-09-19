"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { BrandSidePanel } from "@/components/brand-side-panel";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth-context";
import { getActiveSessionDetails } from "@/lib/session-utils";
import {
  Building2,
  HeartHandshake,
  GraduationCap,
  ArrowRight,
  ArrowUpRight,
  LogOut,
  ShieldCheck,
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
  const { user, loading, hasRole, logout } = useAuth();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const activeSession = mounted && user ? getActiveSessionDetails(user, hasRole) : null;

  const getWorkspaceDestination = (workspaceId: string): string => {
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

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (activeSession) {
        if (e.key === "Enter") {
          router.push(activeSession.destination);
        }
        return;
      }

      const target = workspaces.find((w) => w.keyNumber === e.key);
      if (target) {
        const dest = getWorkspaceDestination(target.id);
        router.push(dest);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router, activeSession]);

  return (
    <div className="h-screen max-h-screen overflow-hidden w-screen bg-[#FFF8F0] dark:bg-[#121212] text-[#222222] dark:text-[#FFF8F0] flex flex-col md:flex-row relative select-none">

      {/* ── Top-Right Controls: Visit Our Page + JM Internal-Ops + Theme Toggle ── */}
      <div className="absolute top-5 right-6 z-30 flex items-center gap-2.5">
        <a
          href="https://jaagrmind.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-medium text-[#222222]/70 dark:text-[#FFF8F0]/70 hover:text-[#42B677] dark:hover:text-[#42B677] transition-colors flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl hover:bg-[#222222]/5 dark:hover:bg-white/5"
        >
          <span>Visit our page</span>
          <ArrowUpRight className="h-3.5 w-3.5" />
        </a>

        <div className="h-4 w-px bg-[#222222]/15 dark:bg-white/15" />

        <Link
          href="/internal-ops/signin"
          className="text-xs font-semibold text-[#005456] dark:text-[#91D17C] hover:text-[#42B677] transition-colors flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-[#005456]/20 dark:border-[#42B677]/30 bg-white/60 dark:bg-[#181818]/60 hover:bg-[#005456]/10 shadow-2xs"
        >
          <ShieldCheck className="h-3.5 w-3.5 text-[#42B677]" />
          <span>JM Internal-Ops</span>
        </Link>

        <div className="h-4 w-px bg-[#222222]/15 dark:bg-white/15" />

        <ThemeToggle />
      </div>

      {/* ── LEFT SIDE: Brand Kit Architectural Graphics ──────────────── */}
      <BrandSidePanel />

      {/* ── RIGHT SIDE: Workspace Portal Launcher or Active Session ──── */}
      <div className="w-full md:w-7/12 lg:w-[54%] h-full flex flex-col justify-center px-8 sm:px-12 lg:px-16 py-8 relative">

        {/* Subtle Ambient Radial Glow */}
        <div className="absolute top-1/4 right-1/4 w-80 h-80 bg-[#42B677]/8 rounded-full blur-[120px] pointer-events-none" />

        {/* ── CASE 1: Logged-in Active Session (Cookie / Token detected) ── */}
        {activeSession ? (
          <div className="max-w-xl w-full mx-auto space-y-6 relative z-10">
            {/* Header */}
            <div className="space-y-1.5">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#222222] dark:text-[#FFF8F0]">
                Welcome back, {user?.name?.split(" ")[0] || "there"}
              </h2>
              <p className="text-xs text-[#222222]/60 dark:text-[#FFF8F0]/60 flex items-center gap-2">
                <span>Active session in</span>
                <span className="font-semibold text-[#42B677]">{activeSession.space}</span>
              </p>
            </div>

            {/* Active Session Card */}
            <div className="rounded-2xl border border-[#222222]/15 dark:border-white/10 bg-white/80 dark:bg-[#181818]/80 backdrop-blur-md p-6 sm:p-7 shadow-lg space-y-6 relative overflow-hidden">
              {/* Top Accent Strip */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#005456] via-[#42B677] to-[#91D17C]" />

              {/* Space Pill & Status */}
              <div className="flex items-center justify-between">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase bg-[#42B677]/10 text-[#42B677] border border-[#42B677]/20">
                  <span className="h-2 w-2 rounded-full bg-[#42B677] animate-pulse" />
                  <span>{activeSession.space}</span>
                </div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-[#222222]/50 dark:text-[#FFF8F0]/50">
                  {activeSession.spaceBadge}
                </span>
              </div>

              {/* Profile & Role Details */}
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-2xl bg-[#42B677]/15 dark:bg-[#42B677]/20 text-[#42B677] flex items-center justify-center shrink-0 shadow-xs">
                  <activeSession.icon className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg font-bold text-[#222222] dark:text-[#FFF8F0] tracking-tight">
                      {activeSession.role}
                    </h3>
                  </div>
                  <p className="text-xs font-medium text-[#222222]/70 dark:text-[#FFF8F0]/70 mt-0.5 truncate">
                    {user?.name} <span className="text-[#222222]/40 dark:text-white/40 font-mono">({user?.email})</span>
                  </p>
                  <p className="text-[11px] text-[#222222]/60 dark:text-[#FFF8F0]/60 mt-1 line-clamp-2">
                    {activeSession.subtitle}
                  </p>
                </div>
              </div>

              {/* Direct Actions */}
              <div className="space-y-2.5 pt-1">
                <Button
                  onClick={() => router.push(activeSession.destination)}
                  className="w-full h-11 text-xs sm:text-sm font-semibold bg-[#42B677] hover:bg-[#42B677]/90 text-white rounded-xl shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <span>Continue to Dashboard</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => logout("/")}
                  className="w-full h-10 text-xs font-semibold border-[#222222]/15 dark:border-white/15 hover:border-destructive/40 text-destructive dark:text-red-400 hover:bg-destructive/10 dark:hover:bg-destructive/20 rounded-xl cursor-pointer flex items-center justify-center gap-2 transition-colors"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Sign Out</span>
                </Button>
              </div>
            </div>

            {/* Quick Helper */}
            <div className="text-center text-xs text-[#222222]/50 dark:text-white/50">
              <span>Need to access a different role or campus? </span>
              <button
                type="button"
                onClick={() => logout("/")}
                className="text-[#42B677] font-semibold hover:underline cursor-pointer"
              >
                Sign out to view all spaces
              </button>
            </div>
          </div>
        ) : (
          /* ── CASE 2: Unauthenticated - 3 Workspace Selection Cards ── */
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
                    className={`group w-full p-4 rounded-2xl border transition-all duration-200 flex items-center justify-between cursor-pointer relative overflow-hidden ${
                      isHovered
                        ? "border-[#222222] dark:border-[#42B677] bg-white dark:bg-[#1a1a1a] shadow-md -translate-y-0.5"
                        : "border-[#222222]/15 dark:border-white/10 bg-white/70 dark:bg-[#181818]/60 backdrop-blur-sm hover:border-[#222222]/40"
                    }`}
                  >
                    {/* Left Pill Accent on hover */}
                    <div
                      className={`absolute left-0 top-0 bottom-0 w-1 transition-all duration-200 ${
                        isHovered ? "bg-[#42B677] opacity-100" : "opacity-0"
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
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs text-[#222222]/60 dark:text-[#FFF8F0]/60">
              <Link
                href="/login"
                className="font-medium hover:text-[#42B677] transition-colors"
              >
                Have existing credentials? <span className="underline underline-offset-4 text-[#222222] dark:text-[#FFF8F0]">Sign In</span>
              </Link>
              
              <div className="flex items-center gap-2.5 flex-wrap justify-center sm:justify-end">
                <Link
                  href="/signup?tab=parent"
                  className="font-medium hover:text-[#42B677] transition-colors"
                >
                  Parent / Guardian? <span className="underline underline-offset-4 text-[#42B677]">Sign up here</span>
                </Link>
                <span className="text-[#222222]/20 dark:text-white/20">·</span>
                <Link
                  href="/signup?tab=institute"
                  className="font-medium hover:text-[#42B677] transition-colors"
                >
                  New school? <span className="underline underline-offset-4 text-[#42B677]">Apply here</span>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Discrete Bottom-Right Copyright Overlay ──────────────────── */}
      <div className="absolute bottom-5 right-6 z-20 text-[11px] font-mono tracking-wider text-[#222222]/40 dark:text-[#FFF8F0]/40 pointer-events-none">
        JaagrMind © 2026
      </div>
    </div>
  );
}
