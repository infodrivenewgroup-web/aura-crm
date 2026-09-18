'use client'

import { useMemo, useState } from 'react'
import { useStore, useComputedDays } from '@/hooks/use-store'
import { BalanceDayForm } from '@/components/crm/balance-day-form'
import { BalanceTable } from '@/components/crm/balance-table'
import { Modal } from '@/components/crm/modal'
import { MoscowClock } from '@/components/crm/moscow-clock'
import { InstructionsDialog } from '@/components/crm/instructions-dialog'
import { PeriodSelector } from '@/components/crm/period-selector'
import { Button } from '@/components/ui/button'
import { sumPeriod } from '@/lib/calc'
import { fmtMoney, fmtNum, fmtDate } from '@/lib/format'
import {
  type PeriodPreset,
  type PeriodRange,
  resolveRange,
  rangeLabel,
  filterRange,
  lastDayRange,
} from '@/lib/period'
import {
  ArrowDownCircle,
  ArrowUpCircle,
  BookOpen,
  CalendarRange,
  FilePlus2,
  TrendingUp,
  Wallet,
} from 'lucide-react'

export function BalanceTab() {
  const { days, deleteDay } = useStore()
  const computed = useComputedDays()

  const [preset, setPreset] = useState<PeriodPreset>('week')
  const [customRange, setCustomRange] = useState<PeriodRange>(() =>
    lastDayRange(computed),
  )
  const range = useMemo(
    () => resolveRange(preset, computed, customRange),
    [preset, computed, customRange],
  )

  // Итоги по выбранному периоду (по умолчанию — текущая неделя Пн–Вс).
  const totals = useMemo(
    () => sumPeriod(filterRange(computed, range)),
    [computed, range],
  )

  // День для формы: первый незаполненный, иначе последний день в журнале.
  const nextToFill = useMemo(() => {
    const pending = days.find((d) => !d.submitted)
    if (pending) return pending.date
    return days.length ? days[days.length - 1].date : ''
  }, [days])

  const [modalOpen, setModalOpen] = useState(false)
  const [modalDate, setModalDate] = useState('')
  const [instructionsOpen, setInstructionsOpen] = useState(false)

  function openForm(date: string) {
    if (!date) return
    setModalDate(date)
    setModalOpen(true)
  }

  function handleDelete(date: string) {
    if (
      typeof window !== 'undefined' &&
      window.confirm(`Удалить данные за ${fmtDate(date)}? День можно будет заполнить заново.`)
    ) {
      deleteDay(date)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Шапка вкладки: заголовок + живые часы по Москве */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
            <Wallet className="size-5 text-primary" />
            Баланс
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Ежедневный учёт прихода, расхода и чистой прибыли. Расчёты выполняются автоматически.
          </p>
        </div>
        <MoscowClock />
      </div>

      {/* Панель действий */}
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={() => openForm(nextToFill)}>
          <FilePlus2 className="size-4" /> Заполнить данные
        </Button>
        <Button variant="outline" onClick={() => setInstructionsOpen(true)}>
          <BookOpen className="size-4" /> Инструкция
        </Button>
        <div className="ml-auto">
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
      </div>

      {/* Подпись актуального периода над общей информацией */}
      <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5">
        <CalendarRange className="size-4 text-[color:var(--accent)]" />
        <span className="text-sm font-medium text-foreground">
          Показатели за период:
        </span>
        <span className="text-sm font-semibold text-[color:var(--accent)]">
          {rangeLabel(preset, range)}
        </span>
        <span className="ml-auto text-xs text-muted-foreground">
          заполнено дней: {fmtNum(totals.daysCount)}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryCard
          icon={<ArrowUpCircle className="size-4 text-[color:var(--income)]" />}
          label="Итог прихода"
          value={fmtMoney(totals.totalIncome)}
          tone="text-[color:var(--income)]"
        />
        <SummaryCard
          icon={<ArrowDownCircle className="size-4 text-[color:var(--expense)]" />}
          label="Итог расходов"
          value={fmtMoney(totals.totalExpenses)}
          tone="text-[color:var(--expense)]"
        />
        <SummaryCard
          icon={<TrendingUp className="size-4 text-[color:var(--profit)]" />}
          label="Чистая прибыль"
          value={fmtMoney(totals.netProfit)}
          tone={
            totals.netProfit >= 0
              ? 'text-[color:var(--positive)]'
              : 'text-[color:var(--negative)]'
          }
        />
        <SummaryCard
          icon={<span className="text-xs text-muted-foreground">%</span>}
          label="Рентабельность"
          value={`${fmtNum(totals.margin)}%`}
          tone="text-foreground"
        />
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Журнал по дням, неделям и месяцам
        </h3>
        <BalanceTable
          selectedDate={modalDate}
          onSelectDay={openForm}
          onDeleteDay={handleDelete}
        />
        <p className="mt-2 text-xs text-muted-foreground">
          Нажмите на строку дня, чтобы отредактировать данные, или на значок корзины — чтобы удалить день.
        </p>
      </div>

      {/* Модальное окно ввода/редактирования дня */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        size="xl"
        title="Данные за день"
        description="Введите исходные значения — итоги рассчитаются автоматически."
      >
        {modalDate ? (
          <BalanceDayForm
            date={modalDate}
            onSaved={() => setModalOpen(false)}
            onDeleted={() => setModalOpen(false)}
          />
        ) : null}
      </Modal>

      <InstructionsDialog
        open={instructionsOpen}
        onClose={() => setInstructionsOpen(false)}
      />
    </div>
  )
}

function SummaryCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode
  label: string
  value: string
  tone: string
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <div className={`mt-2 text-lg font-bold tabular-nums sm:text-xl ${tone}`}>{value}</div>
    </div>
  )
}
