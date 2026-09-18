'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { LogoMark, SERVICE_NAME, SERVICE_TAGLINE } from '@/components/brand'
import { AlertTriangle, Fingerprint, KeyRound, Lock, ShieldAlert } from 'lucide-react'
import { collectDevice } from '@/lib/device'
import { recordAccess } from '@/app/actions/access-log'

/**
 * Двухшаговый вход:
 *   1) пароль доступа  → сервер сверяет пароль (без выдачи сессии);
 *   2) код доступа      → сервер повторно сверяет пароль вместе с кодом и, при
 *                         успехе, устанавливает подписанную HttpOnly-сессию.
 *
 * Секреты хранятся ТОЛЬКО на сервере (переменные окружения) и никогда не
 * попадают в код клиента. Все попытки журналируются как и раньше.
 */

type Stage = 'password' | 'code'

export function LoginScreen({ onSuccess }: { onSuccess: () => void }) {
  const [stage, setStage] = useState<Stage>('password')
  const [password, setPassword] = useState('')
  const [value, setValue] = useState('') // текущее значение активного поля
  const [attempts, setAttempts] = useState(0)
  const [error, setError] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [shake, setShake] = useState(false)
  const [busy, setBusy] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const device = useMemo(collectDevice, [])

  useEffect(() => {
    inputRef.current?.focus()
  }, [stage])

  function logAccess(outcome: 'success' | 'failure', attemptNo: number) {
    // Журналируем вход/попытку. Сбой записи не должен мешать входу.
    void recordAccess({
      outcome,
      attemptNo,
      client: {
        fingerprint: device.fingerprint,
        clientIp: device.ip,
        platform: device.platform,
        screen: device.screen,
        timezone: device.timezone,
        language: device.language,
        cores: device.cores,
        memory: device.memory,
        touch: device.touch,
        vendor: device.vendor,
      },
    }).catch(() => {})
  }

  function fail(msg: string, countAttempt: boolean) {
    if (countAttempt) {
      const next = attempts + 1
      setAttempts(next)
      logAccess('failure', next)
    }
    setError(true)
    setErrorMsg(msg)
    setShake(true)
    setValue('')
    setTimeout(() => setShake(false), 550)
    inputRef.current?.focus()
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (busy) return
    setError(false)
    setBusy(true)
    try {
      if (stage === 'password') {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ step: 'password', password: value }),
        })
        if (res.ok) {
          setPassword(value)
          setValue('')
          setStage('code')
          return
        }
        if (res.status === 429) {
          fail('Слишком много попыток. Повторите позже.', false)
          return
        }
        fail('Вы ввели неверный пароль доступа.', true)
        return
      }

      // stage === 'code'
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ step: 'code', password, code: value }),
      })
      if (res.ok) {
        logAccess('success', attempts + 1)
        onSuccess()
        return
      }
      if (res.status === 429) {
        fail('Слишком много попыток. Повторите позже.', false)
        return
      }
      fail('Вы ввели неверный код доступа.', true)
    } catch {
      fail('Ошибка соединения. Проверьте сеть и попробуйте снова.', false)
    } finally {
      setBusy(false)
    }
  }

  const escalated = attempts >= 3
  const isCode = stage === 'code'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#07080d] p-4">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 top-0 size-[28rem] rounded-full bg-[color:var(--primary)]/15 blur-[140px]" />
        <div className="absolute -right-40 bottom-0 size-[28rem] rounded-full bg-[color:var(--accent)]/15 blur-[140px]" />
      </div>

      <div
        className={`relative w-full max-w-md animate-fade-in ${shake ? 'animate-shake' : ''}`}
      >
        <div className="rounded-2xl border border-border bg-card/80 p-7 shadow-2xl backdrop-blur">
          <div className="flex flex-col items-center text-center">
            <LogoMark className="size-14" />
            <h1 className="mt-4 text-2xl font-bold tracking-[0.28em]">
              {SERVICE_NAME}
            </h1>
            <p className="mt-1 text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              {SERVICE_TAGLINE}
            </p>
          </div>

          {/* Индикатор шагов */}
          <div className="mt-6 flex items-center justify-center gap-2">
            <StepDot active={!isCode} done={isCode} label="Пароль" />
            <span className="h-px w-8 bg-border" />
            <StepDot active={isCode} done={false} label="Код доступа" />
          </div>

          <div className="my-5 flex items-center gap-2 rounded-lg border border-border bg-background/40 px-3 py-2 text-xs text-muted-foreground">
            {isCode ? (
              <KeyRound className="size-3.5 shrink-0 text-[color:var(--accent)]" />
            ) : (
              <Lock className="size-3.5 shrink-0 text-[color:var(--accent)]" />
            )}
            <span>
              {isCode
                ? 'Пароль принят. Введите одноразовый код доступа для завершения входа.'
                : 'Доступ к системе защищён. Введите пароль для входа.'}
            </span>
          </div>

          <form onSubmit={submit} className="flex flex-col gap-3">
            <label htmlFor="secret" className="sr-only">
              {isCode ? 'Код доступа' : 'Пароль доступа'}
            </label>
            <input
              id="secret"
              ref={inputRef}
              type="password"
              inputMode={isCode ? 'numeric' : 'text'}
              autoComplete="off"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={isCode ? 'Код доступа' : 'Пароль доступа'}
              aria-invalid={error}
              disabled={busy}
              className={`h-12 w-full rounded-xl border bg-background/60 px-4 text-center text-lg tracking-[0.4em] text-foreground outline-none transition-colors placeholder:tracking-normal placeholder:text-muted-foreground/60 focus:ring-2 ${
                error
                  ? 'border-[color:var(--negative)] focus:ring-[color:var(--negative)]/40'
                  : 'border-input focus:border-ring focus:ring-ring/40'
              }`}
            />
            <Button type="submit" size="lg" className="h-12 text-base" disabled={busy}>
              {busy
                ? 'Проверка…'
                : isCode
                  ? 'Подтвердить код доступа'
                  : 'Продолжить'}
            </Button>
          </form>

          {error ? (
            <div
              role="alert"
              className="mt-5 animate-fade-in rounded-xl border border-[color:var(--negative)]/40 bg-[color:var(--negative)]/10 p-4"
            >
              <div className="flex items-start gap-2">
                {escalated ? (
                  <ShieldAlert className="mt-0.5 size-5 shrink-0 text-[color:var(--negative)] animate-flicker" />
                ) : (
                  <AlertTriangle className="mt-0.5 size-5 shrink-0 text-[color:var(--negative)]" />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[color:var(--negative)]">
                    {escalated
                      ? 'Критическое предупреждение безопасности'
                      : errorMsg || 'Ошибка входа'}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-foreground/80">
                    {escalated ? (
                      <>
                        Зафиксировано несколько несанкционированных попыток
                        входа. При следующей неверной попытке ваше устройство
                        будет внесено в чёрный список IP-адресов и потеряет
                        возможность открывать данную систему и ряд связанных
                        ресурсов. Инцидент передан администратору.
                      </>
                    ) : (
                      <>
                        В целях безопасности технические данные вашего
                        устройства считаны и зафиксированы системой: цифровой
                        отпечаток, IP-адрес и иные параметры переданы
                        администратору как сведения о несанкционированной
                        попытке входа.
                      </>
                    )}
                  </p>

                  <div className="mt-3 grid grid-cols-1 gap-1 rounded-lg border border-border bg-background/50 p-3 font-mono text-[11px] text-muted-foreground">
                    <Row label="IP-адрес" value={device.ip} danger />
                    <Row label="Цифровой отпечаток" value={device.fingerprint} danger />
                    <Row label="Платформа" value={device.platform} />
                    <Row label="Экран" value={device.screen} />
                    <Row label="Часовой пояс" value={device.timezone} />
                    <Row label="Язык системы" value={device.language} />
                    <Row label="Ядер CPU" value={device.cores} />
                    <Row label="Время фиксации" value={device.capt} />
                    <Row label="Попыток входа" value={String(attempts)} danger />
                    <Row label="Статус" value="ПЕРЕДАНО АДМИНИСТРАТОРУ" danger />
                  </div>
                  <p className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Fingerprint className="size-3" />
                    Идентификатор сессии: {device.fingerprint.slice(0, 12)}
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </div>
        <p className="mt-4 text-center text-[11px] text-muted-foreground/70">
          Все действия в системе журналируются. Несанкционированный доступ
          запрещён.
        </p>
      </div>
    </div>
  )
}

function StepDot({
  active,
  done,
  label,
}: {
  active: boolean
  done: boolean
  label: string
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className={`flex size-5 items-center justify-center rounded-full border text-[10px] font-bold ${
          active
            ? 'border-[color:var(--accent)] bg-[color:var(--accent)]/15 text-[color:var(--accent)]'
            : done
              ? 'border-[color:var(--positive)] bg-[color:var(--positive)]/15 text-[color:var(--positive)]'
              : 'border-muted-foreground/40 text-muted-foreground/60'
        }`}
      >
        {done ? '✓' : active ? '•' : ''}
      </span>
      <span
        className={`text-[11px] ${active ? 'text-foreground' : 'text-muted-foreground/60'}`}
      >
        {label}
      </span>
    </div>
  )
}

function Row({
  label,
  value,
  danger,
  hidden,
}: {
  label: string
  value: string
  danger?: boolean
  hidden?: boolean
}) {
  if (hidden) return null
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground/70">{label}:</span>
      <span
        className={`truncate text-right ${danger ? 'text-[color:var(--negative)]' : 'text-foreground/80'}`}
      >
        {value}
      </span>
    </div>
  )
}
