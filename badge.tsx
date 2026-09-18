import { cn } from '@/lib/utils'

type Tone = 'neutral' | 'income' | 'expense' | 'profit' | 'positive' | 'negative' | 'warning'

const tones: Record<Tone, string> = {
  neutral: 'bg-muted text-muted-foreground border-border',
  income: 'bg-[color:var(--income)]/15 text-[color:var(--income)] border-[color:var(--income)]/30',
  expense: 'bg-[color:var(--expense)]/15 text-[color:var(--expense)] border-[color:var(--expense)]/30',
  profit: 'bg-[color:var(--profit)]/15 text-[color:var(--profit)] border-[color:var(--profit)]/30',
  positive: 'bg-[color:var(--positive)]/15 text-[color:var(--positive)] border-[color:var(--positive)]/30',
  negative: 'bg-[color:var(--negative)]/15 text-[color:var(--negative)] border-[color:var(--negative)]/30',
  warning: 'bg-[color:var(--warning)]/15 text-[color:var(--warning)] border-[color:var(--warning)]/30',
}

export function Badge({
  className,
  tone = 'neutral',
  ...props
}: React.ComponentProps<'span'> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium',
        tones[tone],
        className,
      )}
      {...props}
    />
  )
}
