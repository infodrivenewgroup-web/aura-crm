"use client"

import { cn } from "@/lib/utils"
import { fmtDate, fmtMoney, fmtNum } from "@/lib/format"
import type { CashboxDayRow } from "@/lib/sales/types"
import { DeltaBadge } from "./delta-badge"
import { InfoTip } from "./info-tip"

/** Значение одной кассы в ячейке: сумма, кол-во заявок и индикатор к пред. дню. */
function CashCell({
  sum,
  count,
  delta,
  pending,
  accent,
}: {
  sum: number
  count: number
  delta: number | null
  pending: boolean
  accent: "primary" | "accent"
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        <span
          className={cn(
            "inline-block size-2 shrink-0 rounded-full",
            accent === "primary"
              ? "bg-[color:var(--primary)]"
              : "bg-[color:var(--accent)]",
          )}
        />
        <span className="text-sm font-bold tabular-nums text-foreground">
          {fmtMoney(sum)}
        </span>
      </div>
      <div className="flex items-center justify-between gap-2 pl-3.5">
        <span className="text-[11px] tabular-nums text-muted-foreground">
          {fmtNum(count)} заявок
        </span>
        <DeltaBadge delta={delta} pending={pending} />
      </div>
    </div>
  )
}

export function DailyTable({ days }: { days: CashboxDayRow[] }) {
  return (
    <div className="flex flex-col gap-4">
      {/* ---- Десктоп/планшет: таблица ---- */}
      <div className="hidden overflow-hidden rounded-xl border border-border md:block">
        <table className="w-full border-collapse text-left">
          <caption className="sr-only">
            Входящие платежи по дням за последние 7 дней с разбивкой по кассам и
            индикаторами изменения к предыдущему дню
          </caption>
          <thead>
            <tr className="border-b border-border bg-muted/40 text-[11px] uppercase tracking-wide text-muted-foreground">
              <th scope="col" className="px-4 py-3 font-semibold">
                День
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                <span className="inline-flex items-center gap-1">
                  Платега
                  <InfoTip label="Пояснение по кассе Платега">
                    Касса «Платега». Показаны сумма и число оплаченных заявок за
                    день, а также изменение к предыдущему дню.
                  </InfoTip>
                </span>
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                <span className="inline-flex items-center gap-1">
                  Кашера
                  <InfoTip label="Пояснение по кассе Кашера">
                    Касса «Кашера». Показаны сумма и число оплаченных заявок за
                    день, а также изменение к предыдущему дню.
                  </InfoTip>
                </span>
              </th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">
                <span className="inline-flex items-center gap-1">
                  Всего за день
                  <InfoTip label="Пояснение по итогу за день">
                    Суммарные поступления по обеим кассам за день. Индикатор
                    показывает рост или снижение общей суммы к предыдущему дню.
                  </InfoTip>
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {days.map((d) => {
              const pendingToday = d.isToday && d.stat.totalCount === 0
              return (
                <tr
                  key={d.stat.from}
                  className={cn(
                    "border-b border-border/70 last:border-0 transition-colors",
                    d.isToday ? "bg-[color:var(--primary)]/5" : "hover:bg-muted/30",
                  )}
                >
                  <th scope="row" className="px-4 py-3 align-top">
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-foreground">
                        {d.weekday}
                      </span>
                      <span className="text-[11px] tabular-nums text-muted-foreground">
                        {fmtDate(d.stat.from)}
                      </span>
                      {d.isToday ? (
                        <span className="mt-1 inline-flex w-fit items-center rounded-md bg-[color:var(--primary)]/15 px-1.5 py-0.5 text-[10px] font-medium text-[color:var(--primary)]">
                          сегодня
                        </span>
                      ) : null}
                    </div>
                  </th>
                  <td className="px-4 py-3 align-top">
                    <CashCell
                      sum={d.stat.platega.sum}
                      count={d.stat.platega.count}
                      delta={d.platega.sumDeltaPct}
                      pending={pendingToday}
                      accent="primary"
                    />
                  </td>
                  <td className="px-4 py-3 align-top">
                    <CashCell
                      sum={d.stat.kassera.sum}
                      count={d.stat.kassera.count}
                      delta={d.kassera.sumDeltaPct}
                      pending={pendingToday}
                      accent="accent"
                    />
                  </td>
                  <td className="px-4 py-3 align-top text-right">
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-base font-bold tabular-nums text-foreground">
                        {fmtMoney(d.stat.totalSum)}
                      </span>
                      <span className="text-[11px] tabular-nums text-muted-foreground">
                        {fmtNum(d.stat.totalCount)} заявок
                      </span>
                      <DeltaBadge
                        delta={d.total.sumDeltaPct}
                        pending={pendingToday}
                      />
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* ---- Мобильные: карточки ---- */}
      <div className="flex flex-col gap-3 md:hidden">
        {days.map((d) => {
          const pendingToday = d.isToday && d.stat.totalCount === 0
          return (
            <div
              key={d.stat.from}
              className={cn(
                "rounded-xl border p-4",
                d.isToday
                  ? "border-[color:var(--primary)]/40 bg-[color:var(--primary)]/5"
                  : "border-border bg-card",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-semibold text-foreground">
                    {d.weekday}
                  </span>
                  <span className="text-[11px] tabular-nums text-muted-foreground">
                    {fmtDate(d.stat.from)}
                  </span>
                  {d.isToday ? (
                    <span className="inline-flex items-center rounded-md bg-[color:var(--primary)]/15 px-1.5 py-0.5 text-[10px] font-medium text-[color:var(--primary)]">
                      сегодня
                    </span>
                  ) : null}
                </div>
                <DeltaBadge delta={d.total.sumDeltaPct} pending={pendingToday} size="md" />
              </div>

              <div className="mt-2 flex items-baseline justify-between gap-2">
                <span className="text-lg font-bold tabular-nums text-foreground">
                  {fmtMoney(d.stat.totalSum)}
                </span>
                <span className="text-[11px] tabular-nums text-muted-foreground">
                  {fmtNum(d.stat.totalCount)} заявок всего
                </span>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-border bg-background/50 p-2.5">
                  <div className="flex items-center gap-1.5">
                    <span className="inline-block size-2 rounded-full bg-[color:var(--primary)]" />
                    <span className="text-[11px] font-medium text-muted-foreground">
                      Платега
                    </span>
                  </div>
                  <div className="mt-1 text-sm font-bold tabular-nums text-foreground">
                    {fmtMoney(d.stat.platega.sum)}
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-1">
                    <span className="text-[10px] tabular-nums text-muted-foreground">
                      {fmtNum(d.stat.platega.count)} заявок
                    </span>
                    <DeltaBadge delta={d.platega.sumDeltaPct} pending={pendingToday} />
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-background/50 p-2.5">
                  <div className="flex items-center gap-1.5">
                    <span className="inline-block size-2 rounded-full bg-[color:var(--accent)]" />
                    <span className="text-[11px] font-medium text-muted-foreground">
                      Кашера
                    </span>
                  </div>
                  <div className="mt-1 text-sm font-bold tabular-nums text-foreground">
                    {fmtMoney(d.stat.kassera.sum)}
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-1">
                    <span className="text-[10px] tabular-nums text-muted-foreground">
                      {fmtNum(d.stat.kassera.count)} заявок
                    </span>
                    <DeltaBadge delta={d.kassera.sumDeltaPct} pending={pendingToday} />
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
