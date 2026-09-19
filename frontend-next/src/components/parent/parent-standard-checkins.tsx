"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  Clock,
  FileText,
  Sparkles,
  BookOpen,
  Play,
  RotateCcw,
  History,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Building2,
  Home,
  GraduationCap,
} from "lucide-react";

export interface CheckinAttempt {
  score: number;
  assigned_bucket: string;
  completed_at: string;
  origin?: string;
  origin_label?: string;
  is_prior_school?: boolean;
}

export interface StudentGradeCheckin {
  id: string;
  title: string;
  description: string;
  min_grade: number;
  max_grade: number;
  target_grades: string[];
  total_time: number;
  question_count: number;
  status: "completed" | "pending";
  score?: number;
  assigned_bucket?: string;
  completed_at?: string;
  attempts_count?: number;
  history?: CheckinAttempt[];
}

interface ParentStandardCheckinsProps {
  childName: string;
  preferredName?: string;
  grade: string;
  checkins: StudentGradeCheckin[];
  onStartCheckin?: (checkin: StudentGradeCheckin) => void;
}

export function ParentStandardCheckins({
  childName,
  preferredName,
  grade,
  checkins,
  onStartCheckin,
}: ParentStandardCheckinsProps) {
  const displayName = preferredName || childName.split(" ")[0] || childName;
  const [expandedHistory, setExpandedHistory] = useState<{ [id: string]: boolean }>({});

  const toggleHistory = (id: string) => {
    setExpandedHistory((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <section className="rounded-xl border border-border/70 bg-card p-6 sm:p-7 space-y-6 shadow-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-sky-600 dark:text-sky-400 font-semibold">
              STANDARD CURRICULUM
            </span>
            <Badge variant="outline" className="text-[10px] font-medium border-sky-500/30 bg-sky-500/5 text-sky-600 dark:text-sky-400">
              Class {grade}
            </Badge>
          </div>
          <h2 className="text-lg font-bold text-foreground mt-1">
            Student Check-ins for {displayName}&apos;s Standard
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5 max-w-2xl">
            Assessments set by JaagrMind for {displayName}&apos;s academic standard to track focus, stress resilience, and daily routine balance.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground self-start sm:self-auto bg-muted/40 px-3 py-1.5 rounded-lg">
          <BookOpen className="h-3.5 w-3.5 text-sky-500" />
          <span>{checkins.length} Active {checkins.length === 1 ? "Check-in" : "Check-ins"}</span>
        </div>
      </div>

      {/* Checkins Grid */}
      {checkins.length === 0 ? (
        <div className="p-8 text-center neo-well rounded-xl border border-dashed border-border/70 space-y-2">
          <p className="text-sm font-semibold text-foreground">No specific check-ins for this standard yet</p>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            New seasonal check-ins will appear here as the academic term progresses.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          {checkins.map((checkin) => {
            const isCompleted = checkin.status === "completed";
            const attemptsCount = checkin.attempts_count || (isCompleted ? 1 : 0);
            const history = checkin.history || [];
            const isHistoryOpen = !!expandedHistory[checkin.id];

            return (
              <div
                key={checkin.id}
                className={`p-5 rounded-xl border transition-all flex flex-col justify-between ${
                  isCompleted
                    ? "bg-card/90 border-emerald-500/30 shadow-2xs"
                    : "bg-card/60 border-border/80 hover:border-border shadow-2xs"
                }`}
              >
                <div className="space-y-3">
                  {/* Card Header & Status */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-muted-foreground">
                          Grades {checkin.min_grade}–{checkin.max_grade}
                        </span>
                        {attemptsCount > 0 && (
                          <Badge variant="outline" className="text-[9px] font-mono border-sky-500/30 bg-sky-500/5 text-sky-600 dark:text-sky-400">
                            {attemptsCount} {attemptsCount === 1 ? "Attempt" : "Attempts"} Saved
                          </Badge>
                        )}
                      </div>
                      <h3 className="text-sm font-bold text-foreground leading-snug">
                        {checkin.title}
                      </h3>
                    </div>

                    {isCompleted ? (
                      <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] shrink-0 font-medium flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>Completed</span>
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/5 shrink-0 font-medium flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>Assigned</span>
                      </Badge>
                    )}
                  </div>

                  {/* Description */}
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {checkin.description}
                  </p>

                  {/* Meta Pills */}
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground pt-1">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      {checkin.total_time} mins
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <FileText className="h-3 w-3 text-muted-foreground" />
                      {checkin.question_count} questions
                    </span>
                  </div>
                </div>

                {/* Bottom Result / Status Banner */}
                <div className="mt-4 pt-3.5 border-t border-border/40 space-y-3">
                  {isCompleted ? (
                    <>
                      <div className="flex items-center justify-between gap-2 neo-well p-3 rounded-xl text-xs">
                        <div>
                          <span className="text-[10px] font-mono text-muted-foreground block uppercase">
                            Latest Result Score
                          </span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400 text-base">
                            {checkin.score}%
                          </span>
                          {checkin.assigned_bucket && (
                            <span className="text-muted-foreground ml-1.5 text-xs capitalize font-medium">
                              • {checkin.assigned_bucket}
                            </span>
                          )}
                        </div>
                        {checkin.completed_at && (
                          <div className="text-right">
                            <span className="text-[10px] text-muted-foreground font-mono block">
                              Completed on
                            </span>
                            <span className="text-[11px] font-medium text-foreground">
                              {checkin.completed_at}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons: Retake + History Toggle */}
                      <div className="flex flex-col sm:flex-row items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => onStartCheckin && onStartCheckin(checkin)}
                          className="w-full sm:flex-1 text-xs font-semibold bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white shadow-xs flex items-center justify-center gap-1.5 h-8.5 rounded-xl cursor-pointer"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          <span>Retake Check-in</span>
                        </Button>

                        {history.length > 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleHistory(checkin.id)}
                            className="w-full sm:w-auto text-xs h-8.5 rounded-xl neo-well flex items-center justify-center gap-1 text-muted-foreground hover:text-foreground cursor-pointer"
                          >
                            <History className="h-3 w-3" />
                            <span>{history.length} {history.length === 1 ? "Record" : "Records"}</span>
                            {isHistoryOpen ? (
                              <ChevronUp className="h-3 w-3 ml-0.5" />
                            ) : (
                              <ChevronDown className="h-3 w-3 ml-0.5" />
                            )}
                          </Button>
                        )}
                      </div>

                      {/* Historical Attempts Accordion */}
                      {isHistoryOpen && history.length > 0 && (
                        <div className="neo-well p-3 rounded-xl space-y-2 border border-border/50 animate-in fade-in-50 duration-150">
                          <div className="flex items-center justify-between text-[11px] font-semibold text-foreground pb-1 border-b border-border/30">
                            <span className="flex items-center gap-1">
                              <TrendingUp className="h-3 w-3 text-sky-500" />
                              <span>Preserved Growth History</span>
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              {history.length} Attempt{history.length > 1 ? "s" : ""}
                            </span>
                          </div>
                          {history.some((a) => a.is_prior_school) && (
                            <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20 text-[10px] text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                              <Building2 className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                              <span className="font-medium">Academic Transfer Record: Includes check-ins completed prior to transferring to current school.</span>
                            </div>
                          )}
                          <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                            {history.map((att, attIdx) => (
                              <div
                                key={attIdx}
                                className="flex flex-col sm:flex-row sm:items-center justify-between p-2 rounded-lg bg-background/80 border border-border/40 text-xs gap-1.5"
                              >
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Badge
                                    variant="outline"
                                    className={`text-[9px] font-mono px-1.5 py-0 ${
                                      attIdx === 0
                                        ? "border-emerald-500/40 text-emerald-600 bg-emerald-500/5"
                                        : "border-border text-muted-foreground"
                                    }`}
                                  >
                                    #{history.length - attIdx} {attIdx === 0 ? "(Latest)" : ""}
                                  </Badge>

                                  {att.is_prior_school ? (
                                    <Badge variant="outline" className="text-[9px] font-medium border-purple-500/30 text-purple-600 dark:text-purple-400 bg-purple-500/5 inline-flex items-center gap-1">
                                      <Building2 className="h-3 w-3" />
                                      <span>Prior School Session</span>
                                    </Badge>
                                  ) : att.origin === "parent" ? (
                                    <Badge variant="outline" className="text-[9px] font-medium border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/5 inline-flex items-center gap-1">
                                      <Home className="h-3 w-3" />
                                      <span>Home Check-in</span>
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-[9px] font-medium border-sky-500/30 text-sky-600 dark:text-sky-400 bg-sky-500/5 inline-flex items-center gap-1">
                                      <GraduationCap className="h-3 w-3" />
                                      <span>School Session</span>
                                    </Badge>
                                  )}

                                  <span className="font-bold text-foreground">
                                    {att.score}%
                                  </span>
                                  <span className="text-muted-foreground text-[11px] capitalize">
                                    {att.assigned_bucket}
                                  </span>
                                </div>
                                <span className="text-[10px] font-mono text-muted-foreground self-end sm:self-auto">
                                  {att.completed_at}
                                </span>
                              </div>
                            ))}
                          </div>
                          <p className="text-[10px] text-muted-foreground italic pt-1">
                            Every retake preserves all past attempts across home and school to continuously feed into the improvement radar.
                          </p>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="space-y-2">
                      <Button
                        size="sm"
                        onClick={() => onStartCheckin && onStartCheckin(checkin)}
                        className="w-full text-xs font-semibold bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white shadow-sm flex items-center justify-center gap-2 h-9 rounded-xl cursor-pointer"
                      >
                        <Play className="h-3.5 w-3.5 fill-current" />
                        <span>Start Check-in with {displayName}</span>
                      </Button>
                      <div className="neo-well p-2 rounded-lg text-[11px] text-muted-foreground flex items-center gap-2 justify-center">
                        <Sparkles className="h-3 w-3 text-amber-500 shrink-0" />
                        <span>Includes &quot;Get Set Ready!&quot; guidance before starting</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
