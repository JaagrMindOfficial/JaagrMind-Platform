"use client"

import { useState, useEffect } from "react"
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
  Sparkles,
  Building2
} from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AssessmentEditorDialog, AssessmentFormData } from "@/components/assessment-editor-dialog"
import { AssignSchoolsDialog } from "@/components/assign-schools-dialog"
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
  created_at: string
}

export default function AdminAssessmentsPage() {
  const router = useRouter()
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [loading, setLoading] = useState(true)

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
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {assessments.map((a) => {
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
                      onClick={() => openAssignModal(a)}
                      className="text-xs h-8 text-primary border-primary/30 hover:bg-primary/10 hover:text-primary font-medium"
                    >
                      <Building2 className="mr-1.5 h-3.5 w-3.5" /> Assign to Schools
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
    </div>
  )
}
