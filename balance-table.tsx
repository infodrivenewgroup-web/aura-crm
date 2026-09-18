'use client'

import { useMemo } from 'react'
import { useComputedDays } from '@/hooks/use-store'
import { sumPeriod } from '@/lib/calc'
import type { DayComputed, PeriodTotals } from '@/lib/types'
import { fmtDate, fmtMoney, fmtNum, weekStart, weekLabel } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Pencil, Trash2 } from 'lucide-react'

type Row =
  | { kind: 'day'; day: DayComputed }
  | { kind: 'week'; label: string; totals: PeriodTotals }

/**
 * Журнал строится только из дней и недельных итогов.
 * Месячные итоги (по требованию) НЕ отображаются вовсе.
 */
function buildRows(days: DayComputed[]): Row[] {
  const rows: Row[] = []
  const weeks = new Map<string, DayComputed[]>()
  for (const d of days) {
    const wk = weekStart(d.date)
    if (!weeks.has(wk)) weeks.set(wk, [])
    weeks.get(wk)!.push(d)
  }
  for (const wk of [...weeks.keys()].sort()) {
    const wdays = weeks.get(wk)!.sort((a, b) => (a.date < b.date ? -1 : 1))
    for (const d of wdays) rows.push({ kind: 'day', day: d })
    const submitted = wdays.filter((d) => d.submitted)
    if (submitted.length > 0) {
      rows.push({
        kind: 'week',
        label: `Итог за неделю · ${weekLabel(wk)}`,
        totals: sumPeriod(submitted),
      })
    }
  }
  return rows
}

// Базовая числовая ячейка: светлый фон, чёрный текст, без переноса.
const NUM = 'px-2 py-1.5 text-right tabular-nums whitespace-nowrap text-[var(--sheet-fg)]'
// Подсветки колонок по группам (светлые профессиональные оттенки).
const INCOME = 'bg-[var(--sheet-income)]'
const EXPENSE = 'bg-[var(--sheet-expense)]'
const INCOME_STRONG = 'bg-[var(--sheet-income-strong)] font-semibold'
const EXPENSE_STRONG = 'bg-[var(--sheet-expense-strong)] font-semibold'
const PROFIT = 'bg-[var(--sheet-profit)]'
const PROFIT_STRONG = 'bg-[var(--sheet-profit-strong)] font-bold'

// Цвета прибыли с достаточным контрастом на СВЕТЛОМ фоне.
const PROFIT_POS = 'text-[oklch(0.46_0.16_150)]'
const PROFIT_NEG = 'text-[oklch(0.5_0.22_25)]'

function profitToneLight(v: number): string {
  if (v > 0) return PROFIT_POS
  if (v < 0) return PROFIT_NEG
  return 'text-[var(--sheet-fg)]'
}

function refundCell(count: number, sum: number): string {
  if (count === 0 && sum === 0) return '0 шт'
  return `${fmtNum(count)} шт · ${fmtMoney(sum)}`
}

// «Опл. нереал»: количество заявок и автоматически рассчитанная общая сумма.
function paidUnrealizedCell(count: number, sum: number): string {
  if (count === 0 && sum === 0) return '0 шт'
  return `${fmtNum(count)} шт · ${fmtMoney(sum)}`
}

