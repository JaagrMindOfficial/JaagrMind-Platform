"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Plus, 
  Eye, 
  Edit, 
  Trash2, 
  Star, 
  ListChecks, 
  BookOpen, 
  Clock, 
  CheckCircle2, 
  Link2,
  Palette,
  Building2,
  Home,
  Search,
  Filter,
  Copy,
  ArrowUpRight,
  History,
  Presentation,
  Leaf,
  Wind,
  Sun,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AssessmentEditorDialog, AssessmentFormData } from "@/components/assessment-editor-dialog"
import { AssignSchoolsDialog } from "@/components/assign-schools-dialog"
import { GenerateCheckinLinkDialog } from "@/components/admin/generate-checkin-link-dialog"
import { ADMIN_AVAILABLE_THEMES, useAssessmentTheme, AssessmentThemeId } from "@/lib/assessment-theme"
import { api } from "@/lib/api"

interface Assessment {
  id: string
  title: string
  description: string
  is_default: boolean
  questions: any
  buckets: any
  custom_sections: any
  sections: any
  question_count?: number
  is_active: boolean
  publish_to_schools?: boolean
  publish_to_parents?: boolean
  auto_assign_schools?: boolean
  created_at: string
}

export default function AdminAssessmentsPage() {
  const router = useRouter()
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [channelFilter, setChannelFilter] = useState<"all" | "schools" | "parents" | "specific">("all")
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "draft">("all")
  const [copiedCheckin, setCopiedCheckin] = useState(false)
  const { currentThemeId, theme, setThemeId } = useAssessmentTheme()
  const [isThemeSettingsOpen, setIsThemeSettingsOpen] = useState(false)

  // Generate Random Check-in Link Dialog State
  const [isGenerateLinkOpen, setIsGenerateLinkOpen] = useState(false)
  const [selectedAssessmentForLink, setSelectedAssessmentForLink] = useState<Assessment | undefined>(undefined)

  const handleOpenGenerateLink = (a?: Assessment) => {
    setSelectedAssessmentForLink(a)
    setIsGenerateLinkOpen(true)
  }

  // Editor Dialog State
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [editingAssessment, setEditingAssessment] = useState<any>(null)

  // View Items Modal State
  const [isViewOpen, setIsViewOpen] = useState(false)
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null)

  // Assign to Schools Dialog State
  const [isAssignOpen, setIsAssignOpen] = useState(false)
  const [assigningAssessment, setAssigningAssessment] = useState<Assessment | null>(null)

  const openAssignModal = (a: Assessment) => {
    setAssigningAssessment(a)
    setIsAssignOpen(true)
  }

  const fetchAssessments = async () => {
    setLoading(true)
    try {
      const data = await api.get("/api/admin/assessments")
      setAssessments(data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAssessments()
  }, [])

  const handleOpenCreate = () => {
    setEditingAssessment(null)
    setIsEditorOpen(true)
  }

  const handleOpenEdit = async (a: Assessment) => {
    try {
      const full = await api.get(`/api/admin/assessments/${a.id}`)
      setEditingAssessment(full || a)
    } catch {
      setEditingAssessment(a)
    }
    setIsEditorOpen(true)
  }

  const handleSaveAssessment = async (data: AssessmentFormData) => {
    if (data.id) {
      await api.put(`/api/admin/assessments/${data.id}`, data)
    } else {
      await api.post("/api/admin/assessments", data)
    }
    fetchAssessments()
  }

  const openViewModal = (a: Assessment) => {
    setSelectedAssessment(a)
    setIsViewOpen(true)
  }

  const toggleActiveStatus = async (assessment: Assessment) => {
    try {
      await api.put(`/api/admin/assessments/${assessment.id}`, {
        ...assessment,
        is_active: !assessment.is_active
      })
      fetchAssessments()
    } catch (err) {
      alert("Failed to update status")
    }
  }

  const handleSetDefault = async (assessment: Assessment) => {
    if (assessment.is_default) return
    try {
      await api.put(`/api/admin/assessments/${assessment.id}/set-default`)
      fetchAssessments()
    } catch (err) {
      alert("Failed to set default assessment")
    }
  }

  const handleDelete = async (assessment: Assessment) => {
    if (assessment.is_default) {
      alert("Cannot delete the default assessment")
      return
    }
    if (typeof window !== "undefined" && !window.confirm(`Are you sure you want to delete "${assessment.title}"?`)) {
      return
    }
    try {
      await api.delete(`/api/admin/assessments/${assessment.id}`)
      fetchAssessments()
    } catch (err) {
      alert("Failed to delete assessment")
    }
  }

  const getQuestionCount = (a: Assessment) => {
    if (a.question_count && a.question_count > 0) return a.question_count
    if (Array.isArray(a.questions) && a.questions.length > 0) return a.questions.length
    if (Array.isArray(a.sections)) {
      return a.sections.reduce((acc: number, sec: any) => acc + (sec.questions?.length || 0), 0)
    }
    return 0
  }

  // Extract flattened questions for viewing modal
  const getViewQuestions = () => {
    if (!selectedAssessment) return []
    if (Array.isArray(selectedAssessment.questions) && selectedAssessment.questions.length > 0) {
      return selectedAssessment.questions
    }
    if (Array.isArray(selectedAssessment.sections)) {
      const list: any[] = []
      for (const sec of selectedAssessment.sections) {
        if (Array.isArray(sec.questions)) {
          for (const q of sec.questions) {
            list.push({ ...q, sectionName: sec.title || q.section })
          }
        }
      }
      return list
    }
    return []
  }

  const schoolsCount = assessments.filter(a => a.publish_to_schools !== false).length
  const parentsCount = assessments.filter(a => a.publish_to_parents !== false).length
  const specificSchoolsCount = assessments.filter(a => a.publish_to_schools !== false && a.auto_assign_schools === false).length

  const filteredAssessments = assessments.filter((a) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const matchesTitle = a.title.toLowerCase().includes(q)
      const matchesDesc = (a.description || "").toLowerCase().includes(q)
      if (!matchesTitle && !matchesDesc) return false
    }
    if (statusFilter === "active" && !a.is_active) return false
    if (statusFilter === "draft" && a.is_active) return false
    if (channelFilter === "schools" && a.publish_to_schools === false) return false
    if (channelFilter === "parents" && a.publish_to_parents === false) return false
    if (channelFilter === "specific" && (a.publish_to_schools === false || a.auto_assign_schools !== false)) return false
    return true
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Check-in Templates</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage student check-in templates, inspect items, preview flows, and configure defaults.
          </p>
        </div>
        
        <Button size="sm" onClick={handleOpenCreate}>
          <Plus className="mr-1.5 h-3.5 w-3.5" /> Create Check-in
        </Button>
      </div>

      {/* Dynamic Random Check-in Link Generator Card */}
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 py-2.5 px-4 sm:px-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-foreground flex items-center gap-1.5">
              <Link2 className="h-4 w-4 text-emerald-500" />
              Generate Random Check-in Link
            </span>
            <Badge variant="outline" className="text-[10px] px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-medium">
              Unique Per Candidate
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Create secure, randomized check-in links for cohorts with automatic report delivery.
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 flex-wrap">
          <Link href="/facilitator">
            <Button
              size="sm"
              variant="outline"
              className="text-xs gap-1.5 border-primary/40 text-primary hover:bg-primary/10 cursor-pointer"
            >
              <Presentation className="h-3.5 w-3.5" />
              <span>Workshop Mode</span>
            </Button>
          </Link>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleOpenGenerateLink(undefined)}
            className="text-xs gap-1.5 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10 cursor-pointer"
          >
            <History className="h-3.5 w-3.5" />
            <span>Active Links</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsThemeSettingsOpen(true)}
            className="text-xs gap-1.5 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10 cursor-pointer"
          >
            {theme.id === "duo-green" ? (
              <Leaf className="h-3.5 w-3.5 text-[#58cc02] shrink-0" />
            ) : theme.id === "spark-blue" ? (
              <Wind className="h-3.5 w-3.5 text-[#1cb0f6] shrink-0" />
            ) : (
              <Sun className="h-3.5 w-3.5 text-[#ff9600] shrink-0" />
            )}
            <span>Theme: {theme.name}</span>
          </Button>
          <Button
            size="sm"
            onClick={() => handleOpenGenerateLink(undefined)}
            className="text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-xs"
          >
            <Link2 className="h-3.5 w-3.5" />
            <span>Generate Link</span>
          </Button>
        </div>
      </div>

      {/* Search and Channel Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-card p-3 rounded-xl border">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Channel Filters */}
          <div className="flex items-center rounded-lg border bg-muted/40 p-1 text-xs">
            <button
              onClick={() => setChannelFilter("all")}
              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                channelFilter === "all"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All ({assessments.length})
            </button>
            <button
              onClick={() => setChannelFilter("schools")}
              className={`px-2.5 py-1 rounded-md font-medium transition-all flex items-center gap-1 ${
                channelFilter === "schools"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Building2 className="h-3 w-3" /> Schools ({schoolsCount})
            </button>
            <button
              onClick={() => setChannelFilter("parents")}
              className={`px-2.5 py-1 rounded-md font-medium transition-all flex items-center gap-1 ${
                channelFilter === "parents"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Home className="h-3 w-3" /> Parents ({parentsCount})
            </button>
            <button
              onClick={() => setChannelFilter("specific")}
              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                channelFilter === "specific"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Specific Schools ({specificSchoolsCount})
            </button>
          </div>

          {/* Status Filter */}
          <div className="flex items-center rounded-lg border bg-muted/40 p-1 text-xs">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                statusFilter === "all"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setStatusFilter("active")}
              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                statusFilter === "active"
                  ? "bg-background text-emerald-600 dark:text-emerald-400 shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setStatusFilter("draft")}
              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                statusFilter === "draft"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Draft
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="h-24 bg-muted/50 rounded-t-xl" />
              <CardContent className="h-32" />
            </Card>
          ))}
        </div>
      ) : assessments.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center h-[260px] text-muted-foreground">
            <BookOpen className="h-10 w-10 mb-4 opacity-50" />
            <p>No check-in templates found.</p>
          </CardContent>
        </Card>
      ) : filteredAssessments.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center h-[200px] text-muted-foreground space-y-2">
            <p className="text-sm">No check-in templates match the active filter criteria.</p>
            <Button variant="outline" size="sm" onClick={() => { setSearchQuery(""); setChannelFilter("all"); setStatusFilter("all"); }}>
              Reset Filters
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAssessments.map((a) => {
            const count = getQuestionCount(a)
            return (
              <Card key={a.id} className="flex flex-col justify-between border transition-all hover:border-primary/40 hover:shadow-xs">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start mb-2 gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {a.is_default && (
                        <Badge variant="default" className="bg-amber-500/15 text-amber-600 dark:text-amber-400 hover:bg-amber-500/25 border-amber-500/30 gap-1 text-[11px]">
                          <Star className="h-3 w-3 fill-current" /> Default
                        </Badge>
                      )}
                      <Badge 
                        variant={a.is_active ? "default" : "secondary"} 
                        className={a.is_active ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 text-[11px]" : "text-[11px]"}
                      >
                        {a.is_active ? "Active" : "Draft"}
                      </Badge>
                    </div>
                    <span className="text-[11px] font-mono text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-md">
                      {count} items
                    </span>
                  </div>
                  <CardTitle className="text-lg leading-snug">{a.title}</CardTitle>
                  <CardDescription className="line-clamp-2 mt-1 text-xs">{a.description || "No description provided."}</CardDescription>

                  {/* Channel Badges */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-2">
                    {a.publish_to_schools !== false ? (
                      <Badge 
                        variant="outline" 
                        className={`text-[10px] gap-1 px-1.5 py-0.5 ${
                          a.auto_assign_schools !== false
                            ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                            : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                        }`}
                      >
                        <Building2 className="h-3 w-3" />
                        {a.auto_assign_schools !== false ? "All Schools" : "Specific Schools"}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] bg-muted/60 text-muted-foreground border-border px-1.5 py-0.5">
                        No Schools
                      </Badge>
                    )}

                    {a.publish_to_parents !== false && (
                      <Badge variant="outline" className="text-[10px] bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 gap-1 px-1.5 py-0.5">
                        <Home className="h-3 w-3" /> Parents
                      </Badge>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="pt-0 space-y-4">
                  <div className="flex items-center gap-3 text-xs text-muted-foreground pt-2 border-t">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" /> ~10 mins
                    </span>
                    <span>•</span>
                    <span>Created {new Date(a.created_at).toLocaleDateString()}</span>
                  </div>

                  {/* Complete Assessment Action Buttons */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => openViewModal(a)}
                      className="text-xs h-8"
                    >
                      <ListChecks className="mr-1.5 h-3.5 w-3.5" /> View Items
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => router.push(`/preview/assessment/${a.id}`)}
                      className="text-xs h-8"
                    >
                      <Eye className="mr-1.5 h-3.5 w-3.5" /> Preview
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleOpenGenerateLink(a)}
                      className="text-xs h-8 text-emerald-700 dark:text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/10 font-medium col-span-2 gap-1.5 cursor-pointer"
                    >
                      <Link2 className="h-3.5 w-3.5 text-emerald-500" /> Generate Direct Link
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => openAssignModal(a)}
                      className="text-xs h-8 text-primary border-primary/30 hover:bg-primary/10 hover:text-primary font-medium col-span-2"
                    >
                      <Building2 className="mr-1.5 h-3.5 w-3.5" /> Assign & Distribution
                    </Button>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1 border-t">
                    <div className="flex gap-1.5">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleOpenEdit(a)}
                        className="text-xs h-7 px-2 text-muted-foreground hover:text-foreground"
                      >
                        <Edit className="h-3 w-3 mr-1" /> Edit
                      </Button>
                      {!a.is_default && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleSetDefault(a)}
                          className="text-xs h-7 px-2 text-muted-foreground hover:text-amber-500"
                        >
                          <Star className="h-3 w-3 mr-1" /> Set Default
                        </Button>
                      )}
                      {!a.is_default && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleDelete(a)}
                          className="text-xs h-7 px-2 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3 mr-1" /> Delete
                        </Button>
                      )}
                    </div>

                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => toggleActiveStatus(a)}
                      className="text-[11px] h-7 px-2"
                    >
                      {a.is_active ? "Deactivate" : "Activate"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* View Items Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="sm:max-w-2xl w-full max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ListChecks className="h-5 w-5 text-primary" />
              <span>{selectedAssessment?.title} — Question Items</span>
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 pr-1 space-y-4 py-2">
            {getViewQuestions().length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No questions loaded for this template.</p>
            ) : (
              getViewQuestions().map((q: any, i: number) => (
                <div key={i} className="p-3.5 rounded-xl border bg-muted/20 space-y-2">
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-xs font-mono font-semibold text-primary">#{i + 1}</span>
                    <Badge variant="outline" className="text-[10px]">
                      {q.sectionName || q.section || "General"}
                    </Badge>
                  </div>
                  <p className="text-sm font-medium leading-snug">{q.text}</p>
                  {Array.isArray(q.options) && (
                    <div className="grid grid-cols-2 gap-1.5 pt-1">
                      {q.options.map((opt: any, oIdx: number) => (
                        <div key={oIdx} className="text-xs text-muted-foreground bg-background/60 p-2 rounded-lg border flex justify-between">
                          <span>{opt.label}</span>
                          <span className="font-mono text-[10px] text-primary">{opt.marks} pts</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
          <div className="pt-2 border-t flex justify-end">
            <Button size="sm" onClick={() => setIsViewOpen(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Full-Featured Dual-Mode Assessment Editor Dialog */}
      <AssessmentEditorDialog
        open={isEditorOpen}
        onOpenChange={setIsEditorOpen}
        initialData={editingAssessment}
        onSave={handleSaveAssessment}
      />

      {/* Assign Schools Dialog */}
      <AssignSchoolsDialog
        isOpen={isAssignOpen}
        onClose={() => setIsAssignOpen(false)}
        onSuccess={() => fetchAssessments()}
        assessment={assigningAssessment}
      />

      {/* Generate Random Check-in Link Dialog */}
      <GenerateCheckinLinkDialog
        open={isGenerateLinkOpen}
        onOpenChange={setIsGenerateLinkOpen}
        assessments={assessments}
        defaultAssessmentId={selectedAssessmentForLink?.id}
      />

      {/* Check-in Experience & Atmosphere Theme Dialog */}
      <Dialog open={isThemeSettingsOpen} onOpenChange={setIsThemeSettingsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Palette className="h-4 w-4 text-emerald-500" />
              <span>Default Check-in Scenery &amp; Atmosphere</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Select the atmosphere theme for all student check-ins and generated links. Students will experience animated scenery, mascots, and styling based on your selection (they cannot change this theme).
            </p>
            <div className="space-y-2.5">
              {ADMIN_AVAILABLE_THEMES.map((th) => (
                <div
                  key={th.id}
                  onClick={() => setThemeId(th.id)}
                  className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                    currentThemeId === th.id
                      ? "border-emerald-500 bg-emerald-500/5 shadow-xs"
                      : "border-border/60 hover:border-border hover:bg-muted/30"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-muted/60 border shrink-0">
                      {th.id === "duo-green" ? (
                        <Leaf className="h-5 w-5 text-[#58cc02]" />
                      ) : th.id === "spark-blue" ? (
                        <Wind className="h-5 w-5 text-[#1cb0f6]" />
                      ) : (
                        <Sun className="h-5 w-5 text-[#ff9600]" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-foreground">{th.name}</span>
                        {currentThemeId === th.id && (
                          <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                            Active Default
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{th.subtitle}</p>
                    </div>
                  </div>
                  <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center ${
                    currentThemeId === th.id
                      ? "border-emerald-500 bg-emerald-500 text-white"
                      : "border-border"
                  }`}>
                    {currentThemeId === th.id && <CheckCircle2 className="h-3.5 w-3.5" />}
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 flex justify-between items-center border-t">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={() => setIsThemeSettingsOpen(false)}
              >
                Close
              </Button>
              <Button
                size="sm"
                className="text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                onClick={() => {
                  setIsThemeSettingsOpen(false)
                  window.open(`/preview/assessment/default?theme=${currentThemeId}`, "_blank")
                }}
              >
                <Eye className="h-3.5 w-3.5" />
                <span>Live Preview Theme</span>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
