"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  BookOpen,
  Plus,
  Save,
  Trash2,
  Edit,
  Eye,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  RefreshCw,
  FileText
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog"
import { api } from "@/lib/api"
import ReactMarkdown from "react-markdown"

interface GuideArticle {
  id: string
  title: string
  slug: string
  category: string
  content: string
  display_order: number
  updated_at: string
}

export default function AdminPlatformGuidePage() {
  const [articles, setArticles] = useState<GuideArticle[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedArticle, setSelectedArticle] = useState<GuideArticle | null>(null)

  // Edit Form State
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    category: "",
    content: "",
    display_order: 0,
  })
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState("")
  const [saveError, setSaveError] = useState("")
  const [isPreview, setIsPreview] = useState(false)

  // New Article Dialog
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [newArticleData, setNewArticleData] = useState({
    title: "",
    slug: "",
    category: "General Guides",
    content: "",
    display_order: 1,
  })
  const [creating, setCreating] = useState(false)

  // Delete Confirmation
  const [deleteArticleId, setDeleteArticleId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchGuides = async () => {
    setLoading(true)
    try {
      const data = await api.get("/api/admin/guides")
      if (data && data.length > 0) {
        setArticles(data)
        if (!selectedArticle) {
          selectArticle(data[0])
        } else {
          const updated = data.find((a: GuideArticle) => a.id === selectedArticle.id)
          if (updated) selectArticle(updated)
        }
      } else {
        setArticles([])
        setSelectedArticle(null)
      }
    } catch (err) {
      console.error("Failed to load admin guides", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchGuides()
  }, [])

  const selectArticle = (article: GuideArticle) => {
    setSelectedArticle(article)
    setFormData({
      title: article.title,
      slug: article.slug,
      category: article.category,
      content: article.content,
      display_order: article.display_order,
    })
    setSaveSuccess("")
    setSaveError("")
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedArticle) return
    setSaving(true)
    setSaveSuccess("")
    setSaveError("")

    try {
      await api.put(`/api/admin/guides/${selectedArticle.id}`, formData)
      setSaveSuccess("Guide updated! Changes are live across all school portals.")
      fetchGuides()
    } catch (err: any) {
      setSaveError(err?.message || "Failed to update article.")
    } finally {
      setSaving(false)
    }
  }

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    try {
      const autoSlug = newArticleData.slug.trim() || newArticleData.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")
      await api.post("/api/admin/guides", {
        ...newArticleData,
        slug: autoSlug,
      })
      setIsCreateOpen(false)
      setNewArticleData({
        title: "",
        slug: "",
        category: "General Guides",
        content: "",
        display_order: 1,
      })
      fetchGuides()
    } catch (err) {
      alert("Failed to create guide article")
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteArticleId) return
    setDeleting(true)
    try {
      await api.delete(`/api/admin/guides/${deleteArticleId}`)
      setDeleteArticleId(null)
      setSelectedArticle(null)
      fetchGuides()
    } catch (err) {
      alert("Failed to delete article")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Platform Guide Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Author and edit platform documentation in real-time. Changes immediately reflect in school and admin guides.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => setIsCreateOpen(true)} className="gap-1.5 text-xs">
            <Plus className="h-3.5 w-3.5" />
            New Guide Article
          </Button>
        </div>
      </div>

      {/* Live Sync Banner */}
      <div className="p-3.5 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-between text-xs text-primary gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 shrink-0" />
          <span>
            <strong>Direct Superadmin Publishing:</strong> Any edits saved here are stored directly in the database and appear instantly to school admins on their next guide view.
          </span>
        </div>
        <Button variant="ghost" size="sm" onClick={fetchGuides} className="h-7 text-xs gap-1 text-primary hover:bg-primary/20">
          <RefreshCw className="h-3 w-3" /> Refresh
        </Button>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left List of Articles */}
        <Card className="lg:col-span-4 border-border shadow-none">
          <CardHeader className="p-3.5 border-b border-border/40">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground">Published Articles</span>
              <Badge variant="outline" className="text-[10px] font-mono">
                {articles.length} Guides
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-2 space-y-1 max-h-[600px] overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-xs text-muted-foreground">Loading guides...</div>
            ) : articles.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">No guide articles yet.</div>
            ) : (
              articles.map((article) => {
                const isSelected = selectedArticle?.id === article.id
                return (
                  <div
                    key={article.id}
                    onClick={() => selectArticle(article)}
                    className={`p-3 rounded-lg text-xs cursor-pointer transition-all space-y-1 ${
                      isSelected
                        ? "bg-primary/10 border border-primary/30 text-foreground"
                        : "hover:bg-muted/50 text-foreground/80"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold truncate">{article.title}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        #{article.display_order}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>{article.category}</span>
                      <span className="text-[10px]">
                        {new Date(article.updated_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>

        {/* Right Editor Area */}
        <Card className="lg:col-span-8 border-border shadow-none">
          {selectedArticle ? (
            <form onSubmit={handleSave}>
              <CardHeader className="border-b border-border/40 pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Edit className="h-4 w-4 text-primary" />
                    Edit Article
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Live Markdown / text editing with immediate database update.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsPreview(!isPreview)}
                    className="h-8 text-xs gap-1"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    {isPreview ? "Edit Mode" : "Preview"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteArticleId(selectedArticle.id)}
                    className="h-8 text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                {saveSuccess && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs rounded-lg flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>{saveSuccess}</span>
                  </div>
                )}
                {saveError && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs rounded-lg flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{saveError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-xs font-medium text-foreground">Article Title</label>
                    <Input
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="h-9 text-xs"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-foreground">Category</label>
                    <Input
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="h-9 text-xs"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-foreground">URL Slug</label>
                    <Input
                      value={formData.slug}
                      onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                      className="h-9 text-xs font-mono"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-foreground">Display Order</label>
                    <Input
                      type="number"
                      value={formData.display_order}
                      onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                      className="h-9 text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Article Content (Markdown supported)</label>
                  {isPreview ? (
                    <div className="p-4 rounded-lg border bg-muted/20 min-h-[320px] text-xs leading-relaxed prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown>{formData.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <Textarea
                      value={formData.content}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      rows={14}
                      className="text-xs font-mono leading-relaxed"
                      placeholder="Write guide content in markdown format..."
                      required
                    />
                  )}
                </div>

                <div className="pt-2 flex justify-end">
                  <Button type="submit" size="sm" disabled={saving} className="gap-2">
                    <Save className="h-3.5 w-3.5" />
                    {saving ? "Publishing Changes..." : "Publish Live Updates"}
                  </Button>
                </div>
              </CardContent>
            </form>
          ) : (
            <div className="p-16 text-center text-muted-foreground text-xs flex flex-col items-center">
              <BookOpen className="h-10 w-10 mb-3 opacity-20" />
              <p>Select an article on the left or create a new one to begin editing.</p>
            </div>
          )}
        </Card>
      </div>

      {/* Create Article Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={handleCreateSubmit}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <Plus className="h-4 w-4 text-primary" />
                Add Platform Guide Article
              </DialogTitle>
              <DialogDescription className="text-xs">
                Create new documentation for school administrators and platform staff.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-3">
              <div className="space-y-1">
                <label className="text-xs font-medium">Title</label>
                <Input
                  value={newArticleData.title}
                  onChange={(e) => setNewArticleData({ ...newArticleData, title: e.target.value })}
                  placeholder="e.g. Setting Up Classroom Assessments"
                  className="h-9 text-xs"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium">Category</label>
                  <Input
                    value={newArticleData.category}
                    onChange={(e) => setNewArticleData({ ...newArticleData, category: e.target.value })}
                    placeholder="e.g. Assessments & Check-ins"
                    className="h-9 text-xs"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">Slug (Optional)</label>
                  <Input
                    value={newArticleData.slug}
                    onChange={(e) => setNewArticleData({ ...newArticleData, slug: e.target.value })}
                    placeholder="auto-generated-from-title"
                    className="h-9 text-xs font-mono"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Article Content</label>
                <Textarea
                  value={newArticleData.content}
                  onChange={(e) => setNewArticleData({ ...newArticleData, content: e.target.value })}
                  rows={8}
                  placeholder="Detailed instructions, steps, tips..."
                  className="text-xs"
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={creating}>
                {creating ? "Creating..." : "Publish Article"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteArticleId} onOpenChange={(open) => !open && setDeleteArticleId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold text-rose-600 flex items-center gap-2">
              <Trash2 className="h-4 w-4" /> Delete Guide Article
            </DialogTitle>
            <DialogDescription className="text-xs">
              Are you sure you want to permanently remove this guide? School administrators will no longer be able to view it.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setDeleteArticleId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" size="sm" disabled={deleting} onClick={handleDelete}>
              {deleting ? "Deleting..." : "Delete Permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
