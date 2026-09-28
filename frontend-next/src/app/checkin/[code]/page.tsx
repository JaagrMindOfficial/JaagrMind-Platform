"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sparkles,
  Mail,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Compass,
  ShieldCheck,
  HeartHandshake,
  RotateCcw,
  Play,
  Lightbulb,
  AlertCircle,
  Clock,
  Lock,
  User,
  Home,
  X,
  Plus,
  MessageSquare,
  LogOut,
  Target,
  Sun,
  Users,
  Smartphone,
  Check,
  Send,
} from "lucide-react";
import { api } from "@/lib/api";
import { playCompletionSound, playSelectSound, playStepSound } from "@/lib/assessment-sound";
import { AssessmentScenery } from "@/components/assessment/assessment-scenery";
import { useAssessmentTheme, ASSESSMENT_THEMES } from "@/lib/assessment-theme";

interface QuestionItem {
  text: string;
  section: string;
  sectionName?: string;
  isPositive?: boolean;
}

interface ReflectionData {
  opening: string;
  pattern: string;
  context: string;
  skill_invitation: string;
  activity_cta: string;
  choice: string;
  closing: string;
  selected_skill: string;
  skill_context: string;
  alternative_context: string;
}

interface ActivityData {
  activity_name: string;
  title: string;
  bucket: string;
  duration_minutes: number;
  instruction: string;
  description: string;
}

