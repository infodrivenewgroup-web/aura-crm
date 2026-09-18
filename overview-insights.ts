// ====== ИИ-ассистент главной: детерминированный аналитический движок ======
// Все выводы формируются СТРОГО из точных цифр отчёта, без обращения к внешним
// моделям. Это гарантирует, что тексты всегда соответствуют реальным данным по
// входящим заявкам (без ошибок и «галлюцинаций»). Функции чистые — сводка
// автоматически пересчитывается при каждом обновлении данных.

import { fmtMoney, fmtNum, fmtPct } from "@/lib/format"
import type {
  OverviewDayRow,
  OverviewReport,
  PeriodStat,
} from "@/lib/sales/types"

export type InsightTone = "positive" | "negative" | "neutral" | "info"

export interface Insight {
  tone: InsightTone
  title: string
  text: string
}

export interface OverviewDigest {
  headline: string
  headlineTone: InsightTone
  insights: Insight[]
}

const EPS = 0.0001

function toneByDelta(delta: number | null): InsightTone {
  if (delta === null) return "neutral"
  if (delta > EPS) return "positive"
  if (delta < -EPS) return "negative"
  return "neutral"
}

function dirWord(delta: number | null): string {
  if (delta === null) return "без базы для сравнения"
  if (delta > EPS) return "рост"
  if (delta < -EPS) return "снижение"
  return "без изменений"
}

/** Доля части в целом, округлённая до 0.1%. */
function share(part: number, whole: number): number {
  if (whole <= 0) return 0
  return Math.round((part / whole) * 1000) / 10
}

/** Ведущая касса периода по количеству заявок. */
function leaderText(stat: PeriodStat): string {
  if (stat.totalCount <= 0) return "данных по кассам пока нет"
  const pShare = share(stat.platega.count, stat.totalCount)
  const kShare = share(stat.kassera.count, stat.totalCount)
  const leader = pShare >= kShare ? "Платега" : "Кашера"
  return `ведущая касса — ${leader} (Платега ${fmtNum(
    stat.platega.count,
  )} / ${fmtNum(pShare)}%, Кашера ${fmtNum(stat.kassera.count)} / ${fmtNum(
    kShare,
  )}%)`
}

/* ============================ Заметка по дню ============================ */

/**
 * Короткий вывод ИИ по конкретному дню недели — только по фактическим цифрам.
 */
