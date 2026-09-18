// ====== Чистый агрегатор статистики продаж (без серверного кода) ======
// Принимает суточную разбивку по кассам и собирает показатели за нужные
// периоды строго по московскому календарю. Логика периодов совпадает с
// остальным учётом (см. lib/period.ts): «сегодня/вчера» — по Москве,
// неделя — Пн–Вс, месяц — календарный.

import { addDays, daysBetween, weekStart, weekEnd } from "@/lib/format"
import { monthRange, todayISO } from "@/lib/period"
import type {
  DailyBreakdownRow,
  PeriodComparison,
  PeriodStat,
  SalesStats,
  SyncMeta,
} from "@/lib/sales/types"

/** Округление денег до копеек, как в основном модуле расчётов. */
function money(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.round((value + Number.EPSILON) * 100) / 100
}

/** Суммирует суточные строки в диапазоне [from, to] включительно. */
export function sumRange(
  rows: DailyBreakdownRow[],
  from: string,
  to: string,
): PeriodStat {
  const stat: PeriodStat = {
    from,
    to,
    platega: { count: 0, sum: 0 },
    kassera: { count: 0, sum: 0 },
    totalCount: 0,
    totalSum: 0,
  }
  for (const r of rows) {
    if (r.date < from || r.date > to) continue
    stat.platega.count += r.plategaCount
    stat.platega.sum = money(stat.platega.sum + r.plategaSum)
    stat.kassera.count += r.kasseraCount
    stat.kassera.sum = money(stat.kassera.sum + r.kasseraSum)
    stat.totalCount += r.totalCount
    stat.totalSum = money(stat.totalSum + r.totalSum)
  }
  return stat
}

/** Изменение в процентах (null — если нет базы для сравнения). */
export function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null
  return money(((current - previous) / Math.abs(previous)) * 100)
}

function compare(
  current: PeriodStat,
  previous: PeriodStat,
  elapsedDays: number,
  periodDays: number,
): PeriodComparison {
  return {
    current,
    previous,
    elapsedDays,
    periodDays,
    countDeltaPct: pctChange(current.totalCount, previous.totalCount),
    sumDeltaPct: pctChange(current.totalSum, previous.totalSum),
  }
}

/** Меньшая из двух ISO-дат (одинаковый формат — сравнение как строк). */
function minISO(a: string, b: string): string {
  return a <= b ? a : b
}

/** Наименьшая московская дата, которую нужно запросить для всех периодов. */
export function statsWindowStart(ref = todayISO()): string {
  const monthFrom = monthRange(ref).from
  // Предыдущий полный месяц — самый ранний период, который нужен для всех
  // карточек (в т.ч. «за 2 последних месяца»).
  const prevMonth = monthRange(addDays(monthFrom, -1))
  const prevWeekStart = addDays(weekStart(ref), -7)
  // Берём самую раннюю из нужных дат и добавляем запас.
  const earliest = [prevMonth.from, prevWeekStart].sort()[0]
  return addDays(earliest, -1)
}

/**
 * Собирает полный набор статистики продаж из суточной разбивки.
 * `ref` — «сегодня» по Москве (по умолчанию текущая дата).
 */
export function buildSalesStats(
  rows: DailyBreakdownRow[],
  meta: SyncMeta,
  ref = todayISO(),
): SalesStats {
  const yesterday = addDays(ref, -1)
  const dayBefore = addDays(ref, -2)

  // ---- Неделя (Пн–Вс). Сравниваем накопительно: столько же прошедших дней
  // прошлой недели, чтобы не сопоставлять неполную неделю с полной. ----
  const thisWeek = { from: weekStart(ref), to: weekEnd(ref) }
  const weekPeriodDays = 7
  const weekElapsed = daysBetween(thisWeek.from, ref) + 1
  const lastWeekFrom = addDays(thisWeek.from, -7)
  const lastWeekLikeTo = minISO(
    addDays(lastWeekFrom, weekElapsed - 1),
    addDays(thisWeek.to, -7),
  )

  // ---- Месяц (календарный). Аналогично — «месяц к дате» против такого же
  // отрезка прошлого месяца. ----
  const thisMonth = monthRange(ref)
  const prevMonth = monthRange(addDays(thisMonth.from, -1))
  const monthPeriodDays = daysBetween(thisMonth.from, thisMonth.to) + 1
  const monthElapsed = daysBetween(thisMonth.from, ref) + 1
  const prevMonthLikeTo = minISO(
    addDays(prevMonth.from, monthElapsed - 1),
    prevMonth.to,
  )

  // ---- Два последних календарных месяца (полные итоги по кассам).
  // [0] — текущий месяц (по сегодняшний день), [1] — предыдущий полный месяц. ----
  const lastTwoMonths: [PeriodStat, PeriodStat] = [
    sumRange(rows, thisMonth.from, thisMonth.to),
    sumRange(rows, prevMonth.from, prevMonth.to),
  ]

  return {
    today: sumRange(rows, ref, ref),
    yesterday: sumRange(rows, yesterday, yesterday),
    dayBeforeYesterday: sumRange(rows, dayBefore, dayBefore),
    week: compare(
      sumRange(rows, thisWeek.from, ref),
      sumRange(rows, lastWeekFrom, lastWeekLikeTo),
      weekElapsed,
      weekPeriodDays,
    ),
    month: compare(
      sumRange(rows, thisMonth.from, ref),
      sumRange(rows, prevMonth.from, prevMonthLikeTo),
      monthElapsed,
      monthPeriodDays,
    ),
    lastTwoMonths,
    meta,
    generatedAt: new Date().toISOString(),
  }
}
