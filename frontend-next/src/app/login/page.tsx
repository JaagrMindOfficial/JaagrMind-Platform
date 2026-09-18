"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { BrandSidePanel } from "@/components/brand-side-panel";
import { useAuth } from "@/context/auth-context";
import {
  GraduationCap,
  ShieldCheck,
  ArrowRight,
  Loader2,
  AlertCircle,
  Sparkles,
} from "lucide-react";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const errParam = searchParams.get("error");
    if (errParam) {
      setError(decodeURIComponent(errParam));
    }
  }, [searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

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

  return (
    <div className="h-screen max-h-screen overflow-hidden w-screen bg-[#FFF8F0] dark:bg-[#121212] text-[#222222] dark:text-[#FFF8F0] flex flex-col md:flex-row relative select-none">
      
      {/* ── Discreet Top-Right Theme Toggle ──────────────────────────── */}
      <div className="absolute top-5 right-6 z-30">
        <ThemeToggle />
      </div>

      {/* ── LEFT SIDE: Brand Kit Architectural Graphics ──────────────── */}
      <BrandSidePanel subtitle="Access your personalized school leadership, classroom, counselor, or family wellness portal." />

      {/* ── RIGHT SIDE: Seamless Login Form ──────────────────────────── */}
      <div className="w-full md:w-7/12 lg:w-[54%] h-full flex flex-col justify-center px-6 sm:px-12 lg:px-16 py-6 overflow-y-auto relative">
        
        {/* Subtle Ambient Radial Glow */}
        <div className="absolute top-1/4 right-1/4 w-80 h-80 bg-[#42B677]/8 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-md w-full mx-auto space-y-5 relative z-10 my-auto">
          
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
                className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-start gap-2"
              >
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span className="font-medium">{error}</span>
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
        </div>
      </div>

      {/* ── Discrete Bottom-Right Copyright Overlay ──────────────────── */}
      <div className="absolute bottom-5 right-6 z-20 text-[11px] font-mono tracking-wider text-[#222222]/40 dark:text-[#FFF8F0]/40 pointer-events-none">
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
