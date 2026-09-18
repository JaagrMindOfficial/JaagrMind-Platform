import * as React from "react"
import { Check } from "lucide-react"

export interface CheckboxProps {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  disabled?: boolean
  className?: string
  id?: string
  onClick?: (e: React.MouseEvent) => void
}

export function Checkbox({
  checked = false,
  onCheckedChange,
  disabled = false,
  className = "",
  id,
  onClick,
}: CheckboxProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      id={id}
      onClick={(e: React.MouseEvent) => {
        onClick?.(e)
        if (!disabled) {
          onCheckedChange?.(!checked)
        }
      }}
      className={`h-4 w-4 shrink-0 rounded border transition-colors flex items-center justify-center focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ${
        checked
          ? "bg-primary border-primary text-primary-foreground"
          : "border-input bg-background hover:bg-muted/40"
      } ${className}`}
    >
      {checked && <Check className="h-3 w-3 stroke-[3]" />}
    </button>
  )
}
