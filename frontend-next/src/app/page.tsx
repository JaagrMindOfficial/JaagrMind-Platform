"use client";

import { useState } from "react";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  Stethoscope,
  HeartHandshake,
  GraduationCap,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Activity,
  Compass,
  CheckCircle2,
  Layers,
  BookOpen,
  Calendar,
  Lock,
  ChevronRight,
  Smile,
  Zap,
  Eye,
  BarChart3,
  Network,
  Users,
} from "lucide-react";

export default function Home() {
  const [activePortalTab, setActivePortalTab] = useState<"school" | "counselor" | "parent" | "student">("school");

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-active-mint/20 selection:text-active-mint">
      
      {/* ── Top Navigation Bar ────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          
          {/* Brand Logo & Tagline */}
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
            <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium tracking-wide bg-active-mint/10 text-active-mint border border-active-mint/20">
              <span className="h-1.5 w-1.5 rounded-full bg-active-mint animate-pulse" />
              Emotions Made Easy
            </span>
          </div>

          {/* Center Navigation Links */}
          <nav className="hidden lg:flex items-center gap-6 text-xs sm:text-sm font-medium text-muted-foreground">
            <a href="#portals" className="hover:text-foreground transition-colors">
              Platform Portals
            </a>
            <a href="#regulation-model" className="hover:text-foreground transition-colors">
              Regulation Model
            </a>
            <a href="#brand-dna" className="hover:text-foreground transition-colors">
              Brand DNA
            </a>
            <a href="#palette" className="hover:text-foreground transition-colors">
              Palette
            </a>
          </nav>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2.5">
            <ThemeToggle />
            <Link href="/login">
              <Button variant="ghost" size="sm" className="text-xs sm:text-sm font-medium hover:bg-muted">
                Sign In
              </Button>
            </Link>
            <Link href="/signup">
              <Button size="sm" className="text-xs sm:text-sm font-semibold bg-active-mint hover:bg-active-mint/90 text-white shadow-xs px-3.5 sm:px-4">
                Get Started
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero Section: "Making Young Minds Aware" ───────────────────── */}
      <section className="relative overflow-hidden pt-16 pb-20 md:pt-24 md:pb-28 border-b border-border/40">
        {/* Subtle Background Glows (Active Mint & Deep Teal, Zero Purple) */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-active-mint/10 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute top-1/3 right-10 w-[400px] h-[250px] bg-deep-teal/15 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center relative z-10 space-y-8">
          
          {/* Brand Philosophy Pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-medium bg-active-mint/10 border border-active-mint/25 text-active-mint shadow-xs">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Adolescent Behavioral Regulation & Assessment Platform</span>
          </div>

          {/* Headline matching Brand Typography */}
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-foreground leading-[1.08] max-w-4xl mx-auto">
            Making Young Minds{" "}
            <span className="font-highlight font-bold text-active-mint italic text-5xl sm:text-7xl md:text-8xl relative inline-block underline decoration-fresh-mint/40 decoration-wavy decoration-2 underline-offset-8">
              aware
            </span>
          </h1>

          {/* Body description matching brand kit */}
          <p className="max-w-2xl mx-auto text-base sm:text-lg text-muted-foreground leading-relaxed">
            Holistic support, early assessments, and guided therapy for every young mind finding its voice. 
            Clinically grounded, tech-enabled regulation for schools, counselors, and families.
          </p>

          {/* Primary Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3.5 pt-2">
            <Link href="/signup?tab=institute">
              <Button size="lg" className="h-12 px-6 font-semibold bg-active-mint hover:bg-active-mint/90 text-white shadow-md hover:shadow-active-mint/20 transition-all">
                <Building2 className="mr-2 h-4 w-4" />
                Apply for Campus
              </Button>
            </Link>
            <Link href="/student/login">
              <Button size="lg" variant="outline" className="h-12 px-6 font-semibold border-border hover:bg-muted/60 transition-all">
                <GraduationCap className="mr-2 h-4 w-4 text-active-mint" />
                Student Check-in
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="ghost" className="h-12 px-5 font-semibold text-muted-foreground hover:text-foreground">
                Staff & Parent Login
                <ChevronRight className="ml-1.5 h-4 w-4" />
              </Button>
            </Link>
          </div>

          {/* Quality Standards Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-8 max-w-4xl mx-auto border-t border-border/50 text-left">
            <div className="p-3 rounded-lg bg-card/60 border border-border/60">
              <div className="flex items-center gap-2 text-active-mint text-xs font-semibold">
                <ShieldCheck className="h-4 w-4 shrink-0" />
                <span>Zero Emoji Rigor</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Clinical assessment terminology with dignity
              </p>
            </div>
            <div className="p-3 rounded-lg bg-card/60 border border-border/60">
              <div className="flex items-center gap-2 text-active-mint text-xs font-semibold">
                <Activity className="h-4 w-4 shrink-0" />
                <span>4-Bucket Matrix</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Focus, Calm, Expression, Harmony
              </p>
            </div>
            <div className="p-3 rounded-lg bg-card/60 border border-border/60">
              <div className="flex items-center gap-2 text-active-mint text-xs font-semibold">
                <Network className="h-4 w-4 shrink-0" />
                <span>Branch Telemetry</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Centralized multi-campus institutional oversight
              </p>
            </div>
            <div className="p-3 rounded-lg bg-card/60 border border-border/60">
              <div className="flex items-center gap-2 text-active-mint text-xs font-semibold">
                <Lock className="h-4 w-4 shrink-0" />
                <span>Encrypted Privacy</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                FERPA-aligned student psychological confidentiality
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Interactive 4-Portal Hub (Creative Tabs Section) ─────────── */}
      <section id="portals" className="py-20 md:py-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="text-center space-y-3 mb-12">
          <Badge variant="outline" className="px-3 py-0.5 text-xs text-active-mint border-active-mint/30 bg-active-mint/5">
            Role-Based Multi-Tenancy
          </Badge>
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-foreground">
            Four Unified Ecosystem Portals
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto">
            Switch between portals below to explore dedicated interfaces engineered specifically for each stakeholder.
          </p>
        </div>

        {/* Tab Navigation Buttons */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 p-1.5 rounded-2xl bg-muted/40 border border-border/80 max-w-4xl mx-auto mb-8 shadow-xs">
          <button
            onClick={() => setActivePortalTab("school")}
            className={`flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              activePortalTab === "school"
                ? "bg-card text-foreground border border-active-mint/40 shadow-sm ring-2 ring-active-mint/15"
                : "text-muted-foreground hover:text-foreground hover:bg-card/50"
            }`}
          >
            <Building2 className={`h-4 w-4 ${activePortalTab === "school" ? "text-active-mint" : "text-muted-foreground"}`} />
            <span>Campus Desk</span>
          </button>

          <button
            onClick={() => setActivePortalTab("counselor")}
            className={`flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              activePortalTab === "counselor"
                ? "bg-card text-foreground border border-active-mint/40 shadow-sm ring-2 ring-active-mint/15"
                : "text-muted-foreground hover:text-foreground hover:bg-card/50"
            }`}
          >
            <Stethoscope className={`h-4 w-4 ${activePortalTab === "counselor" ? "text-active-mint" : "text-muted-foreground"}`} />
            <span>Counselor Suite</span>
          </button>

          <button
            onClick={() => setActivePortalTab("parent")}
            className={`flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              activePortalTab === "parent"
                ? "bg-card text-foreground border border-active-mint/40 shadow-sm ring-2 ring-active-mint/15"
                : "text-muted-foreground hover:text-foreground hover:bg-card/50"
            }`}
          >
            <HeartHandshake className={`h-4 w-4 ${activePortalTab === "parent" ? "text-active-mint" : "text-muted-foreground"}`} />
            <span>Family Desk</span>
          </button>

          <button
            onClick={() => setActivePortalTab("student")}
            className={`flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              activePortalTab === "student"
                ? "bg-card text-foreground border border-active-mint/40 shadow-sm ring-2 ring-active-mint/15"
                : "text-muted-foreground hover:text-foreground hover:bg-card/50"
            }`}
          >
            <GraduationCap className={`h-4 w-4 ${activePortalTab === "student" ? "text-active-mint" : "text-muted-foreground"}`} />
            <span>Student Journey</span>
          </button>
        </div>

        {/* Tab Content Display */}
        <div className="relative rounded-2xl border border-border/80 bg-card/70 backdrop-blur-sm p-6 sm:p-10 shadow-sm overflow-hidden">
          {/* Subtle Ambient Radial Glow */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-active-mint/5 rounded-full blur-[100px] pointer-events-none" />

          {/* TAB 1: SCHOOL & CAMPUS DESK */}
          {activePortalTab === "school" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-6 space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-active-mint/10 text-active-mint border border-active-mint/20">
                  <Building2 className="h-3.5 w-3.5" />
                  <span>Institutional Administration</span>
                </div>
                <h3 className="text-2xl sm:text-4xl font-bold tracking-tight text-foreground">
                  Campus Telemetry & Academic Roosting
                </h3>
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                  Engineered for school principals, vice-principals, and administrators. Seamlessly organize academic cohorts, 
                  monitor cross-branch behavioral regulation indices, assign classroom faculty mentors, and schedule promotions.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-active-mint shrink-0 mt-0.5" />
                    <span className="text-xs text-foreground font-medium">Multi-branch institutional hierarchy</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-active-mint shrink-0 mt-0.5" />
                    <span className="text-xs text-foreground font-medium">Automated academic year promotions</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-active-mint shrink-0 mt-0.5" />
                    <span className="text-xs text-foreground font-medium">4-Pole Diamond Radar telemetry</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-active-mint shrink-0 mt-0.5" />
                    <span className="text-xs text-foreground font-medium">Dedicated campus counselor management</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 pt-4">
                  <Link href="/signup?tab=institute">
                    <Button className="font-semibold bg-active-mint hover:bg-active-mint/90 text-white">
                      Apply for Institution
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="/login">
                    <Button variant="outline" className="font-medium">
                      School Admin Sign In
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Interactive Mock Preview Card */}
              <div className="lg:col-span-6 rounded-xl border border-border/80 bg-background/90 p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-border/60 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-lg bg-deep-teal/20 text-deep-teal dark:text-fresh-mint flex items-center justify-center font-bold text-xs">
                      JM
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-foreground">DPS International Campus</h4>
                      <p className="text-[10px] text-muted-foreground">Main Campus • Hyderabad South</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] text-active-mint border-active-mint/30 bg-active-mint/5">
                    Active Tenant
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-3 rounded-lg bg-muted/40 border border-border/50">
                    <span className="text-xs text-muted-foreground block">Monitored</span>
                    <span className="text-base font-bold text-foreground">1,280</span>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/40 border border-border/50">
                    <span className="text-xs text-muted-foreground block">Focus Index</span>
                    <span className="text-base font-bold text-active-mint">88.4%</span>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/40 border border-border/50">
                    <span className="text-xs text-muted-foreground block">Branches</span>
                    <span className="text-base font-bold text-foreground">4 Active</span>
                  </div>
                </div>

                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between text-xs font-medium">
                    <span className="text-muted-foreground">Grade 9 Cohort Stabilization</span>
                    <span className="text-active-mint">92%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-active-mint rounded-full" style={{ width: "92%" }} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: COUNSELOR CARE DESK */}
          {activePortalTab === "counselor" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-6 space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-deep-teal/15 text-deep-teal dark:text-fresh-mint border border-deep-teal/30">
                  <Stethoscope className="h-3.5 w-3.5" />
                  <span>Clinical Behavioral Diagnostics</span>
                </div>
                <h3 className="text-2xl sm:text-4xl font-bold tracking-tight text-foreground">
                  Confidential Clinical Care Desk
                </h3>
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                  Dedicated workspace for school psychologists and licensed wellness counselors. Access 4-bucket clinical regulation cohorts, 
                  generate student diagnostic dossiers, and record protected intervention notes.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-active-mint shrink-0 mt-0.5" />
                    <span className="text-xs text-foreground font-medium">4 Regulation cohorts classification</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-active-mint shrink-0 mt-0.5" />
                    <span className="text-xs text-foreground font-medium">Actionable intervention playbooks</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-active-mint shrink-0 mt-0.5" />
                    <span className="text-xs text-foreground font-medium">Encrypted counselor case logs</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-active-mint shrink-0 mt-0.5" />
                    <span className="text-xs text-foreground font-medium">Parent inquiry meeting scheduler</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 pt-4">
                  <Link href="/counselor">
                    <Button className="font-semibold bg-active-mint hover:bg-active-mint/90 text-white">
                      Enter Counselor Portal
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="/internal-ops/signin">
                    <Button variant="outline" className="font-medium">
                      Central Care Desk
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Interactive Mock Preview Card */}
              <div className="lg:col-span-6 rounded-xl border border-border/80 bg-background/90 p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-border/60 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-lg bg-active-mint/20 text-active-mint flex items-center justify-center font-bold text-xs">
                      CD
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-foreground">Student Behavioral Diagnostic Dossier</h4>
                      <p className="text-[10px] text-muted-foreground">Confidential Clinical Assessment Record</p>
                    </div>
                  </div>
                  <Badge className="bg-active-mint/10 text-active-mint text-[10px] border border-active-mint/20">
                    High Expressive
                  </Badge>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div className="p-2.5 rounded-lg bg-muted/40 border border-border/40">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">Recommended Strategy</span>
                    <p className="text-xs text-foreground mt-0.5">
                      Provide structured collaborative mediation roles; practice low-stakes anonymous inquiry check-ins.
                    </p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-muted/40 border border-border/40">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">Targeted Somatic Reset</span>
                    <p className="text-xs text-foreground mt-0.5">
                      Implement 2-minute physiological calm recovery before timed academic evaluations.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: FAMILY & PARENT DESK */}
          {activePortalTab === "parent" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-6 space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-active-mint/10 text-active-mint border border-active-mint/20">
                  <HeartHandshake className="h-3.5 w-3.5" />
                  <span>Family Wellness Collaboration</span>
                </div>
                <h3 className="text-2xl sm:text-4xl font-bold tracking-tight text-foreground">
                  Family Desk & Child Growth Radar
                </h3>
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                  Designed for parents and legal guardians. Track your child's emotional regulation progress, 
                  gauge the home atmosphere barometer, and schedule direct confidential consultations with campus counselors.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-active-mint shrink-0 mt-0.5" />
                    <span className="text-xs text-foreground font-medium">Child link via Student Access ID</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-active-mint shrink-0 mt-0.5" />
                    <span className="text-xs text-foreground font-medium">Home Atmosphere Barometer</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-active-mint shrink-0 mt-0.5" />
                    <span className="text-xs text-foreground font-medium">Child 4-pole growth radar chart</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-active-mint shrink-0 mt-0.5" />
                    <span className="text-xs text-foreground font-medium">Direct counselor meeting requests</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 pt-4">
                  <Link href="/signup?tab=independent">
                    <Button className="font-semibold bg-active-mint hover:bg-active-mint/90 text-white">
                      Create Family Account
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="/login">
                    <Button variant="outline" className="font-medium">
                      Parent Sign In
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Interactive Mock Preview Card */}
              <div className="lg:col-span-6 rounded-xl border border-border/80 bg-background/90 p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-border/60 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-lg bg-active-mint/20 text-active-mint flex items-center justify-center font-bold text-xs">
                      FD
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-foreground">Family Growth Radar</h4>
                      <p className="text-[10px] text-muted-foreground">Aarav Sharma • Grade 10-A</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] text-active-mint border-active-mint/30">
                    Balanced Regulation
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-3 rounded-lg bg-muted/40 border border-border/50">
                    <span className="text-muted-foreground block text-[10px]">Atmosphere Barometer</span>
                    <span className="text-sm font-semibold text-active-mint mt-0.5 block">Nurturing & Open</span>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/40 border border-border/50">
                    <span className="text-muted-foreground block text-[10px]">Counselor Status</span>
                    <span className="text-sm font-semibold text-foreground mt-0.5 block">Meeting Scheduled</span>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-muted/20 border border-border/40 text-xs flex items-center justify-between">
                  <span className="text-muted-foreground">Next Consultation: Tomorrow, 4:00 PM</span>
                  <span className="text-active-mint font-semibold">Join Room</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: STUDENT ASSESSMENT JOURNEY */}
          {activePortalTab === "student" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-6 space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-active-mint/10 text-active-mint border border-active-mint/20">
                  <GraduationCap className="h-3.5 w-3.5" />
                  <span>Adolescent Self-Discovery</span>
                </div>
                <h3 className="text-2xl sm:text-4xl font-bold tracking-tight text-foreground">
                  Interactive Behavioral Discovery Journey
                </h3>
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                  Adolescents participate in a zero-pressure, narrative-driven assessment experience. Complete with a 2-minute 
                  box breathing centering exercise, daily mind weather check, and constructive real-world scenario dilemmas.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-active-mint shrink-0 mt-0.5" />
                    <span className="text-xs text-foreground font-medium">Box breath centering exercise</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-active-mint shrink-0 mt-0.5" />
                    <span className="text-xs text-foreground font-medium">Mind Weather emotional check-in</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-active-mint shrink-0 mt-0.5" />
                    <span className="text-xs text-foreground font-medium">Narrative dilemma decision cards</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-active-mint shrink-0 mt-0.5" />
                    <span className="text-xs text-foreground font-medium">Zero emojis clinical dignity</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 pt-4">
                  <Link href="/student/login">
                    <Button className="font-semibold bg-active-mint hover:bg-active-mint/90 text-white">
                      Student Access ID Login
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="/preview/assessment/default">
                    <Button variant="outline" className="font-medium">
                      Preview Assessment Journey
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Interactive Mock Preview Card */}
              <div className="lg:col-span-6 rounded-xl border border-border/80 bg-background/90 p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-border/60 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-lg bg-active-mint/20 text-active-mint flex items-center justify-center font-bold text-xs">
                      SJ
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-foreground">Mind Weather Check</h4>
                      <p className="text-[10px] text-muted-foreground">Adolescent Sensory State</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] text-active-mint border-active-mint/30">
                    Step 1 of 4
                  </Badge>
                </div>

                <div className="p-4 rounded-xl bg-muted/40 border border-border/50 text-center space-y-2">
                  <span className="text-xs font-semibold text-foreground">How does your mental space feel today?</span>
                  <div className="grid grid-cols-3 gap-2 pt-1 text-xs">
                    <div className="p-2.5 rounded-lg bg-card border border-active-mint text-active-mint font-semibold text-center">
                      Clear Sky
                    </div>
                    <div className="p-2.5 rounded-lg bg-card border border-border/60 text-muted-foreground text-center">
                      Gentle Wind
                    </div>
                    <div className="p-2.5 rounded-lg bg-card border border-border/60 text-muted-foreground text-center">
                      Dense Fog
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-active-mint/5 border border-active-mint/20 text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground block">Centering Pause:</span>
                  Take a slow, deep breath in for 4 seconds, hold for 4 seconds, and gently release.
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── Brand Kit & Characteristics Showcase ──────────────────────── */}
      <section id="brand-dna" className="py-20 md:py-28 px-4 sm:px-6 lg:px-8 border-t border-border/40 bg-muted/20">
        <div className="max-w-7xl mx-auto space-y-12">
          
          <div className="text-center space-y-3">
            <Badge variant="outline" className="px-3 py-0.5 text-xs text-active-mint border-active-mint/30 bg-active-mint/5">
              Brand DNA & Core Attributes
            </Badge>
            <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-foreground">
              Characteristics of JaagrMind
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto">
              Our clinical and technological foundations are built on three essential pillars of character.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Card 1: Emotional Attributes */}
            <div className="rounded-2xl border border-border/70 bg-card p-6 sm:p-8 space-y-4 shadow-xs relative overflow-hidden group hover:border-active-mint/50 transition-all">
              <div className="h-10 w-10 rounded-xl bg-active-mint/10 text-active-mint flex items-center justify-center">
                <Smile className="h-5 w-5" />
              </div>
              <h3 className="text-xl font-bold text-foreground">Emotional Attributes</h3>
              <p className="text-xs text-muted-foreground">
                How our experience feels to students and families in vulnerable moments.
              </p>
              <ul className="space-y-2 pt-2 border-t border-border/50 text-xs sm:text-sm">
                <li className="flex items-center gap-2 text-foreground font-medium">
                  <span className="h-1.5 w-1.5 rounded-full bg-active-mint" />
                  Empathetic & Attuned
                </li>
                <li className="flex items-center gap-2 text-foreground font-medium">
                  <span className="h-1.5 w-1.5 rounded-full bg-active-mint" />
                  Safe & Non-Threatening
                </li>
                <li className="flex items-center gap-2 text-foreground font-medium">
                  <span className="h-1.5 w-1.5 rounded-full bg-active-mint" />
                  Deeply Reassuring
                </li>
                <li className="flex items-center gap-2 text-foreground font-medium">
                  <span className="h-1.5 w-1.5 rounded-full bg-active-mint" />
                  Inclusive & Adaptive
                </li>
                <li className="flex items-center gap-2 text-foreground font-medium">
                  <span className="h-1.5 w-1.5 rounded-full bg-active-mint" />
                  Genuinely Hopeful
                </li>
              </ul>
            </div>

            {/* Card 2: Personality Attributes */}
            <div className="rounded-2xl border border-border/70 bg-card p-6 sm:p-8 space-y-4 shadow-xs relative overflow-hidden group hover:border-active-mint/50 transition-all">
              <div className="h-10 w-10 rounded-xl bg-fresh-mint/15 text-deep-teal dark:text-fresh-mint flex items-center justify-center">
                <Compass className="h-5 w-5" />
              </div>
              <h3 className="text-xl font-bold text-foreground">Personality Attributes</h3>
              <p className="text-xs text-muted-foreground">
                The tone of voice and posture maintained across every interaction.
              </p>
              <ul className="space-y-2 pt-2 border-t border-border/50 text-xs sm:text-sm">
                <li className="flex items-center gap-2 text-foreground font-medium">
                  <span className="h-1.5 w-1.5 rounded-full bg-fresh-mint" />
                  Inquisitive & Curious
                </li>
                <li className="flex items-center gap-2 text-foreground font-medium">
                  <span className="h-1.5 w-1.5 rounded-full bg-fresh-mint" />
                  Non-Judgmental & Objective
                </li>
                <li className="flex items-center gap-2 text-foreground font-medium">
                  <span className="h-1.5 w-1.5 rounded-full bg-fresh-mint" />
                  Warm & Welcoming
                </li>
                <li className="flex items-center gap-2 text-foreground font-medium">
                  <span className="h-1.5 w-1.5 rounded-full bg-fresh-mint" />
                  Minimal & Meaningful
                </li>
                <li className="flex items-center gap-2 text-foreground font-medium">
                  <span className="h-1.5 w-1.5 rounded-full bg-fresh-mint" />
                  Trustworthy & Resourceful
                </li>
              </ul>
            </div>

            {/* Card 3: Functional Attributes */}
            <div className="rounded-2xl border border-border/70 bg-card p-6 sm:p-8 space-y-4 shadow-xs relative overflow-hidden group hover:border-active-mint/50 transition-all">
              <div className="h-10 w-10 rounded-xl bg-deep-teal/15 text-deep-teal dark:text-fresh-mint flex items-center justify-center">
                <Layers className="h-5 w-5" />
              </div>
              <h3 className="text-xl font-bold text-foreground">Functional Attributes</h3>
              <p className="text-xs text-muted-foreground">
                The clinical rigor and technological capabilities underpinning the platform.
              </p>
              <ul className="space-y-2 pt-2 border-t border-border/50 text-xs sm:text-sm">
                <li className="flex items-center gap-2 text-foreground font-medium">
                  <span className="h-1.5 w-1.5 rounded-full bg-deep-teal dark:bg-fresh-mint" />
                  Scientifically Grounded
                </li>
                <li className="flex items-center gap-2 text-foreground font-medium">
                  <span className="h-1.5 w-1.5 rounded-full bg-deep-teal dark:bg-fresh-mint" />
                  Holistic Assessment Framework
                </li>
                <li className="flex items-center gap-2 text-foreground font-medium">
                  <span className="h-1.5 w-1.5 rounded-full bg-deep-teal dark:bg-fresh-mint" />
                  Private & Non-Intrusive
                </li>
                <li className="flex items-center gap-2 text-foreground font-medium">
                  <span className="h-1.5 w-1.5 rounded-full bg-deep-teal dark:bg-fresh-mint" />
                  Action-Oriented Playbooks
                </li>
                <li className="flex items-center gap-2 text-foreground font-medium">
                  <span className="h-1.5 w-1.5 rounded-full bg-deep-teal dark:bg-fresh-mint" />
                  Educational & Empowering
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── Brand Color Palette Showcase (Strictly No Purple) ─────────── */}
      <section id="palette" className="py-20 md:py-28 px-4 sm:px-6 lg:px-8 border-t border-border/40">
        <div className="max-w-7xl mx-auto space-y-12">
          
          <div className="text-center space-y-3">
            <Badge variant="outline" className="px-3 py-0.5 text-xs text-active-mint border-active-mint/30 bg-active-mint/5">
              Curated Brand Palette
            </Badge>
            <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-foreground">
              Modern Pastel Tech with Emotional Warmth
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto">
              Curated hues delivering psychological reassurance, clinical clarity, and grounded focus.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            
            {/* Swatch 1: Active Mint */}
            <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs">
              <div className="h-32 bg-[#42B677] flex flex-col justify-end p-4 text-white">
                <span className="text-xs font-mono font-bold tracking-wider">#42B677</span>
              </div>
              <div className="p-4 space-y-1.5">
                <h4 className="font-bold text-sm text-foreground">Active Mint</h4>
                <span className="text-[10px] font-semibold text-active-mint uppercase tracking-wider block">Trust-Centric but Warm</span>
                <p className="text-xs text-muted-foreground">Empathy, Trustworthy, Growth, Balance, Nature</p>
              </div>
            </div>

            {/* Swatch 2: Fresh Mint Green */}
            <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs">
              <div className="h-32 bg-[#91D17C] flex flex-col justify-end p-4 text-graphite">
                <span className="text-xs font-mono font-bold tracking-wider">#91D17C</span>
              </div>
              <div className="p-4 space-y-1.5">
                <h4 className="font-bold text-sm text-foreground">Fresh Mint Green</h4>
                <span className="text-[10px] font-semibold text-active-mint uppercase tracking-wider block">Aspirational Wellness</span>
                <p className="text-xs text-muted-foreground">Nurturing, Hopeful, Emotionally Grounding</p>
              </div>
            </div>

            {/* Swatch 3: Deep Teal */}
            <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs">
              <div className="h-32 bg-[#005456] flex flex-col justify-end p-4 text-white">
                <span className="text-xs font-mono font-bold tracking-wider">#005456</span>
              </div>
              <div className="p-4 space-y-1.5">
                <h4 className="font-bold text-sm text-foreground">Deep Teal</h4>
                <span className="text-[10px] font-semibold text-active-mint uppercase tracking-wider block">Clinical Rigor</span>
                <p className="text-xs text-muted-foreground">Trust, Psychological Stability, Executive Clarity</p>
              </div>
            </div>

            {/* Swatch 4: Graphite Black */}
            <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs">
              <div className="h-32 bg-[#222222] flex flex-col justify-end p-4 text-white">
                <span className="text-xs font-mono font-bold tracking-wider">#222222</span>
              </div>
              <div className="p-4 space-y-1.5">
                <h4 className="font-bold text-sm text-foreground">Graphite Black</h4>
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">Executive Authority</span>
                <p className="text-xs text-muted-foreground">Clarity, Architectural Contrast, Focus</p>
              </div>
            </div>

            {/* Swatch 5: Warm Ivory */}
            <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs">
              <div className="h-32 bg-[#FFF8F0] border-b border-border/50 flex flex-col justify-end p-4 text-graphite">
                <span className="text-xs font-mono font-bold tracking-wider">#FFF8F0</span>
              </div>
              <div className="p-4 space-y-1.5">
                <h4 className="font-bold text-sm text-foreground">Warm Ivory</h4>
                <span className="text-[10px] font-semibold text-active-mint uppercase tracking-wider block">Human Comfort</span>
                <p className="text-xs text-muted-foreground">Warmth, Safety, Calm Physical Reassurance</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 4-Pole Diamond Regulation Matrix Showcase ─────────────────── */}
      <section id="regulation-model" className="py-20 md:py-28 px-4 sm:px-6 lg:px-8 border-t border-border/40 bg-muted/20">
        <div className="max-w-7xl mx-auto space-y-12">
          
          <div className="text-center space-y-3">
            <Badge variant="outline" className="px-3 py-0.5 text-xs text-active-mint border-active-mint/30 bg-active-mint/5">
              Psychological Framework
            </Badge>
            <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-foreground">
              4-Pole Diamond Regulation Engine
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto">
              Moving beyond one-dimensional test scores. JaagrMind assesses adolescents across four 
              interconnected regulation dimensions to surface strengths and personalized support pathways.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="p-6 rounded-2xl bg-card border border-border/80 shadow-xs space-y-3 hover:border-active-mint/40 transition-all">
              <div className="h-10 w-10 rounded-xl bg-active-mint/10 text-active-mint flex items-center justify-center font-bold text-sm">
                01
              </div>
              <h3 className="text-lg font-bold text-foreground">Focus Regulation</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Measures sustained cognitive rhythm, task persistence, Pomodoro pacing, and executive attention control.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-card border border-border/80 shadow-xs space-y-3 hover:border-active-mint/40 transition-all">
              <div className="h-10 w-10 rounded-xl bg-fresh-mint/20 text-deep-teal dark:text-fresh-mint flex items-center justify-center font-bold text-sm">
                02
              </div>
              <h3 className="text-lg font-bold text-foreground">Calm Recovery</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Evaluates somatic stabilization, breath pacing, digital curfew discipline, and parasympathetic reset capacity.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-card border border-border/80 shadow-xs space-y-3 hover:border-active-mint/40 transition-all">
              <div className="h-10 w-10 rounded-xl bg-deep-teal/20 text-deep-teal dark:text-fresh-mint flex items-center justify-center font-bold text-sm">
                03
              </div>
              <h3 className="text-lg font-bold text-foreground">Expression</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Assesses constructive emotional labeling, self-advocacy, assertive inquiry, and low-stakes communication confidence.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-card border border-border/80 shadow-xs space-y-3 hover:border-active-mint/40 transition-all">
              <div className="h-10 w-10 rounded-xl bg-active-mint/10 text-active-mint flex items-center justify-center font-bold text-sm">
                04
              </div>
              <h3 className="text-lg font-bold text-foreground">Collaborative Harmony</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Monitors prosocial inclusion, peer conflict mediation, empathy in group dynamics, and collaborative boundaries.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Call To Action Banner ────────────────────────────────────── */}
      <section className="py-16 md:py-24 px-4 sm:px-6 lg:px-8 border-t border-border/40">
        <div className="max-w-4xl mx-auto rounded-3xl border border-active-mint/30 bg-gradient-to-br from-active-mint/10 via-card to-background p-8 sm:p-12 text-center space-y-6 shadow-sm relative overflow-hidden">
          <div className="space-y-3">
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-foreground">
              Ready to deploy JaagrMind on your campus?
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto">
              Join leading progressive schools transforming student well-being through real-time behavioral insights.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link href="/signup?tab=institute">
              <Button size="lg" className="h-11 px-6 font-semibold bg-active-mint hover:bg-active-mint/90 text-white shadow-md">
                Register Your Institution
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/signup?tab=independent">
              <Button size="lg" variant="outline" className="h-11 px-6 font-medium">
                Family & Parent Account
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <footer className="border-t border-border/60 bg-muted/30 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <img
              src="/DarkColorLogo.svg"
              alt="JaagrMind"
              className="h-7 w-auto dark:hidden object-contain"
            />
            <img
              src="/LightColorLogo.svg"
              alt="JaagrMind"
              className="h-7 w-auto hidden dark:block object-contain"
            />
            <span className="text-xs text-muted-foreground border-l border-border pl-3">
              Emotions Made Easy
            </span>
          </div>

          <div className="flex items-center gap-6 text-xs text-muted-foreground">
            <Link href="/school" className="hover:text-foreground transition-colors">School Portal</Link>
            <Link href="/counselor" className="hover:text-foreground transition-colors">Counselor Care Desk</Link>
            <Link href="/parent" className="hover:text-foreground transition-colors">Family Desk</Link>
            <Link href="/internal-ops/signin" className="hover:text-foreground transition-colors">Operations</Link>
          </div>

          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} JaagrMind Platform. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
