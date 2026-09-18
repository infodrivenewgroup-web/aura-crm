'use client'

import { useState } from 'react'
import { useStore } from '@/hooks/use-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Check, Bot, ExternalLink, Pencil, Plus, Trash2, X } from 'lucide-react'

function normalizeUrl(s: string): string | null {
  const t = s.trim()
  if (!t) return null
  if (/^https?:\/\//i.test(t)) return t
  if (/^[\w.-]+\.[a-z]{2,}/i.test(t)) return `https://${t}`
  return null
}

export function BotsTab() {
  const { bots, addBot, updateBot, deleteBot } = useStore()
  const [name, setName] = useState('')
  const [comment, setComment] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [eName, setEName] = useState('')
  const [eComment, setEComment] = useState('')

  function add() {
    if (!name.trim()) return
    addBot({ name: name.trim(), comment: comment.trim() })
    setName('')
    setComment('')
  }

  function startEdit(id: string, n: string, c: string) {
    setEditingId(id)
    setEName(n)
    setEComment(c)
  }
  function saveEdit() {
    if (editingId) {
      updateBot(editingId, { name: eName.trim(), comment: eComment.trim() })
      setEditingId(null)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
          <Bot className="size-5 text-primary" />
          Боты
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Важные боты и сервисы с комментариями по их использованию.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Название или ссылка бота"
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

      {bots.length === 0 ? (
        <div className="flex h-40 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card text-center">
          <Bot className="size-8 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium">Список пуст</p>
          <p className="mt-1 text-xs text-muted-foreground">Добавьте первого бота выше.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <ul className="divide-y divide-border">
            {bots.map((b) => {
              const url = normalizeUrl(b.name)
              return (
                <li key={b.id} className="flex items-start gap-3 p-4">
                  {editingId === b.id ? (
                    <div className="grid flex-1 gap-2 sm:grid-cols-2">
                      <Input value={eName} onChange={(e) => setEName(e.target.value)} />
                      <Input value={eComment} onChange={(e) => setEComment(e.target.value)} />
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
                        <div className="flex items-center gap-2">
                          {url ? (
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 truncate font-medium text-[color:var(--info)] hover:underline"
                            >
                              {b.name}
                              <ExternalLink className="size-3.5 shrink-0" />
                            </a>
                          ) : (
                            <span className="truncate font-medium">{b.name}</span>
                          )}
                        </div>
                        {b.comment ? (
                          <p className="mt-0.5 text-sm text-muted-foreground">{b.comment}</p>
                        ) : null}
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <button
                          type="button"
                          aria-label="Редактировать"
                          onClick={() => startEdit(b.id, b.name, b.comment)}
                          className="text-muted-foreground hover:text-primary"
                        >
                          <Pencil className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          aria-label="Удалить"
                          onClick={() => deleteBot(b.id)}
                          className="text-muted-foreground hover:text-[color:var(--negative)]"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
