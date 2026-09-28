"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { 
  LayoutGrid, 
  Compass, 
  Play, 
  ArrowRight, 
  CheckCircle2, 
  LogOut, 
  BookOpen, 
  Heart, 
  Brain, 
  Smartphone, 
  Smile,
  ShieldCheck,
  RotateCcw
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { api } from "@/lib/api";

interface ActivityItem {
  id: string;
  name: string;
  title: string;
  bucket: string;
  instruction: string;
  description: string;
  duration_minutes: number;
}

interface StudentData {
  id: string;
  name: string;
  grade?: string;
  section?: string;
  access_id?: string;
  school_id?: string;
}

export default function StudentDashboardPage() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<StudentData | null>(null);
  const [hasCompleted, setHasCompleted] = useState(false);
  const [latestResult, setLatestResult] = useState<any>(null);
  const [reflection, setReflection] = useState<any>(null);
  const [recommendedActivity, setRecommendedActivity] = useState<any>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [selectedBucketFilter, setSelectedBucketFilter] = useState<string>("ALL");
  const [activePracticeModal, setActivePracticeModal] = useState<ActivityItem | null>(null);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const data = await api.get("/api/student/dashboard");
      if (data) {
        setStudent(data.student);
        setHasCompleted(data.has_completed);
        setLatestResult(data.latest_result);
        setActivities(data.activities || []);

        // Extract reflection from behavioral diagnostics or compute fallback
        const diag = data.latest_result?.behavioral_diagnostics;
        if (diag && diag.reflection) {
          setReflection(diag.reflection);
          setRecommendedActivity(diag.recommendedActivity);
        } else if (data.has_completed) {
          setReflection({
            opening: "Here’s something you might notice about yourself.",
            pattern: `Your answers suggest that ${data.latest_result?.primary_skill_area || "Attention Flow"} may be easier for you in some situations than others.`,
            context: "You may notice this more when working through busy periods, while it feels different during quiet routines.",
            skill_invitation: "This could be a useful skill to explore. You don’t need to be good at it already.",
            selected_skill: data.latest_result?.primary_skill_area || "Attention Flow",
            choice: "You can try it now, explore another activity, or come back later.",
            closing: "There’s nothing to fix here. This is simply a chance to notice what works for you and try something new.",
          });
        }
      }
    } catch (err) {
      console.error("Failed to load student dashboard", err);
    } finally {
      setLoading(false);
    }
  };

  const bucketTabs = [
    { key: "ALL", label: "All Activities", icon: LayoutGrid },
    { key: "ATTN_STABILITY", label: "Focus & Attention", icon: Brain },
    { key: "LOAD_REGULATION", label: "Calm & Reset", icon: Smile },
    { key: "SELF_SAFETY", label: "Inner Grounding", icon: Heart },
    { key: "SOCIAL_COMFORT", label: "Social Ease", icon: BookOpen },
  ];

  const filteredActivities = activities.filter((act) => {
    if (selectedBucketFilter === "ALL") return true;
    return act.bucket === selectedBucketFilter;
  });

  return (
    <div className="min-h-screen bg-slate-50/70 dark:bg-slate-950 flex flex-col justify-between">
      {/* Top Navbar */}
      <header className="border-b bg-card/80 backdrop-blur sticky top-0 z-30 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg shadow-sm">
            J
          </div>
          <div>
            <div className="font-semibold text-base leading-tight">Jaagr Mind</div>
            <div className="text-xs text-muted-foreground">Student Reflection & Practice Desk</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => logout("/student/login")}
            className="text-xs gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-3.5 w-3.5" /> Sign Out
          </Button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-8 space-y-8">
        {/* Welcome Greeting */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-sky-500/10 via-indigo-500/10 to-teal-500/10 p-6 sm:p-8 rounded-2xl border shadow-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-background/80 text-primary border-primary/20 text-xs">
                {student?.grade ? `Class ${student.grade} ${student.section || ""}` : "Student Portal"}
              </Badge>
              {student?.access_id && (
                <span className="text-xs text-muted-foreground">ID: {student.access_id}</span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Hello, {student?.name || "Student"}!
            </h1>
            <p className="text-sm text-muted-foreground max-w-xl">
              Welcome to your personal reflection sanctuary. Notice what works for you and explore quick 2-minute practices at your own rhythm.
            </p>
          </div>

          <div>
            <Button 
              size="lg"
              className="gap-2 shadow-md w-full sm:w-auto"
              onClick={() => router.push("/student")}
            >
              <RotateCcw className="h-4 w-4" /> 
              {hasCompleted ? "Retake Check-in" : "Start 32-Item Check-in"}
            </Button>
          </div>
        </div>

        {/* SECTION 1: 5-STEP REFLECTION (IF COMPLETED) */}
        {hasCompleted && reflection && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <Compass className="h-5 w-5 text-primary" /> Your Reflection Snapshot
              </h2>
              <Badge variant="secondary" className="text-xs">
                Non-Clinical Observation
              </Badge>
            </div>

            <Card className="border shadow-md rounded-2xl overflow-hidden">
              <CardContent className="p-6 sm:p-8 space-y-6">
                {/* Notice & Context */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-5 rounded-xl bg-card border shadow-sm space-y-2">
                    <div className="text-xs uppercase font-bold text-sky-600 tracking-wider">
                      What I Notice
                    </div>
                    <p className="text-base font-medium text-foreground leading-relaxed">
                      {reflection.pattern}
                    </p>
                  </div>

                  <div className="p-5 rounded-xl bg-muted/40 border space-y-2">
                    <div className="text-xs uppercase font-bold text-indigo-600 tracking-wider">
                      When It Shows Up
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {reflection.context}
                    </p>
                  </div>
                </div>

                {/* Skill to Explore & Recommended 2-Minute Practice */}
                <div className="p-6 rounded-2xl bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-950/30 dark:to-emerald-950/30 border border-teal-200 dark:border-teal-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                  <div className="space-y-1 max-w-lg">
                    <div className="text-xs uppercase font-bold text-teal-700 dark:text-teal-300 tracking-wider">
                      Skill to Explore
                    </div>
                    <h3 className="text-xl font-bold text-foreground">
                      {reflection.selected_skill}
                    </h3>
                    <p className="text-xs sm:text-sm text-teal-900/80 dark:text-teal-200/80">
                      {reflection.skill_invitation}
                    </p>
                  </div>

                  {recommendedActivity && (
                    <Button 
                      size="lg"
                      className="gap-2 shadow-sm shrink-0"
                      onClick={() => setActivePracticeModal(recommendedActivity)}
                    >
                      <Play className="h-4 w-4" /> Try {recommendedActivity.title} (2 Min)
                    </Button>
                  )}
                </div>

                <div className="p-3 bg-muted/20 border rounded-xl text-center text-xs text-muted-foreground italic">
                  "{reflection.closing}"
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* SECTION 2: 24 MICRO-PRACTICES SANCTUARY */}
        <div className="space-y-6 pt-4">
          <div className="space-y-1">
            <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Compass className="h-5 w-5 text-emerald-600 dark:text-emerald-400" /> Jaagr Mind Practice Sanctuary
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Optional 2-minute micro-practices to explore whenever you feel like it. No timer pressure, streaks, or scores.
            </p>
          </div>

          {/* Filter Tabs */}
          <div className="flex flex-wrap gap-2 border-b pb-3">
            {bucketTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = selectedBucketFilter === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setSelectedBucketFilter(tab.key)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition-all ${
                    isActive 
                      ? "bg-primary text-primary-foreground shadow-sm" 
                      : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Activity Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredActivities.map((act) => (
              <Card 
                key={act.id} 
                className="border hover:border-primary/40 hover:shadow-md transition-all rounded-xl p-5 flex flex-col justify-between space-y-4 bg-card"
              >
                <div className="space-y-2">
                  <div className="flex justify-between items-start">
                    <Badge variant="outline" className="text-[10px] uppercase font-semibold">
                      {act.bucket.replace("_", " ")}
                    </Badge>
                    <span className="text-[11px] text-muted-foreground">
                      {act.duration_minutes} min
                    </span>
                  </div>
                  <h4 className="text-base font-bold text-foreground">{act.title}</h4>
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {act.description}
                  </p>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-2 text-xs"
                  onClick={() => setActivePracticeModal(act)}
                >
                  <Play className="h-3.5 w-3.5" /> Open Practice
                </Button>
              </Card>
            ))}
          </div>
        </div>
      </main>

      {/* Interactive Micro-Practice Modal */}
      {activePracticeModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-card border rounded-2xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl relative"
          >
            <div className="space-y-2">
              <Badge variant="outline" className="text-xs">2-Minute Calm Practice</Badge>
              <h3 className="text-2xl font-bold text-foreground">{activePracticeModal.title}</h3>
              <p className="text-sm text-muted-foreground">{activePracticeModal.description}</p>
            </div>

            <div className="p-6 rounded-2xl bg-primary/5 border border-primary/20 text-center space-y-4">
              <div className="h-16 w-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <Compass className="h-8 w-8 text-primary" />
              </div>
              <p className="text-base font-medium text-foreground leading-relaxed">
                "{activePracticeModal.instruction}"
              </p>
              <p className="text-xs text-muted-foreground">
                Move gently at an easy, natural pace. You can pause or stop whenever you are ready.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button onClick={() => setActivePracticeModal(null)} className="w-full">
                Done with Practice
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t py-4 text-center text-xs text-muted-foreground px-4">
        Jaagr Mind Platform • Student Reflection Sanctuary
      </footer>
    </div>
  );
}
