"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ShieldAlert, ArrowLeft, Building2 } from "lucide-react"
import { Button } from "@/components/ui/button"

export function ImpersonationBanner() {
  const router = useRouter()
  const [impersonatingData, setImpersonatingData] = useState<{ schoolName: string; schoolId: string } | null>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem("superadmin_impersonating")
      if (raw) {
        setImpersonatingData(JSON.parse(raw))
      }
    } catch (e) {
      console.error(e)
    }
  }, [])

  const handleExit = () => {
    const origToken = sessionStorage.getItem("superadmin_original_token")
    const origUser = sessionStorage.getItem("superadmin_original_user")

    if (origToken) {
      localStorage.setItem("token", origToken)
    }
    if (origUser) {
      localStorage.setItem("user", origUser)
    }

    localStorage.removeItem("superadmin_impersonating")
    sessionStorage.removeItem("superadmin_original_token")
    sessionStorage.removeItem("superadmin_original_user")

    window.location.href = "/admin/schools"
  }

  if (!impersonatingData) return null

  return (
    <div className="bg-amber-500/15 border-b border-amber-500/30 text-amber-600 dark:text-amber-400 px-4 py-2 flex items-center justify-between text-xs font-medium sticky top-0 z-30 backdrop-blur-md">
      <div className="flex items-center gap-2">
        <ShieldAlert className="h-4 w-4 shrink-0 text-amber-500 animate-pulse" />
        <span>
          <strong>Superadmin Ghost Access:</strong> You are currently viewing the live portal for{" "}
          <span className="underline font-semibold text-foreground">{impersonatingData.schoolName}</span>.
        </span>
      </div>

      <Button
        size="sm"
        variant="outline"
        onClick={handleExit}
        className="h-7 text-xs border-amber-500/40 hover:bg-amber-500/20 text-foreground font-semibold flex items-center gap-1.5"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Exit & Return to Superadmin
      </Button>
    </div>
  )
}
