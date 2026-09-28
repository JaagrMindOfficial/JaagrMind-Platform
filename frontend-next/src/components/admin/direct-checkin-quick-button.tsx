"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Sparkles, CheckCircle2, ArrowUpRight } from "lucide-react"

export function DirectCheckinQuickButton() {
  const [copied, setCopied] = useState(false)

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (typeof window !== "undefined") {
      const url = `${window.location.origin}/checkin`
      navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    }
  }

  return (
    <div className="flex items-center gap-1.5">
      <Button
        variant="outline"
        size="sm"
        onClick={handleCopy}
        className="h-8 text-xs gap-1.5 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 bg-emerald-500/5 hover:bg-emerald-500/10 cursor-pointer shadow-2xs font-medium"
        title="Copy direct /checkin link to clipboard"
      >
        {copied ? (
          <>
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            <span>Link Copied!</span>
          </>
        ) : (
          <>
            <Sparkles className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Direct Check-in Link</span>
          </>
        )}
      </Button>
      <a
        href="/checkin"
        target="_blank"
        rel="noopener noreferrer"
        className="h-8 w-8 flex items-center justify-center text-muted-foreground hover:text-foreground text-xs rounded-md border border-input hover:bg-muted transition-colors"
        title="Open /checkin in new tab"
      >
        <ArrowUpRight className="h-3.5 w-3.5" />
      </a>
    </div>
  )
}
