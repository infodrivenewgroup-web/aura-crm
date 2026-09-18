'use client'

import { useState } from 'react'
import { useStore } from '@/hooks/use-store'
import type { ContactItem } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import {
  Check,
  CreditCard,
  Pencil,
  Phone,
  Plus,
  Trash2,
  X,
} from 'lucide-react'

type Kind = ContactItem['kind']

const KIND_META: Record<Kind, { label: string; icon: typeof Phone; placeholder: string }> = {
  phone: { label: 'Номер телефона', icon: Phone, placeholder: '+7 900 000-00-00' },
  card: { label: 'Номер карты', icon: CreditCard, placeholder: '0000 0000 0000 0000' },
}

export function ContactsTab() {
  const { contacts, addContact, updateContact, deleteContact } = useStore()

  const [kind, setKind] = useState<Kind>('phone')
  const [value, setValue] = useState('')
  const [comment, setComment] = useState('')

  const [editingId, setEditingId] = useState<string | null>(null)
  const [eValue, setEValue] = useState('')
  const [eComment, setEComment] = useState('')

  function add() {
    if (!value.trim()) return
    addContact({ kind, value: value.trim(), comment: comment.trim() })
    setValue('')
    setComment('')
  }

  function startEdit(c: ContactItem) {
    setEditingId(c.id)
    setEValue(c.value)
    setEComment(c.comment)
  }
  function saveEdit() {
    if (editingId) {
      updateContact(editingId, { value: eValue.trim(), comment: eComment.trim() })
      setEditingId(null)
    }
  }

  const phones = contacts.filter((c) => c.kind === 'phone')
  const cards = contacts.filter((c) => c.kind === 'card')

  function renderGroup(kindKey: Kind, items: ContactItem[]) {
    const meta = KIND_META[kindKey]
    const Icon = meta.icon
    return (
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/40 px-4 py-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Icon className="size-4 text-primary" />
            {kindKey === 'phone' ? 'Номера' : 'Карты'}
          </h3>
          <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {items.length}
          </span>
        </div>
        {items.length === 0 ? (
          <p className="px-4 py-6 text-center text-xs text-muted-foreground">
            {kindKey === 'phone' ? 'Номеров пока нет' : 'Карт пока нет'}
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((c) => (
              <li key={c.id} className="flex items-start gap-3 p-4">
                {editingId === c.id ? (
                  <div className="grid flex-1 gap-2 sm:grid-cols-2">
                    <Input
                      value={eValue}
                      onChange={(e) => setEValue(e.target.value)}
                      inputMode={kindKey === 'phone' ? 'tel' : 'numeric'}
                    />
                    <Input
                      value={eComment}
                      onChange={(e) => setEComment(e.target.value)}
                      placeholder="Комментарий"
                    />
                    <div className="col-span-full flex justify-end gap-2">
                      <Button variant="ghost" size="xs" onClick={() => setEditingId(null)}>
                        <X className="size-3" /> отмена
                      </Button>
                      <Button size="xs" onClick={saveEdit}>
                        <Check className="size-3" /> сохранить
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="min-w-0 flex-1">
                      <span className="block truncate font-mono text-base font-medium tabular-nums text-foreground">
                        {c.value}
                      </span>
                      {c.comment ? (
                        <p className="mt-0.5 text-sm text-muted-foreground">{c.comment}</p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        aria-label="Редактировать"
                        onClick={() => startEdit(c)}
                        className="text-muted-foreground hover:text-primary"
                      >
                        <Pencil className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        aria-label="Удалить"
                        onClick={() => deleteContact(c.id)}
                        className="text-muted-foreground hover:text-[color:var(--negative)]"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
          <Phone className="size-5 text-primary" />
          Номера/Карты
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Актуальные телефонные номера и номера карт с комментариями.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        {/* Переключатель типа записи */}
        <div className="mb-3 inline-flex rounded-lg border border-border bg-background/40 p-1">
          {(Object.keys(KIND_META) as Kind[]).map((k) => {
            const meta = KIND_META[k]
            const Icon = meta.icon
            const active = kind === k
            return (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  active
                    ? 'bg-[color:var(--primary)]/15 text-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon className={cn('size-4', active ? 'text-[color:var(--primary)]' : '')} />
                {meta.label}
              </button>
            )
          })}
        </div>
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={KIND_META[kind].placeholder}
            inputMode={kind === 'phone' ? 'tel' : 'numeric'}
            onKeyDown={(e) => e.key === 'Enter' && add()}
          />
          <Input
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Комментарий"
            onKeyDown={(e) => e.key === 'Enter' && add()}
          />
          <Button onClick={add}>
            <Plus className="size-4" /> Добавить
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {renderGroup('phone', phones)}
        {renderGroup('card', cards)}
      </div>
    </div>
  )
}
