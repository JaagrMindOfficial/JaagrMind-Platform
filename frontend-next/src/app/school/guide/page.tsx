"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  BookOpen,
  Search,
  ChevronRight,
  Sparkles,
  HelpCircle,
  FileText,
  Clock,
  ArrowUpRight,
  Lightbulb
} from "lucide-react"
import { api } from "@/lib/api"
import Link from "next/link"
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

export default function SchoolPlatformGuidePage() {
  const [articles, setArticles] = useState<GuideArticle[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [selectedArticle, setSelectedArticle] = useState<GuideArticle | null>(null)

  const fetchGuides = async () => {
    setLoading(true)
    try {
      const data = await api.get("/api/guides")
      if (data && data.length > 0) {
        setArticles(data)
        setSelectedArticle(data[0])
      }
    } catch (err) {
      console.error("Failed to load guides", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchGuides()
  }, [])

  const filteredArticles = articles.filter(
    (a) =>
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.content.toLowerCase().includes(search.toLowerCase()) ||
      a.category.toLowerCase().includes(search.toLowerCase())
  )

  // Group by category
  const categories: Record<string, GuideArticle[]> = {}
  filteredArticles.forEach((article) => {
    const cat = article.category || "General Guides"
    if (!categories[cat]) {
      categories[cat] = []
    }
    categories[cat].push(article)
  })

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">How to Use the Platform</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Official operational documentation, onboarding steps, and workflows curated for school administrators.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/school/support">
            <Button size="sm" variant="outline" className="gap-1.5 text-xs">
              <HelpCircle className="h-3.5 w-3.5" />
              Need Support? Submit Ticket
            </Button>
          </Link>
        </div>
      </div>

      {/* Guide Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Navigation Sidebar */}
        <Card className="lg:col-span-4 border-border shadow-none">
          <CardHeader className="p-3 border-b border-border/40">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search guide articles..."
                className="pl-9 h-8 text-xs"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="p-2 space-y-4 max-h-[650px] overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground text-xs">
                Loading documentation...
              </div>
            ) : Object.keys(categories).length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-xs">
                No matching articles found.
              </div>
            ) : (
              Object.entries(categories).map(([catName, catArticles]) => (
                <div key={catName} className="space-y-1">
                  <div className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70">
                    {catName}
                  </div>
                  <div className="space-y-0.5">
                    {catArticles.map((article) => {
                      const isSelected = selectedArticle?.id === article.id
                      return (
                        <button
                          key={article.id}
                          onClick={() => setSelectedArticle(article)}
                          className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition-all ${
                            isSelected
                              ? "bg-primary text-primary-foreground shadow-sm"
                              : "text-foreground/90 hover:bg-muted/60"
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <FileText className={`h-3.5 w-3.5 shrink-0 ${isSelected ? "text-primary-foreground" : "text-muted-foreground"}`} />
                            <span className="truncate">{article.title}</span>
                          </div>
                          <ChevronRight className={`h-3.5 w-3.5 shrink-0 ${isSelected ? "text-primary-foreground" : "text-muted-foreground/50"}`} />
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Right Article Reader */}
        <Card className="lg:col-span-8 border-border shadow-none">
          {selectedArticle ? (
            <div>
              <CardHeader className="border-b border-border/40 pb-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <Badge variant="secondary" className="text-[10px] px-2 py-0">
                    {selectedArticle.category}
                  </Badge>
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Updated {new Date(selectedArticle.updated_at).toLocaleDateString()}
                  </span>
                </div>
                <CardTitle className="text-xl tracking-tight text-foreground font-semibold">
                  {selectedArticle.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 pb-8 px-6 space-y-4">
                <div className="prose prose-sm dark:prose-invert max-w-none text-foreground/90 text-sm leading-relaxed">
                  <ReactMarkdown
                    components={{
                      h1: ({ node, ...props }) => (
                        <h1 className="text-xl font-bold text-foreground mt-4 mb-2 pb-1 border-b border-border/40" {...props} />
                      ),
                      h2: ({ node, ...props }) => (
                        <h2 className="text-lg font-semibold text-foreground mt-5 mb-2 flex items-center gap-2" {...props} />
                      ),
                      h3: ({ node, ...props }) => (
                        <h3 className="text-base font-semibold text-primary mt-4 mb-1.5" {...props} />
                      ),
                      h4: ({ node, ...props }) => (
                        <h4 className="text-sm font-semibold text-foreground mt-3 mb-1" {...props} />
                      ),
                      p: ({ node, ...props }) => (
                        <p className="text-sm leading-relaxed text-foreground/85 mb-3" {...props} />
                      ),
                      ul: ({ node, ...props }) => (
                        <ul className="list-disc list-inside space-y-1.5 mb-3 text-sm text-foreground/85 pl-1" {...props} />
                      ),
                      ol: ({ node, ...props }) => (
                        <ol className="list-decimal list-inside space-y-1.5 mb-3 text-sm text-foreground/85 pl-1" {...props} />
                      ),
                      li: ({ node, ...props }) => (
                        <li className="text-sm leading-relaxed" {...props} />
                      ),
                      strong: ({ node, ...props }) => (
                        <strong className="font-semibold text-foreground" {...props} />
                      ),
                      code: ({ node, ...props }) => (
                        <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-xs text-primary border border-border/50" {...props} />
                      ),
                      blockquote: ({ node, ...props }) => (
                        <blockquote className="border-l-3 border-primary pl-3 py-1.5 my-3 italic text-muted-foreground bg-primary/5 rounded-r text-sm" {...props} />
                      ),
                    }}
                  >
                    {selectedArticle.content}
                  </ReactMarkdown>
                </div>

                <div className="mt-8 pt-6 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Lightbulb className="h-4 w-4 text-amber-500" />
                    <span>Always updated with live platform features.</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs gap-1"
                    onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                  >
                    Back to top
                  </Button>
                </div>
              </CardContent>
            </div>
          ) : (
            <div className="p-16 text-center text-muted-foreground text-xs flex flex-col items-center">
              <BookOpen className="h-10 w-10 mb-3 opacity-20" />
              <p>Select an article from the guide index to view instructions.</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
