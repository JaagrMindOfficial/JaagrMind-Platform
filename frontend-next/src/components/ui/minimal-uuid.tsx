"use client"

import React, { useState, useRef, useEffect } from "react"
import { createPortal } from "react-dom"
import { Copy, Check } from "lucide-react"

interface MinimalUUIDProps {
  uuid?: string
  id?: string
  label?: string
  length?: number
  className?: string
  showCopyOnHover?: boolean
}

export function MinimalUUID({
  uuid,
  id,
  label,
  length = 8,
  className = "",
  showCopyOnHover = true,
}: MinimalUUIDProps) {
  const [copied, setCopied] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [mounted, setMounted] = useState(false)
  const triggerRef = useRef<HTMLDivElement>(null)
  const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0, isBelow: false })

  const rawId = uuid || id || ""

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!rawId) return null

  const updatePosition = () => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const shouldBeBelow = rect.top < 60
    const top = shouldBeBelow
      ? rect.bottom + 6
      : rect.top - 6
    const left = rect.left + rect.width / 2

    setPopoverPos({ top, left, isBelow: shouldBeBelow })
  }

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(rawId)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  const handleMouseEnter = () => {
    updatePosition()
    setIsHovered(true)
  }

  const handleMouseLeave = () => {
    setIsHovered(false)
  }

  const shortUUID =
    rawId.length > length * 2
      ? `${rawId.slice(0, length)}...${rawId.slice(-4)}`
      : rawId

  return (
    <>
      <div
        ref={triggerRef}
        className={`relative inline-flex items-center gap-1 group font-mono text-[11px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer select-none ${className}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleCopy}
        title="Click to copy full UUID"
      >
        <span className="select-all">{shortUUID}</span>
        {showCopyOnHover && (
          <span
            className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-primary"
            onClick={handleCopy}
          >
            {copied ? (
              <Check className="h-3 w-3 text-emerald-500 animate-in zoom-in" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </span>
        )}
      </div>

      {mounted &&
        isHovered &&
        createPortal(
          <div
            style={{
              position: "fixed",
              top: `${popoverPos.top}px`,
              left: `${popoverPos.left}px`,
              transform: popoverPos.isBelow
                ? "translateX(-50%)"
                : "translate(-50%, -100%)",
            }}
            className="z-[99999] px-2.5 py-1.5 bg-popover/98 backdrop-blur-sm text-popover-foreground text-[10px] font-mono rounded-md shadow-xl border border-border whitespace-nowrap pointer-events-none animate-in fade-in-0 zoom-in-95 flex items-center gap-2"
          >
            <span>{label ? `${label}: ${rawId}` : rawId}</span>
            <span className="text-[9px] text-primary font-sans font-medium">
              {copied ? "Copied!" : "Click to copy"}
            </span>
          </div>,
          document.body
        )}
    </>
  )
}
