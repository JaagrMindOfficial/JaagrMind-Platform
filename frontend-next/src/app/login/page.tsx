"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { BrandSidePanel } from "@/components/brand-side-panel";
import { useAuth } from "@/context/auth-context";
import { getActiveSessionDetails } from "@/lib/session-utils";
import {
  ArrowRight,
  ArrowUpRight,
  Loader2,
  AlertCircle,
  LogOut,
  ShieldCheck,
  Home,
} from "lucide-react";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, user, logout, hasRole } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const errParam = searchParams.get("error");
    if (errParam) {
      setError(decodeURIComponent(errParam));
    }
  }, [searchParams]);

  const activeSession = mounted && user ? getActiveSessionDetails(user, hasRole) : null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (email.toLowerCase().trim().endsWith("@jaagrmind.com")) {
      setError("JaagrMind based admins aren't allowed via public portal. Please visit the JM Internal-Ops portal.");
      setLoading(false);
      return;
    }

    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || "Invalid credentials. Please check your email and password.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
    window.location.href = `${apiBase}/api/auth/google/login?role=parent&intent=login`;
  };

  const navActions = (
    <>
      <Link
        href="/"
        title="Return to Home"
        className="h-8 text-xs font-medium text-[#222222]/70 dark:text-[#FFF8F0]/70 hover:text-[#42B677] dark:hover:text-[#42B677] transition-colors inline-flex items-center justify-center gap-1.5 px-2.5 rounded-xl hover:bg-[#222222]/5 dark:hover:bg-white/5 shrink-0"
      >
        <Home className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Home</span>
      </Link>

      <div className="hidden sm:block h-4 w-px bg-[#222222]/15 dark:bg-white/15 shrink-0" />

      <a
        href="https://jaagrmind.com"
        target="_blank"
        rel="noopener noreferrer"
        className="hidden sm:inline-flex h-8 text-xs font-medium text-[#222222]/70 dark:text-[#FFF8F0]/70 hover:text-[#42B677] dark:hover:text-[#42B677] transition-colors items-center gap-1.5 px-2.5 rounded-xl hover:bg-[#222222]/5 dark:hover:bg-white/5 shrink-0"
      >
        <span>Visit our page</span>
        <ArrowUpRight className="h-3.5 w-3.5" />
      </a>

      <div className="h-4 w-px bg-[#222222]/15 dark:bg-white/15 shrink-0" />

      <Link
        href="/internal-ops/signin"
        title="JaagrMind Internal Operations"
        className="h-8 text-xs font-semibold text-[#005456] dark:text-[#91D17C] hover:text-[#42B677] transition-colors inline-flex items-center gap-1.5 px-2.5 rounded-xl border border-[#005456]/20 dark:border-[#42B677]/30 bg-white/60 dark:bg-[#181818]/60 hover:bg-[#005456]/10 shadow-2xs shrink-0"
      >
        <ShieldCheck className="h-3.5 w-3.5 text-[#42B677] shrink-0" />
        <span className="hidden sm:inline">JM Internal-Ops</span>
        <span className="sm:hidden">Ops</span>
      </Link>

      <div className="h-4 w-px bg-[#222222]/15 dark:bg-white/15 shrink-0" />

      <ThemeToggle />
    </>
  );

  return (
    <div className="min-h-screen min-h-dvh overflow-y-auto md:overflow-hidden md:h-screen w-full bg-[#FFF8F0] dark:bg-[#121212] text-[#222222] dark:text-[#FFF8F0] flex flex-col md:flex-row relative select-none">
      
      {/* ── Desktop-Only Top-Right Controls: Home + Visit Our Page + JM Internal-Ops + Theme Toggle ── */}
      <div className="hidden md:flex absolute top-5 right-6 z-30 items-center gap-2.5">
        {navActions}
      </div>

      {/* ── LEFT SIDE: Brand Kit Architectural Graphics (Inline mobile controls with logo) ──── */}
      <BrandSidePanel
        actions={navActions}
        subtitle="Access your personalized school leadership, classroom, counselor, or family wellness portal."
      />

      {/* ── RIGHT SIDE: Seamless Login Form or Active Session ────────── */}
      <div className="w-full md:w-7/12 lg:w-[54%] min-h-full h-auto md:h-full flex flex-col justify-center px-5 sm:px-12 lg:px-16 py-6 pb-14 md:py-6 overflow-y-auto relative">
        
        {/* Subtle Ambient Radial Glow */}
        <div className="absolute top-1/4 right-1/4 w-80 h-80 bg-[#42B677]/8 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-md w-full mx-auto space-y-5 relative z-10 my-auto">
          
          {/* ── CASE 1: Already Authenticated Active Session ─────────── */}
          {activeSession ? (
            <div className="space-y-5">
              {/* Header */}
              <div className="space-y-1.5">
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#222222] dark:text-[#FFF8F0]">
                  Already signed in
                </h2>
                <p className="text-xs text-[#222222]/65 dark:text-[#FFF8F0]/65">
                  You are currently logged in with active credentials.
                </p>
              </div>

              {/* Card */}
              <div className="rounded-2xl border border-[#222222]/15 dark:border-white/10 bg-white/80 dark:bg-[#181818]/80 backdrop-blur-md p-6 sm:p-7 shadow-md space-y-5 relative overflow-hidden">
                {/* Top Accent Strip */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#005456] via-[#42B677] to-[#91D17C]" />

                {/* Space Pill */}
                <div className="flex items-center justify-between">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase bg-[#42B677]/10 text-[#42B677] border border-[#42B677]/20">
                    <span className="h-2 w-2 rounded-full bg-[#42B677] animate-pulse" />
                    <span>{activeSession.space}</span>
                  </div>
                  <span className="text-[11px] font-mono uppercase tracking-wider text-[#222222]/50 dark:text-[#FFF8F0]/50">
                    {activeSession.spaceBadge}
                  </span>
                </div>

                {/* Profile & Role Info */}
                <div className="flex items-start gap-3.5">
                  <div className="h-11 w-11 rounded-xl bg-[#42B677]/15 dark:bg-[#42B677]/20 text-[#42B677] flex items-center justify-center shrink-0">
                    <activeSession.icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-bold text-[#222222] dark:text-[#FFF8F0]">
                      {activeSession.role}
                    </h3>
                    <p className="text-xs text-[#222222]/70 dark:text-[#FFF8F0]/70 mt-0.5 truncate">
                      {user?.name} <span className="text-[#222222]/40 dark:text-white/40 font-mono">({user?.email})</span>
                    </p>
                    <p className="text-[11px] text-[#222222]/60 dark:text-[#FFF8F0]/60 mt-0.5 line-clamp-2">
                      {activeSession.subtitle}
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2.5 pt-1">
                  <Button
                    onClick={() => router.push(activeSession.destination)}
                    className="w-full h-11 text-xs font-semibold bg-[#42B677] hover:bg-[#42B677]/90 text-white rounded-xl shadow-xs cursor-pointer flex items-center justify-center gap-2 transition-all"
                  >
                    <span>Continue to Dashboard</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => logout("/login")}
                    className="w-full h-10 text-xs font-semibold border-[#222222]/15 dark:border-white/15 hover:border-destructive/40 text-destructive dark:text-red-400 hover:bg-destructive/10 dark:hover:bg-destructive/20 rounded-xl cursor-pointer flex items-center justify-center gap-2 transition-colors"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Sign Out & Switch Account</span>
                  </Button>
                </div>
              </div>

              {/* Discrete Return Link */}
              <div className="text-center text-xs text-[#222222]/60 dark:text-[#FFF8F0]/60">
                <Link href="/" className="hover:text-[#42B677] transition-colors">
                  ← Return to Spaces Portal
                </Link>
              </div>
            </div>
          ) : (
            /* ── CASE 2: Standard Login Form ─────────────────────────── */
            <>
              {/* Header */}
              <div className="space-y-1.5">
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#222222] dark:text-[#FFF8F0]">
                  Sign in to JaagrMind
                </h2>
                <p className="text-xs text-[#222222]/65 dark:text-[#FFF8F0]/65">
                  Enter your email and password to access your dedicated workspace.
                </p>
              </div>

              {/* Form Card */}
              <div className="rounded-2xl border border-[#222222]/15 dark:border-white/10 bg-white/80 dark:bg-[#181818]/80 backdrop-blur-md p-6 sm:p-7 shadow-md space-y-4">
                
                {/* Error Message */}
                {error && (
                  <div
                    role="alert"
                    className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs space-y-2"
                  >
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                      <span className="font-medium">{error}</span>
                    </div>
                    {error.includes("Internal-Ops") && (
                      <div className="pl-6 pt-0.5">
                        <Link
                          href="/internal-ops/signin"
                          className="inline-flex items-center gap-1.5 font-bold text-[#005456] dark:text-[#91D17C] hover:underline"
                        >
                          <ShieldCheck className="h-3.5 w-3.5" />
                          <span>Proceed to JM Internal-Ops Sign In →</span>
                        </Link>
                      </div>
                    )}
                  </div>
                )}

                {/* Google OAuth Button */}
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGoogleLogin}
                  className="w-full h-10 border-[#222222]/15 dark:border-white/15 hover:bg-[#222222]/5 dark:hover:bg-white/5 font-semibold text-xs flex items-center justify-center gap-2.5 rounded-xl cursor-pointer shadow-xs"
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
                  <span className="text-[#222222] dark:text-[#FFF8F0]">Continue with Google</span>
                </Button>

                {/* Divider */}
                <div className="relative flex items-center justify-center pt-1">
                  <div className="border-t border-[#222222]/10 dark:border-white/10 w-full" />
                  <span className="bg-white dark:bg-[#181818] px-2 text-[10px] uppercase font-mono tracking-wider text-[#222222]/50 dark:text-white/50 shrink-0">
                    Or email credentials
                  </span>
                  <div className="border-t border-[#222222]/10 dark:border-white/10 w-full" />
                </div>

                {/* Email & Password Form */}
                <form onSubmit={handleLogin} className="space-y-3 pt-1">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#222222] dark:text-[#FFF8F0]">
                      Email Address
                    </label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="name@school.edu or parent@example.com"
                      className="text-xs h-10 rounded-xl border-[#222222]/20 dark:border-white/15 focus-visible:ring-[#42B677]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-[#222222] dark:text-[#FFF8F0]">
                        Password
                      </label>
                      <Link
                        href="/forgot-password"
                        className="text-[11px] text-[#42B677] hover:underline"
                      >
                        Forgot password?
                      </Link>
                    </div>
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="••••••••"
                      className="text-xs h-10 rounded-xl border-[#222222]/20 dark:border-white/15 focus-visible:ring-[#42B677]"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-10 text-xs font-semibold bg-[#42B677] hover:bg-[#42B677]/90 text-white rounded-xl shadow-xs cursor-pointer mt-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                        <span>Signing in...</span>
                      </>
                    ) : (
                      <span>Sign In to Workspace</span>
                    )}
                  </Button>
                </form>
              </div>

              {/* Quick Links Footer below Card */}
              <div className="space-y-2 text-center text-xs text-[#222222]/70 dark:text-[#FFF8F0]/70">
                <div>
                  Don&apos;t have an account yet?{" "}
                  <Link
                    href="/signup"
                    className="text-[#42B677] font-semibold hover:underline"
                  >
                    Register as Parent
                  </Link>
                  {" · "}
                  <Link
                    href="/signup?tab=institute"
                    className="text-[#42B677] font-semibold hover:underline"
                  >
                    Apply for Campus
                  </Link>
                </div>

                <div>
                  <Link
                    href="/student/login"
                    className="text-[11px] text-[#222222]/50 dark:text-white/50 hover:text-[#42B677] transition-colors"
                  >
                    Enrolled student with Access ID? <span className="underline">Student Login →</span>
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Discrete Bottom-Right Copyright Overlay ──────────────────── */}
      <div className="hidden md:block absolute bottom-5 right-6 z-20 text-[11px] font-mono tracking-wider text-[#222222]/40 dark:text-[#FFF8F0]/40 pointer-events-none">
        JaagrMind © 2026
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-[#FFF8F0] dark:bg-[#121212]">
          <Loader2 className="h-7 w-7 animate-spin text-[#42B677]" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
