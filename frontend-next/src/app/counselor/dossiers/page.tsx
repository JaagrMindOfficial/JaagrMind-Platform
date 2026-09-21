"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FolderOpen,
  Search,
  Users,
  GraduationCap,
  RefreshCw,
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus,
  Activity,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import { api } from "@/lib/api";
import { StudentDossierDialog, StudentProfileData } from "@/components/student-dossier-dialog";

interface StudentRecord {
  id: string;
  access_id: string;
  name: string;
  grade: string;
  section: string;
  mobile_number?: string;
  email?: string;
  roll_number?: string;
}

export default function CounselorDossiersPage() {
  const [profiles, setProfiles] = useState<StudentProfileData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [sectionFilter, setSectionFilter] = useState("all");
  const [cohortTab, setCohortTab] = useState<"all" | "support_needed" | "emerging" | "stable">("all");

  // Dossier Dialog State
  const [isDossierOpen, setIsDossierOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentProfileData | null>(null);

  const fetchDossierData = async () => {
    try {
      const [studentsRes, analyticsRes] = await Promise.all([
        api.get<StudentRecord[]>("/api/school/students").catch(() => []),
        api.get<any>("/api/school/analytics").catch(() => null),
      ]);

      const analyticsProfiles: StudentProfileData[] =
        analyticsRes?.students && Array.isArray(analyticsRes.students)
          ? analyticsRes.students
          : [];

      let merged: StudentProfileData[] = [...analyticsProfiles];

      if (Array.isArray(studentsRes) && studentsRes.length > 0) {
        const existingIds = new Set(merged.map((p) => p.id));
        studentsRes.forEach((s: StudentRecord) => {
          if (!existingIds.has(s.id)) {
            merged.push({
              id: s.id,
              access_id: s.access_id,
              name: s.name,
              grade: s.grade,
              section: s.section,
              school_id: "",
              regulation_profile: "Calm & Stress Reset",
              pathway_track_id: "TRACK_CR_GROUND",
              pathway_track_name: "Calm Reset – with Ground Support",
              overall_status: "Emerging",
              attn_stability_score: 12,
              load_regulation_score: 16,
              self_safety_score: 15,
              social_comfort_score: 12,
              primary_friction: "Daily Calm & Focus Rhythm",
              momentum_trend: "stable",
              last_check_in_date: new Date().toISOString(),
              check_in_count: 1,
            });
          }
        });
      }

      setProfiles(merged);
    } catch (err) {
      console.error("Failed to fetch counselor student data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDossierData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDossierData();
  };

  const handleOpenDossier = (profile: StudentProfileData) => {
    setSelectedStudent(profile);
    setIsDossierOpen(true);
  };

  // Metrics summary based on 4 Core Regulation Buckets
  const summary = useMemo(() => {
    if (profiles.length === 0) {
      return { total: 0, stableCount: 0, emergingCount: 0, supportCount: 0 };
    }
    const total = profiles.length;
    const supportCount = profiles.filter(
      (p) => p.overall_status === "Support Needed" || (p.resilience_score && p.resilience_score < 60)
    ).length;
    const emergingCount = profiles.filter(
      (p) => p.overall_status === "Emerging" || (p.resilience_score && p.resilience_score >= 60 && p.resilience_score < 75)
    ).length;
    const stableCount = total - supportCount - emergingCount;
    return { total, stableCount, emergingCount, supportCount };
  }, [profiles]);

  // Filter students
  const filteredStudents = useMemo(() => {
    return profiles.filter((s) => {
      const matchGrade = gradeFilter === "all" || s.grade === gradeFilter;
      const matchSection =
        sectionFilter === "all" || s.section.toLowerCase() === sectionFilter.toLowerCase();
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.access_id.toLowerCase().includes(q) ||
        (s.pathway_track_name || "").toLowerCase().includes(q);

      let matchTab = true;
      if (cohortTab === "support_needed") {
        matchTab = Boolean(s.overall_status === "Support Needed" || (s.resilience_score !== undefined && s.resilience_score < 60));
      } else if (cohortTab === "emerging") {
        matchTab = Boolean(s.overall_status === "Emerging" || (s.resilience_score !== undefined && s.resilience_score >= 60 && s.resilience_score < 75));
      } else if (cohortTab === "stable") {
        matchTab = Boolean(s.overall_status === "Stable" || s.is_balance_mode || (s.resilience_score !== undefined && s.resilience_score >= 75));
      }

      return matchGrade && matchSection && matchSearch && matchTab;
    });
  }, [profiles, gradeFilter, sectionFilter, search, cohortTab]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground">
              Campus Wellness Directory & Student Profiles
            </span>
            <Badge
              variant="outline"
              className="text-[10px] font-mono text-sky-600 dark:text-sky-400 bg-sky-500/10 border-sky-500/20"
            >
              {summary.total} Enrolled Students
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mt-1 flex items-center gap-2.5">
            <FolderOpen className="h-6 w-6 text-primary" />
            <span>Student Behavioral Dossiers</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time longitudinal diagnostics, 4-bucket regulation status, assigned 16-track pathways, and confidential case notes.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
          className="h-9 text-xs gap-1.5 self-start sm:self-auto"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          <span>Refresh Cohort Data</span>
        </Button>
      </div>

      {/* Top 4 Diagnostic Metric KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-xl border-border/70 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
                Campus Cohort
              </div>
              <div className="text-2xl font-bold mt-1 text-foreground">
                {loading ? "..." : summary.total}
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">Total Enrolled Students</div>
            </div>
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Users className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-border/70 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-mono uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Stable / Balance
              </div>
              <div className="text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">
                {loading ? "..." : summary.stableCount}
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                {summary.total > 0 ? Math.round((summary.stableCount * 100) / summary.total) : 0}% All-round flourish
              </div>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
              <Activity className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-border/70 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-mono uppercase tracking-wider text-amber-600 dark:text-amber-400">
                Emerging Support
              </div>
              <div className="text-2xl font-bold mt-1 text-amber-600 dark:text-amber-400">
                {loading ? "..." : summary.emergingCount}
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                {summary.total > 0 ? Math.round((summary.emergingCount * 100) / summary.total) : 0}% Developing skill capacity
              </div>
            </div>
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
              <Sparkles className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-rose-500/20 bg-rose-500/5 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-mono uppercase tracking-wider text-rose-600 dark:text-rose-400">
                Support Needed
              </div>
              <div className="text-2xl font-bold mt-1 text-rose-600 dark:text-rose-400">
                {loading ? "..." : summary.supportCount}
              </div>
              <div className="text-[11px] text-rose-600/80 mt-0.5">Priority counselor guidance</div>
            </div>
            <div className="h-10 w-10 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Student Directory Card */}
      <Card className="border-border/80 shadow-none">
        <CardHeader className="p-4 sm:p-5 border-b border-border/40 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <span>Student Roster & Psychological Vectors</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Inspect longitudinal developmental diagnostics or directly record counseling sessions for any student.
              </CardDescription>
            </div>

            {/* Cohort Tabs */}
            <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg border border-border/60">
              <button
                type="button"
                onClick={() => setCohortTab("all")}
                className={`px-3 py-1 text-xs rounded-md font-medium transition-all ${
                  cohortTab === "all"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                All Students ({profiles.length})
              </button>
              <button
                type="button"
                onClick={() => setCohortTab("support_needed")}
                className={`px-3 py-1 text-xs rounded-md font-medium transition-all flex items-center gap-1 ${
                  cohortTab === "support_needed"
                    ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <AlertTriangle className="h-3 w-3 text-rose-500" />
                <span>Needs Support ({summary.supportCount})</span>
              </button>
              <button
                type="button"
                onClick={() => setCohortTab("emerging")}
                className={`px-3 py-1 text-xs rounded-md font-medium transition-all ${
                  cohortTab === "emerging"
                    ? "bg-amber-500/10 text-amber-600 border border-amber-500/20 shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Emerging Focus ({summary.emergingCount})
              </button>
              <button
                type="button"
                onClick={() => setCohortTab("stable")}
                className={`px-3 py-1 text-xs rounded-md font-medium transition-all ${
                  cohortTab === "stable"
                    ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Stable / Balance ({summary.stableCount})
              </button>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="flex items-center gap-2 flex-wrap pt-1">
            <select
              value={gradeFilter}
              onChange={(e) => setGradeFilter(e.target.value)}
              className="h-8 rounded-md border border-input bg-background px-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-medium"
            >
              <option value="all">All Grades</option>
              <option value="6">Class 6th</option>
              <option value="7">Class 7th</option>
              <option value="8">Class 8th</option>
              <option value="9">Class 9th</option>
              <option value="10">Class 10th</option>
              <option value="11">Class 11th</option>
              <option value="12">Class 12th</option>
            </select>

            <select
              value={sectionFilter}
              onChange={(e) => setSectionFilter(e.target.value)}
              className="h-8 rounded-md border border-input bg-background px-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-medium"
            >
              <option value="all">All Sections</option>
              <option value="A">Section A</option>
              <option value="B">Section B</option>
              <option value="C">Section C</option>
            </select>

            <div className="relative flex-1 min-w-[200px]">
              <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by student name or ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 text-xs pl-8"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center text-muted-foreground text-xs flex flex-col items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span>Loading student wellbeing records...</span>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground text-xs space-y-1">
              <p className="font-semibold text-foreground text-sm">No students found matching your filters.</p>
              <p>Adjust your search query or grade filters above.</p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/50 bg-secondary/20">
                      <TableHead className="text-xs font-bold font-mono uppercase">Student Name</TableHead>
                      <TableHead className="text-xs font-bold font-mono uppercase">Class & Section</TableHead>
                      <TableHead className="text-xs font-bold font-mono uppercase">Regulation Profile</TableHead>
                      <TableHead className="text-xs font-bold font-mono uppercase">Assigned Pathway Track</TableHead>
                      <TableHead className="text-xs font-bold font-mono uppercase">Regulation Status</TableHead>
                      <TableHead className="text-xs font-bold font-mono uppercase">Momentum</TableHead>
                      <TableHead className="text-xs font-bold font-mono uppercase text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudents.map((s) => {
                      const isSupport = s.overall_status === "Support Needed" || (s.resilience_score !== undefined && s.resilience_score < 60);
                      const isEmerging = s.overall_status === "Emerging" || (s.resilience_score !== undefined && s.resilience_score >= 60 && s.resilience_score < 75);

                      return (
                        <TableRow key={s.id} className="border-border/40 hover:bg-secondary/10">
                          <TableCell>
                            <div className="flex items-center gap-2.5">
                              <div className="h-8 w-8 rounded-full bg-primary/10 border border-primary/20 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                                {s.name
                                  .split(" ")
                                  .map((p) => p[0])
                                  .slice(0, 2)
                                  .join("")
                                  .toUpperCase()}
                              </div>
                              <div>
                                <div className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                                  <span>{s.name}</span>
                                  {isSupport && (
                                    <span className="h-1.5 w-1.5 rounded-full bg-rose-500" title="Priority guidance support required" />
                                  )}
                                </div>
                                <div className="text-[11px] text-muted-foreground font-mono">ID: {s.access_id}</div>
                              </div>
                            </div>
                          </TableCell>

                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <GraduationCap className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="text-xs font-medium text-foreground">
                                Class {s.grade}th · Sec {s.section}
                              </span>
                            </div>
                          </TableCell>

                          <TableCell>
                            <div>
                              <div className="font-semibold text-xs text-foreground">
                                {s.regulation_profile || "All-Round Balance"}
                              </div>
                              <div className="text-[10px] text-muted-foreground font-mono">
                                {s.primary_bucket ? `Primary: ${s.primary_bucket}` : "Symmetric Flow"}
                              </div>
                            </div>
                          </TableCell>

                          <TableCell>
                            <div className="space-y-0.5">
                              <Badge variant="outline" className="font-mono text-[10px] font-bold bg-muted/60 text-foreground border-border/80">
                                {s.pathway_track_id || "TRACK_BALANCE"}
                              </Badge>
                              <div className="text-[11px] text-muted-foreground truncate max-w-[200px]" title={s.pathway_track_name}>
                                {s.pathway_track_name || "General Regulation Flow"}
                              </div>
                            </div>
                          </TableCell>

                          <TableCell>
                            <div>
                              {isSupport ? (
                                <Badge variant="outline" className="text-[10px] font-medium bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20">
                                  Support Needed
                                </Badge>
                              ) : isEmerging ? (
                                <Badge variant="outline" className="text-[10px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">
                                  Emerging
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                                  Stable
                                </Badge>
                              )}
                              <div className="text-[10px] font-mono text-muted-foreground mt-0.5">
                                Attn: {s.attn_stability_score ?? 12}/32 · Calm: {s.load_regulation_score ?? 12}/32
                              </div>
                            </div>
                          </TableCell>

                          <TableCell>
                            {s.momentum_trend === "improving" ? (
                              <Badge variant="outline" className="text-[10px] gap-1 text-emerald-600 border-emerald-500/30 bg-emerald-500/10">
                                <TrendingUp className="h-2.5 w-2.5" /> Improving
                              </Badge>
                            ) : s.momentum_trend === "declining" ? (
                              <Badge variant="outline" className="text-[10px] gap-1 text-rose-600 border-rose-500/30 bg-rose-500/10">
                                <TrendingDown className="h-2.5 w-2.5" /> Declining
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] gap-1 text-muted-foreground border-border">
                                <Minus className="h-2.5 w-2.5" /> Stable
                              </Badge>
                            )}
                          </TableCell>

                          <TableCell className="text-right">
                            <div className="flex items-center justify-end">
                              <Button
                                size="sm"
                                onClick={() => handleOpenDossier(s)}
                                className="h-7 px-2.5 text-xs gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-xs"
                              >
                                <FolderOpen className="h-3 w-3" />
                                <span>Inspect Dossier</span>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden divide-y divide-border/60">
                {filteredStudents.map((s) => {
                  const isSupport = s.overall_status === "Support Needed" || (s.resilience_score !== undefined && s.resilience_score < 60);
                  const isEmerging = s.overall_status === "Emerging" || (s.resilience_score !== undefined && s.resilience_score >= 60 && s.resilience_score < 75);

                  return (
                    <div key={s.id} className="p-3.5 space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="h-8 w-8 rounded-full bg-primary/10 border border-primary/20 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                            {s.name
                              .split(" ")
                              .map((p) => p[0])
                              .slice(0, 2)
                              .join("")
                              .toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-sm text-foreground flex items-center gap-1.5 truncate">
                              <span className="truncate">{s.name}</span>
                              {isSupport && (
                                <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0" title="Priority guidance support required" />
                              )}
                            </div>
                            <div className="text-[11px] text-muted-foreground font-mono">ID: {s.access_id}</div>
                          </div>
                        </div>

                        <span className="text-xs font-medium text-foreground bg-muted/50 px-2 py-0.5 rounded border border-border/60 shrink-0">
                          Class {s.grade}th · {s.section}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2 text-xs pt-0.5">
                        <div className="min-w-0">
                          <p className="font-medium text-foreground truncate">{s.regulation_profile || "All-Round Balance"}</p>
                          <p className="text-[10px] text-muted-foreground font-mono truncate">{s.pathway_track_name || "General Regulation Flow"}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          {isSupport ? (
                            <Badge variant="outline" className="text-[10px] font-medium bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20">
                              Support Needed
                            </Badge>
                          ) : isEmerging ? (
                            <Badge variant="outline" className="text-[10px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">
                              Emerging
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                              Stable
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/40 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono text-muted-foreground">
                            Attn: {s.attn_stability_score ?? 12} · Calm: {s.load_regulation_score ?? 12}
                          </span>
                          {s.momentum_trend === "improving" ? (
                            <Badge variant="outline" className="text-[9px] gap-0.5 text-emerald-600 border-emerald-500/30 bg-emerald-500/10 px-1 py-0">
                              <TrendingUp className="h-2 w-2" /> Up
                            </Badge>
                          ) : s.momentum_trend === "declining" ? (
                            <Badge variant="outline" className="text-[9px] gap-0.5 text-rose-600 border-rose-500/30 bg-rose-500/10 px-1 py-0">
                              <TrendingDown className="h-2 w-2" /> Down
                            </Badge>
                          ) : null}
                        </div>

                        <Button
                          size="sm"
                          onClick={() => handleOpenDossier(s)}
                          className="h-7 px-2.5 text-xs gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-xs"
                        >
                          <FolderOpen className="h-3 w-3" />
                          <span>Inspect Dossier</span>
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Student Dossier Dialog */}
      <StudentDossierDialog
        isOpen={isDossierOpen}
        onClose={() => setIsDossierOpen(false)}
        student={selectedStudent}
      />
    </div>
  );
}
