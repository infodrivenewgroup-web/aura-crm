'use client'

import { useMemo, useState } from 'react'
import { useComputedDays } from '@/hooks/use-store'
import { sumPeriod, pctChange, money } from '@/lib/calc'
import { AD_CAMPAIGNS } from '@/lib/types'
import { fmtMoney, fmtNum, fmtPct, fmtDate } from '@/lib/format'
import {
  type PeriodPreset,
  type PeriodRange,
  resolveRange,
  allRange,
  rangeLabel,
  filterRange,
  previousRange,
} from '@/lib/period'
import { PeriodSelector } from '@/components/crm/period-selector'
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
} from 'recharts'
import {
  Brain,
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  Award,
  AlertTriangle,
  Lightbulb,
} from 'lucide-react'

const COLORS = {
  income: 'var(--positive)',
  expense: 'var(--negative)',
  profit: 'var(--accent)',
  grid: 'var(--border)',
  muted: 'var(--muted-foreground)',
}

export function AnalyticsTab() {
  const computed = useComputedDays()
  const [preset, setPreset] = useState<PeriodPreset>('all')
  const [customRange, setCustomRange] = useState<PeriodRange>(() => allRange(computed))

  const range = useMemo(
    () => resolveRange(preset, computed, customRange),
    [preset, computed, customRange],
  )

  const days = useMemo(() => filterRange(computed, range), [computed, range])
  const totals = useMemo(() => sumPeriod(days), [days])
  const prevRange = useMemo(() => previousRange(range), [range])
  const prevDays = useMemo(() => filterRange(computed, prevRange), [computed, prevRange])
  const prev = useMemo(() => sumPeriod(prevDays), [prevDays])

  const metrics = useMemo(() => {
    const n = days.length || 1
    const avgProfit = money(totals.netProfit / n)
    const avgIncome = money(totals.totalIncome / n)
    const avgExpense = money(totals.totalExpenses / n)
    const avgRequests = money(totals.baseRequestsCount / n)
    const profits = days.map((d) => d.netProfit)
    const best = days.length
      ? days.reduce((a, b) => (b.netProfit > a.netProfit ? b : a))
      : null
    const worst = days.length
      ? days.reduce((a, b) => (b.netProfit < a.netProfit ? b : a))
      : null
    const profitableDays = profits.filter((p) => p > 0).length
    const lossDays = profits.filter((p) => p < 0).length
    const adShare =
      totals.totalExpenses > 0 ? money((totals.adsTotal / totals.totalExpenses) * 100) : 0
    const drr = totals.totalIncome > 0 ? money((totals.adsTotal / totals.totalIncome) * 100) : 0
    const commissionShare =
      totals.totalExpenses > 0 ? money((totals.cashCommission / totals.totalExpenses) * 100) : 0
    const salaryShare =
      totals.totalExpenses > 0 ? money((totals.salaries / totals.totalExpenses) * 100) : 0
    const avgCheck =
      totals.baseRequestsCount > 0 ? money(totals.totalIncome / totals.baseRequestsCount) : 0
    const refundShare =
      totals.baseRequestsSum > 0 ? money((totals.refundsSum / totals.baseRequestsSum) * 100) : 0
    return {
      avgProfit,
      avgIncome,
      avgExpense,
      avgRequests,
      best,
      worst,
      profitableDays,
      lossDays,
      adShare,
      drr,
      commissionShare,
      salaryShare,
      avgCheck,
      refundShare,
    }
  }, [days, totals])

  // Данные для графика «Приход / Расход / Прибыль» по дням
  const chartData = useMemo(
    () =>
      days.map((d) => ({
        date: fmtDate(d.date).slice(0, 5),
        Приход: d.totalIncome,
        Расход: d.totalExpenses,
        Прибыль: d.netProfit,
      })),
    [days],
  )

  // Структура расходов для разбивки
  const expenseStructure = useMemo(() => {
    const items = [
      { name: 'Комиссия кассы', value: totals.cashCommission },
      { name: 'Реклама', value: totals.adsTotal },
      { name: 'Зарплата', value: totals.salaries },
      { name: 'Прочие расходы', value: totals.otherExpensesTotal },
    ]
    const max = Math.max(...items.map((i) => i.value), 1)
    return items
      .map((i) => ({
        ...i,
        pct: totals.totalExpenses > 0 ? money((i.value / totals.totalExpenses) * 100) : 0,
        bar: (i.value / max) * 100,
      }))
      .sort((a, b) => b.value - a.value)
  }, [totals])

  const adRanking = useMemo(() => {
    return AD_CAMPAIGNS.map((c) => ({
      key: c.label,
      value: totals.adsBreakdown[c.key],
    }))
      .filter((a) => a.value > 0)
      .sort((a, b) => b.value - a.value)
  }, [totals])

  const insights = useMemo(
    () => buildInsights(totals, prev, metrics, days.length),
    [totals, prev, metrics, days.length],
  )
  const verdict = useMemo(
    () => buildVerdict(totals, prev, metrics),
    [totals, prev, metrics],
  )

  const hasData = days.length > 0
  const marginPct = Math.max(0, Math.min(100, totals.margin))

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
            <Brain className="size-5 text-primary" />
            Аналитика
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Углублённые показатели эффективности, сравнение периодов и выводы ИИ.
          </p>
        </div>
        <PeriodSelector
          preset={preset}
          range={range}
          onPreset={setPreset}
          onRange={(r) => {
            setPreset('custom')
            setCustomRange(r)
          }}
        />
      </div>

      <div className="rounded-lg border border-border bg-muted/40 px-4 py-2 text-sm">
        <span className="text-muted-foreground">Период анализа: </span>
        <span className="font-medium text-foreground">{rangeLabel(preset, range)}</span>
        <span className="text-muted-foreground"> · дней с данными: </span>
        <span className="font-medium text-foreground">{days.length}</span>
      </div>

      {!hasData ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card text-center">
          <Brain className="size-8 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium">Недостаточно данных для анализа</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Заполните хотя бы один день во вкладке «Баланс».
          </p>
        </div>
      ) : (
        <>
          {/* Вывод ИИ — крупный блок сверху */}
          <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 sm:p-5">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <Lightbulb className="size-4 text-primary" /> Вывод ИИ по периоду
            </h3>
            <p className="text-sm leading-relaxed text-foreground/90">{verdict}</p>
          </div>

          {/* Ключевые метрики */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Metric label="Средняя прибыль / день" value={fmtMoney(metrics.avgProfit)} tone={toneOf(metrics.avgProfit)} />
            <Metric label="Средний приход / день" value={fmtMoney(metrics.avgIncome)} />
            <Metric label="Средний расход / день" value={fmtMoney(metrics.avgExpense)} />
            <Metric label="Средний чек заявки" value={fmtMoney(metrics.avgCheck)} />
            <Metric label="Заявок в день (сред.)" value={fmtNum(metrics.avgRequests)} />
            <Metric label="Рентабельность" value={`${fmtNum(totals.margin)}%`} tone={toneOf(totals.margin)} />
            <Metric label="ДРР (реклама / приход)" value={`${fmtNum(metrics.drr)}%`} hint="доля рекламных расходов" />
            <Metric label="Доля возвратов" value={`${fmtNum(metrics.refundShare)}%`} hint="от суммы заявок" />
          </div>

          {/* Главный график: приход / расход / прибыль по дням */}
          <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
            <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold">
              <TrendingUp className="size-4 text-primary" /> Динамика прихода, расхода и прибыли
            </h3>
            <p className="mb-4 text-xs text-muted-foreground">
              Столбцы — приход и расход за день, линия — чистая прибыль. Помогает увидеть, в какие
              дни прибыль растёт или падает.
            </p>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: COLORS.muted }} tickLine={false} axisLine={{ stroke: COLORS.grid }} />
                  <YAxis tick={{ fontSize: 11, fill: COLORS.muted }} tickLine={false} axisLine={false} tickFormatter={(v) => compact(v)} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="Приход" fill={COLORS.income} radius={[3, 3, 0, 0]} maxBarSize={28} />
                  <Bar dataKey="Расход" fill={COLORS.expense} radius={[3, 3, 0, 0]} maxBarSize={28} />
                  <Line type="monotone" dataKey="Прибыль" stroke={COLORS.profit} strokeWidth={2.5} dot={{ r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Сравнение с предыдущим периодом */}
            <ComparisonPanel totals={totals} prev={prev} />

            {/* Рентабельность кольцом + лучший/худший день */}
            <div className="grid gap-4">
              <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
                <h3 className="mb-2 text-sm font-semibold">Рентабельность периода</h3>
                <div className="flex items-center gap-4">
                  <div className="h-32 w-32 shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadialBarChart
                        innerRadius="70%"
                        outerRadius="100%"
                        data={[{ name: 'margin', value: marginPct, fill: COLORS.profit }]}
                        startAngle={90}
                        endAngle={-270}
                      >
                        <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                        <RadialBar background dataKey="value" cornerRadius={8} />
                      </RadialBarChart>
                    </ResponsiveContainer>
                  </div>
                  <div>
                    <div className={`text-3xl font-bold tabular-nums ${toneOf(totals.margin)}`}>
                      {fmtNum(totals.margin)}%
                    </div>
                    <p className="mt-1 max-w-[12rem] text-xs text-muted-foreground">
                      Доля чистой прибыли в приходе. Ориентир для здорового сервиса — выше 25–30%.
                    </p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {metrics.best && (
                  <HighlightCard
                    icon={<Award className="size-4 text-[color:var(--positive)]" />}
                    title="Лучший день"
                    date={metrics.best.date}
                    value={metrics.best.netProfit}
                  />
                )}
                {metrics.worst && (
                  <HighlightCard
                    icon={<AlertTriangle className="size-4 text-[color:var(--warning)]" />}
                    title="Худший день"
                    date={metrics.worst.date}
                    value={metrics.worst.netProfit}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Структура расходов */}
          <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
            <h3 className="mb-4 text-sm font-semibold">Структура расходов</h3>
            <div className="space-y-3">
              {expenseStructure.map((e) => (
                <div key={e.name} className="flex items-center gap-3">
                  <span className="w-32 shrink-0 truncate text-sm text-muted-foreground">{e.name}</span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-[color:var(--negative)]/70" style={{ width: `${e.bar}%` }} />
                  </div>
                  <span className="w-14 text-right text-xs tabular-nums text-muted-foreground">{fmtNum(e.pct)}%</span>
                  <span className="w-28 text-right text-sm font-medium tabular-nums">{fmtMoney(e.value)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Рейтинг рекламных компаний */}
          {adRanking.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold">
                <Target className="size-4 text-primary" /> Рейтинг расходов по рекламным компаниям
              </h3>
              <div className="space-y-2">
                {adRanking.map((a, i) => {
                  const max = adRanking[0]?.value || 1
                  const pct = max > 0 ? (a.value / max) * 100 : 0
                  return (
                    <div key={a.key} className="flex items-center gap-3">
                      <span className="w-5 text-right text-xs text-muted-foreground">{i + 1}</span>
                      <span className="w-40 truncate text-sm">{a.key}</span>
                      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-[color:var(--accent)]" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="w-28 text-right text-sm font-medium tabular-nums">{fmtMoney(a.value)}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Автоматические выводы ИИ */}
          <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Brain className="size-4 text-primary" /> Подробная расшифровка ИИ
            </h3>
            <ul className="space-y-2">
              {insights.map((ins, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 rounded-lg border border-border bg-background/40 px-3 py-2 text-sm"
                >
                  <span
                    className={`mt-0.5 inline-block size-2 shrink-0 rounded-full ${
                      ins.tone === 'good'
                        ? 'bg-[color:var(--positive)]'
                        : ins.tone === 'bad'
                          ? 'bg-[color:var(--negative)]'
                          : 'bg-[color:var(--warning)]'
                    }`}
                  />
                  <span className="text-foreground/90">{ins.text}</span>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  )
}

function toneOf(value: number): string {
  return value > 0
    ? 'text-[color:var(--positive)]'
    : value < 0
      ? 'text-[color:var(--negative)]'
      : 'text-foreground'
}

function compact(v: number): string {
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}М`
  if (Math.abs(v) >= 1000) return `${Math.round(v / 1000)}к`
  return String(v)
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
      <div className="mb-1 font-medium text-foreground">{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5" style={{ color: p.color }}>
            <span className="inline-block size-2 rounded-full" style={{ background: p.color }} />
            {p.dataKey}
          </span>
          <span className="font-medium tabular-nums text-foreground">{fmtMoney(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

function Metric({
  label,
  value,
  hint,
  tone,
}: {
  label: string
  value: string
  hint?: string
  tone?: string
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-1.5 text-base font-bold tabular-nums sm:text-lg ${tone ?? ''}`}>{value}</div>
      {hint ? <div className="mt-0.5 text-[11px] text-muted-foreground/70">{hint}</div> : null}
    </div>
  )
}

function ComparisonPanel({ totals, prev }: { totals: any; prev: any }) {
  const rows: { label: string; cur: number; prev: number; invert?: boolean }[] = [
    { label: 'Приход', cur: totals.totalIncome, prev: prev.totalIncome },
    { label: 'Расход', cur: totals.totalExpenses, prev: prev.totalExpenses, invert: true },
    { label: 'Реклама', cur: totals.adsTotal, prev: prev.adsTotal, invert: true },
    { label: 'Чистая прибыль', cur: totals.netProfit, prev: prev.netProfit },
  ]
  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <h3 className="mb-4 text-sm font-semibold">Сравнение с предыдущим периодом</h3>
      <div className="space-y-3">
        {rows.map((r) => {
          const delta = pctChange(r.cur, r.prev)
          const positive = delta !== null && delta > 0
          const negative = delta !== null && delta < 0
          const good = r.invert ? negative : positive
          const bad = r.invert ? positive : negative
          const Icon = delta === null || delta === 0 ? Minus : good ? TrendingUp : TrendingDown
          const tone = good
            ? 'text-[color:var(--positive)]'
            : bad
              ? 'text-[color:var(--negative)]'
              : 'text-muted-foreground'
          return (
            <div key={r.label} className="flex items-center justify-between gap-3">
              <span className="text-sm text-muted-foreground">{r.label}</span>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium tabular-nums">{fmtMoney(r.cur)}</span>
                <span className={`flex w-24 items-center justify-end gap-1 text-xs tabular-nums ${tone}`}>
                  <Icon className="size-3.5" />
                  {fmtPct(delta)}
                </span>
              </div>
            </div>
          )
        })}
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground/70">
        Предыдущий период — сопоставимый отрезок такой же длины.
      </p>
    </div>
  )
}

function HighlightCard({
  icon,
  title,
  date,
  value,
}: {
  icon: React.ReactNode
  title: string
  date: string
  value: number
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
        {icon}
        {title}
      </div>
      <div className="mt-2 flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">{fmtDate(date)}</span>
        <span className={`text-lg font-bold tabular-nums ${toneOf(value)}`}>{fmtMoney(value)}</span>
      </div>
    </div>
  )
}

type Insight = { text: string; tone: 'good' | 'bad' | 'warn' }

function buildVerdict(totals: any, prev: any, metrics: any): string {
  if (totals.daysCount === 0) return 'Нет данных для вывода.'
  const profitDelta = pctChange(totals.netProfit, prev.netProfit)
  const parts: string[] = []

  // Общая оценка прибыли
  if (totals.netProfit > 0) {
    parts.push(
      `За период сервис заработал чистыми ${fmtMoney(totals.netProfit)} при рентабельности ${fmtNum(totals.margin)}%.`,
    )
  } else if (totals.netProfit < 0) {
    parts.push(
      `За период сервис сработал в минус: убыток ${fmtMoney(Math.abs(totals.netProfit))}. Нужно срочно сокращать расходы или повышать приход.`,
    )
  } else {
    parts.push('За период сервис вышел в ноль.')
  }

  // Динамика
  if (profitDelta !== null) {
    if (profitDelta > 5)
      parts.push(`Прибыль выросла на ${fmtPct(profitDelta)} к предыдущему периоду — позитивная динамика.`)
    else if (profitDelta < -5)
      parts.push(`Прибыль упала на ${fmtPct(profitDelta)} к предыдущему периоду — динамика ухудшилась.`)
    else parts.push('Прибыль держится на уровне предыдущего периода.')
  }

  // Главная точка внимания
  if (metrics.drr > 30)
    parts.push(`Основной риск — высокий ДРР (${fmtNum(metrics.drr)}%): реклама съедает слишком большую долю прихода.`)
  else if (metrics.refundShare > 10)
    parts.push(`Обратите внимание на возвраты — ${fmtNum(metrics.refundShare)}% от суммы заявок.`)
  else if (totals.margin >= 30)
    parts.push('Структура расходов сбалансирована, маржа на здоровом уровне.')

  return parts.join(' ')
}

function buildInsights(totals: any, prev: any, metrics: any, daysCount: number): Insight[] {
  const out: Insight[] = []

  const profitDelta = pctChange(totals.netProfit, prev.netProfit)
  if (profitDelta !== null) {
    if (profitDelta > 0)
      out.push({
        text: `Чистая прибыль выросла на ${fmtPct(profitDelta)} относительно предыдущего периода.`,
        tone: 'good',
      })
    else if (profitDelta < 0)
      out.push({
        text: `Чистая прибыль снизилась на ${fmtPct(profitDelta)} относительно предыдущего периода — стоит разобраться в причинах.`,
        tone: 'bad',
      })
  }

  const incomeDelta = pctChange(totals.totalIncome, prev.totalIncome)
  if (incomeDelta !== null && incomeDelta !== 0)
    out.push({
      text: `Приход ${incomeDelta > 0 ? 'вырос' : 'снизился'} на ${fmtPct(incomeDelta)} к предыдущему периоду.`,
      tone: incomeDelta > 0 ? 'good' : 'warn',
    })

  if (totals.margin < 15 && totals.totalIncome > 0)
    out.push({
      text: `Низкая рентабельность (${fmtNum(totals.margin)}%). Проверьте расходы на рекламу и зарплаты.`,
      tone: 'warn',
    })
  else if (totals.margin >= 35)
    out.push({
      text: `Высокая рентабельность (${fmtNum(totals.margin)}%) — бизнес-модель работает эффективно.`,
      tone: 'good',
    })

  out.push({
    text: `Структура расходов: реклама ${fmtNum(metrics.adShare)}%, комиссия кассы ${fmtNum(metrics.commissionShare)}%, зарплата ${fmtNum(metrics.salaryShare)}% от всех расходов.`,
    tone: 'warn',
  })

  if (metrics.drr > 30)
    out.push({
      text: `ДРР составляет ${fmtNum(metrics.drr)}% — реклама съедает значительную долю прихода.`,
      tone: 'bad',
    })
  else if (metrics.drr > 0 && metrics.drr <= 20)
    out.push({
      text: `ДРР ${fmtNum(metrics.drr)}% — реклама окупается с хорошим запасом.`,
      tone: 'good',
    })

  if (metrics.lossDays > 0)
    out.push({
      text: `Зафиксировано убыточных дней: ${metrics.lossDays} из ${daysCount}. Изучите их структуру расходов.`,
      tone: 'warn',
    })
  else
    out.push({
      text: 'Убыточных дней нет — все дни периода прибыльны.',
      tone: 'good',
    })

  if (totals.refundsSum > 0)
    out.push({
      text: `Доля возвратов — ${fmtNum(metrics.refundShare)}% от суммы заявок (${fmtMoney(totals.refundsSum)}).`,
      tone: metrics.refundShare > 10 ? 'bad' : 'warn',
    })

  if (out.length === 0)
    out.push({ text: 'Данных достаточно — ключевые показатели в норме.', tone: 'good' })

  return out
}
