'use client'

import { useEffect, useRef, useState } from 'react'
import { Wordmark } from '@/components/brand'
import {
  Banknote,
  Cloud,
  CloudOff,
  Home,
  Loader2,
  Rocket,
  Search,
  ShieldCheck,
  ShieldPlus,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useStore } from '@/hooks/use-store'
import { Modal } from '@/components/crm/modal'
import { QuickLinks } from '@/components/crm/quick-links'
import { AccessJournal } from '@/components/crm/access-journal'
import { collectDevice, getSessionId } from '@/lib/device'
import { heartbeat } from '@/app/actions/access-log'
import { HOME_TAB, TAB_GROUPS, type TabId } from '@/components/crm/tabs-config'
import { HomeTab } from '@/components/crm/tabs/home-tab'
import { CashboxTab } from '@/components/crm/tabs/cashbox-tab'
import { BalanceTab } from '@/components/crm/tabs/balance-tab'
import { StatisticsTab } from '@/components/crm/tabs/statistics-tab'
import { AnalyticsTab } from '@/components/crm/tabs/analytics-tab'
import { CalculatorTab } from '@/components/crm/tabs/calculator-tab'
import { NotepadTab } from '@/components/crm/tabs/notepad-tab'
import { SearchToolsTab } from '@/components/crm/tabs/search-tools-tab'
import { AdSitesTab } from '@/components/crm/tabs/ad-sites-tab'
import { BotsTab } from '@/components/crm/tabs/bots-tab'
import { ContactsTab } from '@/components/crm/tabs/contacts-tab'
import { EmailsTab } from '@/components/crm/tabs/emails-tab'
import { EmployeesTab } from '@/components/crm/tabs/employees-tab'
import { NotebookTab } from '@/components/crm/tabs/notebook-tab'
import { VaultTab } from '@/components/crm/tabs/vault-tab'
import { PromptsTab } from '@/components/crm/tabs/prompts-tab'
import { ThemeSwitcher } from '@/components/crm/theme-switcher'

function SyncIndicator() {
  const { syncStatus, loaded } = useStore()

  if (!loaded || syncStatus === 'saving') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/60 px-2 py-1 text-[11px] font-medium text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin" />
        Сохранение…
      </span>
    )
  }
  if (syncStatus === 'error') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md border border-[color:var(--negative)]/40 bg-[color:var(--negative)]/10 px-2 py-1 text-[11px] font-medium text-[color:var(--negative)]">
        <CloudOff className="size-3.5" />
        Нет связи (локальная копия)
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-[color:var(--positive)]/40 bg-[color:var(--positive)]/10 px-2 py-1 text-[11px] font-medium text-[color:var(--positive)]">
      <Cloud className="size-3.5" />
      Синхронизировано
    </span>
  )
}

