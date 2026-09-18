"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { History, Calendar, Clock, Trophy, AlertTriangle, CheckCircle2, ShieldAlert, Building2, Home, User, GraduationCap } from "lucide-react"
import { api } from "@/lib/api"

interface AttemptData {
  id: string
  attempt: number
  total_score: number
  totalScore?: number
  assigned_bucket: string
  assignedBucket?: string
  time_taken: number
  timeTaken?: number
  completed_at: string
  completedAt?: string
  date: string
  fullDate: string
  origin?: string
  origin_label?: string
  is_prior_school?: boolean
}

interface StudentHistoryDialogProps {
  isOpen: boolean
  onClose: () => void
  student: {
    id: string
    name: string
    access_id?: string
    grade?: string
    section?: string
  } | null
  assessmentId?: string
  assessmentTitle?: string
}

export function StudentHistoryDialog({
  isOpen,
  onClose,
  student,
  assessmentId,
  assessmentTitle,
}: StudentHistoryDialogProps) {
  const [history, setHistory] = useState<AttemptData[]>([])
  const [loading, setLoading] = useState<boolean>(false)

  useEffect(() => {
    if (!isOpen || !student?.id) return
    loadHistory()
  }, [isOpen, student, assessmentId])

  const loadHistory = async () => {
    if (!student?.id) return
    setLoading(true)
    try {
      const url = assessmentId
        ? `/api/school/analytics/student/${student.id}/attempts/${assessmentId}`
        : `/api/school/analytics/student/${student.id}/attempts/all`

      const list = await api.get<any[]>(url)
      
      // Sort oldest to newest for chronological progress chart
      const sorted = [...list].reverse().map((item: any, idx: number) => {
        const score = item.total_score ?? item.totalScore ?? 0
        const bucket = item.assigned_bucket || item.assignedBucket || "Evaluated"
        const time = item.time_taken ?? item.timeTaken ?? 0
        const compAt = item.completed_at || item.completedAt || new Date().toISOString()
        const d = new Date(compAt)
        return {
          id: item.id || `attempt-${idx}`,
          attempt: idx + 1,
          total_score: score,
          totalScore: score,
          assigned_bucket: bucket,
          assignedBucket: bucket,
          time_taken: time,
          timeTaken: time,
          completed_at: compAt,
          date: d.toLocaleDateString(),
          fullDate: d.toLocaleString(),
          origin: item.origin || "school",
          origin_label: item.origin_label || "School Session",
          is_prior_school: !!item.is_prior_school,
        }
      })
      setHistory(sorted)
    } catch (err) {
      console.error("Failed to fetch student attempts history:", err)
      setHistory([])
    } finally {
      setLoading(false)
    }
  }

  const latestAttempt = history.length > 0 ? history[history.length - 1] : null
  const totalAttempts = history.length
  const avgTimeSeconds = totalAttempts > 0
    ? Math.round(history.reduce((acc, curr) => acc + (curr.time_taken || 0), 0) / totalAttempts)
    : 0

  const getBucketBadge = (bucket: string) => {
    const lower = bucket.toLowerCase()
    if (lower.includes("high") || lower.includes("severe") || lower.includes("critical")) {
      return (
        <Badge variant="destructive" className="gap-1 text-[11px] font-medium">
          <ShieldAlert className="h-3 w-3" /> {bucket}
        </Badge>
      )
    }
    if (lower.includes("mod") || lower.includes("mild") || lower.includes("med")) {
      return (
        <Badge variant="secondary" className="gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20">
          <AlertTriangle className="h-3 w-3" /> {bucket}
        </Badge>
      )
    }
    return (
      <Badge variant="secondary" className="gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20">
        <CheckCircle2 className="h-3 w-3" /> {bucket}
      </Badge>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[95vw] sm:max-w-3xl lg:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-3 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-lg font-semibold flex items-center gap-2">
                <History className="h-5 w-5 text-primary" />
                Performance & Attempt History
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-1">
                {student?.name} {student?.access_id ? `(ID: ${student.access_id})` : ""}
                {student?.grade ? ` • Class ${student.grade}${student.section ? `-${student.section}` : ""}` : ""}
                {assessmentTitle ? ` • ${assessmentTitle}` : ""}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent mb-2" />
            <p>Loading longitudinal history...</p>
          </div>
        ) : history.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <History className="h-10 w-10 text-muted-foreground/40 mx-auto" />
            <h4 className="text-sm font-medium">No Attempts Recorded Yet</h4>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              This student has not completed any assessments yet. Once a check-in is submitted, their score trajectories and risk evaluations will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-6 pt-2">
            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3.5 rounded-lg border border-border bg-muted/20 flex items-center gap-3">
                <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center text-primary">
                  <Trophy className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground font-medium">Latest Score</div>
                  <div className="text-lg font-semibold tracking-tight">
                    {latestAttempt?.total_score} <span className="text-xs text-muted-foreground font-normal">pts</span>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-lg border border-border bg-muted/20 flex items-center gap-3">
                <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center text-primary">
                  <History className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground font-medium">Total Check-ins</div>
                  <div className="text-lg font-semibold tracking-tight">{totalAttempts}</div>
                </div>
              </div>

              <div className="p-3.5 rounded-lg border border-border bg-muted/20 flex items-center gap-3">
                <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center text-primary">
                  <Clock className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground font-medium">Avg Duration</div>
                  <div className="text-lg font-semibold tracking-tight">
                    {Math.round(avgTimeSeconds / 60)} <span className="text-xs text-muted-foreground font-normal">min</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Score Trajectory Chart */}
            <div className="rounded-lg border border-border bg-card p-4 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Score Trajectory Over Attempts
                </h4>
                {latestAttempt && (
                  <div>{getBucketBadge(latestAttempt.assigned_bucket)}</div>
                )}
              </div>
              <div className="h-[220px] w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={history} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis
                      dataKey="attempt"
                      tickFormatter={(val) => `Attempt ${val}`}
                      tick={{ fontSize: 11, fill: "currentColor" }}
                      axisLine={{ stroke: "var(--border)" }}
                    />
                    <YAxis
                      domain={[0, "auto"]}
                      tick={{ fontSize: 11, fill: "currentColor" }}
                      axisLine={{ stroke: "var(--border)" }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--card)",
                        borderColor: "var(--border)",
                        borderRadius: "8px",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
                        fontSize: "12px",
                        color: "var(--foreground)",
                      }}
                      formatter={(value: any) => [`${value} pts`, "Score"]}
                      labelFormatter={(label) => `Attempt #${label}`}
                    />
                    <Line
                      type="monotone"
                      dataKey="total_score"
                      stroke="var(--primary)"
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: "var(--primary)" }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Attempts Table */}
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="text-xs">Attempt</TableHead>
                    <TableHead className="text-xs">Origin / Channel</TableHead>
                    <TableHead className="text-xs">Date & Time</TableHead>
                    <TableHead className="text-xs">Score</TableHead>
                    <TableHead className="text-xs">Risk Category</TableHead>
                    <TableHead className="text-xs text-right">Time Taken</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((att) => (
                    <TableRow key={att.id} className="text-xs">
                      <TableCell className="font-semibold text-foreground">
                        #{att.attempt}
                      </TableCell>
                      <TableCell>
                        {att.is_prior_school ? (
                          <Badge variant="outline" className="text-[9px] font-medium border-purple-500/30 text-purple-600 dark:text-purple-400 bg-purple-500/5 inline-flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            <span>Prior School</span>
                          </Badge>
                        ) : att.origin === "parent" ? (
                          <Badge variant="outline" className="text-[9px] font-medium border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/5 inline-flex items-center gap-1">
                            <Home className="h-3 w-3" />
                            <span>Home Check-in</span>
                          </Badge>
                        ) : att.origin === "student" ? (
                          <Badge variant="outline" className="text-[9px] font-medium border-slate-500/30 text-slate-600 dark:text-slate-400 bg-slate-500/5 inline-flex items-center gap-1">
                            <User className="h-3 w-3" />
                            <span>Student Direct</span>
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[9px] font-medium border-sky-500/30 text-sky-600 dark:text-sky-400 bg-sky-500/5 inline-flex items-center gap-1">
                            <GraduationCap className="h-3 w-3" />
                            <span>School Session</span>
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3 w-3 text-muted-foreground/70" />
                          {att.fullDate}
                        </div>
                      </TableCell>
                      <TableCell className="font-bold font-mono text-primary">
                        {att.total_score}
                      </TableCell>
                      <TableCell>
                        {getBucketBadge(att.assigned_bucket)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {att.time_taken > 0 ? `${Math.round(att.time_taken / 60)} min` : "< 1 min"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        <div className="flex justify-end pt-3 border-t border-border">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
