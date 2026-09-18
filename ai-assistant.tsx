"use client"

import { useMemo } from "react"
import {
  ArrowDownRight,
  ArrowUpRight,
  Minus,
  Sparkles,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { CashboxReport } from "@/lib/sales/types"
import { buildCashboxDigest, type InsightTone } from "@/lib/sales/cashbox-insights"

function toneClasses(tone: InsightTone): { wrap: string; icon: string } {
  switch (tone) {
    case "positive":
      return {
        wrap: "border-[color:var(--positive)]/30 bg-[color:var(--positive)]/5",
        icon: "text-[color:var(--positive)]",
      }
    case "negative":
      return {
        wrap: "border-[color:var(--negative)]/30 bg-[color:var(--negative)]/5",
        icon: "text-[color:var(--negative)]",
      }
    case "info":
      return {
        wrap: "border-[color:var(--primary)]/25 bg-[color:var(--primary)]/5",
        icon: "text-[color:var(--primary)]",
      }
    default:
      return { wrap: "border-border bg-muted/30", icon: "text-muted-foreground" }
  }
}

function ToneIcon({ tone, className }: { tone: InsightTone; className?: string }) {
  if (tone === "positive") return <ArrowUpRight className={className} />
  if (tone === "negative") return <ArrowDownRight className={className} />
  return <Minus className={className} />
}

/**
 * ИИ-ассистент кассы: в реальном времени формирует сводку по входящим
 * платежам за день и неделю (со сравнением с прошлой неделей). Текст строится
 * детерминированно из точных цифр отчёта — поэтому всегда достоверен.
 */
export function CashboxAiAssistant({ report }: { report: CashboxReport }) {
  const digest = useMemo(() => buildCashboxDigest(report), [report])
  const head = toneClasses(digest.headlineTone)

  const updated = useMemo(() => {
    try {
      return new Intl.DateTimeFormat("ru-RU", {
        timeZone: "Europe/Moscow",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }).format(new Date(digest.generatedAt))
    } catch {
      return ""
    }
  }, [digest.generatedAt])

  return (
    <section
      className="flex flex-col gap-4 rounded-2xl border border-border bg-gradient-to-b from-card to-background p-5"
      aria-label="Сводка ИИ-ассистента по кассе"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex size-8 items-center justify-center rounded-lg bg-[color:var(--primary)]/15">
            <Sparkles className="size-4 text-[color:var(--primary)]" />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              ИИ-ассистент кассы
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Анализ входящих платежей в реальном времени
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-md border border-[color:var(--positive)]/40 bg-[color:var(--positive)]/10 px-2 py-1 text-[11px] font-medium text-[color:var(--positive)]">
          <span className="inline-block size-1.5 animate-pulse rounded-full bg-[color:var(--positive)]" />
          {updated ? `обновлено ${updated} МСК` : "в реальном времени"}
        </span>
      </div>

      {/* Главный сигнал ситуации */}
      <div className={cn("flex items-start gap-2.5 rounded-xl border p-4", head.wrap)}>
        <ToneIcon tone={digest.headlineTone} className={cn("mt-0.5 size-5 shrink-0", head.icon)} />
        <p className="text-pretty text-sm font-medium leading-relaxed text-foreground">
          {digest.headline}
        </p>
      </div>

      {/* Аналитические тезисы */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {digest.insights.map((ins, i) => {
          const t = toneClasses(ins.tone)
          return (
            <div
              key={i}
              className={cn("flex flex-col gap-1.5 rounded-xl border p-3.5", t.wrap)}
            >
              <div className="flex items-center gap-1.5">
                <ToneIcon tone={ins.tone} className={cn("size-4 shrink-0", t.icon)} />
                <h4 className="text-xs font-semibold text-foreground">{ins.title}</h4>
              </div>
              <p className="text-pretty text-[12px] leading-relaxed text-muted-foreground">
                {ins.text}
              </p>
            </div>
          )
        })}
      </div>

      <p className="text-[11px] leading-relaxed text-muted-foreground/80">
        Сводка формируется автоматически на основе фактических оплаченных заявок
        из базы и обновляется вместе с данными. Все проценты рассчитаны за
        сопоставимые периоды (like-for-like), чтобы сравнение всегда было честным.
      </p>
    </section>
  )
}
