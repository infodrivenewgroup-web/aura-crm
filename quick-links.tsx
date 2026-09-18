'use client'

import {
  CreditCard,
  Wallet,
  Landmark,
  Building2,
  Sparkles,
  FileSpreadsheet,
  Table2,
  ExternalLink,
  type LucideIcon,
} from 'lucide-react'

/**
 * Быстрые ссылки на внешние сервисы для главной страницы CRM.
 * Каждая кнопка открывает заданный сайт в новой вкладке браузера.
 * Названия — на английском, кроме «Отчёт» (по требованию — на русском).
 */
type QuickLink = {
  label: string
  href: string
  icon: LucideIcon
  /** Краткое пояснение под названием. */
  hint: string
}

const LINKS: QuickLink[] = [
  {
    label: 'Главная таблица оплат',
    href: 'https://aggregated-orders-admin.vercel.app',
    icon: Table2,
    hint: 'Сводная таблица всех оплат',
  },
  {
    label: 'Platega Payments',
    href: 'https://v0-check-love-private.vercel.app/admin/orders',
    icon: CreditCard,
    hint: 'Платежи Платега',
  },
  {
    label: 'Cashera Payments',
    href: 'https://audit-love.vercel.app/admin/orders',
    icon: CreditCard,
    hint: 'Платежи Кашера',
  },
  {
    label: 'Platega Cashbox',
    href: 'https://my.platega.io/',
    icon: Wallet,
    hint: 'Касса Платега',
  },
  {
    label: 'Cashera Cashbox',
    href: 'https://my.cashera.cash/login',
    icon: Wallet,
    hint: 'Касса Кашера',
  },
  {
    label: 'amoCRM',
    href: 'https://driveinfo.amocrm.ru/',
    icon: Building2,
    hint: 'АмоЦРМ',
  },
  {
    label: 'Vercel v0',
    href: 'https://v0.app/',
    icon: Sparkles,
    hint: 'Профиль в конструкторе',
  },
  {
    label: 'Отчёт',
    href: 'https://docs.google.com/spreadsheets/d/1CU_dv2-68hx5vcV2_UbL6YfSqacbYnEt63-NE2sMiss/edit?gid=1423749564#gid=1423749564',
    icon: FileSpreadsheet,
    hint: 'Google-таблица отчёта',
  },
]

/**
 * @param bare — если true, выводится только сетка кнопок без внешней
 * карточки и заголовка (используется внутри модального окна).
 */
export function QuickLinks({ bare = false }: { bare?: boolean }) {
  const grid = (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {LINKS.map((link) => {
          const Icon = link.icon
          return (
            <a
              key={link.label}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col gap-2 rounded-lg border border-border bg-background p-3 transition-colors hover:border-[color:var(--primary)]/50 hover:bg-[color:var(--primary)]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--primary)]/50"
            >
              <span className="flex items-center justify-between">
                <span className="flex size-9 items-center justify-center rounded-md bg-[color:var(--primary)]/15 text-[color:var(--primary)]">
                  <Icon className="size-5" />
                </span>
                <ExternalLink className="size-3.5 text-muted-foreground transition-colors group-hover:text-[color:var(--primary)]" />
              </span>
              <span className="flex flex-col">
                <span className="text-sm font-semibold leading-tight text-foreground text-balance">
                  {link.label}
                </span>
                <span className="mt-0.5 text-[11px] leading-tight text-muted-foreground text-pretty">
                  {link.hint}
                </span>
            </span>
          </a>
          )
        })}
    </div>
  )

  if (bare) return grid

  return (
    <section
      aria-label="Быстрые ссылки на внешние сервисы"
      className="rounded-xl border border-border bg-card p-4"
    >
      <div className="mb-3 flex items-center gap-2">
        <ExternalLink className="size-4 text-[color:var(--accent)]" />
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Быстрый доступ
        </h3>
      </div>
      {grid}
    </section>
  )
}
