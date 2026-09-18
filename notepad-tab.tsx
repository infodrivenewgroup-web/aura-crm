'use client'

import { useState } from 'react'
import { useStore } from '@/hooks/use-store'
import type { NoteItem } from '@/lib/types'
import { Modal } from '@/components/crm/modal'
import { TransferMenu } from '@/components/crm/transfer-menu'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { CopyButton } from '@/components/vpn/copy-button'
import { Check, FileText, NotebookPen, Pencil, Plus, Trash2, X } from 'lucide-react'

export function NotepadTab() {
  const { notes, addNote, updateNote, deleteNote } = useStore()

  // Создание новой заметки.
  const [creating, setCreating] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')

  // Открытая в модальном окне заметка + режим редактирования внутри окна.
  const [openId, setOpenId] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editBody, setEditBody] = useState('')

  const openNote = notes.find((n) => n.id === openId) ?? null

  function create() {
    if (!title.trim() && !body.trim()) return
    addNote({ title: title.trim() || 'Без названия', body: body.trim() })
    setTitle('')
    setBody('')
    setCreating(false)
  }

  function openCard(n: NoteItem) {
    setOpenId(n.id)
    setEditing(false)
  }

  function closeCard() {
    setOpenId(null)
    setEditing(false)
  }

  function startEdit(n: NoteItem) {
    setEditing(true)
    setEditTitle(n.title)
    setEditBody(n.body)
  }

  function saveEdit() {
    if (!openId) return
    updateNote(openId, {
      title: editTitle.trim() || 'Без названия',
      body: editBody.trim(),
    })
    setEditing(false)
  }

  function removeNote(id: string) {
    deleteNote(id)
    closeCard()
  }

  function pluralNotes(n: number) {
    if (n === 1) return 'заметка'
    if (n >= 2 && n <= 4) return 'заметки'
    return 'заметок'
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
            <NotebookPen className="size-5 text-primary" />
            Блокнот
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Заметки, договорённости и важные мысли по работе сервиса.
          </p>
        </div>
        <Button size="sm" onClick={() => setCreating((v) => !v)}>
          {creating ? <X className="size-4" /> : <Plus className="size-4" />}
          {creating ? 'Отмена' : 'Новая заметка'}
        </Button>
      </div>

      {creating && (
        <div className="rounded-2xl border border-border bg-card p-4">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Заголовок заметки"
            className="mb-3 font-medium"
            autoFocus
          />
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Текст заметки..."
            rows={5}
          />
          <div className="mt-3 flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setCreating(false)}>
              Отмена
            </Button>
            <Button size="sm" onClick={create}>
              <Check className="size-4" /> Сохранить
            </Button>
          </div>
        </div>
      )}

      {notes.length === 0 && !creating ? (
        <div className="flex h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card text-center">
          <NotebookPen className="size-8 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium">Заметок пока нет</p>
          <p className="mt-1 text-xs text-muted-foreground">Создайте первую заметку.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-medium text-muted-foreground">Все заметки</h3>
            <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {notes.length} {pluralNotes(notes.length)}
            </span>
          </div>

          {/* Несколько удобных столбцов: показываются только названия заметок.
              По нажатию открывается полноценное окно с её содержимым. */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {notes.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => openCard(n)}
                className="group flex min-h-16 w-full items-center gap-3 rounded-xl border border-border bg-background/40 p-3 text-left transition-colors hover:border-primary/50 hover:bg-muted/60"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <FileText className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-foreground">
                    {n.title}
                  </span>
                  {n.body ? (
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                      {n.body}
                    </span>
                  ) : (
                    <span className="mt-0.5 block text-xs text-muted-foreground/50">
                      Пустая заметка
                    </span>
                  )}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Полноценное окно просмотра/редактирования заметки */}
      <Modal
        open={!!openNote}
        onClose={closeCard}
        title={
          editing ? 'Редактирование заметки' : (openNote?.title ?? 'Заметка')
        }
        description={
          openNote
            ? `Обновлено: ${new Date(openNote.updatedAt).toLocaleString('ru-RU')}`
            : undefined
        }
        size="lg"
      >
        {openNote &&
          (editing ? (
            <div className="flex flex-col gap-3">
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Заголовок заметки"
                className="font-medium"
                autoFocus
              />
              <Textarea
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                placeholder="Текст заметки..."
                rows={10}
              />
              <div className="flex flex-wrap justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setEditing(false)}>
                  <X className="size-4" /> Отмена
                </Button>
                <Button size="sm" onClick={saveEdit}>
                  <Check className="size-4" /> Сохранить
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <p className="max-h-[55vh] overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                {openNote.body || (
                  <span className="text-muted-foreground/60">Заметка пуста</span>
                )}
              </p>
              <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-4">
                <span className="mr-auto inline-flex items-center gap-2 text-xs text-muted-foreground">
                  <CopyButton value={openNote.body} ariaLabel="Скопировать текст заметки" />
                  Копировать
                </span>
                <TransferMenu
                  source="note"
                  title={openNote.title}
                  text={openNote.body}
                  onRemove={() => removeNote(openNote.id)}
                />
                <Button variant="outline" size="sm" onClick={() => startEdit(openNote)}>
                  <Pencil className="size-3.5" /> Редактировать
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => removeNote(openNote.id)}
                  className="text-[color:var(--negative)]"
                >
                  <Trash2 className="size-3.5" /> Удалить
                </Button>
                <Button variant="ghost" size="sm" onClick={closeCard}>
                  Закрыть
                </Button>
              </div>
            </div>
          ))}
      </Modal>
    </div>
  )
}
