// ====== Чистый билдер отчёта для страницы «Касса» ======
// Собирает из суточной разбивки по кассам: последние 7 дней (с дельтами к
// предыдущему дню), сравнение текущей недели с прошлой (like-for-like) и
// последние 3 календарных месяца с индикаторами эффективности. Логика периодов
// строго по московскому календарю — как и во всём остальном учёте.
//
// Модуль не содержит серверного кода, поэтому безопасен для импорта и на
// клиенте (например, для типобезопасных вычислений в компонентах).

import { addDays, daysBetween, fmtMonthName, fmtWeekday, weekStart, weekEnd } from "@/lib/format"
import { monthRange, todayISO } from "@/lib/period"
import { pctChange, sumRange } from "@/lib/sales/stats"
import type {
  CashboxDayRow,
  CashboxMonthRow,
  CashboxReport,
  DailyBreakdownRow,
  MetricDelta,
  PeriodComparison,
  PeriodStat,
  SyncMeta,
} from "@/lib/sales/types"

/** Меньшая из двух ISO-дат (одинаковый формат — сравнение как строк). */
function minISO(a: string, b: string): string {
  return a <= b ? a : b
}

/** Дельта кол-ва и суммы current относительно previous. */
function delta(current: PeriodStat, previous: PeriodStat): MetricDelta {
  return {
    countDeltaPct: pctChange(current.totalCount, previous.totalCount),
    sumDeltaPct: pctChange(current.totalSum, previous.totalSum),
  }
}

/** Дельта по конкретной кассе. */
function cashboxDelta(
  current: { count: number; sum: number },
  previous: { count: number; sum: number },
): MetricDelta {
  return {
    countDeltaPct: pctChange(current.count, previous.count),
    sumDeltaPct: pctChange(current.sum, previous.sum),
  }
}

/** Начало окна выборки: первый день месяца, предшествующего 3 отображаемым. */
export function cashboxWindowStart(ref = todayISO()): string {
  const m0 = monthRange(ref) // текущий месяц
  const m1 = monthRange(addDays(m0.from, -1)) // −1
  const m2 = monthRange(addDays(m1.from, -1)) // −2 (самый ранний отображаемый)
  const m3 = monthRange(addDays(m2.from, -1)) // база сравнения для m2
  return m3.from
}

/** Строит строку одного месяца с like-for-like сравнением к предыдущему. */
function buildMonthRow(
  rows: DailyBreakdownRow[],
  month: { from: string; to: string },
  prevMonth: { from: string; to: string },
  ref: string,
): CashboxMonthRow {
  const periodDays = daysBetween(month.from, month.to) + 1
  const isCurrent = ref >= month.from && ref <= month.to
  const elapsedDays = isCurrent ? daysBetween(month.from, ref) + 1 : periodDays
  const curTo = isCurrent ? ref : month.to

  // Полный показатель месяца (будущие дни просто нулевые).
  const stat = sumRange(rows, month.from, month.to)

  // Для честного сравнения берём одинаковое число прошедших дней.
  const prevTo = minISO(addDays(prevMonth.from, elapsedDays - 1), prevMonth.to)
  const cur = sumRange(rows, month.from, curTo)
  const prev = sumRange(rows, prevMonth.from, prevTo)

  return {
    stat,
    label: fmtMonthName(month.from),
    partial: isCurrent && elapsedDays < periodDays,
    elapsedDays,
    periodDays,
    hasData: stat.totalCount > 0,
    total: delta(cur, prev),
    platega: cashboxDelta(cur.platega, prev.platega),
    kassera: cashboxDelta(cur.kassera, prev.kassera),
  }
}

/**
 * Полный отчёт для страницы «Касса».
 * `ref` — «сегодня» по Москве (по умолчанию текущая дата).
 */
export function buildCashboxReport(
  rows: DailyBreakdownRow[],
  meta: SyncMeta,
  ref = todayISO(),
): CashboxReport {
  // ---- Последние 7 дней (включая сегодня), с дельтой к предыдущему дню. ----
  const days: CashboxDayRow[] = []
  for (let i = 6; i >= 0; i--) {
    const d = addDays(ref, -i)
    const prevD = addDays(d, -1)
    const stat = sumRange(rows, d, d)
    const prevStat = sumRange(rows, prevD, prevD)
    days.push({
      stat,
      weekday: fmtWeekday(d),
      isToday: d === ref,
      total: delta(stat, prevStat),
      platega: cashboxDelta(stat.platega, prevStat.platega),
      kassera: cashboxDelta(stat.kassera, prevStat.kassera),
    })
  }

  // ---- Неделя (Пн–Вс) в сравнении с прошлой, накопительно (like-for-like). ----
  const thisWeek = { from: weekStart(ref), to: weekEnd(ref) }
  const weekPeriodDays = 7
  const weekElapsed = daysBetween(thisWeek.from, ref) + 1
  const lastWeekFrom = addDays(thisWeek.from, -7)
  const lastWeekLikeTo = minISO(
    addDays(lastWeekFrom, weekElapsed - 1),
    addDays(thisWeek.to, -7),
  )
  const weekCurrent = sumRange(rows, thisWeek.from, ref)
  const weekPrevious = sumRange(rows, lastWeekFrom, lastWeekLikeTo)
  const week: PeriodComparison = {
    current: weekCurrent,
    previous: weekPrevious,
    elapsedDays: weekElapsed,
    periodDays: weekPeriodDays,
    countDeltaPct: pctChange(weekCurrent.totalCount, weekPrevious.totalCount),
    sumDeltaPct: pctChange(weekCurrent.totalSum, weekPrevious.totalSum),
  }

  // ---- Последние 3 календарных месяца (по возрастанию). ----
  const m0 = monthRange(ref)
  const m1 = monthRange(addDays(m0.from, -1))
  const m2 = monthRange(addDays(m1.from, -1))
  const m3 = monthRange(addDays(m2.from, -1))
  const months: CashboxMonthRow[] = [
    buildMonthRow(rows, m2, m3, ref),
    buildMonthRow(rows, m1, m2, ref),
    buildMonthRow(rows, m0, m1, ref),
  ]
  const monthsOverall = sumRange(rows, m2.from, m0.to)

  return {
    days,
    week,
    months,
    monthsOverall,
    meta,
    generatedAt: new Date().toISOString(),
  }
}
