"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { 
  Code, 
  LayoutGrid, 
  Plus, 
  Trash2, 
  ChevronUp, 
  ChevronDown, 
  Copy, 
  Sparkles, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  Sliders, 
  Layers, 
  Search,
  Home,
  Building2
} from "lucide-react"

export interface QuestionOption {
  label: string
  marks: number
}

export interface QuestionItem {
  text: string
  section: string
  sectionName?: string
  options: QuestionOption[]
}

export interface BucketItem {
  name: string
  min_score: number
  max_score: number
}

export interface AssessmentFormData {
  id?: string
  title: string
  description: string
  is_active: boolean
  is_default?: boolean
  tier?: string
  min_grade?: number
  max_grade?: number
  target_grades?: string[]
  time_per_question: number
  total_time: number
  inactivity_alert_time: number
  inactivity_end_time: number
  questions: QuestionItem[]
  buckets: BucketItem[]
  section_buckets: boolean
  publish_to_schools?: boolean
  publish_to_parents?: boolean
  auto_assign_schools?: boolean
}

interface AssessmentEditorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialData?: any
  onSave: (data: AssessmentFormData) => Promise<void>
}

const DEFAULT_SECTIONS: { code: string; name: string }[] = [
  { code: "A", name: "Focus & Attention" },
  { code: "B", name: "Self-Esteem & Inner Confidence" },
  { code: "C", name: "Social Confidence & Interaction" },
  { code: "D", name: "Digital Hygiene & Self-Control" },
]

const DEFAULT_OPTIONS: QuestionOption[] = [
  { label: "Not true for me", marks: 1 },
  { label: "Sometimes true", marks: 2 },
  { label: "Often true", marks: 3 },
  { label: "Almost always true", marks: 4 },
]

const DEFAULT_BUCKETS: BucketItem[] = [
  { name: "Skill Stable", min_score: 25, max_score: 32 },
  { name: "Skill Emerging", min_score: 17, max_score: 24 },
  { name: "Skill Support Needed", min_score: 8, max_score: 16 },
]

