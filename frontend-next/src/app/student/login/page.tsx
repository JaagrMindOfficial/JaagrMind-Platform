"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { ArrowUpRight } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { api } from "@/lib/api";

export default function StudentLoginPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { studentLogin } = useAuth();

  const [schoolInfo, setSchoolInfo] = useState<{ name: string | null; logo: string | null }>({ name: null, logo: null });
  const [accessId, setAccessId] = useState("");
  const [loginMethod, setLoginMethod] = useState<"roll_class" | "access_id">("roll_class");
  const [studentClass, setStudentClass] = useState("10");
  const [section, setSection] = useState("A");
  const [rollNumber, setRollNumber] = useState("");
  const [stream, setStream] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [email, setEmail] = useState("");
  const [schoolCode, setSchoolCode] = useState("");
  
  const [step, setStep] = useState<"school" | "login">("school");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const schoolId = searchParams.get("school");
    const testId = searchParams.get("test");
    const paramAccessId = searchParams.get("accessId") || searchParams.get("access_id") || searchParams.get("roll");

    if (testId && typeof window !== "undefined") {
      sessionStorage.setItem("target_test_id", testId);
    }

    if (paramAccessId) {
      setAccessId(paramAccessId);
      setLoginMethod("access_id");
    }

    if (schoolId) {
      setStep("login");
      setSchoolCode(schoolId);
      fetchSchoolInfo(schoolId);
    } else {
      setStep("school");
      setSchoolInfo({ name: null, logo: null });
    }
  }, [searchParams]);

  const fetchSchoolInfo = async (code: string) => {
    try {
      setLoading(true);
      const data = await api.get(`/api/student/school-info?schoolId=${code}`, { skipAuth: true });
      setSchoolInfo(data);
      setError("");
    } catch (err: any) {
      console.error("Error fetching school info:", err);
      setError("Invalid school link or code. Please check and try again.");
      setStep("school"); // Go back to school entry on error
    } finally {
      setLoading(false);
    }
  };

  const handleSchoolSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolCode.trim()) {
      setError("Please enter a valid School Code");
      return;
    }
    router.push(`/student/login?school=${schoolCode.trim()}`);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const schoolId = searchParams.get("school");
    if (!schoolId) {
      setError("Invalid access. Please use the test link provided by your school.");
      return;
    }

    if (loginMethod === "access_id") {
      if (!accessId.trim()) {
        setError("Please enter your Access ID");
        return;
      }
    } else {
      if (!rollNumber.trim()) {
        setError("Please enter your Class Roll Number");
        return;
      }
      if (!studentClass.trim()) {
        setError("Please enter or select your Class / Grade");
        return;
      }
    }

    if (mobileNumber && !/^[0-9]{10}$/.test(mobileNumber)) {
      setError("Please enter a valid 10-digit mobile number");
      return;
    }

    if (email && !/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setLoading(true);

    try {
      if (loginMethod === "access_id") {
        await studentLogin({ accessId: accessId.trim(), schoolId, mobileNumber, email });
      } else {
        await studentLogin({
          schoolId,
          class: studentClass.trim(),
          section: section.trim().toUpperCase(),
          rollNumber: rollNumber.trim(),
          stream: stream.trim(),
          mobileNumber,
          email,
        });
      }
      // router.push is handled inside studentLogin on success
    } catch (err: any) {
      setError(err.message || "Failed to log in. Please check your Roll Number and Class.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative px-4">
      <div className="absolute top-6 right-6 flex items-center gap-3 z-30">
        <a
          href="https://jaagrmind.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-medium text-foreground/70 hover:text-primary transition-colors flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5"
        >
          <span>Visit our page</span>
          <ArrowUpRight className="h-3.5 w-3.5" />
        </a>
        <div className="h-4 w-px bg-border" />
        <ThemeToggle />
      </div>

      <Card className="w-full max-w-md border-0 shadow-lg sm:border sm:shadow-sm">
        <CardContent className="pt-8 pb-10 px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            {/* Header / Logo Area */}
            {step === "login" && schoolInfo.name ? (
              <div className="mb-6 flex flex-col items-center">
                {schoolInfo.logo ? (
                  <img src={schoolInfo.logo} alt={schoolInfo.name} className="h-16 w-auto mb-4 rounded-md object-contain" />
                ) : (
                  <div className="h-16 w-16 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xl font-bold mb-4">
                    {schoolInfo.name.charAt(0)}
                  </div>
                )}
                <h1 className="text-xl font-semibold tracking-tight">{schoolInfo.name}</h1>
                <p className="text-sm text-muted-foreground mt-1">Student Portal</p>
              </div>
            ) : (
              <div className="mb-6">
                <div className="flex items-center justify-center mb-4">
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
                <h1 className="text-xl font-semibold tracking-tight">JaagrMind Assessment</h1>
                <p className="text-sm text-muted-foreground mt-1">Enter your school code to continue</p>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-destructive/10 text-destructive text-sm p-3 rounded-md mb-6"
              >
                {error}
              </motion.div>
            )}

            {/* Forms */}
            {step === "school" ? (
              <form onSubmit={handleSchoolSubmit} className="space-y-4">
                <div className="space-y-2 text-left">
                  <label className="text-sm font-medium">School Code</label>
                  <Input
                    value={schoolCode}
                    onChange={(e) => setSchoolCode(e.target.value.toUpperCase())}
                    placeholder="e.g. OAKWOOD"
                    required
                    className="text-center tracking-widest uppercase font-mono"
                  />
                </div>
                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? "Searching..." : "Continue"}
                </Button>

                <div className="pt-3 text-center text-xs text-muted-foreground border-t border-border/40 space-y-1.5">
                  <p>Don&apos;t have a school code? Please contact your school wellness counselor or administration.</p>
                  <Link
                    href="/login"
                    className="text-primary font-semibold hover:underline inline-block"
                  >
                    Parent or Staff Portal Sign In &rarr;
                  </Link>
                </div>
              </form>
            ) : (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                {/* Method selector pills */}
                <div className="grid grid-cols-2 gap-1 p-1 bg-muted/60 rounded-lg border border-border/60 text-xs">
                  <button
                    type="button"
                    onClick={() => setLoginMethod("roll_class")}
                    className={`py-1.5 px-2 rounded-md font-medium transition-all ${
                      loginMethod === "roll_class"
                        ? "bg-background text-foreground shadow-xs font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Class & Roll No.
                  </button>
                  <button
                    type="button"
                    onClick={() => setLoginMethod("access_id")}
                    className={`py-1.5 px-2 rounded-md font-medium transition-all ${
                      loginMethod === "access_id"
                        ? "bg-background text-foreground shadow-xs font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Direct Access ID
                  </button>
                </div>

                {loginMethod === "roll_class" ? (
                  <div className="space-y-3 pt-1">
                    <div className="grid grid-cols-2 gap-3 text-left">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium">Class / Grade *</label>
                        <select
                          value={studentClass}
                          onChange={(e) => setStudentClass(e.target.value)}
                          className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus:outline-none focus:ring-1 focus:ring-ring"
                        >
                          {["6", "7", "8", "9", "10", "11", "12"].map((c) => (
                            <option key={c} value={c}>Class {c}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium">Section *</label>
                        <select
                          value={section}
                          onChange={(e) => setSection(e.target.value)}
                          className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus:outline-none focus:ring-1 focus:ring-ring"
                        >
                          {["A", "B", "C", "D", "E", "F"].map((s) => (
                            <option key={s} value={s}>Section {s}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-left">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium">Roll Number *</label>
                        <Input
                          value={rollNumber}
                          onChange={(e) => setRollNumber(e.target.value)}
                          placeholder="e.g. 15 or 01"
                          required
                          className="h-9 text-xs font-medium"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium">Stream <span className="text-[10px] text-muted-foreground">(If 11/12)</span></label>
                        <Input
                          value={stream}
                          onChange={(e) => setStream(e.target.value)}
                          placeholder="e.g. Science"
                          className="h-9 text-xs"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 text-left pt-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium">Direct Access ID *</label>
                      <span className="text-[10px] text-muted-foreground">From card / teacher</span>
                    </div>
                    <Input
                      value={accessId}
                      onChange={(e) => setAccessId(e.target.value)}
                      placeholder="e.g. 10A-01 or R001"
                      required
                      className="font-mono text-xs"
                    />
                  </div>
                )}
                
                <div className="space-y-2 text-left">
                  <label className="text-sm font-medium">Mobile Number <span className="text-muted-foreground font-normal">(Optional)</span></label>
                  <Input
                    type="tel"
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="10-digit mobile number"
                  />
                </div>

                <div className="space-y-2 text-left">
                  <label className="text-sm font-medium">Email <span className="text-muted-foreground font-normal">(Optional)</span></label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student@school.edu"
                  />
                </div>

                <div className="pt-2">
                  <Button type="submit" disabled={loading} className="w-full">
                    {loading ? "Logging in..." : "Start Assessment"}
                  </Button>
                </div>
                
                <button
                  type="button"
                  onClick={() => router.push("/student/login")}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors mt-4 block w-full"
                >
                  Change School
                </button>
              </form>
            )}
          </motion.div>
        </CardContent>
      </Card>
    </div>
  );
}
