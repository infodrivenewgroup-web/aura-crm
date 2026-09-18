'use client'

import { useState } from 'react'
import { useStore } from '@/hooks/use-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Modal } from '@/components/crm/modal'
import { EMAIL_PROVIDERS, type EmailItem, type EmailProviderKey } from '@/lib/types'
import { Mail, Pencil, Plus, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const EMPTY = { account: '', comment: '' }

export function EmailsTab() {
  const { emails, addEmail, updateEmail, deleteEmail } = useStore()
  const [provider, setProvider] = useState<EmailProviderKey>(EMAIL_PROVIDERS[0].key)

  const current = EMAIL_PROVIDERS.find((p) => p.key === provider)!
  const items = emails.filter((e) => e.provider === provider)

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
          <Mail className="size-5 text-primary" />
          Почты
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Выберите провайдера почты, чтобы открыть таблицу аккаунтов с комментариями.
        </p>
      </div>

      {/* Меню подразделов — выбор провайдера почты */}
      <nav className="thin-scroll -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {EMAIL_PROVIDERS.map((p) => {
          const active = provider === p.key
          const count = emails.filter((e) => e.provider === p.key).length
          return (
            <button
              key={p.key}
              type="button"
              onClick={() => setProvider(p.key)}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
                active
                  ? 'border-[color:var(--primary)]/40 bg-[color:var(--primary)]/15 text-foreground'
                  : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              {p.label}
              {count > 0 ? (
                <span
                  className={cn(
                    'rounded-md px-1.5 py-0.5 text-[11px] tabular-nums',
                    active ? 'bg-[color:var(--primary)]/20 text-foreground' : 'bg-muted text-muted-foreground',
                  )}
                >
                  {count}
                </span>
              ) : null}
            </button>
          )
        })}
      </nav>

      <ProviderSection
        key={provider}
        title={current.label}
        items={items}
        onAdd={(account, comment) => addEmail({ provider, account, comment })}
        onUpdate={(id, account, comment) => updateEmail(id, { account, comment })}
        onDelete={deleteEmail}
      />
    </div>
  )
}

function ProviderSection({
  title,
  items,
  onAdd,
  onUpdate,
  onDelete,
}: {
  title: string
  items: EmailItem[]
  onAdd: (account: string, comment: string) => void
  onUpdate: (id: string, account: string, comment: string) => void
  onDelete: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ ...EMPTY })

  function openAdd() {
    setEditingId(null)
    setForm({ ...EMPTY })
    setOpen(true)
  }
  function openEdit(e: EmailItem) {
    setEditingId(e.id)
    setForm({ account: e.account, comment: e.comment })
    setOpen(true)
  }
  function save() {
    if (!form.account.trim() && !form.comment.trim()) return
    if (editingId) onUpdate(editingId, form.account.trim(), form.comment.trim())
    else onAdd(form.account.trim(), form.comment.trim())
    setOpen(false)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {`Почтовые аккаунты «${title}»: наименование аккаунта и комментарий.`}
        </p>
        <Button onClick={openAdd} className="shrink-0">
          <Plus className="size-4" /> Добавить
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="flex h-40 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card text-center">
          <Mail className="size-8 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium">Аккаунтов пока нет</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Нажмите «Добавить», чтобы создать запись.
          </p>
        </div>
      ) : (
        <>
          {/* Таблица — для планшетов и ПК */}
          <div className="thin-scroll hidden overflow-x-auto rounded-2xl border border-border bg-card sm:block">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="w-1/2 px-4 py-3">Почтовый аккаунт</th>
                  <th className="w-1/2 px-4 py-3">Комментарий</th>
                  <th className="px-4 py-3 text-right">Действия</th>
                </tr>
              </thead>
              <tbody>
                {items.map((e) => (
                  <tr key={e.id} className="border-b border-border/60 align-top">
                    <td className="px-4 py-3">
                      <span className="break-all font-medium">{e.account || '—'}</span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{e.comment || '—'}</td>
                    <td className="px-4 py-3">
                      <RowActions onEdit={() => openEdit(e)} onDelete={() => onDelete(e.id)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Карточки — для телефонов */}
          <ul className="flex flex-col gap-3 sm:hidden">
            {items.map((e) => (
              <li key={e.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <span className="break-all font-medium">{e.account || '—'}</span>
                  <RowActions onEdit={() => openEdit(e)} onDelete={() => onDelete(e.id)} />
                </div>
                {e.comment ? (
                  <p className="mt-1.5 text-sm text-muted-foreground">{e.comment}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        size="md"
        title={editingId ? 'Редактирование аккаунта' : 'Новый аккаунт'}
        description={`Провайдер: ${title}`}
      >
        <div className="flex flex-col gap-4">
          <Field label="Наименование почтового аккаунта">
            <Input
              value={form.account}
              onChange={(ev) => setForm((f) => ({ ...f, account: ev.target.value }))}
              placeholder="account@example.com"
              autoFocus
            />
          </Field>
          <Field label="Комментарий к аккаунту">
            <Textarea
              value={form.comment}
              onChange={(ev) => setForm((f) => ({ ...f, comment: ev.target.value }))}
              placeholder="комментарий по аккаунту"
              rows={4}
            />
          </Field>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Закрыть
          </Button>
          <Button onClick={save}>
            <Plus className="size-4" /> {editingId ? 'Сохранить' : 'Добавить'}
          </Button>
        </div>
      </Modal>
    </div>
  )
}

function RowActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="flex shrink-0 justify-end gap-2">
      <button
        type="button"
        aria-label="Редактировать"
        onClick={onEdit}
        className="text-muted-foreground hover:text-primary"
      >
        <Pencil className="size-4" />
      </button>
      <button
        type="button"
        aria-label="Удалить"
        onClick={onDelete}
        className="text-muted-foreground hover:text-[color:var(--negative)]"
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  )
}