export function BalanceTable({
  selectedDate,
  onSelectDay,
  onDeleteDay,
}: {
  selectedDate: string
  onSelectDay: (date: string) => void
  onDeleteDay: (date: string) => void
}) {
  const computed = useComputedDays()
  const rows = useMemo(() => buildRows(computed), [computed])

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-[var(--sheet)]">
      {/* На больших экранах таблица занимает всю ширину и помещается без
          горизонтальной прокрутки; на телефоне/планшете включается прокрутка. */}
      <div className="thin-scroll overflow-x-auto">
        <table className="w-full min-w-[1024px] border-collapse text-[11px] lg:min-w-0 xl:text-[12px]">
          <thead>
            {/* Группирующая строка: Приход / Расход / Прибыль — насыщенные цвета */}
            <tr className="text-[10px] font-bold uppercase tracking-wide xl:text-[11px]">
              <th className="sticky left-0 z-10 bg-[var(--sheet-head)] px-2 py-2" />
              <th
                colSpan={5}
                className="border-x border-[var(--sheet-line)] bg-[color:var(--income)] px-2 py-2 text-center text-[color:var(--income-foreground)]"
              >
                Приход
              </th>
              <th
                colSpan={7}
                className="border-r border-[var(--sheet-line)] bg-[color:var(--expense)] px-2 py-2 text-center text-[color:var(--expense-foreground)]"
              >
                Расход
              </th>
              <th
                colSpan={2}
                className="bg-[color:var(--profit)] px-2 py-2 text-center text-[oklch(0.2_0.03_160)]"
              >
                Прибыль
              </th>
            </tr>
            {/* Названия колонок — без сокращений, перенос разрешён */}
            <tr className="bg-[var(--sheet-head)] align-bottom text-[10px] font-semibold leading-tight text-[var(--sheet-fg)] xl:text-[11px]">
              <th className="sticky left-0 z-10 bg-[var(--sheet-head)] px-2 py-2 text-left">
                Дата
              </th>
              {/* Приход */}
              <th className={cn(NUM, 'whitespace-normal', INCOME)}>Количество заявок</th>
              <th className={cn(NUM, 'whitespace-normal', INCOME)}>Сумма поступлений</th>
              <th className={cn(NUM, 'whitespace-normal', INCOME)}>Иные поступления</th>
              <th className={cn(NUM, 'whitespace-normal', INCOME)}>Опл. нереал (шт / сумма)</th>
              <th className={cn(NUM, 'whitespace-normal', INCOME_STRONG)}>Итог прихода</th>
              {/* Расход */}
              <th className={cn(NUM, 'whitespace-normal', EXPENSE)}>Возвраты (шт / сумма)</th>
              <th className={cn(NUM, 'whitespace-normal', EXPENSE)}>Комиссия кассы 14%</th>
              <th className={cn(NUM, 'whitespace-normal', EXPENSE)}>Реклама</th>
              <th className={cn(NUM, 'whitespace-normal', EXPENSE)}>Зарплата</th>
              <th className={cn(NUM, 'whitespace-normal', EXPENSE)}>ЗП РОП</th>
              <th className={cn(NUM, 'whitespace-normal', EXPENSE)}>Прочие расходы</th>
              <th className={cn(NUM, 'whitespace-normal', EXPENSE_STRONG)}>Итог расхода</th>
              {/* Прибыль */}
              <th className={cn(NUM, 'whitespace-normal', PROFIT_STRONG)}>Чистая прибыль</th>
              <th className={cn(NUM, 'whitespace-normal', PROFIT)}>Рентабельность %</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => {
              if (row.kind === 'day') {
                const d = row.day
                const active = d.date === selectedDate
                return (
                  <tr
                    key={d.date}
                    onClick={() => onSelectDay(d.date)}
                    title="Нажмите, чтобы отредактировать день"
                    className={cn(
                      'group cursor-pointer border-b border-[var(--sheet-line)] transition-colors hover:bg-[oklch(0.95_0.01_255)]',
                      active && 'ring-2 ring-inset ring-[color:var(--primary)]/50',
                      !d.submitted && 'opacity-70',
                    )}
                  >
                    <td
                      className={cn(
                        'sticky left-0 z-10 bg-[var(--sheet)] px-2 py-1.5 text-left font-medium text-[var(--sheet-fg)]',
                      )}
                    >
                      <div className="flex items-center gap-1.5 whitespace-nowrap">
                        <span
                          className={cn(
                            'inline-block size-1.5 shrink-0 rounded-full',
                            d.submitted
                              ? 'bg-[color:var(--positive)]'
                              : 'bg-[color:var(--warning)]',
                          )}
                        />
                        {fmtDate(d.date)}
                        <span className="ml-auto flex items-center gap-1 pl-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                          <Pencil className="size-3 text-[var(--sheet-muted)]" aria-hidden />
                          <button
                            type="button"
                            aria-label={`Удалить день ${fmtDate(d.date)}`}
                            onClick={(e) => {
                              e.stopPropagation()
                              onDeleteDay(d.date)
                            }}
                            className="text-[var(--sheet-muted)] hover:text-[color:var(--negative)]"
                          >
                            <Trash2 className="size-3" />
                          </button>
                        </span>
                      </div>
                    </td>
                    {/* Приход */}
                    <td className={cn(NUM, INCOME)}>{d.submitted ? fmtNum(d.baseRequestsCount) : '—'}</td>
                    <td className={cn(NUM, INCOME)}>{d.submitted ? fmtMoney(d.baseRequestsSum) : '—'}</td>
                    <td className={cn(NUM, INCOME)}>{d.submitted ? fmtMoney(d.otherIncome) : '—'}</td>
                    <td className={cn(NUM, INCOME, 'whitespace-normal')}>{d.submitted ? paidUnrealizedCell(d.paidUnrealizedCount, d.paidUnrealizedSum) : '—'}</td>
                    <td className={cn(NUM, INCOME_STRONG, 'text-[oklch(0.4_0.14_255)]')}>
                      {d.submitted ? fmtMoney(d.totalIncome) : '—'}
                    </td>
                    {/* Расход */}
                    <td className={cn(NUM, EXPENSE, 'whitespace-normal')}>{d.submitted ? refundCell(d.refundsCount, d.refundsSum) : '—'}</td>
                    <td className={cn(NUM, EXPENSE)}>{d.submitted ? fmtMoney(d.cashCommission) : '—'}</td>
                    <td className={cn(NUM, EXPENSE)}>{d.submitted ? fmtMoney(d.adsTotal) : '—'}</td>
                    <td className={cn(NUM, EXPENSE)}>{d.submitted ? fmtMoney(d.salaries) : '—'}</td>
                    <td className={cn(NUM, EXPENSE)}>{d.submitted ? fmtMoney(d.ropSalary) : '—'}</td>
                    <td className={cn(NUM, EXPENSE)}>{d.submitted ? fmtMoney(d.otherExpensesTotal) : '—'}</td>
                    <td className={cn(NUM, EXPENSE_STRONG, 'text-[oklch(0.45_0.2_25)]')}>
                      {d.submitted ? fmtMoney(d.totalExpenses) : '—'}
                    </td>
                    {/* Прибыль */}
                    <td className={cn(NUM, PROFIT_STRONG, profitToneLight(d.netProfit))}>
                      {d.submitted ? fmtMoney(d.netProfit) : '—'}
                    </td>
                    <td className={cn(NUM, PROFIT)}>{d.submitted ? `${fmtNum(d.margin)}%` : '—'}</td>
                  </tr>
                )
              }

              // Недельный итог — мельче и другим цветом, с отступом сверху.
              const t = row.totals
              return (
                <tr
                  key={`week-${idx}`}
                  className="border-b border-t-2 border-t-[color:var(--accent)]/60 bg-[oklch(0.93_0.03_255)] text-[9px] font-semibold italic text-[oklch(0.36_0.1_255)] xl:text-[10px]"
                >
                  <td className="sticky left-0 z-10 bg-[oklch(0.93_0.03_255)] px-2 py-1.5 text-left not-italic">
                    {row.label}
                  </td>
                  <td className={cn(NUM, 'text-[oklch(0.36_0.1_255)]')}>{fmtNum(t.baseRequestsCount)}</td>
                  <td className={cn(NUM, 'text-[oklch(0.36_0.1_255)]')}>{fmtMoney(t.baseRequestsSum)}</td>
                  <td className={cn(NUM, 'text-[oklch(0.36_0.1_255)]')}>{fmtMoney(t.otherIncome)}</td>
                  <td className={cn(NUM, 'whitespace-normal text-[oklch(0.36_0.1_255)]')}>{paidUnrealizedCell(t.paidUnrealizedCount, t.paidUnrealizedSum)}</td>
                  <td className={cn(NUM, 'text-[oklch(0.36_0.1_255)]')}>{fmtMoney(t.totalIncome)}</td>
                  <td className={cn(NUM, 'whitespace-normal text-[oklch(0.36_0.1_255)]')}>{refundCell(t.refundsCount, t.refundsSum)}</td>
                  <td className={cn(NUM, 'text-[oklch(0.36_0.1_255)]')}>{fmtMoney(t.cashCommission)}</td>
                  <td className={cn(NUM, 'text-[oklch(0.36_0.1_255)]')}>{fmtMoney(t.adsTotal)}</td>
                  <td className={cn(NUM, 'text-[oklch(0.36_0.1_255)]')}>{fmtMoney(t.salaries)}</td>
                  <td className={cn(NUM, 'text-[oklch(0.36_0.1_255)]')}>{fmtMoney(t.ropSalary)}</td>
                  <td className={cn(NUM, 'text-[oklch(0.36_0.1_255)]')}>{fmtMoney(t.otherExpensesTotal)}</td>
                  <td className={cn(NUM, 'text-[oklch(0.36_0.1_255)]')}>{fmtMoney(t.totalExpenses)}</td>
                  <td className={cn(NUM, profitToneLight(t.netProfit))}>{fmtMoney(t.netProfit)}</td>
                  <td className={cn(NUM, 'text-[oklch(0.36_0.1_255)]')}>{fmtNum(t.margin)}%</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
