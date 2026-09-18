'use client'

import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Лёгкое модальное окно без внешних зависимостей: оверлей, блокировка
 * прокрутки фона, закрытие по Esc и по клику вне окна. Контент скроллится.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  size = 'md',
}: {
  open: boolean
  onClose: () => void
  title: React.ReactNode
  description?: React.ReactNode
  children: React.ReactNode
  size?: 'md' | 'lg' | 'xl'
}) {
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open || typeof document === 'undefined') return null

  const maxW =
    size === 'xl' ? 'max-w-4xl' : size === 'lg' ? 'max-w-2xl' : 'max-w-xl'

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-3 backdrop-blur-sm sm:p-6"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className={cn(
          'animate-fade-in my-auto w-full rounded-2xl border border-border bg-card shadow-2xl',
          maxW,
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border p-4 sm:p-5">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              {title}
            </h2>
            {description ? (
              <p className="mt-1 text-xs text-muted-foreground">{description}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть"
            className="shrink-0 rounded-lg border border-border bg-background/40 p-1.5 text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="p-4 sm:p-5">{children}</div>
      </div>
    </div>,
    document.body,
  )
}
