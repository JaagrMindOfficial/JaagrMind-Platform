"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { api } from "@/lib/api";
import { 
  Award, 
  Eye,
  X
} from "lucide-react";
import { MindWeatherCheck, type MindWeatherState } from "@/components/assessment/mind-weather-check";
import { CenteringBreath } from "@/components/assessment/centering-breath";
import { JourneyTimeline } from "@/components/assessment/journey-timeline";
import { ScenarioCard } from "@/components/assessment/scenario-card";
import { ReflectionSnack } from "@/components/assessment/reflection-snack";
import { AssessmentScenery } from "@/components/assessment/assessment-scenery";
import { useAssessmentTheme } from "@/lib/assessment-theme";
import { playCompletionSound, playSelectSound, playStepSound } from "@/lib/assessment-sound";

export default function PreviewAssessmentPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const { currentThemeId } = useAssessmentTheme();

  const [assessment, setAssessment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Flow steps: 'instructions' | 'moodCheck' | 'countdown' | 'questions' | 'completed'
  const [flowStep, setFlowStep] = useState<"instructions" | "moodCheck" | "countdown" | "questions" | "completed">("instructions");
  const [consentChecked, setConsentChecked] = useState(false);
  const [mindWeather, setMindWeather] = useState<MindWeatherState>({
    weather: null,
    energyLevel: null,
    sleepQuality: null,
  });

  // Question answering state
  const [questionsList, setQuestionsList] = useState<any[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<{ [key: number]: number }>({});
  const answersRef = useRef<{ [key: number]: number }>({});
  const [showReflection, setShowReflection] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetchAssessment();
  }, [id]);

  const fetchAssessment = async () => {
    try {
      setLoading(true);
      const data = await api.get(`/api/preview/assessment/${id}`, { skipAuth: true });
      setAssessment(data);

      // Flatten questions if needed
      let qList: any[] = [];
      if (Array.isArray(data.questions) && data.questions.length > 0) {
        qList = data.questions;
      } else if (Array.isArray(data.sections) && data.sections.length > 0) {
        for (const sec of data.sections) {
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
    } catch (err: any) {
      console.error(err);
      setError("Failed to load assessment preview.");
    } finally {
      setLoading(false);
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
      // Last question: Auto-complete preview smoothly on selection
      setTimeout(() => {
        playCompletionSound();
        setFlowStep("completed");
      }, 350);
    }
  };

  const handleNext = () => {
    playStepSound();
    const totalQ = questionsList.length > 0 ? questionsList.length : 32;
    if (currentIdx < totalQ - 1) {
      setCurrentIdx((prev) => Math.min(prev + 1, totalQ - 1));
    } else {
      playCompletionSound();
      setFlowStep("completed");
    }
  };

  const handlePrev = () => {
    if (currentIdx > 0) {
      playStepSound();
      setCurrentIdx((prev) => Math.max(0, prev - 1));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-sm text-muted-foreground">
        Loading assessment preview...
      </div>
    );
  }

  if (error || !assessment) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 text-center">
        <p className="text-destructive mb-4">{error || "Assessment not found"}</p>
        <Button onClick={() => router.back()}>Go Back</Button>
      </div>
    );
  }

  const totalCount = questionsList.length > 0 ? questionsList.length : 32;
  const safeIdx = Math.min(Math.max(0, currentIdx), Math.max(0, questionsList.length - 1));
  const currentQ = questionsList[safeIdx];
  const progressPercent = questionsList.length > 0 ? Math.round(((currentIdx + 1) / questionsList.length) * 100) : 0;
  const isAllAnswered = Object.keys(answers).length === questionsList.length;

  return (
    <div className="h-screen max-h-screen overflow-hidden flex flex-col justify-between bg-background relative selection:bg-primary/20">
      {/* Top Preview Banner */}
      <div className="shrink-0 z-40 bg-amber-500/15 border-b border-amber-500/30 backdrop-blur-md px-4 py-1.5 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-medium">
          <Eye className="h-3.5 w-3.5 shrink-0" />
          <span><strong className="font-bold">Preview Mode</strong> — Experience assessment as students see it. No responses will be saved.</span>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => router.back()}
          className="h-6 text-xs text-amber-800 hover:text-amber-950 dark:text-amber-300 dark:hover:text-amber-100 font-semibold px-2 cursor-pointer"
        >
          <X className="h-3.5 w-3.5 mr-1" /> Exit Preview
        </Button>
      </div>

      {/* Upper Left JM Brand Logo - Submerged Brand Mark */}
      <div className="absolute top-9 left-5 sm:left-7 z-40 flex items-center pointer-events-none select-none">
        <img
          src="/JM-Dark.svg"
          alt="JaagrMind"
          className="h-8 sm:h-9 w-auto object-contain dark:hidden opacity-85 transition-opacity drop-shadow-xs"
        />
        <img
          src="/JM-White.svg"
          alt="JaagrMind"
          className="h-8 sm:h-9 w-auto object-contain hidden dark:block opacity-85 transition-opacity drop-shadow-[0_2px_12px_rgba(129,97,163,0.35)]"
        />
      </div>

      <div className="absolute top-10 right-4 z-40 flex items-center gap-2">
        <ThemeToggle />
      </div>

      {/* Dynamic Animated Scenery, Mascots & Ambient Foliage */}
      <AssessmentScenery
        themeId={currentThemeId}
        questionIndex={currentIdx}
        totalQuestions={questionsList.length || 1}
        selectedAnswer={answers[currentIdx]}
        isCompleted={flowStep === "completed"}
      />

      <div className="flex-1 flex flex-col items-center justify-center p-2 sm:p-3 my-auto w-full relative z-20 overflow-hidden">
        <AnimatePresence mode="wait">
          
          {/* 1. INSTRUCTIONS */}
          {flowStep === "instructions" && (
            <motion.div
              key="instructions"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="w-full max-w-2xl lg:max-w-3xl mx-auto"
            >
              <Card id="assessment-instructions-card" className="border shadow-sm">
                <CardContent className="p-6 sm:p-8 space-y-5">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 flex items-center justify-center p-2 shrink-0 shadow-xs">
                      <img src="/JM-Dark.svg" alt="JaagrMind" className="h-full w-auto object-contain dark:hidden" />
                      <img src="/JM-White.svg" alt="JaagrMind" className="h-full w-auto object-contain hidden dark:block" />
                    </div>
                    <div>
                      <h1 className="text-xl font-semibold tracking-tight">{assessment.title}</h1>
                      <p className="text-xs text-muted-foreground">{questionsList.length} items • ~10 minutes</p>
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {assessment.description || "Take a few quiet minutes to answer honestly. There are no right or wrong choices."}
                  </p>

                  <div className="space-y-2.5 bg-muted/40 p-4 rounded-xl text-xs text-muted-foreground leading-normal border">
                    <div className="flex gap-2">
                      <span className="font-semibold text-foreground">1.</span>
                      <span>Read each statement and pick what best matches your school life.</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="font-semibold text-foreground">2.</span>
                      <span>There are no trick questions. Your honesty helps us support you best.</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="font-semibold text-foreground">3.</span>
                      <span>Your individual responses are confidential and secure.</span>
                    </div>
                  </div>

                  <label className="flex items-center gap-3 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={consentChecked}
                      onChange={(e) => setConsentChecked(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <span className="text-xs text-muted-foreground font-medium select-none">
                      I have read the instructions and am ready to proceed.
                    </span>
                  </label>

                  <Button
                    size="lg"
                    disabled={!consentChecked}
                    onClick={() => setFlowStep("moodCheck")}
                    className="w-full h-10 text-sm font-medium"
                  >
                    Continue to Mood Check
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* 2. MIND WEATHER & ENERGY CHECK */}
          {flowStep === "moodCheck" && (
            <motion.div
              key="moodCheck"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="w-full max-w-3xl lg:max-w-4xl mx-auto"
            >
              <Card className="border shadow-sm">
                <CardContent className="p-3.5 sm:p-4 space-y-3">
                  <MindWeatherCheck
                    value={mindWeather}
                    onChange={setMindWeather}
                  />

                  <div className="flex gap-3 pt-2.5 border-t">
                    <Button variant="outline" size="sm" onClick={() => setFlowStep("instructions")} className="h-9 px-4">
                      Back
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 shadow-sm h-9"
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

          {/* 3. CENTERING BREATH */}
          {flowStep === "countdown" && (
            <motion.div
              key="countdown"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="w-full max-w-md text-center mx-auto"
            >
              <Card className="border shadow-sm p-6 sm:p-8 bg-card">
                <CardContent className="p-0">
                  <CenteringBreath onComplete={() => setFlowStep("questions")} />
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* 4. QUESTIONS FLOW */}
          {flowStep === "questions" && currentQ && (
            <motion.div
              key="questions"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-2xl lg:max-w-3xl mx-auto space-y-2"
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

          {/* 5. COMPLETED SCREEN */}
          {flowStep === "completed" && (
            <motion.div
              key="completed"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-lg text-center"
            >
              <Card className="border shadow-sm p-8 sm:p-10">
                <CardContent className="space-y-6">
                  <div className="h-16 w-16 rounded-full bg-primary/10 text-primary mx-auto flex items-center justify-center">
                    <Award className="h-8 w-8" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-2xl font-semibold tracking-tight">Preview Completed!</h2>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto">
                      You have walked through all {questionsList.length} items of <strong>{assessment.title}</strong>.
                    </p>
                  </div>

                  <div className="bg-muted/40 border rounded-xl p-4 text-xs text-left space-y-2">
                    <div className="flex justify-between py-1 border-b">
                      <span className="text-muted-foreground">Items Answered:</span>
                      <span className="font-semibold">{Object.keys(answers).length} / {questionsList.length}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b">
                      <span className="text-muted-foreground">Mode:</span>
                      <span className="font-semibold text-amber-500">Preview (Sandbox)</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-muted-foreground">Status:</span>
                      <span className="font-semibold text-emerald-500">Validated</span>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setFlowStep("instructions");
                        setCurrentIdx(0);
                        setAnswers({});
                        setConsentChecked(false);
                      }}
                    >
                      Restart Preview
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={() => router.back()}
                    >
                      Exit Preview
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
