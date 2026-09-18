"use client";

import { CheckCircle2, Home, BookOpen, Users, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface MilestoneCheckin {
  id: string;
  title: string;
  date: string;
  status: string;
  score: number;
  assigned_bucket: string;
  parent_takeaway: string;
  home_action: string;
}

interface ParentMilestonesTimelineProps {
  checkins: MilestoneCheckin[];
  childName: string;
}

export function ParentMilestonesTimeline({ checkins, childName }: ParentMilestonesTimelineProps) {
  const firstName = childName.split(" ")[0] || "Your child";

  return (
    <div className="clay-card p-6 sm:p-8 relative overflow-hidden transition-all flex flex-col justify-between h-full group">
      {/* Top liquid specular line */}
      <div className="absolute top-0 left-6 right-6 h-[1px] bg-gradient-to-r from-transparent via-foreground/15 to-transparent" />

      {/* Header */}
      <div className="flex items-center justify-between pb-5 border-b border-border/40">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              RECENT SCHOOL UPDATES & PROGRESS
            </span>
          </div>
          <h3 className="text-xl font-bold tracking-tight text-foreground">
            {firstName}&apos;s School Check-in Notes
          </h3>
        </div>
        <Badge variant="outline" className="text-[11px] font-mono bg-secondary/50 px-2.5 py-0.5 rounded-full">
          {checkins.length} Notes Available
        </Badge>
      </div>

      {/* Timeline Items */}
      <div className="space-y-4 pt-5">
        {checkins.map((item, idx) => (
          <div
            key={item.id || idx}
            className="p-5 rounded-2xl bg-card border border-border/70 shadow-xs space-y-3 transition-all hover:border-foreground/20"
          >
            {/* Top row */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <h4 className="text-sm font-bold text-foreground line-clamp-1">
                  {item.title}
                </h4>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
                <Calendar className="h-3 w-3" />
                <span>{item.date}</span>
              </div>
            </div>

            {/* Plain English Parent Takeaway */}
            <p className="text-xs text-foreground/90 leading-relaxed pl-9 font-normal">
              {item.parent_takeaway}
            </p>

            {/* Recommended Home Action */}
            <div className="ml-9 p-3 rounded-xl neo-well text-xs flex items-start gap-2.5">
              <Home className="h-4 w-4 shrink-0 text-sky-500 mt-0.5" />
              <div className="text-muted-foreground leading-relaxed">
                <strong className="text-foreground font-semibold">Suggested for Parents: </strong>
                {item.home_action}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
