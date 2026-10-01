"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams, notFound } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/context/auth-context";
import { api } from "@/lib/api";
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Activity,
  AlertCircle,
  Pause,
  LogOut,
} from "lucide-react";
import { MindWeatherCheck, type MindWeatherState } from "@/components/assessment/mind-weather-check";
import { CenteringBreath } from "@/components/assessment/centering-breath";
import { JourneyTimeline } from "@/components/assessment/journey-timeline";
import { ScenarioCard } from "@/components/assessment/scenario-card";
import { ReflectionSnack } from "@/components/assessment/reflection-snack";
import { AssessmentScenery } from "@/components/assessment/assessment-scenery";
import { useAssessmentTheme, isValidThemeId } from "@/lib/assessment-theme";
import { playCompletionSound, playSelectSound, playStepSound } from "@/lib/assessment-sound";

function ParentAssessmentRunner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Strict theme validation: 404 if invalid/old theme parameter is provided
  const themeParam = searchParams.get("theme");
  if (themeParam && !isValidThemeId(themeParam)) {
    notFound();
  }

  const { user, loading: authLoading } = useAuth();
  const { currentThemeId, theme } = useAssessmentTheme();

  const childId = searchParams.get("childId") || "";
  const testId = searchParams.get("test") || searchParams.get("assessmentId") || "";

  // Flow steps: 'instructions' | 'moodCheck' | 'countdown' | 'assessment' | 'completed'
  const [flowStep, setFlowStep] = useState<
    "instructions" | "moodCheck" | "countdown" | "assessment" | "completed"
  >("instructions");

  const [child, setChild] = useState<{ id: string; name: string; grade: string } | null>(null);
  const [consentChecked, setConsentChecked] = useState(false);
  const [mindWeather, setMindWeather] = useState<MindWeatherState>({
    weather: null,
    energyLevel: null,
    sleepQuality: null,
  });

  const [selectedAssessment, setSelectedAssessment] = useState<any>(null);
  const [questionsList, setQuestionsList] = useState<any[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<{ [key: number]: number }>({});
  const [showReflection, setShowReflection] = useState(false);
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [isPaused, setIsPaused] = useState(false);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submissionResult, setSubmissionResult] = useState<{
    score?: number;
    assigned_bucket: string;
    message: string;
  } | null>(null);
  const answersRef = useRef<{ [key: number]: number }>({});

  // Authenticate parent
  useEffect(() => {
    if (authLoading) return;
    const isParent =
      user?.role === "parent" ||
      user?.roles?.some((r) => r.role === "parent");
    if (!user || !isParent) {
      router.push("/parent/login");
      return;
    }
    loadData();
  }, [user, authLoading, childId, testId]);

  const loadData = async () => {
    try {
      setLoading(true);

      // 1. Fetch child details
      if (childId) {
        try {
          const children = await api.get<any[]>("/api/parent/children");
          if (Array.isArray(children)) {
            const found = children.find((c) => c.id === childId);
            if (found) {
              setChild({ id: found.id, name: found.name, grade: found.grade });
            }
          }
        } catch (e) {
          console.error("Failed to load child details", e);
        }
      }

      // 2. Fetch assessment details
      const fetchUrl = testId
        ? `/api/preview/assessment/${testId}`
        : "/api/preview/assessment/default";
      const testData = await api.get<any>(fetchUrl);

      if (testData) {
        setSelectedAssessment(testData);

        let qList: any[] = [];
        if (Array.isArray(testData.questions) && testData.questions.length > 0) {
          qList = testData.questions;
        } else if (Array.isArray(testData.sections) && testData.sections.length > 0) {
          for (const sec of testData.sections) {
            if (Array.isArray(sec.questions)) {
              for (const q of sec.questions) {
                qList.push({
                  ...q,
                  sectionName: sec.title || "Section",
                  section: q.section || "A",
                  options: q.options || [
                    { label: "Not true for me", marks: 1 },
                    { label: "Sometimes true", marks: 2 },
                    { label: "Often true", marks: 3 },
                    { label: "Almost always true", marks: 4 },
                  ],
                });
              }
            }
          }
        }
        setQuestionsList(qList);
      }
    } catch (err) {
      console.error("Failed to load assessment", err);
    } finally {
      setLoading(false);
      setStartTime(Date.now());
    }
  };

  const handleAnswerSelect = (optionIdx: number) => {
    playSelectSound(optionIdx);
    answersRef.current[currentIdx] = optionIdx;
    setAnswers((prev) => ({ ...prev, [currentIdx]: optionIdx }));

    const nextIdx = currentIdx + 1;
    const totalQ = questionsList.length > 0 ? questionsList.length : 32;

    // Trigger pause at station checkpoints (every 8 questions) or midpoint
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
      // Last question: Auto-submit check-in seamlessly with keyboard or mouse selection
      setTimeout(() => {
        submitAssessment();
      }, 350);
    }
  };

  const handleNext = () => {
    playStepSound();
    const totalQ = questionsList.length > 0 ? questionsList.length : 32;
    if (currentIdx < totalQ - 1) {
      setCurrentIdx((prev) => Math.min(prev + 1, totalQ - 1));
    } else {
      submitAssessment();
    }
  };

  const handlePrev = () => {
    if (currentIdx > 0) {
      playStepSound();
      setCurrentIdx((prev) => Math.max(0, prev - 1));
    }
  };

  const submitAssessment = async () => {
    if (!selectedAssessment || submitting) return;

    setSubmitting(true);
    setSubmitError("");
    playCompletionSound();

    try {
      const assessmentId =
        selectedAssessment.id || selectedAssessment._id || selectedAssessment.assessmentId || testId || "default";
      const timeTaken = Math.max(30, Math.round((Date.now() - startTime) / 1000));

      const mergedAnswers = { ...answers, ...answersRef.current };
      const formattedAnswers = questionsList.map((q, idx) => ({
        questionIndex: idx,
        selectedOption: mergedAnswers[idx] !== undefined ? mergedAnswers[idx] : 0,
        value: mergedAnswers[idx] !== undefined ? mergedAnswers[idx] + 1 : 1,
      }));

      const res = await api.post<{
        success: boolean;
        score: number;
        assigned_bucket: string;
        message: string;
      }>("/api/parent/student-checkin/submit", {
        student_id: childId,
        assessment_id: assessmentId,
        answers: formattedAnswers,
        time_taken: timeTaken,
      });

      setSubmissionResult({
        score: res?.score,
        assigned_bucket: res?.assigned_bucket || "Skill Stable",
        message: res?.message || "Check-in completed successfully!",
      });

      setFlowStep("completed");
    } catch (err: any) {
      console.error("Submission failed", err);
      setSubmitError(err?.response?.data?.error || err?.response?.data?.message || err?.message || "Check-in submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
        <p className="text-sm font-medium text-foreground">Preparing Check-in Environment...</p>
        <p className="text-xs text-muted-foreground mt-1">
          Loading calibrated question battery for {child?.name || "student"}
        </p>
      </div>
    );
  }

  if (!selectedAssessment || questionsList.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center max-w-md mx-auto">
        <AlertCircle className="h-10 w-10 text-amber-500 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Check-in Unavailable</h2>
        <p className="text-xs text-muted-foreground mb-6 leading-relaxed">
          The requested assessment could not be loaded or has no active questions assigned for this grade standard.
        </p>
        <Button variant="outline" onClick={() => router.push("/parent")} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          <span>Return to Parent Dashboard</span>
        </Button>
      </div>
    );
  }

  const totalCount = questionsList.length > 0 ? questionsList.length : 32;
  const safeIdx = Math.min(Math.max(0, currentIdx), Math.max(0, questionsList.length - 1));
  const currentQ = questionsList[safeIdx];
  const displayName = child?.name || "Your Child";

  return (
    <div
      className="h-screen max-h-screen overflow-hidden flex flex-col justify-between relative selection:bg-teal-500/20 transition-colors duration-500 dark:bg-[#0B0F17]"
      style={{ backgroundColor: theme.bgPage || "#FAF8F5" }}
    >
      {/* Top Header Bar */}
      <div className="shrink-0 z-40 px-5 sm:px-7 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src="/DarkColorLogo.svg"
            alt="JaagrMind"
            className="h-8 sm:h-9 w-auto object-contain dark:hidden select-none"
          />
          <img
            src="/LightColorLogo.svg"
            alt="JaagrMind"
            className="h-8 sm:h-9 w-auto object-contain hidden dark:block select-none"
          />
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
            onClick={() => router.push(`/parent${childId ? `?childId=${childId}` : ""}`)}
            className="flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer select-none"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Exit</span>
          </button>
          <span className="text-slate-300 dark:text-slate-700 select-none">|</span>
          {child && (
            <Badge variant="outline" className="text-xs font-mono font-medium border-primary/30 bg-primary/5 text-primary">
              Student: {child.name} • Class {child.grade}
            </Badge>
          )}
          <ThemeToggle />
        </div>
      </div>

      {/* Dynamic Animated Scenery, Mascots & Ambient Foliage (Exact preview experience) */}
      <AssessmentScenery
        themeId={currentThemeId}
        questionIndex={currentIdx}
        totalQuestions={totalCount}
        selectedAnswer={answers[currentIdx]}
        isCompleted={flowStep === "completed"}
      />

      <div className="flex-1 flex flex-col items-center justify-center p-2 sm:p-4 my-auto w-full relative z-20 overflow-hidden">
        <AnimatePresence mode="wait">
          {/* STEP 1: INSTRUCTIONS */}
          {flowStep === "instructions" && (
            <motion.div
              key="instructions"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="w-full max-w-2xl lg:max-w-3xl mx-auto"
            >
              <Card className="border shadow-sm">
                <CardContent className="p-6 sm:p-8 space-y-5 text-center">
                  <div className="h-14 w-14 rounded-2xl bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 flex items-center justify-center mx-auto shadow-xs p-3">
                    <img src="/JM-Dark.svg" alt="JaagrMind" className="h-full w-auto object-contain dark:hidden" />
                    <img src="/JM-White.svg" alt="JaagrMind" className="h-full w-auto object-contain hidden dark:block" />
                  </div>

                  <div>
                    <h1 className="text-2xl font-semibold tracking-tight">
                      Standard Check-in for {displayName}
                    </h1>
                    <p className="text-xs text-muted-foreground mt-1">
                      {selectedAssessment.title} • {questionsList.length} items
                    </p>
                  </div>

                  <p className="text-sm text-muted-foreground leading-relaxed max-w-md mx-auto">
                    This check-in gathers longitudinal observations on focus balance, emotional regulation, and daily learning stamina. Sit together with {displayName} or let them complete it with your support.
                  </p>

                  <div className="space-y-2.5 bg-muted/40 p-4 rounded-xl text-xs text-muted-foreground text-left border">
                    <div className="flex gap-2">
                      <span className="font-semibold text-foreground">1.</span>
                      <span>Read each statement together and choose the response that best describes daily patterns.</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="font-semibold text-foreground">2.</span>
                      <span>There are no correct or incorrect choices. Honest reflection delivers the best developmental insights.</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="font-semibold text-foreground">3.</span>
                      <span>Upon completion, results immediately integrate with {displayName}&apos;s continuous growth radar.</span>
                    </div>
                  </div>

                  <label className="flex items-center justify-center gap-3 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={consentChecked}
                      onChange={(e) => setConsentChecked(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <span className="text-xs text-muted-foreground font-medium select-none">
                      I am ready to begin {displayName}&apos;s standard check-in.
                    </span>
                  </label>

                  <button
                    type="button"
                    disabled={!consentChecked}
                    onClick={() => setFlowStep("moodCheck")}
                    style={{
                      backgroundColor: theme.primary || "#0B4F48",
                      borderBottomColor: theme.primaryDark || "#083E38",
                    }}
                    className="w-full h-11 text-sm font-bold rounded-xl sm:rounded-full border-b-[5px] text-white active:translate-y-[2px] active:border-b-2 hover:brightness-105 transition-all shadow-xs disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    LET’S CHECK IN →
                  </button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* STEP 2: MIND WEATHER & ENERGY CHECK */}
          {flowStep === "moodCheck" && (
            <motion.div
              key="moodCheck"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="w-full max-w-xl mx-auto"
            >
              <Card className="border shadow-sm">
                <CardContent className="p-4 sm:p-6">
                  <MindWeatherCheck
                    value={mindWeather}
                    onChange={setMindWeather}
                    onComplete={() => setFlowStep("countdown")}
                    onBack={() => setFlowStep("instructions")}
                  />
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* STEP 3: CENTERING BREATH */}
          {flowStep === "countdown" && (
            <motion.div
              key="countdown"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="w-full max-w-xl text-center mx-auto"
            >
              <Card className="border shadow-sm p-6 sm:p-8 bg-card">
                <CardContent className="p-0">
                  <CenteringBreath onComplete={() => setFlowStep("assessment")} />
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* STEP 4: ASSESSMENT QUESTIONS (Matching Preview Layout & Width) */}
          {flowStep === "assessment" && currentQ && (
            <motion.div
              key="assessment"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-2xl lg:max-w-3xl mx-auto space-y-2"
            >
              {/* Journey Timeline Station Bar */}
              <JourneyTimeline
                currentIdx={currentIdx}
                totalCount={totalCount}
                currentPhase={currentQ.phase}
              />

              {/* In-Between Pause Reflection Window or Scenario Card */}
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
                  onSelectOption={handleAnswerSelect}
                  onNext={handleNext}
                  onPrev={handlePrev}
                  isLastQuestion={currentIdx === totalCount - 1}
                  isSubmitting={submitting}
                  errorMessage={submitError}
                />
              )}
            </motion.div>
          )}

          {/* STEP 5: CELEBRATORY THANK YOU SCREEN (Permanent, with action buttons) */}
          {flowStep === "completed" && submissionResult && (
            <motion.div
              key="completed"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-2xl lg:max-w-3xl mx-auto space-y-4"
            >
              <Card className="border shadow-sm overflow-hidden bg-card">
                <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-sky-500/10 p-6 sm:p-8 text-center space-y-2 border-b">
                  <div className="h-16 w-16 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-1 ring-8 ring-emerald-500/5">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>

                  <div>
                    <Badge variant="outline" className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30 mb-2">
                      Check-in Successfully Recorded
                    </Badge>
                    <h2 className="text-2xl font-bold text-foreground">
                      Thank You! Great Job, {displayName}!
                    </h2>
                    <p className="text-xs text-muted-foreground mt-1">
                      {submissionResult.message}
                    </p>
                  </div>
                </div>

                <CardContent className="p-6 sm:p-8 space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-muted/40 border border-border/60 text-left">
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block">
                        Check-in Status
                      </span>
                      <span className="text-sm sm:text-base font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                        Complete ({totalCount} of {totalCount} Items)
                      </span>
                      <span className="text-[11px] text-muted-foreground block">
                        Non-clinical developmental snapshot
                      </span>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block">
                        Assigned Growth Rhythm
                      </span>
                      <span className="text-sm sm:text-base font-bold text-sky-600 dark:text-sky-400">
                        {submissionResult.assigned_bucket}
                      </span>
                      <span className="text-[11px] text-muted-foreground block">
                        Tailored personal support & reflection
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground text-center">
                    Responses have been securely linked to {displayName}&apos;s continuous developmental growth radar.
                  </p>

                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <Button
                      size="lg"
                      onClick={() => router.push("/parent")}
                      className="flex-1 text-xs font-semibold cursor-pointer"
                    >
                      Return to Parent Dashboard
                    </Button>
                    {childId && (
                      <Button
                        size="lg"
                        variant="outline"
                        onClick={() => router.push(`/parent?childId=${childId}`)}
                        className="flex-1 text-xs font-semibold gap-1.5 cursor-pointer"
                      >
                        <Activity className="h-4 w-4 text-primary" />
                        <span>View Growth Radar</span>
                      </Button>
                    )}
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
                  onClick={() => router.push(`/parent${childId ? `?childId=${childId}` : ""}`)}
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

export default function ParentAssessmentPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
          Loading assessment runner...
        </div>
      }
    >
      <ParentAssessmentRunner />
    </Suspense>
  );
}
