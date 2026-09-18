"use client"

import {
  AlertCircle,
  CalendarClock,
  CalendarDays,
  CalendarRange,
  RefreshCw,
  Sparkles,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { fmtMoney, fmtMonthName, fmtNum } from "@/lib/format"
import { useSalesOverview } from "@/hooks/use-sales-overview"
import {
  buildMonthDigest,
  buildQuarterDigest,
  buildWeekDigest,
  dayNote,
} from "@/lib/sales/overview-insights"
import type {
  OverviewDayRow,
  OverviewMonthRow,
  OverviewReport,
  OverviewWeekRow,
} from "@/lib/sales/types"
import {
  AiDigestCard,
  AnalyticsBlock,
  CashboxSplit,
  KpiStrip,
  TrendPill,
  toneText,
} from "@/components/crm/home/analytics/analytics-ui"
import { TrendChart, type TrendPoint } from "@/components/crm/home/analytics/trend-chart"
import { ArrowDownRight, ArrowUpRight } from "lucide-react"

/* --------------------------- Подсветка лучших/худших --------------------------- */

type Highlight = "peak" | "trough" | null

/** Классы кольца-обводки карточки по типу подсветки. */
function highlightRing(h: Highlight, fallbackCurrent: boolean): string {
  if (h === "peak") return "border-[color:var(--positive)]/60 bg-[color:var(--positive)]/5"
  if (h === "trough") return "border-[color:var(--negative)]/60 bg-[color:var(--negative)]/5"
  if (fallbackCurrent) return "border-[color:var(--primary)]/45 bg-[color:var(--primary)]/5"
  return "border-border bg-card"
}

/** Бейдж «Пик недели» / «Минимум» на карточке. */
function HighlightBadge({ h }: { h: Highlight }) {
  if (!h) return null
  const isPeak = h === "peak"
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold",
        isPeak
          ? "bg-[color:var(--positive)]/15 text-[color:var(--positive)]"
          : "bg-[color:var(--negative)]/15 text-[color:var(--negative)]",
      )}
    >
      {isPeak ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
      {isPeak ? "Пик" : "Минимум"}
    </span>
  )
}

/**
 * Находит ключи пика (максимум) и минимума по количеству заявок среди
 * ЗАВЕРШЁННЫХ элементов с данными. Если завершённых меньше двух — берём все с
 * данными. Возвращает выбранные ключи (для сопоставления с карточками).
 */
function peakTroughKeys<T>(
  items: T[],
  key: (t: T) => string,
  count: (t: T) => number,
  completed: (t: T) => boolean,
): { peak: string | null; trough: string | null } {
  let pool = items.filter((t) => completed(t) && count(t) > 0)
  if (pool.length < 2) pool = items.filter((t) => count(t) > 0)
  if (pool.length === 0) return { peak: null, trough: null }
  let peak = pool[0]
  let trough = pool[0]
  for (const t of pool) {
    if (count(t) > count(peak)) peak = t
    if (count(t) < count(trough)) trough = t
  }
  const peakKey = key(peak)
  const troughKey = key(trough)
  return { peak: peakKey, trough: peakKey === troughKey ? null : troughKey }
}

/* ----------------------------- Заметка ИИ по строке ----------------------------- */

function InlineNote({ tone, text }: { tone: ReturnType<typeof dayNote>["tone"]; text: string }) {
  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-lg border-l-2 bg-muted/40 px-3 py-2",
        tone === "positive" && "border-l-[color:var(--positive)]",
        tone === "negative" && "border-l-[color:var(--negative)]",
        tone === "info" && "border-l-[color:var(--primary)]",
        tone === "neutral" && "border-l-border",
      )}
    >
      <Sparkles className={cn("mt-0.5 size-3.5 shrink-0", toneText(tone))} />
      <p className="text-[13px] leading-relaxed text-muted-foreground">{text}</p>
    </div>
  )
}

/* --------------------------------- Строка дня --------------------------------- */

