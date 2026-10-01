"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useRouter, useSearchParams, notFound } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { api } from "@/lib/api";
import {
  Award,
  ArrowRight,
  User,
  Mail,
  AlertCircle,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Compass,
  Lightbulb,
  Pause,
  LogOut,
} from "lucide-react";
import { MindWeatherCheck, type MindWeatherState } from "@/components/assessment/mind-weather-check";
import { CenteringBreath } from "@/components/assessment/centering-breath";
import { JourneyTimeline } from "@/components/assessment/journey-timeline";
import { ScenarioCard, type ScenarioQuestion } from "@/components/assessment/scenario-card";
import { ReflectionSnack } from "@/components/assessment/reflection-snack";
import { AssessmentScenery } from "@/components/assessment/assessment-scenery";
import { useAssessmentTheme, isValidThemeId } from "@/lib/assessment-theme";
import { playCompletionSound, playSelectSound, playStepSound } from "@/lib/assessment-sound";

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
  const searchParams = useSearchParams();
  const router = useRouter();
  const code = (params?.code as string) || "";

  // Strict theme validation: 404 if invalid/old theme parameter is provided
  const themeParam = searchParams.get("theme");
  if (themeParam && !isValidThemeId(themeParam)) {
    notFound();
  }

  const { currentThemeId, theme } = useAssessmentTheme();

  // Stages: "loading" | "error" | "welcome" | "moodCheck" | "countdown" | "assessment" | "reflection"
  const [stage, setStage] = useState<"loading" | "error" | "welcome" | "moodCheck" | "countdown" | "assessment" | "reflection">("loading");
  const [isPaused, setIsPaused] = useState(false);
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

  // Mind Weather Check
  const [mindWeather, setMindWeather] = useState<MindWeatherState>({
    weather: null,
    energyLevel: null,
    sleepQuality: null,
  });

  // Assessment Questions & Answers
  const [questions, setQuestions] = useState<ScenarioQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<{ [key: number]: number }>({});
  const answersRef = useRef<{ [key: number]: number }>({});
  const [showReflection, setShowReflection] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Reflection result
  const [reflection, setReflection] = useState<ReflectionData | null>(null);
  const [recommendedActivity, setRecommendedActivity] = useState<ActivityData | null>(null);

  useEffect(() => {
    if (!code) return;
    loadCheckinLink();
  }, [code]);

  const loadCheckinLink = async () => {
    try {
      setStage("loading");
      const data = await api.get<any>(`/api/public/checkin-links/${encodeURIComponent(code)}`, {
        skipAuth: true,
      });

      if (data && data.valid) {
        setLinkMeta(data);
        if (data.candidateEmail) setEmail(data.candidateEmail);
        if (data.candidateName) setName(data.candidateName);

        // Flatten questions if nested sections
        let qList: ScenarioQuestion[] = [];
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
    setStage("moodCheck");
  };

  const handleSelectOption = (optionIdx: number) => {
    playSelectSound(optionIdx);
    answersRef.current[currentIdx] = optionIdx;
    setAnswers((prev) => ({
      ...prev,
      [currentIdx]: optionIdx,
    }));

    const totalQ = questions.length > 0 ? questions.length : 32;
    const nextIdx = currentIdx + 1;

    // Checkpoint pause triggered at station checkpoints (every 8 questions) or midpoint
    const isCheckpoint = (nextIdx === 8 || nextIdx === 16 || nextIdx === 24 || nextIdx === Math.floor(totalQ / 2));
    if (isCheckpoint && nextIdx < totalQ && !showReflection) {
      setTimeout(() => {
        setShowReflection(true);
      }, 250);
    } else if (currentIdx < totalQ - 1) {
      setTimeout(() => {
        setCurrentIdx((prev) => Math.min(prev + 1, totalQ - 1));
      }, 250);
    } else {
      // Last question: Auto-submit direct check-in smoothly on selection
      setTimeout(() => {
        handleSubmitDirect();
      }, 350);
    }
  };

  const handleNext = () => {
    playStepSound();
    const totalQ = questions.length > 0 ? questions.length : 32;
    if (currentIdx < totalQ - 1) {
      setCurrentIdx((prev) => Math.min(prev + 1, totalQ - 1));
    } else {
      handleSubmitDirect();
    }
  };

  const handlePrev = () => {
    if (currentIdx > 0) {
      playStepSound();
      setCurrentIdx((prev) => Math.max(0, prev - 1));
    }
  };

  const handleSubmitDirect = async () => {
    if (submitting) return;
    setSubmitting(true);
    setSubmitError("");
    playCompletionSound();

    try {
      const mergedAnswers = { ...answers, ...answersRef.current };
      const formattedAnswers = Object.entries(mergedAnswers).map(([idxStr, val]) => ({
        questionIndex: parseInt(idxStr, 10),
        selectedOption: Number(val),
        value: Number(val) + 1,
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
        setStage("reflection");
      }
    } catch (err: any) {
      console.error("Submission failed:", err);
      setSubmitError(err?.response?.data?.message || err?.message || "Submission failed. Please check your connection.");
    } finally {
      setSubmitting(false);
    }
  };

  const totalCount = questions.length > 0 ? questions.length : 32;
  const safeIdx = Math.min(Math.max(0, currentIdx), Math.max(0, questions.length - 1));
  const currentQ = questions[safeIdx];

  // 1. LOADING SCREEN
  if (stage === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-sm text-muted-foreground">
        Loading check-in session...
      </div>
    );
  }

  // 2. ERROR SCREEN
  if (stage === "error") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 text-center">
        <AlertCircle className="h-10 w-10 text-amber-500 mb-3" />
        <h2 className="text-xl font-bold text-foreground mb-1">{errorDetails.title}</h2>
        <p className="text-xs text-muted-foreground max-w-sm mb-5 leading-relaxed">{errorDetails.message}</p>
        <Button onClick={() => router.push("/")} variant="outline" size="sm">
          Return Home
        </Button>
      </div>
    );
  }

  return (
    <div
      className="h-screen max-h-screen overflow-hidden flex flex-col justify-between relative selection:bg-teal-500/20 transition-colors duration-500 dark:bg-[#0B0F17]"
      style={{ backgroundColor: theme.bgPage || "#FAF8F5" }}
    >
      {/* Top Header Bar */}
      <div className="shrink-0 z-40 px-5 sm:px-7 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2 select-none">
          <img
            src="/DarkColorLogo.svg"
            alt="JaagrMind"
            className="h-8 sm:h-9 w-auto object-contain dark:hidden"
          />
          <img
            src="/LightColorLogo.svg"
            alt="JaagrMind"
            className="h-8 sm:h-9 w-auto object-contain hidden dark:block"
          />
          <span className="text-xs font-semibold text-muted-foreground/80 hidden sm:inline ml-1.5">• Candidate Check-in</span>
        </div>
        <div className="flex items-center gap-2.5 sm:gap-3 text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300">
          <button
            type="button"
            onClick={() => setIsPaused(true)}
            className="flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer select-none"
          >
            <Pause className="h-3.5 w-3.5" />
            <span>Pause Assessment</span>
          </button>
          <span className="text-slate-300 dark:text-slate-700 select-none">|</span>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer select-none"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Exit</span>
          </button>
          <span className="text-slate-300 dark:text-slate-700 select-none">|</span>
          <ThemeToggle />
        </div>
      </div>

      {/* Dynamic Animated Scenery, Mascots & Ambient Foliage (Exact preview experience) */}
      <AssessmentScenery
        themeId={currentThemeId}
        questionIndex={currentIdx}
        totalQuestions={totalCount}
        selectedAnswer={answers[currentIdx]}
        isCompleted={stage === "reflection"}
      />

      <div className="flex-1 flex flex-col items-center justify-center p-2 sm:p-4 my-auto w-full relative z-20 overflow-hidden">
        <AnimatePresence mode="wait">

          {/* STAGE 1: CANDIDATE WELCOME & INTAKE CARD */}
          {stage === "welcome" && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="w-full max-w-2xl mx-auto"
            >
              <Card data-assessment-card="true" className="border shadow-sm">
                <CardContent className="p-6 sm:p-8 space-y-5">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 flex items-center justify-center p-2 shrink-0 shadow-xs">
                      <img src="/JM-Dark.svg" alt="JaagrMind" className="h-full w-auto object-contain dark:hidden" />
                      <img src="/JM-White.svg" alt="JaagrMind" className="h-full w-auto object-contain hidden dark:block" />
                    </div>
                    <div>
                      <h1 className="text-xl font-semibold tracking-tight">
                        {linkMeta?.title || "Personal Reflection Check-in"}
                      </h1>
                      <p className="text-xs text-muted-foreground">
                        {totalCount} items • ~8-10 minutes • Confidential
                      </p>
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {linkMeta?.description ||
                      "A gentle, non-clinical reflection module designed to help you notice everyday patterns in attention, inner confidence, social interaction, and digital habits."}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-center">
                    <div className="p-3 rounded-xl bg-muted/40 border space-y-1">
                      <Compass className="h-4 w-4 text-indigo-500 mx-auto" />
                      <div className="text-xs font-semibold">Self-Discovery</div>
                      <div className="text-[11px] text-muted-foreground">Notice everyday rhythms</div>
                    </div>
                    <div className="p-3 rounded-xl bg-muted/40 border space-y-1">
                      <ShieldCheck className="h-4 w-4 text-emerald-500 mx-auto" />
                      <div className="text-xs font-semibold">100% Confidential</div>
                      <div className="text-[11px] text-muted-foreground">Safe &amp; non-judgmental</div>
                    </div>
                    <div className="p-3 rounded-xl bg-muted/40 border space-y-1">
                      <Mail className="h-4 w-4 text-sky-500 mx-auto" />
                      <div className="text-xs font-semibold">Direct Email Report</div>
                      <div className="text-[11px] text-muted-foreground">Dispatched directly to you</div>
                    </div>
                  </div>

                  <form onSubmit={handleStart} className="space-y-3 pt-1">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 text-muted-foreground" />
                          Your Name <span className="text-muted-foreground font-normal">(Optional)</span>
                        </label>
                        <Input
                          placeholder="e.g. Alex"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="h-10 text-xs bg-background"
                        />
                      </div>

                      <div className="space-y-1">
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
                      </div>
                    </div>
                    {emailError && <p className="text-xs text-destructive">{emailError}</p>}

                    <button
                      type="submit"
                      style={{
                        backgroundColor: theme.primary || "#0B4F48",
                        borderBottomColor: theme.primaryDark || "#083E38",
                      }}
                      className="w-full h-11 text-xs sm:text-sm font-bold text-white rounded-xl sm:rounded-full border-b-[5px] flex items-center justify-center gap-2 mt-2 active:translate-y-[2px] active:border-b-2 hover:brightness-105 transition-all cursor-pointer shadow-xs"
                    >
                      <span>LET’S CHECK IN →</span>
                    </button>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* STAGE 2: MIND WEATHER & ENERGY CHECK */}
          {stage === "moodCheck" && (
            <motion.div
              key="moodCheck"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="w-full max-w-xl mx-auto"
            >
              <Card data-assessment-card="true" className="border shadow-sm">
                <CardContent className="p-4 sm:p-6">
                  <MindWeatherCheck
                    value={mindWeather}
                    onChange={setMindWeather}
                    onComplete={() => setStage("countdown")}
                    onBack={() => setStage("welcome")}
                  />
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* STAGE 3: CENTERING BREATH */}
          {stage === "countdown" && (
            <motion.div
              key="countdown"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="w-full max-w-xl text-center mx-auto"
            >
              <Card data-assessment-card="true" className="border shadow-sm p-6 sm:p-8 bg-card">
                <CardContent className="p-0">
                  <CenteringBreath onComplete={() => setStage("assessment")} />
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* STAGE 4: QUESTIONS FLOW WITH IN-BETWEEN PAUSE WINDOW */}
          {stage === "assessment" && currentQ && (
            <motion.div
              key="assessment"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-2xl mx-auto space-y-2"
            >
              {/* Journey Timeline Station Bar (Matching Preview) */}
              <JourneyTimeline
                currentIdx={currentIdx}
                totalCount={totalCount}
                currentPhase={currentQ.phase}
              />

              {/* In-Between Pause Reflection Window */}
              {showReflection ? (
                <ReflectionSnack
                  title={`Checkpoint • Station ${Math.min(4, Math.floor((currentIdx / totalCount) * 4) + 1)}`}
                  onContinue={() => {
                    setShowReflection(false);
                    if (currentIdx < totalCount - 1) {
                      setCurrentIdx((prev) => prev + 1);
                    }
                  }}
                />
              ) : (
                <ScenarioCard
                  question={currentQ}
                  questionIndex={currentIdx}
                  totalQuestions={totalCount}
                  selectedIndex={answers[currentIdx]}
                  onSelectOption={handleSelectOption}
                  onNext={handleNext}
                  onPrev={handlePrev}
                  isLastQuestion={currentIdx === totalCount - 1}
                  isSubmitting={submitting}
                  errorMessage={submitError}
                />
              )}
            </motion.div>
          )}

          {/* STAGE 5: CELEBRATORY THANK YOU & REFLECTION REPORT */}
          {stage === "reflection" && reflection && (
            <motion.div
              key="reflection"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-2xl lg:max-w-3xl mx-auto space-y-4"
            >
              <Card className="border shadow-sm overflow-hidden bg-card">
                <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-sky-500/10 p-6 sm:p-8 text-center space-y-2 border-b">
                  <div className="h-14 w-14 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-1 ring-8 ring-emerald-500/5">
                    <CheckCircle2 className="h-7 w-7" />
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight text-foreground">
                    Thank You, {name || "Friend"}!
                  </h1>
                  <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
                    You have successfully completed your check-in. A complete copy has been dispatched to{" "}
                    <strong className="text-foreground font-semibold">{email}</strong>.
                  </p>
                </div>

                <CardContent className="p-6 sm:p-8 space-y-5">
                  {/* Non-clinical notice */}
                  <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/20 text-xs text-sky-950 dark:text-sky-200 flex items-start gap-2">
                    <ShieldCheck className="h-4 w-4 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
                    <span>
                      This reflection is non-clinical and designed to celebrate self-awareness and healthy rhythms.
                    </span>
                  </div>

                  {/* Pattern snapshot */}
                  <div className="p-4 rounded-xl bg-muted/40 border space-y-1.5">
                    <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-primary">
                      What You Might Notice
                    </span>
                    <p className="text-sm font-semibold text-foreground">
                      {reflection.pattern}
                    </p>
                    {reflection.context && (
                      <p className="text-xs text-muted-foreground leading-relaxed pt-1 border-t border-border/40">
                        {reflection.context}
                      </p>
                    )}
                  </div>

                  {/* Recommended Micro-Practice */}
                  {recommendedActivity && (
                    <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-primary">
                          Recommended Practice: {recommendedActivity.title || recommendedActivity.activity_name}
                        </span>
                        <span className="text-[11px] font-mono text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {recommendedActivity.duration_minutes || 2} mins
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {recommendedActivity.description}
                      </p>
                      <div className="p-2.5 rounded-lg bg-background border text-xs text-foreground font-medium flex items-center gap-2">
                        <Lightbulb className="h-4 w-4 text-amber-500 shrink-0" />
                        <span>{recommendedActivity.instruction}</span>
                      </div>
                    </div>
                  )}

                  <div className="pt-2 flex justify-center">
                    <Button onClick={() => router.push("/")} className="px-8 h-10 text-xs font-semibold cursor-pointer">
                      Return to JaagrMind
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* Mindful Pause Modal */}
      <AnimatePresence>
        {isPaused && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 text-center space-y-5"
            >
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center">
                <Pause className="h-7 w-7" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                  Assessment Paused
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Take a moment to relax your eyes, stretch, and take a gentle breath. Your answers are completely safe.
                </p>
              </div>
              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => router.push("/")}
                  className="flex-1 rounded-xl sm:rounded-full h-11 border-2 border-slate-300 dark:border-slate-700 border-b-[4px] border-b-slate-400 dark:border-b-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 font-bold text-sm active:translate-y-[2px] active:border-b-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer shadow-xs"
                >
                  Exit Assessment
                </button>
                <button
                  type="button"
                  onClick={() => setIsPaused(false)}
                  style={{
                    backgroundColor: theme.primary || "#0B4F48",
                    borderBottomColor: theme.primaryDark || "#083E38",
                  }}
                  className="flex-1 rounded-xl sm:rounded-full h-11 border-b-[5px] text-white font-bold text-sm active:translate-y-[2px] active:border-b-2 hover:brightness-105 transition-all cursor-pointer shadow-xs"
                >
                  Resume Assessment
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
