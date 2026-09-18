'use client'

import { useEffect, useState } from 'react'
import { LogoMark, SERVICE_NAME, SERVICE_TAGLINE } from '@/components/brand'

export function BootScreen({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState(0)

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 450)
    const t2 = setTimeout(() => setPhase(2), 1300)
    const done = setTimeout(onDone, 2900)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(done)
    }
  }, [onDone])

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-[#07080d]">
      {/* фоновое свечение красно-синее */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 top-1/3 size-96 rounded-full bg-[color:var(--primary)]/20 blur-[120px]" />
        <div className="absolute -right-32 bottom-1/4 size-96 rounded-full bg-[color:var(--accent)]/20 blur-[120px]" />
      </div>

      <div className="relative flex flex-col items-center">
        {/* пульсирующие кольца */}
        <div className="relative mb-8 flex items-center justify-center">
          <span className="absolute size-28 rounded-2xl border border-[color:var(--primary)]/40 animate-pulse-ring" />
          <span
            className="absolute size-28 rounded-2xl border border-[color:var(--accent)]/40 animate-pulse-ring"
            style={{ animationDelay: '0.9s' }}
          />
          <div className="animate-logo-rise">
            <LogoMark className="size-24 drop-shadow-[0_0_24px_rgba(225,40,55,0.45)]" />
          </div>
        </div>

        <h1
          className="animate-logo-rise text-5xl font-bold tracking-[0.34em] text-foreground sm:text-6xl"
          style={{ animationDelay: '0.25s' }}
        >
          {SERVICE_NAME}
        </h1>

        <p
          className={`mt-4 text-xs font-medium uppercase tracking-[0.4em] text-muted-foreground transition-opacity duration-700 ${
            phase >= 1 ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {SERVICE_TAGLINE}
        </p>

        {/* индикатор инициализации */}
        <div
          className={`mt-10 h-px w-64 overflow-hidden bg-border transition-opacity duration-500 ${
            phase >= 1 ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <div className="h-full w-1/3 bg-gradient-to-r from-[color:var(--primary)] to-[color:var(--accent)] animate-sweep" />
        </div>
        <p
          className={`mt-3 font-mono text-[11px] tracking-wide text-muted-foreground transition-opacity duration-500 ${
            phase >= 2 ? 'opacity-100' : 'opacity-0'
          }`}
        >
          Инициализация защищённого модуля учёта…
        </p>
      </div>
    </div>
  )
}
