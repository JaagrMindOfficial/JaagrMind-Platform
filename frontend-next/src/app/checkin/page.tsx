"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ThemeToggle } from "@/components/theme-toggle"
import { Sparkles, ArrowRight, KeyRound, ShieldCheck, Home } from "lucide-react"

function CheckinRootContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryCode = searchParams.get("code")

  const [inputCode, setInputCode] = useState("")
  const [error, setError] = useState("")

  useEffect(() => {
    if (queryCode && queryCode.trim()) {
      router.replace(`/checkin/${encodeURIComponent(queryCode.trim())}`)
    }
  }, [queryCode, router])

  const handleSubmitCode = (e: React.FormEvent) => {
    e.preventDefault()
    const clean = inputCode.trim()
    if (!clean) {
      setError("Please enter your check-in code")
      return
    }
    // Clean up full URL if candidate pasted entire URL
    let targetCode = clean
    if (clean.includes("/checkin/")) {
      targetCode = clean.split("/checkin/").pop()?.split("?")[0] || clean
    } else if (clean.includes("code=")) {
      const match = clean.match(/code=([^&]+)/)
      if (match) targetCode = match[1]
    }

    router.push(`/checkin/${encodeURIComponent(targetCode)}`)
  }

  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-slate-950 flex flex-col justify-between">
      {/* Header bar */}
      <header className="border-b bg-card/80 backdrop-blur px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg shadow-xs">
            J
          </div>
          <div>
            <div className="font-semibold text-base leading-tight">Jaagr Mind</div>
            <div className="text-xs text-muted-foreground">Candidate Reflection Check-in</div>
          </div>
        </div>
        <ThemeToggle />
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-lg">
          <Card className="border shadow-lg rounded-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-sky-500/10 via-indigo-500/10 to-teal-500/10 p-8 text-center space-y-3 border-b">
              <Badge variant="outline" className="bg-background/80 text-primary border-primary/20 px-3 py-1 text-xs font-medium">
                <Sparkles className="h-3.5 w-3.5 mr-1" />
                Personalized Reflection
              </Badge>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                Enter Your Check-in Code
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
                If you were provided with a personalized check-in link or random code, enter or paste it below to begin.
              </p>
            </div>

            <CardContent className="p-6 sm:p-8 space-y-6">
              <form onSubmit={handleSubmitCode} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                    <KeyRound className="h-3.5 w-3.5 text-muted-foreground" />
                    Check-in Code or Link
                  </label>
                  <Input
                    placeholder="e.g. chk_7f8k2p4m or paste full link"
                    value={inputCode}
                    onChange={(e) => {
                      setInputCode(e.target.value)
                      if (error) setError("")
                    }}
                    className={`h-11 text-sm font-mono bg-background ${error ? "border-destructive ring-1 ring-destructive" : ""}`}
                  />
                  {error && <p className="text-xs text-destructive">{error}</p>}
                </div>

                <Button
                  type="submit"
                  className="w-full h-11 text-sm font-semibold gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs cursor-pointer"
                >
                  <span>Continue to Check-in</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </form>

              <div className="pt-2 border-t flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                  Secure & Confidential
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push("/")}
                  className="text-xs gap-1 h-8 text-muted-foreground hover:text-foreground"
                >
                  <Home className="h-3 w-3" />
                  Jaagr Mind Home
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-4 px-6 text-center text-xs text-muted-foreground">
        Jaagr Mind Platform &bull; Non-Clinical Guided Self-Reflection &bull; All Rights Reserved
      </footer>
    </div>
  )
}

export default function DirectCheckinPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="h-8 w-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <CheckinRootContent />
    </Suspense>
  )
}
