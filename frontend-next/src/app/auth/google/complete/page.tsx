"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Users,
  GraduationCap,
  HeartHandshake,
  CheckCircle2,
  ShieldCheck,
  ArrowRight,
  Loader2,
  AlertTriangle,
} from "lucide-react";

function GoogleCompleteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setAuthSession } = useAuth();

  const [loadingSetup, setLoadingSetup] = useState(true);
  const [setupError, setSetupError] = useState("");

  const [setupToken, setSetupToken] = useState("");
  const [googleEmail, setGoogleEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  // Form fields (Notice: NO @username, using clean Given/Document Name!)
  const [name, setName] = useState("");
  const [accountType, setAccountType] = useState<"parent" | "relative">("parent");
  const [grade, setGrade] = useState("10");
  const [schoolName, setSchoolName] = useState("");
  const [childName, setChildName] = useState("");
  const [phone, setPhone] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    const token = searchParams.get("setup_token");
    if (!token) {
      setSetupError("Missing Google OAuth setup session. Please sign in again.");
      setLoadingSetup(false);
      return;
    }
    setSetupToken(token);

    const verifyToken = async () => {
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
        const res = await fetch(`${apiBase}/api/auth/google/verify-setup?setup_token=${encodeURIComponent(token)}`);
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "Setup session expired. Please sign in again with Google.");
        }
        const data = await res.json();
        setGoogleEmail(data.email || "");
        setName(data.name || "");
        setAvatarUrl(data.avatar_url || "");
        if (data.suggested_role && ["parent", "relative"].includes(data.suggested_role)) {
          setAccountType(data.suggested_role as "parent" | "relative");
        }
      } catch (err: any) {
        setSetupError(err.message || "Failed to verify setup token.");
      } finally {
        setLoadingSetup(false);
      }
    };

    verifyToken();
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError("");

    if (!name.trim()) {
      setSubmitError("Please enter your full name.");
      setSubmitting(false);
      return;
    }

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
      const res = await fetch(`${apiBase}/api/auth/google/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          setup_token: setupToken,
          name: name.trim(),
          account_type: accountType,
          child_name: childName.trim() || undefined,
          school_name: schoolName.trim() || undefined,
          phone: phone.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to finalize account registration.");
      }

      setAuthSession(data.token, data.user);
      router.push("/dashboard");
    } catch (err: any) {
      setSubmitError(err.message || "Something went wrong.");
      setSubmitting(false);
    }
  };

  if (loadingSetup) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-xs text-muted-foreground">Loading your Google profile...</p>
        </div>
      </div>
    );
  }

  if (setupError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md border-border shadow-md">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <div className="h-12 w-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-foreground">Setup Session Expired</h3>
              <p className="text-xs text-muted-foreground">{setupError}</p>
            </div>
            <Button onClick={() => router.push("/login")} variant="outline" className="text-xs">
              Return to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 relative">
      <div className="absolute top-6 right-6">
        <ThemeToggle />
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-lg">
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
            Complete Your JaagrMind Profile
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Signed in with Google. Tell us how you will be using the platform.
          </p>
        </div>

        <Card className="border-border shadow-sm">
          <CardHeader className="pb-4 border-b border-border/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={name}
                    className="h-10 w-10 rounded-full border border-border object-cover"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold text-sm">
                    {name ? name.charAt(0).toUpperCase() : "J"}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-foreground">{name || "Google User"}</span>
                    <Badge variant="outline" className="text-[10px] bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 gap-1 py-0 px-1.5 font-normal">
                      <ShieldCheck className="h-3 w-3" />
                      Verified
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground font-mono">{googleEmail}</p>
                </div>
              </div>
              <Badge variant="outline" className="text-[10px] font-mono capitalize">
                Individual & Family
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Account Type Selector */}
              {/* Account Type Selector */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-foreground">
                  Select Your Account Role <span className="text-destructive">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: "parent", label: "Parent", icon: Users, desc: "Child wellness monitoring" },
                    { id: "relative", label: "Guardian / Relative", icon: HeartHandshake, desc: "Family student support" },
                  ].map((roleOption) => {
                    const Icon = roleOption.icon;
                    const isSelected = accountType === roleOption.id;
                    return (
                      <button
                        key={roleOption.id}
                        type="button"
                        onClick={() => setAccountType(roleOption.id as "parent" | "relative")}
                        className={`p-3 rounded-lg border text-left transition-all flex flex-col gap-1 ${isSelected
                          ? "border-sky-500 bg-sky-500/10 text-sky-700 dark:text-sky-300 ring-1 ring-sky-500/30"
                          : "border-border hover:bg-muted/40 text-muted-foreground hover:text-foreground"
                          }`}
                      >
                        <div className="flex items-center gap-1.5 font-semibold text-xs text-foreground">
                          <Icon className="h-4 w-4 shrink-0 text-sky-500" />
                          <span>{roleOption.label}</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground line-clamp-1">
                          {roleOption.desc}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Student Guidance Callout */}
                <div className="flex items-center justify-between rounded-lg border border-sky-500/20 bg-sky-500/5 p-2.5 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-sky-500 shrink-0" />
                    <span>Enrolled student? Access is issued by your school.</span>
                  </div>
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-xs font-semibold text-sky-600 dark:text-sky-400"
                    onClick={() => router.push("/student/login")}
                  >
                    Student Access &rarr;
                  </Button>
                </div>
              </div>

              {/* Given / Document Full Name (No username!) */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  Full Name (Given / Document Name) <span className="text-destructive">*</span>
                </label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Aarav Sharma"
                  required
                  className="text-xs"
                />
                <p className="text-[10px] text-muted-foreground">
                  This name will be used on check-in reports and guardian communications.
                </p>
              </div>

              {/* Child Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">
                    Student / Child&apos;s Name (Optional)
                  </label>
                  <Input
                    placeholder="e.g. Rohan Sharma"
                    value={childName}
                    onChange={(e) => setChildName(e.target.value)}
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">
                    Student&apos;s Class / Grade
                  </label>
                  <select
                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus:outline-none focus:ring-1 focus:ring-ring"
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                  >
                    <option value="6">Class 6</option>
                    <option value="7">Class 7</option>
                    <option value="8">Class 8</option>
                    <option value="9">Class 9</option>
                    <option value="10">Class 10</option>
                    <option value="11">Class 11</option>
                    <option value="12">Class 12</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  School Name (Optional)
                </label>
                <Input
                  placeholder="e.g. Delhi Public School"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  className="text-xs"
                />
              </div>

              {/* Contact Phone (Optional) */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  Phone Number (Optional)
                </label>
                <Input
                  type="tel"
                  placeholder="e.g. +91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="text-xs"
                />
              </div>

              {submitError && (
                <p className="text-xs text-destructive text-center font-medium bg-destructive/10 p-2 rounded-md">
                  {submitError}
                </p>
              )}

              <Button
                type="submit"
                disabled={submitting}
                className="w-full h-10 text-xs font-semibold gap-1.5 mt-2 bg-sky-600 hover:bg-sky-700 text-white"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Saving Profile...</span>
                  </>
                ) : (
                  <>
                    <span>Complete & Enter JaagrMind</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function GoogleCompletePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </div>
      }
    >
      <GoogleCompleteContent />
    </Suspense>
  );
}
