'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, Palette } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTheme } from '@/hooks/use-theme'
import { THEMES } from '@/lib/themes'

/**
 * Переключатель фоновой темы оформления. Кнопка с иконкой палитры открывает
 * компактное меню со списком тем, образцами цветов и активной отметкой.
 * Закрывается по клику вне меню и по Esc.
 */
export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onPointer(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const active = THEMES.find((t) => t.id === theme) ?? THEMES[0]

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        title="Тема оформления"
        className="flex items-center gap-2 rounded-lg border border-border bg-background/50 px-2.5 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted"
      >
        <Palette className="size-4 text-[color:var(--accent)]" />
        <span className="hidden sm:inline">{active.label}</span>
      </button>

      {open ? (
        <div
          role="menu"
          className="animate-fade-in absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-2xl"
        >
          <p className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Тема оформления
          </p>
          {THEMES.map((t) => {
            const selected = t.id === theme
            return (
              <button
                key={t.id}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                onClick={() => {
                  setTheme(t.id)
                  setOpen(false)
                }}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors',
                  selected ? 'bg-muted' : 'hover:bg-muted/60',
                )}
              >
                {/* Образец цветов темы */}
                <span
                  className="flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border"
                  style={{ background: t.swatch[0] }}
                  aria-hidden
                >
                  <span
                    className="size-3.5 rounded-full"
                    style={{
                      background: t.swatch[2],
                      boxShadow: `0 0 0 3px ${t.swatch[1]}`,
                    }}
                  />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-foreground">
                    {t.label}
                  </span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {t.hint}
                  </span>
                </span>
                {selected ? (
                  <Check className="size-4 shrink-0 text-[color:var(--positive)]" />
                ) : null}
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
