"use client"

import { AlertCircle, CalendarDays, CreditCard, TrendingUp } from "lucide-react"
import { MoscowClock } from "@/components/crm/moscow-clock"
import { useCashboxReport } from "@/hooks/use-cashbox-report"
import { fmtMoney, fmtNum, weekLabel } from "@/lib/format"
import { DailyTable } from "./daily-table"
import { CashboxAiAssistant } from "./ai-assistant"
import { MonthlySection } from "./monthly-section"
import { InfoTip } from "./info-tip"

/** Итоговая плашка недели над таблицей. */
function WeekSummary({
  count,
  sum,
  label,
}: {
  count: number
  sum: number
  label: string
}) {
  return (
    <div className="flex flex-col items-start gap-1 rounded-xl border border-border bg-card px-4 py-3 sm:items-end">
      <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="text-lg font-bold tabular-nums text-foreground">
        {fmtMoney(sum)}
      </span>
      <span className="text-[11px] tabular-nums text-muted-foreground">
        {fmtNum(count)} заявок
      </span>
    </div>
  )
}

export function CashboxPage() {
  const { report, error, isLoading } = useCashboxReport()

  return (
    <div className="flex flex-col gap-6">
      {/* Шапка */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <CreditCard className="size-6 text-[color:var(--primary)]" />
            Касса
          </h1>
          <p className="mt-1 max-w-2xl text-pretty text-sm text-muted-foreground">
            Все входящие платежи по каждому дню за 7 дней с разбивкой по двум
            кассам, индикаторами динамики и живой сводкой ИИ-ассистента. Данные
            обновляются в реальном времени.
          </p>
        </div>
        <MoscowClock />
      </div>

      {error ? (
        <div className="flex items-center gap-2 rounded-xl border border-[color:var(--negative)]/40 bg-[color:var(--negative)]/10 p-4 text-sm text-[color:var(--negative)]">
          <AlertCircle className="size-4 shrink-0" />
          Не удалось загрузить отчёт кассы. Данные появятся, как только связь
          восстановится.
        </div>
      ) : null}

      {!report && isLoading ? (
        <div className="flex flex-col gap-3">
          <div className="h-24 animate-pulse rounded-2xl border border-border bg-muted/40" />
          <div className="h-80 animate-pulse rounded-2xl border border-border bg-muted/40" />
          <div className="h-64 animate-pulse rounded-2xl border border-border bg-muted/40" />
        </div>
      ) : null}

      {report ? (
        <>
          {/* Ежедневные приходы */}
          <section className="flex flex-col gap-4 rounded-2xl border border-border bg-gradient-to-b from-card to-background p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <CalendarDays className="size-5 text-[color:var(--income)]" />
                <h2 className="text-base font-semibold text-foreground">
                  Приходы по дням
                </h2>
                <InfoTip label="Пояснение по таблице приходов">
                  Каждая строка — один день по московскому времени. Показаны
                  суммы и число оплаченных заявок по кассам «Платега» и «Кашера»
                  и итог за день. Стрелки показывают рост или снижение к
                  предыдущему дню.
                </InfoTip>
              </div>
              <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <TrendingUp className="size-3.5 text-[color:var(--income)]" />
                последние 7 дней · статус «оплачено»
              </span>
            </div>

            {/* Итоги недели над таблицей */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <WeekSummary
                label={`Текущая неделя · ${weekLabel(report.week.current.from)}`}
                count={report.week.current.totalCount}
                sum={report.week.current.totalSum}
              />
              <WeekSummary
                label={`Прошлая неделя · за те же ${fmtNum(report.week.elapsedDays)} дн.`}
                count={report.week.previous.totalCount}
                sum={report.week.previous.totalSum}
              />
            </div>

            <DailyTable days={report.days} />
          </section>

          {/* ИИ-ассистент — под таблицей */}
          <CashboxAiAssistant report={report} />

          {/* Ежемесячные поступления */}
          <MonthlySection months={report.months} overall={report.monthsOverall} />
        </>
      ) : null}
    </div>
  )
}
