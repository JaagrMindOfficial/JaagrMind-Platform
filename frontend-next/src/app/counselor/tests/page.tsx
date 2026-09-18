"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Clock, AlertCircle, Loader2, ArrowUpRight, CheckCircle2 } from "lucide-react";
import Link from "next/link";

interface Assessment {
  id: string;
  title: string;
  description?: string;
  is_active: boolean;
  tier?: string;
  target_grades?: string[];
  total_time?: number;
  questions?: any[];
}

export default function CounselorTestsPage() {
  const [tests, setTests] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTests = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch("/api/school/assessments", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) setTests(data);
        }
      } catch (err) {
        console.error("Failed to load assessments:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTests();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground">
            School Instruments
          </span>
          <Badge
            variant="outline"
            className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
          >
            {tests.length} Active
          </Badge>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mt-1 flex items-center gap-2.5">
          <FileText className="h-6 w-6 text-primary" />
          <span>Active Student Check-in Instruments</span>
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Standardized cognitive and wellbeing assessment instruments currently assigned to your school cohort.
        </p>
      </div>

      {loading ? (
        <div className="p-12 text-center text-muted-foreground text-xs flex flex-col items-center justify-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span>Loading check-in instruments...</span>
        </div>
      ) : tests.length === 0 ? (
        <Card className="p-12 text-center border-border/80 text-xs text-muted-foreground">
          <p className="font-semibold text-foreground text-sm">No check-in instruments currently published.</p>
          <p className="mt-1">Your school administrator or platform superadmin can configure and assign developmental templates.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tests.map((test) => (
            <Card key={test.id} className="border-border/80 shadow-none flex flex-col justify-between">
              <CardHeader className="p-5 pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <CardTitle className="text-base font-semibold leading-snug">
                      {test.title}
                    </CardTitle>
                    <CardDescription className="text-xs line-clamp-2">
                      {test.description || "Standard developmental reflection instrument evaluating school focus and wellbeing."}
                    </CardDescription>
                  </div>
                  <Badge
                    variant="outline"
                    className="text-[10px] font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 shrink-0"
                  >
                    Published
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="p-5 pt-0 space-y-3">
                <div className="flex items-center gap-4 text-xs font-mono text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    <span>~{test.total_time || 15} Mins</span>
                  </div>
                  {test.target_grades && test.target_grades.length > 0 && (
                    <div>
                      <span>Grades: {test.target_grades.join(", ")}</span>
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-border/40 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground text-[11px]">Assigned to school cohort</span>
                  <Link
                    href={`/preview/assessment/${test.id}`}
                    target="_blank"
                    className="text-primary hover:underline flex items-center gap-1 font-medium text-xs"
                  >
                    <span>Preview Instrument</span>
                    <ArrowUpRight className="h-3 w-3" />
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
