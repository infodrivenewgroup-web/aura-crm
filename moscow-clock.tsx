'use client'

import { useEffect, useState } from 'react'
import { Clock } from 'lucide-react'

const DATE_FMT = new Intl.DateTimeFormat('ru-RU', {
  timeZone: 'Europe/Moscow',
  weekday: 'short',
  day: '2-digit',
  month: 'long',
  year: 'numeric',
})

const TIME_FMT = new Intl.DateTimeFormat('ru-RU', {
  timeZone: 'Europe/Moscow',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
})

/**
 * Живые часы по Москве: дата и время обновляются каждую секунду.
 * Время всегда показывается в зоне Europe/Moscow независимо от устройства.
 */
export function MoscowClock({ className }: { className?: string }) {
  const [now, setNow] = useState<Date | null>(null)

  useEffect(() => {
    setNow(new Date())
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <div
      className={
        'flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 ' +
        (className ?? '')
      }
    >
      <Clock className="size-4 shrink-0 text-[color:var(--accent)]" />
      <div className="leading-tight">
        <div className="text-sm font-semibold tabular-nums text-foreground">
          {now ? TIME_FMT.format(now) : '--:--:--'}
          <span className="ml-1.5 text-[10px] font-normal uppercase tracking-wide text-muted-foreground">
            МСК
          </span>
        </div>
        <div className="text-[11px] capitalize text-muted-foreground">
          {now ? DATE_FMT.format(now) : '—'}
        </div>
      </div>
    </div>
  )
}