export function AssessmentEditorDialog({
  open,
  onOpenChange,
  initialData,
  onSave,
}: AssessmentEditorDialogProps) {
  const [mode, setMode] = useState<"visual" | "json">("visual")
  const [activeTab, setActiveTab] = useState<"questions" | "settings" | "buckets">("questions")
  const [sectionFilter, setSectionFilter] = useState("ALL")
  const [searchQuery, setSearchQuery] = useState("")

  const [formData, setFormData] = useState<AssessmentFormData>({
    title: "",
    description: "",
    is_active: true,
    tier: "all",
    min_grade: 1,
    max_grade: 12,
    target_grades: ["6", "7", "8", "9", "10", "11", "12"],
    time_per_question: 30,
    total_time: 600,
    inactivity_alert_time: 40,
    inactivity_end_time: 120,
    questions: [],
    buckets: DEFAULT_BUCKETS,
    section_buckets: true,
    publish_to_schools: true,
    publish_to_parents: true,
    auto_assign_schools: true,
  })

  const [jsonText, setJsonText] = useState("")
  const [jsonError, setJsonError] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  // Initialize data when dialog opens or initialData changes
  useEffect(() => {
    if (!open) return

    let qList: QuestionItem[] = []
    if (initialData?.questions && Array.isArray(initialData.questions)) {
      qList = initialData.questions.map((q: any) => ({
        text: q.text || "",
        section: q.section || "A",
        sectionName: q.sectionName || getSectionName(q.section || "A"),
        options: Array.isArray(q.options) && q.options.length > 0 
          ? q.options.map((o: any) => ({ label: o.label || "", marks: Number(o.marks ?? 1) }))
          : DEFAULT_OPTIONS,
      }))
    } else if (initialData?.sections && Array.isArray(initialData.sections)) {
      // Unpack nested sections format if present
      for (const s of initialData.sections) {
        if (Array.isArray(s.questions)) {
          for (const q of s.questions) {
            qList.push({
              text: q.text || "",
              section: q.section || s.section_id || s.id || "A",
              sectionName: s.title || s.name || getSectionName(q.section || "A"),
              options: Array.isArray(q.options) && q.options.length > 0
                ? q.options.map((o: any) => ({ label: o.label || "", marks: Number(o.marks ?? 1) }))
                : DEFAULT_OPTIONS,
            })
          }
        }
      }
    }

    const bList: BucketItem[] = initialData?.buckets && Array.isArray(initialData.buckets) && initialData.buckets.length > 0
      ? initialData.buckets.map((b: any) => ({
          name: b.name || b.label || "",
          min_score: Number(b.min_score ?? b.minScore ?? b.min ?? 0),
          max_score: Number(b.max_score ?? b.maxScore ?? b.max ?? 0),
        }))
      : DEFAULT_BUCKETS

    const rawTotalTime = initialData?.total_time || 600
    const totalTimeSec = rawTotalTime <= 60 ? rawTotalTime * 60 : rawTotalTime

    const data: AssessmentFormData = {
      id: initialData?.id,
      title: initialData?.title || "",
      description: initialData?.description || "",
      is_active: initialData?.is_active ?? true,
      is_default: initialData?.is_default ?? false,
      tier: initialData?.tier || "all",
      min_grade: initialData?.min_grade || 1,
      max_grade: initialData?.max_grade || 12,
      target_grades: initialData?.target_grades || ["6", "7", "8", "9", "10", "11", "12"],
      time_per_question: initialData?.time_per_question || 30,
      total_time: totalTimeSec,
      inactivity_alert_time: initialData?.inactivity_alert_time || 40,
      inactivity_end_time: initialData?.inactivity_end_time || 120,
      questions: qList,
      buckets: bList,
      section_buckets: initialData?.section_buckets ?? true,
      publish_to_schools: initialData?.publish_to_schools ?? true,
      publish_to_parents: initialData?.publish_to_parents ?? true,
      auto_assign_schools: initialData?.auto_assign_schools ?? true,
    }

    setFormData(data)
    setJsonText(JSON.stringify(data, null, 2))
    setJsonError(null)
    setValidationErrors([])
    setMode("visual")
    setActiveTab("questions")
    setSectionFilter("ALL")
    setSearchQuery("")
  }, [open, initialData])

  function getSectionName(code: string): string {
    const found = DEFAULT_SECTIONS.find(s => s.code === code)
    return found ? found.name : `Section ${code}`
  }

  // Handle Switch to JSON Mode
  const handleSwitchToJson = () => {
    setJsonText(JSON.stringify(formData, null, 2))
    setJsonError(null)
    setMode("json")
  }

  // Handle Switch to Visual Mode
  const handleSwitchToVisual = () => {
    try {
      const parsed = JSON.parse(jsonText)
      if (typeof parsed !== "object" || parsed === null) {
        setJsonError("Invalid JSON: root must be an object")
        return
      }
      setFormData({
        ...formData,
        ...parsed,
        title: parsed.title || formData.title,
        description: parsed.description || formData.description,
        is_active: parsed.is_active ?? formData.is_active,
        tier: parsed.tier || formData.tier,
        min_grade: parsed.min_grade ?? formData.min_grade,
        max_grade: parsed.max_grade ?? formData.max_grade,
        target_grades: Array.isArray(parsed.target_grades) ? parsed.target_grades : formData.target_grades,
        time_per_question: parsed.time_per_question || formData.time_per_question,
        total_time: parsed.total_time || formData.total_time,
        inactivity_alert_time: parsed.inactivity_alert_time || formData.inactivity_alert_time,
        inactivity_end_time: parsed.inactivity_end_time || formData.inactivity_end_time,
        questions: Array.isArray(parsed.questions) ? parsed.questions : formData.questions,
        buckets: Array.isArray(parsed.buckets) ? parsed.buckets : formData.buckets,
        section_buckets: parsed.section_buckets ?? formData.section_buckets,
        publish_to_schools: parsed.publish_to_schools ?? formData.publish_to_schools,
        publish_to_parents: parsed.publish_to_parents ?? formData.publish_to_parents,
        auto_assign_schools: parsed.auto_assign_schools ?? formData.auto_assign_schools,
      })
      setJsonError(null)
      setMode("visual")
    } catch (e: any) {
      setJsonError(`JSON Syntax Error: ${e.message}`)
    }
  }

  // Format JSON
  const handleFormatJson = () => {
    try {
      const parsed = JSON.parse(jsonText)
      setJsonText(JSON.stringify(parsed, null, 2))
      setJsonError(null)
    } catch (e: any) {
      setJsonError(`Cannot format: ${e.message}`)
    }
  }

  // Questions Handlers
  const handleAddQuestion = (sec = "A") => {
    const newQ: QuestionItem = {
      text: "",
      section: sec,
      sectionName: getSectionName(sec),
      options: DEFAULT_OPTIONS.map(o => ({ ...o })),
    }
    setFormData(prev => ({
      ...prev,
      questions: [...prev.questions, newQ],
    }))
  }

  const handleUpdateQuestion = (index: number, field: keyof QuestionItem, value: any) => {
    setFormData(prev => {
      const copy = [...prev.questions]
      if (field === "section") {
        copy[index] = {
          ...copy[index],
          section: value,
          sectionName: getSectionName(value),
        }
      } else {
        copy[index] = { ...copy[index], [field]: value }
      }
      return { ...prev, questions: copy }
    })
  }

  const handleDeleteQuestion = (index: number) => {
    setFormData(prev => {
      const copy = [...prev.questions]
      copy.splice(index, 1)
      return { ...prev, questions: copy }
    })
  }

  const handleMoveQuestion = (index: number, direction: "up" | "down") => {
    if ((direction === "up" && index === 0) || (direction === "down" && index === formData.questions.length - 1)) {
      return
    }
    setFormData(prev => {
      const copy = [...prev.questions]
      const targetIndex = direction === "up" ? index - 1 : index + 1
      const temp = copy[index]
      copy[index] = copy[targetIndex]
      copy[targetIndex] = temp
      return { ...prev, questions: copy }
    })
  }

  const handleDuplicateQuestion = (index: number) => {
    setFormData(prev => {
      const copy = [...prev.questions]
      const original = copy[index]
      const duplicated: QuestionItem = {
        text: `${original.text} (Copy)`,
        section: original.section,
        sectionName: original.sectionName,
        options: original.options.map(o => ({ ...o })),
      }
      copy.splice(index + 1, 0, duplicated)
      return { ...prev, questions: copy }
    })
  }

  // Option Handlers
  const handleAddOption = (qIndex: number) => {
    setFormData(prev => {
      const copy = [...prev.questions]
      const currentOpts = copy[qIndex].options || []
      copy[qIndex] = {
        ...copy[qIndex],
        options: [...currentOpts, { label: `Option ${currentOpts.length + 1}`, marks: currentOpts.length + 1 }],
      }
      return { ...prev, questions: copy }
    })
  }

  const handleUpdateOption = (qIndex: number, oIndex: number, field: keyof QuestionOption, val: any) => {
    setFormData(prev => {
      const copy = [...prev.questions]
      const opts = [...copy[qIndex].options]
      opts[oIndex] = {
        ...opts[oIndex],
        [field]: field === "marks" ? Number(val) : val,
      }
      copy[qIndex] = { ...copy[qIndex], options: opts }
      return { ...prev, questions: copy }
    })
  }

  const handleDeleteOption = (qIndex: number, oIndex: number) => {
    setFormData(prev => {
      const copy = [...prev.questions]
      const opts = [...copy[qIndex].options]
      if (opts.length <= 2) return prev // keep at least 2 options
      opts.splice(oIndex, 1)
      copy[qIndex] = { ...copy[qIndex], options: opts }
      return { ...prev, questions: copy }
    })
  }

  // Bucket Handlers
  const handleAddBucket = () => {
    setFormData(prev => ({
      ...prev,
      buckets: [...prev.buckets, { name: "New Performance Bucket", min_score: 0, max_score: 10 }],
    }))
  }

  const handleUpdateBucket = (bIndex: number, field: keyof BucketItem, val: any) => {
    setFormData(prev => {
      const copy = [...prev.buckets]
      copy[bIndex] = {
        ...copy[bIndex],
        [field]: field === "name" ? val : Number(val),
      }
      return { ...prev, buckets: copy }
    })
  }

  const handleDeleteBucket = (bIndex: number) => {
    setFormData(prev => {
      const copy = [...prev.buckets]
      copy.splice(bIndex, 1)
      return { ...prev, buckets: copy }
    })
  }

  // End-to-End Validation
  const validateAssessment = (data: AssessmentFormData): string[] => {
    const errors: string[] = []

    if (!data.title.trim()) {
      errors.push("Assessment Title is required.")
    }

    if (!Array.isArray(data.questions) || data.questions.length === 0) {
      errors.push("Assessment must contain at least 1 question.")
    } else {
      data.questions.forEach((q, i) => {
        const qNum = i + 1
        if (!q.text || !q.text.trim()) {
          errors.push(`Item #${qNum}: Question statement cannot be blank.`)
        }
        if (!Array.isArray(q.options) || q.options.length < 2) {
          errors.push(`Item #${qNum}: Must have at least 2 choice options.`)
        } else {
          q.options.forEach((opt, oIdx) => {
            if (!opt.label || !opt.label.trim()) {
              errors.push(`Item #${qNum} [Option ${oIdx + 1}]: Label cannot be blank.`)
            }
            if (isNaN(opt.marks)) {
              errors.push(`Item #${qNum} [Option ${oIdx + 1}]: Points must be a valid number.`)
            }
          })
        }
      })
    }

    if (Array.isArray(data.buckets)) {
      data.buckets.forEach((b, bIdx) => {
        if (!b.name.trim()) {
          errors.push(`Bucket #${bIdx + 1}: Name cannot be blank.`)
        }
        if (b.min_score > b.max_score) {
          errors.push(`Bucket "${b.name || `#${bIdx + 1}`}": Min score (${b.min_score}) cannot exceed Max score (${b.max_score}).`)
        }
      })
    }

    return errors
  }

  // Submit Handler
  const handleSave = async () => {
    let currentData = formData

    // If currently in JSON mode, sync first
    if (mode === "json") {
      try {
        const parsed = JSON.parse(jsonText)
        currentData = {
          ...formData,
          ...parsed,
          questions: Array.isArray(parsed.questions) ? parsed.questions : formData.questions,
          buckets: Array.isArray(parsed.buckets) ? parsed.buckets : formData.buckets,
        }
      } catch (e: any) {
        setJsonError(`Cannot save: Invalid JSON format (${e.message})`)
        return
      }
    }

    const errors = validateAssessment(currentData)
    if (errors.length > 0) {
      setValidationErrors(errors)
      return
    }

    setValidationErrors([])
    setSaving(true)
    try {
      await onSave(currentData)
      onOpenChange(false)
    } catch (err: any) {
      console.error(err)
      alert(err.message || "Failed to save assessment")
    } finally {
      setSaving(false)
    }
  }

  // Filter questions for display
  const filteredQuestions = formData.questions.filter((q, idx) => {
    const matchesSection = sectionFilter === "ALL" || q.section === sectionFilter
    const matchesSearch = !searchQuery || 
      q.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      `#${idx + 1}`.includes(searchQuery)
    return matchesSection && matchesSearch
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl w-full max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden">
        
        {/* Sticky Header */}
        <DialogHeader className="px-6 py-4 border-b flex flex-row items-center justify-between space-y-0 bg-background shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold leading-none">
                {formData.id ? `Edit: ${formData.title || "Untitled Assessment"}` : "Create Assessment Template"}
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-1">
                {formData.questions.length} items • ~{Math.round(formData.total_time / 60)} mins • {mode === "visual" ? "Visual Editor" : "JSON Code Mode"}
              </p>
            </div>
          </div>

          {/* Mode Switcher Buttons */}
          <div className="flex items-center gap-2">
            <div className="flex items-center p-0.5 rounded-lg border bg-muted/40">
              <Button
                type="button"
                variant={mode === "visual" ? "default" : "ghost"}
                size="sm"
                className="h-7 text-xs px-2.5"
                onClick={() => mode !== "visual" && handleSwitchToVisual()}
              >
                <LayoutGrid className="h-3.5 w-3.5 mr-1" /> Visual Builder
              </Button>
              <Button
                type="button"
                variant={mode === "json" ? "default" : "ghost"}
                size="sm"
                className="h-7 text-xs px-2.5"
                onClick={() => mode !== "json" && handleSwitchToJson()}
              >
                <Code className="h-3.5 w-3.5 mr-1" /> Raw JSON
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Validation Errors Alert Banner */}
        {validationErrors.length > 0 && (
          <div className="px-6 py-3 bg-destructive/10 border-b border-destructive/20 text-xs text-destructive flex items-start gap-2 max-h-28 overflow-y-auto">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold">Please resolve the following before saving ({validationErrors.length}):</p>
              <ul className="list-disc pl-4 space-y-0.5">
                {validationErrors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-muted/10">
          {mode === "visual" ? (
            <div className="space-y-6">
              
              {/* Secondary Navigation Tabs */}
              <div className="flex border-b gap-4 text-xs font-medium pb-2">
                <button
                  type="button"
                  onClick={() => setActiveTab("questions")}
                  className={`pb-1 border-b-2 transition-colors ${
                    activeTab === "questions" 
                      ? "border-primary text-primary font-semibold" 
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Questions ({formData.questions.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("settings")}
                  className={`pb-1 border-b-2 transition-colors ${
                    activeTab === "settings" 
                      ? "border-primary text-primary font-semibold" 
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Assessment Settings & Timers
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("buckets")}
                  className={`pb-1 border-b-2 transition-colors ${
                    activeTab === "buckets" 
                      ? "border-primary text-primary font-semibold" 
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Scoring & Buckets ({formData.buckets.length})
                </button>
              </div>

              {/* TAB 1: QUESTIONS */}
              {activeTab === "questions" && (
                <div className="space-y-4">
                  {/* Filter / Search Bar */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-background p-3 rounded-xl border">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Button
                        type="button"
                        variant={sectionFilter === "ALL" ? "default" : "outline"}
                        size="sm"
                        className="h-7 text-xs px-2.5"
                        onClick={() => setSectionFilter("ALL")}
                      >
                        All ({formData.questions.length})
                      </Button>
                      {DEFAULT_SECTIONS.map(s => {
                        const count = formData.questions.filter(q => q.section === s.code).length
                        return (
                          <Button
                            key={s.code}
                            type="button"
                            variant={sectionFilter === s.code ? "default" : "outline"}
                            size="sm"
                            className="h-7 text-xs px-2.5"
                            onClick={() => setSectionFilter(s.code)}
                          >
                            Sec {s.code} ({count})
                          </Button>
                        )
                      })}
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <div className="relative flex-1 sm:w-48">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                          placeholder="Search items..."
                          value={searchQuery}
                          onChange={e => setSearchQuery(e.target.value)}
                          className="h-7 pl-8 text-xs"
                        />
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        className="h-7 text-xs shrink-0"
                        onClick={() => handleAddQuestion(sectionFilter === "ALL" ? "A" : sectionFilter)}
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" /> Add Question
                      </Button>
                    </div>
                  </div>

                  {/* Questions List */}
                  {filteredQuestions.length === 0 ? (
                    <div className="p-12 text-center border border-dashed rounded-xl bg-background/50 text-xs text-muted-foreground space-y-3">
                      <p>No questions match your current filter.</p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddQuestion(sectionFilter === "ALL" ? "A" : sectionFilter)}
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" /> Add New Question
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filteredQuestions.map((q) => {
                        // Find global index in formData.questions
                        const globalIndex = formData.questions.indexOf(q)
                        return (
                          <div 
                            key={globalIndex} 
                            className="p-4 rounded-xl border bg-background space-y-3 shadow-xs hover:border-primary/40 transition-colors"
                          >
                            {/* Question Card Top Bar */}
                            <div className="flex items-center justify-between gap-2 border-b pb-2.5">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                                  #{globalIndex + 1}
                                </span>
                                <select
                                  value={q.section}
                                  onChange={e => handleUpdateQuestion(globalIndex, "section", e.target.value)}
                                  className="h-7 text-xs rounded-md border bg-muted/30 px-2 font-medium outline-none focus:ring-1 focus:ring-ring"
                                >
                                  {DEFAULT_SECTIONS.map(s => (
                                    <option key={s.code} value={s.code}>
                                      Section {s.code}: {s.name}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div className="flex items-center gap-1">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  disabled={globalIndex === 0}
                                  onClick={() => handleMoveQuestion(globalIndex, "up")}
                                  title="Move Up"
                                >
                                  <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  disabled={globalIndex === formData.questions.length - 1}
                                  onClick={() => handleMoveQuestion(globalIndex, "down")}
                                  title="Move Down"
                                >
                                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => handleDuplicateQuestion(globalIndex)}
                                  title="Duplicate"
                                >
                                  <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 hover:text-destructive"
                                  onClick={() => handleDeleteQuestion(globalIndex)}
                                  title="Delete Question"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>

                            {/* Question Statement Input */}
                            <div className="space-y-1">
                              <label className="text-[11px] font-medium text-muted-foreground">
                                Question Statement *
                              </label>
                              <Input
                                value={q.text}
                                onChange={e => handleUpdateQuestion(globalIndex, "text", e.target.value)}
                                placeholder="e.g. I feel mentally tired before I begin my work"
                                className="text-xs h-9"
                              />
                            </div>

                            {/* Options Section */}
                            <div className="space-y-2 pt-1">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="font-medium text-muted-foreground">Response Options & Scoring Weights</span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 text-[11px] px-2"
                                  onClick={() => handleAddOption(globalIndex)}
                                >
                                  <Plus className="h-3 w-3 mr-1" /> Add Option
                                </Button>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {q.options.map((opt, oIdx) => (
                                  <div key={oIdx} className="flex items-center gap-2 p-2 rounded-lg border bg-muted/20">
                                    <Input
                                      value={opt.label}
                                      onChange={e => handleUpdateOption(globalIndex, oIdx, "label", e.target.value)}
                                      placeholder={`Option ${oIdx + 1} Label`}
                                      className="text-xs h-7 bg-background"
                                    />
                                    <div className="flex items-center gap-1 shrink-0">
                                      <Input
                                        type="number"
                                        value={opt.marks}
                                        onChange={e => handleUpdateOption(globalIndex, oIdx, "marks", e.target.value)}
                                        className="w-14 text-xs h-7 text-center font-mono bg-background"
                                        title="Points"
                                      />
                                      <span className="text-[10px] text-muted-foreground">pts</span>
                                    </div>
                                    {q.options.length > 2 && (
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 shrink-0 hover:text-destructive"
                                        onClick={() => handleDeleteOption(globalIndex, oIdx)}
                                        title="Remove option"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Quick Add Button at bottom */}
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-9 text-xs border-dashed"
                    onClick={() => handleAddQuestion(sectionFilter === "ALL" ? "A" : sectionFilter)}
                  >
                    <Plus className="h-3.5 w-3.5 mr-1.5" /> Append New Question to Assessment
                  </Button>
                </div>
              )}

              {/* TAB 2: SETTINGS & TIMERS */}
              {activeTab === "settings" && (
                <div className="p-5 rounded-xl border bg-background space-y-5">
                  <div className="space-y-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">General Details</h3>
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium">Assessment Title *</label>
                        <Input
                          value={formData.title}
                          onChange={e => setFormData({ ...formData, title: e.target.value })}
                          placeholder="e.g. Student Wellness Assessment"
                          className="text-xs h-9"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium">Description</label>
                        <Textarea
                          value={formData.description}
                          onChange={e => setFormData({ ...formData, description: e.target.value })}
                          placeholder="Comprehensive check-in to evaluate mental well-being, focus, and digital hygiene..."
                          rows={3}
                          className="text-xs"
                        />
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="checkbox"
                          id="is_active_toggle"
                          checked={formData.is_active}
                          onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <label htmlFor="is_active_toggle" className="text-xs font-medium cursor-pointer">
                          Active (Visible to schools and available for assignment)
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Grade Tier Configuration & Calibration Constraints */}
                  <div className="space-y-3 border-t pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Grade Tier Constraint
                        </h3>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Enforces student grade boundaries so schools cannot assign senior check-ins to middle schoolers or vice-versa.
                        </p>
                      </div>
                      <Badge variant="outline" className="text-[10px] font-mono">
                        Tier Constraint
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {[
                        { id: "middle", label: "Middle School", grades: ["6", "7", "8"], desc: "Grades 6–8" },
                        { id: "secondary", label: "Secondary", grades: ["9", "10"], desc: "Grades 9–10" },
                        { id: "senior", label: "Senior Secondary", grades: ["11", "12"], desc: "Grades 11–12" },
                        { id: "all", label: "All Grades", grades: ["6", "7", "8", "9", "10", "11", "12"], desc: "Grades 6–12" },
                      ].map((t) => (
                        <div
                          key={t.id}
                          onClick={() => {
                            setFormData({
                              ...formData,
                              tier: t.id,
                              min_grade: Number(t.grades[0]),
                              max_grade: Number(t.grades[t.grades.length - 1]),
                              target_grades: t.grades,
                            })
                          }}
                          className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
                            (formData.tier || "all") === t.id
                              ? "border-primary bg-primary/10 ring-1 ring-primary"
                              : "border-border hover:bg-muted/40"
                          }`}
                        >
                          <div className="font-semibold text-xs text-foreground">{t.label}</div>
                          <div className="text-[11px] text-muted-foreground mt-0.5">{t.desc}</div>
                        </div>
                      ))}
                    </div>

                    <div className="text-[11px] text-muted-foreground bg-muted/30 p-2.5 rounded-lg border border-border/60">
                      <span className="font-medium text-foreground">Active Target Grades: </span>
                      {(formData.target_grades || ["6", "7", "8", "9", "10", "11", "12"]).map((g) => `Grade ${g}`).join(", ")}
                    </div>
                  </div>

                  {/* Distribution Channels & Portals */}
                  <div className="space-y-3.5 border-t pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Distribution Channels & Portals
                        </h3>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Control which portals and school campuses this check-in is published to.
                        </p>
                      </div>
                      <Badge variant="outline" className="text-[10px] font-mono">
                        Distribution
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* School Portals Channel */}
                      <div className="p-3 rounded-xl border bg-muted/15 space-y-3">
                        <div className="flex items-start gap-2.5">
                          <input
                            type="checkbox"
                            id="publish_to_schools_toggle"
                            checked={formData.publish_to_schools !== false}
                            onChange={e => {
                              const checked = e.target.checked
                              setFormData({
                                ...formData,
                                publish_to_schools: checked,
                                auto_assign_schools: checked ? (formData.auto_assign_schools ?? true) : false,
                              })
                            }}
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary mt-0.5"
                          />
                          <div className="flex-1">
                            <label htmlFor="publish_to_schools_toggle" className="text-xs font-semibold cursor-pointer flex items-center gap-1.5 text-foreground">
                              <Building2 className="h-3.5 w-3.5 text-primary" />
                              Publish to School Portals
                            </label>
                            <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                              Enables this check-in for school admins, counselors, and campus student test scheduling.
                            </p>
                          </div>
                        </div>

                        {/* All Schools vs Specific Schools toggle */}
                        {formData.publish_to_schools !== false && (
                          <div className="ml-6 pl-3 border-l-2 border-primary/30 pt-1 space-y-1 bg-background/50 p-2 rounded-md">
                            <div className="flex items-start gap-2">
                              <input
                                type="checkbox"
                                id="auto_assign_schools_toggle"
                                checked={formData.auto_assign_schools !== false}
                                onChange={e => setFormData({ ...formData, auto_assign_schools: e.target.checked })}
                                className="h-3.5 w-3.5 rounded border-gray-300 text-primary focus:ring-primary mt-0.5"
                              />
                              <div>
                                <label htmlFor="auto_assign_schools_toggle" className="text-xs font-medium cursor-pointer text-foreground">
                                  Assign to All Schools (Default)
                                </label>
                                <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">
                                  Automatically available to all registered schools. Uncheck to restrict this check-in to specific campuses via &quot;Assign &amp; Distribution&quot;.
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Parent Portal Channel */}
                      <div className="p-3 rounded-xl border bg-muted/15 flex flex-col justify-between">
                        <div className="flex items-start gap-2.5">
                          <input
                            type="checkbox"
                            id="publish_to_parents_toggle"
                            checked={formData.publish_to_parents !== false}
                            onChange={e => setFormData({ ...formData, publish_to_parents: e.target.checked })}
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary mt-0.5"
                          />
                          <div className="flex-1">
                            <label htmlFor="publish_to_parents_toggle" className="text-xs font-semibold cursor-pointer flex items-center gap-1.5 text-foreground">
                              <Home className="h-3.5 w-3.5 text-primary" />
                              Publish to Parent Portal
                            </label>
                            <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                              Permits parents to administer this standard wellness check-in directly at home for children in matching grade brackets.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 border-t pt-4">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Timers & Inactivity Thresholds</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium">Seconds / Item</label>
                        <Input
                          type="number"
                          value={formData.time_per_question}
                          onChange={e => setFormData({ ...formData, time_per_question: Number(e.target.value) })}
                          className="text-xs h-9"
                        />
                        <span className="text-[10px] text-muted-foreground">e.g. 30 sec</span>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium">Total Time (sec)</label>
                        <Input
                          type="number"
                          value={formData.total_time}
                          onChange={e => setFormData({ ...formData, total_time: Number(e.target.value) })}
                          className="text-xs h-9"
                        />
                        <span className="text-[10px] text-muted-foreground">e.g. 600 = 10 mins</span>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium">Inactivity Alert (sec)</label>
                        <Input
                          type="number"
                          value={formData.inactivity_alert_time}
                          onChange={e => setFormData({ ...formData, inactivity_alert_time: Number(e.target.value) })}
                          className="text-xs h-9"
                        />
                        <span className="text-[10px] text-muted-foreground">Warns student</span>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium">Auto-End Timeout (sec)</label>
                        <Input
                          type="number"
                          value={formData.inactivity_end_time}
                          onChange={e => setFormData({ ...formData, inactivity_end_time: Number(e.target.value) })}
                          className="text-xs h-9"
                        />
                        <span className="text-[10px] text-muted-foreground">Auto finishes</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: BUCKETS */}
              {activeTab === "buckets" && (
                <div className="p-5 rounded-xl border bg-background space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Performance & Skill Buckets
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Define score range thresholds for automated student wellness categorization.
                      </p>
                    </div>
                    <Button type="button" size="sm" onClick={handleAddBucket} className="h-7 text-xs">
                      <Plus className="h-3.5 w-3.5 mr-1" /> Add Bucket
                    </Button>
                  </div>

                  <div className="space-y-3 pt-2">
                    {formData.buckets.map((b, bIdx) => (
                      <div key={bIdx} className="flex items-center gap-3 p-3 rounded-lg border bg-muted/20">
                        <div className="flex-1 space-y-1">
                          <label className="text-[10px] font-medium text-muted-foreground">Bucket Name</label>
                          <Input
                            value={b.name}
                            onChange={e => handleUpdateBucket(bIdx, "name", e.target.value)}
                            className="text-xs h-8 bg-background"
                            placeholder="e.g. Skill Stable"
                          />
                        </div>
                        <div className="w-24 space-y-1">
                          <label className="text-[10px] font-medium text-muted-foreground">Min Points</label>
                          <Input
                            type="number"
                            value={b.min_score}
                            onChange={e => handleUpdateBucket(bIdx, "min_score", e.target.value)}
                            className="text-xs h-8 text-center font-mono bg-background"
                          />
                        </div>
                        <div className="w-24 space-y-1">
                          <label className="text-[10px] font-medium text-muted-foreground">Max Points</label>
                          <Input
                            type="number"
                            value={b.max_score}
                            onChange={e => handleUpdateBucket(bIdx, "max_score", e.target.value)}
                            className="text-xs h-8 text-center font-mono bg-background"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 mt-5 hover:text-destructive shrink-0"
                          onClick={() => handleDeleteBucket(bIdx)}
                          title="Remove bucket"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          ) : (
            /* MODE 2: RAW JSON EDITOR */
            <div className="space-y-3 h-full flex flex-col">
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">
                  Direct JSON syntax editing with real-time bidirectional synchronization.
                </span>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={handleFormatJson}>
                    Format JSON
                  </Button>
                  <Button type="button" size="sm" className="h-7 text-xs" onClick={handleSwitchToVisual}>
                    Validate & Apply to Builder &rarr;
                  </Button>
                </div>
              </div>

              {jsonError && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 text-xs text-destructive rounded-lg flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{jsonError}</span>
                </div>
              )}

              <Textarea
                value={jsonText}
                onChange={e => {
                  setJsonText(e.target.value)
                  setJsonError(null)
                }}
                className="font-mono text-xs min-h-[440px] flex-1 bg-background resize-y leading-relaxed"
                spellCheck={false}
              />
            </div>
          )}
        </div>

        {/* Sticky Footer */}
        <div className="px-6 py-3 border-t bg-background flex justify-between items-center shrink-0">
          <div className="text-xs text-muted-foreground font-medium">
            Total Points Max:{" "}
            <span className="font-mono text-foreground font-bold">
              {formData.questions.reduce((acc, q) => {
                const maxOpt = q.options.reduce((m, o) => Math.max(m, o.marks), 0)
                return acc + maxOpt
              }, 0)} pts
            </span>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={saving}
              className="px-5"
            >
              {saving ? "Saving..." : "Save Assessment"}
            </Button>
          </div>
        </div>

      </DialogContent>
    </Dialog>
  )
}
