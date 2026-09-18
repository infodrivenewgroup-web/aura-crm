// ====== Чистый билдер аналитического отчёта для главной страницы ======
// Из суточной разбивки по кассам собирает три уровня детализации:
//   1) дни текущей недели (Пн→Вс) с дельтой к предыдущему дню;
//   2) недели текущего месяца с like-for-like сравнением к прошлой неделе;
//   3) последние 3 календарных месяца с like-for-like сравнением к прошлому.
// Плюс агрегаты недели/месяца/квартала. Все периоды — по московскому
// календарю (см. lib/period.ts). Модуль без серверного кода — безопасен для
// импорта на клиенте.

import {
  addDays,
  daysBetween,
  fmtMonthName,
  fmtWeekday,
  weekStart,
  weekEnd,
  weekLabel,
  parseISO,
} from "@/lib/format"
import { monthRange, todayISO } from "@/lib/period"
import { pctChange, sumRange } from "@/lib/sales/stats"
import type {
  DailyBreakdownRow,
  MetricDelta,
  OverviewDayRow,
  OverviewMonthRow,
  OverviewReport,
  OverviewWeekRow,
  PeriodComparison,
  PeriodStat,
  SyncMeta,
} from "@/lib/sales/types"

/** Полные русские названия дней недели (0 = воскресенье). */
const WEEKDAYS_FULL = [
  "Воскресенье",
  "Понедельник",
  "Вторник",
  "Среда",
  "Четверг",
  "Пятница",
  "Суббота",
]

/** Меньшая из двух ISO-дат (одинаковый формат — сравнение как строк). */
function minISO(a: string, b: string): string {
  return a <= b ? a : b
}

/** «14.07» — день и месяц без года. */
function fmtDayMonth(iso: string): string {
  const d = parseISO(iso)
  return `${String(d.getDate()).padStart(2, "0")}.${String(
    d.getMonth() + 1,
  ).padStart(2, "0")}`
}

/** Дельта кол-ва и суммы current относительно previous. */
function delta(current: PeriodStat, previous: PeriodStat): MetricDelta {
  return {
    countDeltaPct: pctChange(current.totalCount, previous.totalCount),
    sumDeltaPct: pctChange(current.totalSum, previous.totalSum),
  }
}

/** Начало окна выборки: первый день месяца, предшествующего 3 отображаемым. */
export function overviewWindowStart(ref = todayISO()): string {
  const m0 = monthRange(ref)
  const m1 = monthRange(addDays(m0.from, -1))
  const m2 = monthRange(addDays(m1.from, -1))
  const m3 = monthRange(addDays(m2.from, -1)) // база сравнения для m2
  // Прошлая неделя первой недели месяца заведомо позже m3.from, поэтому
  // достаточно взять начало m3.
  return m3.from
}

/** Сравнение периода-«к дате» с сопоставимым отрезком предыдущего периода. */
function likeForLike(
  rows: DailyBreakdownRow[],
  from: string,
  to: string,
  prevFrom: string,
  prevTo: string,
  elapsedDays: number,
  periodDays: number,
): PeriodComparison {
  const current = sumRange(rows, from, to)
  const previous = sumRange(rows, prevFrom, prevTo)
  return {
    current,
    previous,
    elapsedDays,
    periodDays,
    countDeltaPct: pctChange(current.totalCount, previous.totalCount),
    sumDeltaPct: pctChange(current.totalSum, previous.totalSum),
  }
}

/**
 * Строит сравнение одного месяца с предыдущим (like-for-like).
 * `analysisEnd` — последний учитываемый день (для текущего месяца обрезает
 * накопление на этой дате; по умолчанию совпадает с `ref`).
 */
function buildMonthRow(
  rows: DailyBreakdownRow[],
  month: { from: string; to: string },
  prevMonth: { from: string; to: string },
  ref: string,
  analysisEnd: string,
): OverviewMonthRow {
  const periodDays = daysBetween(month.from, month.to) + 1
  const isCurrent = ref >= month.from && ref <= month.to
  // Для текущего месяца накопление обрезается по analysisEnd, для завершённых —
  // берётся весь месяц.
  const curTo = isCurrent ? minISO(month.to, analysisEnd) : month.to
  const elapsed = isCurrent
    ? Math.max(0, daysBetween(month.from, curTo) + 1)
    : periodDays

  const prevTo = minISO(addDays(prevMonth.from, elapsed - 1), prevMonth.to)
  const cur = sumRange(rows, month.from, curTo)
  const prev = sumRange(rows, prevMonth.from, prevTo)

  return {
    stat: cur,
    label: fmtMonthName(month.from),
    isCurrent,
    partial: isCurrent && elapsed < periodDays,
    total: delta(cur, prev),
  }
}

