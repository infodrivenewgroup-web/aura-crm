"use client"

import {
  Activity,
  CheckCircle2,
  Clock3,
  Database,
  RefreshCw,
  WifiOff,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { fmtNum } from "@/lib/format"
import type { SalesStats } from "@/lib/sales/types"

const MSK_FMT = new Intl.DateTimeFormat("ru-RU", {
  timeZone: "Europe/Moscow",
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
})

function fmtMsk(iso: string | null): string {
  if (!iso) return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "—"
  return `${MSK_FMT.format(d)} МСК`
}

function sinceLabel(iso: string | null): string {
  if (!iso) return "данных ещё не поступало"
  const diffMs = Date.now() - new Date(iso).getTime()
  if (!Number.isFinite(diffMs) || diffMs < 0) return "только что"
  const min = Math.floor(diffMs / 60000)
  if (min < 1) return "менее минуты назад"
  if (min < 60) return `${min} мин назад`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h} ч назад`
  return `${Math.floor(h / 24)} дн назад`
}

/**
 * Блок технического состояния синхронизации с «админ»-сайтом двух касс.
 * Определяет статус связи по наличию ошибки и свежести последних данных.
 */
export function SyncStatusCard({
  stats,
  error,
  isLoading,
}: {
  stats: SalesStats | null
  error?: Error
  isLoading: boolean
}) {
  const meta = stats?.meta

  let status: { tone: string; bg: string; icon: typeof Activity; label: string; note: string }
  if (error) {
    status = {
      tone: "text-[color:var(--negative)]",
      bg: "bg-[color:var(--negative)]/10 border-[color:var(--negative)]/40",
      icon: WifiOff,
      label: "Нет связи с базой",
      note: "Не удаётся получить данные синхронизации. Показатели могут быть неактуальны.",
    }
  } else if (isLoading && !stats) {
    status = {
      tone: "text-muted-foreground",
      bg: "bg-muted/40 border-border",
      icon: RefreshCw,
      label: "Подключение…",
      note: "Устанавливаем связь с базой синхронизации.",
    }
  } else {
    status = {
      tone: "text-[color:var(--positive)]",
      bg: "bg-[color:var(--positive)]/10 border-[color:var(--positive)]/40",
      icon: CheckCircle2,
      label: "Синхронизация активна",
      note: "Данные из проекта двух касс поступают в систему в реальном времени.",
    }
  }
  const StatusIcon = status.icon

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Activity className="size-5 text-[color:var(--accent)]" />
          <h2 className="text-base font-semibold text-foreground">Техническое состояние</h2>
        </div>
        <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <RefreshCw className={cn("size-3", isLoading && "animate-spin")} />
          обновление каждые 15 c
        </span>
      </div>

      <div className={cn("flex items-start gap-3 rounded-xl border p-3", status.bg)}>
        <StatusIcon className={cn("mt-0.5 size-5 shrink-0", status.tone)} />
        <div>
          <div className={cn("text-sm font-semibold", status.tone)}>{status.label}</div>
          <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
            {status.note}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <StatusMetric
          icon={<Database className="size-4 text-[color:var(--primary)]" />}
          label="Всего оплаченных заявок"
          value={fmtNum(meta?.totalOrders ?? 0)}
        />
        <StatusMetric
          icon={<Clock3 className="size-4 text-[color:var(--accent)]" />}
          label="Последняя заявка"
          value={sinceLabel(meta?.lastPaidAt ?? null)}
          sub={fmtMsk(meta?.lastPaidAt ?? null)}
        />
        <StatusMetric
          icon={<RefreshCw className="size-4 text-[color:var(--income)]" />}
          label="Последний приём данных"
          value={sinceLabel(meta?.lastReceivedAt ?? null)}
          sub={fmtMsk(meta?.lastReceivedAt ?? null)}
        />
      </div>
    </section>
  )
}

function StatusMetric({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode
  label: string
  value: string
  sub?: string
}) {
  return (
    <div className="rounded-xl border border-border bg-background/50 p-3">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <div className="mt-1 text-sm font-bold tabular-nums text-foreground">{value}</div>
      {sub ? <div className="text-[11px] tabular-nums text-muted-foreground">{sub}</div> : null}
    </div>
  )
}
