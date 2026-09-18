'use client'

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Кнопка копирования значения в буфер обмена с визуальной отдачей
 * и опциональным toast-уведомлением через onCopied.
 */
export function CopyButton({
  value,
  ariaLabel = 'Скопировать',
  onCopied,
  className,
}: {
  value: string
  ariaLabel?: string
  onCopied?: (message: string) => void
  className?: string
}) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      onCopied?.('Скопировано в буфер обмена')
      setTimeout(() => setCopied(false), 1600)
    } catch {
      onCopied?.('Не удалось скопировать')
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={ariaLabel}
      className={cn(
        'inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-background/40 text-muted-foreground transition-colors hover:text-foreground',
        className,
      )}
    >
      {copied ? (
        <Check className="size-4 text-[color:var(--positive)]" />
      ) : (
        <Copy className="size-4" />
      )}
    </button>
  )
}
