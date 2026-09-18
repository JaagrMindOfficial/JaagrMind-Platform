"use client"

import React, { useState, useEffect, useMemo } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Building2,
  Search,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  Users,
  Calendar,
  Layers,
  Filter,
  RefreshCw,
} from "lucide-react"
import { api } from "@/lib/api"

export interface SchoolAssignmentItem {
  school_id: string
  school_name: string
  school_code: string
  city: string
  is_assigned: boolean
  recent_attempts: number
  last_attempt_date?: string
}

interface AssignSchoolsDialogProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  assessment: {
    id: string
    title: string
    tier?: string
    targetGrades?: string[]
    target_grades?: string[]
  } | null
}

export function AssignSchoolsDialog({
  isOpen,
  onClose,
  onSuccess,
  assessment,
}: AssignSchoolsDialogProps) {
  const [schools, setSchools] = useState<SchoolAssignmentItem[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [successMsg, setSuccessMsg] = useState("")

  // Filters & selection
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCity, setSelectedCity] = useState("all")
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<"all" | "assigned" | "unassigned" | "recent">("all")
  const [selectedSchoolIds, setSelectedSchoolIds] = useState<Set<string>>(new Set())
  const [reassignMode, setReassignMode] = useState(false)

  const fetchSchools = async () => {
    if (!assessment?.id) return
    setLoading(true)
    setError("")
    try {
      const res = await api.get<SchoolAssignmentItem[]>(`/api/admin/assessments/${assessment.id}/schools`)
      const list = Array.isArray(res) ? res : []
      setSchools(list)

      // Initialize selected set with currently assigned schools
      const assigned = new Set<string>()
      list.forEach((s: SchoolAssignmentItem) => {
        if (s.is_assigned) assigned.add(s.school_id)
      })
      setSelectedSchoolIds(assigned)
    } catch (err: any) {
      setError(err?.message || "Failed to load institutions")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen && assessment?.id) {
      setError("")
      setSuccessMsg("")
      setReassignMode(false)
      fetchSchools()
    }
  }, [isOpen, assessment?.id])

  // Extract unique cities
  const uniqueCities = useMemo(() => {
    const set = new Set<string>()
    schools.forEach((s) => {
      if (s.city && s.city.trim()) set.add(s.city.trim())
    })
    return Array.from(set).sort()
  }, [schools])

  // Filtered schools
  const filteredSchools = useMemo(() => {
    return schools.filter((s) => {
      const matchesSearch =
        s.school_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.school_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.city && s.city.toLowerCase().includes(searchTerm.toLowerCase()))

      const matchesCity = selectedCity === "all" || s.city === selectedCity

      let matchesStatus = true
      if (selectedStatusFilter === "assigned") matchesStatus = s.is_assigned
      else if (selectedStatusFilter === "unassigned") matchesStatus = !s.is_assigned
      else if (selectedStatusFilter === "recent") matchesStatus = s.recent_attempts > 0

      return matchesSearch && matchesCity && matchesStatus
    })
  }, [schools, searchTerm, selectedCity, selectedStatusFilter])

  // Check if any selected school has recent completions
  const selectedSchoolsWithRecent = useMemo(() => {
    return schools.filter((s) => selectedSchoolIds.has(s.school_id) && s.recent_attempts > 0)
  }, [schools, selectedSchoolIds])

  const totalRecentInSelection = useMemo(() => {
    return selectedSchoolsWithRecent.reduce((sum, s) => sum + s.recent_attempts, 0)
  }, [selectedSchoolsWithRecent])

  const handleToggleSelect = (schoolId: string) => {
    setSelectedSchoolIds((prev) => {
      const next = new Set(prev)
      if (next.has(schoolId)) {
        next.delete(schoolId)
      } else {
        next.add(schoolId)
      }
      return next
    })
  }

  const handleSelectAllFiltered = () => {
    setSelectedSchoolIds((prev) => {
      const next = new Set(prev)
      filteredSchools.forEach((s) => next.add(s.school_id))
      return next
    })
  }

  const handleDeselectAllFiltered = () => {
    setSelectedSchoolIds((prev) => {
      const next = new Set(prev)
      filteredSchools.forEach((s) => next.delete(s.school_id))
      return next
    })
  }

  const handleSubmit = async () => {
    if (!assessment?.id) return
    setSubmitting(true)
    setError("")
    setSuccessMsg("")

    try {
      await api.post(`/api/admin/assessments/${assessment.id}/assign-schools`, {
        schoolIds: Array.from(selectedSchoolIds),
        reassign: reassignMode,
      })

      setSuccessMsg(
        reassignMode
          ? `Successfully reassigned check-in across ${selectedSchoolIds.size} school(s). Recent attempts archived for fresh retakes!`
          : `Successfully updated assignments across ${selectedSchoolIds.size} school(s)!`
      )

      setTimeout(() => {
        onSuccess?.()
        onClose()
      }, 1200)
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || "Failed to update school assignments")
    } finally {
      setSubmitting(false)
    }
  }

  const grades = assessment?.targetGrades || assessment?.target_grades || []

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-3xl w-full max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden border border-border shadow-2xl rounded-2xl bg-card">
        {/* Header */}
        <DialogHeader className="p-6 pb-4 border-b bg-muted/20">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Building2 className="h-5 w-5" />
                </span>
                <div>
                  <DialogTitle className="text-xl font-bold tracking-tight">
                    Assign to Institutions
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                    Select target schools with instant search, city filtering, and reassignment control.
                  </DialogDescription>
                </div>
              </div>
            </div>

            {/* Assessment summary pill */}
            <div className="text-right flex flex-col items-end gap-1">
              <span className="text-sm font-semibold text-foreground max-w-[240px] truncate" title={assessment?.title}>
                {assessment?.title}
              </span>
              <div className="flex items-center gap-1.5 flex-wrap justify-end">
                {assessment?.tier && (
                  <Badge variant="secondary" className="text-[10px] uppercase font-mono tracking-wider">
                    {assessment.tier}
                  </Badge>
                )}
                {grades.length > 0 && (
                  <Badge variant="outline" className="text-[10px] text-muted-foreground">
                    Grades {grades.join(", ")}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3.5 text-xs rounded-xl bg-destructive/10 text-destructive border border-destructive/20 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 text-xs rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Search and Filters Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
            <div className="relative sm:col-span-6">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by school name, code or city..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 text-xs rounded-xl"
              />
            </div>

            <div className="sm:col-span-3">
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="w-full h-9 rounded-xl border border-input bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="all">All Cities ({uniqueCities.length})</option>
                {uniqueCities.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-3">
              <select
                value={selectedStatusFilter}
                onChange={(e: any) => setSelectedStatusFilter(e.target.value)}
                className="w-full h-9 rounded-xl border border-input bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="all">All Statuses</option>
                <option value="assigned">Currently Assigned</option>
                <option value="unassigned">Unassigned</option>
                <option value="recent">Has Recent Attempts</option>
              </select>
            </div>
          </div>

          {/* Selection Control Bar */}
          <div className="flex items-center justify-between gap-2 px-1 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleSelectAllFiltered}
                disabled={filteredSchools.length === 0}
                className="h-7 text-xs px-2"
              >
                Select Filtered ({filteredSchools.length})
              </Button>
              <span>•</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleDeselectAllFiltered}
                disabled={selectedSchoolIds.size === 0}
                className="h-7 text-xs px-2 text-muted-foreground hover:text-foreground"
              >
                Clear Selection
              </Button>
            </div>

            <span className="font-medium text-foreground">
              Selected: <span className="text-primary font-bold">{selectedSchoolIds.size}</span> of {schools.length}
            </span>
          </div>

          {/* Reassignment Advisory Banner */}
          {selectedSchoolsWithRecent.length > 0 && (
            <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 space-y-2.5">
              <div className="flex items-start gap-2.5 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-xs font-semibold">
                    Recent Completions Detected ({totalRecentInSelection} student attempts across {selectedSchoolsWithRecent.length} selected school{selectedSchoolsWithRecent.length > 1 ? "s" : ""})
                  </p>
                  <p className="text-[11px] text-amber-700/80 dark:text-amber-300/80 leading-relaxed">
                    Students at these schools have taken this check-in within the last 30 days. Decide how to proceed with the assignment:
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setReassignMode(false)}
                  className={`p-2.5 rounded-lg border text-left text-xs transition-all ${
                    !reassignMode
                      ? "border-primary bg-primary/10 text-primary font-medium shadow-sm"
                      : "border-border bg-card/60 text-muted-foreground hover:bg-muted/30"
                  }`}
                >
                  <div className="font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Assign Only (Keep Results)
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    Assigns to schools without resetting any student attempts. Students who finished cannot retake.
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setReassignMode(true)}
                  className={`p-2.5 rounded-lg border text-left text-xs transition-all ${
                    reassignMode
                      ? "border-amber-500 bg-amber-500/20 text-amber-700 dark:text-amber-300 font-medium shadow-sm"
                      : "border-border bg-card/60 text-muted-foreground hover:bg-muted/30"
                  }`}
                >
                  <div className="font-semibold flex items-center gap-1.5">
                    <RotateCcw className="h-3.5 w-3.5" />
                    Reassign & Unlock Retake
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    Archives past attempts safely (preserving history for student dossiers) and unlocks test for fresh retake.
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* School List Table */}
          <div className="border rounded-xl overflow-hidden bg-background divide-y">
            {loading ? (
              <div className="p-12 text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-2">
                <RefreshCw className="h-5 w-5 animate-spin text-primary" />
                <span>Loading institutions and check-in telemetry...</span>
              </div>
            ) : filteredSchools.length === 0 ? (
              <div className="p-12 text-center text-xs text-muted-foreground">
                No institutions match your search or filter criteria.
              </div>
            ) : (
              <div className="max-h-[320px] overflow-y-auto divide-y">
                {filteredSchools.map((s) => {
                  const isSelected = selectedSchoolIds.has(s.school_id)
                  return (
                    <div
                      key={s.school_id}
                      onClick={() => handleToggleSelect(s.school_id)}
                      className={`flex items-center justify-between p-3 cursor-pointer transition-colors text-xs select-none ${
                        isSelected ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-muted/30"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleToggleSelect(s.school_id)}
                          onClick={(e: React.MouseEvent) => e.stopPropagation()}
                        />
                        <div className="space-y-0.5">
                          <div className="font-medium text-foreground flex items-center gap-2">
                            <span>{s.school_name}</span>
                            <Badge variant="outline" className="text-[10px] font-mono py-0 h-4">
                              {s.school_code}
                            </Badge>
                          </div>
                          {s.city && (
                            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              <span>{s.city}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {s.recent_attempts > 0 ? (
                          <Badge
                            variant="secondary"
                            className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                          >
                            <Users className="h-3 w-3 mr-1" />
                            {s.recent_attempts} recent
                          </Badge>
                        ) : null}

                        {s.is_assigned ? (
                          <Badge
                            variant="default"
                            className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                          >
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Assigned
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-muted-foreground">
                            Not Assigned
                          </Badge>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="p-4 border-t bg-muted/20 flex items-center justify-between sm:justify-between">
          <div className="text-xs text-muted-foreground">
            {reassignMode ? (
              <span className="text-amber-600 dark:text-amber-400 font-medium">
                Reassign mode active: past completions will be archived for retake.
              </span>
            ) : (
              <span>Existing completions will remain untouched.</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button
              type="button"
              variant={reassignMode ? "default" : "default"}
              size="sm"
              onClick={handleSubmit}
              disabled={submitting || loading}
              className={reassignMode ? "bg-amber-600 hover:bg-amber-700 text-white" : ""}
            >
              {submitting ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  Saving...
                </>
              ) : reassignMode ? (
                <>
                  <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                  Reassign to {selectedSchoolIds.size} Schools
                </>
              ) : (
                <>
                  <Building2 className="h-3.5 w-3.5 mr-1.5" />
                  Save Assignments ({selectedSchoolIds.size})
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
