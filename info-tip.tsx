"use client"

import { useEffect, useId, useRef, useState } from "react"
import { Info } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Доступная пояснительная сноска. Работает и мышью (hover/focus), и касанием
 * (tap) — что важно для мобильных устройств. Закрывается по Escape, потере
 * фокуса и клику вне области.
 */
export function InfoTip({
  label,
  children,
  className,
}: {
  /** Доступное имя кнопки для скринридеров. */
  label: string
  /** Содержимое всплывающей подсказки. */
  children: React.ReactNode
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const id = useId()
  const wrapRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!open) return
    function onDown(e: PointerEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("pointerdown", onDown)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("pointerdown", onDown)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  return (
    <span
      ref={wrapRef}
      className={cn("relative inline-flex", className)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-describedby={open ? id : undefined}
        onClick={(e) => {
          e.stopPropagation()
          setOpen((v) => !v)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="inline-flex size-4 items-center justify-center rounded-full text-muted-foreground/70 transition-colors hover:text-foreground focus:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--primary)]/50"
      >
        <Info className="size-3.5" />
      </button>
      {open ? (
        <span
          role="tooltip"
          id={id}
          className="absolute left-1/2 top-full z-50 mt-1.5 w-56 -translate-x-1/2 rounded-lg border border-border bg-popover px-3 py-2 text-left text-[11px] font-normal leading-relaxed text-popover-foreground shadow-lg"
        >
          {children}
        </span>
      ) : null}
    </span>
  )
}
