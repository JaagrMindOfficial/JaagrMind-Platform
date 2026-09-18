"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { BrandSidePanel } from "@/components/brand-side-panel";
import { api } from "@/lib/api";
import { useAuth } from "@/context/auth-context";
import {
  Building2,
  Users,
  HeartHandshake,
  CheckCircle2,
  ArrowRight,
  School,
  GraduationCap,
  Lightbulb,
} from "lucide-react";

function SignupContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { login } = useAuth();

  // Tab State: "institute" (Educational Application) or "independent" (Family & Parent)
  const [activeTab, setActiveTab] = useState<"institute" | "independent">("institute");

  // Sub-role selection for independent signups
  const [independentRole, setIndependentRole] = useState<"parent" | "relative">("parent");

  // Institute Onboarding Form State
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

  // Independent Signup Form State
  const [independentForm, setIndependentForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [instituteSubmitted, setInstituteSubmitted] = useState(false);
  const [instituteAppId, setInstituteAppId] = useState("");
  const [independentSuccess, setIndependentSuccess] = useState(false);

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "independent" || tabParam === "individual" || tabParam === "parent") {
      setActiveTab("independent");
    } else if (tabParam === "institute" || tabParam === "school") {
      setActiveTab("institute");
    }

    const roleParam = searchParams.get("role");
    if (roleParam === "relative" || roleParam === "guardian") {
      setIndependentRole("relative");
    }
  }, [searchParams]);

  // Handle Institutional Application Submission
  const handleInstituteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await api.post("/api/auth/apply-institution", instituteForm, { skipAuth: true });
      setInstituteSubmitted(true);
      if (res?.application?.id) {
        setInstituteAppId(res.application.id);
      }
    } catch (err: any) {
      setError(err.message || "Failed to submit institutional application. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Handle Independent (Parent / Guardian) Direct Signup
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
      setError(err.message || "Failed to create account. Please verify your details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen max-h-screen overflow-hidden w-screen bg-[#FFF8F0] dark:bg-[#121212] text-[#222222] dark:text-[#FFF8F0] flex flex-col md:flex-row relative select-none">
      
      {/* ── Discreet Top-Right Theme Toggle ──────────────────────────── */}
      <div className="absolute top-4 right-5 z-30">
        <ThemeToggle />
      </div>

      {/* ── LEFT SIDE: Brand Kit Architectural Graphics ──────────────── */}
      <BrandSidePanel subtitle="Join progressive educational institutions and proactive families supporting adolescent mental wellness." />

      {/* ── RIGHT SIDE: Compact, Non-Scrollable Signup Workspace ─────── */}
      <div className="w-full md:w-7/12 lg:w-[54%] h-full flex flex-col justify-center px-5 sm:px-8 lg:px-12 py-3 overflow-hidden relative">
        
        {/* Subtle Ambient Radial Glow */}
        <div className="absolute top-1/4 right-1/4 w-72 h-72 bg-[#42B677]/8 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-xl w-full mx-auto space-y-3 relative z-10">
          
          {/* Compact Header */}
          <div className="space-y-0.5">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#222222] dark:text-[#FFF8F0]">
              Create your JaagrMind account
            </h2>
            <p className="text-[11px] text-[#222222]/65 dark:text-[#FFF8F0]/65">
              Select your onboarding pathway below to proceed.
            </p>
          </div>

          {/* Compact Primary Pathway Tabs */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setActiveTab("institute");
                setError("");
              }}
              className={`p-2 px-3 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                activeTab === "institute"
                  ? "border-active-mint bg-active-mint/10 text-foreground ring-1 ring-active-mint/30 shadow-2xs"
                  : "border-[#222222]/15 dark:border-white/10 bg-white/60 dark:bg-[#181818]/60 hover:bg-white/80"
              }`}
            >
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg ${activeTab === "institute" ? "bg-active-mint text-white" : "bg-muted text-muted-foreground"}`}>
                  <Building2 className="h-3.5 w-3.5" />
                </div>
                <div>
                  <h3 className="font-bold text-xs text-foreground leading-tight">Educational Institution</h3>
                  <p className="text-[10px] text-muted-foreground hidden sm:block">K-12 Campus Partnership</p>
                </div>
              </div>
              <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-active-mint/30 text-active-mint hidden sm:inline-flex">
                Campus
              </Badge>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("independent");
                setError("");
              }}
              className={`p-2 px-3 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                activeTab === "independent"
                  ? "border-active-mint bg-active-mint/10 text-foreground ring-1 ring-active-mint/30 shadow-2xs"
                  : "border-[#222222]/15 dark:border-white/10 bg-white/60 dark:bg-[#181818]/60 hover:bg-white/80"
              }`}
            >
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg ${activeTab === "independent" ? "bg-active-mint text-white" : "bg-muted text-muted-foreground"}`}>
                  <HeartHandshake className="h-3.5 w-3.5" />
                </div>
                <div>
                  <h3 className="font-bold text-xs text-foreground leading-tight">Family & Parent Desk</h3>
                  <p className="text-[10px] text-muted-foreground hidden sm:block">Home Care & Radar</p>
                </div>
              </div>
              <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-active-mint/30 text-active-mint hidden sm:inline-flex">
                Family
              </Badge>
            </button>
          </div>

          {/* Dynamic Card Body (Ultra-Compact) */}
          <Card className="border-[#222222]/15 dark:border-white/10 bg-white/85 dark:bg-[#181818]/85 backdrop-blur-md rounded-2xl shadow-sm overflow-hidden">
            
            {/* TAB 1: Educational Institute Application */}
            {activeTab === "institute" && (
              <>
                <CardHeader className="px-4 py-2 border-b border-[#222222]/10 dark:border-white/10 flex flex-row items-center justify-between space-y-0">
                  <div className="flex items-center gap-1.5">
                    <School className="h-3.5 w-3.5 text-active-mint" />
                    <CardTitle className="text-xs font-bold text-foreground">
                      School Partnership Onboarding
                    </CardTitle>
                  </div>
                  <span className="text-[10px] text-muted-foreground">Admin credential activation</span>
                </CardHeader>

                <CardContent className="p-3.5 sm:p-4">
                  {instituteSubmitted ? (
                    <div className="text-center py-6 px-3 space-y-2.5">
                      <div className="h-10 w-10 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto ring-4 ring-emerald-500/5">
                        <CheckCircle2 className="h-5 w-5" />
                      </div>
                      <div className="space-y-1 max-w-sm mx-auto">
                        <h3 className="text-sm font-bold text-foreground">
                          Application Submitted!
                        </h3>
                        <p className="text-[11px] text-muted-foreground leading-snug">
                          Thank you for registering <strong className="text-foreground">{instituteForm.institute_name}</strong>. Our institutional desk will reach out at <span className="font-mono text-foreground">{instituteForm.email}</span> within 24 hours.
                        </p>
                        {instituteAppId && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground border inline-block mt-1">
                            Ref ID: {instituteAppId.slice(0, 10)}...
                          </span>
                        )}
                      </div>
                      <div className="pt-2 flex items-center justify-center gap-2">
                        <Link href="/login">
                          <Button variant="outline" size="sm" className="h-8 text-xs rounded-xl">
                            Return to Login
                          </Button>
                        </Link>
                        <Button
                          size="sm"
                          className="h-8 text-xs bg-active-mint hover:bg-active-mint/90 text-white rounded-xl"
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
                          New Inquiry
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleInstituteSubmit} className="space-y-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-foreground">
                            Institute Name <span className="text-destructive">*</span>
                          </label>
                          <Input
                            placeholder="e.g. National Public School"
                            value={instituteForm.institute_name}
                            onChange={(e) =>
                              setInstituteForm({ ...instituteForm, institute_name: e.target.value })
                            }
                            required
                            className="h-8 text-xs rounded-lg"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-foreground">School Type</label>
                          <select
                            className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-0.5 text-xs shadow-2xs focus-visible:ring-1 focus-visible:ring-active-mint"
                            value={instituteForm.institute_type}
                            onChange={(e) =>
                              setInstituteForm({ ...instituteForm, institute_type: e.target.value })
                            }
                          >
                            <option value="K-12 School" className="bg-popover text-popover-foreground">K-12 Campus</option>
                            <option value="Senior Secondary High School" className="bg-popover text-popover-foreground">High School (9-12)</option>
                            <option value="Secondary School" className="bg-popover text-popover-foreground">Secondary (6-10)</option>
                            <option value="Primary & Middle School" className="bg-popover text-popover-foreground">Middle School (1-8)</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-foreground">
                            City & Region <span className="text-destructive">*</span>
                          </label>
                          <div className="grid grid-cols-2 gap-1.5">
                            <Input
                              placeholder="City"
                              value={instituteForm.city}
                              onChange={(e) => setInstituteForm({ ...instituteForm, city: e.target.value })}
                              required
                              className="h-8 text-xs rounded-lg"
                            />
                            <Input
                              placeholder="State"
                              value={instituteForm.state}
                              onChange={(e) => setInstituteForm({ ...instituteForm, state: e.target.value })}
                              required
                              className="h-8 text-xs rounded-lg"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-foreground">
                            Contact Person & Role <span className="text-destructive">*</span>
                          </label>
                          <div className="grid grid-cols-2 gap-1.5">
                            <Input
                              placeholder="Name"
                              value={instituteForm.contact_name}
                              onChange={(e) => setInstituteForm({ ...instituteForm, contact_name: e.target.value })}
                              required
                              className="h-8 text-xs rounded-lg"
                            />
                            <Input
                              placeholder="Designation"
                              value={instituteForm.designation}
                              onChange={(e) => setInstituteForm({ ...instituteForm, designation: e.target.value })}
                              className="h-8 text-xs rounded-lg"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div className="space-y-1 sm:col-span-1">
                          <label className="text-[11px] font-semibold text-foreground">
                            Official Email <span className="text-destructive">*</span>
                          </label>
                          <Input
                            type="email"
                            placeholder="admin@school.edu"
                            value={instituteForm.email}
                            onChange={(e) => setInstituteForm({ ...instituteForm, email: e.target.value })}
                            required
                            className="h-8 text-xs rounded-lg"
                          />
                        </div>

                        <div className="space-y-1 sm:col-span-1">
                          <label className="text-[11px] font-semibold text-foreground">
                            Phone / WhatsApp <span className="text-destructive">*</span>
                          </label>
                          <Input
                            type="tel"
                            placeholder="+91..."
                            value={instituteForm.phone}
                            onChange={(e) => setInstituteForm({ ...instituteForm, phone: e.target.value })}
                            required
                            className="h-8 text-xs rounded-lg"
                          />
                        </div>

                        <div className="space-y-1 sm:col-span-1">
                          <label className="text-[11px] font-semibold text-foreground">Student Strength</label>
                          <select
                            className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2 py-0.5 text-xs shadow-2xs focus-visible:ring-1 focus-visible:ring-active-mint"
                            value={instituteForm.estimated_students}
                            onChange={(e) => setInstituteForm({ ...instituteForm, estimated_students: Number(e.target.value) })}
                          >
                            <option value="250" className="bg-popover text-popover-foreground">&lt; 500</option>
                            <option value="1000" className="bg-popover text-popover-foreground">500 – 1.5k</option>
                            <option value="2500" className="bg-popover text-popover-foreground">1.5k – 3.5k</option>
                            <option value="5000" className="bg-popover text-popover-foreground">3.5k+</option>
                          </select>
                        </div>
                      </div>

                      {error && (
                        <p className="text-[11px] text-destructive text-center font-medium bg-destructive/10 p-1.5 rounded-lg">
                          {error}
                        </p>
                      )}

                      <Button
                        type="submit"
                        disabled={loading}
                        className="w-full h-8.5 text-xs font-semibold gap-1.5 mt-1 bg-active-mint hover:bg-active-mint/90 text-white rounded-xl shadow-xs cursor-pointer"
                      >
                        {loading ? "Submitting Application..." : "Submit Campus Application"}
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </form>
                  )}
                </CardContent>
              </>
            )}

            {/* TAB 2: Individual & Family (Parent / Guardian) */}
            {activeTab === "independent" && (
              <>
                <CardHeader className="px-4 py-2 border-b border-[#222222]/10 dark:border-white/10 flex flex-row items-center justify-between space-y-0">
                  <div className="flex items-center gap-1.5">
                    <HeartHandshake className="h-3.5 w-3.5 text-active-mint" />
                    <CardTitle className="text-xs font-bold text-foreground">
                      Family Desk Registration
                    </CardTitle>
                  </div>

                  {/* Sub-role Toggle in Header */}
                  <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setIndependentRole("parent")}
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                        independentRole === "parent" ? "bg-white dark:bg-[#222] text-active-mint shadow-2xs" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Parent
                    </button>
                    <button
                      type="button"
                      onClick={() => setIndependentRole("relative")}
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                        independentRole === "relative" ? "bg-white dark:bg-[#222] text-active-mint shadow-2xs" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Guardian
                    </button>
                  </div>
                </CardHeader>

                <CardContent className="p-3.5 sm:p-4">
                  {independentSuccess ? (
                    <div className="text-center py-6 space-y-2">
                      <div className="h-10 w-10 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                        <CheckCircle2 className="h-5 w-5" />
                      </div>
                      <h3 className="text-sm font-bold text-foreground">
                        Account Created Successfully!
                      </h3>
                      <p className="text-[11px] text-muted-foreground">
                        Welcome to JaagrMind! Redirecting to your family dashboard...
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {/* Google OAuth Button */}
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
                          window.location.href = `${apiBase}/api/auth/google/login?role=${independentRole}&intent=signup`;
                        }}
                        className="w-full flex items-center justify-center gap-2 h-8.5 border-border hover:bg-muted/50 font-semibold text-xs rounded-xl shadow-2xs cursor-pointer"
                      >
                        <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24">
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
                        <div className="border-t border-[#222222]/10 dark:border-white/10 w-full" />
                        <span className="bg-white dark:bg-[#181818] px-2 text-[9px] uppercase font-mono tracking-wider text-muted-foreground shrink-0">
                          Or register with email
                        </span>
                        <div className="border-t border-[#222222]/10 dark:border-white/10 w-full" />
                      </div>

                      <form onSubmit={handleIndependentSubmit} className="space-y-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-foreground">
                              Full Name <span className="text-destructive">*</span>
                            </label>
                            <Input
                              placeholder="e.g. Rajesh Sharma"
                              value={independentForm.name}
                              onChange={(e) => setIndependentForm({ ...independentForm, name: e.target.value })}
                              required
                              className="h-8 text-xs rounded-lg"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-foreground">
                              Mobile Number (Optional)
                            </label>
                            <Input
                              type="tel"
                              placeholder="+91..."
                              value={independentForm.phone}
                              onChange={(e) => setIndependentForm({ ...independentForm, phone: e.target.value })}
                              className="h-8 text-xs rounded-lg"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-foreground">
                              Email Address <span className="text-destructive">*</span>
                            </label>
                            <Input
                              type="email"
                              placeholder="parent@example.com"
                              value={independentForm.email}
                              onChange={(e) => setIndependentForm({ ...independentForm, email: e.target.value })}
                              required
                              className="h-8 text-xs rounded-lg"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-foreground">
                              Password <span className="text-destructive">*</span>
                            </label>
                            <Input
                              type="password"
                              placeholder="Min 6 characters"
                              value={independentForm.password}
                              onChange={(e) => setIndependentForm({ ...independentForm, password: e.target.value })}
                              required
                              minLength={6}
                              className="h-8 text-xs rounded-lg"
                            />
                          </div>
                        </div>

                        <div className="p-2 rounded-lg bg-active-mint/5 border border-active-mint/20 flex items-center gap-2 text-[10px] text-muted-foreground">
                          <Lightbulb className="h-3.5 w-3.5 text-active-mint shrink-0" />
                          <span>You can link and manage all children directly inside your parent dashboard after registration.</span>
                        </div>

                        {error && (
                          <p className="text-[11px] text-destructive text-center font-medium bg-destructive/10 p-1.5 rounded-lg">
                            {error}
                          </p>
                        )}

                        <Button
                          type="submit"
                          disabled={loading}
                          className="w-full h-8.5 text-xs font-semibold gap-1.5 mt-1 bg-active-mint hover:bg-active-mint/90 text-white rounded-xl shadow-xs cursor-pointer"
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
          </Card>

          {/* Compact Footer Links */}
          <div className="text-center text-xs text-[#222222]/60 dark:text-[#FFF8F0]/60 space-y-0.5 pt-0.5">
            <div>
              Already have an account?{" "}
              <Link href="/login" className="text-active-mint font-semibold hover:underline">
                Sign in to Portal
              </Link>
            </div>
            <div className="text-[10px]">
              Enrolled student?{" "}
              <Link href="/student/login" className="text-[#222222]/50 dark:text-white/50 hover:text-active-mint font-medium underline">
                Access Student Assessment &rarr;
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── Discrete Bottom-Right Copyright Overlay ──────────────────── */}
      <div className="absolute bottom-4 right-5 z-20 text-[10px] font-mono tracking-wider text-[#222222]/40 dark:text-[#FFF8F0]/40 pointer-events-none">
        JaagrMind © 2026
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
