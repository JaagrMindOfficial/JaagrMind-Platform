"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button, buttonVariants } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
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
    <div className="min-h-screen bg-background flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 relative">
      <div className="absolute top-6 right-6">
        <ThemeToggle />
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-3">
            <img
              src="/DarkColorLogo.svg"
              alt="JaagrMind Logo"
              className="h-9 w-auto dark:hidden object-contain"
            />
            <img
              src="/LightColorLogo.svg"
              alt="JaagrMind Logo"
              className="h-9 w-auto hidden dark:block object-contain"
            />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Sign in to JaagrMind
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Access your personalized school leadership, classroom, or family wellness portal.
          </p>
        </div>

        {/* Unified Sign In Card */}
        <Card className="border-border shadow-xs">
          <CardHeader className="pb-3 border-b border-border/40">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Account Portal Access
              </CardTitle>
              <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                Unified Sign In
              </span>
            </div>
            <CardDescription className="text-xs">
              For School Administrators, Educators, Counselors, and Parents.
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-6 space-y-4">
            {searchParams.get("error") && error && (
              <div
                role="alert"
                className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-start gap-2 animate-in fade-in slide-in-from-top-1 duration-200"
              >
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-destructive" />
                <span className="font-medium">{error}</span>
              </div>
            )}

            {/* Primary Action: Continue with Google */}
            <div className="space-y-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleGoogleLogin}
                className="w-full h-11 border-border hover:bg-muted/50 font-medium text-xs flex items-center justify-center gap-2.5 shadow-xs transition-all hover:border-sky-500/40 cursor-pointer"
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
                <span className="font-semibold text-foreground">Continue with Google</span>
              </Button>

              <p className="text-[11px] text-center text-muted-foreground flex items-center justify-center gap-1">
                <ShieldCheck className="h-3 w-3 text-emerald-500" />
                <span>Instant Google verification for Parents, Guardians & Educators</span>
              </p>
            </div>

            {/* Divider */}
            <div className="relative flex items-center justify-center pt-2">
              <div className="border-t border-border w-full" />
              <span className="bg-card px-2 text-[10px] uppercase font-mono tracking-wider text-muted-foreground shrink-0">
                Or sign in with email
              </span>
              <div className="border-t border-border w-full" />
            </div>

            {/* Email & Password Form */}
            <form onSubmit={handleLogin} className="space-y-3 pt-1">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Email</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com or admin@school.edu"
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-foreground">Password</label>
                  <Link
                    href="/forgot-password"
                    className="text-[11px] text-primary hover:underline"
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
                  className="text-xs"
                />
              </div>

              {error && !searchParams.get("error") && (
                <div
                  role="alert"
                  className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-start gap-2 animate-in fade-in slide-in-from-top-1 duration-200"
                >
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-destructive" />
                  <span className="font-medium">{error}</span>
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-9 text-xs font-semibold cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <span>Sign In</span>
                )}
              </Button>
            </form>

            {/* Demo Credentials Quick Guide */}
            <div className="mt-4 p-2.5 rounded-lg bg-muted/40 border border-border/50 text-[11px] text-muted-foreground space-y-1 font-mono">
              <p className="text-[10px] font-sans font-semibold uppercase text-foreground">
                Demo Accounts:
              </p>
              <p><code>oakwood@jaagrmind.com</code> / <code>school123</code> (School Admin)</p>
              <p><code>teacher@oakwood.edu</code> / <code>teach123</code> (Teacher)</p>
              <p><code>counselor@oakwood.edu</code> / <code>counsel123</code> (Counselor)</p>
              <p><code>parent@example.com</code> / <code>parent123</code> (Parent)</p>
            </div>

            {/* Registration Options Link */}
            <div className="pt-2 text-center text-xs text-muted-foreground">
              Don&apos;t have an account yet?{" "}
              <Link
                href="/signup"
                className="text-primary font-semibold hover:underline"
              >
                Sign up as Parent
              </Link>
              {" · "}
              <Link
                href="/signup?tab=institute"
                className="text-primary font-semibold hover:underline"
              >
                Apply for School
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Dedicated Student Portal Quick Access Banner */}
        <div className="mt-4 p-3.5 rounded-xl border border-sky-500/30 bg-sky-500/5 text-xs flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 shrink-0">
              <GraduationCap className="h-4 w-4" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Enrolled Student?</p>
              <p className="text-[11px] text-muted-foreground">
                Access your check-ins using your School Code & Access ID
              </p>
            </div>
          </div>
          <Link
            href="/student/login"
            className={buttonVariants({
              variant: "outline",
              size: "sm",
              className: "text-xs shrink-0 border-sky-500/30 hover:bg-sky-500/15 text-foreground font-semibold inline-flex items-center gap-1",
            })}
          >
            Student Login <ArrowRight className="h-3 w-3 ml-1" />
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
