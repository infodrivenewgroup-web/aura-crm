'use client'

import { useState } from 'react'
import {
  BadgeCheck,
  Loader2,
  MonitorSmartphone,
  ShieldCheck,
  ShieldOff,
  Trash2,
} from 'lucide-react'
import type { OvClient } from '@/data/vpn-guides'
import { mutateApi } from '@/components/vpn/use-vpn'
import { cn } from '@/lib/utils'

/** Относительное «был онлайн» из updated_at. */
function lastSeen(iso?: string): string {
  if (!iso) return ''
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const diff = Date.now() - then
  const min = Math.round(diff / 60000)
  if (min < 1) return 'только что'
  if (min < 60) return `${min} мин назад`
  const h = Math.round(min / 60)
  if (h < 24) return `${h} ч назад`
  const d = Math.round(h / 24)
  return `${d} дн назад`
}

/**
 * Живой список устройств (Clients) Firezone. Показывает статус онлайн,
 * подтверждение и позволяет подтверждать/снимать подтверждение и удалять
 * устройство. После действия вызывает onChanged для обновления сводки.
 */
export function DevicesPanel({
  clients,
  onChanged,
  onToast,
}: {
  clients: OvClient[]
  onChanged: () => void
  onToast: (message: string) => void
}) {
  const [busyId, setBusyId] = useState<string | null>(null)

  async function toggleVerify(c: OvClient) {
    setBusyId(c.id)
    try {
      await mutateApi(`/api/vpn/clients/${c.id}`, 'PATCH', {
        action: c.verified_at ? 'unverify' : 'verify',
      })
      onToast(c.verified_at ? 'Подтверждение снято' : 'Устройство подтверждено')
      onChanged()
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Действие не выполнено')
    } finally {
      setBusyId(null)
    }
  }

  async function remove(c: OvClient) {
    if (!window.confirm(`Удалить устройство «${c.name}»? Доступ пропадёт сразу.`)) return
    setBusyId(c.id)
    try {
      await mutateApi(`/api/vpn/clients/${c.id}`, 'DELETE')
      onToast('Устройство удалено')
      onChanged()
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Не удалось удалить')
    } finally {
      setBusyId(null)
    }
  }

  if (clients.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-card px-4 py-10 text-center">
        <MonitorSmartphone className="size-8 text-muted-foreground" />
        <p className="text-sm font-medium text-foreground">Пока нет устройств</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          Устройство появится здесь, как только человек войдёт в приложение
          Firezone Client на телефоне или компьютере.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {clients.map((c) => {
        const busy = busyId === c.id
        return (
          <div
            key={c.id}
            className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-4"
          >
            <span
              className={cn(
                'flex size-10 shrink-0 items-center justify-center rounded-xl',
                c.online ? 'bg-[color:var(--positive)]/15 text-[color:var(--positive)]' : 'bg-muted text-muted-foreground',
              )}
            >
              <MonitorSmartphone className="size-5" />
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-sm font-semibold text-foreground">{c.name}</p>
                {c.verified_at ? (
                  <span className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/5 px-1.5 py-0.5 text-[11px] font-medium text-primary">
                    <BadgeCheck className="size-3" />
                    Подтверждено
                  </span>
                ) : null}
              </div>
              <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
                {c.ipv4}
                {c.updated_at ? ` · ${lastSeen(c.updated_at)}` : ''}
              </p>
            </div>

            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium',
                c.online
                  ? 'bg-[color:var(--positive)]/10 text-[color:var(--positive)]'
                  : 'bg-muted text-muted-foreground',
              )}
            >
              <span
                className={cn(
                  'size-1.5 rounded-full',
                  c.online ? 'bg-[color:var(--positive)]' : 'bg-muted-foreground',
                )}
              />
              {c.online ? 'Онлайн' : 'Оффлайн'}
            </span>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => toggleVerify(c)}
                disabled={busy}
                aria-label={c.verified_at ? 'Снять подтверждение' : 'Подтвердить устройство'}
                className="inline-flex size-9 items-center justify-center rounded-lg border border-border bg-background/40 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-60"
              >
                {busy ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : c.verified_at ? (
                  <ShieldOff className="size-4" />
                ) : (
                  <ShieldCheck className="size-4" />
                )}
              </button>
              <button
                type="button"
                onClick={() => remove(c)}
                disabled={busy}
                aria-label="Удалить устройство"
                className="inline-flex size-9 items-center justify-center rounded-lg border border-border bg-background/40 text-muted-foreground transition-colors hover:border-[color:var(--destructive)]/40 hover:text-[color:var(--destructive)] disabled:opacity-60"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
