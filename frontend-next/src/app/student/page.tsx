"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/context/auth-context";
import { api } from "@/lib/api";
import { BookOpen, LogOut, Sparkles, CheckCircle2 } from "lucide-react";
import { MindWeatherCheck, type MindWeatherState } from "@/components/assessment/mind-weather-check";
import { CenteringBreath } from "@/components/assessment/centering-breath";
import { JourneyTimeline } from "@/components/assessment/journey-timeline";
import { ScenarioCard } from "@/components/assessment/scenario-card";
import { ReflectionSnack } from "@/components/assessment/reflection-snack";
import { playCompletionSound } from "@/lib/assessment-sound";

export default function StudentAssessmentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, logout, loading: authLoading } = useAuth();
  
  // Steps: 'testSelect' | 'instructions' | 'moodCheck' | 'countdown' | 'assessment'
  const [flowStep, setFlowStep] = useState<"testSelect" | "instructions" | "moodCheck" | "countdown" | "assessment">("instructions");
  const [consentChecked, setConsentChecked] = useState(false);
  const [mindWeather, setMindWeather] = useState<MindWeatherState>({
    weather: null,
    energyLevel: null,
    sleepQuality: null,
  });

  const [tests, setTests] = useState<any[]>([]);
  const [selectedAssessment, setSelectedAssessment] = useState<any>(null);
  const [questionsList, setQuestionsList] = useState<any[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<{ [key: number]: number }>({});
  const [showReflection, setShowReflection] = useState(false);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    if (authLoading) return;
    // Redirect if not student
    if (!user || (!user.roles?.some((r) => r.role === "student") && user.role !== "student")) {
      router.push("/student/login");
      return;
    }
    fetchAssessments();
  }, [user, authLoading, router]);

  const fetchAssessments = async () => {
    try {
      setLoading(true);
      const targetTestId = searchParams.get("test") || searchParams.get("assessmentId");
      const url = targetTestId ? `/api/student/assessment?assessmentId=${targetTestId}` : "/api/student/assessment";
      const data = await api.get(url);
      const list = Array.isArray(data) ? data : data ? [data] : [];
      setTests(list);

      if (list.length > 0) {
        const pending = list.find((t: any) => !t.isCompleted);
        selectTest(pending || list[0]);
      }
    } catch (err) {
      console.error("Failed to fetch assessment", err);
    } finally {
      setLoading(false);
    }
  };

  const selectTest = (test: any) => {
    setSelectedAssessment(test);

    let qList: any[] = [];
    if (Array.isArray(test.questions) && test.questions.length > 0) {
      qList = test.questions;
    } else if (Array.isArray(test.sections) && test.sections.length > 0) {
      for (const sec of test.sections) {
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
    setFlowStep("instructions");
  };

  const handleAnswerSelect = (optionIdx: number) => {
    setAnswers((prev) => ({ ...prev, [currentIdx]: optionIdx }));

    // Trigger reflection pause at halfway point
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
    setSubmitError("");
    playCompletionSound();

    try {
      const assessmentId = selectedAssessment.assessmentId || selectedAssessment.id || selectedAssessment._id;
      
      // Format answers
      const formattedAnswers = questionsList.map((q, idx) => ({
        questionIndex: idx,
        section: q.section || "A",
        selectedOption: answers[idx] !== undefined ? answers[idx] : 0,
        value: answers[idx] !== undefined ? answers[idx] + 1 : 1,
      }));

      await api.post("/api/student/assessment/submit", {
        assessmentId,
        mood: mindWeather,
        moodCheck: mindWeather,
        answers: formattedAnswers,
        timeTaken: 600,
        consentGiven: true,
      });

      router.push("/student/thankyou");
    } catch (err: any) {
      console.error("Submission failed", err);
      setSubmitError(err?.response?.data?.message || err?.message || "Submission failed. Please check your connection and try again.");
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
        Loading check-in...
      </div>
    );
  }

  if (tests.length === 0 || !selectedAssessment) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
        <BookOpen className="h-10 w-10 text-muted-foreground/50 mb-4" />
        <h2 className="text-xl font-semibold mb-2">No Active Check-ins</h2>
        <p className="text-sm text-muted-foreground max-w-sm mb-6">
          You do not have any pending assessments right now. Please check back later or ask your school counselor.
        </p>
        <Button variant="outline" onClick={() => logout("/student/login")}>
          <LogOut className="h-4 w-4 mr-2" /> Logout
        </Button>
      </div>
    );
  }

  if (selectedAssessment?.isCompleted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-background relative selection:bg-primary/20">
        <div className="absolute top-6 right-6 z-40 flex items-center gap-2">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => logout("/student/login")}
            className="text-xs text-muted-foreground hover:text-destructive gap-1.5 h-9 px-2.5 cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Exit</span>
          </Button>
        </div>

        <div className="w-full max-w-md bg-card border rounded-2xl p-8 sm:p-10 shadow-sm space-y-6">
          <div className="h-16 w-16 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto ring-8 ring-emerald-500/5">
            <CheckCircle2 className="h-8 w-8" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="h-3.5 w-3.5" /> Check-in Completed
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {selectedAssessment.title}
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Your responses have been recorded and securely shared with your school's counseling team.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-muted/40 border text-xs text-muted-foreground space-y-1.5 text-left">
            <p className="font-semibold text-foreground">Need to retake this check-in?</p>
            <p className="leading-relaxed">
              Retakes can only be authorized and unlocked by your school counselor or administrator. Please reach out to them if you submitted by mistake or need a fresh session.
            </p>
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={() => logout("/student/login")}
          >
            <LogOut className="h-4 w-4 mr-2" /> Sign Out
          </Button>
        </div>
      </div>
    );
  }

  const currentQ = questionsList[currentIdx];
  const progressPercent = questionsList.length > 0 ? Math.round(((currentIdx + 1) / questionsList.length) * 100) : 0;
  const isAllAnswered = Object.keys(answers).length === questionsList.length;

  return (
    <div className="min-h-screen flex flex-col bg-background relative overflow-x-hidden selection:bg-primary/20">
      <div className="absolute top-6 right-6 z-40 flex items-center gap-2">
        <ThemeToggle />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => logout("/student/login")}
          className="text-xs text-muted-foreground hover:text-destructive gap-1.5 h-9 px-2.5 cursor-pointer"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span>Exit</span>
        </Button>
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
                    <h1 className="text-2xl font-semibold tracking-tight">Welcome, {user?.name}!</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedAssessment.title} • {questionsList.length} items
                    </p>
                  </div>

                  <p className="text-sm text-muted-foreground leading-relaxed max-w-md mx-auto">
                    This is a confidential space to share how you're experiencing school life. There are no right or wrong answers.
                  </p>

                  <div className="space-y-3 bg-muted/40 p-4 rounded-xl text-xs text-muted-foreground text-left border">
                    <div className="flex gap-2">
                      <span className="font-semibold text-foreground">1.</span>
                      <span>Read each statement and pick what best describes you.</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="font-semibold text-foreground">2.</span>
                      <span>Answer honestly. Your honest choices help us understand your needs.</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="font-semibold text-foreground">3.</span>
                      <span>Take your time; there is no penalty for taking pauses.</span>
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
                      I have read the instructions and give my consent to begin.
                    </span>
                  </label>

                  <Button
                    size="lg"
                    disabled={!consentChecked}
                    onClick={() => setFlowStep("moodCheck")}
                    className="w-full h-11 text-sm font-medium"
                  >
                    Continue to Mood Check
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
                      className="flex-1 shadow-sm"
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
                  isSubmitting={submitting}
                  errorMessage={submitError}
                />
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
