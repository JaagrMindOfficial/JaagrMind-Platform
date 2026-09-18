"use client";

import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  Stethoscope,
  HeartHandshake,
  GraduationCap,
  ArrowRight,
  ShieldCheck,
  Activity,
  Lock,
  Sparkles,
  ChevronRight,
  UserCheck,
} from "lucide-react";

export default function Home() {
  return (
    <div className="h-screen max-h-screen overflow-hidden bg-[#FFF8F0] dark:bg-[#141414] text-[#222222] dark:text-[#FFF8F0] flex flex-col justify-between transition-colors duration-300 select-none">
      
      {/* ── Background Subtle Ambient Accent (No Purple) ─────────────── */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[300px] bg-[#42B677]/8 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-[400px] h-[250px] bg-[#005456]/10 rounded-full blur-[120px] pointer-events-none" />

      {/* ── Top Header Bar ────────────────────────────────────────────── */}
      <header className="w-full px-6 sm:px-10 pt-5 pb-3 flex items-center justify-between relative z-20 shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-90">
            <img
              src="/DarkColorLogo.svg"
              alt="JaagrMind Logo"
              className="h-8 sm:h-9 w-auto dark:hidden object-contain"
            />
            <img
              src="/LightColorLogo.svg"
              alt="JaagrMind Logo"
              className="h-8 sm:h-9 w-auto hidden dark:block object-contain"
            />
          </Link>
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#42B677]/15 text-[#005456] dark:text-[#91D17C] border border-[#42B677]/30">
            <span className="h-1.5 w-1.5 rounded-full bg-[#42B677] animate-pulse" />
            Platform Gateway
          </span>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link href="/login">
            <Button
              variant="outline"
              size="sm"
              className="text-xs font-semibold border-[#222222]/20 dark:border-white/20 hover:bg-[#222222]/5 dark:hover:bg-white/10 text-[#222222] dark:text-[#FFF8F0] rounded-xl"
            >
              Universal Sign In
            </Button>
          </Link>
          <Link href="/signup?tab=institute">
            <Button
              size="sm"
              className="text-xs font-semibold bg-[#42B677] hover:bg-[#42B677]/90 text-white rounded-xl shadow-xs px-3.5"
            >
              Apply for Campus
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </header>

      {/* ── Center Gateway Console ────────────────────────────────────── */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 sm:px-10 flex flex-col justify-center items-center relative z-10 py-2">
        
        {/* Title & Tagline matching Brand Kit */}
        <div className="text-center space-y-2 mb-6 sm:mb-8 shrink-0 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-semibold bg-[#222222]/5 dark:bg-white/5 border border-[#222222]/15 dark:border-white/15 text-[#222222]/80 dark:text-white/80">
            <Sparkles className="h-3 w-3 text-[#42B677]" />
            <span>Emotions Made Easy • Multi-Role Access</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-[#222222] dark:text-[#FFF8F0] leading-tight">
            Making Young Minds{" "}
            <span className="font-highlight font-bold text-[#42B677] text-4xl sm:text-6xl italic inline-block underline decoration-[#91D17C]/60 decoration-wavy decoration-2 underline-offset-6">
              aware
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-[#222222]/70 dark:text-[#FFF8F0]/70 max-w-lg mx-auto">
            Select your dedicated workspace below to continue seamlessly into your portal without extra hops.
          </p>
        </div>

        {/* ── 4 Unified Portal Gateway Cards (Non-Scrollable Single Grid) ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 w-full max-w-6xl">
          
          {/* CARD 1: SCHOOL PORTAL */}
          <div className="group relative rounded-2xl border border-[#222222]/15 dark:border-white/15 bg-white/70 dark:bg-[#1c1c1c]/80 backdrop-blur-md p-5 flex flex-col justify-between transition-all duration-200 hover:border-[#42B677] hover:shadow-lg hover:shadow-[#42B677]/10 hover:-translate-y-0.5">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="h-10 w-10 rounded-xl bg-[#42B677]/15 text-[#42B677] flex items-center justify-center transition-colors group-hover:bg-[#42B677] group-hover:text-white shadow-xs">
                  <Building2 className="h-5 w-5" />
                </div>
                <Badge variant="outline" className="text-[10px] font-semibold border-[#42B677]/30 text-[#005456] dark:text-[#91D17C] bg-[#42B677]/5">
                  Institutions
                </Badge>
              </div>

              <div>
                <h2 className="text-base font-bold text-[#222222] dark:text-[#FFF8F0] group-hover:text-[#42B677] transition-colors">
                  Campus Desk
                </h2>
                <p className="text-[11px] text-[#222222]/70 dark:text-[#FFF8F0]/70 mt-0.5 leading-snug">
                  Principals, Administrators & Faculty Mentors
                </p>
              </div>

              <div className="pt-2 border-t border-[#222222]/10 dark:border-white/10 space-y-1.5 text-[11px] text-[#222222]/80 dark:text-[#FFF8F0]/80">
                <div className="flex items-center gap-1.5">
                  <span className="h-1 w-1 rounded-full bg-[#42B677]" />
                  <span>Diamond Radar telemetry</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-1 w-1 rounded-full bg-[#42B677]" />
                  <span>Multi-branch campus sync</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-1 w-1 rounded-full bg-[#42B677]" />
                  <span>Roster & promotion controls</span>
                </div>
              </div>
            </div>

            <div className="pt-4 space-y-2">
              <Link href="/school" className="w-full block">
                <Button className="w-full h-9 text-xs font-semibold bg-[#222222] hover:bg-[#222222]/90 dark:bg-white dark:text-[#222222] dark:hover:bg-white/90 text-white rounded-xl shadow-xs flex items-center justify-center gap-1.5">
                  <span>Enter School Desk</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
              <Link href="/signup?tab=institute" className="block text-center text-[10px] text-[#222222]/60 dark:text-[#FFF8F0]/60 hover:text-[#42B677] transition-colors">
                Apply for New School
              </Link>
            </div>
          </div>

          {/* CARD 2: COUNSELOR CARE DESK */}
          <div className="group relative rounded-2xl border border-[#222222]/15 dark:border-white/15 bg-white/70 dark:bg-[#1c1c1c]/80 backdrop-blur-md p-5 flex flex-col justify-between transition-all duration-200 hover:border-[#42B677] hover:shadow-lg hover:shadow-[#42B677]/10 hover:-translate-y-0.5">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="h-10 w-10 rounded-xl bg-[#005456]/15 text-[#005456] dark:text-[#91D17C] flex items-center justify-center transition-colors group-hover:bg-[#005456] group-hover:text-white shadow-xs">
                  <Stethoscope className="h-5 w-5" />
                </div>
                <Badge variant="outline" className="text-[10px] font-semibold border-[#005456]/30 text-[#005456] dark:text-[#91D17C] bg-[#005456]/5">
                  Clinical
                </Badge>
              </div>

              <div>
                <h2 className="text-base font-bold text-[#222222] dark:text-[#FFF8F0] group-hover:text-[#42B677] transition-colors">
                  Counselor Suite
                </h2>
                <p className="text-[11px] text-[#222222]/70 dark:text-[#FFF8F0]/70 mt-0.5 leading-snug">
                  Licensed Counselors & Campus Psychologists
                </p>
              </div>

              <div className="pt-2 border-t border-[#222222]/10 dark:border-white/10 space-y-1.5 text-[11px] text-[#222222]/80 dark:text-[#FFF8F0]/80">
                <div className="flex items-center gap-1.5">
                  <span className="h-1 w-1 rounded-full bg-[#42B677]" />
                  <span>4 Regulation cohorts triage</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-1 w-1 rounded-full bg-[#42B677]" />
                  <span>Diagnostic student dossiers</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-1 w-1 rounded-full bg-[#42B677]" />
                  <span>Intervention strategy playbooks</span>
                </div>
              </div>
            </div>

            <div className="pt-4 space-y-2">
              <Link href="/counselor" className="w-full block">
                <Button className="w-full h-9 text-xs font-semibold bg-[#222222] hover:bg-[#222222]/90 dark:bg-white dark:text-[#222222] dark:hover:bg-white/90 text-white rounded-xl shadow-xs flex items-center justify-center gap-1.5">
                  <span>Enter Care Desk</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
              <Link href="/internal-ops/signin" className="block text-center text-[10px] text-[#222222]/60 dark:text-[#FFF8F0]/60 hover:text-[#42B677] transition-colors">
                Central Ops Care Desk
              </Link>
            </div>
          </div>

          {/* CARD 3: FAMILY & PARENT DESK */}
          <div className="group relative rounded-2xl border border-[#222222]/15 dark:border-white/15 bg-white/70 dark:bg-[#1c1c1c]/80 backdrop-blur-md p-5 flex flex-col justify-between transition-all duration-200 hover:border-[#42B677] hover:shadow-lg hover:shadow-[#42B677]/10 hover:-translate-y-0.5">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="h-10 w-10 rounded-xl bg-[#42B677]/15 text-[#42B677] flex items-center justify-center transition-colors group-hover:bg-[#42B677] group-hover:text-white shadow-xs">
                  <HeartHandshake className="h-5 w-5" />
                </div>
                <Badge variant="outline" className="text-[10px] font-semibold border-[#42B677]/30 text-[#005456] dark:text-[#91D17C] bg-[#42B677]/5">
                  Family
                </Badge>
              </div>

              <div>
                <h2 className="text-base font-bold text-[#222222] dark:text-[#FFF8F0] group-hover:text-[#42B677] transition-colors">
                  Family Desk
                </h2>
                <p className="text-[11px] text-[#222222]/70 dark:text-[#FFF8F0]/70 mt-0.5 leading-snug">
                  Parents, Guardians & Family Caregivers
                </p>
              </div>

              <div className="pt-2 border-t border-[#222222]/10 dark:border-white/10 space-y-1.5 text-[11px] text-[#222222]/80 dark:text-[#FFF8F0]/80">
                <div className="flex items-center gap-1.5">
                  <span className="h-1 w-1 rounded-full bg-[#42B677]" />
                  <span>Child 4-pole growth radar</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-1 w-1 rounded-full bg-[#42B677]" />
                  <span>Atmosphere barometer check</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-1 w-1 rounded-full bg-[#42B677]" />
                  <span>Direct counselor consultations</span>
                </div>
              </div>
            </div>

            <div className="pt-4 space-y-2">
              <Link href="/parent" className="w-full block">
                <Button className="w-full h-9 text-xs font-semibold bg-[#222222] hover:bg-[#222222]/90 dark:bg-white dark:text-[#222222] dark:hover:bg-white/90 text-white rounded-xl shadow-xs flex items-center justify-center gap-1.5">
                  <span>Enter Family Desk</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
              <Link href="/signup?tab=independent" className="block text-center text-[10px] text-[#222222]/60 dark:text-[#FFF8F0]/60 hover:text-[#42B677] transition-colors">
                Create Parent Account
              </Link>
            </div>
          </div>

          {/* CARD 4: STUDENT JOURNEY */}
          <div className="group relative rounded-2xl border border-[#222222]/15 dark:border-white/15 bg-white/70 dark:bg-[#1c1c1c]/80 backdrop-blur-md p-5 flex flex-col justify-between transition-all duration-200 hover:border-[#42B677] hover:shadow-lg hover:shadow-[#42B677]/10 hover:-translate-y-0.5">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="h-10 w-10 rounded-xl bg-[#91D17C]/25 text-[#005456] dark:text-[#91D17C] flex items-center justify-center transition-colors group-hover:bg-[#91D17C] group-hover:text-black shadow-xs">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <Badge variant="outline" className="text-[10px] font-semibold border-[#91D17C]/40 text-[#005456] dark:text-[#91D17C] bg-[#91D17C]/10">
                  Learners
                </Badge>
              </div>

              <div>
                <h2 className="text-base font-bold text-[#222222] dark:text-[#FFF8F0] group-hover:text-[#42B677] transition-colors">
                  Student Check-in
                </h2>
                <p className="text-[11px] text-[#222222]/70 dark:text-[#FFF8F0]/70 mt-0.5 leading-snug">
                  Adolescents & Enrolled Campus Students
                </p>
              </div>

              <div className="pt-2 border-t border-[#222222]/10 dark:border-white/10 space-y-1.5 text-[11px] text-[#222222]/80 dark:text-[#FFF8F0]/80">
                <div className="flex items-center gap-1.5">
                  <span className="h-1 w-1 rounded-full bg-[#42B677]" />
                  <span>2-Min Box Breath centering</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-1 w-1 rounded-full bg-[#42B677]" />
                  <span>Sensory Mind Weather check</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-1 w-1 rounded-full bg-[#42B677]" />
                  <span>Dilemma scenario reflection</span>
                </div>
              </div>
            </div>

            <div className="pt-4 space-y-2">
              <Link href="/student/login" className="w-full block">
                <Button className="w-full h-9 text-xs font-semibold bg-[#42B677] hover:bg-[#42B677]/90 text-white rounded-xl shadow-xs flex items-center justify-center gap-1.5">
                  <span>Enter Student Access ID</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
              <Link href="/preview/assessment/default" className="block text-center text-[10px] text-[#222222]/60 dark:text-[#FFF8F0]/60 hover:text-[#42B677] transition-colors">
                Preview Sample Journey
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* ── Bottom Clinical Standards Strip & Direct Ops Link ───────── */}
      <footer className="w-full px-6 sm:px-10 py-3.5 border-t border-[#222222]/10 dark:border-white/10 relative z-20 shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-[#222222]/60 dark:text-[#FFF8F0]/60">
        
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-[#42B677]" />
            Zero-Emoji Clinical Rigor
          </span>
          <span className="hidden md:inline-flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5 text-[#42B677]" />
            4-Pole Diamond Matrix
          </span>
          <span className="hidden md:inline-flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5 text-[#42B677]" />
            Confidential & Encrypted
          </span>
        </div>

        <div className="flex items-center gap-4 font-medium">
          <Link href="/login" className="hover:text-[#42B677] transition-colors">
            Staff Sign In
          </Link>
          <span>•</span>
          <Link href="/internal-ops/signin" className="hover:text-[#42B677] transition-colors flex items-center gap-1">
            <UserCheck className="h-3 w-3" />
            Internal Ops
          </Link>
          <span>•</span>
          <span>© {new Date().getFullYear()} JaagrMind</span>
        </div>
      </footer>
    </div>
  );
}
