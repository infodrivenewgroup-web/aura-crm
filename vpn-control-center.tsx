'use client'

import { useCallback, useState } from 'react'
import useSWR, { mutate as globalMutate } from 'swr'
import {
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  CheckCircle2,
  Download,
  ExternalLink,
  Globe,
  KeyRound,
  Loader2,
  RefreshCw,
  Route,
  Server,
  ShieldCheck,
  ShieldOff,
  Smartphone,
  Trash2,
  UserPlus,
  Users,
  Wifi,
  WifiOff,
  Zap,
} from 'lucide-react'
import { AddDeviceModal } from '@/components/vpn/add-device-modal'
import { DeviceGuides } from '@/components/vpn/device-guides'
import { FaqAccordion } from '@/components/vpn/faq-accordion'
import { QuickNav } from '@/components/vpn/quick-nav'
import {
  VPN_CONFIG,
  adminLinks,
  howItWorks,
  lifeScenarios,
  type OvActor,
  type OvClient,
  type Overview,
} from '@/data/vpn-guides'
import { cn } from '@/lib/utils'

/* --------------------------- data fetching ---------------------------- */

interface ApiError extends Error {
  notConfigured?: boolean
  status?: number
}

async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(
      (data && (data.message || data.error)) || 'Не удалось загрузить данные.',
    ) as ApiError
    err.notConfigured = Boolean(data?.notConfigured)
    err.status = res.status
    throw err
  }
  return data as T
}

/* ------------------------------ helpers ------------------------------- */

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string
  title: string
  description?: string
}) {
  return (
    <div className="mb-5 max-w-2xl">
      <p className="text-xs font-semibold uppercase tracking-wider text-primary">
        {eyebrow}
      </p>
      <h2 className="mt-1.5 text-pretty text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
        {title}
      </h2>
      {description ? (
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      ) : null}
    </div>
  )
}

function StatusDot({ online }: { online: boolean }) {
  return (
    <span
      className={cn(
        'inline-block size-2.5 shrink-0 rounded-full',
        online ? 'bg-[color:var(--positive)]' : 'bg-muted-foreground/40',
      )}
      aria-hidden
    />
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  loading,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  loading?: boolean
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="size-4 text-primary" />
        <span className="text-xs">{label}</span>
      </div>
      <p className="mt-2 truncate text-lg font-semibold text-foreground">
        {loading ? '…' : value}
      </p>
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center">
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  )
}

/* ------------------------------- view --------------------------------- */

