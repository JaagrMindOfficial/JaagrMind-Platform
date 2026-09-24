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
  Users,
  RefreshCw,
  Home,
  Check,
  Layers,
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
    auto_assign_schools?: boolean
    publish_to_schools?: boolean
    publish_to_parents?: boolean
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

  // Assignment scope & portal distribution
  const [schoolScope, setSchoolScope] = useState<"all" | "specific">("all")
  const [publishToParents, setPublishToParents] = useState(true)

  // Filters & selection
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCity, setSelectedCity] = useState("all")
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<"all" | "assigned" | "unassigned" | "recent">("all")
  const [selectedSchoolIds, setSelectedSchoolIds] = useState<Set<string>>(new Set())

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
      setSearchTerm("")
      setSelectedCity("all")
      setSelectedStatusFilter("all")

      // Initialize scope from assessment
      const isUniversal = assessment.auto_assign_schools !== false
      setSchoolScope(isUniversal ? "all" : "specific")
      setPublishToParents(assessment.publish_to_parents !== false)

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
      if (schoolScope === "specific") {
        if (selectedStatusFilter === "assigned") matchesStatus = selectedSchoolIds.has(s.school_id)
        else if (selectedStatusFilter === "unassigned") matchesStatus = !selectedSchoolIds.has(s.school_id)
        else if (selectedStatusFilter === "recent") matchesStatus = s.recent_attempts > 0
      } else {
        if (selectedStatusFilter === "recent") matchesStatus = s.recent_attempts > 0
      }

      return matchesSearch && matchesCity && matchesStatus
    })
  }, [schools, searchTerm, selectedCity, selectedStatusFilter, schoolScope, selectedSchoolIds])

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

  const handleSelectAllSchools = () => {
    setSelectedSchoolIds(new Set(schools.map((s) => s.school_id)))
  }

  const handleDeselectAll = () => {
    setSelectedSchoolIds(new Set())
  }

  const handleSubmit = async () => {
    if (!assessment?.id) return
    setSubmitting(true)
    setError("")
    setSuccessMsg("")

    try {
      const isAll = schoolScope === "all"
      await api.post(`/api/admin/assessments/${assessment.id}/assign-schools`, {
        autoAssignSchools: isAll,
        publishToSchools: true,
        publishToParents: publishToParents,
        schoolIds: isAll ? [] : Array.from(selectedSchoolIds),
      })

      setSuccessMsg(
        isAll
          ? "Successfully assigned to all schools & updated distribution!"
          : `Successfully assigned to ${selectedSchoolIds.size} specific school(s) & updated distribution!`
      )

      setTimeout(() => {
        onSuccess?.()
        onClose()
      }, 1000)
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || "Failed to update assignments")
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
                    Assignment & Distribution
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                    Configure school campus availability and parent portal distribution.
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
                <Badge
                  variant="outline"
                  className={
                    schoolScope === "all"
                      ? "text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                      : "text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                  }
                >
                  {schoolScope === "all" ? "All Schools" : "Specific Schools"}
                </Badge>
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
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
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

          {/* Section 1: School Campus Assignment Scope */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5" /> School Campus Assignment
              </span>
              <span className="text-[11px] text-muted-foreground">
                {schoolScope === "all" ? "Enabled across all campuses" : `Assigned to ${selectedSchoolIds.size} of ${schools.length} schools`}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Option A: All Schools */}
              <button
                type="button"
                onClick={() => setSchoolScope("all")}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  schoolScope === "all"
                    ? "border-primary bg-primary/10 shadow-sm"
                    : "border-border bg-card/60 hover:bg-muted/30"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-semibold flex items-center gap-1.5 ${schoolScope === "all" ? "text-primary" : "text-foreground"}`}>
                    <Building2 className="h-4 w-4" />
                    All Schools (Default)
                  </span>
                  {schoolScope === "all" && <Check className="h-4 w-4 text-primary" />}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                  Automatically available to all registered school campuses. Counselors and admins can schedule check-ins immediately.
                </p>
              </button>

              {/* Option B: Specific Schools */}
              <button
                type="button"
                onClick={() => setSchoolScope("specific")}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  schoolScope === "specific"
                    ? "border-amber-500 bg-amber-500/10 shadow-sm"
                    : "border-border bg-card/60 hover:bg-muted/30"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-semibold flex items-center gap-1.5 ${schoolScope === "specific" ? "text-amber-600 dark:text-amber-400" : "text-foreground"}`}>
                    <Layers className="h-4 w-4" />
                    Specific Schools
                  </span>
                  {schoolScope === "specific" && <Check className="h-4 w-4 text-amber-600 dark:text-amber-400" />}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                  Restrict access to designated institutions only. Hand-pick campuses using search or one-click selection.
                </p>
              </button>
            </div>
          </div>

          {/* Search, Filter & School List */}
          <div className="space-y-3 pt-1">
            {/* Search and Filters Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
              <div className={`relative ${schoolScope === "specific" ? "sm:col-span-6" : "sm:col-span-8"}`}>
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by school name, code or city..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-9 text-xs rounded-xl"
                />
              </div>

              <div className={`sm:col-span-${schoolScope === "specific" ? "3" : "4"}`}>
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

              {schoolScope === "specific" && (
                <div className="sm:col-span-3">
                  <select
                    value={selectedStatusFilter}
                    onChange={(e: any) => setSelectedStatusFilter(e.target.value)}
                    className="w-full h-9 rounded-xl border border-input bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="all">All Statuses</option>
                    <option value="assigned">Assigned</option>
                    <option value="unassigned">Unassigned</option>
                    <option value="recent">Has Recent Attempts</option>
                  </select>
                </div>
              )}
            </div>

            {/* Selection Controls for Specific Scope */}
            {schoolScope === "specific" ? (
              <div className="flex items-center justify-between gap-2 px-1 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleSelectAllSchools}
                    disabled={selectedSchoolIds.size === schools.length}
                    className="h-7 text-xs px-2 text-primary hover:text-primary"
                  >
                    Select All Schools ({schools.length})
                  </Button>
                  <span>•</span>
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
                    onClick={handleDeselectAll}
                    disabled={selectedSchoolIds.size === 0}
                    className="h-7 text-xs px-2 text-muted-foreground hover:text-foreground"
                  >
                    Clear Selection
                  </Button>
                </div>

                <span className="font-medium text-foreground">
                  Assigned: <span className="text-primary font-bold">{selectedSchoolIds.size}</span> of {schools.length}
                </span>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2 px-1 text-xs text-muted-foreground">
                <span>
                  Showing <span className="font-semibold text-foreground">{filteredSchools.length}</span> of {schools.length} institutions
                </span>
                <Badge variant="outline" className="text-[11px] bg-blue-500/5 text-blue-600 dark:text-blue-400 border-blue-500/20">
                  Active for All Campuses
                </Badge>
              </div>
            )}

            {/* School List Table */}
            <div className="border rounded-xl overflow-hidden bg-background divide-y">
              {loading ? (
                <div className="p-10 text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-2">
                  <RefreshCw className="h-5 w-5 animate-spin text-primary" />
                  <span>Loading institutions and check-in telemetry...</span>
                </div>
              ) : filteredSchools.length === 0 ? (
                <div className="p-10 text-center text-xs text-muted-foreground">
                  No institutions match your search or filter criteria.
                </div>
              ) : (
                <div className="max-h-[260px] overflow-y-auto divide-y">
                  {filteredSchools.map((s) => {
                    const isSelected = selectedSchoolIds.has(s.school_id)
                    const isSpecific = schoolScope === "specific"

                    return (
                      <div
                        key={s.school_id}
                        onClick={() => isSpecific && handleToggleSelect(s.school_id)}
                        className={`flex items-center justify-between p-3 text-xs select-none ${
                          isSpecific ? "cursor-pointer transition-colors" : ""
                        } ${
                          isSpecific && isSelected
                            ? "bg-primary/5 hover:bg-primary/10"
                            : isSpecific
                            ? "hover:bg-muted/30"
                            : "hover:bg-muted/10"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {isSpecific ? (
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => handleToggleSelect(s.school_id)}
                              onClick={(e: React.MouseEvent) => e.stopPropagation()}
                            />
                          ) : (
                            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                              <Building2 className="h-3.5 w-3.5" />
                            </div>
                          )}
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

                          {schoolScope === "all" ? (
                            <Badge
                              variant="default"
                              className="text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                            >
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              All Schools
                            </Badge>
                          ) : isSelected ? (
                            <Badge
                              variant="default"
                              className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                            >
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Assigned
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] text-muted-foreground">
                              Unassigned
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

          {/* Section 2: Parent Portal Distribution */}
          <div className="space-y-2 pt-1 border-t">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Home className="h-3.5 w-3.5" /> Parent Portal Distribution
            </span>

            <div
              onClick={() => setPublishToParents(!publishToParents)}
              className={`p-3.5 rounded-xl border flex items-start justify-between gap-3 cursor-pointer transition-all ${
                publishToParents
                  ? "border-purple-500/30 bg-purple-500/5 hover:bg-purple-500/10"
                  : "border-border bg-card/60 hover:bg-muted/30"
              }`}
            >
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={publishToParents}
                  onCheckedChange={(val) => setPublishToParents(!!val)}
                  onClick={(e: React.MouseEvent) => e.stopPropagation()}
                  className="mt-0.5"
                />
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <span>Enable for Parent Portal</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Visible to all parents whose children are in matching grades. Parents can view and conduct standard wellness check-ins directly at home.
                  </p>
                </div>
              </div>

              <Badge
                variant="outline"
                className={`text-[10px] shrink-0 ${
                  publishToParents
                    ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
                    : "text-muted-foreground"
                }`}
              >
                {publishToParents ? "Visible to Parents" : "Hidden from Parents"}
              </Badge>
            </div>
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="p-4 border-t bg-muted/20 flex items-center justify-between sm:justify-between">
          <div className="text-xs text-muted-foreground">
            <span>
              {schoolScope === "all" ? "All Schools" : `${selectedSchoolIds.size} Specific Schools`}
              {" • "}
              {publishToParents ? "Parent Portal Active" : "Parent Portal Inactive"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSubmit}
              disabled={submitting || loading}
            >
              {submitting ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="h-3.5 w-3.5 mr-1.5" />
                  Save Assignment & Distribution
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
