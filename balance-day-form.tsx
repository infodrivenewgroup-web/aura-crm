'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NumberInput } from '@/components/crm/number-input'
import { useStore, uid } from '@/hooks/use-store'
import {
  computeDay,
  BASE_REQUEST_PRICE,
  PAID_UNREALIZED_PRICE,
  COMMISSION_RATE,
  ROP_PER_REQUEST,
  ROP_OTHER_INCOME_RATE,
} from '@/lib/calc'
import { fmtDate, fmtMoney, fmtNum, fmtWeekday } from '@/lib/format'
import { AD_CAMPAIGNS } from '@/lib/types'
import { useDayOrders } from '@/hooks/use-day-orders'
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Check,
  DownloadCloud,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Trash2,
  TrendingUp,
} from 'lucide-react'

export function BalanceDayForm({
  date,
  onSaved,
  onDeleted,
}: {
  date: string
  onSaved?: () => void
  onDeleted?: () => void
}) {
  const { getDay, updateDayInput, submitDay, resetDay, deleteDay } = useStore()
  const record = getDay(date)
  const [justSaved, setJustSaved] = useState(false)

  // Живая синхронизация оплаченных заявок за этот день из проекта касс.
  const { day: syncedDay, isLoading: syncLoading, isError: syncError, refresh } =
    useDayOrders(date)

  const computed = useMemo(
    () => (record ? computeDay(record) : null),
    [record],
  )

  if (!record || !computed) return null
  const input = record.input

  const profitTone =
    computed.netProfit > 0
      ? 'text-[color:var(--positive)]'
      : computed.netProfit < 0
        ? 'text-[color:var(--negative)]'
        : 'text-foreground'

  function save() {
    submitDay(date)
    setJustSaved(true)
    // Закрываем окно ввода после короткого подтверждения «Сохранено».
    setTimeout(() => {
      setJustSaved(false)
      onSaved?.()
    }, 700)
  }

  function removeDay() {
    deleteDay(date)
    onDeleted?.()
  }

  return (
    <div>
      {/* заголовок дня */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold">{fmtDate(date)}</h2>
            <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {fmtWeekday(date)}
            </span>
            {record.submitted ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-[color:var(--positive)]/15 px-2 py-0.5 text-xs text-[color:var(--positive)]">
                <Check className="size-3" /> данные загружены
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-md bg-[color:var(--warning)]/15 px-2 py-0.5 text-xs text-[color:var(--warning)]">
                новый день
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Заполните поля за рабочий день и нажмите «Загрузить данные».
          </p>
        </div>
        <div className="flex items-center gap-2">
          {record.submitted ? (
            <Button
              variant="outline"
              size="sm"
              onClick={removeDay}
              className="text-[color:var(--negative)]"
            >
              <Trash2 className="size-3.5" /> Удалить день
            </Button>
          ) : null}
          <Button variant="outline" size="sm" onClick={() => resetDay(date)}>
            <RotateCcw className="size-3.5" /> Очистить
          </Button>
          <Button size="sm" onClick={save}>
            {justSaved ? <Check className="size-4" /> : <Save className="size-4" />}
            {justSaved ? 'Сохранено' : 'Загрузить данные'}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 pt-4 lg:grid-cols-2">
        {/* ПРИХОД */}
        <section className="rounded-xl border border-[color:var(--income)]/30 bg-[color:var(--income)]/5">
          <header className="flex items-center gap-2 border-b border-[color:var(--income)]/20 px-4 py-3">
            <ArrowUpCircle className="size-4 text-[color:var(--income)]" />
            <h3 className="text-sm font-semibold uppercase tracking-wide text-[color:var(--income)]">
              Приход
            </h3>
          </header>
          <div className="space-y-3 p-4">
            <SyncedIncomePanel
              loading={syncLoading}
              error={syncError}
              plategaCount={syncedDay?.plategaCount ?? 0}
              kasseraCount={syncedDay?.kasseraCount ?? 0}
              totalCount={syncedDay?.totalCount ?? 0}
              onRefresh={() => refresh()}
              onApply={() =>
                updateDayInput(date, {
                  baseRequestsCount: syncedDay?.totalCount ?? 0,
                })
              }
            />
            <Field
              label="Количество базовых заявок"
              hint="вводите вручную — шт."
              required
            >
              <NumberInput
                integer
                value={input.baseRequestsCount}
                onChange={(n) => updateDayInput(date, { baseRequestsCount: n })}
                aria-label="Количество базовых заявок"
              />
            </Field>
            <Computed
              label={`Сумма по заявкам (× ${fmtNum(BASE_REQUEST_PRICE)} ₽)`}
              value={fmtMoney(computed.baseRequestsSum)}
            />
            <Field label="Иные поступления" hint="вручную — не проходят по кассе" required>
              <NumberInput
                value={input.otherIncome}
                onChange={(n) => updateDayInput(date, { otherIncome: n })}
                aria-label="Иные поступления"
              />
            </Field>
            <Field
              label="Опл. нереал, шт."
              hint="кол-во заявок — сумму считает система"
              required
            >
              <NumberInput
                integer
                value={input.paidUnrealizedCount}
                onChange={(n) => updateDayInput(date, { paidUnrealizedCount: n })}
                aria-label="Количество оплаченных нереализованных заявок"
              />
            </Field>
            <Computed
              label={`Сумма опл. нереал (× ${fmtNum(PAID_UNREALIZED_PRICE)} ₽)`}
              value={fmtMoney(computed.paidUnrealizedSum)}
            />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Возвраты, шт." hint="вручную" required>
                <NumberInput
                  integer
                  value={input.refundsCount}
                  onChange={(n) => updateDayInput(date, { refundsCount: n })}
                  aria-label="Количество возвратов"
                />
              </Field>
              <Field label="Сумма возвратов" hint="вручную" required>
                <NumberInput
                  value={input.refundsSum}
                  onChange={(n) => updateDayInput(date, { refundsSum: n })}
                  aria-label="Сумма возвратов"
                />
              </Field>
            </div>
            <Computed
              label="Итоговая сумма прихода"
              value={fmtMoney(computed.totalIncome)}
              strong
              hint="(заявки + иные поступления + опл. нереал) − возвраты"
            />
          </div>
        </section>

        {/* РАСХОД */}
        <section className="rounded-xl border border-[color:var(--expense)]/30 bg-[color:var(--expense)]/5">
          <header className="flex items-center gap-2 border-b border-[color:var(--expense)]/20 px-4 py-3">
            <ArrowDownCircle className="size-4 text-[color:var(--expense)]" />
            <h3 className="text-sm font-semibold uppercase tracking-wide text-[color:var(--expense)]">
              Расход
            </h3>
          </header>
          <div className="space-y-3 p-4">
            <Computed
              label={`Комиссия кассы (${Math.round(COMMISSION_RATE * 100)}% от суммы заявок)`}
              value={fmtMoney(computed.cashCommission)}
            />

            <div className="rounded-lg border border-border bg-background/40 p-3">
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                Рекламные компании «Яндекс Директ» (вручную)
              </p>
              <div className="space-y-2">
                {AD_CAMPAIGNS.map((c) => (
                  <div key={c.key} className="grid grid-cols-[1fr_130px] items-center gap-2">
                    <label className="truncate text-sm" htmlFor={`ad-${c.key}`}>
                      <span className="text-muted-foreground">№{c.index}</span>{' '}
                      {c.label}
                    </label>
                    <NumberInput
                      id={`ad-${c.key}`}
                      value={input.ads[c.key]}
                      onChange={(n) =>
                        updateDayInput(date, {
                          ads: { ...input.ads, [c.key]: n },
                        })
                      }
                      aria-label={`Расходы на рекламу ${c.label}`}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-2 flex items-center justify-between border-t border-border pt-2 text-sm">
                <span className="text-muted-foreground">Итого по рекламе</span>
                <span className="font-semibold tabular-nums">
                  {fmtMoney(computed.adsTotal)}
                </span>
              </div>
            </div>

            <Field label="Зарплата сотрудников" hint="вручную" required>
              <NumberInput
                value={input.salaries}
                onChange={(n) => updateDayInput(date, { salaries: n })}
                aria-label="Зарплата сотрудников"
              />
            </Field>

            <Computed
              label="ЗП РОП"
              value={fmtMoney(computed.ropSalary)}
              hint={`${fmtNum(ROP_PER_REQUEST)} ₽ × (заявки − возвраты) + ${fmtNum(
                ROP_PER_REQUEST,
              )} ₽ × опл. нереал + ${Math.round(
                ROP_OTHER_INCOME_RATE * 100,
              )}% от иных поступлений`}
            />

            {/* Прочие расходы */}
            <div className="rounded-lg border border-border bg-background/40 p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">
                  Прочие расходы (сумма + пояснение)
                </p>
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() =>
                    updateDayInput(date, {
                      otherExpenses: [
                        ...input.otherExpenses,
                        { id: uid(), amount: 0, note: '' },
                      ],
                    })
                  }
                >
                  <Plus className="size-3" /> добавить
                </Button>
              </div>
              {input.otherExpenses.length === 0 ? (
                <p className="py-1 text-center text-xs text-muted-foreground/70">
                  Нет прочих расходов
                </p>
              ) : (
                <div className="space-y-2">
                  {input.otherExpenses.map((e) => (
                    <div key={e.id} className="grid grid-cols-[1fr_120px_auto] items-center gap-2">
                      <Input
                        value={e.note}
                        placeholder="на что потрачено"
                        onChange={(ev) =>
                          updateDayInput(date, {
                            otherExpenses: input.otherExpenses.map((x) =>
                              x.id === e.id ? { ...x, note: ev.target.value } : x,
                            ),
                          })
                        }
                      />
                      <NumberInput
                        value={e.amount}
                        onChange={(n) =>
                          updateDayInput(date, {
                            otherExpenses: input.otherExpenses.map((x) =>
                              x.id === e.id ? { ...x, amount: n } : x,
                            ),
                          })
                        }
                        aria-label="Сумма прочего расхода"
                      />
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Удалить расход"
                        onClick={() =>
                          updateDayInput(date, {
                            otherExpenses: input.otherExpenses.filter(
                              (x) => x.id !== e.id,
                            ),
                          })
                        }
                      >
                        <Trash2 className="size-3.5 text-[color:var(--negative)]" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-2 flex items-center justify-between border-t border-border pt-2 text-sm">
                <span className="text-muted-foreground">Итого прочие</span>
                <span className="font-semibold tabular-nums">
                  {fmtMoney(computed.otherExpensesTotal)}
                </span>
              </div>
            </div>

            <Computed
              label="Итого расходов"
              value={fmtMoney(computed.totalExpenses)}
              strong
              hint="комиссия + реклама + зарплата + ЗП РОП + прочие"
            />
          </div>
        </section>
      </div>

      {/* Результат дня */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-background/30 p-4 sm:p-5">
        <div className="flex items-center gap-2">
          <TrendingUp className={`size-5 ${profitTone}`} />
          <span className="text-sm text-muted-foreground">
            Чистая прибыль за день:
          </span>
        </div>
        <div className="flex items-baseline gap-3">
          <span className="text-xs text-muted-foreground">
            рентабельность {fmtNum(computed.margin)}%
          </span>
          <span className={`text-2xl font-bold tabular-nums ${profitTone}`}>
            {fmtMoney(computed.netProfit)}
          </span>
        </div>
      </div>
    </div>
  )
}

/**
 * Read-only панель «Принято заявок (синхронизация)».
 * Показывает живые данные оплаченных заявок за день из проекта касс с
 * расшифровкой Платега / Кашера и позволяет ОДНОЙ КНОПКОЙ подставить общее
 * количество в поле «Количество базовых заявок». Ручной ввод не затрагивается,
 * пока пользователь сам не нажмёт «Подставить».
 */
function SyncedIncomePanel({
  loading,
  error,
  plategaCount,
  kasseraCount,
  totalCount,
  onRefresh,
  onApply,
}: {
  loading: boolean
  error: boolean
  plategaCount: number
  kasseraCount: number
  totalCount: number
  onRefresh: () => void
  onApply: () => void
}) {
  return (
    <div className="rounded-lg border border-[color:var(--income)]/30 bg-background/50 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <DownloadCloud className="size-3.5 text-[color:var(--income)]" />
          <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--income)]">
            Принято заявок «оплачено» (синхронизация)
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Обновить данные синхронизации"
        >
          <RefreshCw className={`size-3 ${loading ? 'animate-spin' : ''}`} />
          обновить
        </button>
      </div>

      {error ? (
        <p className="py-1 text-xs text-[color:var(--warning)]">
          Нет связи с источником заявок. Ручной ввод по-прежнему доступен.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2">
            <SyncStat label="Платега" value={plategaCount} />
            <SyncStat label="Кашера" value={kasseraCount} />
            <SyncStat label="Всего" value={totalCount} strong />
          </div>
          <div className="mt-2 flex items-center justify-between gap-2 border-t border-border pt-2">
            <span className="text-[11px] text-muted-foreground">
              Итог принятых заявок за день из касс
            </span>
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={onApply}
              disabled={totalCount === 0}
            >
              <DownloadCloud className="size-3" /> Подставить ({fmtNum(totalCount)})
            </Button>
          </div>
        </>
      )}
    </div>
  )
}

function SyncStat({
  label,
  value,
  strong,
}: {
  label: string
  value: number
  strong?: boolean
}) {
  return (
    <div className="rounded-md border border-border bg-card px-2 py-1.5 text-center">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div
        className={`tabular-nums ${strong ? 'text-base font-bold text-[color:var(--income)]' : 'text-sm font-semibold text-foreground'}`}
      >
        {fmtNum(value)}
      </div>
    </div>
  )
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string
  hint?: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <label className="text-sm font-medium text-foreground/90">
          {label}
          {required ? (
            <span className="ml-1 text-[color:var(--warning)]" title="заполняется вручную">
              ●
            </span>
          ) : null}
        </label>
        {hint ? (
          <span className="text-[11px] text-muted-foreground/70">{hint}</span>
        ) : null}
      </div>
      {children}
    </div>
  )
}

function Computed({
  label,
  value,
  hint,
  strong,
}: {
  label: string
  value: string
  hint?: string
  strong?: boolean
}) {
  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-lg border border-dashed border-border px-3 py-2 ${
        strong ? 'bg-muted/50' : 'bg-transparent'
      }`}
    >
      <div className="min-w-0">
        <p className={`truncate text-sm ${strong ? 'font-medium' : 'text-muted-foreground'}`}>
          {label}
        </p>
        {hint ? (
          <p className="text-[11px] text-muted-foreground/60">{hint}</p>
        ) : null}
      </div>
      <span
        className={`shrink-0 tabular-nums ${strong ? 'text-base font-bold' : 'text-sm font-semibold'}`}
      >
        {value}
      </span>
    </div>
  )
}
