"use client"

import type { ReactNode } from "react"
import { ArrowDownRight, ArrowUpRight, Minus, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { fmtMoney, fmtNum, fmtPct } from "@/lib/format"
import type { PeriodStat } from "@/lib/sales/types"
import type { InsightTone, OverviewDigest } from "@/lib/sales/overview-insights"

/** Классы цвета текста по тону вывода ИИ. */
export function toneText(tone: InsightTone): string {
  switch (tone) {
    case "positive":
      return "text-[color:var(--positive)]"
    case "negative":
      return "text-[color:var(--negative)]"
    case "info":
      return "text-[color:var(--primary)]"
    default:
      return "text-muted-foreground"
  }
}

/** Классы фоновой заливки/границы по тону (для блоков-акцентов). */
export function toneSurface(tone: InsightTone): string {
  switch (tone) {
    case "positive":
      return "border-[color:var(--positive)]/35 bg-[color:var(--positive)]/10"
    case "negative":
      return "border-[color:var(--negative)]/35 bg-[color:var(--negative)]/10"
    case "info":
      return "border-[color:var(--primary)]/35 bg-[color:var(--primary)]/10"
    default:
      return "border-border bg-muted/40"
  }
}

/** Пилюля изменения показателя (в процентах) со стрелкой направления. */
export function TrendPill({
  deltaPct,
  label,
  className,
}: {
  deltaPct: number | null
  label?: string
  className?: string
}) {
  let tone: InsightTone = "neutral"
  let Icon = Minus
  if (deltaPct !== null && deltaPct > 0.0001) {
    tone = "positive"
    Icon = ArrowUpRight
  } else if (deltaPct !== null && deltaPct < -0.0001) {
    tone = "negative"
    Icon = ArrowDownRight
  }
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold tabular-nums",
        deltaPct === null ? "bg-muted text-muted-foreground" : toneSurface(tone),
        deltaPct === null ? "" : toneText(tone),
        className,
      )}
    >
      <Icon className="size-3.5" />
      {fmtPct(deltaPct)}
      {label ? <span className="font-normal text-muted-foreground">{label}</span> : null}
    </span>
  )
}

/** Мини-расшифровка по двум кассам (суммы и количества) в виде доли-полосы. */
export function CashboxSplit({ stat }: { stat: PeriodStat }) {
  const total = stat.totalCount || 0
  const pPct = total > 0 ? (stat.platega.count / total) * 100 : 0
  const kPct = total > 0 ? (stat.kassera.count / total) * 100 : 0
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-[color:var(--primary)]"
          style={{ width: `${pPct}%` }}
          aria-hidden
        />
        <div
          className="h-full bg-[color:var(--accent)]"
          style={{ width: `${kPct}%` }}
          aria-hidden
        />
      </div>
      <div className="flex items-center justify-between gap-2 text-[11px]">
        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
          <span className="inline-block size-2 rounded-full bg-[color:var(--primary)]" />
          Платега
          <span className="font-semibold tabular-nums text-foreground">
            {fmtMoney(stat.platega.sum)}
          </span>
          <span className="tabular-nums">· {fmtNum(stat.platega.count)}</span>
        </span>
        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
          <span className="font-semibold tabular-nums text-foreground">
            {fmtMoney(stat.kassera.sum)}
          </span>
          <span className="tabular-nums">· {fmtNum(stat.kassera.count)}</span>
          Кашера
          <span className="inline-block size-2 rounded-full bg-[color:var(--accent)]" />
        </span>
      </div>
    </div>
  )
}

/** Верхняя KPI-строка периода: сумма, заявки, дельта, прогресс. */
export function KpiStrip({
  stat,
  sumDeltaPct,
  countDeltaPct,
  compareLabel,
  progress,
}: {
  stat: PeriodStat
  sumDeltaPct: number | null
  countDeltaPct: number | null
  compareLabel: string
  progress?: string
}) {
  return (
    <div className="grid grid-cols-1 gap-3 rounded-xl border border-border bg-background/60 p-4 sm:grid-cols-3">
      <div className="sm:col-span-1">
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
          Общая сумма
        </div>
        <div className="mt-0.5 text-2xl font-bold tabular-nums text-foreground">
          {fmtMoney(stat.totalSum)}
        </div>
        {progress ? (
          <div className="mt-0.5 text-[11px] tabular-nums text-[color:var(--primary)]">
            {progress}
          </div>
        ) : null}
      </div>
      <div>
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
          Оплаченных заявок
        </div>
        <div className="mt-0.5 text-2xl font-bold tabular-nums text-foreground">
          {fmtNum(stat.totalCount)}
        </div>
        <div className="mt-0.5 text-[11px] text-muted-foreground">
          средний чек {fmtMoney(stat.totalSum / Math.max(1, stat.totalCount))}
        </div>
      </div>
      <div className="flex flex-col items-start gap-1 sm:items-end">
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
          Динамика
        </div>
        <TrendPill deltaPct={sumDeltaPct} />
        <TrendPill deltaPct={countDeltaPct} label="заявки" className="text-[11px]" />
        <div className="text-[11px] text-muted-foreground sm:text-right">{compareLabel}</div>
      </div>
    </div>
  )
}

/** Карточка сводки ИИ-ассистента: заголовок-резюме + тезисы. */
export function AiDigestCard({ digest }: { digest: OverviewDigest }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-[color:var(--primary)]/25 bg-[color:var(--primary)]/5 p-4">
      <div className="flex items-center gap-2">
        <span className="flex size-7 items-center justify-center rounded-lg bg-[color:var(--primary)]/15">
          <Sparkles className="size-4 text-[color:var(--primary)]" />
        </span>
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-foreground">Вывод ИИ-ассистента</span>
          <span className="text-[11px] text-muted-foreground">
            на основе точных данных · обновляется в реальном времени
          </span>
        </div>
      </div>

      <div
        className={cn(
          "rounded-lg border p-3 text-sm font-medium leading-relaxed",
          toneSurface(digest.headlineTone),
          toneText(digest.headlineTone),
        )}
      >
        {digest.headline}
      </div>

      <ul className="flex flex-col gap-2.5">
        {digest.insights.map((it, i) => (
          <li key={i} className="flex gap-2.5">
            <span
              className={cn(
                "mt-1.5 inline-block size-2 shrink-0 rounded-full",
                it.tone === "positive" && "bg-[color:var(--positive)]",
                it.tone === "negative" && "bg-[color:var(--negative)]",
                it.tone === "info" && "bg-[color:var(--primary)]",
                it.tone === "neutral" && "bg-muted-foreground",
              )}
              aria-hidden
            />
            <div className="min-w-0">
              <div className="text-xs font-semibold text-foreground">{it.title}</div>
              <p className="text-[13px] leading-relaxed text-muted-foreground">{it.text}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Обёртка аналитического блока с заголовком и подписью. */
export function AnalyticsBlock({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: ReactNode
  title: string
  subtitle: string
  children: ReactNode
}) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-border bg-gradient-to-b from-card to-background p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
        </div>
        <span className="text-[11px] text-muted-foreground">{subtitle}</span>
      </div>
      {children}
    </section>
  )
}
