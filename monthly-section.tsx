"use client"

import { CalendarRange } from "lucide-react"
import { cn } from "@/lib/utils"
import { fmtMoney, fmtNum } from "@/lib/format"
import type { CashboxMonthRow, PeriodStat } from "@/lib/sales/types"
import { DeltaBadge } from "./delta-badge"
import { InfoTip } from "./info-tip"

function MonthCard({ month, isLatest }: { month: CashboxMonthRow; isLatest: boolean }) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border p-4",
        isLatest
          ? "border-[color:var(--primary)]/40 bg-[color:var(--primary)]/5"
          : "border-border bg-card",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h4 className="text-sm font-semibold capitalize text-foreground">
            {month.label}
          </h4>
          <p className="text-[11px] text-muted-foreground">
            {month.partial
              ? `текущий месяц · ${fmtNum(month.elapsedDays)} из ${fmtNum(month.periodDays)} дн.`
              : `полный месяц · ${fmtNum(month.periodDays)} дн.`}
          </p>
        </div>
        {month.hasData ? (
          <DeltaBadge
            delta={month.total.sumDeltaPct}
            size="md"
          />
        ) : (
          <span className="inline-flex items-center rounded-md border border-border bg-muted/50 px-2 py-1 text-[11px] font-medium text-muted-foreground">
            нет данных
          </span>
        )}
      </div>

      <div>
        <div className="text-2xl font-bold tabular-nums text-foreground">
          {fmtMoney(month.stat.totalSum)}
        </div>
        <p className="text-[11px] text-muted-foreground">
          {fmtNum(month.stat.totalCount)} оплаченных заявок
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-border bg-background/50 px-3 py-2">
          <div className="flex items-center gap-1.5">
            <span className="inline-block size-2 rounded-full bg-[color:var(--primary)]" />
            <span className="text-[11px] font-medium text-muted-foreground">Платега</span>
          </div>
          <div className="mt-1 text-sm font-bold tabular-nums text-foreground">
            {fmtMoney(month.stat.platega.sum)}
          </div>
          <div className="mt-1 flex items-center justify-between gap-1">
            <span className="text-[10px] tabular-nums text-muted-foreground">
              {fmtNum(month.stat.platega.count)} заявок
            </span>
            {month.hasData ? <DeltaBadge delta={month.platega.sumDeltaPct} /> : null}
          </div>
        </div>
        <div className="rounded-lg border border-border bg-background/50 px-3 py-2">
          <div className="flex items-center gap-1.5">
            <span className="inline-block size-2 rounded-full bg-[color:var(--accent)]" />
            <span className="text-[11px] font-medium text-muted-foreground">Кашера</span>
          </div>
          <div className="mt-1 text-sm font-bold tabular-nums text-foreground">
            {fmtMoney(month.stat.kassera.sum)}
          </div>
          <div className="mt-1 flex items-center justify-between gap-1">
            <span className="text-[10px] tabular-nums text-muted-foreground">
              {fmtNum(month.stat.kassera.count)} заявок
            </span>
            {month.hasData ? <DeltaBadge delta={month.kassera.sumDeltaPct} /> : null}
          </div>
        </div>
      </div>

      <p className="text-[11px] leading-relaxed text-muted-foreground/80">
        {month.hasData
          ? month.partial
            ? "Сравнение — с тем же числом дней предыдущего месяца (честный расчёт неполного периода)."
            : "Сравнение — с итогом предыдущего месяца."
          : "За этот месяц синхронизированных оплат нет."}
      </p>
    </div>
  )
}

export function MonthlySection({
  months,
  overall,
}: {
  months: CashboxMonthRow[]
  overall: PeriodStat
}) {
  const latestLabel = months[months.length - 1]?.label
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-border bg-gradient-to-b from-card to-background p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <CalendarRange className="size-5 text-[color:var(--primary)]" />
          <h2 className="text-base font-semibold text-foreground">
            Ежемесячные поступления
          </h2>
          <InfoTip label="Пояснение по ежемесячным поступлениям">
            Итоги по каждому из последних 3 месяцев с разбивкой по кассам.
            Индикатор показывает изменение эффективности к предыдущему месяцу.
            Незавершённый месяц сравнивается по одинаковому числу прошедших дней.
          </InfoTip>
        </div>
        <span className="text-[11px] text-muted-foreground">
          за последние 3 месяца · с индикаторами динамики
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        {months.map((m) => (
          <MonthCard key={m.label} month={m} isLatest={m.label === latestLabel} />
        ))}
      </div>

      {/* Итог за 3 месяца */}
      <div className="flex flex-col gap-3 rounded-xl border border-[color:var(--income)]/30 bg-[color:var(--income)]/5 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">
            Итого за 3 месяца
          </span>
          <InfoTip label="Пояснение по итогу за 3 месяца">
            Суммарные поступления и число оплаченных заявок по обеим кассам за
            последние три календарных месяца.
          </InfoTip>
        </div>
        <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold tabular-nums text-foreground">
              {fmtMoney(overall.totalSum)}
            </span>
            <span className="text-[11px] text-muted-foreground">
              {fmtNum(overall.totalCount)} заявок
            </span>
          </div>
          <div className="flex items-center gap-3 text-[11px] tabular-nums text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block size-2 rounded-full bg-[color:var(--primary)]" />
              Платега {fmtMoney(overall.platega.sum)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block size-2 rounded-full bg-[color:var(--accent)]" />
              Кашера {fmtMoney(overall.kassera.sum)}
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
