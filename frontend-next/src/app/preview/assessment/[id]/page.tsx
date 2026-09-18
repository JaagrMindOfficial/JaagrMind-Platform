"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { api } from "@/lib/api";
import { 
  Sparkles, 
  Award, 
  Eye,
  X
} from "lucide-react";
import { MindWeatherCheck, type MindWeatherState } from "@/components/assessment/mind-weather-check";
import { CenteringBreath } from "@/components/assessment/centering-breath";
import { JourneyTimeline } from "@/components/assessment/journey-timeline";
import { ScenarioCard } from "@/components/assessment/scenario-card";
import { ReflectionSnack } from "@/components/assessment/reflection-snack";
import { playCompletionSound } from "@/lib/assessment-sound";

export default function PreviewAssessmentPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

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
    setAnswers((prev) => ({ ...prev, [currentIdx]: optionIdx }));

    // Check if reflection is triggered at the halfway mark
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
      playCompletionSound();
      setFlowStep("completed");
    }
  };

  const handlePrev = () => {
    if (currentIdx > 0) {
      setCurrentIdx((prev) => prev - 1);
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

  const currentQ = questionsList[currentIdx];
  const progressPercent = questionsList.length > 0 ? Math.round(((currentIdx + 1) / questionsList.length) * 100) : 0;
  const isAllAnswered = Object.keys(answers).length === questionsList.length;

  return (
    <div className="min-h-screen flex flex-col bg-background relative overflow-x-hidden selection:bg-primary/20">
      {/* Top Preview Banner */}
      <div className="sticky top-0 z-50 bg-amber-500/10 border-b border-amber-500/20 backdrop-blur-md px-4 py-2 flex items-center justify-between text-xs sm:text-sm">
        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-medium">
          <Eye className="h-4 w-4" />
          <span><strong>Preview Mode</strong> — Experience assessment as students see it. No responses will be saved.</span>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => router.back()}
          className="h-7 text-xs text-amber-600 hover:text-amber-700 dark:text-amber-400"
        >
          <X className="h-3.5 w-3.5 mr-1" /> Exit Preview
        </Button>
      </div>

      <div className="absolute top-12 right-6 z-40">
        <ThemeToggle />
      </div>

      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 my-auto">
        <AnimatePresence mode="wait">
          
          {/* 1. INSTRUCTIONS */}
          {flowStep === "instructions" && (
            <motion.div
              key="instructions"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="w-full max-w-xl"
            >
              <Card className="border shadow-sm">
                <CardContent className="p-8 sm:p-10 space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <div>
                      <h1 className="text-xl font-semibold tracking-tight">{assessment.title}</h1>
                      <p className="text-xs text-muted-foreground">{questionsList.length} items • ~10 minutes</p>
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {assessment.description || "Take a few quiet minutes to answer honestly. There are no right or wrong choices."}
                  </p>

                  <div className="space-y-3 bg-muted/40 p-4 rounded-xl text-xs text-muted-foreground leading-normal border">
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

                  <label className="flex items-center gap-3 cursor-pointer pt-2">
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
                    className="w-full h-11"
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

          {/* 3. CENTERING BREATH */}
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
