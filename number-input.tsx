'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { toNumber } from '@/lib/calc'

/**
 * Числовое поле ввода с локальным строковым состоянием.
 * Принимает запятую и точку, не мешает вводу, наружу отдаёт число.
 */
export function NumberInput({
  value,
  onChange,
  disabled,
  className,
  placeholder = '0',
  integer = false,
  id,
  'aria-label': ariaLabel,
}: {
  value: number
  onChange: (n: number) => void
  disabled?: boolean
  className?: string
  placeholder?: string
  integer?: boolean
  id?: string
  'aria-label'?: string
}) {
  const [text, setText] = useState(value ? String(value) : '')
  const focused = useRef(false)

  // синхронизация при внешнем изменении (например, сброс дня)
  useEffect(() => {
    if (!focused.current) {
      setText(value ? String(value) : '')
    }
  }, [value])

  return (
    <input
      id={id}
      aria-label={ariaLabel}
      type="text"
      inputMode={integer ? 'numeric' : 'decimal'}
      disabled={disabled}
      value={text}
      placeholder={placeholder}
      onFocus={() => {
        focused.current = true
      }}
      onBlur={() => {
        focused.current = false
        const n = integer
          ? Math.max(0, Math.round(toNumber(text)))
          : Math.max(0, toNumber(text))
        setText(n ? String(n) : '')
        onChange(n)
      }}
      onChange={(e) => {
        const raw = e.target.value
        // допускаем цифры, точку, запятую
        const cleaned = raw.replace(/[^\d.,]/g, '')
        setText(cleaned)
        const n = integer
          ? Math.max(0, Math.round(toNumber(cleaned)))
          : Math.max(0, toNumber(cleaned))
        onChange(n)
      }}
      className={cn(
        'h-9 w-full rounded-lg border border-input bg-background/40 px-3 text-right text-sm tabular-nums text-foreground shadow-sm outline-none transition-colors',
        'focus:border-ring focus:ring-2 focus:ring-ring/40',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
    />
  )
}