function DayRow({ row, highlight = null }: { row: OverviewDayRow; highlight?: Highlight }) {
  const note = dayNote(row)
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border p-4 transition-colors",
        highlightRing(highlight, row.isToday),
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "flex size-10 shrink-0 flex-col items-center justify-center rounded-lg text-xs font-bold tabular-nums",
              row.isToday
                ? "bg-[color:var(--primary)]/15 text-[color:var(--primary)]"
                : "bg-muted text-muted-foreground",
            )}
          >
            {row.weekdayShort}
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-1.5">
              <h3 className="text-sm font-semibold text-foreground">{row.weekday}</h3>
              {row.isToday ? (
                <span className="rounded-md bg-[color:var(--primary)] px-1.5 py-0.5 text-[10px] font-semibold text-[color:var(--primary-foreground)]">
                  сегодня
                </span>
              ) : null}
              <HighlightBadge h={highlight} />
            </div>
            <p className="text-[11px] text-muted-foreground">{row.dateLabel}</p>
          </div>
        </div>
        <TrendPill deltaPct={row.total.sumDeltaPct} />
      </div>

      <div className="flex items-end justify-between gap-2">
        <div>
          <div className="text-xl font-bold tabular-nums text-foreground">
            {fmtMoney(row.stat.totalSum)}
          </div>
          <p className="text-[11px] text-muted-foreground">
            {fmtNum(row.stat.totalCount)} оплаченных заявок
          </p>
        </div>
      </div>

      <CashboxSplit stat={row.stat} />
      <InlineNote tone={note.tone} text={note.text} />
    </div>
  )
}

/* -------------------------------- Строка недели -------------------------------- */

function WeekRow({ row, highlight = null }: { row: OverviewWeekRow; highlight?: Highlight }) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border p-4 transition-colors",
        highlightRing(highlight, row.isCurrent),
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 className="text-sm font-semibold text-foreground">
              {row.index}-я неделя
            </h3>
            {row.isCurrent ? (
              <span className="rounded-md bg-[color:var(--primary)] px-1.5 py-0.5 text-[10px] font-semibold text-[color:var(--primary-foreground)]">
                текущая
              </span>
            ) : null}
            <HighlightBadge h={highlight} />
          </div>
          <p className="text-[11px] text-muted-foreground">{row.label}</p>
        </div>
        <TrendPill deltaPct={row.total.sumDeltaPct} />
      </div>

      <div className="flex items-end justify-between gap-2">
        <div>
          <div className="text-xl font-bold tabular-nums text-foreground">
            {fmtMoney(row.stat.totalSum)}
          </div>
          <p className="text-[11px] text-muted-foreground">
            {fmtNum(row.stat.totalCount)} заявок
          </p>
        </div>
        <TrendPill deltaPct={row.total.countDeltaPct} label="заявки" />
      </div>

      <CashboxSplit stat={row.stat} />
    </div>
  )
}

/* -------------------------------- Строка месяца -------------------------------- */

function MonthRow({ row, highlight = null }: { row: OverviewMonthRow; highlight?: Highlight }) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border p-4 transition-colors",
        highlightRing(highlight, row.isCurrent),
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 className="text-sm font-semibold capitalize text-foreground">{row.label}</h3>
            {row.partial ? (
              <span className="rounded-md bg-[color:var(--primary)]/15 px-1.5 py-0.5 text-[10px] font-semibold text-[color:var(--primary)]">
                в процессе
              </span>
            ) : null}
            <HighlightBadge h={highlight} />
          </div>
          <p className="text-[11px] text-muted-foreground">
            {row.isCurrent ? "текущий месяц" : "завершённый месяц"}
          </p>
        </div>
        <TrendPill deltaPct={row.total.sumDeltaPct} />
      </div>

      <div className="flex items-end justify-between gap-2">
        <div>
          <div className="text-xl font-bold tabular-nums text-foreground">
            {fmtMoney(row.stat.totalSum)}
          </div>
          <p className="text-[11px] text-muted-foreground">
            {fmtNum(row.stat.totalCount)} заявок
          </p>
        </div>
        <TrendPill deltaPct={row.total.countDeltaPct} label="заявки" />
      </div>

      <CashboxSplit stat={row.stat} />
    </div>
  )
}

/* ------------------------------- Состояния/каркас ------------------------------- */

function BlockSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <div className="h-24 animate-pulse rounded-xl border border-border bg-muted/40" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-40 animate-pulse rounded-xl border border-border bg-muted/40"
          />
        ))}
      </div>
    </div>
  )
}

function ErrorNote() {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-[color:var(--negative)]/40 bg-[color:var(--negative)]/10 p-4 text-sm text-[color:var(--negative)]">
      <AlertCircle className="size-4 shrink-0" />
      Не удалось загрузить аналитику. Данные появятся, как только связь восстановится.
    </div>
  )
}

/* ------------------------------------ Секция ------------------------------------ */

export function AnalyticsSection() {
  const { report, error, isLoading } = useSalesOverview()

  if (error && !report) {
    return (
      <AnalyticsBlock
        icon={<CalendarDays className="size-5 text-[color:var(--income)]" />}
        title="Аналитика по входящим заявкам"
        subtitle="статус «оплачено» · расшифровка по кассам"
      >
        <ErrorNote />
      </AnalyticsBlock>
    )
  }

  if (!report) {
    return (
      <AnalyticsBlock
        icon={<CalendarDays className="size-5 text-[color:var(--income)]" />}
        title="Аналитика по входящим заявкам"
        subtitle="загрузка данных…"
      >
        <BlockSkeleton />
      </AnalyticsBlock>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <WeekBlock report={report} />
      <MonthBlock report={report} />
      <QuarterBlock report={report} />
    </div>
  )
}

/* ----------------------------------- Блок 1 ----------------------------------- */

function WeekBlock({ report }: { report: OverviewReport }) {
  const w = report.weekOverall
  const elapsedDays = report.weekDays.filter((d) => !d.isFuture)
  const days = elapsedDays.slice().reverse()
  const firstLabel = report.weekDays[0]?.dateLabel
  const lastLabel = report.weekDays[6]?.dateLabel
  // Выводы ИИ строятся только по завершённым дням (без сегодняшнего) — берём
  // отдельный отчёт analysis, если он есть.
  const digest = buildWeekDigest(report.analysis ?? report)

  // Пик/минимум по количеству заявок среди завершённых дней (без сегодня).
  const { peak, trough } = peakTroughKeys(
    elapsedDays,
    (d) => d.dateLabel,
    (d) => d.stat.totalCount,
    (d) => !d.isToday,
  )
  const hl = (d: OverviewDayRow): Highlight =>
    d.dateLabel === peak ? "peak" : d.dateLabel === trough ? "trough" : null

  // Точки графика — по дням недели в хронологическом порядке.
  const points: TrendPoint[] = elapsedDays.map((d) => ({
    label: d.weekdayShort,
    count: d.stat.totalCount,
    sum: d.stat.totalSum,
    current: d.isToday,
  }))

  return (
    <AnalyticsBlock
      icon={<CalendarDays className="size-5 text-[color:var(--income)]" />}
      title="Сводка по дням · текущая неделя"
      subtitle={`Пн–Вс · ${firstLabel} – ${lastLabel}`}
    >
      <KpiStrip
        stat={w.current}
        sumDeltaPct={w.sumDeltaPct}
        countDeltaPct={w.countDeltaPct}
        compareLabel={`vs прошлая неделя за те же ${fmtNum(w.elapsedDays)} дн.`}
        progress={`накопительно · ${fmtNum(w.elapsedDays)} из ${fmtNum(w.periodDays)} дн.`}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {days.map((d) => (
          <DayRow key={d.dateLabel} row={d} highlight={hl(d)} />
        ))}
      </div>

      <TrendChart points={points} unitLabel="заявок" gradientId="trend-week" />
      <AiDigestCard digest={digest} />
    </AnalyticsBlock>
  )
}

/* ----------------------------------- Блок 2 ----------------------------------- */

function MonthBlock({ report }: { report: OverviewReport }) {
  const m = report.monthOverall
  const weeksAsc = report.monthWeeks
  const weeks = weeksAsc.slice().reverse()
  // Выводы ИИ — только по завершённым дням (без сегодняшнего).
  const digest = buildMonthDigest(report.analysis ?? report)

  // Пик/минимум по количеству заявок среди завершённых недель (без текущей).
  const { peak, trough } = peakTroughKeys(
    weeksAsc,
    (w) => String(w.index),
    (w) => w.stat.totalCount,
    (w) => !w.isCurrent,
  )
  const hl = (w: OverviewWeekRow): Highlight =>
    String(w.index) === peak ? "peak" : String(w.index) === trough ? "trough" : null

  // Точки графика — недели месяца в хронологическом порядке (с данными/текущая).
  const points: TrendPoint[] = weeksAsc
    .filter((w) => w.stat.totalCount > 0 || w.isCurrent)
    .map((w) => ({
      label: `${w.index}-я`,
      count: w.stat.totalCount,
      sum: w.stat.totalSum,
      current: w.isCurrent,
    }))

  return (
    <AnalyticsBlock
      icon={<CalendarRange className="size-5 text-[color:var(--primary)]" />}
      title="Сводка по неделям · текущий месяц"
      subtitle={fmtMonthName(m.current.from)}
    >
      <KpiStrip
        stat={m.current}
        sumDeltaPct={m.sumDeltaPct}
        countDeltaPct={m.countDeltaPct}
        compareLabel={`vs прошлый месяц за те же ${fmtNum(m.elapsedDays)} дн.`}
        progress={`накопительно · ${fmtNum(m.elapsedDays)} из ${fmtNum(m.periodDays)} дн.`}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {weeks.map((w) => (
          <WeekRow key={w.index} row={w} highlight={hl(w)} />
        ))}
      </div>

      <TrendChart points={points} unitLabel="заявок" gradientId="trend-month" />
      <AiDigestCard digest={digest} />
    </AnalyticsBlock>
  )
}

/* ----------------------------------- Блок 3 ----------------------------------- */

function QuarterBlock({ report }: { report: OverviewReport }) {
  const q = report.quarterOverall
  const monthsAsc = report.months
  const months = monthsAsc.slice().reverse()
  // Выводы ИИ — только по завершённым дням (без сегодняшнего).
  const digest = buildQuarterDigest(report.analysis ?? report)
  const span = `${report.months[0]?.label} – ${report.months[report.months.length - 1]?.label}`

  // Пик/минимум по количеству заявок среди завершённых месяцев (без текущего).
  const { peak, trough } = peakTroughKeys(
    monthsAsc,
    (mo) => mo.label,
    (mo) => mo.stat.totalCount,
    (mo) => !mo.isCurrent,
  )
  const hl = (mo: OverviewMonthRow): Highlight =>
    mo.label === peak ? "peak" : mo.label === trough ? "trough" : null

  // Точки графика — месяцы в хронологическом порядке.
  const points: TrendPoint[] = monthsAsc.map((mo) => ({
    label: mo.label.replace(/\s+\d{4}$/, ""),
    count: mo.stat.totalCount,
    sum: mo.stat.totalSum,
    current: mo.isCurrent,
  }))

  return (
    <AnalyticsBlock
      icon={<CalendarClock className="size-5 text-[color:var(--accent)]" />}
      title="Сводка по месяцам · последние 3 месяца"
      subtitle={span}
    >
      <div className="grid grid-cols-1 gap-3 rounded-xl border border-border bg-background/60 p-4 sm:grid-cols-3">
        <div>
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
            Сумма за 3 месяца
          </div>
          <div className="mt-0.5 text-2xl font-bold tabular-nums text-foreground">
            {fmtMoney(q.totalSum)}
          </div>
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
            Всего заявок
          </div>
          <div className="mt-0.5 text-2xl font-bold tabular-nums text-foreground">
            {fmtNum(q.totalCount)}
          </div>
        </div>
        <div className="flex items-center gap-2 sm:justify-end">
          <RefreshCw className="size-3.5 text-muted-foreground" />
          <span className="text-[11px] text-muted-foreground">
            средний чек {fmtMoney(q.totalSum / Math.max(1, q.totalCount))}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {months.map((mo) => (
          <MonthRow key={mo.label} row={mo} highlight={hl(mo)} />
        ))}
      </div>

      <TrendChart points={points} unitLabel="заявок" gradientId="trend-quarter" />
      <AiDigestCard digest={digest} />
    </AnalyticsBlock>
  )
}
