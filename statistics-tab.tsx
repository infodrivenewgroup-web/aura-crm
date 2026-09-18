'use client'

import { useMemo, useState } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useComputedDays } from '@/hooks/use-store'
import { sumPeriod, pctChange } from '@/lib/calc'
import { fmtMoney, fmtNum, fmtDate, fmtPct, weekStart, weekLabel, monthKey, fmtMonthName } from '@/lib/format'
import { AD_CAMPAIGNS, type DayComputed } from '@/lib/types'
import {
  type PeriodPreset,
  type PeriodRange,
  resolveRange,
  rangeLabel,
  lastDayRange,
  filterRange,
  previousRange,
} from '@/lib/period'
import { PeriodSelector } from '@/components/crm/period-selector'
import {
  BarChart3,
  Wallet,
  Receipt,
  Megaphone,
  Users,
  Boxes,
  TrendingUp,
  TrendingDown,
  Minus,
  CalendarRange,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const CHART = {
  income: 'var(--income)',
  expense: 'var(--expense)',
  profit: 'var(--profit)',
  positive: 'var(--positive)',
  negative: 'var(--negative)',
}

const PIE_COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)']

type Granularity = 'day' | 'week' | 'month'

interface Bucket {
  label: string
  Приход: number
  Расход: number
  Прибыль: number
}

function aggregate(days: DayComputed[], g: Granularity): Bucket[] {
  if (g === 'day') {
    return days.map((d) => ({
      label: fmtDate(d.date).slice(0, 5),
      Приход: d.totalIncome,
      Расход: d.totalExpenses,
      Прибыль: d.netProfit,
    }))
  }
  const groups = new Map<string, DayComputed[]>()
  for (const d of days) {
    const key = g === 'week' ? weekStart(d.date) : monthKey(d.date)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(d)
  }
  return [...groups.keys()].sort().map((key) => {
    const t = sumPeriod(groups.get(key)!)
    return {
      label: g === 'week' ? weekLabel(key) : fmtMonthName(key + '-01').replace(/ \d{4}$/, ''),
      Приход: t.totalIncome,
      Расход: t.totalExpenses,
      Прибыль: t.netProfit,
    }
  })
}

