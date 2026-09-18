'use client'

import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { PeriodPreset, PeriodRange } from '@/lib/period'

const PRESETS: { id: PeriodPreset; label: string }[] = [
  { id: 'today', label: 'Сегодня' },
  { id: 'yesterday', label: 'Вчера' },
  { id: 'week', label: 'Неделя' },
  { id: 'month', label: 'Месяц' },
  { id: 'all', label: 'Всё время' },
  { id: 'custom', label: 'Период' },
]

export function PeriodSelector({
  preset,
  range,
  onPreset,
  onRange,
}: {
  preset: PeriodPreset
  range: PeriodRange
  onPreset: (p: PeriodPreset) => void
  onRange: (r: PeriodRange) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex flex-wrap gap-1 rounded-lg border border-border bg-card p-1">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onPreset(p.id)}
            className={cn(
              'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
              preset === p.id
                ? 'bg-[color:var(--primary)]/20 text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {preset === 'custom' && (
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={range.from}
            onChange={(e) => onRange({ ...range, from: e.target.value })}
            className="h-8 w-[150px]"
            aria-label="Дата начала периода"
          />
          <span className="text-muted-foreground">—</span>
          <Input
            type="date"
            value={range.to}
            onChange={(e) => onRange({ ...range, to: e.target.value })}
            className="h-8 w-[150px]"
            aria-label="Дата конца периода"
          />
        </div>
      )}
    </div>
  )
}
