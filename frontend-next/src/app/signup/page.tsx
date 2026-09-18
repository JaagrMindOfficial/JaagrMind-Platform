"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { api } from "@/lib/api";
import { useAuth } from "@/context/auth-context";
import {
  Building2,
  Sparkles,
  User,
  Users,
  HeartHandshake,
  CheckCircle2,
  ArrowRight,
  School,
  GraduationCap,
  ShieldCheck,
  Phone,
  Mail,
  MapPin,
  HelpCircle,
  Lightbulb,
} from "lucide-react";

function SignupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();

  // Primary mode: "institute" or "independent"
  const [activeTab, setActiveTab] = useState<"institute" | "independent">("institute");

  // For independent access: "parent" | "relative"
  const [independentRole, setIndependentRole] = useState<"parent" | "relative">("parent");

  // Form states - Institute
  const [instituteForm, setInstituteForm] = useState({
    institute_name: "",
    institute_type: "K-12 School",
    city: "",
    state: "",
    contact_name: "",
    designation: "Principal / Administrator",
    email: "",
    phone: "",
    estimated_students: 500,
    message: "",
  });
  const [instituteSubmitted, setInstituteSubmitted] = useState(false);
  const [instituteAppId, setInstituteAppId] = useState<string | null>(null);

  // Form states - Individual & Family
  const [independentForm, setIndependentForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    grade: "10",
    child_name: "",
    school_name: "",
  });
  const [independentSuccess, setIndependentSuccess] = useState(false);

  // Loading & Error states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Sync with searchParams if provided
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "independent" || tabParam === "individual" || tabParam === "family" || tabParam === "personal") {
      setActiveTab("independent");
    } else if (tabParam === "institute") {
      setActiveTab("institute");
    }
    const roleParam = searchParams.get("role");
    if (roleParam === "parent" || roleParam === "relative") {
      setIndependentRole(roleParam);
      setActiveTab("independent");
    } else if (roleParam === "student") {
      router.push("/student/login");
      return;
    }
  }, [searchParams, router]);

  // Handle Institute Application Submit
  const handleInstituteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await api.post(
        "/api/auth/apply-institution",
        {
          ...instituteForm,
          estimated_students: Number(instituteForm.estimated_students) || 500,
        },
        { skipAuth: true }
      );
      setInstituteSubmitted(true);
      if (res?.application?.id) {
        setInstituteAppId(res.application.id);
      }
    } catch (err: any) {
      setError(err.message || "Failed to submit institutional application.");
    } finally {
      setLoading(false);
    }
  };

  // Handle Individual & Family Signup Submit
  const handleIndependentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (independentForm.email.toLowerCase().trim().endsWith("@jaagrmind.com")) {
      setError("JaagrMind corporate email addresses cannot be used for independent or family signups. Please use your personal email address, or sign in to the internal operations console at /internal-ops/signin.");
      setLoading(false);
      return;
    }

    try {
      const res = await api.post(
        "/api/auth/signup",
        {
          name: independentForm.name,
          email: independentForm.email,
          password: independentForm.password,
          phone: independentForm.phone,
          account_type: independentRole,
          grade: independentForm.grade,
          child_name: independentForm.child_name,
          school_name: independentForm.school_name,
        },
        { skipAuth: true }
      );

      if (res?.token && res?.user) {
        localStorage.setItem("token", res.token);
        localStorage.setItem("user", JSON.stringify(res.user));
        setIndependentSuccess(true);
        setTimeout(() => {
          router.push("/parent");
        }, 1200);
      }
    } catch (err: any) {
      setError(err.message || "Failed to create independent account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background py-10 px-4 flex flex-col items-center justify-center relative">
      {/* Theme Toggle in Header */}
      <div className="absolute top-6 right-6">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-2xl space-y-6">
        {/* Brand Logo & Header */}
        <div className="text-center space-y-3">
          <Link href="/" className="inline-block">
            <img
              src="/DarkColorLogo.svg"
              alt="JaagrMind Logo"
              className="h-10 w-auto dark:hidden mx-auto object-contain"
            />
            <img
              src="/LightColorLogo.svg"
              alt="JaagrMind Logo"
              className="h-10 w-auto hidden dark:block mx-auto object-contain"
            />
          </Link>
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Create Your JaagrMind Account
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto">
              Select whether you are applying on behalf of an educational institution or registering for individual & family access.
            </p>
          </div>
        </div>

        {/* Primary Pathway Selector Tabs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => {
              setActiveTab("institute");
              setError("");
            }}
            className={`p-4 rounded-xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${activeTab === "institute"
              ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-xs"
              : "border-border hover:border-border/80 bg-card hover:bg-muted/30"
              }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Building2 className="h-5 w-5" />
              </div>
              <Badge variant="outline" className="text-[10px] font-medium bg-background">
                Institution
              </Badge>
            </div>
            <div>
              <h3 className="font-semibold text-sm text-foreground">School Partnership</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                For K-12 schools & campuses
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("independent");
              setError("");
            }}
            className={`p-4 rounded-xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${activeTab === "independent"
              ? "border-sky-500 bg-sky-500/5 ring-2 ring-sky-500/20 shadow-xs"
              : "border-border hover:border-border/80 bg-card hover:bg-muted/30"
              }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
                <Users className="h-5 w-5" />
              </div>
              <Badge variant="outline" className="text-[10px] font-medium bg-background border-sky-500/30 text-sky-600 dark:text-sky-400">
                Personal
              </Badge>
            </div>
            <div>
              <h3 className="font-semibold text-sm text-foreground">Family & Parent</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                For parents and legal guardians.
              </p>
            </div>
          </button>
        </div>

        {/* Dynamic Card Body */}
        <Card className="border-border shadow-xs">
          {/* TAB 1: Educational Institute Application */}
          {activeTab === "institute" && (
            <>
              <CardHeader className="pb-4 border-b border-border/40">
                <div className="flex items-center gap-2">
                  <School className="h-4 w-4 text-primary" />
                  <CardTitle className="text-base font-semibold">
                    School Onboarding & Partnership Application
                  </CardTitle>
                </div>
                <CardDescription className="text-xs">
                  Apply to set up your dedicated school portal with multi-class rosters, tier-governed check-ins, and campus wellness analytics.
                </CardDescription>
              </CardHeader>

              <CardContent className="pt-6">
                {instituteSubmitted ? (
                  <div className="text-center py-8 px-4 space-y-4">
                    <div className="h-14 w-14 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto ring-8 ring-emerald-500/5">
                      <CheckCircle2 className="h-7 w-7" />
                    </div>
                    <div className="space-y-1.5 max-w-md mx-auto">
                      <h3 className="text-lg font-semibold text-foreground">
                        Application Successfully Submitted!
                      </h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Thank you for applying to onboard{" "}
                        <strong className="text-foreground">{instituteForm.institute_name}</strong>. Our institutional support team will review your application and contact you at{" "}
                        <span className="font-mono text-foreground">{instituteForm.email}</span> within 24 hours to coordinate administrator credential activation.
                      </p>
                      {instituteAppId && (
                        <div className="pt-2">
                          <span className="text-[11px] font-mono px-2 py-1 rounded bg-muted text-muted-foreground border border-border/70">
                            Reference ID: {instituteAppId.slice(0, 13)}...
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="pt-4 flex items-center justify-center gap-3">
                      <Link href="/login">
                        <Button variant="outline" size="sm" className="text-xs">
                          Return to Login
                        </Button>
                      </Link>
                      <Button
                        size="sm"
                        variant="default"
                        className="text-xs"
                        onClick={() => {
                          setInstituteSubmitted(false);
                          setInstituteForm({
                            institute_name: "",
                            institute_type: "K-12 School",
                            city: "",
                            state: "",
                            contact_name: "",
                            designation: "Principal / Administrator",
                            email: "",
                            phone: "",
                            estimated_students: 500,
                            message: "",
                          });
                        }}
                      >
                        Submit Another Inquiry
                      </Button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleInstituteSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-foreground flex items-center gap-1">
                          Institute Name <span className="text-destructive">*</span>
                        </label>
                        <Input
                          placeholder="e.g. National Public School"
                          value={instituteForm.institute_name}
                          onChange={(e) =>
                            setInstituteForm({ ...instituteForm, institute_name: e.target.value })
                          }
                          required
                          className="text-xs"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-foreground">School Type</label>
                        <select
                          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          value={instituteForm.institute_type}
                          onChange={(e) =>
                            setInstituteForm({ ...instituteForm, institute_type: e.target.value })
                          }
                        >
                          <option value="K-12 School" className="bg-popover text-popover-foreground">K-12 School (Complete Campus)</option>
                          <option value="Senior Secondary High School" className="bg-popover text-popover-foreground">Senior Secondary High School (Grades 9-12)</option>
                          <option value="Secondary School" className="bg-popover text-popover-foreground">Secondary School (Grades 6-10)</option>
                          <option value="Primary & Middle School" className="bg-popover text-popover-foreground">Primary & Middle School (Grades 1-8)</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-foreground flex items-center gap-1">
                          City <span className="text-destructive">*</span>
                        </label>
                        <Input
                          placeholder="e.g. Bangalore, Hyderabad, Delhi"
                          value={instituteForm.city}
                          onChange={(e) =>
                            setInstituteForm({ ...instituteForm, city: e.target.value })
                          }
                          required
                          className="text-xs"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-foreground flex items-center gap-1">
                          State / Region <span className="text-destructive">*</span>
                        </label>
                        <Input
                          placeholder="e.g. Karnataka, Telangana, Maharashtra"
                          value={instituteForm.state}
                          onChange={(e) =>
                            setInstituteForm({ ...instituteForm, state: e.target.value })
                          }
                          required
                          className="text-xs"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-foreground flex items-center gap-1">
                          Designated Contact Person <span className="text-destructive">*</span>
                        </label>
                        <Input
                          placeholder="e.g. Dr. Priya Sharma"
                          value={instituteForm.contact_name}
                          onChange={(e) =>
                            setInstituteForm({ ...instituteForm, contact_name: e.target.value })
                          }
                          required
                          className="text-xs"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-foreground">Designation / Role</label>
                        <Input
                          placeholder="e.g. Principal, Head of Counseling, Director"
                          value={instituteForm.designation}
                          onChange={(e) =>
                            setInstituteForm({ ...instituteForm, designation: e.target.value })
                          }
                          className="text-xs"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-foreground flex items-center gap-1">
                          Official Email <span className="text-destructive">*</span>
                        </label>
                        <Input
                          type="email"
                          placeholder="e.g. principal@school.edu.in"
                          value={instituteForm.email}
                          onChange={(e) =>
                            setInstituteForm({ ...instituteForm, email: e.target.value })
                          }
                          required
                          className="text-xs"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-foreground flex items-center gap-1">
                          Phone / WhatsApp <span className="text-destructive">*</span>
                        </label>
                        <Input
                          type="tel"
                          placeholder="e.g. +91 98765 43210"
                          value={instituteForm.phone}
                          onChange={(e) =>
                            setInstituteForm({ ...instituteForm, phone: e.target.value })
                          }
                          required
                          className="text-xs"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-foreground">
                          Approx. Student Strength
                        </label>
                        <select
                          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          value={instituteForm.estimated_students}
                          onChange={(e) =>
                            setInstituteForm({
                              ...instituteForm,
                              estimated_students: Number(e.target.value),
                            })
                          }
                        >
                          <option value="250" className="bg-popover text-popover-foreground">Under 500 Students</option>
                          <option value="1000" className="bg-popover text-popover-foreground">500 – 1,500 Students</option>
                          <option value="2500" className="bg-popover text-popover-foreground">1,500 – 3,500 Students</option>
                          <option value="5000" className="bg-popover text-popover-foreground">3,500+ Students (Multi-Campus)</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-foreground">
                          Special Requirements (Optional)
                        </label>
                        <Input
                          placeholder="e.g. Board exam stress, Tiered grade routing"
                          value={instituteForm.message}
                          onChange={(e) =>
                            setInstituteForm({ ...instituteForm, message: e.target.value })
                          }
                          className="text-xs"
                        />
                      </div>
                    </div>

                    {error && (
                      <p className="text-xs text-destructive text-center font-medium bg-destructive/10 p-2 rounded-md">
                        {error}
                      </p>
                    )}

                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full h-10 text-xs font-semibold gap-1.5 mt-2"
                    >
                      {loading ? "Submitting Application..." : "Submit School Application"}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </form>
                )}
              </CardContent>
            </>
          )}

          {/* TAB 2: Individual & Family (Student, Parent, Relative) */}
          {activeTab === "independent" && (
            <>
              <CardHeader className="pb-4 border-b border-border/40">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-sky-500" />
                    <CardTitle className="text-base font-semibold">
                      Individual & Family Registration
                    </CardTitle>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-mono capitalize">
                    {independentRole === "relative" ? "Guardian" : independentRole} Account
                  </Badge>
                </div>
                <CardDescription className="text-xs">
                  Personal check-ins, focus reflection, and student wellness support.
                </CardDescription>

                {/* Sub-role Selector */}
                <div className="grid grid-cols-2 gap-2.5 pt-3">
                  {[
                    { id: "parent", label: "Parent", icon: Users, desc: "Monitor child wellness & developmental progress" },
                    { id: "relative", label: "Legal Guardian / Relative", icon: HeartHandshake, desc: "Student support & home care" },
                  ].map((roleOption) => {
                    const Icon = roleOption.icon;
                    const isSelected = independentRole === roleOption.id;
                    return (
                      <button
                        key={roleOption.id}
                        type="button"
                        onClick={() => {
                          setIndependentRole(roleOption.id as any);
                          setError("");
                        }}
                        className={`p-2.5 rounded-lg border text-left transition-all flex flex-col gap-1 cursor-pointer ${isSelected
                          ? "border-sky-500 bg-sky-500/10 text-sky-700 dark:text-sky-300 ring-1 ring-sky-500/30"
                          : "border-border hover:bg-muted/40 text-muted-foreground hover:text-foreground"
                          }`}
                      >
                        <div className="flex items-center gap-1.5 font-semibold text-xs text-foreground">
                          <Icon className="h-3.5 w-3.5 shrink-0" />
                          <span>{roleOption.label}</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground line-clamp-1">
                          {roleOption.desc}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Enrolled Student Notice */}
                <div className="mt-3 p-3 rounded-lg bg-sky-500/10 border border-sky-500/20 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-sky-600 dark:text-sky-400 shrink-0" />
                    <span className="text-foreground"><strong>Enrolled Student?</strong> Access check-ins using your School Access ID.</span>
                  </div>
                  <Link href="/student/login" className="text-primary hover:underline font-semibold flex items-center gap-1 shrink-0 ml-2">
                    Student Login <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </CardHeader>

              <CardContent className="pt-6">
                {independentSuccess ? (
                  <div className="text-center py-8 space-y-3">
                    <div className="h-12 w-12 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                      <CheckCircle2 className="h-6 w-6" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-base font-semibold text-foreground">
                        Account Created Successfully!
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Welcome to JaagrMind! Redirecting to your dashboard...
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Google OAuth Button */}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
                        window.location.href = `${apiBase}/api/auth/google/login?role=${independentRole}&intent=signup`;
                      }}
                      className="w-full flex items-center justify-center gap-2.5 h-10 border-border hover:bg-muted/50 font-medium text-xs transition-all shadow-xs"
                    >
                      <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.26 21.36 7.36 24 12 24z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.16 0 9.97 0 12s.46 3.84 1.26 5.42l4.02-3.15z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.36 0 3.26 2.64 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                        />
                      </svg>
                      <span>Sign up with Google</span>
                    </Button>

                    <div className="relative flex items-center justify-center">
                      <div className="border-t border-border w-full" />
                      <span className="bg-card px-2 text-[10px] uppercase font-mono tracking-wider text-muted-foreground shrink-0">
                        Or register with email
                      </span>
                      <div className="border-t border-border w-full" />
                    </div>

                    <form onSubmit={handleIndependentSubmit} className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-foreground">
                          Full Name <span className="text-destructive">*</span>
                        </label>
                        <Input
                          placeholder="e.g. Rajesh Sharma"
                          value={independentForm.name}
                          onChange={(e) =>
                            setIndependentForm({ ...independentForm, name: e.target.value })
                          }
                          required
                          className="text-xs"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-foreground">
                            Email Address <span className="text-destructive">*</span>
                          </label>
                          <Input
                            type="email"
                            placeholder="e.g. yourname@example.com"
                            value={independentForm.email}
                            onChange={(e) =>
                              setIndependentForm({ ...independentForm, email: e.target.value })
                            }
                            required
                            className="text-xs"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-foreground">
                            Create Password <span className="text-destructive">*</span>
                          </label>
                          <Input
                            type="password"
                            placeholder="Minimum 6 characters"
                            value={independentForm.password}
                            onChange={(e) =>
                              setIndependentForm({ ...independentForm, password: e.target.value })
                            }
                            required
                            minLength={6}
                            className="text-xs"
                          />
                        </div>
                      </div>

                      <div className="p-2.5 rounded-lg bg-sky-500/5 border border-sky-500/20 flex items-center gap-2 text-xs text-muted-foreground">
                        <Lightbulb className="h-4 w-4 text-sky-500 shrink-0" />
                        <span>You can add and manage profiles for all your children directly inside your parent dashboard after signup.</span>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-foreground">
                          Mobile Number (Optional)
                        </label>
                        <Input
                          type="tel"
                          placeholder="e.g. +91 98765 43210"
                          value={independentForm.phone}
                          onChange={(e) =>
                            setIndependentForm({ ...independentForm, phone: e.target.value })
                          }
                          className="text-xs"
                        />
                      </div>

                      {error && (
                        <p className="text-xs text-destructive text-center font-medium bg-destructive/10 p-2 rounded-md">
                          {error}
                        </p>
                      )}

                      <Button
                        type="submit"
                        disabled={loading}
                        className="w-full h-10 text-xs font-semibold gap-1.5 mt-2 bg-sky-600 hover:bg-sky-700 text-white"
                      >
                        {loading
                          ? "Creating Account..."
                          : independentRole === "parent"
                            ? "Create Parent Account"
                            : "Create Guardian Account"}
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </form>
                  </div>
                )}
              </CardContent>
            </>
          )}

          {/* Footer with Links */}
          <div className="p-4 bg-muted/20 border-t border-border/40 text-center text-xs text-muted-foreground space-y-2">
            <div>
              Already have an account?{" "}
              <Link href="/login" className="text-primary font-semibold hover:underline">
                Sign in to Portal
              </Link>
            </div>
            <div className="text-[11px]">
              Student with a school-issued code?{" "}
              <Link href="/student/login" className="text-muted-foreground hover:text-foreground font-medium underline">
                Access Student Assessment Portal &rarr;
              </Link>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center text-sm text-muted-foreground">Loading signup...</div>}>
      <SignupContent />
    </Suspense>
  );
}
