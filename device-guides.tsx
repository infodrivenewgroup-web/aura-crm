'use client'

import { AppWindow, KeyRound } from 'lucide-react'
import { deviceGuides, VPN_CONFIG } from '@/data/vpn-guides'
import { cn } from '@/lib/utils'
import { CopyButton } from './copy-button'

/**
 * Вкладки с инструкциями по подключению для каждого типа устройства.
 * Модель Firezone Cloud: установить приложение Firezone Client и войти по
 * слагу аккаунта + одноразовому email-коду. Никаких .conf или QR.
 * Активная вкладка управляется извне, чтобы навигатор мог открыть нужную.
 */
export function DeviceGuides({
  active,
  onActiveChange,
}: {
  active: string
  onActiveChange: (id: string) => void
}) {
  const guide = deviceGuides.find((g) => g.id === active) ?? deviceGuides[0]

  return (
    <div>
      {/* Выбор устройства */}
      <div
        role="tablist"
        aria-label="Тип устройства"
        className="thin-scroll flex gap-2 overflow-x-auto pb-1"
      >
        {deviceGuides.map((g) => {
          const Icon = g.icon
          const isActive = g.id === guide.id
          return (
            <button
              key={g.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onActiveChange(g.id)}
              className={cn(
                'inline-flex shrink-0 items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'border-primary/40 bg-primary/10 text-foreground'
                  : 'border-border bg-card text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="size-4" />
              {g.label}
            </button>
          )
        })}
      </div>

      <div className="mt-4 rounded-2xl border border-border bg-card p-5 sm:p-6">
        {/* Шапка: приложение и где его взять */}
        <div className="flex flex-wrap items-center gap-3 border-b border-border/70 pb-4">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <AppWindow className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">
              Приложение: Firezone Client
            </p>
            <p className="text-xs text-muted-foreground">
              Где взять: {guide.store}
            </p>
          </div>
        </div>

        {/* Слаг аккаунта — его вводят при входе */}
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-background/40 p-3">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <KeyRound className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Слаг аккаунта для входа</p>
            <p className="truncate font-mono text-sm font-semibold text-foreground">
              {VPN_CONFIG.accountSlug}
            </p>
          </div>
          <div className="ml-auto">
            <CopyButton value={VPN_CONFIG.accountSlug} ariaLabel="Копировать слаг" />
          </div>
        </div>

        {/* Пошаговая инструкция */}
        <ol className="mt-5 space-y-3">
          {guide.steps.map((step, i) => (
            <li key={i} className="flex gap-3">
              <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                {i + 1}
              </span>
              <p className="text-sm leading-relaxed text-foreground/90">{step}</p>
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}
