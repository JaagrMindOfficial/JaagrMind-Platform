"use client"

import React, { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Building2,
  GitBranch,
  MapPin,
  Phone,
  Mail,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Info,
} from "lucide-react"
import { api } from "@/lib/api"

export interface ParentSchoolInfo {
  id: string
  name: string
  school_code?: string
  code?: string
  city?: string
}

interface CreateBranchDialogProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: (newBranch: any) => void
  parentSchool: ParentSchoolInfo | null
  isAdminMode?: boolean
}

export function CreateBranchDialog({
  isOpen,
  onClose,
  onSuccess,
  parentSchool,
  isAdminMode = false,
}: CreateBranchDialogProps) {
  const [name, setName] = useState("")
  const [city, setCity] = useState("")
  const [schoolCode, setSchoolCode] = useState("")
  const [contact, setContact] = useState("")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [successMsg, setSuccessMsg] = useState("")

  const parentCode = parentSchool?.school_code || parentSchool?.code || "CAMPUS"

  // Auto-suggest code when branch name or city changes
  useEffect(() => {
    if (parentSchool && (name || city)) {
      const source = city.trim() || name.replace(parentSchool.name, "").trim()
      const slug = source.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 4)
      if (slug) {
        setSchoolCode(`${parentCode}-${slug}`)
      } else {
        setSchoolCode(`${parentCode}-BR1`)
      }
    }
  }, [name, city, parentSchool, parentCode])

  // Reset form on open
  useEffect(() => {
    if (isOpen) {
      setName("")
      setCity(parentSchool?.city || "")
      setSchoolCode(parentSchool ? `${parentCode}-` : "")
      setContact("")
      setPhoneNumber("")
      setError("")
      setSuccessMsg("")
    }
  }, [isOpen, parentSchool, parentCode])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!parentSchool) return
    setError("")
    setSuccessMsg("")

    if (!name.trim()) {
      setError("Please provide a name for the branch campus.")
      return
    }
    if (!city.trim()) {
      setError("Branch location / city is required.")
      return
    }

    setSubmitting(true)
    try {
      let created: any
      if (isAdminMode) {
        created = await api.post("/api/admin/schools", {
          name: name.trim(),
          school_code: schoolCode.trim().toUpperCase(),
          city: city.trim(),
          contact: contact.trim(),
          phone_number: phoneNumber.trim(),
          parent_school_id: parentSchool.id,
        })
      } else {
        created = await api.post("/api/school/branches", {
          name: name.trim(),
          school_code: schoolCode.trim().toUpperCase(),
          city: city.trim(),
          contact: contact.trim(),
          phone_number: phoneNumber.trim(),
        })
      }

      setSuccessMsg(`Satellite campus '${created.name || name}' provisioned successfully!`)
      setTimeout(() => {
        onSuccess?.(created)
        onClose()
      }, 1000)
    } catch (err: any) {
      setError(err.message || "Failed to create branch campus.")
    } finally {
      setSubmitting(false)
    }
  }

  if (!parentSchool) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg p-5">
        <DialogHeader className="pb-3 border-b border-border/40">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <GitBranch className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold">
                Add Satellite Campus / Branch
              </DialogTitle>
              <DialogDescription className="text-xs mt-0.5">
                Register a new satellite campus under your institutional network hierarchy.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Parent institution banner */}
        <div className="p-3 bg-muted/40 rounded-lg border border-border/60 text-xs space-y-1 mt-1">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground font-medium flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-primary" />
              Parent Institution
            </span>
            <Badge variant="outline" className="font-mono text-[10px] bg-background">
              {parentCode}
            </Badge>
          </div>
          <div className="font-semibold text-foreground text-sm">
            {parentSchool.name}
          </div>
          <p className="text-[11px] text-muted-foreground flex items-center gap-1 pt-0.5">
            <Info className="h-3 w-3 text-sky-500 shrink-0" />
            This branch inherits the parent institution&apos;s active check-in curriculum automatically.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs rounded-lg flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs rounded-lg flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 pt-1">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">
              Branch Campus Name *
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={`e.g. ${parentSchool.name} - Indiranagar Branch`}
              className="h-9 text-xs"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                Branch Location / City *
              </label>
              <div className="relative">
                <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Bangalore"
                  className="pl-8 h-9 text-xs"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                Branch Code *
              </label>
              <Input
                value={schoolCode}
                onChange={(e) => setSchoolCode(e.target.value.toUpperCase())}
                placeholder={`e.g. ${parentSchool.school_code}-INDIRA`}
                className="h-9 text-xs font-mono"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                Branch Admin / Contact Person
              </label>
              <Input
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="e.g. Dr. Meera Rao (Principal)"
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                Contact Phone Number
              </label>
              <div className="relative">
                <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="e.g. +91 98765 43210"
                  className="pl-8 h-9 text-xs font-mono"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="pt-3 border-t border-border/40 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={submitting}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={submitting}
              className="text-xs gap-1.5"
            >
              <GitBranch className="h-3.5 w-3.5" />
              {submitting ? "Provisioning Branch..." : "Provision Branch Campus"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
