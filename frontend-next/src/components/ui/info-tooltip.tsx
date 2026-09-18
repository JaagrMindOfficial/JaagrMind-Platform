"use client"

import React, { useState, useRef, useEffect } from "react"
import { createPortal } from "react-dom"
import { Info } from "lucide-react"

interface InfoTooltipProps {
  content?: string
  text?: string
  title?: string
  className?: string
  side?: "top" | "bottom" | "left" | "right"
}

export function InfoTooltip({
  content,
  text,
  title,
  className = "",
  side = "top",
}: InfoTooltipProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const triggerRef = useRef<HTMLSpanElement>(null)
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0, isBelow: false })

  const displayContent = text || content || ""

  useEffect(() => {
    setMounted(true)
  }, [])

  const updatePosition = () => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const tooltipWidth = 260
    const padding = 12

    // Decide if below or above: if too close to top of viewport (< 140px), show below
    const shouldBeBelow = rect.top < 140 || side === "bottom"

    const top = shouldBeBelow
      ? rect.bottom + 8
      : rect.top - 8

    let left = rect.left + rect.width / 2 - tooltipWidth / 2

    // Boundary constraints within viewport
    if (left < padding) {
      left = padding
    } else if (left + tooltipWidth > window.innerWidth - padding) {
      left = window.innerWidth - tooltipWidth - padding
    }

    setTooltipPos({ top, left, isBelow: shouldBeBelow })
  }

  const handleMouseEnter = () => {
    updatePosition()
    setIsOpen(true)
  }

  const handleMouseLeave = () => {
    setIsOpen(false)
  }

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    updatePosition()
    setIsOpen((prev) => !prev)
  }

  useEffect(() => {
    if (isOpen) {
      const handleScrollOrResize = () => updatePosition()
      window.addEventListener("scroll", handleScrollOrResize, true)
      window.addEventListener("resize", handleScrollOrResize)
      return () => {
        window.removeEventListener("scroll", handleScrollOrResize, true)
        window.removeEventListener("resize", handleScrollOrResize)
      }
    }
  }, [isOpen])

  return (
    <>
      <span
        ref={triggerRef}
        className={`relative inline-flex items-center align-middle mx-1 cursor-help group select-none ${className}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        tabIndex={0}
        onFocus={handleMouseEnter}
        onBlur={handleMouseLeave}
        aria-label={title || displayContent}
      >
        <span className="h-4 w-4 rounded-full bg-muted/80 hover:bg-primary/20 text-muted-foreground hover:text-primary flex items-center justify-center transition-colors border border-border/60">
          <Info className="h-2.5 w-2.5" />
        </span>
      </span>

      {mounted &&
        isOpen &&
        displayContent &&
        createPortal(
          <div
            style={{
              position: "fixed",
              top: `${tooltipPos.top}px`,
              left: `${tooltipPos.left}px`,
              transform: tooltipPos.isBelow ? "none" : "translateY(-100%)",
            }}
            className="z-[99999] w-[260px] p-2.5 bg-popover/98 backdrop-blur-sm text-popover-foreground text-xs rounded-lg shadow-2xl border border-border font-normal leading-relaxed text-left pointer-events-none animate-in fade-in-0 zoom-in-95 duration-150"
            role="tooltip"
          >
            {title && (
              <div className="font-semibold text-foreground mb-1 text-[11px] flex items-center gap-1.5">
                <Info className="h-3 w-3 text-primary shrink-0" />
                <span>{title}</span>
              </div>
            )}
            <div className="text-muted-foreground text-[11px] leading-relaxed">
              {displayContent}
            </div>
          </div>,
          document.body
        )}
    </>
  )
}
