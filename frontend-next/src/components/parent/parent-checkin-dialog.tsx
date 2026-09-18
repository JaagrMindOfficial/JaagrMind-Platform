"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  CheckCircle2,
  Clock,
  ArrowRight,
  ArrowLeft,
  Heart,
  Smile,
  ShieldCheck,
  Award,
  Loader2,
  Play,
} from "lucide-react";
import { playCompletionSound, playSelectSound } from "@/lib/assessment-sound";
import type { StudentGradeCheckin } from "./parent-standard-checkins";

interface QuestionOption {
  label: string;
  marks: number;
}

interface AssessmentQuestion {
  id?: string;
  question: string;
  section?: string;
  sectionName?: string;
  options: QuestionOption[];
}

interface ParentCheckinDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  checkin: StudentGradeCheckin | null;
  studentId: string;
  childName: string;
  preferredName: string;
  grade: string;
  onSuccess: () => void;
}

export function ParentCheckinDialog({
  open,
  onOpenChange,
  checkin,
  studentId,
  childName,
  preferredName,
  grade,
  onSuccess,
}: ParentCheckinDialogProps) {
  const [step, setStep] = useState<"readyCheck" | "inProgress" | "completed">("readyCheck");
  const [questions, setQuestions] = useState<AssessmentQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<{ [key: number]: number }>({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number; assigned_bucket: string; message: string } | null>(null);
  const [startTime, setStartTime] = useState<number>(Date.now());

  // Reset state when dialog opens with a new checkin
  useEffect(() => {
    if (open && checkin) {
      setStep("readyCheck");
      setCurrentIdx(0);
      setAnswers({});
      setResult(null);
      setStartTime(Date.now());
      loadAssessmentQuestions(checkin.id);
    }
  }, [open, checkin]);

  const loadAssessmentQuestions = async (assessmentId: string) => {
    setLoading(true);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
      const res = await fetch(`${apiBase}/api/preview/assessment/${assessmentId}`);
      if (res.ok) {
        const data = await res.json();
        let qList: AssessmentQuestion[] = [];
        if (Array.isArray(data.questions) && data.questions.length > 0) {
          qList = data.questions;
        } else if (Array.isArray(data.sections) && data.sections.length > 0) {
          for (const sec of data.sections) {
            if (Array.isArray(sec.questions)) {
              for (const q of sec.questions) {
                qList.push({
                  ...q,
                  sectionName: sec.title || "Curriculum Focus",
                  options: q.options || [
                    { label: "Never / Not true for me", marks: 1 },
                    { label: "Sometimes true", marks: 2 },
                    { label: "Often true", marks: 3 },
                    { label: "Almost always true", marks: 4 },
                  ],
                });
              }
            }
          }
        }
        if (qList.length === 0) {
          qList = generateDefaultQuestions(checkin?.title || "Daily Check-in");
        }
        setQuestions(qList);
      } else {
        setQuestions(generateDefaultQuestions(checkin?.title || "Daily Check-in"));
      }
    } catch {
      setQuestions(generateDefaultQuestions(checkin?.title || "Daily Check-in"));
    } finally {
      setLoading(false);
    }
  };

  const generateDefaultQuestions = (title: string): AssessmentQuestion[] => [
    {
      question: "I find it easy to focus on my school work and study projects when needed.",
      section: "A",
      sectionName: "Focus & Learning",
      options: [
        { label: "Never / Not true for me", marks: 1 },
        { label: "Sometimes true", marks: 2 },
        { label: "Often true", marks: 3 },
        { label: "Almost always true", marks: 4 },
      ],
    },
    {
      question: "When I face a difficult concept or homework challenge, I feel confident asking for help or trying again.",
      section: "B",
      sectionName: "Resilience & Confidence",
      options: [
        { label: "Rarely", marks: 1 },
        { label: "Sometimes", marks: 2 },
        { label: "Usually", marks: 3 },
        { label: "Always", marks: 4 },
      ],
    },
    {
      question: "I have been getting restful sleep and waking up with enough energy for the school day.",
      section: "C",
      sectionName: "Daily Rest & Vitality",
      options: [
        { label: "Rarely true", marks: 1 },
        { label: "Some days", marks: 2 },
        { label: "Most days", marks: 3 },
        { label: "Consistently true", marks: 4 },
      ],
    },
    {
      question: "I feel connected, respected, and happy with my friends and classmates.",
      section: "D",
      sectionName: "Social Connectedness",
      options: [
        { label: "Seldom", marks: 1 },
        { label: "Sometimes", marks: 2 },
        { label: "Often", marks: 3 },
        { label: "Almost always", marks: 4 },
      ],
    },
  ];

  const handleSelectOption = (optionIndex: number, marks: number) => {
    playSelectSound(optionIndex);
    setAnswers((prev) => ({
      ...prev,
      [currentIdx]: optionIndex,
    }));
  };

  const handleNext = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIdx > 0) {
      setCurrentIdx((prev) => prev - 1);
    }
  };

  const handleSubmit = async () => {
    if (!checkin) return;
    setSubmitting(true);

    try {
      const token = localStorage.getItem("token");
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
      const timeTakenSec = Math.round((Date.now() - startTime) / 1000);

      const formattedAnswers = Object.entries(answers).map(([qIdx, optIdx]) => ({
        questionIndex: parseInt(qIdx, 10),
        selectedOption: optIdx,
        value: (optIdx + 1) * 1,
      }));

      const res = await fetch(`${apiBase}/api/parent/student-checkin/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          student_id: studentId,
          assessment_id: checkin.id,
          answers: formattedAnswers,
          time_taken: timeTakenSec,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setResult({
          score: data.score,
          assigned_bucket: data.assigned_bucket,
          message: data.message,
        });
        playCompletionSound();
        setStep("completed");
      } else {
        alert(data.error || "Failed to record check-in results.");
      }
    } catch (err) {
      console.error("Submit error:", err);
      alert("Network error submitting check-in. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!checkin) return null;

  const currentQ = questions[currentIdx];
  const progressPercent = questions.length > 0 ? Math.round(((currentIdx + 1) / questions.length) * 100) : 0;
  const isAnswered = answers[currentIdx] !== undefined;

  const isRetake = checkin.status === "completed" || ((checkin.attempts_count || 0) > 0);
  const nextAttemptNum = (checkin.attempts_count || (checkin.status === "completed" ? 1 : 0)) + 1;

  const handleDialogChange = (newOpen: boolean) => {
    if (!newOpen && step === "completed") {
      onSuccess();
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent className="sm:max-w-xl clay-card p-6 overflow-hidden">
        {/* STEP 1: READY CHECK (Get Set Ready!) */}
        {step === "readyCheck" && (
          <div className="space-y-6">
            <DialogHeader className="space-y-2 text-center sm:text-left">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 text-[10px] font-mono">
                  CLASS {grade} CURRICULUM
                </Badge>
                {isRetake ? (
                  <Badge className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 text-[10px] font-mono font-bold">
                    RETAKE • ATTEMPT #{nextAttemptNum}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] font-mono text-muted-foreground">
                    FIRST ATTEMPT
                  </Badge>
                )}
                <Badge variant="outline" className="text-[10px] font-mono text-muted-foreground">
                  ~{checkin.total_time} mins • {questions.length || checkin.question_count} questions
                </Badge>
              </div>
              <DialogTitle className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
                <Sparkles className={`h-6 w-6 ${isRetake ? "text-purple-500" : "text-amber-500"} shrink-0`} />
                <span>{isRetake ? `Retake Check-in with ${preferredName}` : `Get Set Ready for ${preferredName}!`}</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Official check-in: <strong className="text-foreground">{checkin.title}</strong>
              </DialogDescription>
            </DialogHeader>

            {/* Prompt Question */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-sky-500/10 via-indigo-500/5 to-transparent border border-sky-500/20 space-y-2">
              <div className="text-sm font-bold text-sky-700 dark:text-sky-300 flex items-center gap-2">
                <Smile className="h-4 w-4 text-sky-500 shrink-0" />
                <span>Is {preferredName} ready now?</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {isRetake
                  ? `Starting a new check-in for ${preferredName}. All previous scores (last: ${checkin.score}%) and dates remain permanently preserved in their growth history to calibrate their improvement radar.`
                  : `Before starting, take 30 seconds to set up a calm, comfortable environment together.`}
              </p>
            </div>

            {/* Supportive Guidance List */}
            <div className="space-y-2.5 text-xs text-muted-foreground">
              <div className="flex items-start gap-3 p-2.5 rounded-xl neo-well border border-border/50">
                <div className="h-6 w-6 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Heart className="h-3.5 w-3.5" />
                </div>
                <div>
                  <span className="font-semibold text-foreground block">Zero-Pressure Atmosphere</span>
                  <span>Remind {preferredName} that this isn&apos;t a test or exam. There are no right or wrong answers—only their honest thoughts.</span>
                </div>
              </div>

              <div className="flex items-start gap-3 p-2.5 rounded-xl neo-well border border-border/50">
                <div className="h-6 w-6 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Clock className="h-3.5 w-3.5" />
                </div>
                <div>
                  <span className="font-semibold text-foreground block">Short & Unhurried (~15 mins)</span>
                  <span>Take as much time as needed. If {preferredName} feels tired, you can pause or resume anytime.</span>
                </div>
              </div>

              <div className="flex items-start gap-3 p-2.5 rounded-xl neo-well border border-border/50">
                <div className="h-6 w-6 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                  <ShieldCheck className="h-3.5 w-3.5" />
                </div>
                <div>
                  <span className="font-semibold text-foreground block">Hand Off or Sit Together</span>
                  <span>You can read the questions aloud together, or hand the phone/tablet to {preferredName} when ready.</span>
                </div>
              </div>
            </div>

            <DialogFooter className="pt-2 flex flex-col sm:flex-row gap-2 border-t border-border/40">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="w-full sm:w-auto text-xs"
              >
                Not Right Now
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setStartTime(Date.now());
                  setStep("inProgress");
                }}
                disabled={loading}
                className="w-full sm:w-auto text-xs bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-semibold gap-2 shadow-sm"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Preparing...</span>
                  </>
                ) : (
                  <>
                    <Play className="h-3.5 w-3.5 fill-current" />
                    <span>{isRetake ? `Begin Retake (Attempt #${nextAttemptNum})` : `Yes, ${preferredName} is Ready! (Begin Now)`}</span>
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* STEP 2: IN PROGRESS (Question Runner) */}
        {step === "inProgress" && currentQ && (
          <div className="space-y-5">
            {/* Header with Progress */}
            <div className="space-y-2 border-b border-border/40 pb-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono text-muted-foreground uppercase text-[10px] tracking-wider">
                  Check-in with {preferredName}
                </span>
                <span className="font-mono font-bold text-sky-600 dark:text-sky-400">
                  Question {currentIdx + 1} of {questions.length} ({progressPercent}%)
                </span>
              </div>
              <div className="w-full bg-secondary/50 rounded-full h-1.5 overflow-hidden neo-well">
                <div
                  className="bg-gradient-to-r from-sky-500 to-indigo-500 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Question Card */}
            <div className="space-y-3">
              {currentQ.sectionName && (
                <span className="text-[10px] font-mono uppercase font-bold text-sky-600 dark:text-sky-400 tracking-wider">
                  {currentQ.sectionName}
                </span>
              )}
              <h3 className="text-base font-bold text-foreground leading-snug">
                {currentQ.question}
              </h3>
            </div>

            {/* Options List */}
            <div className="space-y-2 pt-1">
              {currentQ.options?.map((opt, oIdx) => {
                const isSelected = answers[currentIdx] === oIdx;
                return (
                  <button
                    key={oIdx}
                    type="button"
                    onClick={() => handleSelectOption(oIdx, opt.marks)}
                    className={`w-full text-left p-3.5 rounded-xl border text-xs transition-all flex items-center justify-between gap-3 ${
                      isSelected
                        ? "bg-sky-500/10 border-sky-500 text-sky-900 dark:text-sky-200 font-semibold shadow-xs"
                        : "bg-secondary/30 hover:bg-secondary/60 border-border/60 text-foreground"
                    }`}
                  >
                    <span>{opt.label}</span>
                    <div
                      className={`h-4 w-4 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                        isSelected
                          ? "border-sky-500 bg-sky-500 text-white"
                          : "border-muted-foreground/30"
                      }`}
                    >
                      {isSelected && <CheckCircle2 className="h-3 w-3" />}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Footer Navigation */}
            <div className="flex items-center justify-between pt-3 border-t border-border/40">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrev}
                disabled={currentIdx === 0}
                className="text-xs gap-1.5"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Previous</span>
              </Button>

              {currentIdx < questions.length - 1 ? (
                <Button
                  size="sm"
                  onClick={handleNext}
                  disabled={!isAnswered}
                  className="text-xs bg-sky-600 hover:bg-sky-700 text-white gap-1.5"
                >
                  <span>Next</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={handleSubmit}
                  disabled={!isAnswered || submitting}
                  className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 font-bold"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Recording...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Submit Check-in</span>
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        )}

        {/* STEP 3: COMPLETED (Celebratory Result) */}
        {step === "completed" && result && (
          <div className="text-center py-4 space-y-6">
            <div className="h-16 w-16 rounded-full bg-emerald-500/10 text-emerald-500 mx-auto flex items-center justify-center border border-emerald-500/30">
              <Award className="h-8 w-8 animate-bounce" />
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                CHECK-IN RECORDED
              </span>
              <h2 className="text-2xl font-black text-foreground">
                Awesome Job, {preferredName}!
              </h2>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                {result.message}
              </p>
            </div>

            {/* Score & Bucket Badge */}
            <div className="p-4 rounded-2xl neo-well border border-emerald-500/20 bg-emerald-500/5 max-w-xs mx-auto space-y-1">
              <div className="text-[10px] font-mono text-muted-foreground uppercase">
                Wellbeing Index Score
              </div>
              <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
                {result.score}%
              </div>
              <Badge className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-none text-[11px] font-semibold mt-1">
                {result.assigned_bucket}
              </Badge>
            </div>

            <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
              Your response has been certified. Your parent dashboard metrics have been updated in real-time.
            </p>

            <Button
              size="sm"
              onClick={() => {
                onOpenChange(false);
                onSuccess();
              }}
              className="w-full text-xs bg-sky-600 hover:bg-sky-700 text-white font-bold h-9"
            >
              Back to Parent Dashboard
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
