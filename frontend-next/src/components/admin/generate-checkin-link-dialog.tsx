"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Link2,
  Palette,
  Copy,
  CheckCircle2,
  ExternalLink,
  QrCode,
  Trash2,
  Clock,
  User,
  Mail,
  Tag,
  Layers,
  RefreshCw,
  Share2,
  AlertCircle,
  Leaf,
  Wind,
  Sun,
  Sparkles,
} from "lucide-react"
import QRCode from "qrcode"
import { api } from "@/lib/api"
import { ADMIN_AVAILABLE_THEMES, useAssessmentTheme, AssessmentThemeId } from "@/lib/assessment-theme"
import { CrayonIcon } from "@/components/icons/crayon-icon"

export interface CheckinLinkItem {
  id: string
  code: string
  assessment_id?: string
  assessment_title?: string
  label: string
  candidate_name: string
  candidate_email: string
  expires_at?: string
  max_uses: number
  use_count: number
  status: "active" | "completed" | "expired" | "revoked"
  last_used_at?: string
  created_at: string
  full_url?: string
}

interface GenerateCheckinLinkDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  assessments: Array<{ id: string; title: string; question_count?: number; questions?: any }>
  defaultAssessmentId?: string
}

export function GenerateCheckinLinkDialog({
  open,
  onOpenChange,
  assessments,
  defaultAssessmentId,
}: GenerateCheckinLinkDialogProps) {
  const [activeTab, setActiveTab] = useState<"generate" | "history">("generate")

  const { currentThemeId, setThemeId } = useAssessmentTheme()
  const [selectedTheme, setSelectedTheme] = useState<AssessmentThemeId>(currentThemeId)

  // Form State
  const [selectedAssessmentId, setSelectedAssessmentId] = useState(defaultAssessmentId || "")
  const [candidateName, setCandidateName] = useState("")
  const [candidateEmail, setCandidateEmail] = useState("")
  const [label, setLabel] = useState("")
  const [expiresInDays, setExpiresInDays] = useState("7")
  const [maxUses, setMaxUses] = useState("1")
  const [generating, setGenerating] = useState(false)
  const [generateError, setGenerateError] = useState("")

  // Generated Result State
  const [newlyCreated, setNewlyCreated] = useState<CheckinLinkItem | null>(null)
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState("")
  const [copiedLink, setCopiedLink] = useState(false)
  const [copiedInvite, setCopiedInvite] = useState(false)

  // History List State
  const [links, setLinks] = useState<CheckinLinkItem[]>([])
  const [loadingLinks, setLoadingLinks] = useState(false)
  const [copiedRowId, setCopiedRowId] = useState<string | null>(null)

  // Sync defaultAssessmentId if prop changes
  useEffect(() => {
    if (defaultAssessmentId) {
      setSelectedAssessmentId(defaultAssessmentId)
    } else if (assessments.length > 0 && !selectedAssessmentId) {
      setSelectedAssessmentId(assessments[0].id)
    }
  }, [defaultAssessmentId, assessments])

  // Fetch history when switching to history tab or when modal opens
  useEffect(() => {
    if (open) {
      fetchLinks()
    }
  }, [open])

  const fetchLinks = async () => {
    try {
      setLoadingLinks(true)
      const data = await api.get("/api/admin/checkin-links")
      setLinks(data || [])
    } catch (err) {
      console.error("Failed to fetch checkin links", err)
    } finally {
      setLoadingLinks(false)
    }
  }

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    setGenerating(true)
    setGenerateError("")
    setNewlyCreated(null)

    try {
      const payload = {
        assessmentId: selectedAssessmentId || undefined,
        label: label.trim(),
        candidateName: candidateName.trim(),
        candidateEmail: candidateEmail.trim(),
        expiresInDays: parseInt(expiresInDays, 10) || 0,
        maxUses: parseInt(maxUses, 10) || 1,
      }

      const res = await api.post("/api/admin/checkin-links", payload)
      if (res && res.code) {
        setThemeId(selectedTheme)
        const themeQuery = selectedTheme ? `?theme=${selectedTheme}` : ""
        // Construct full URL using window.location.origin
        const fullUrl = typeof window !== "undefined"
          ? `${window.location.origin}/checkin/${res.code}${themeQuery}`
          : `${res.full_url || `/checkin/${res.code}`}${themeQuery}`

        const createdItem: CheckinLinkItem = {
          ...res,
          full_url: fullUrl,
        }

        setNewlyCreated(createdItem)

        // Generate QR Code
        try {
          const qr = await QRCode.toDataURL(fullUrl, {
            width: 240,
            margin: 2,
            color: { dark: "#0f172a", light: "#ffffff" },
          })
          setQrCodeDataUrl(qr)
        } catch (qrErr) {
          console.error("Failed to generate QR code", qrErr)
        }

        // Refresh links list
        fetchLinks()
      }
    } catch (err: any) {
      console.error("Failed to generate link:", err)
      setGenerateError(err?.response?.data?.message || err?.message || "Failed to generate link")
    } finally {
      setGenerating(false)
    }
  }

  const handleCopyLink = (url: string) => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(url)
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
    }
  }

  const handleCopyRowLink = (url: string, id: string) => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(url)
      setCopiedRowId(id)
      setTimeout(() => setCopiedRowId(null), 2000)
    }
  }

  const handleCopyInviteMessage = (item: CheckinLinkItem) => {
    const url = item.full_url || (typeof window !== "undefined" ? `${window.location.origin}/checkin/${item.code}` : `/checkin/${item.code}`)
    const nameGreeting = item.candidate_name ? `Dear ${item.candidate_name},\n\n` : "Hello,\n\n"
    const message = `${nameGreeting}You have been invited to complete a private reflection check-in on Jaagr Mind.\n\nPlease click your personalized, secure link below to begin:\n${url}\n\nThis check-in is confidential, takes approximately 5 minutes, and will provide personalized insights upon completion.`

    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(message)
      setCopiedInvite(true)
      setTimeout(() => setCopiedInvite(false), 2000)
    }
  }

  const handleDeleteLink = async (id: string) => {
    if (!window.confirm("Are you sure you want to revoke this check-in link? Anyone with this link will no longer be able to use it.")) {
      return
    }
    try {
      await api.delete(`/api/admin/checkin-links/${id}`)
      setLinks((prev) => prev.filter((l) => l.id !== id))
      if (newlyCreated?.id === id) {
        setNewlyCreated(null)
      }
    } catch (err) {
      alert("Failed to delete link")
    }
  }

  const resetForm = () => {
    setNewlyCreated(null)
    setCandidateName("")
    setCandidateEmail("")
    setLabel("")
    setGenerateError("")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="p-6 pb-4 border-b bg-muted/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                <Link2 className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold">Generate Random Check-in Link</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Create unique, random, one-time or multi-use check-in links for individual candidates.
                </DialogDescription>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center rounded-lg border bg-muted/40 p-1 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab("generate")}
                className={`px-3 py-1 rounded-md font-medium transition-all ${
                  activeTab === "generate"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Create Link
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("history")
                  fetchLinks()
                }}
                className={`px-3 py-1 rounded-md font-medium transition-all flex items-center gap-1.5 ${
                  activeTab === "history"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span>Active Links</span>
                {links.length > 0 && (
                  <Badge variant="secondary" className="px-1.5 py-0 text-[10px] h-4">
                    {links.length}
                  </Badge>
                )}
              </button>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6">
          {activeTab === "generate" && (
            <div className="space-y-6">
              {newlyCreated ? (
                /* ── Newly Created Success Card ────────────────────────────── */
                <div className="space-y-5 animate-in fade-in zoom-in-95 duration-200">
                  <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/5 p-5 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                          <h4 className="font-semibold text-sm text-foreground">
                            Random Check-in Link Generated!
                          </h4>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          This unique URL is ready to share. Candidates can use it directly without registering.
                        </p>
                      </div>
                      <Badge className="bg-emerald-600 text-white hover:bg-emerald-600 font-mono text-xs">
                        {newlyCreated.code}
                      </Badge>
                    </div>

                    {/* Full URL Box */}
                    <div className="flex items-center gap-2">
                      <Input
                        readOnly
                        value={newlyCreated.full_url || ""}
                        className="font-mono text-xs bg-background selection:bg-emerald-500/20"
                      />
                      <Button
                        size="sm"
                        onClick={() => handleCopyLink(newlyCreated.full_url || "")}
                        className="shrink-0 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                      >
                        {copiedLink ? (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" />
                            <span>Copy Link</span>
                          </>
                        )}
                      </Button>
                    </div>

                    {/* Action Bar & Details */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopyInviteMessage(newlyCreated)}
                        className="gap-1.5 justify-start text-xs h-9 cursor-pointer"
                      >
                        {copiedInvite ? (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                            <span>Invite Message Copied!</span>
                          </>
                        ) : (
                          <>
                            <Share2 className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>Copy Invitation Message</span>
                          </>
                        )}
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(newlyCreated.full_url, "_blank")}
                        className="gap-1.5 justify-start text-xs h-9 cursor-pointer"
                      >
                        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>Open & Test in New Tab</span>
                      </Button>
                    </div>

                    {/* Meta info tags */}
                    <div className="flex flex-wrap gap-2 pt-2 border-t text-[11px] text-muted-foreground">
                      {newlyCreated.candidate_name && (
                        <span className="flex items-center gap-1 bg-muted px-2 py-0.5 rounded">
                          <User className="h-3 w-3" /> {newlyCreated.candidate_name}
                        </span>
                      )}
                      {newlyCreated.candidate_email && (
                        <span className="flex items-center gap-1 bg-muted px-2 py-0.5 rounded">
                          <Mail className="h-3 w-3" /> {newlyCreated.candidate_email}
                        </span>
                      )}
                      <span className="flex items-center gap-1 bg-muted px-2 py-0.5 rounded">
                        <Clock className="h-3 w-3" />
                        {newlyCreated.max_uses === 1 ? "Single use (1 completion)" : `Max ${newlyCreated.max_uses} uses`}
                      </span>
                      {newlyCreated.assessment_title && (
                        <span className="flex items-center gap-1 bg-muted px-2 py-0.5 rounded">
                          <Layers className="h-3 w-3" /> {newlyCreated.assessment_title}
                        </span>
                      )}
                    </div>

                    {/* QR Code Preview */}
                    {qrCodeDataUrl && (
                      <div className="pt-3 border-t flex items-center gap-4">
                        <div className="p-2 bg-white rounded-lg border shadow-xs">
                          <img src={qrCodeDataUrl} alt="QR Code" className="w-20 h-20" />
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs font-medium">Quick Scan QR</div>
                          <p className="text-[11px] text-muted-foreground">
                            Candidates can scan with their phone camera to take the check-in immediately.
                          </p>
                          <a
                            href={qrCodeDataUrl}
                            download={`checkin-${newlyCreated.code}.png`}
                            className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium hover:underline inline-block mt-0.5"
                          >
                            Download QR Image
                          </a>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center pt-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setActiveTab("history")
                        fetchLinks()
                      }}
                      className="text-xs text-muted-foreground"
                    >
                      View All Generated Links
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={resetForm}
                      className="text-xs"
                    >
                      Generate Another Link
                    </Button>
                  </div>
                </div>
              ) : (
                /* ── Generation Form ───────────────────────────────────────── */
                <form onSubmit={handleGenerate} className="space-y-4">
                  {generateError && (
                    <div className="p-3 text-xs bg-destructive/10 border border-destructive/20 text-destructive rounded-lg flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{generateError}</span>
                    </div>
                  )}

                  {/* Template Picker */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                      Check-in Assessment Template
                    </label>
                    <select
                      value={selectedAssessmentId}
                      onChange={(e) => setSelectedAssessmentId(e.target.value)}
                      className="w-full text-xs rounded-md border border-input bg-background px-3 py-2 shadow-xs focus:ring-1 focus:ring-primary"
                    >
                      {assessments.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.title} ({a.question_count || (Array.isArray(a.questions) ? a.questions.length : 32)} Questions)
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-muted-foreground">
                      The questions from this template will be loaded when the candidate opens their link.
                    </p>
                  </div>

                  {/* Candidate Name & Email (Optional) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                        Candidate Name <span className="text-muted-foreground font-normal">(Optional)</span>
                      </label>
                      <Input
                        placeholder="e.g., Alex Johnson"
                        value={candidateName}
                        onChange={(e) => setCandidateName(e.target.value)}
                        className="text-xs h-9"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                        Candidate Email <span className="text-muted-foreground font-normal">(Optional)</span>
                      </label>
                      <Input
                        type="email"
                        placeholder="e.g., alex@example.com"
                        value={candidateEmail}
                        onChange={(e) => setCandidateEmail(e.target.value)}
                        className="text-xs h-9"
                      />
                    </div>
                  </div>

                  {/* Label / Notes */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium flex items-center gap-1.5">
                      <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                      Label or Cohort <span className="text-muted-foreground font-normal">(Optional tracking tag)</span>
                    </label>
                    <Input
                      placeholder="e.g., Admissions Walk-in 2026, Grade 9 Candidate"
                      value={label}
                      onChange={(e) => setLabel(e.target.value)}
                      className="text-xs h-9"
                    />
                  </div>

                  {/* Settings Grid: Expiry & Max Uses */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                        Link Expiration
                      </label>
                      <select
                        value={expiresInDays}
                        onChange={(e) => setExpiresInDays(e.target.value)}
                        className="w-full text-xs rounded-md border border-input bg-background px-3 py-2 shadow-xs"
                      >
                        <option value="1">Expires in 24 Hours</option>
                        <option value="3">Expires in 3 Days</option>
                        <option value="7">Expires in 7 Days (Recommended)</option>
                        <option value="30">Expires in 30 Days</option>
                        <option value="0">Never Expires</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium flex items-center gap-1.5">
                        <Share2 className="h-3.5 w-3.5 text-muted-foreground" />
                        Usage Limit
                      </label>
                      <select
                        value={maxUses}
                        onChange={(e) => setMaxUses(e.target.value)}
                        className="w-full text-xs rounded-md border border-input bg-background px-3 py-2 shadow-xs"
                      >
                        <option value="1">Single Use (1 Completion - Recommended)</option>
                        <option value="5">Allow up to 5 Completions</option>
                        <option value="20">Allow up to 20 Completions</option>
                        <option value="100">Allow up to 100 Completions</option>
                      </select>
                    </div>
                  </div>

                  {/* Theme & Atmosphere Selection (Decided by Admin) */}
                  <div className="space-y-2 pt-2 border-t">
                    <label className="text-xs font-semibold flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-foreground">
                        <Palette className="h-3.5 w-3.5 text-emerald-500" />
                        Check-in Scenery &amp; Atmosphere Theme
                      </span>
                      <span className="text-[10px] text-muted-foreground font-normal">
                        Decided by Admin • Hidden from candidate
                      </span>
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {ADMIN_AVAILABLE_THEMES.map((th) => (
                        <div
                          key={th.id}
                          onClick={() => setSelectedTheme(th.id)}
                          className={`p-3 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                            selectedTheme === th.id
                              ? "border-emerald-500 bg-emerald-500/5 shadow-xs scale-[1.02]"
                              : "border-border/60 hover:border-border hover:bg-muted/30"
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              {th.id === "jm-signature" ? (
                                <Sparkles className="h-4 w-4 text-[#8161A3] shrink-0" />
                              ) : th.id === "jm-crayon" ? (
                                <CrayonIcon className="h-4 w-4 text-[#F59E0B] shrink-0" />
                              ) : (
                                <Leaf className="h-4 w-4 text-[#205A44] shrink-0" />
                              )}
                              <span className="text-xs font-bold text-foreground">{th.name}</span>
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-1 leading-snug">
                              {th.subtitle}
                            </p>
                          </div>
                          <div className={`mt-2.5 h-1.5 rounded-full bg-gradient-to-r ${th.gradientBar}`} />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-3 flex justify-end gap-2 border-t">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onOpenChange(false)}
                      className="text-xs"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={generating}
                      size="sm"
                      className="text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                    >
                      {generating ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          <span>Generating...</span>
                        </>
                      ) : (
                        <>
                          <Link2 className="h-3.5 w-3.5" />
                          <span>Generate Random Link</span>
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          )}

          {activeTab === "history" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Manage and track all generated random check-in links.</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={fetchLinks}
                  disabled={loadingLinks}
                  className="h-7 text-xs gap-1"
                >
                  <RefreshCw className={`h-3 w-3 ${loadingLinks ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              </div>

              {loadingLinks ? (
                <div className="py-12 text-center text-xs text-muted-foreground space-y-2">
                  <RefreshCw className="h-5 w-5 animate-spin mx-auto text-muted-foreground/60" />
                  <p>Loading generated links...</p>
                </div>
              ) : links.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground border border-dashed rounded-xl p-6">
                  <QrCode className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="font-medium text-foreground">No random links generated yet</p>
                  <p className="mt-1">Click "Create Link" above to generate your first random check-in link.</p>
                </div>
              ) : (
                <div className="border rounded-xl divide-y overflow-hidden max-h-[50vh] overflow-y-auto">
                  {links.map((link) => {
                    const fullUrl = link.full_url || (typeof window !== "undefined" ? `${window.location.origin}/checkin/${link.code}` : `/checkin/${link.code}`)
                    const isCompleted = link.status === "completed" || (link.max_uses > 0 && link.use_count >= link.max_uses)
                    const isExpired = link.expires_at && new Date(link.expires_at) < new Date()

                    return (
                      <div key={link.id} className="p-3.5 hover:bg-muted/30 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-semibold text-foreground text-xs">
                              {link.code}
                            </span>
                            {isCompleted ? (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">
                                Completed ({link.use_count}/{link.max_uses})
                              </Badge>
                            ) : isExpired ? (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20">
                                Expired
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                                Active ({link.use_count}/{link.max_uses})
                              </Badge>
                            )}
                            {link.label && (
                              <span className="text-[11px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                {link.label}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
                            {link.candidate_name && <span>Candidate: <strong className="text-foreground">{link.candidate_name}</strong></span>}
                            {link.candidate_email && <span>{link.candidate_email}</span>}
                            <span>Template: {link.assessment_title || "Default Check-in"}</span>
                            <span>Created: {new Date(link.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1.5 shrink-0 w-full sm:w-auto justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCopyRowLink(fullUrl, link.id)}
                            className="h-8 text-xs gap-1 cursor-pointer"
                            title="Copy Link"
                          >
                            {copiedRowId === link.id ? (
                              <>
                                <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                                <span>Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-3 w-3" />
                                <span>Copy</span>
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => window.open(fullUrl, "_blank")}
                            className="h-8 w-8 p-0 cursor-pointer text-muted-foreground hover:text-foreground"
                            title="Open in new tab"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteLink(link.id)}
                            className="h-8 w-8 p-0 cursor-pointer text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                            title="Revoke / Delete link"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
