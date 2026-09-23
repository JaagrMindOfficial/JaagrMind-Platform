"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function InstitutionApplicationsRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace("/internal-ops/admin/schools?tab=requests")
  }, [router])

  return (
    <div className="flex items-center justify-center p-12 text-center text-xs text-muted-foreground">
      Redirecting to School Onboarding Requests...
    </div>
  )
}
