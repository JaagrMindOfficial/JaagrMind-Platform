"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/context/auth-context";
import {
  ShieldCheck,
  Loader2,
  Lock,
  Mail,
  AlertCircle,
  Terminal,
} from "lucide-react";

function InternalOpsSignInContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { internalLogin } = useAuth();

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

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const redirectParam = searchParams.get("redirect");
      await internalLogin(email, password, redirectParam || undefined);
    } catch (err: any) {
      setError(err.message || "Authentication failed. Verify your internal operations credentials.");
    } finally {
      setLoading(false);
    }
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
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium border border-border bg-muted/60 text-muted-foreground mb-2">
            <Terminal className="h-3 w-3 text-primary" />
            <span>Internal Operations Gateway</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            JaagrMind Operations Sign In
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Restricted access for platform superadmins, central care desk, and system administrators.
          </p>
        </div>

        <Card className="border-border shadow-xs">
          <CardHeader className="pb-3 border-b border-border/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm font-semibold">
                  Administrator & Care Desk Access
                </CardTitle>
              </div>
              <Badge variant="outline" className="text-[10px] font-mono bg-primary/5 text-primary border-primary/20">
                Tier 1 Restricted
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Enter your official JaagrMind operations credentials to proceed.
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-5 space-y-4">
            {error && (
              <div role="alert" className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-start gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-destructive" />
                <span className="font-medium">{error}</span>
              </div>
            )}

            <form onSubmit={handleSignIn} className="space-y-3.5">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Operations Email</span>
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="admin@jaagrmind.com"
                  className="text-xs font-mono"
                  autoComplete="email"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Password</span>
                </label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="text-xs"
                  autoComplete="current-password"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-9 text-xs font-semibold mt-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                    <span>Authenticating Session...</span>
                  </>
                ) : (
                  <span>Authenticate Session</span>
                )}
              </Button>
            </form>

            {/* Demo Accounts Hint */}
            <div className="mt-4 p-2.5 rounded-lg bg-muted/40 border border-border/50 text-[11px] text-muted-foreground space-y-1 font-mono">
              <p className="text-[10px] font-sans font-semibold uppercase text-foreground">
                Internal Ops Credentials:
              </p>
              <p>
                <code>admin@jaagrmind.com</code> / <code>admin123</code> (Superadmin)
              </p>
              <p>
                <code>counselor@jaagrmind.com</code> / <code>counsel123</code> (Central Care Desk)
              </p>
            </div>

            <div className="pt-2 text-center text-[11px] text-muted-foreground">
              Institutional staff or students?{" "}
              <a href="/login" className="text-primary hover:underline font-medium">
                Public Institute Sign In
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function InternalOpsSignInPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </div>
      }
    >
      <InternalOpsSignInContent />
    </Suspense>
  );
}
