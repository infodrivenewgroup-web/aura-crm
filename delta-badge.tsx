"use client"

import { ArrowDownRight, ArrowUpRight, Minus, CircleDashed } from "lucide-react"
import { cn } from "@/lib/utils"
import { fmtPct } from "@/lib/format"

export type DeltaSize = "sm" | "md"

/**
 * Интуитивно понятный индикатор изменения показателя: стрелка вверх (рост,
 * зелёный), вниз (снижение, красный), «—» (без изменений) или пунктирный круг
 * (нет базы для сравнения / период ещё не завершён).
 */
export function DeltaBadge({
  delta,
  size = "sm",
  pending = false,
  pendingLabel = "в течение дня",
  className,
}: {
  delta: number | null
  size?: DeltaSize
  /** Период ещё не завершён — сравнение некорректно, показываем нейтрально. */
  pending?: boolean
  pendingLabel?: string
  className?: string
}) {
  const dims = size === "md" ? "text-sm px-2 py-1 gap-1" : "text-[11px] px-1.5 py-0.5 gap-0.5"
  const iconSize = size === "md" ? "size-4" : "size-3"

  if (pending) {
    return (
      <span
        className={cn(
          "inline-flex items-center rounded-md border border-border bg-muted/50 font-medium tabular-nums text-muted-foreground",
          dims,
          className,
        )}
      >
        <CircleDashed className={iconSize} />
        {pendingLabel}
      </span>
    )
  }

  if (delta === null) {
    return (
      <span
        className={cn(
          "inline-flex items-center rounded-md border border-border bg-muted/50 font-medium tabular-nums text-muted-foreground",
          dims,
          className,
        )}
      >
        <Minus className={iconSize} />
        нет базы
      </span>
    )
  }

  const up = delta > 0.0001
  const down = delta < -0.0001
  const Icon = up ? ArrowUpRight : down ? ArrowDownRight : Minus
  const tone = up
    ? "border-[color:var(--positive)]/40 bg-[color:var(--positive)]/10 text-[color:var(--positive)]"
    : down
      ? "border-[color:var(--negative)]/40 bg-[color:var(--negative)]/10 text-[color:var(--negative)]"
      : "border-border bg-muted/50 text-muted-foreground"

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border font-semibold tabular-nums",
        dims,
        tone,
        className,
      )}
    >
      <Icon className={iconSize} />
      {fmtPct(delta)}
    </span>
  )
}
