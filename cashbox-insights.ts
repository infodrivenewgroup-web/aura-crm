// ====== ИИ-ассистент кассы: детерминированный аналитический движок ======
// Генерирует человекочитаемые сводки СТРОГО из точных цифр отчёта, без
// обращения к внешним моделям. Это гарантирует, что текст всегда отражает
// реальную ситуацию по входящим платежам без ошибок и «галлюцинаций».
// Функция чистая — пересчитывается при каждом обновлении данных (реальное
// время обеспечивается автообновлением отчёта на клиенте).

import { fmtMoney, fmtNum, fmtPct } from "@/lib/format"
import type { CashboxReport, PeriodStat } from "@/lib/sales/types"

export type InsightTone = "positive" | "negative" | "neutral" | "info"

export interface Insight {
  tone: InsightTone
  title: string
  text: string
}

export interface CashboxDigest {
  /** Итоговый заголовок-резюме по текущей ситуации. */
  headline: string
  headlineTone: InsightTone
  /** Набор аналитических тезисов. */
  insights: Insight[]
  /** Момент формирования сводки (для пометки «обновлено»). */
  generatedAt: string
}

function toneByDelta(delta: number | null): InsightTone {
  if (delta === null) return "neutral"
  if (delta > 0.0001) return "positive"
  if (delta < -0.0001) return "negative"
  return "neutral"
}

function dirWord(delta: number | null): string {
  if (delta === null) return "без базы для сравнения"
  if (delta > 0.0001) return "рост"
  if (delta < -0.0001) return "снижение"
  return "без изменений"
}

/** Доля кассы в общем числе заявок, %. */
function share(part: number, whole: number): number {
  if (whole <= 0) return 0
  return Math.round((part / whole) * 1000) / 10
}

/**
 * Формирует полную сводку ИИ-ассистента по актуальному отчёту.
 * Все выводы опираются только на переданные точные показатели.
 */
