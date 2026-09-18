'use client'

import { useEffect, useRef, useState } from 'react'
import { LogoMark, SERVICE_NAME, SERVICE_TAGLINE } from '@/components/brand'
import { Check } from 'lucide-react'

const STEPS = [
  'Проверка пароля доступа',
  'Установка защищённого соединения',
  'Загрузка модуля бухгалтерского учёта',
  'Синхронизация таблицы «Баланс»',
  'Пересчёт статистики и аналитики',
  'Подготовка рабочего пространства',
]

export function LoadingScreen({ onDone }: { onDone: () => void }) {
  const [progress, setProgress] = useState(0)
  const [step, setStep] = useState(0)
  const [finished, setFinished] = useState(false)
  const doneRef = useRef(onDone)
  doneRef.current = onDone

  useEffect(() => {
    const start = Date.now()
    const total = 3200
    const id = setInterval(() => {
      const t = Math.min(1, (Date.now() - start) / total)
      const eased = 1 - Math.pow(1 - t, 2)
      setProgress(Math.round(eased * 100))
      setStep(Math.min(STEPS.length - 1, Math.floor(eased * STEPS.length)))
      if (t >= 1) {
        clearInterval(id)
        setFinished(true)
        setTimeout(() => doneRef.current(), 900)
      }
    }, 60)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-[#07080d] p-4">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 size-[36rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[color:var(--accent)]/10 blur-[160px]" />
        {/* сканирующая линия */}
        <div className="absolute inset-x-0">
          <div className="relative h-screen">
            <div className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-[color:var(--primary)] to-transparent animate-scan-down" />
          </div>
        </div>
      </div>

      {finished ? (
        <div className="relative flex flex-col items-center animate-fade-in">
          <LogoMark className="size-24 animate-logo-rise drop-shadow-[0_0_30px_rgba(60,130,246,0.5)]" />
          <h1 className="mt-6 animate-logo-rise text-4xl font-bold tracking-[0.34em]">
            {SERVICE_NAME}
          </h1>
          <p className="mt-3 text-[10px] uppercase tracking-[0.4em] text-muted-foreground">
            {SERVICE_TAGLINE}
          </p>
          <p className="mt-6 flex items-center gap-1.5 text-sm text-[color:var(--positive)]">
            <Check className="size-4" /> Система готова к работе
          </p>
        </div>
      ) : (
        <div className="relative w-full max-w-sm">
          <div className="mb-8 flex justify-center">
            <LogoMark className="size-16 animate-flicker" />
          </div>

          <div className="mb-2 flex items-center justify-between font-mono text-xs text-muted-foreground">
            <span>Загрузка системы</span>
            <span className="text-[color:var(--accent)]">{progress}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-border">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[color:var(--primary)] to-[color:var(--accent)] transition-[width] duration-150"
              style={{ width: `${progress}%` }}
            />
          </div>

          <ul className="mt-6 space-y-2 font-mono text-xs">
            {STEPS.map((s, i) => (
              <li
                key={s}
                className={`flex items-center gap-2 transition-colors ${
                  i < step
                    ? 'text-[color:var(--positive)]'
                    : i === step
                      ? 'text-foreground'
                      : 'text-muted-foreground/50'
                }`}
              >
                {i < step ? (
                  <Check className="size-3.5" />
                ) : (
                  <span
                    className={`size-3.5 rounded-full border ${i === step ? 'border-[color:var(--accent)] animate-flicker' : 'border-muted-foreground/40'}`}
                  />
                )}
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
