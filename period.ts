import type { DayComputed } from './types'
import {
  addDays,
  daysBetween,
  parseISO,
  toISO,
  weekStart,
  weekEnd,
  weekLabel,
  fmtDate,
  fmtMonthName,
} from './format'

export type PeriodPreset =
  | 'today'
  | 'yesterday'
  | 'week'
  | 'month'
  | 'all'
  | 'custom'

export interface PeriodRange {
  from: string // ISO
  to: string // ISO
}

/** Сегодняшняя дата по Москве в формате ISO 'YYYY-MM-DD'. */
export function todayISO(): string {
  // en-CA даёт формат YYYY-MM-DD; таймзона фиксирована на Москву.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Moscow',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

/** Только дни с введёнными данными (submitted) учитываются в статистике. */
export function submittedDays(days: DayComputed[]): DayComputed[] {
  return days.filter((d) => d.submitted)
}

/** Календарная неделя (Пн–Вс), в которую попадает дата. */
export function weekRange(ref: string): PeriodRange {
  return { from: weekStart(ref), to: weekEnd(ref) }
}

/** Календарный месяц (1-е – последнее число), в который попадает дата. */
export function monthRange(ref: string): PeriodRange {
  const d = parseISO(ref)
  const first = new Date(d.getFullYear(), d.getMonth(), 1)
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0)
  return { from: toISO(first), to: toISO(last) }
}

/** Весь диапазон заполненных дней. */
export function allRange(days: DayComputed[]): PeriodRange {
  const subs = submittedDays(days)
  if (subs.length === 0) {
    const today = todayISO()
    return { from: today, to: today }
  }
  return { from: subs[0].date, to: subs[subs.length - 1].date }
}

/** Последний день с данными (или сегодня, если данных ещё нет). */
export function lastDayRange(days: DayComputed[]): PeriodRange {
  const subs = submittedDays(days)
  if (subs.length === 0) {
    const today = todayISO()
    return { from: today, to: today }
  }
  const d = subs[subs.length - 1].date
  return { from: d, to: d }
}

/**
 * Главный резолвер диапазона по выбранному пресету.
 * "Сегодня"/"Вчера" считаются по московскому времени; неделя и месяц —
 * календарные (Пн–Вс / 1-е–последнее число).
 */
export function resolveRange(
  preset: PeriodPreset,
  days: DayComputed[],
  custom: PeriodRange,
): PeriodRange {
  const ref = todayISO()
  switch (preset) {
    case 'today':
      return { from: ref, to: ref }
    case 'yesterday': {
      const y = addDays(ref, -1)
      return { from: y, to: y }
    }
    case 'week':
      return weekRange(ref)
    case 'month':
      return monthRange(ref)
    case 'all':
      return allRange(days)
    case 'custom':
    default:
      return custom
  }
}

/** Человекочитаемая подпись диапазона для шапки разделов. */
export function rangeLabel(preset: PeriodPreset, range: PeriodRange): string {
  if (preset === 'today') return `Сегодня · ${fmtDate(range.from)}`
  if (preset === 'yesterday') return `Вчера · ${fmtDate(range.from)}`
  if (preset === 'week') return `Неделя · ${weekLabel(range.from)}`
  if (preset === 'month') return fmtMonthName(range.from)
  if (range.from === range.to) return fmtDate(range.from)
  return `${fmtDate(range.from)} – ${fmtDate(range.to)}`
}

export function inRange(date: string, range: PeriodRange): boolean {
  return date >= range.from && date <= range.to
}

export function filterRange(
  days: DayComputed[],
  range: PeriodRange,
): DayComputed[] {
  return submittedDays(days).filter((d) => inRange(d.date, range))
}

/** Предыдущий сопоставимый период такой же длины (для сравнения). */
export function previousRange(range: PeriodRange): PeriodRange {
  const len = daysBetween(range.from, range.to) + 1
  return {
    from: addDays(range.from, -len),
    to: addDays(range.from, -1),
  }
}