/**
 * Собирает полный аналитический отчёт для главной страницы.
 * `ref` — «сегодня» по Москве (по умолчанию текущая дата); задаёт, какие
 * именно неделя/месяц/квартал показываются, и флаги «сегодня».
 * `analysisEnd` — последний день, учитываемый в накопительных итогах и
 * сравнениях (по умолчанию `ref`). Если передать вчерашнюю дату, отчёт
 * посчитает только завершённые дни — текущий день будет исключён. На состав
 * и разметку дней/недель/месяцев это не влияет, только на итоги и сравнения.
 */
export function buildOverviewReport(
  rows: DailyBreakdownRow[],
  meta: SyncMeta,
  ref = todayISO(),
  analysisEnd: string = ref,
): OverviewReport {
  // ---- 1) Дни текущей недели (Пн→Вс), дельта к предыдущему дню. ----
  const wkStart = weekStart(ref)
  const weekDays: OverviewDayRow[] = []
  for (let i = 0; i < 7; i++) {
    const d = addDays(wkStart, i)
    const prevD = addDays(d, -1)
    const stat = sumRange(rows, d, d)
    const prevStat = sumRange(rows, prevD, prevD)
    // День «ещё не наступил» относительно горизонта анализа: при
    // analysisEnd = вчера сегодняшний день попадает сюда и исключается из
    // выводов ИИ (пик/минимум, «за те же дни» и т. п.).
    const isFuture = d > analysisEnd
    weekDays.push({
      stat,
      weekday: WEEKDAYS_FULL[parseISO(d).getDay()],
      weekdayShort: fmtWeekday(d),
      dateLabel: fmtDayMonth(d),
      isToday: d === ref,
      isFuture,
      // У будущих дней ещё нет фактических данных — дельта не имеет смысла.
      total: isFuture
        ? { countDeltaPct: null, sumDeltaPct: null }
        : delta(stat, prevStat),
    })
  }

  // ---- Агрегат недели vs прошлая неделя (накопительно, like-for-like). ----
  const weekElapsed = Math.max(0, daysBetween(wkStart, analysisEnd) + 1)
  const lastWeekFrom = addDays(wkStart, -7)
  const lastWeekLikeTo = minISO(
    addDays(lastWeekFrom, weekElapsed - 1),
    addDays(weekEnd(ref), -7),
  )
  const weekOverall = likeForLike(
    rows,
    wkStart,
    analysisEnd,
    lastWeekFrom,
    lastWeekLikeTo,
    weekElapsed,
    7,
  )

  // ---- 2) Недели текущего месяца (по возрастанию). ----
  const m0 = monthRange(ref)
  const firstWeekStart = weekStart(m0.from)
  const curWeekStart = weekStart(ref)
  const monthWeeks: OverviewWeekRow[] = []
  let idx = 0
  for (let w = firstWeekStart; w <= curWeekStart; w = addDays(w, 7)) {
    idx += 1
    const wEnd = addDays(w, 6)
    const isCurrent = w === curWeekStart
    // Для текущей недели считаем только по горизонт анализа (по умолчанию —
    // сегодня; при анализе завершённых дней — по вчера).
    const curTo = isCurrent ? minISO(wEnd, analysisEnd) : wEnd
    const elapsed = Math.max(0, daysBetween(w, curTo) + 1)
    const stat = sumRange(rows, w, curTo)
    // Предыдущая неделя за столько же дней (честное сравнение).
    const prevStart = addDays(w, -7)
    const prevTo = addDays(prevStart, elapsed - 1)
    const prev = sumRange(rows, prevStart, prevTo)
    monthWeeks.push({
      stat,
      label: weekLabel(w),
      index: idx,
      isCurrent,
      total: delta(stat, prev),
    })
  }

  // ---- Агрегат месяца vs прошлый месяц (like-for-like). ----
  const m1 = monthRange(addDays(m0.from, -1))
  const monthCurTo = minISO(m0.to, analysisEnd)
  const monthElapsed = Math.max(0, daysBetween(m0.from, monthCurTo) + 1)
  const monthPeriodDays = daysBetween(m0.from, m0.to) + 1
  const prevMonthLikeTo = minISO(addDays(m1.from, monthElapsed - 1), m1.to)
  const monthOverall = likeForLike(
    rows,
    m0.from,
    monthCurTo,
    m1.from,
    prevMonthLikeTo,
    monthElapsed,
    monthPeriodDays,
  )

  // ---- 3) Последние 3 календарных месяца (по возрастанию). ----
  const m2 = monthRange(addDays(m1.from, -1))
  const m3 = monthRange(addDays(m2.from, -1))
  const months: OverviewMonthRow[] = [
    buildMonthRow(rows, m2, m3, ref, analysisEnd),
    buildMonthRow(rows, m1, m2, ref, analysisEnd),
    buildMonthRow(rows, m0, m1, ref, analysisEnd),
  ]
  const quarterOverall = sumRange(rows, m2.from, minISO(m0.to, analysisEnd))

  return {
    weekDays,
    weekOverall,
    monthWeeks,
    monthOverall,
    months,
    quarterOverall,
    meta,
    generatedAt: new Date().toISOString(),
  }
}
