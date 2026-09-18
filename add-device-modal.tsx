'use client'

import { useState } from 'react'
import { Loader2, UserPlus } from 'lucide-react'
import { Modal } from '@/components/crm/modal'
import { VPN_CONFIG } from '@/data/vpn-guides'

/**
 * Модальное окно добавления человека (Actor) через REST API Firezone.
 * После создания человек ставит приложение Firezone Client и входит
 * своим email — его устройство появится в разделе «Устройства».
 */
export function AddDeviceModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated?: (message: string) => void
}) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function reset() {
    setName('')
    setEmail('')
    setError(null)
    setSubmitting(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!name.trim() || !email.trim()) {
      setError('Укажите имя и email человека.')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/vpn/actors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim() }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data?.message || data?.error || 'Не удалось добавить человека.')
      }
      onCreated?.(`Человек «${name.trim()}» добавлен`)
      reset()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Произошла ошибка.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        reset()
        onClose()
      }}
      title="Добавить человека"
      description="Создаём пользователя (Actor) в Firezone. Затем он входит в приложение своим email."
      size="lg"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="vpn-name" className="text-sm font-medium text-foreground">
            Имя
          </label>
          <input
            id="vpn-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Например: Мама"
            autoComplete="off"
            className="h-11 rounded-lg border border-border bg-background px-3 text-base text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/50"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="vpn-email" className="text-sm font-medium text-foreground">
            Email
          </label>
          <input
            id="vpn-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            autoComplete="off"
            className="h-11 rounded-lg border border-border bg-background px-3 text-base text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/50"
          />
          <p className="text-xs text-muted-foreground">
            На этот email человек будет получать одноразовый код для входа в
            приложение Firezone (слаг аккаунта: {VPN_CONFIG.accountSlug}).
          </p>
        </div>

        {error ? (
          <p className="rounded-lg border border-[color:var(--destructive)]/30 bg-[color:var(--destructive)]/10 px-3 py-2 text-sm text-[color:var(--destructive)]">
            {error}
          </p>
        ) : null}

        <div className="mt-1 flex flex-col gap-2 sm:flex-row-reverse">
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {submitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <UserPlus className="size-4" />
            )}
            {submitting ? 'Добавляем…' : 'Добавить человека'}
          </button>
          <button
            type="button"
            onClick={() => {
              reset()
              onClose()
            }}
            className="inline-flex flex-1 items-center justify-center rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
          >
            Отмена
          </button>
        </div>
      </form>
    </Modal>
  )
}
