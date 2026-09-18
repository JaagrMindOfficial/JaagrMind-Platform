"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, CheckCircle2, AlertTriangle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setAuthSession } = useAuth();

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [userName, setUserName] = useState("");

  useEffect(() => {
    const token = searchParams.get("token");
    const err = searchParams.get("error");
    const name = searchParams.get("name") || "";
    setUserName(name);

    if (err) {
      setStatus("error");
      setErrorMessage(decodeURIComponent(err));
      return;
    }

    if (!token) {
      setStatus("error");
      setErrorMessage("No authentication session token was returned from Google login.");
      return;
    }

    const processLogin = async () => {
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
        const res = await fetch(`${apiBase}/api/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          throw new Error("Could not verify session profile with server.");
        }

        const userData = await res.json();
        setAuthSession(token, userData);
        setStatus("success");

        // Route appropriately based on user role
        const roles = userData.roles?.map((r: any) => r.role) || [];
        setTimeout(() => {
          if (roles.includes("student")) {
            router.push("/student");
          } else if (roles.includes("school_admin") || roles.includes("teacher")) {
            router.push("/school");
          } else if (roles.includes("superadmin")) {
            router.push("/admin");
          } else if (roles.includes("parent") || roles.includes("relative")) {
            router.push("/parent");
          } else {
            // Default dashboard
            router.push("/dashboard");
          }
        }, 1200);
      } catch (e: any) {
        setStatus("error");
        setErrorMessage(e.message || "Failed to complete authentication session.");
      }
    };

    processLogin();
  }, [searchParams, router, setAuthSession]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md border-border shadow-md">
        <CardContent className="pt-8 pb-8 text-center space-y-4">
          {status === "loading" && (
            <>
              <div className="h-14 w-14 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto animate-pulse">
                <Loader2 className="h-7 w-7 animate-spin" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-foreground">
                  Authenticating with Google
                </h3>
                <p className="text-xs text-muted-foreground">
                  Securing your JaagrMind session, please wait...
                </p>
              </div>
            </>
          )}

          {status === "success" && (
            <>
              <div className="h-14 w-14 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-foreground">
                  {userName ? `Welcome back, ${userName}!` : "Welcome to JaagrMind!"}
                </h3>
                <p className="text-xs text-muted-foreground">
                  Identity verified. Redirecting to your dashboard...
                </p>
              </div>
            </>
          )}

          {status === "error" && (
            <>
              <div className="h-14 w-14 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
                <AlertTriangle className="h-7 w-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-foreground">
                  Sign In Could Not Complete
                </h3>
                <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                  {errorMessage}
                </p>
              </div>
              <div className="pt-2">
                <Button
                  onClick={() => router.push("/login")}
                  variant="outline"
                  className="text-xs gap-1.5"
                >
                  <span>Return to Sign In</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
