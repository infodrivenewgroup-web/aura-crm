'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

const SECTIONS = [
  { id: 'overview', label: 'Обзор' },
  { id: 'connect', label: 'Подключить' },
  { id: 'people', label: 'Люди' },
  { id: 'devices', label: 'Устройства' },
  { id: 'access', label: 'Доступ' },
  { id: 'help', label: 'Помощь' },
] as const

/**
 * Липкая под-навигация с якорными ссылками и подсветкой активного раздела
 * (через IntersectionObserver). Прокрутка идёт плавно и с учётом высоты панели.
 */
export function QuickNav() {
  const [active, setActive] = useState<string>('overview')

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id)
        }
      },
      { rootMargin: '-45% 0px -50% 0px', threshold: 0 },
    )
    for (const s of SECTIONS) {
      const el = document.getElementById(s.id)
      if (el) observer.observe(el)
    }
    return () => observer.disconnect()
  }, [])

  return (
    <nav className="sticky top-0 z-30 -mx-4 border-b border-border/70 bg-background/85 px-4 backdrop-blur-md sm:mx-0 sm:rounded-xl sm:border">
      <ul className="thin-scroll flex gap-1 overflow-x-auto py-2">
        {SECTIONS.map((s) => (
          <li key={s.id}>
            <a
              href={`#${s.id}`}
              className={cn(
                'inline-flex whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                active === s.id
                  ? 'bg-primary/15 text-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              {s.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
