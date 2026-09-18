"use client"

import React, { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  GraduationCap,
  ShieldCheck,
  Building2,
  BrainCircuit,
  Cpu,
  Clock,
  Filter,
  RefreshCw,
  UserCheck,
  Sparkles,
  Search,
  ExternalLink,
} from "lucide-react"
import { MinimalUUID } from "@/components/ui/minimal-uuid"

export interface AuditEvent {
  id: string
  school_id?: string
  school_name?: string
  actor_id?: string
  actor_name: string
  actor_role: string
  event_type: string // 'security' | 'academic' | 'governance' | 'counseling' | 'system'
  action: string
  title: string
  description: string
  metadata?: Record<string, any>
  created_at: string
}

interface EventsAuditCardProps {
  events: AuditEvent[]
  loading?: boolean
  onRefresh?: () => void
  schools?: { id: string; name: string; code?: string }[]
  selectedSchoolId?: string
  onSelectSchool?: (schoolId: string) => void
  isAdminView?: boolean
  title?: string
  description?: string
}

export function EventsAuditCard({
  events = [],
  loading = false,
  onRefresh,
  schools = [],
  selectedSchoolId = "all",
  onSelectSchool,
  isAdminView = false,
  title = "Institutional Governance & Audit Events",
  description = "Real-time log of major administrative actions, academic rovers, security changes, and system modifications.",
}: EventsAuditCardProps) {
  const [selectedType, setSelectedType] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState<string>("")

  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      if (selectedType !== "all" && ev.event_type !== selectedType) {
        return false
      }
      if (selectedSchoolId !== "all" && ev.school_id && ev.school_id !== selectedSchoolId) {
        return false
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const titleMatch = ev.title?.toLowerCase().includes(q)
        const descMatch = ev.description?.toLowerCase().includes(q)
        const actorMatch = ev.actor_name?.toLowerCase().includes(q)
        const schoolMatch = ev.school_name?.toLowerCase().includes(q)
        const actionMatch = ev.action?.toLowerCase().includes(q)
        if (!titleMatch && !descMatch && !actorMatch && !schoolMatch && !actionMatch) {
          return false
        }
      }
      return true
    })
  }, [events, selectedType, selectedSchoolId, searchQuery])

  const getEventIcon = (type: string) => {
    switch (type) {
      case "academic":
        return <GraduationCap className="h-4 w-4 text-sky-500" />
      case "security":
        return <ShieldCheck className="h-4 w-4 text-emerald-500" />
      case "governance":
        return <Building2 className="h-4 w-4 text-purple-500" />
      case "counseling":
        return <BrainCircuit className="h-4 w-4 text-amber-500" />
      case "system":
      default:
        return <Cpu className="h-4 w-4 text-slate-500" />
    }
  }

  const getEventTypeBadge = (type: string) => {
    switch (type) {
      case "academic":
        return <Badge variant="outline" className="bg-sky-500/10 text-sky-600 border-sky-500/20 text-[10px]">Academic</Badge>
      case "security":
        return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">Security</Badge>
      case "governance":
        return <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/20 text-[10px]">Governance</Badge>
      case "counseling":
        return <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px]">Counseling</Badge>
      case "system":
      default:
        return <Badge variant="outline" className="bg-slate-500/10 text-slate-600 border-slate-500/20 text-[10px]">System</Badge>
    }
  }

  const getActorRoleBadge = (role: string) => {
    switch (role) {
      case "superadmin":
        return <Badge variant="outline" className="bg-indigo-500/10 text-indigo-600 border-indigo-500/20 text-[9px] font-mono">Super Admin</Badge>
      case "school_admin":
        return <Badge variant="outline" className="bg-teal-500/10 text-teal-600 border-teal-500/20 text-[9px] font-mono">School Admin</Badge>
      case "counselor":
        return <Badge variant="outline" className="bg-rose-500/10 text-rose-600 border-rose-500/20 text-[9px] font-mono">Counselor</Badge>
      case "system":
      default:
        return <Badge variant="outline" className="bg-zinc-500/10 text-zinc-500 border-zinc-500/20 text-[9px] font-mono">System</Badge>
    }
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "Just now"
    const d = new Date(dateStr)
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
  }

  return (
    <Card className="border-border shadow-none">
      <CardHeader className="border-b border-border/40 pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              {title}
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              {description}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {onRefresh && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1.5"
                onClick={onRefresh}
                disabled={loading}
              >
                <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            )}
            <Badge variant="outline" className="font-mono text-[11px]">
              {filteredEvents.length} {filteredEvents.length === 1 ? "Event" : "Events"}
            </Badge>
          </div>
        </div>

        {/* Filters bar */}
        <div className="flex flex-wrap items-center gap-2 pt-3">
          {/* School filter (if Admin view) */}
          {isAdminView && schools.length > 0 && onSelectSchool && (
            <div className="flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
              <select
                aria-label="Filter events by institution"
                className="h-8 text-xs rounded-md border border-input bg-background px-2 py-1 font-medium focus:outline-none focus:ring-1 focus:ring-ring"
                value={selectedSchoolId}
                onChange={(e) => onSelectSchool(e.target.value)}
              >
                <option value="all">All Institutions ({schools.length})</option>
                {schools.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.code ? `(${s.code})` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Event type filter pills */}
          <div className="flex items-center gap-1 overflow-x-auto py-1">
            {[
              { id: "all", label: "All Types" },
              { id: "academic", label: "Academic" },
              { id: "security", label: "Security" },
              { id: "governance", label: "Governance" },
              { id: "counseling", label: "Counseling" },
            ].map((type) => (
              <button
                key={type.id}
                onClick={() => setSelectedType(type.id)}
                className={`text-[11px] px-2.5 py-1 rounded-full border transition-all ${
                  selectedType === type.id
                    ? "bg-primary text-primary-foreground border-primary font-medium"
                    : "bg-muted/40 text-muted-foreground border-border hover:bg-muted"
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>

          {/* Search box */}
          <div className="ml-auto relative">
            <Search className="h-3 w-3 absolute left-2.5 top-2.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search audit trail..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-7 pr-2.5 text-xs rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring w-40 sm:w-48"
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {loading ? (
          <div className="p-8 text-center text-xs text-muted-foreground">
            <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-muted-foreground/60" />
            Loading real-time audit trail...
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground">
            No events found matching the specified filters.
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {filteredEvents.map((ev) => (
              <div
                key={ev.id}
                className="p-3.5 hover:bg-muted/30 transition-colors flex flex-col md:flex-row md:items-start justify-between gap-3 text-xs"
              >
                {/* Left side: Icon + details */}
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="mt-0.5 p-2 rounded-lg bg-muted border border-border/50 shrink-0">
                    {getEventIcon(ev.event_type)}
                  </div>
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-foreground text-sm">
                        {ev.title}
                      </span>
                      {getEventTypeBadge(ev.event_type)}
                      <span className="font-mono text-[10px] text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded border border-border/40">
                        {ev.action}
                      </span>
                      {isAdminView && ev.school_name && (
                        <span className="font-medium text-[11px] text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {ev.school_name}
                        </span>
                      )}
                    </div>

                    <p className="text-muted-foreground text-xs leading-relaxed">
                      {ev.description}
                    </p>

                    {/* Metadata tags */}
                    {ev.metadata && Object.keys(ev.metadata).length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap pt-1">
                        {Object.entries(ev.metadata).map(([key, value]) => {
                          const strVal = typeof value === "object" ? JSON.stringify(value) : String(value)
                          return (
                            <span
                              key={key}
                              className="inline-flex items-center gap-1 text-[10px] font-mono bg-muted/60 text-muted-foreground px-2 py-0.5 rounded border border-border/40"
                            >
                              <span className="text-foreground/70">{key}:</span>
                              <span className="font-medium text-foreground">{strVal}</span>
                            </span>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right side: Actor info + timestamp */}
                <div className="flex md:flex-col items-center md:items-end justify-between md:justify-start gap-1 shrink-0 pt-1 md:pt-0 border-t md:border-t-0 border-border/30">
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-foreground text-[11px]">
                      {ev.actor_name || "System"}
                    </span>
                    {getActorRoleBadge(ev.actor_role)}
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono">
                    <Clock className="h-3 w-3 text-muted-foreground/70" />
                    {formatDate(ev.created_at)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
