'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { faqItems } from '@/data/vpn-guides'
import { cn } from '@/lib/utils'

/**
 * Доступный accordion для раздела «Частые проблемы».
 * Одновременно раскрыт один пункт; управление с клавиатуры — нативными кнопками.
 */
export function FaqAccordion() {
  const [open, setOpen] = useState<number | null>(0)

  return (
    <div className="flex flex-col gap-2">
      {faqItems.map((item, i) => {
        const isOpen = open === i
        return (
          <div
            key={i}
            className="overflow-hidden rounded-xl border border-border bg-card"
          >
            <button
              type="button"
              aria-expanded={isOpen}
              onClick={() => setOpen(isOpen ? null : i)}
              className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors hover:bg-muted/50"
            >
              <span className="text-sm font-medium text-foreground">
                {item.q}
              </span>
              <ChevronDown
                className={cn(
                  'size-4 shrink-0 text-muted-foreground transition-transform',
                  isOpen && 'rotate-180',
                )}
              />
            </button>
            {isOpen ? (
              <div className="border-t border-border/70 px-4 py-3.5">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {item.a}
                </p>
              </div>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