export function buildCashboxDigest(report: CashboxReport): CashboxDigest {
  const insights: Insight[] = []
  const days = report.days
  const today = days[days.length - 1]?.stat
  const yesterday = days[days.length - 2]?.stat

  // 1) Сегодня против вчера.
  if (today && yesterday) {
    const d = report.days[report.days.length - 1].total
    const tone = toneByDelta(d.sumDeltaPct)
    if (today.totalCount === 0) {
      insights.push({
        tone: "info",
        title: "Сегодня",
        text: `За сегодня оплаченных заявок пока нет. Вчера поступило ${fmtNum(
          yesterday.totalCount,
        )} на сумму ${fmtMoney(yesterday.totalSum)}.`,
      })
    } else {
      insights.push({
        tone,
        title: "Сегодня против вчера",
        text: `Сегодня ${fmtNum(today.totalCount)} заявок на ${fmtMoney(
          today.totalSum,
        )} — ${dirWord(d.sumDeltaPct)} по сумме ${fmtPct(
          d.sumDeltaPct,
        )} и по количеству ${fmtPct(d.countDeltaPct)} относительно вчерашних ${fmtNum(
          yesterday.totalCount,
        )} заявок.`,
      })
    }
  }

  // 2) Неделя в сравнении с прошлой (накопительно, like-for-like).
  {
    const w = report.week
    const tone = toneByDelta(w.sumDeltaPct)
    insights.push({
      tone,
      title: `Неделя (${fmtNum(w.elapsedDays)} из ${fmtNum(w.periodDays)} дн.)`,
      text: `С начала недели поступило ${fmtNum(
        w.current.totalCount,
      )} заявок на ${fmtMoney(w.current.totalSum)}. За те же дни прошлой недели было ${fmtNum(
        w.previous.totalCount,
      )} на ${fmtMoney(w.previous.totalSum)} — ${dirWord(
        w.sumDeltaPct,
      )} по сумме ${fmtPct(w.sumDeltaPct)}, по заявкам ${fmtPct(w.countDeltaPct)}.`,
    })
  }

  // 3) Лучший и слабый день за 7 дней (только дни с данными).
  {
    const withData = days.filter((d) => d.stat.totalCount > 0)
    if (withData.length >= 2) {
      const best = withData.reduce((a, b) =>
        b.stat.totalSum > a.stat.totalSum ? b : a,
      )
      const worst = withData.reduce((a, b) =>
        b.stat.totalSum < a.stat.totalSum ? b : a,
      )
      insights.push({
        tone: "info",
        title: "Пик и минимум за 7 дней",
        text: `Максимум — ${best.weekday}, ${fmtMoney(
          best.stat.totalSum,
        )} (${fmtNum(best.stat.totalCount)} заявок). Минимум — ${worst.weekday}, ${fmtMoney(
          worst.stat.totalSum,
        )} (${fmtNum(worst.stat.totalCount)} заявок).`,
      })
    }
  }

  // 4) Расстановка по кассам за 7 дней.
  {
    const sum7: PeriodStat = days.reduce(
      (acc, d) => {
        acc.platega.count += d.stat.platega.count
        acc.platega.sum += d.stat.platega.sum
        acc.kassera.count += d.stat.kassera.count
        acc.kassera.sum += d.stat.kassera.sum
        acc.totalCount += d.stat.totalCount
        acc.totalSum += d.stat.totalSum
        return acc
      },
      {
        from: days[0]?.stat.from ?? "",
        to: days[days.length - 1]?.stat.from ?? "",
        platega: { count: 0, sum: 0 },
        kassera: { count: 0, sum: 0 },
        totalCount: 0,
        totalSum: 0,
      } as PeriodStat,
    )
    if (sum7.totalCount > 0) {
      const pShare = share(sum7.platega.count, sum7.totalCount)
      const kShare = share(sum7.kassera.count, sum7.totalCount)
      const leader = pShare >= kShare ? "Платега" : "Кашера"
      insights.push({
        tone: "info",
        title: "Распределение по кассам (7 дней)",
        text: `Ведущая касса — ${leader}. Платега: ${fmtNum(
          sum7.platega.count,
        )} заявок (${fmtNum(pShare)}%), Кашера: ${fmtNum(
          sum7.kassera.count,
        )} заявок (${fmtNum(kShare)}%). Всего за 7 дней ${fmtNum(
          sum7.totalCount,
        )} заявок на ${fmtMoney(sum7.totalSum)}.`,
      })
    }
  }

  // 5) Текущий месяц против предыдущего.
  {
    const cur = report.months[report.months.length - 1]
    if (cur) {
      const tone = toneByDelta(cur.total.sumDeltaPct)
      insights.push({
        tone,
        title: `Месяц: ${cur.label}`,
        text: `Накоплено ${fmtNum(cur.stat.totalCount)} заявок на ${fmtMoney(
          cur.stat.totalSum,
        )}. Относительно того же периода прошлого месяца — ${dirWord(
          cur.total.sumDeltaPct,
        )} по сумме ${fmtPct(cur.total.sumDeltaPct)}, по заявкам ${fmtPct(
          cur.total.countDeltaPct,
        )}.`,
      })
    }
  }

  // ---- Итоговый заголовок по неделе (главный сигнал ситуации). ----
  const wTone = toneByDelta(report.week.sumDeltaPct)
  let headline: string
  if (report.week.sumDeltaPct === null) {
    headline = "Идёт накопление данных недели — сравнение с прошлой неделей появится по мере поступления платежей."
  } else if (wTone === "positive") {
    headline = `Неделя идёт с опережением: поступления выше прошлой на ${fmtPct(
      report.week.sumDeltaPct,
    )} за сопоставимый период.`
  } else if (wTone === "negative") {
    headline = `Неделя идёт с отставанием: поступления ниже прошлой на ${fmtPct(
      report.week.sumDeltaPct,
    )} за сопоставимый период.`
  } else {
    headline = "Неделя идёт вровень с прошлой — поступления держатся на прежнем уровне."
  }

  return {
    headline,
    headlineTone: wTone,
    insights,
    generatedAt: report.generatedAt,
  }
}