export function VpnControlCenter() {
  const [activeDevice, setActiveDevice] = useState('ios')
  const [addOpen, setAddOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [tunnelBusy, setTunnelBusy] = useState(false)

  const {
    data: overview,
    error: overviewError,
    isLoading: overviewLoading,
  } = useSWR<Overview, ApiError>('/api/vpn/overview', fetcher, {
    refreshInterval: 20000,
  })

  const { data: actors } = useSWR<OvActor[], ApiError>('/api/vpn/actors', fetcher, {
    refreshInterval: 30000,
  })

  const showToast = useCallback((message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(null), 2200)
  }, [])

  const scrollTo = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  const refreshAll = useCallback(() => {
    globalMutate('/api/vpn/overview')
    globalMutate('/api/vpn/actors')
  }, [])

  const notConfigured = overviewError?.notConfigured

  /* ------------------------ mutation handlers ------------------------- */

  const handleClientAction = useCallback(
    async (client: OvClient, action: 'verify' | 'unverify' | 'delete') => {
      setBusyId(client.id)
      try {
        const res = await fetch(`/api/vpn/clients/${client.id}`, {
          method: action === 'delete' ? 'DELETE' : 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: action === 'delete' ? undefined : JSON.stringify({ action }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data?.message || 'Не удалось выполнить действие.')
        showToast(
          action === 'delete'
            ? `Устройство «${client.name}» удалено`
            : action === 'verify'
              ? `Устройство «${client.name}» подтверждено`
              : 'Подтверждение снято',
        )
        globalMutate('/api/vpn/overview')
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Ошибка')
      } finally {
        setBusyId(null)
      }
    },
    [showToast],
  )

  const handleDeleteActor = useCallback(
    async (actor: OvActor) => {
      setBusyId(actor.id)
      try {
        const res = await fetch(`/api/vpn/actors/${actor.id}`, { method: 'DELETE' })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data?.message || 'Не удалось удалить человека.')
        showToast(`Человек «${actor.name}» удалён`)
        refreshAll()
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Ошибка')
      } finally {
        setBusyId(null)
      }
    },
    [showToast, refreshAll],
  )

  const handleEnableTunnel = useCallback(async () => {
    setTunnelBusy(true)
    try {
      const res = await fetch('/api/vpn/full-tunnel', { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.message || 'Не удалось включить полный туннель.')
      showToast(data?.created ? 'Полный туннель включён' : 'Полный туннель уже был включён')
      globalMutate('/api/vpn/overview')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Ошибка')
    } finally {
      setTunnelBusy(false)
    }
  }, [showToast])

  /* --------------------------- derived data --------------------------- */

  const clients = overview?.clients ?? []
  const onlineCount = clients.filter((c) => c.online).length
  const actorName = useCallback(
    (id: string) => actors?.find((a) => a.id === id)?.name ?? '—',
    [actors],
  )

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        {/* Верхняя панель */}
        <div className="mb-6 flex items-center justify-between gap-3">
          <a
            href="/"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            <ArrowLeft className="size-4" />
            На главную
          </a>
          <button
            type="button"
            onClick={refreshAll}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <RefreshCw className="size-4" />
            Обновить
          </button>
        </div>

        {/* HERO */}
        <section
          id="overview"
          className="relative scroll-mt-24 overflow-hidden rounded-3xl border border-border bg-card p-6 sm:p-10"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-primary/10 blur-3xl"
          />
          <div className="relative">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background/60 px-3 py-1 text-xs font-medium text-muted-foreground">
              <ShieldCheck className="size-3.5 text-primary" />
              {VPN_CONFIG.productName} · аккаунт {VPN_CONFIG.accountName}
            </span>
            <h1 className="mt-4 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              Центр управления личным VPN
            </h1>
            <p className="mt-3 max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground">
              Единый пульт для вашего VPN на Firezone: добавляйте людей, смотрите
              подключённые устройства вживую, управляйте доступом и подключайте
              новые телефоны и компьютеры за минуту.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <button
                type="button"
                onClick={() => setAddOpen(true)}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
              >
                <UserPlus className="size-4" />
                Добавить человека
              </button>
              <button
                type="button"
                onClick={() => scrollTo('connect')}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background/50 px-5 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
              >
                <Smartphone className="size-4" />
                Подключить устройство
              </button>
              <a
                href={VPN_CONFIG.adminPortalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background/50 px-5 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
              >
                <ExternalLink className="size-4" />
                Открыть портал Firezone
              </a>
            </div>
          </div>
        </section>

        {/* Липкая под-навигация */}
        <div className="mt-4">
          <QuickNav />
        </div>

        {/* Баннер «не настроено» */}
        {notConfigured ? (
          <div className="mt-6 rounded-2xl border border-[color:var(--warning)]/40 bg-[color:var(--warning)]/10 p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 size-5 shrink-0 text-[color:var(--warning)]" />
              <div>
                <p className="text-sm font-semibold text-foreground">
                  VPN пока не подключён к живым данным
                </p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  Чтобы видеть людей и устройства вживую, задайте переменную
                  окружения FIREZONE_API_TOKEN — токен из портала Firezone
                  (Settings → REST). Инструкции по устройствам ниже работают и без
                  этого.
                </p>
                <a
                  href={VPN_CONFIG.apiTokenUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                >
                  <KeyRound className="size-4" />
                  Где взять токен
                </a>
              </div>
            </div>
          </div>
        ) : null}

        {/* ЖИВОЙ СТАТУС */}
        <section className="mt-8">
          <SectionHeading
            eyebrow="Состояние"
            title="Живой статус"
            description="Данные приходят прямо из Firezone и автоматически обновляются."
          />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={Server}
              label="Аккаунт"
              value={overview?.account.name ?? VPN_CONFIG.accountName}
              loading={overviewLoading}
            />
            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Globe className="size-4 text-primary" />
                <span className="text-xs">Шлюз (Gateway)</span>
              </div>
              <p className="mt-2 flex items-center gap-2 text-lg font-semibold text-foreground">
                {overviewLoading ? (
                  <span className="text-muted-foreground">…</span>
                ) : (
                  <>
                    <StatusDot online={Boolean(overview?.gatewayHealthy)} />
                    {overview?.gatewayHealthy ? 'Работает' : 'Недоступен'}
                  </>
                )}
              </p>
            </div>
            <StatCard
              icon={Wifi}
              label="Устройств онлайн"
              value={overviewLoading ? '…' : `${onlineCount} из ${clients.length}`}
            />
            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Route className="size-4 text-primary" />
                <span className="text-xs">Полный туннель</span>
              </div>
              <p className="mt-2 text-lg font-semibold text-foreground">
                {overviewLoading ? '…' : overview?.fullTunnel ? 'Включён' : 'Выключен'}
              </p>
            </div>
          </div>
        </section>

        {/* ПОДКЛЮЧИТЬ УСТРОЙСТВО */}
        <section id="connect" className="mt-10 scroll-mt-24">
          <SectionHeading
            eyebrow="Подключить"
            title="Как подключить устройство"
            description="Установите приложение Firezone Client, войдите по слагу аккаунта и одноразовому коду с email. Никаких файлов конфигурации."
          />
          <div className="mb-4 flex flex-col gap-2 sm:flex-row">
            <a
              href={VPN_CONFIG.clientsDownloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
            >
              <Download className="size-4" />
              Скачать приложения Firezone
            </a>
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
            >
              <UserPlus className="size-4" />
              Сначала добавить человека
            </button>
          </div>
          <DeviceGuides active={activeDevice} onActiveChange={setActiveDevice} />
        </section>

        {/* ЛЮДИ */}
        <section id="people" className="mt-10 scroll-mt-24">
          <SectionHeading
            eyebrow="Люди"
            title="Люди с доступом"
            description="Каждый человек (Actor) входит в приложение своим email. Добавьте родственника — он получит одноразовый код и подключит свои устройства."
          />
          <div className="mb-3 flex justify-end">
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              <UserPlus className="size-4" />
              Добавить человека
            </button>
          </div>

          {notConfigured ? (
            <EmptyState text="Подключите FIREZONE_API_TOKEN, чтобы видеть и добавлять людей." />
          ) : !actors ? (
            <EmptyState text="Загружаем список людей…" />
          ) : actors.length === 0 ? (
            <EmptyState text="Пока никого нет. Нажмите «Добавить человека»." />
          ) : (
            <ul className="flex flex-col gap-2">
              {actors.map((a) => (
                <li
                  key={a.id}
                  className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-4"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Users className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {a.name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {a.email ?? 'без email'}
                    </p>
                  </div>
                  {a.disabled_at ? (
                    <span className="rounded-lg border border-[color:var(--warning)]/40 bg-[color:var(--warning)]/10 px-2 py-1 text-xs font-medium text-[color:var(--warning)]">
                      отключён
                    </span>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => handleDeleteActor(a)}
                    disabled={busyId === a.id}
                    aria-label={`Удалить ${a.name}`}
                    className="inline-flex size-9 items-center justify-center rounded-lg border border-border bg-background/40 text-muted-foreground transition-colors hover:border-[color:var(--destructive)]/40 hover:text-[color:var(--destructive)] disabled:opacity-50"
                  >
                    {busyId === a.id ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Trash2 className="size-4" />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* УСТРОЙСТВА */}
        <section id="devices" className="mt-10 scroll-mt-24">
          <SectionHeading
            eyebrow="Устройства"
            title="Подключённые устройства"
            description="Живой список устройств (Clients). Зелёный значок — устройство подключено к VPN прямо сейчас. Можно подтвердить доверенное устройство или удалить доступ."
          />

          {notConfigured ? (
            <EmptyState text="Подключите FIREZONE_API_TOKEN, чтобы видеть устройства вживую." />
          ) : overviewLoading ? (
            <EmptyState text="Загружаем устройства…" />
          ) : clients.length === 0 ? (
            <EmptyState text="Пока нет устройств. Установите приложение Firezone и войдите — устройство появится здесь." />
          ) : (
            <ul className="flex flex-col gap-2">
              {clients.map((c) => {
                const verified = Boolean(c.verified_at)
                const busy = busyId === c.id
                return (
                  <li
                    key={c.id}
                    className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-4"
                  >
                    <span className="flex items-center gap-2">
                      {c.online ? (
                        <Wifi className="size-5 text-[color:var(--positive)]" />
                      ) : (
                        <WifiOff className="size-5 text-muted-foreground/60" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 truncate text-sm font-semibold text-foreground">
                        {c.name}
                        {verified ? (
                          <BadgeCheck className="size-4 shrink-0 text-primary" />
                        ) : null}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {actorName(c.actor_id)} · {c.ipv4 || '—'} ·{' '}
                        {c.online ? 'онлайн' : 'офлайн'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          handleClientAction(c, verified ? 'unverify' : 'verify')
                        }
                        disabled={busy}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background/40 px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
                      >
                        {busy ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : verified ? (
                          <ShieldOff className="size-3.5" />
                        ) : (
                          <ShieldCheck className="size-3.5" />
                        )}
                        {verified ? 'Снять' : 'Подтвердить'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleClientAction(c, 'delete')}
                        disabled={busy}
                        aria-label={`Удалить устройство ${c.name}`}
                        className="inline-flex size-9 items-center justify-center rounded-lg border border-border bg-background/40 text-muted-foreground transition-colors hover:border-[color:var(--destructive)]/40 hover:text-[color:var(--destructive)] disabled:opacity-50"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        {/* ДОСТУП И ТРАФИК */}
        <section id="access" className="mt-10 scroll-mt-24">
          <SectionHeading
            eyebrow="Доступ и трафик"
            title="Что доступно через VPN"
            description="Ресурсы и политики задают, какой трафик идёт через VPN. Включите полный туннель, чтобы весь трафик шёл через ваш сервер."
          />

          <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Route className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">
                  Полный туннель (весь трафик через VPN)
                </p>
                <p className="text-xs text-muted-foreground">
                  {overview?.fullTunnel
                    ? 'Включён: создан ресурс 0.0.0.0/0 и политика для всех.'
                    : 'Выключен: через VPN идёт только заданный трафик.'}
                </p>
              </div>
              {overview?.fullTunnel ? (
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-[color:var(--positive)]/40 bg-[color:var(--positive)]/10 px-3 py-2 text-sm font-medium text-[color:var(--positive)]">
                  <CheckCircle2 className="size-4" />
                  Включён
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleEnableTunnel}
                  disabled={tunnelBusy || Boolean(notConfigured)}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {tunnelBusy ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Zap className="size-4" />
                  )}
                  Включить полный туннель
                </button>
              )}
            </div>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="text-sm font-semibold text-foreground">
                Ресурсы ({overview?.resources.length ?? 0})
              </p>
              {overview && overview.resources.length > 0 ? (
                <ul className="mt-3 flex flex-col gap-2">
                  {overview.resources.slice(0, 6).map((r) => (
                    <li
                      key={r.id}
                      className="flex items-center justify-between gap-2 rounded-lg border border-border/70 bg-background/40 px-3 py-2 text-sm"
                    >
                      <span className="min-w-0 truncate text-foreground/90">
                        {r.name}
                      </span>
                      <span className="shrink-0 font-mono text-xs text-muted-foreground">
                        {r.address ?? r.type}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">
                  {notConfigured ? 'Нет данных.' : 'Ресурсы не заданы.'}
                </p>
              )}
            </div>
            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="text-sm font-semibold text-foreground">
                Политики ({overview?.policies.length ?? 0})
              </p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Политика связывает группу людей с ресурсом. Тонкую настройку
                удобнее делать в портале Firezone.
              </p>
              <a
                href={`${VPN_CONFIG.adminPortalUrl}/policies`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-2 rounded-lg border border-border bg-background/40 px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                <ExternalLink className="size-4" />
                Открыть политики
              </a>
            </div>
          </div>
        </section>

        {/* ПОМОЩЬ */}
        <section id="help" className="mt-10 scroll-mt-24">
          <SectionHeading
            eyebrow="Помощь"
            title="Как это устроено и что делать"
            description="Короткое объяснение модели Firezone, жизненные сценарии и ответы на частые вопросы."
          />

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {howItWorks.map((h) => (
              <div key={h.title} className="rounded-2xl border border-border bg-card p-5">
                <p className="text-sm font-semibold text-foreground">{h.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {h.text}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {lifeScenarios.map((s) => (
              <div key={s.title} className="rounded-2xl border border-border bg-card p-5">
                <p className="text-sm font-semibold text-foreground">{s.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-foreground/90">
                  {s.steps}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-6">
            <p className="mb-3 text-sm font-semibold text-foreground">Частые вопросы</p>
            <FaqAccordion />
          </div>

          <div className="mt-6">
            <p className="mb-3 text-sm font-semibold text-foreground">
              Быстрые переходы в портал Firezone
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {adminLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col gap-1 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-muted"
                >
                  <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <ExternalLink className="size-4 text-primary" />
                    {link.label}
                  </span>
                  <span className="text-xs text-muted-foreground">{link.hint}</span>
                </a>
              ))}
            </div>
          </div>
        </section>

        <p className="mt-10 text-center text-xs text-muted-foreground">
          {VPN_CONFIG.productName} · шлюз {VPN_CONFIG.gatewayIp} · только для
          администратора
        </p>
      </div>

      {/* Toast */}
      {toast ? (
        <div className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
          <div className="pointer-events-none rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-lg">
            {toast}
          </div>
        </div>
      ) : null}

      <AddDeviceModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={(msg) => {
          showToast(msg)
          refreshAll()
        }}
      />
    </main>
  )
}