export function dayNote(row: OverviewDayRow): { tone: InsightTone; text: string } {
  if (row.isFuture) {
    return { tone: "info", text: "День ещё не наступил — данные появятся по факту оплат." }
  }
  const s = row.stat
  if (s.totalCount === 0) {
    return {
      tone: "info",
      text: row.isToday
        ? "Сегодня оплат пока не зафиксировано — день только идёт."
        : "Оплаченных заявок в этот день не зафиксировано.",
    }
  }
  const dir = dirWord(row.total.sumDeltaPct)
  const base =
    row.total.sumDeltaPct === null
      ? `${fmtNum(s.totalCount)} заявок на ${fmtMoney(s.totalSum)}.`
      : `${fmtNum(s.totalCount)} заявок на ${fmtMoney(s.totalSum)} — ${dir} к предыдущему дню на ${fmtPct(
          row.total.sumDeltaPct,
        )} по сумме и ${fmtPct(row.total.countDeltaPct)} по заявкам.`
  return { tone: toneByDelta(row.total.sumDeltaPct), text: `${base} ${cap(leaderText(s))}.` }
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/* ===================== Сводка по неделе (блок 1) ===================== */

export function buildWeekDigest(report: OverviewReport): OverviewDigest {
  const insights: Insight[] = []
  const w = report.weekOverall
  const days = report.weekDays.filter((d) => !d.isFuture)

  // Сегодня против вчера. Показывается только если сегодняшний день входит в
  // горизонт анализа. Для сводок ИИ горизонт заканчивается вчера, поэтому
  // today.isFuture === true и этот пункт не добавляется — выводы строятся
  // строго по завершённым дням.
  const today = report.weekDays.find((d) => d.isToday)
  const elapsed = days.filter((d) => d.stat.totalCount > 0)
  if (today && !today.isFuture) {
    if (today.stat.totalCount === 0) {
      insights.push({
        tone: "info",
        title: "Сегодня",
        text: "Оплат за сегодня пока нет — день в процессе.",
      })
    } else {
      insights.push({
        tone: toneByDelta(today.total.sumDeltaPct),
        title: "Сегодня против вчера",
        text: `Сегодня ${fmtNum(today.stat.totalCount)} заявок на ${fmtMoney(
          today.stat.totalSum,
        )} — ${dirWord(today.total.sumDeltaPct)} по сумме ${fmtPct(
          today.total.sumDeltaPct,
        )}, по заявкам ${fmtPct(today.total.countDeltaPct)}.`,
      })
    }
  }

  // Итог недели против прошлой.
  insights.push({
    tone: toneByDelta(w.sumDeltaPct),
    title: `Неделя (${fmtNum(w.elapsedDays)} из ${fmtNum(w.periodDays)} дн.)`,
    text: `С понедельника поступило ${fmtNum(w.current.totalCount)} заявок на ${fmtMoney(
      w.current.totalSum,
    )}. За те же дни прошлой недели — ${fmtNum(w.previous.totalCount)} на ${fmtMoney(
      w.previous.totalSum,
    )} (${dirWord(w.sumDeltaPct)} по сумме ${fmtPct(w.sumDeltaPct)}, по заявкам ${fmtPct(
      w.countDeltaPct,
    )}).`,
  })

  // Пик и минимум за неделю.
  if (elapsed.length >= 2) {
    const best = elapsed.reduce((a, b) => (b.stat.totalSum > a.stat.totalSum ? b : a))
    const worst = elapsed.reduce((a, b) => (b.stat.totalSum < a.stat.totalSum ? b : a))
    insights.push({
      tone: "info",
      title: "Пик и минимум недели",
      text: `Максимум — ${best.weekday.toLowerCase()} (${best.dateLabel}): ${fmtMoney(
        best.stat.totalSum,
      )} за ${fmtNum(best.stat.totalCount)} заявок. Минимум — ${worst.weekday.toLowerCase()} (${worst.dateLabel}): ${fmtMoney(
        worst.stat.totalSum,
      )} за ${fmtNum(worst.stat.totalCount)} заявок.`,
    })
  }

  // Кассы за неделю.
  if (w.current.totalCount > 0) {
    insights.push({
      tone: "info",
      title: "Распределение по кассам",
      text: `${cap(leaderText(w.current))}. Средний чек недели — ${fmtMoney(
        w.current.totalSum / Math.max(1, w.current.totalCount),
      )}.`,
    })
  }

  return { ...weekHeadline(report), insights }
}

function weekHeadline(report: OverviewReport): {
  headline: string
  headlineTone: InsightTone
} {
  const w = report.weekOverall
  const tone = toneByDelta(w.sumDeltaPct)
  if (w.current.totalCount === 0) {
    return {
      headline:
        "Неделя только началась — сравнение с прошлой появится по мере поступления оплат.",
      headlineTone: "info",
    }
  }
  if (w.sumDeltaPct === null) {
    return {
      headline: `С начала недели ${fmtNum(w.current.totalCount)} заявок на ${fmtMoney(
        w.current.totalSum,
      )}. Базы для сравнения с прошлой неделей пока нет.`,
      headlineTone: "neutral",
    }
  }
  if (tone === "positive") {
    return {
      headline: `Неделя идёт с опережением: поступления выше прошлой на ${fmtPct(
        w.sumDeltaPct,
      )} за сопоставимый период.`,
      headlineTone: "positive",
    }
  }
  if (tone === "negative") {
    return {
      headline: `Неделя идёт с отставанием: поступления ниже прошло�� на ${fmtPct(
        w.sumDeltaPct,
      )} за сопоставимый период.`,
      headlineTone: "negative",
    }
  }
  return {
    headline: "Неделя идёт вровень с прошлой — поступления держатся на прежнем уровне.",
    headlineTone: "neutral",
  }
}

/* ===================== Сводка по месяцу (блок 2) ===================== */

export function buildMonthDigest(report: OverviewReport): OverviewDigest {
  const insights: Insight[] = []
  const m = report.monthOverall
  const weeks = report.monthWeeks

  insights.push({
    tone: toneByDelta(m.sumDeltaPct),
    title: `Месяц (${fmtNum(m.elapsedDays)} из ${fmtNum(m.periodDays)} дн.)`,
    text: `Накоплено ${fmtNum(m.current.totalCount)} заявок на ${fmtMoney(
      m.current.totalSum,
    )}. За тот же отрезок прошлого месяца — ${fmtNum(m.previous.totalCount)} на ${fmtMoney(
      m.previous.totalSum,
    )} (${dirWord(m.sumDeltaPct)} по сумме ${fmtPct(m.sumDeltaPct)}, по заявкам ${fmtPct(
      m.countDeltaPct,
    )}).`,
  })

  const weeksWithData = weeks.filter((w) => w.stat.totalCount > 0)
  if (weeksWithData.length >= 2) {
    const best = weeksWithData.reduce((a, b) => (b.stat.totalSum > a.stat.totalSum ? b : a))
    insights.push({
      tone: "info",
      title: "Самая результативная неделя",
      text: `Неделя ${best.label}: ${fmtMoney(best.stat.totalSum)} за ${fmtNum(
        best.stat.totalCount,
      )} заявок — лучший результат месяца.`,
    })
  }

  // Тенденция последних недель (текущая против предыдущей завершённой).
  if (weeks.length >= 2) {
    const cur = weeks[weeks.length - 1]
    insights.push({
      tone: toneByDelta(cur.total.sumDeltaPct),
      title: "Динамика недели",
      text: `Текущая неделя (${cur.label}): ${fmtMoney(cur.stat.totalSum)} — ${dirWord(
        cur.total.sumDeltaPct,
      )} к предыдущей неделе на ${fmtPct(cur.total.sumDeltaPct)} по сумме.`,
    })
  }

  if (m.current.totalCount > 0) {
    insights.push({
      tone: "info",
      title: "Кассы за месяц",
      text: `${cap(leaderText(m.current))}. Средний чек — ${fmtMoney(
        m.current.totalSum / Math.max(1, m.current.totalCount),
      )}.`,
    })
  }

  const tone = toneByDelta(m.sumDeltaPct)
  let headline: string
  let headlineTone: InsightTone
  if (m.current.totalCount === 0) {
    headline = "Месяц только начался — накопление данных в процессе."
    headlineTone = "info"
  } else if (m.sumDeltaPct === null) {
    headline = `За месяц ${fmtNum(m.current.totalCount)} заявок на ${fmtMoney(
      m.current.totalSum,
    )}. Базы для сравнения с прошлым месяцем пока нет.`
    headlineTone = "neutral"
  } else if (tone === "positive") {
    headline = `Месяц опережает прошлый на ${fmtPct(
      m.sumDeltaPct,
    )} по сумме за сопоставимый период — динамика положительная.`
    headlineTone = "positive"
  } else if (tone === "negative") {
    headline = `Месяц отстаёт от прошлого на ${fmtPct(
      m.sumDeltaPct,
    )} по сумме за сопоставимый период — стоит усилить активность.`
    headlineTone = "negative"
  } else {
    headline = "Месяц идёт вровень с прошлым — показатели стабильны."
    headlineTone = "neutral"
  }

  return { headline, headlineTone, insights }
}

/* =================== Сводка по 3 месяцам (блок 3) =================== */

export function buildQuarterDigest(report: OverviewReport): OverviewDigest {
  const insights: Insight[] = []
  const months = report.months
  const q = report.quarterOverall

  insights.push({
    tone: "info",
    title: "Итог за 3 месяца",
    text: `Всего ${fmtNum(q.totalCount)} заявок на ${fmtMoney(q.totalSum)}. ${cap(
      leaderText(q),
    )}.`,
  })

  // Лучший месяц квартала.
  const withData = months.filter((m) => m.stat.totalCount > 0)
  if (withData.length >= 2) {
    const best = withData.reduce((a, b) => (b.stat.totalSum > a.stat.totalSum ? b : a))
    insights.push({
      tone: "info",
      title: "Лучший месяц",
      text: `${cap(best.label)}: ${fmtMoney(best.stat.totalSum)} за ${fmtNum(
        best.stat.totalCount,
      )} заявок — максимум за квартал.`,
    })
  }

  // Текущий месяц против предыдущего.
  const cur = months[months.length - 1]
  if (cur) {
    insights.push({
      tone: toneByDelta(cur.total.sumDeltaPct),
      title: `Текущий месяц: ${cur.label}`,
      text: `${fmtNum(cur.stat.totalCount)} заявок на ${fmtMoney(cur.stat.totalSum)} — ${dirWord(
        cur.total.sumDeltaPct,
      )} к прошлому месяцу на ${fmtPct(cur.total.sumDeltaPct)} по сумме${
        cur.partial ? " (месяц ещё не завершён)" : ""
      }.`,
    })
  }

  // Средний месяц квартала.
  if (withData.length > 0) {
    const avgSum = q.totalSum / withData.length
    const avgCount = Math.round(q.totalCount / withData.length)
    insights.push({
      tone: "info",
      title: "Средний темп",
      text: `В среднем ${fmtNum(avgCount)} заявок на ${fmtMoney(
        avgSum,
      )} в месяц за квартал.`,
    })
  }

  // Заголовок: тренд от первого месяца к последнему.
  let headline: string
  let headlineTone: InsightTone
  const first = months[0]
  const last = months[months.length - 1]
  if (!first || first.stat.totalCount === 0) {
    headline = `Квартал в цифрах: ${fmtNum(q.totalCount)} заявок на ${fmtMoney(
      q.totalSum,
    )} за 3 месяца.`
    headlineTone = "info"
  } else {
    const trend = last.stat.totalSum - first.stat.totalSum
    if (trend > EPS) {
      headline = `Квартальный тренд восходящий: от ${fmtMoney(
        first.stat.totalSum,
      )} в ${first.label} до ${fmtMoney(last.stat.totalSum)} в ${last.label}.`
      headlineTone = "positive"
    } else if (trend < -EPS) {
      headline = `Квартальный тренд нисходящий: от ${fmtMoney(
        first.stat.totalSum,
      )} в ${first.label} до ${fmtMoney(last.stat.totalSum)} в ${last.label}.`
      headlineTone = "negative"
    } else {
      headline = `Квартал стабилен: поступления держатся около ${fmtMoney(
        last.stat.totalSum,
      )} в месяц.`
      headlineTone = "neutral"
    }
  }

  return { headline, headlineTone, insights }
}
