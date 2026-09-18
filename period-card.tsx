"use client"

import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react"
import { cn } from "@/lib/utils"
import { fmtMoney, fmtNum, fmtPct } from "@/lib/format"
import type { PeriodStat } from "@/lib/sales/types"

/** Расшифровка сумм/количеств по двум кассам. */
export function CashboxBreakdown({ stat }: { stat: PeriodStat }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <div className="rounded-lg border border-border bg-background/50 px-3 py-2">
        <div className="flex items-center gap-1.5">
          <span className="inline-block size-2 rounded-full bg-[color:var(--primary)]" />
          <span className="text-xs font-medium text-muted-foreground">Платега</span>
        </div>
        <div className="mt-1 text-sm font-bold tabular-nums text-foreground">
          {fmtMoney(stat.platega.sum)}
        </div>
        <div className="text-[11px] text-muted-foreground">
          {fmtNum(stat.platega.count)} заявок
        </div>
      </div>
      <div className="rounded-lg border border-border bg-background/50 px-3 py-2">
        <div className="flex items-center gap-1.5">
          <span className="inline-block size-2 rounded-full bg-[color:var(--accent)]" />
          <span className="text-xs font-medium text-muted-foreground">Кашера</span>
        </div>
        <div className="mt-1 text-sm font-bold tabular-nums text-foreground">
          {fmtMoney(stat.kassera.sum)}
        </div>
        <div className="text-[11px] text-muted-foreground">
          {fmtNum(stat.kassera.count)} заявок
        </div>
      </div>
    </div>
  )
}

/** Оценка динамики по проценту изменения. */
export function trendAssessment(deltaPct: number | null): {
  tone: string
  icon: typeof ArrowUpRight
  text: string
} {
  if (deltaPct === null) {
    return { tone: "text-muted-foreground", icon: Minus, text: "нет данных для сравнения" }
  }
  if (deltaPct > 0) {
    return {
      tone: "text-[color:var(--positive)]",
      icon: ArrowUpRight,
      text: "рост показателей — ситуация улучшается",
    }
  }
  if (deltaPct < 0) {
    return {
      tone: "text-[color:var(--negative)]",
      icon: ArrowDownRight,
      text: "снижение показателей — ситуация ухудшается",
    }
  }
  return { tone: "text-muted-foreground", icon: Minus, text: "без изменений" }
}

/** Карточка одиночного дня (сегодня/вчера/позавчера). */
export function DayCard({
  title,
  subtitle,
  stat,
  highlight,
}: {
  title: string
  subtitle?: string
  stat: PeriodStat
  highlight?: boolean
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border p-4",
        highlight
          ? "border-[color:var(--primary)]/40 bg-[color:var(--primary)]/5"
          : "border-border bg-card",
      )}
    >
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {subtitle ? (
            <p className="text-[11px] text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
        <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
          {fmtNum(stat.totalCount)} опл.
        </span>
      </div>

      <div>
        <div className="text-2xl font-bold tabular-nums text-foreground">
          {fmtMoney(stat.totalSum)}
        </div>
        <p className="text-[11px] text-muted-foreground">общая сумма оплаченных заявок</p>
      </div>

      <CashboxBreakdown stat={stat} />
    </div>
  )
}

/** Карточка периода со сравнением (неделя/месяц). */
export function ComparisonCard({
  title,
  subtitle,
  current,
  countDeltaPct,
  sumDeltaPct,
  prevLabel,
  elapsedDays,
  periodDays,
}: {
  title: string
  subtitle?: string
  current: PeriodStat
  countDeltaPct: number | null
  sumDeltaPct: number | null
  prevLabel: string
  elapsedDays: number
  periodDays: number
}) {
  const assess = trendAssessment(sumDeltaPct)
  const Icon = assess.icon
  const inProgress = elapsedDays < periodDays

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {subtitle ? (
            <p className="text-[11px] text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
            {fmtNum(current.totalCount)} опл.
          </span>
          {inProgress ? (
            <span className="rounded-md bg-[color:var(--primary)]/10 px-2 py-0.5 text-[10px] font-medium tabular-nums text-[color:var(--primary)]">
              накопительно · {fmtNum(elapsedDays)} из {fmtNum(periodDays)} дн.
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex items-end justify-between gap-2">
        <div>
          <div className="text-2xl font-bold tabular-nums text-foreground">
            {fmtMoney(current.totalSum)}
          </div>
          <p className="text-[11px] text-muted-foreground">общая сумма оплаченных заявок</p>
        </div>
        <div className={cn("flex flex-col items-end", assess.tone)}>
          <span className="inline-flex items-center gap-1 text-sm font-semibold tabular-nums">
            <Icon className="size-4" />
            {fmtPct(sumDeltaPct)}
          </span>
          <span className="text-[11px] tabular-nums text-muted-foreground">
            заявки {fmtPct(countDeltaPct)}
          </span>
        </div>
      </div>

      <CashboxBreakdown stat={current} />

      <div className={cn("flex items-start gap-1.5 text-[11px]", assess.tone)}>
        <Icon className="mt-0.5 size-3.5 shrink-0" />
        <span>
          {assess.text} <span className="text-muted-foreground">(в сравнении: {prevLabel})</span>
        </span>
      </div>
    </div>
  )
}
