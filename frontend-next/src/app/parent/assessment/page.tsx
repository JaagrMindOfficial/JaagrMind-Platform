"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/context/auth-context";
import { api } from "@/lib/api";
import {
  BookOpen,
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  Trophy,
  Loader2,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import { MindWeatherCheck, type MindWeatherState } from "@/components/assessment/mind-weather-check";
import { CenteringBreath } from "@/components/assessment/centering-breath";
import { JourneyTimeline } from "@/components/assessment/journey-timeline";
import { ScenarioCard } from "@/components/assessment/scenario-card";
import { ReflectionSnack } from "@/components/assessment/reflection-snack";
import { playCompletionSound } from "@/lib/assessment-sound";

function ParentAssessmentRunner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();

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

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<{
    score: number;
    assigned_bucket: string;
    message: string;
  } | null>(null);
  const [countdownSeconds, setCountdownSeconds] = useState(4);

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
    setAnswers((prev) => ({ ...prev, [currentIdx]: optionIdx }));

    // Midway reflection break
    const midpoint = Math.floor(questionsList.length / 2);
    if (currentIdx + 1 === midpoint && currentIdx + 1 < questionsList.length && !showReflection) {
      setShowReflection(true);
    } else if (currentIdx < questionsList.length - 1) {
      setTimeout(() => {
        setCurrentIdx((prev) => prev + 1);
      }, 250);
    }
  };

  const handleNext = () => {
    if (currentIdx < questionsList.length - 1) {
      setCurrentIdx((prev) => prev + 1);
    } else {
      submitAssessment();
    }
  };

  const handlePrev = () => {
    if (currentIdx > 0) {
      setCurrentIdx((prev) => prev - 1);
    }
  };

  const submitAssessment = async () => {
    if (!selectedAssessment || submitting) return;

    setSubmitting(true);
    playCompletionSound();

    try {
      const assessmentId =
        selectedAssessment.id || selectedAssessment._id || selectedAssessment.assessmentId || testId;
      const timeTaken = Math.max(30, Math.round((Date.now() - startTime) / 1000));

      const formattedAnswers = questionsList.map((q, idx) => ({
        questionIndex: idx,
        selectedOption: answers[idx] !== undefined ? answers[idx] : 0,
        value: answers[idx] !== undefined ? answers[idx] + 1 : 1,
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
        score: res?.score ?? 85,
        assigned_bucket: res?.assigned_bucket || "Skill Stable",
        message: res?.message || "Check-in completed successfully!",
      });

      setFlowStep("completed");

      // Auto-redirect timer
      let timeLeft = 4;
      const timer = setInterval(() => {
        timeLeft -= 1;
        setCountdownSeconds(timeLeft);
        if (timeLeft <= 0) {
          clearInterval(timer);
          router.push("/parent");
        }
      }, 1000);
    } catch (err: any) {
      console.error("Submission failed", err);
      alert(err.message || "Check-in submission failed. Please try again.");
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

  const currentQ = questionsList[currentIdx];
  const displayName = child?.name || "Your Child";

  return (
    <div className="min-h-screen flex flex-col bg-background relative overflow-x-hidden selection:bg-primary/20">
      {/* Top Header Bar */}
      <div className="w-full max-w-4xl mx-auto px-4 pt-6 pb-2 flex items-center justify-between z-30">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/parent")}
          className="text-xs text-muted-foreground hover:text-foreground gap-1.5 cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Parent Dashboard</span>
        </Button>

        <div className="flex items-center gap-3">
          {child && (
            <Badge variant="outline" className="text-xs font-mono font-medium border-primary/30 bg-primary/5 text-primary">
              Student: {child.name} • Class {child.grade}
            </Badge>
          )}
          <ThemeToggle />
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 my-auto">
        <AnimatePresence mode="wait">
          {/* STEP 1: INSTRUCTIONS */}
          {flowStep === "instructions" && (
            <motion.div
              key="instructions"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="w-full max-w-xl"
            >
              <Card className="border shadow-sm">
                <CardContent className="p-8 sm:p-10 space-y-6 text-center">
                  <div className="h-16 w-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto shadow-xs">
                    <Sparkles className="h-8 w-8 text-primary" />
                  </div>

                  <div>
                    <h1 className="text-2xl font-semibold tracking-tight">
                      Standard Check-in for {displayName}
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedAssessment.title} • {questionsList.length} items
                    </p>
                  </div>

                  <p className="text-sm text-muted-foreground leading-relaxed max-w-md mx-auto">
                    This check-in gathers longitudinal observations on focus balance, emotional regulation, and daily learning stamina. Sit together with {displayName} or let them complete it with your support.
                  </p>

                  <div className="space-y-3 bg-muted/40 p-4 rounded-xl text-xs text-muted-foreground text-left border">
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

                  <label className="flex items-center justify-center gap-3 cursor-pointer pt-2">
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

                  <Button
                    size="lg"
                    disabled={!consentChecked}
                    onClick={() => setFlowStep("moodCheck")}
                    className="w-full h-11 text-sm font-medium cursor-pointer"
                  >
                    Continue to Mind Weather Check
                  </Button>
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
              className="w-full max-w-xl"
            >
              <Card className="border shadow-sm">
                <CardContent className="p-6 sm:p-9 space-y-6">
                  <MindWeatherCheck
                    value={mindWeather}
                    onChange={setMindWeather}
                  />

                  <div className="flex gap-3 pt-4 border-t">
                    <Button variant="outline" onClick={() => setFlowStep("instructions")}>
                      Back
                    </Button>
                    <Button
                      className="flex-1 shadow-sm cursor-pointer"
                      disabled={!mindWeather.weather || !mindWeather.energyLevel || !mindWeather.sleepQuality}
                      onClick={() => setFlowStep("countdown")}
                    >
                      Continue to Centering Breath
                    </Button>
                  </div>
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
              className="w-full max-w-md text-center"
            >
              <Card className="border shadow-sm p-6 sm:p-8 bg-card">
                <CardContent className="p-0">
                  <CenteringBreath onComplete={() => setFlowStep("assessment")} />
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* STEP 4: ASSESSMENT QUESTIONS */}
          {flowStep === "assessment" && currentQ && (
            <motion.div
              key="assessment"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-2xl space-y-5"
            >
              {/* Journey Timeline Station Bar */}
              <JourneyTimeline
                currentIdx={currentIdx}
                totalCount={questionsList.length}
                currentPhase={currentQ.phase}
              />

              {/* Reflection Snack or Scenario Card */}
              {showReflection ? (
                <ReflectionSnack
                  title={`Checkpoint • Station ${Math.min(4, Math.floor((currentIdx / questionsList.length) * 4) + 1)}`}
                  onContinue={() => {
                    setShowReflection(false);
                    if (currentIdx < questionsList.length - 1) {
                      setCurrentIdx((prev) => prev + 1);
                    }
                  }}
                />
              ) : (
                <ScenarioCard
                  question={currentQ}
                  questionIndex={currentIdx}
                  totalQuestions={questionsList.length}
                  selectedIndex={answers[currentIdx]}
                  onSelectOption={handleAnswerSelect}
                  onNext={handleNext}
                  onPrev={handlePrev}
                  isLastQuestion={currentIdx === questionsList.length - 1}
                />
              )}
            </motion.div>
          )}

          {/* STEP 5: COMPLETED CELEBRATION */}
          {flowStep === "completed" && submissionResult && (
            <motion.div
              key="completed"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-lg text-center"
            >
              <Card className="border border-emerald-500/30 bg-card shadow-lg overflow-hidden">
                <div className="h-2 bg-gradient-to-r from-emerald-500 via-sky-500 to-indigo-500" />
                <CardContent className="p-8 sm:p-10 space-y-6">
                  <div className="h-16 w-16 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto ring-8 ring-emerald-500/5">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>

                  <div>
                    <Badge variant="outline" className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30 mb-2">
                      Check-in Successfully Recorded
                    </Badge>
                    <h2 className="text-2xl font-bold text-foreground">
                      Great Job, {displayName}!
                    </h2>
                    <p className="text-xs text-muted-foreground mt-1">
                      {submissionResult.message}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-muted/40 border border-border/60 text-left">
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block">
                        Composite Score
                      </span>
                      <span className="text-2xl font-bold text-foreground">
                        {submissionResult.score}%
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block">
                        Assigned Pathway
                      </span>
                      <span className="text-sm font-semibold text-sky-600 dark:text-sky-400">
                        {submissionResult.assigned_bucket}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Redirecting back to Parent Dashboard in <span className="font-bold text-foreground">{countdownSeconds}s</span>...
                  </p>

                  <Button
                    size="lg"
                    onClick={() => router.push("/parent")}
                    className="w-full text-sm font-medium bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white shadow-sm cursor-pointer"
                  >
                    Return to Parent Dashboard Now
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
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