export default function DynamicCheckinPage() {
  const params = useParams();
  const router = useRouter();
  const code = (params?.code as string) || "";

  const { currentThemeId } = useAssessmentTheme();
  const theme = ASSESSMENT_THEMES[currentThemeId] || ASSESSMENT_THEMES["duo-green"];

  // Stages: "loading" | "error" | "welcome" | "assessment" | "reflection"
  const [stage, setStage] = useState<"loading" | "error" | "welcome" | "assessment" | "reflection">("loading");
  const [errorDetails, setErrorDetails] = useState<{ title: string; message: string; reason?: string }>({
    title: "",
    message: "",
  });

  // Check-in Link Metadata
  const [linkMeta, setLinkMeta] = useState<any>(null);

  // Candidate Inputs
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [emailError, setEmailError] = useState("");

  // Assessment Questions & Answers
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<{ [key: number]: number }>({});
  const [notes, setNotes] = useState<{ [key: number]: string }>({});
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [exitModalOpen, setExitModalOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving">("saved");

  // Reflection result
  const [reflection, setReflection] = useState<ReflectionData | null>(null);
  const [recommendedActivity, setRecommendedActivity] = useState<ActivityData | null>(null);
  const [selectedDomainData, setSelectedDomainData] = useState<any>(null);
  const [activePracticeModal, setActivePracticeModal] = useState<ActivityData | null>(null);

  const standardOptions = [
    { label: "Not like me", value: 1, scaleIndex: 1 },
    { label: "A little like me", value: 2, scaleIndex: 2 },
    { label: "Quite like me", value: 3, scaleIndex: 3 },
    { label: "Very much like me", value: 4, scaleIndex: 4 },
  ];

  useEffect(() => {
    if (!code) {
      setErrorDetails({
        title: "Missing Check-in Code",
        message: "No check-in code was provided. Please verify your link.",
      });
      setStage("error");
      return;
    }

    validateAndLoadLink(code);
  }, [code]);

  const validateAndLoadLink = async (linkCode: string) => {
    try {
      setStage("loading");
      const data = await api.get(`/api/public/checkin-links/${linkCode}`, { skipAuth: true });

      if (data && data.valid) {
        setLinkMeta(data);
        if (data.candidateEmail) setEmail(data.candidateEmail);
        if (data.candidateName) setName(data.candidateName);

        // Flatten questions if nested sections
        let qList: QuestionItem[] = [];
        if (Array.isArray(data.questions) && data.questions.length > 0) {
          qList = data.questions;
        } else if (Array.isArray(data.sections)) {
          for (const s of data.sections) {
            if (Array.isArray(s.questions)) {
              for (const q of s.questions) {
                qList.push({
                  ...q,
                  section: s.sectionKey || s.id || q.section,
                  sectionName: s.title || s.name || q.sectionName,
                });
              }
            }
          }
        }

        setQuestions(qList);
        setStage("welcome");
      } else {
        setErrorDetails({
          title: "Invalid Check-in Link",
          message: data?.message || "This check-in link is inactive or invalid.",
        });
        setStage("error");
      }
    } catch (err: any) {
      const resp = err?.response?.data;
      if (resp?.reason === "expired") {
        setErrorDetails({
          title: "Check-in Link Expired",
          message: resp?.message || "This check-in link has expired. Please contact your coordinator for a fresh link.",
          reason: "expired",
        });
      } else if (resp?.reason === "completed") {
        setErrorDetails({
          title: "Link Already Completed",
          message: resp?.message || "This check-in link has already been completed.",
          reason: "completed",
        });
      } else {
        setErrorDetails({
          title: "Check-in Link Not Found",
          message: resp?.message || "We could not find an active check-in associated with this code. Please check the URL.",
          reason: "not_found",
        });
      }
      setStage("error");
    }
  };

  const handleStart = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = email.trim().toLowerCase();
    if (!clean || !clean.includes("@")) {
      setEmailError("Please enter a valid email address so we can send your report.");
      return;
    }
    setEmailError("");
    setStage("assessment");
    setCurrentIdx(0);
  };

  const handleSelectOption = (optValue: number) => {
    playSelectSound(optValue - 1);
    setSaveStatus("saving");
    setAnswers((prev) => ({
      ...prev,
      [currentIdx]: optValue,
    }));
    setTimeout(() => {
      setSaveStatus("saved");
    }, 280);
  };

  const handleNext = () => {
    playStepSound();
    setShowNoteInput(false);
    const totalQ = questions.length > 0 ? questions.length : 32;
    if (currentIdx < totalQ - 1) {
      setCurrentIdx((prev) => prev + 1);
    } else {
      handleSubmitDirect();
    }
  };

  const handlePrev = () => {
    if (currentIdx > 0) {
      playStepSound();
      setShowNoteInput(false);
      setCurrentIdx((prev) => prev - 1);
    }
  };

  // Keyboard shortcut handler
  useEffect(() => {
    if (stage !== "assessment") return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") {
        return;
      }

      if (e.key === "1" || e.key === "2" || e.key === "3" || e.key === "4") {
        const val = parseInt(e.key, 10);
        handleSelectOption(val);
      } else if (e.key === "Enter") {
        if (answers[currentIdx] !== undefined && !submitting) {
          e.preventDefault();
          handleNext();
        }
      } else if (e.key === "ArrowLeft") {
        if (currentIdx > 0 && !submitting) {
          e.preventDefault();
          handlePrev();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [stage, currentIdx, answers, submitting, questions.length]);

  const handleSubmitDirect = async () => {
    if (submitting) return;
    setSubmitting(true);
    setSubmitError("");
    playCompletionSound();

    try {
      const formattedAnswers = Object.entries(answers).map(([idxStr, val]) => ({
        questionIndex: parseInt(idxStr, 10),
        selectedOption: val - 1,
        value: val,
        note: notes[parseInt(idxStr, 10)] || "",
      }));

      const res = await api.post(
        "/api/public/assessment/direct-submit",
        {
          email: email.trim(),
          name: name.trim() || "Friend",
          assessmentId: linkMeta?.assessmentId,
          linkCode: code,
          answers: formattedAnswers,
          timeTaken: 360,
        },
        { skipAuth: true }
      );

      if (res && res.reflection) {
        setReflection(res.reflection);
        setRecommendedActivity(res.recommended_activity);
        setSelectedDomainData(res.domains);
        setStage("reflection");
      }
    } catch (err: any) {
      console.error("Submission failed:", err);
      setSubmitError(err?.response?.data?.message || err?.message || "Submission failed. Please check your connection.");
    } finally {
      setSubmitting(false);
    }
  };

  const currentQ = questions[currentIdx];
  const currentAnswer = answers[currentIdx];
  const totalCount = questions.length > 0 ? questions.length : 32;
  const progressPercent = Math.round(((currentIdx + 1) / totalCount) * 100);

  // Domain styling helper based on current section
  const domainTheme = useMemo(() => {
    const sec = (currentQ?.section || "").toUpperCase();
    if (sec === "A" || currentQ?.sectionName?.toLowerCase().includes("focus")) {
      return {
        key: "A",
        label: "FOCUS & ATTENTION",
        icon: Target,
        badgeClass: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
        activeBorder: "border-sky-500 ring-2 ring-sky-500/20",
        activeBg: "bg-sky-500/5 dark:bg-sky-500/10",
        radioActive: "border-sky-500 bg-sky-500 text-white",
        bubbleActive: "bg-sky-500 border-sky-500",
      };
    } else if (sec === "B" || currentQ?.sectionName?.toLowerCase().includes("confidence")) {
      return {
        key: "B",
        label: "INNER CONFIDENCE",
        icon: Sparkles,
        badgeClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
        activeBorder: "border-amber-500 ring-2 ring-amber-500/20",
        activeBg: "bg-amber-500/5 dark:bg-amber-500/10",
        radioActive: "border-amber-500 bg-amber-500 text-white",
        bubbleActive: "bg-amber-500 border-amber-500",
      };
    } else if (sec === "C" || currentQ?.sectionName?.toLowerCase().includes("social")) {
      return {
        key: "C",
        label: "SOCIAL INTERACTION",
        icon: Users,
        badgeClass: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
        activeBorder: "border-rose-500 ring-2 ring-rose-500/20",
        activeBg: "bg-rose-500/5 dark:bg-rose-500/10",
        radioActive: "border-rose-500 bg-rose-500 text-white",
        bubbleActive: "bg-rose-500 border-rose-500",
      };
    } else {
      return {
        key: "D",
        label: "HEALTHY DIGITAL HABITS",
        icon: Smartphone,
        badgeClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
        activeBorder: "border-emerald-500 ring-2 ring-emerald-500/20",
        activeBg: "bg-emerald-500/5 dark:bg-emerald-500/10",
        radioActive: "border-emerald-500 bg-emerald-500 text-white",
        bubbleActive: "bg-emerald-500 border-emerald-500",
      };
    }
  }, [currentQ]);

  // Stepper phase calculation: 1 Notice (Q1-11), 2 Reflect (Q12-24), 3 Takeaway (Q25-32)
  const currentPhaseIndex = currentIdx < 11 ? 1 : currentIdx < 24 ? 2 : 3;

  return (
    <div className="min-h-screen bg-slate-50/70 dark:bg-slate-950 text-foreground flex flex-col justify-between antialiased selection:bg-primary/20">
      {/* ─────────────────────────────────────────────────────────────
          STAGE 1: LOADING STATE
      ────────────────────────────────────────────────────────────── */}
      {stage === "loading" && (
        <div className="min-h-screen flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20 space-y-4 max-w-sm mx-auto"
          >
            <div className="h-12 w-12 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm font-medium text-muted-foreground">
              Validating your reflection link...
            </p>
          </motion.div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          STAGE 2: ERROR / EXPIRED / NOT FOUND
      ────────────────────────────────────────────────────────────── */}
      {stage === "error" && (
        <div className="min-h-screen flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md space-y-6"
          >
            <Card className="border shadow-lg rounded-2xl overflow-hidden text-center p-8 space-y-5 bg-card">
              <div className="h-14 w-14 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
                {errorDetails.reason === "completed" ? (
                  <CheckCircle2 className="h-8 w-8 text-sky-600" />
                ) : errorDetails.reason === "expired" ? (
                  <Clock className="h-8 w-8 text-amber-600" />
                ) : (
                  <AlertCircle className="h-8 w-8" />
                )}
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-bold tracking-tight text-foreground">
                  {errorDetails.title}
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {errorDetails.message}
                </p>
              </div>

              {code && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-muted rounded-full text-xs font-mono text-muted-foreground">
                  <Lock className="h-3 w-3" /> Code: {code}
                </div>
              )}

              <div className="pt-4 flex flex-col sm:flex-row justify-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => router.push("/checkin")}
                  className="text-xs cursor-pointer"
                >
                  Enter Another Code
                </Button>
                <Button
                  onClick={() => router.push("/")}
                  className="text-xs gap-1.5 cursor-pointer"
                >
                  <Home className="h-3.5 w-3.5" />
                  <span>Back to Home</span>
                </Button>
              </div>
            </Card>
          </motion.div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          STAGE 3: WELCOME & DETAILS CAPTURE
      ────────────────────────────────────────────────────────────── */}
      {stage === "welcome" && (
        <div className="min-h-screen flex flex-col justify-between">
          <header className="border-b bg-card/80 backdrop-blur px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <img src="/LightColorLogo.svg" alt="JaagrMind" className="h-8 w-auto dark:hidden" />
              <img src="/DarkColorLogo.svg" alt="JaagrMind" className="h-8 w-auto hidden dark:block" />
            </div>
            <ThemeToggle />
          </header>

          <main className="flex-1 flex items-center justify-center p-4 sm:p-6 my-auto">
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-xl space-y-6"
            >
              <Card className="border shadow-lg rounded-2xl overflow-hidden bg-card">
                <div className="bg-gradient-to-r from-sky-500/10 via-indigo-500/10 to-emerald-500/10 p-8 sm:p-10 border-b text-center space-y-3">
                  <Badge variant="outline" className="bg-background/80 text-primary border-primary/20 px-3 py-1 text-xs font-semibold">
                    Personal Reflection Check-in
                  </Badge>
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                    {linkMeta?.title || "A Quick Check-in with Yourself"}
                  </h1>
                  <p className="text-muted-foreground text-xs sm:text-sm max-w-md mx-auto leading-relaxed">
                    {linkMeta?.description ||
                      "A reflective questionnaire designed to help you notice everyday patterns in attention, confidence, social interaction, and digital habits."}
                  </p>
                </div>

                <CardContent className="p-6 sm:p-8 space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
                    <div className="p-3.5 rounded-xl bg-muted/40 border space-y-1">
                      <Compass className="h-4 w-4 text-indigo-500 mx-auto" />
                      <div className="text-xs font-semibold">Self-Discovery</div>
                      <div className="text-[11px] text-muted-foreground">Notice everyday rhythms</div>
                    </div>
                    <div className="p-3.5 rounded-xl bg-muted/40 border space-y-1">
                      <ShieldCheck className="h-4 w-4 text-emerald-500 mx-auto" />
                      <div className="text-xs font-semibold">100% Confidential</div>
                      <div className="text-[11px] text-muted-foreground">Safe &amp; non-judgmental</div>
                    </div>
                    <div className="p-3.5 rounded-xl bg-muted/40 border space-y-1">
                      <Mail className="h-4 w-4 text-sky-500 mx-auto" />
                      <div className="text-xs font-semibold">Direct Email Report</div>
                      <div className="text-[11px] text-muted-foreground">Sent directly to you</div>
                    </div>
                  </div>

                  <form onSubmit={handleStart} className="space-y-4 pt-1">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                        Your First Name <span className="text-muted-foreground font-normal">(Optional)</span>
                      </label>
                      <Input
                        placeholder="e.g. Alex"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="h-10 text-xs bg-background"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                        Your Email Address <span className="text-destructive">*</span>
                      </label>
                      <Input
                        type="email"
                        required
                        placeholder="name@example.com"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (emailError) setEmailError("");
                        }}
                        className={`h-10 text-xs bg-background ${emailError ? "border-destructive ring-1 ring-destructive" : ""}`}
                      />
                      {emailError ? (
                        <p className="text-xs text-destructive">{emailError}</p>
                      ) : (
                        <p className="text-[11px] text-muted-foreground">
                          We will email your non-clinical reflection and micro-activity directly to this address.
                        </p>
                      )}
                    </div>

                    <Button
                      type="submit"
                      className="w-full h-11 text-xs font-semibold gap-2 mt-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm cursor-pointer"
                    >
                      <span>Begin Check-in</span>
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          </main>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          STAGE 4: ASSESSMENT QUESTIONS (SPLIT LAYOUT - DESIGNS 1, 2 & 3)
      ────────────────────────────────────────────────────────────── */}
      {stage === "assessment" && currentQ && (
        <div className="h-screen max-h-screen overflow-hidden flex flex-col md:flex-row w-full bg-background">
          {/* LEFT SIDEBAR: Guidance & Progress (Design 1) */}
          <aside className="w-full md:w-80 lg:w-96 border-b md:border-b-0 md:border-r border-border/60 bg-muted/20 p-5 sm:p-7 flex flex-col justify-between shrink-0">
            <div className="space-y-7">
              {/* Brand Logo & Tagline */}
              <div>
                <div className="flex items-center gap-2">
                  <img src="/LightColorLogo.svg" alt="JaagrMind" className="h-7 w-auto dark:hidden" />
                  <img src="/DarkColorLogo.svg" alt="JaagrMind" className="h-7 w-auto hidden dark:block" />
                </div>
                <p className="text-[11px] text-muted-foreground/80 mt-1 font-medium tracking-tight">
                  Know Yourself • Grow Your Tomorrow
                </p>
              </div>

              {/* Check-in Header & Counter */}
              <div className="space-y-3">
                <div className="space-y-0.5">
                  <h2 className="text-base font-bold text-foreground tracking-tight">
                    Your check-in
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    A few minutes to understand yourself better.
                  </p>
                </div>

                {/* Progress bar */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-xs font-medium">
                    <span className="text-muted-foreground">
                      Question {currentIdx + 1} of {totalCount}
                    </span>
                    <Badge variant="outline" className="font-mono text-[10px] px-2 py-0.5 bg-background">
                      {progressPercent}%
                    </Badge>
                  </div>
                  <div className="h-2 w-full bg-muted/80 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-primary"
                      animate={{ width: `${progressPercent}%` }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                    />
                  </div>
                </div>
              </div>

              {/* 3-Step Journey Stepper (Design 1) */}
              <div className="space-y-5 pt-2 border-t border-border/40">
                {/* Step 1: Notice */}
                <div className="flex items-start gap-3.5 relative">
                  <div className="flex flex-col items-center">
                    <div
                      className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                        currentPhaseIndex > 1
                          ? "bg-emerald-500 text-white shadow-xs"
                          : currentPhaseIndex === 1
                          ? "bg-primary text-primary-foreground ring-4 ring-primary/20 shadow-xs"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {currentPhaseIndex > 1 ? <Check className="h-3.5 w-3.5" /> : "1"}
                    </div>
                    <div className="w-0.5 h-10 bg-border/60 mt-1.5" />
                  </div>
                  <div className="space-y-0.5 pt-0.5">
                    <p className={`text-xs font-bold ${currentPhaseIndex === 1 ? "text-foreground" : "text-muted-foreground"}`}>
                      Notice
                    </p>
                    <p className="text-[11px] text-muted-foreground leading-snug">
                      Be aware of your thoughts, feelings and actions
                    </p>
                  </div>
                </div>

                {/* Step 2: Reflect */}
                <div className="flex items-start gap-3.5 relative">
                  <div className="flex flex-col items-center">
                    <div
                      className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                        currentPhaseIndex > 2
                          ? "bg-emerald-500 text-white shadow-xs"
                          : currentPhaseIndex === 2
                          ? "bg-primary text-primary-foreground ring-4 ring-primary/20 shadow-xs"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {currentPhaseIndex > 2 ? <Check className="h-3.5 w-3.5" /> : "2"}
                    </div>
                    <div className="w-0.5 h-10 bg-border/60 mt-1.5" />
                  </div>
                  <div className="space-y-0.5 pt-0.5">
                    <p className={`text-xs font-bold ${currentPhaseIndex === 2 ? "text-foreground" : "text-muted-foreground"}`}>
                      Reflect
                    </p>
                    <p className="text-[11px] text-muted-foreground leading-snug">
                      Explore what feels true for you right now
                    </p>
                  </div>
                </div>

                {/* Step 3: Takeaway */}
                <div className="flex items-start gap-3.5">
                  <div
                    className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      currentPhaseIndex === 3
                        ? "bg-primary text-primary-foreground ring-4 ring-primary/20 shadow-xs"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    3
                  </div>
                  <div className="space-y-0.5 pt-0.5">
                    <p className={`text-xs font-bold ${currentPhaseIndex === 3 ? "text-foreground" : "text-muted-foreground"}`}>
                      Takeaway
                    </p>
                    <p className="text-[11px] text-muted-foreground leading-snug">
                      See your insights and simple next steps
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Status & Exit (Design 1) */}
            <div className="pt-6 border-t border-border/40 space-y-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                <span
                  className={`h-2 w-2 rounded-full ${
                    saveStatus === "saving" ? "bg-amber-500 animate-ping" : "bg-emerald-500"
                  }`}
                />
                <span>{saveStatus === "saving" ? "Saving..." : "Saved just now"}</span>
              </div>

              <button
                type="button"
                onClick={() => setExitModalOpen(true)}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Exit check-in</span>
              </button>
            </div>
          </aside>

          {/* RIGHT MAIN CANVAS: Question & Likert Cards with Scenery */}
          <main className="flex-1 flex flex-col justify-between p-3 sm:p-5 lg:p-6 relative overflow-hidden">
            {/* Dynamic Animated Scenery, Mascots & Ambient Foliage */}
            <AssessmentScenery
              themeId={currentThemeId}
              questionIndex={currentIdx}
              totalQuestions={questions.length || 1}
              selectedAnswer={answers[currentIdx]}
              isCompleted={submitting}
            />

            {/* Top Stage Bar */}
            <div className="flex items-center justify-between pb-2 relative z-10 shrink-0">
              {/* Category Pill with Icon */}
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg border flex items-center gap-1.5 text-xs font-bold font-mono ${domainTheme.badgeClass}`}>
                  <domainTheme.icon className="h-3.5 w-3.5" />
                  <span>{domainTheme.label}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <ThemeToggle />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setExitModalOpen(true)}
                  className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Central Question & Likert Area (Duolingo 3D Sticker Container) */}
            <div className="max-w-2xl lg:max-w-3xl w-full mx-auto my-auto py-1 relative z-20">
              <div id="assessment-main-card" className="border-2 border-b-[5px] border-slate-200 dark:border-slate-800 border-b-slate-300 dark:border-b-slate-700 rounded-3xl bg-card p-3.5 sm:p-4 space-y-2 sm:space-y-2.5 shadow-sm">
                {/* Reassurance Tip Banner */}
                <div className="py-1.5 px-3 rounded-xl bg-amber-500/10 border-2 border-b-3 border-amber-500/25 flex items-center gap-2 text-[11px] text-amber-900 dark:text-amber-200 font-medium">
                  <Lightbulb className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                  <span>There are no right or wrong answers — just your honest experience.</span>
                </div>

                {/* Statement Title - 2 to 3 lines cleanly */}
                <div className="pt-0.5">
                  <h1 className="text-base sm:text-lg font-bold tracking-tight text-foreground leading-snug line-clamp-3">
                    <span className="font-mono mr-2" style={{ color: theme.primary }}>{currentIdx + 1}.</span>
                    {currentQ.text}
                  </h1>
                </div>

                {/* Friendly Guidance Hint - Tactile Buttony Capsule Box matching Theme Color */}
                <div className="w-full pt-1 pb-0.5 flex items-center justify-center">
                  <div
                    className="inline-flex items-center gap-2.5 px-5 py-1.5 rounded-full border-2 border-b-[3.5px] shadow-xs select-none transition-all duration-300"
                    style={{
                      borderColor: theme.primary,
                      borderBottomColor: theme.primaryDark,
                      backgroundColor: `color-mix(in srgb, ${theme.primary} 22%, var(--background))`,
                    }}
                  >
                    <span className="text-base leading-none">
                      ✨
                    </span>
                    <span className="text-xs sm:text-[13px] font-bold tracking-tight text-slate-900 dark:text-slate-100">
                      Choose what feels most true for you
                    </span>
                  </div>
                </div>

                {/* Duolingo Tactile 3D Circular Number Buttons with Press Depression */}
                <div className="py-1.5 sm:py-2.5 w-full max-w-xl mx-auto">
                  <div className="flex items-start justify-between gap-2 sm:gap-3 w-full">
                    {standardOptions.map((opt, idx) => {
                      const isSelected = currentAnswer === opt.value;

                      return (
                        <div
                          key={opt.value}
                          onClick={() => handleSelectOption(opt.value)}
                          className="flex-1 flex flex-col items-center text-center cursor-pointer group select-none"
                        >
                          <motion.button
                            type="button"
                            whileHover={{ scale: 1.06 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectOption(opt.value);
                            }}
                            className={`w-11 h-11 sm:w-13 sm:h-13 rounded-full flex items-center justify-center text-sm sm:text-base font-extrabold transition-all cursor-pointer relative select-none ${
                              isSelected
                                ? `${theme.activeRadioClass} scale-105 active:translate-y-[2px] active:border-b-2`
                                : "border-2 border-b-4 border-slate-200 dark:border-slate-700 border-b-slate-300 dark:border-b-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-750 active:border-b-2 active:translate-y-[2px]"
                            }`}
                          >
                            {isSelected && (
                              <div className="absolute top-1 inset-x-2 h-1 rounded-full bg-white/40 pointer-events-none" />
                            )}
                            <span>{idx + 1}</span>
                          </motion.button>

                          {/* Psychology Today Under-Label (High contrast in light & dark mode) */}
                          <div className="mt-1.5 space-y-0.5 max-w-[115px]">
                            <p className={`text-[11px] sm:text-xs leading-tight transition-colors line-clamp-2 ${
                              isSelected
                                ? "font-bold text-foreground"
                                : "font-semibold text-slate-700 dark:text-slate-200 group-hover:text-foreground"
                            }`}>
                              {opt.label}
                            </p>
                            {idx === 0 && (
                              <span className="block text-[9px] text-slate-500 dark:text-slate-400 font-mono uppercase tracking-wider font-bold">
                                Disagree
                              </span>
                            )}
                            {idx === standardOptions.length - 1 && (
                              <span className="block text-[9px] text-slate-500 dark:text-slate-400 font-mono uppercase tracking-wider font-bold">
                                Agree
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Optional Context Note (Duolingo sticker input toggle) */}
                <div className="pt-0.5">
                  {!showNoteInput && !notes[currentIdx] ? (
                    <button
                      type="button"
                      onClick={() => setShowNoteInput(true)}
                      className="text-[11px] text-slate-600 dark:text-slate-300 hover:text-foreground flex items-center gap-1.5 cursor-pointer font-semibold transition-colors px-2 py-0.5 rounded-lg hover:bg-muted/50"
                    >
                      <MessageSquare className="h-3 w-3 text-slate-500 dark:text-slate-400" />
                      <span>Want to add context?</span>
                      <span className="font-bold hover:underline" style={{ color: theme.primary }}>+ Add a note</span>
                    </button>
                  ) : (
                    <div className="p-2.5 rounded-xl border-2 border-b-3 border-slate-200 dark:border-slate-700 bg-card space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] text-slate-600 dark:text-slate-300 font-semibold">
                        <span className="flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" style={{ color: theme.primary }} />
                          Optional Personal Reflection Note
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowNoteInput(false)}
                          className="text-slate-600 dark:text-slate-300 hover:text-foreground text-[10px] font-bold"
                        >
                          Hide
                        </button>
                      </div>
                      <textarea
                        rows={2}
                        placeholder="Jot down a quick thought or situation you were thinking of (optional)..."
                        value={notes[currentIdx] || ""}
                        onChange={(e) =>
                          setNotes((prev) => ({
                            ...prev,
                            [currentIdx]: e.target.value,
                          }))
                        }
                        className="w-full text-xs p-2 rounded-lg border-2 border-border/80 bg-background focus:outline-none focus:border-primary font-medium text-foreground placeholder:text-muted-foreground/70"
                      />
                    </div>
                  )}
                </div>

                {/* Submit error banner if any */}
                {submitError && (
                  <div className="p-2.5 text-xs bg-destructive/10 border-2 border-b-3 border-destructive/30 text-destructive rounded-xl flex items-center gap-2 font-medium">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span>{submitError}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Navigation Controls Bar with Duolingo 3D tactile buttons */}
            <div className="max-w-2xl lg:max-w-3xl w-full mx-auto pt-2.5 border-t-2 border-slate-200/80 dark:border-slate-800 flex items-center justify-between relative z-20 shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handlePrev}
                disabled={currentIdx === 0 || submitting}
                className="text-xs h-9 px-4 rounded-xl border-2 border-b-4 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 active:border-b-2 active:translate-y-[2px] font-bold cursor-pointer transition-all"
              >
                <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                <span>Previous</span>
              </Button>

              <div className="hidden sm:flex items-center gap-2 text-[10px] text-slate-600 dark:text-slate-300 font-mono font-medium">
                <span>Press</span>
                <kbd className="px-1.5 py-0.5 rounded bg-muted border-2 border-b-3 border-slate-300 dark:border-slate-700 text-[9px] font-bold text-foreground">
                  Enter
                </kbd>
                <span>to continue • Or press 1–4</span>
              </div>

              {currentIdx === totalCount - 1 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={!currentAnswer || submitting}
                  className={`h-9 px-5 text-xs font-bold rounded-xl min-w-[150px] cursor-pointer transition-all uppercase tracking-wider flex items-center justify-center gap-2 ${
                    !currentAnswer || submitting
                      ? "opacity-50 cursor-not-allowed bg-slate-300 dark:bg-slate-700 text-slate-500 border-2 border-slate-400"
                      : theme.buttonClass
                  }`}
                >
                  {submitting ? (
                    <span>Submitting...</span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <span>Finish &amp; Reflect</span>
                      <Sparkles className="h-3.5 w-3.5" />
                    </span>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={!currentAnswer || submitting}
                  className={`h-9 px-5 text-xs font-bold rounded-xl min-w-[120px] cursor-pointer transition-all uppercase tracking-wider flex items-center justify-center gap-2 ${
                    !currentAnswer || submitting
                      ? "opacity-50 cursor-not-allowed bg-slate-300 dark:bg-slate-700 text-slate-500 border-2 border-slate-400"
                      : theme.buttonClass
                  }`}
                >
                  <span>Continue</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </main>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          STAGE 5: 5-STEP REFLECTION RESULTS (NON-CLINICAL TEMPLATE)
      ────────────────────────────────────────────────────────────── */}
      {stage === "reflection" && reflection && (
        <div className="min-h-screen flex flex-col justify-between">
          <header className="border-b bg-card/80 backdrop-blur px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img src="/LightColorLogo.svg" alt="JaagrMind" className="h-8 w-auto dark:hidden" />
              <img src="/DarkColorLogo.svg" alt="JaagrMind" className="h-8 w-auto hidden dark:block" />
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="text-xs text-emerald-600 bg-emerald-500/10 border-emerald-500/20 font-medium">
                Check-in Completed
              </Badge>
              <ThemeToggle />
            </div>
          </header>

          <main className="flex-1 max-w-3xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6 my-auto">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <Card className="border shadow-lg rounded-2xl overflow-hidden bg-card">
                <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-sky-500/10 p-8 text-center space-y-2.5 border-b">
                  <div className="h-12 w-12 rounded-2xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-1">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                    Your Personal Reflection Snapshot
                  </h1>
                  <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
                    A copy of this reflection and micro-activity has been sent to{" "}
                    <strong className="text-foreground font-semibold">{email}</strong>.
                  </p>
                </div>

                <CardContent className="p-6 sm:p-8 space-y-6">
                  {/* Non-Clinical Disclaimer Banner */}
                  <div className="p-3.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-xs text-sky-950 dark:text-sky-200 flex items-start gap-2.5">
                    <ShieldCheck className="h-4 w-4 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
                    <span>
                      <strong>Notice:</strong> This snapshot is based on your self-reported responses today. It is non-clinical, not a diagnostic evaluation, and designed solely for personal self-discovery.
                    </span>
                  </div>

                  {/* 7-Element Reflection Template */}
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-primary">
                        1. Opening Notice
                      </span>
                      <p className="text-sm font-semibold text-foreground">
                        {reflection.opening || "Here’s something you might notice about yourself."}
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-muted/40 border space-y-2">
                      <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
                        2. Everyday Pattern
                      </span>
                      <p className="text-sm text-foreground leading-relaxed">
                        {reflection.pattern}
                      </p>
                      {reflection.context && (
                        <p className="text-xs text-muted-foreground leading-relaxed pt-1 border-t border-border/40">
                          {reflection.context}
                        </p>
                      )}
                    </div>

                    {/* Recommended Micro-Activity */}
                    {recommendedActivity && (
                      <div className="p-5 rounded-xl bg-primary/5 border border-primary/20 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-primary">
                            3. Recommended Micro-Practice
                          </span>
                          <span className="text-xs font-mono text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {recommendedActivity.duration_minutes || 5} mins
                          </span>
                        </div>
                        <h4 className="text-base font-bold text-foreground">
                          {recommendedActivity.title || recommendedActivity.activity_name}
                        </h4>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {recommendedActivity.description}
                        </p>
                        <div className="p-3 rounded-lg bg-background border text-xs font-medium text-foreground">
                          💡 <strong>Instruction:</strong> {recommendedActivity.instruction}
                        </div>
                      </div>
                    )}

                    {/* Closing Assurance */}
                    <div className="p-4 rounded-xl bg-muted/20 border border-border/40 space-y-1 text-center">
                      <p className="text-xs text-muted-foreground italic leading-relaxed">
                        &ldquo;{reflection.closing || "There’s nothing to fix here. This is simply a chance to notice what works for you and try something new."}&rdquo;
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.print()}
                      className="text-xs cursor-pointer w-full sm:w-auto"
                    >
                      Print or Save PDF
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => router.push("/")}
                      className="text-xs gap-1.5 cursor-pointer w-full sm:w-auto"
                    >
                      <Home className="h-3.5 w-3.5" />
                      <span>Back to Home</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </main>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          EXIT CONFIRMATION DIALOG
      ────────────────────────────────────────────────────────────── */}
      <Dialog open={exitModalOpen} onOpenChange={setExitModalOpen}>
        <DialogContent className="max-w-md bg-card border-border">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-lg font-bold text-foreground">
              Exit Check-in?
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
              Your selections so far are saved on this device. You can return anytime using this link to finish your reflection.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setExitModalOpen(false)}
              className="text-xs cursor-pointer"
            >
              Resume Check-in
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => router.push("/")}
              className="text-xs cursor-pointer"
            >
              Exit to Home
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