export function StatisticsTab() {
  const computed = useComputedDays()
  // По умолчанию — последний день; фильтр позволяет выбрать день/неделю/месяц/период.
  const [preset, setPreset] = useState<PeriodPreset>('today')
  const [customRange, setCustomRange] = useState<PeriodRange>(() => lastDayRange(computed))
  const [granularity, setGranularity] = useState<Granularity>('day')

  const range = useMemo(
    () => resolveRange(preset, computed, customRange),
    [preset, computed, customRange],
  )

  const periodDays = useMemo(() => filterRange(computed, range), [computed, range])
  const totals = useMemo(() => sumPeriod(periodDays), [periodDays])
  const prevTotals = useMemo(
    () => sumPeriod(filterRange(computed, previousRange(range))),
    [computed, range],
  )

  const series = useMemo(
    () =>
      periodDays.map((d) => ({
        date: fmtDate(d.date).slice(0, 5),
        Приход: d.totalIncome,
        Расход: d.totalExpenses,
        Прибыль: d.netProfit,
      })),
    [periodDays],
  )

  const buckets = useMemo(() => aggregate(periodDays, granularity), [periodDays, granularity])

  // Прибыль по периодам с индикатором улучшения/ухудшения относительно
  // предыдущего отрезка (зелёный = рост, красный = снижение).
  const profitTrend = useMemo(
    () =>
      buckets.map((b, i) => {
        const prev = i > 0 ? buckets[i - 1].Прибыль : null
        const up = prev === null ? true : b.Прибыль >= prev
        return { label: b.label, Прибыль: b.Прибыль, up, delta: prev === null ? null : pctChange(b.Прибыль, prev) }
      }),
    [buckets],
  )

  const adData = useMemo(
    () =>
      AD_CAMPAIGNS.map((c) => ({ name: c.label, value: totals.adsBreakdown[c.key] })).filter(
        (x) => x.value > 0,
      ),
    [totals],
  )

  const expenseStructure = useMemo(
    () =>
      [
        { name: 'Комиссия кассы', value: totals.cashCommission },
        { name: 'Расходы на рекламу', value: totals.adsTotal },
        { name: 'Зарплата', value: totals.salaries },
        { name: 'Прочие расходы', value: totals.otherExpensesTotal },
      ].filter((x) => x.value > 0),
    [totals],
  )

  const hasData = periodDays.length > 0

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
            <BarChart3 className="size-5 text-primary" />
            Статистика
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Общие показатели и динамика за выбранный период.
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

      <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5">
        <CalendarRange className="size-4 text-[color:var(--accent)]" />
        <span className="text-sm font-medium text-foreground">Данные за период:</span>
        <span className="text-sm font-semibold text-[color:var(--accent)]">{rangeLabel(preset, range)}</span>
        <span className="ml-auto text-xs text-muted-foreground">дней с данными: {fmtNum(totals.daysCount)}</span>
      </div>

      {!hasData ? (
        <EmptyState />
      ) : (
        <>
          {/* 6 общих показателей с теми же названиями, что и в разбивке ниже */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
            <Kpi
              icon={<Wallet className="size-4" />}
              label="Общий доход"
              value={fmtMoney(totals.totalIncome)}
              delta={pctChange(totals.totalIncome, prevTotals.totalIncome)}
              tone="text-[color:var(--income)]"
            />
            <Kpi
              icon={<Receipt className="size-4" />}
              label="Комиссия кассы"
              value={fmtMoney(totals.cashCommission)}
              delta={pctChange(totals.cashCommission, prevTotals.cashCommission)}
              invert
            />
            <Kpi
              icon={<Megaphone className="size-4" />}
              label="Расходы на рекламу"
              value={fmtMoney(totals.adsTotal)}
              delta={pctChange(totals.adsTotal, prevTotals.adsTotal)}
              invert
            />
            <Kpi
              icon={<Users className="size-4" />}
              label="Зарплата"
              value={fmtMoney(totals.salaries)}
              delta={pctChange(totals.salaries, prevTotals.salaries)}
              invert
            />
            <Kpi
              icon={<Boxes className="size-4" />}
              label="Прочие расходы"
              value={fmtMoney(totals.otherExpensesTotal)}
              delta={pctChange(totals.otherExpensesTotal, prevTotals.otherExpensesTotal)}
              invert
            />
            <Kpi
              icon={<TrendingUp className="size-4" />}
              label="Чистая прибыль"
              value={fmtMoney(totals.netProfit)}
              delta={pctChange(totals.netProfit, prevTotals.netProfit)}
              tone={totals.netProfit >= 0 ? 'text-[color:var(--positive)]' : 'text-[color:var(--negative)]'}
            />
          </div>

          {/* Подробная разбивка теми же названиями */}
          <Panel title="Подробная разбивка показателей за период">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              <Breakdown label="Общий доход" value={totals.totalIncome} total={totals.totalIncome} tone="income" />
              <Breakdown label="Комиссия кассы" value={totals.cashCommission} total={totals.totalExpenses} tone="expense" />
              <Breakdown label="Расходы на рекламу" value={totals.adsTotal} total={totals.totalExpenses} tone="expense" />
              <Breakdown label="Зарплата" value={totals.salaries} total={totals.totalExpenses} tone="expense" />
              <Breakdown label="Прочие расходы" value={totals.otherExpensesTotal} total={totals.totalExpenses} tone="expense" />
              <Breakdown label="Чистая прибыль" value={totals.netProfit} total={totals.totalIncome} tone="profit" />
            </div>
          </Panel>

          <Panel title="Динамика прихода, расхода и прибыли">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={series} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gInc" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART.income} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={CHART.income} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gProf" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART.profit} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={CHART.profit} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} width={70} tickFormatter={(v) => fmtNum(v)} />
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="Приход" stroke={CHART.income} fill="url(#gInc)" strokeWidth={2} />
                <Area type="monotone" dataKey="Прибыль" stroke={CHART.profit} fill="url(#gProf)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </Panel>

          {/* Профессиональный график прихода/расхода + индикатор прибыли */}
          <Panel
            title="Прибыль по периодам — улучшение / ухудшение"
            action={<GranularityToggle value={granularity} onChange={setGranularity} />}
          >
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={profitTrend} margin={{ top: 16, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} width={70} tickFormatter={(v) => fmtNum(v)} />
                <Tooltip content={<ProfitTrendTooltip />} />
                <ReferenceLine y={0} stroke="var(--border)" />
                <Bar dataKey="Прибыль" radius={[3, 3, 0, 0]}>
                  {profitTrend.map((p, i) => (
                    <Cell key={i} fill={p.up ? CHART.positive : CHART.negative} />
                  ))}
                </Bar>
                <Line type="monotone" dataKey="Прибыль" stroke="var(--foreground)" strokeWidth={1.5} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
            <p className="mt-2 text-xs text-muted-foreground">
              Зелёные столбцы — прибыль выросла относительно предыдущего {granularity === 'day' ? 'дня' : granularity === 'week' ? 'недели' : 'месяца'}, красные — снизилась.
            </p>
          </Panel>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Приход vs Расход по дням">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={series} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={11} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={11} width={70} tickFormatter={(v) => fmtNum(v)} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="Приход" fill={CHART.income} radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Расход" fill={CHART.expense} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Panel>

            <Panel title="Структура расходов">
              {expenseStructure.length === 0 ? (
                <NoChartData />
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={expenseStructure} dataKey="value" nameKey="name" innerRadius={55} outerRadius={95} paddingAngle={2}>
                      {expenseStructure.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </Panel>
          </div>

          <Panel title="Расходы по рекламным компаниям">
            {adData.length === 0 ? (
              <NoChartData />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart layout="vertical" data={adData} margin={{ top: 10, right: 20, left: 20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis type="number" stroke="var(--muted-foreground)" fontSize={11} tickFormatter={(v) => fmtNum(v)} />
                  <YAxis type="category" dataKey="name" stroke="var(--muted-foreground)" fontSize={11} width={130} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="value" name="Расход" radius={[0, 3, 3, 0]}>
                    {adData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </Panel>

          <Panel title="Накопленная прибыль (тренд)">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart
                data={(() => {
                  let acc = 0
                  return periodDays.map((d) => {
                    acc += d.netProfit
                    return { date: fmtDate(d.date).slice(0, 5), Накоплено: Math.round(acc * 100) / 100 }
                  })
                })()}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} width={70} tickFormatter={(v) => fmtNum(v)} />
                <Tooltip content={<ChartTooltip />} />
                <Line type="monotone" dataKey="Накоплено" stroke={CHART.profit} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </Panel>
        </>
      )}
    </div>
  )
}

function GranularityToggle({ value, onChange }: { value: Granularity; onChange: (g: Granularity) => void }) {
  const opts: { id: Granularity; label: string }[] = [
    { id: 'day', label: 'Дни' },
    { id: 'week', label: 'Недели' },
    { id: 'month', label: 'Месяцы' },
  ]
  return (
    <div className="flex gap-1 rounded-lg border border-border bg-background/40 p-1">
      {opts.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={cn(
            'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
            value === o.id ? 'bg-[color:var(--primary)]/20 text-foreground' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function Kpi({
  icon,
  label,
  value,
  delta,
  invert,
  tone,
}: {
  icon: React.ReactNode
  label: string
  value: string
  delta: number | null
  invert?: boolean
  tone?: string
}) {
  const positive = delta !== null && delta > 0
  const negative = delta !== null && delta < 0
  const good = invert ? negative : positive
  const bad = invert ? positive : negative
  const dtone = good ? 'text-[color:var(--positive)]' : bad ? 'text-[color:var(--negative)]' : 'text-muted-foreground'
  const Icon = delta === null || delta === 0 ? Minus : good ? TrendingUp : TrendingDown
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
        <span className="text-muted-foreground">{icon}</span>
        <span className="truncate">{label}</span>
      </div>
      <div className={cn('mt-1.5 text-base font-bold tabular-nums sm:text-lg', tone)}>{value}</div>
      <div className={cn('mt-1 flex items-center gap-1 text-[11px] tabular-nums', dtone)}>
        <Icon className="size-3" />
        {delta === null ? 'нет базы' : `${fmtPct(delta)}`}
      </div>
    </div>
  )
}

function Breakdown({
  label,
  value,
  total,
  tone,
}: {
  label: string
  value: number
  total: number
  tone: 'income' | 'expense' | 'profit'
}) {
  const share = total > 0 ? Math.round((Math.abs(value) / total) * 100) : 0
  const barColor =
    tone === 'income' ? 'var(--income)' : tone === 'profit' ? 'var(--profit)' : 'var(--expense)'
  return (
    <div className="rounded-xl border border-border bg-background/40 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="text-sm font-semibold tabular-nums">{fmtMoney(value)}</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full" style={{ width: `${share}%`, background: barColor }} />
      </div>
      <div className="mt-1 text-right text-[11px] text-muted-foreground">{share}% {tone === 'income' ? 'от прихода' : tone === 'profit' ? 'маржа' : 'от расходов'}</div>
    </div>
  )
}

function Panel({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  )
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-lg">
      {label ? <div className="mb-1 font-medium text-foreground">{label}</div> : null}
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className="inline-block size-2 rounded-full" style={{ background: p.color || p.fill }} />
            {p.name}
          </span>
          <span className="font-medium tabular-nums text-foreground">{fmtMoney(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

function ProfitTrendTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const row = payload[0]?.payload
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-lg">
      <div className="mb-1 font-medium text-foreground">{label}</div>
      <div className="flex items-center justify-between gap-4">
        <span className="text-muted-foreground">Чистая прибыль</span>
        <span className="font-medium tabular-nums text-foreground">{fmtMoney(row?.Прибыль ?? 0)}</span>
      </div>
      {row?.delta !== null && row?.delta !== undefined ? (
        <div className={cn('mt-0.5 flex items-center justify-between gap-4', row.up ? 'text-[color:var(--positive)]' : 'text-[color:var(--negative)]')}>
          <span>{row.up ? 'рост' : 'снижение'}</span>
          <span className="tabular-nums">{fmtPct(row.delta)}</span>
        </div>
      ) : null}
    </div>
  )
}

function NoChartData() {
  return (
    <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
      Недостаточно данных для построения графика
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card text-center">
      <BarChart3 className="size-8 text-muted-foreground" />
      <p className="mt-3 text-sm font-medium text-foreground">Нет данных за период</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Заполните дни во вкладке «Баланс» и нажмите «Загрузить данные».
      </p>
    </div>
  )
}
