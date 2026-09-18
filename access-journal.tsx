'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  listAccessLog,
  listPresence,
  type AccessLogRow,
  type PresenceRow,
} from '@/app/actions/access-log'
import { Modal } from '@/components/crm/modal'
import { cn } from '@/lib/utils'
import {
  CheckCircle2,
  Fingerprint,
  Loader2,
  Lock,
  MonitorSmartphone,
  RefreshCw,
  ShieldAlert,
  XCircle,
} from 'lucide-react'

/** Краткое определение браузера и ОС из User-Agent. */
function parseUa(ua: string | null): { browser: string; os: string } {
  if (!ua) return { browser: 'неизвестно', os: 'неизвестно' }
  let browser = 'неизвестно'
  if (/Edg\//.test(ua)) browser = 'Edge'
  else if (/OPR\/|Opera/.test(ua)) browser = 'Opera'
  else if (/Chrome\//.test(ua)) browser = 'Chrome'
  else if (/Firefox\//.test(ua)) browser = 'Firefox'
  else if (/Safari\//.test(ua)) browser = 'Safari'

  let os = 'неизвестно'
  if (/Windows NT 10/.test(ua)) os = 'Windows 10/11'
  else if (/Windows/.test(ua)) os = 'Windows'
  else if (/iPhone|iPad|iOS/.test(ua)) os = 'iOS'
  else if (/Mac OS X/.test(ua)) os = 'macOS'
  else if (/Android/.test(ua)) os = 'Android'
  else if (/Linux/.test(ua)) os = 'Linux'
  return { browser, os }
}

function fmtTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  } catch {
    return iso
  }
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const sec = Math.round(diff / 1000)
  if (sec < 60) return 'только что'
  const min = Math.round(sec / 60)
  return `${min} мин назад`
}

export function AccessJournal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const [log, setLog] = useState<AccessLogRow[]>([])
  const [presence, setPresence] = useState<PresenceRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const [l, p] = await Promise.all([listAccessLog(200), listPresence()])
      setLog(l)
      setPresence(p)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    void refresh()
    // Пока окно открыто — обновляем список «онлайн» и журнал каждые 15 c.
    const id = setInterval(() => void refresh(), 15000)
    return () => clearInterval(id)
  }, [open, refresh])

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Журнал входов и безопасность"
      description="Все входы и попытки входа в систему. Список только для чтения — изменить или удалить записи нельзя."
      size="xl"
    >
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/50 px-2 py-1 text-[11px] text-muted-foreground">
            <Lock className="size-3" />
            Журнал защищён от изменения и удаления
          </span>
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <RefreshCw className="size-3.5" />
            )}
            Обновить
          </button>
        </div>

        {error ? (
          <p className="rounded-lg border border-[color:var(--negative)]/40 bg-[color:var(--negative)]/10 p-3 text-sm text-[color:var(--negative)]">
            Не удалось загрузить журнал. Попробуйте обновить.
          </p>
        ) : null}

        {/* Кто сейчас в системе */}
        <section>
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <MonitorSmartphone className="size-4 text-[color:var(--positive)]" />
            Сейчас в системе
            <span className="rounded-full bg-[color:var(--positive)]/15 px-2 py-0.5 text-xs text-[color:var(--positive)]">
              {presence.length}
            </span>
          </h3>
          {presence.length === 0 ? (
            <p className="rounded-lg border border-border bg-card px-3 py-4 text-center text-xs text-muted-foreground">
              {loading ? 'Загрузка…' : 'Сейчас никто не работает в системе.'}
            </p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {presence.map((p) => {
                const { browser, os } = parseUa(p.userAgent)
                return (
                  <li
                    key={p.sessionId}
                    className="rounded-lg border border-[color:var(--positive)]/30 bg-[color:var(--positive)]/5 p-3 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                        <span className="size-2 rounded-full bg-[color:var(--positive)] shadow-[0_0_6px_var(--positive)]" />
                        Активен · {relativeTime(p.lastSeen)}
                      </span>
                      <span className="font-mono text-muted-foreground">
                        {p.ip ?? '—'}
                      </span>
                    </div>
                    <p className="mt-1.5 text-muted-foreground">
                      {browser} · {os} · вход с {fmtTime(p.firstSeen)}
                    </p>
                    {p.fingerprint ? (
                      <p className="mt-0.5 flex items-center gap-1 font-mono text-[11px] text-muted-foreground/80">
                        <Fingerprint className="size-3" />
                        {p.fingerprint}
                      </p>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        {/* История входов и попыток */}
        <section>
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <ShieldAlert className="size-4 text-primary" />
            История входов и попыток
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {log.length}
            </span>
          </h3>

          {log.length === 0 ? (
            <p className="rounded-lg border border-border bg-card px-3 py-4 text-center text-xs text-muted-foreground">
              {loading ? 'Загрузка…' : 'Записей пока нет.'}
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {log.map((row) => {
                const { browser, os } = parseUa(row.userAgent)
                const success = row.outcome === 'success'
                return (
                  <li
                    key={row.id}
                    className={cn(
                      'rounded-lg border p-3 text-xs',
                      success
                        ? 'border-border bg-card'
                        : 'border-[color:var(--negative)]/30 bg-[color:var(--negative)]/5',
                    )}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1.5 font-semibold',
                          success
                            ? 'text-[color:var(--positive)]'
                            : 'text-[color:var(--negative)]',
                        )}
                      >
                        {success ? (
                          <CheckCircle2 className="size-4" />
                        ) : (
                          <XCircle className="size-4" />
                        )}
                        {success ? 'Успешный вход' : 'Неверный пароль'}
                        {row.attemptNo
                          ? ` · попытка №${row.attemptNo}`
                          : ''}
                      </span>
                      <span className="font-mono text-muted-foreground">
                        {fmtTime(row.createdAt)}
                      </span>
                    </div>

                    <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-muted-foreground sm:grid-cols-3">
                      <Detail label="IP-адрес" value={row.ip ?? '—'} mono />
                      <Detail label="Браузер" value={browser} />
                      <Detail label="ОС" value={os} />
                      <Detail label="Платформа" value={row.platform ?? '—'} />
                      <Detail label="Экран" value={row.screen ?? '—'} />
                      <Detail label="Часовой пояс" value={row.timezone ?? '—'} />
                      <Detail label="Язык" value={row.language ?? '—'} />
                      <Detail label="Ядер CPU" value={row.cores ?? '—'} />
                      <Detail
                        label="Отпечаток"
                        value={row.fingerprint ?? '—'}
                        mono
                      />
                    </div>
                    {row.userAgent ? (
                      <p className="mt-1.5 truncate font-mono text-[10px] text-muted-foreground/70">
                        {row.userAgent}
                      </p>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>
    </Modal>
  )
}

function Detail({
  label,
  value,
  mono,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <span className="flex min-w-0 flex-col">
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground/60">
        {label}
      </span>
      <span
        className={cn(
          'truncate text-foreground/80',
          mono && 'font-mono tabular-nums',
        )}
      >
        {value}
      </span>
    </span>
  )
}
