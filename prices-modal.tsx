'use client'

import { useEffect } from 'react'
import { X, Wallet } from 'lucide-react'
import { usd } from '@/lib/search/format'
import type { BalanceData } from './use-search'

/** Модальное окно с балансом и таблицей цен по всем типам. */
export function PricesModal({
  balance,
  catalogTitles,
  onClose,
}: {
  balance: BalanceData | null
  catalogTitles: Record<string, string>
  onClose: () => void
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const prices = balance?.prices ?? null
  const standart = prices?.standart as number | undefined
  const telegram = prices?.telegram as number | undefined
  const innEmail = prices?.inn_email as
    | { price: number | null; available: boolean }
    | undefined
  const byType =
    (prices?.extended_search as { byType?: Record<string, number> } | undefined)
      ?.byType ?? {}

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Баланс и цены"
    >
      <div
        className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-indigo-500/30 bg-slate-950 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 p-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
            <Wallet className="size-5 text-indigo-400" /> Баланс и цены
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть"
            className="rounded-md p-1 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-4">
          <div className="mb-4 rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-4">
            <div className="text-xs text-indigo-300/80">Текущий баланс</div>
            <div className="mt-1 text-3xl font-bold text-white">
              {usd(balance?.balance ?? 0)}
            </div>
          </div>

          <h3 className="mb-2 text-sm font-semibold text-indigo-200">
            Базовые методы
          </h3>
          <div className="mb-4 flex flex-col gap-1 text-sm">
            <PriceRow label="Стандартный поиск" value={usd(standart)} />
            <PriceRow label="Telegram-поиск" value={usd(telegram)} />
            <PriceRow
              label="Почта по ИНН"
              value={
                innEmail?.available ? usd(innEmail.price) : 'Недоступно'
              }
            />
          </div>

          {Object.keys(byType).length > 0 && (
            <>
              <h3 className="mb-2 text-sm font-semibold text-indigo-200">
                Расширенный поиск ({Object.keys(byType).length} типов)
              </h3>
              <div className="flex flex-col gap-1 text-sm">
                {Object.entries(byType).map(([code, price]) => (
                  <PriceRow
                    key={code}
                    label={catalogTitles[code] ?? code}
                    value={usd(price)}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function PriceRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 odd:bg-white/[0.03]">
      <span className="text-slate-300">{label}</span>
      <span className="font-semibold text-white">{value}</span>
    </div>
  )
}
