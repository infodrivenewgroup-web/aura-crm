"use client"

import {
  Area,
  CartesianGrid,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { cn } from "@/lib/utils"
import { fmtMoney, fmtNum } from "@/lib/format"

/** Точка графика: подпись оси X, количество заявок и сумма для подсказки. */
export interface TrendPoint {
  label: string
  count: number
  sum: number
  /** Период ещё не завершён (сегодня / текущая неделя / текущий месяц). */
  current?: boolean
}

const POSITIVE = "var(--positive)"
const NEGATIVE = "var(--negative)"
const PRIMARY = "var(--primary)"
const MUTED = "var(--muted-foreground)"

/**
 * Небольшой профессиональный график динамики количества заявок.
 * Пиковый (максимум) и минимальный завершённые периоды подсвечиваются
 * цветными точками с подписями. Текущий (незавершённый) период отмечается
 * отдельным «полым» маркером и не участвует в расчёте пика/минимума.
 * Полностью адаптивен по ширине контейнера.
 */
export function TrendChart({
  points,
  unitLabel,
  gradientId,
}: {
  points: TrendPoint[]
  /** Единица измерения для подписи («заявок»). */
  unitLabel: string
  /** Уникальный id градиента (несколько графиков на странице). */
  gradientId: string
}) {
  // Индексы пика и минимума среди ЗАВЕРШЁННЫХ периодов с данными.
  const completed = points
    .map((p, i) => ({ p, i }))
    .filter(({ p }) => !p.current && p.count > 0)
  const pool = completed.length >= 2 ? completed : points.map((p, i) => ({ p, i }))

  let peakIdx = -1
  let troughIdx = -1
  if (pool.length > 0) {
    let max = -Infinity
    let min = Infinity
    for (const { p, i } of pool) {
      if (p.count > max) {
        max = p.count
        peakIdx = i
      }
      if (p.count < min) {
        min = p.count
        troughIdx = i
      }
    }
    // Если пик и минимум совпали (все значения равны) — не помечаем минимум.
    if (peakIdx === troughIdx) troughIdx = -1
  }

  const data = points.map((p, i) => ({
    ...p,
    role:
      i === peakIdx ? "peak" : i === troughIdx ? "trough" : p.current ? "current" : "flat",
  }))

  const maxCount = Math.max(1, ...points.map((p) => p.count))

  return (
    <figure className="flex flex-col gap-2 rounded-xl border border-border bg-background/60 p-3 sm:p-4">
      <figcaption className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <span className="text-xs font-semibold text-foreground">
          Динамика по количеству заявок
        </span>
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
          <LegendDot className="bg-[color:var(--positive)]" label="пик" />
          <LegendDot className="bg-[color:var(--negative)]" label="минимум" />
          <LegendDot className="bg-transparent ring-1 ring-inset ring-muted-foreground" label="в процессе" />
        </span>
      </figcaption>

      <div className="h-40 w-full sm:h-44">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 22, right: 14, bottom: 4, left: 14 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={PRIMARY} stopOpacity={0.28} />
                <stop offset="100%" stopColor={PRIMARY} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.5} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              interval={0}
              tick={{ fontSize: 11, fill: MUTED }}
              tickMargin={8}
              height={20}
            />
            <YAxis hide domain={[0, maxCount * 1.18]} />
            <Tooltip
              cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
              content={<ChartTooltip unitLabel={unitLabel} />}
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke={PRIMARY}
              strokeWidth={2.4}
              fill={`url(#${gradientId})`}
              dot={<TrendDot />}
              activeDot={{ r: 5, fill: PRIMARY, stroke: "var(--background)", strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </figure>
  )
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={cn("inline-block size-2 rounded-full", className)} />
      {label}
    </span>
  )
}

/* Кастомная точка: пик/минимум — цветные с подписью значения. */
function TrendDot(props: {
  cx?: number
  cy?: number
  payload?: { role?: string; count?: number }
}) {
  const { cx, cy, payload } = props
  if (cx == null || cy == null || !payload) return <g />
  const role = payload.role
  const count = payload.count ?? 0

  if (role === "peak" || role === "trough") {
    const color = role === "peak" ? POSITIVE : NEGATIVE
    return (
      <g>
        <circle cx={cx} cy={cy} r={5.5} fill={color} stroke="var(--background)" strokeWidth={2} />
        <text
          x={cx}
          y={cy - 12}
          textAnchor="middle"
          fontSize={11}
          fontWeight={700}
          fill={color}
        >
          {fmtNum(count)}
        </text>
      </g>
    )
  }
  if (role === "current") {
    return (
      <circle
        cx={cx}
        cy={cy}
        r={4.5}
        fill="var(--background)"
        stroke={MUTED}
        strokeWidth={2}
        strokeDasharray="2 2"
      />
    )
  }
  return <circle cx={cx} cy={cy} r={3} fill={PRIMARY} />
}

/* Кастомная подсказка графика. */
function ChartTooltip({
  active,
  payload,
  unitLabel,
}: {
  active?: boolean
  payload?: Array<{ payload: TrendPoint & { role?: string } }>
  unitLabel?: string
}) {
  if (!active || !payload || payload.length === 0) return null
  const p = payload[0].payload
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-md">
      <div className="text-xs font-semibold text-foreground">
        {p.label}
        {p.current ? (
          <span className="ml-1 text-[10px] font-normal text-muted-foreground">· в процессе</span>
        ) : null}
      </div>
      <div className="mt-0.5 text-[13px] font-bold tabular-nums text-foreground">
        {fmtNum(p.count)} {unitLabel}
      </div>
      <div className="text-[11px] tabular-nums text-muted-foreground">{fmtMoney(p.sum)}</div>
    </div>
  )
}