export function CrmShell() {
  const [tab, setTab] = useState<TabId>('home')
  const [linksOpen, setLinksOpen] = useState(false)
  const [journalOpen, setJournalOpen] = useState(false)
  const deviceRef = useRef<ReturnType<typeof collectDevice> | null>(null)

  // Отмечаем присутствие пользователя в системе (для списка «онлайн»).
  // Heartbeat при входе и далее каждые 45 c, пока вкладка открыта.
  useEffect(() => {
    const device = collectDevice()
    deviceRef.current = device
    const sessionId = getSessionId()
    const ping = () =>
      heartbeat({
        sessionId,
        client: {
          fingerprint: device.fingerprint,
          clientIp: device.ip,
          platform: device.platform,
          timezone: device.timezone,
          language: device.language,
          cores: device.cores,
        },
      }).catch(() => {})
    ping()
    const id = setInterval(ping, 45000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Шапка */}
      <header className="sticky top-0 z-30 border-b border-border bg-card/85 backdrop-blur supports-[backdrop-filter]:bg-card/70">
        <div className="mx-auto flex w-full max-w-[1500px] items-center justify-between gap-4 px-3 py-3 sm:px-5">
          <Wordmark />
          <div className="flex items-center gap-3 text-right">
            <ThemeSwitcher />
            <SyncIndicator />
            <div className="hidden items-center gap-2 sm:flex">
              <div className="flex flex-col items-end">
                <span className="text-xs font-medium text-foreground">
                  CRM-система учёта
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Аналитика чистой прибыли сервиса
                </span>
              </div>
              <span className="ml-1 inline-flex size-2.5 rounded-full bg-[color:var(--positive)] shadow-[0_0_8px_var(--positive)]" />
            </div>
          </div>
        </div>

        {/* Навигация по вкладкам — сгруппирована по смыслу */}
        <nav className="mx-auto w-full max-w-[1500px] px-2 pb-2 sm:px-4">
          {/* Сервисные действия */}
          <div className="thin-scroll flex items-stretch gap-3 overflow-x-auto pb-1">
            <div className="flex shrink-0 flex-col gap-1">
              <span className="px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                Сервис
              </span>
              <div className="flex items-center gap-1">
                {/* Главная — сводка продаж и техническое состояние */}
                <button
                  type="button"
                  onClick={() => setTab('home')}
                  aria-current={tab === 'home' ? 'page' : undefined}
                  className={cn(
                    'flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors',
                    tab === 'home'
                      ? 'border-[color:var(--primary)]/40 bg-[color:var(--primary)]/15 text-foreground'
                      : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                >
                  <Home
                    className={cn(
                      'size-4',
                      tab === 'home' ? 'text-[color:var(--primary)]' : '',
                    )}
                  />
                  <span className="whitespace-nowrap">{HOME_TAB.label}</span>
                </button>
                {/* Касса — все входящие платежи по дням, неделям и месяцам */}
                <button
                  type="button"
                  onClick={() => setTab('cashbox')}
                  aria-current={tab === 'cashbox' ? 'page' : undefined}
                  className={cn(
                    'flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors',
                    tab === 'cashbox'
                      ? 'border-[color:var(--primary)]/40 bg-[color:var(--primary)]/15 text-foreground'
                      : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                >
                  <Banknote
                    className={cn(
                      'size-4',
                      tab === 'cashbox' ? 'text-[color:var(--primary)]' : '',
                    )}
                  />
                  <span className="whitespace-nowrap">Касса</span>
                </button>
                {/* Быстрые ссылки — открывает окно со ссылками */}
                <button
                  type="button"
                  onClick={() => setLinksOpen(true)}
                  className="flex shrink-0 items-center gap-2 rounded-lg border border-[color:var(--accent)]/40 bg-[color:var(--accent)]/10 px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-[color:var(--accent)]/20"
                >
                  <Rocket className="size-4 text-[color:var(--accent)]" />
                  <span className="whitespace-nowrap">Быстрые ссылки</span>
                </button>
                {/* Журнал входов — открывает защищённое окно */}
                <button
                  type="button"
                  onClick={() => setJournalOpen(true)}
                  className="flex shrink-0 items-center gap-2 rounded-lg border border-[color:var(--primary)]/40 bg-[color:var(--primary)]/10 px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-[color:var(--primary)]/20"
                >
                  <ShieldCheck className="size-4 text-[color:var(--primary)]" />
                  <span className="whitespace-nowrap">Журнал входов</span>
                </button>
                {/* Поисковик — отдельная самостоятельная страница */}
                <a
                  href="/search"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex shrink-0 items-center gap-2 rounded-lg border border-[color:var(--accent)]/40 bg-[color:var(--accent)]/10 px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-[color:var(--accent)]/20"
                >
                  <Search className="size-4 text-[color:var(--accent)]" />
                  <span className="whitespace-nowrap">Поисковик</span>
                </a>
                {/* NEW VPN — отдельная страница INFO-DRIVE VPN */}
                <a
                  href="/vpn"
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Открыть INFO-DRIVE VPN"
                  className="flex shrink-0 items-center gap-2 rounded-lg border border-[#00B4D8]/50 bg-[#00B4D8]/15 px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-[#00B4D8]/25"
                >
                  <ShieldPlus className="size-4 text-[#00B4D8]" />
                  <span className="whitespace-nowrap">NEW VPN</span>
                </a>
              </div>
            </div>

            {TAB_GROUPS.map((g) => (
              <div key={g.group} className="flex shrink-0 items-stretch gap-3">
                {/* Разделитель между группами */}
                <div className="w-px shrink-0 self-stretch bg-border" aria-hidden />
                <div className="flex shrink-0 flex-col gap-1">
                  <span className="px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                    {g.group}
                  </span>
                  <div className="flex items-center gap-1">
                    {g.tabs.map((t) => {
                      const Icon = t.icon
                      const active = tab === t.id
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setTab(t.id)}
                          aria-current={active ? 'page' : undefined}
                          className={cn(
                            'flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
                            active
                              ? 'border-[color:var(--primary)]/40 bg-[color:var(--primary)]/15 text-foreground'
                              : 'border-transparent text-muted-foreground hover:bg-muted hover:text-foreground',
                          )}
                        >
                          <Icon
                            className={cn(
                              'size-4',
                              active ? 'text-[color:var(--primary)]' : '',
                            )}
                          />
                          <span className="whitespace-nowrap">{t.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-[1500px] flex-1 px-3 py-5 sm:px-5">
        {tab === 'home' && <HomeTab onNavigate={setTab} />}
        {tab === 'cashbox' && <CashboxTab />}
        {tab === 'balance' && <BalanceTab />}
        {tab === 'statistics' && <StatisticsTab />}
        {tab === 'analytics' && <AnalyticsTab />}
        {tab === 'calculator' && <CalculatorTab />}
        {tab === 'notepad' && <NotepadTab />}
        {tab === 'tools' && <SearchToolsTab />}
        {tab === 'sites' && <AdSitesTab />}
        {tab === 'bots' && <BotsTab />}
        {tab === 'contacts' && <ContactsTab />}
        {tab === 'emails' && <EmailsTab />}
        {tab === 'employees' && <EmployeesTab />}
        {tab === 'notebook' && <NotebookTab />}
        {tab === 'vault' && <VaultTab />}
        {tab === 'prompts' && <PromptsTab />}
      </main>

      <Modal
        open={linksOpen}
        onClose={() => setLinksOpen(false)}
        title="Быстрые ссылки"
        description="Внешние сервисы — открываются в новой вкладке браузера"
        size="lg"
      >
        <QuickLinks bare />
      </Modal>

      <AccessJournal
        open={journalOpen}
        onClose={() => setJournalOpen(false)}
      />

      <footer className="border-t border-border px-4 py-3 text-center text-[11px] text-muted-foreground">
        AURUM · Внутренняя система финансового учёта · Данные надёжно хранятся в
        облачной базе �� доступны с любого устройства и браузера
      </footer>
    </div>
  )
}
