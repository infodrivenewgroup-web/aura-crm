'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '@/hooks/use-store'
import type { PromptItem } from '@/lib/types'
import { Modal } from '@/components/crm/modal'
import { TransferMenu } from '@/components/crm/transfer-menu'
import { PromptEditor } from '@/components/crm/prompts/prompt-editor'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CopyButton } from '@/components/vpn/copy-button'
import {
  ChevronRight,
  Pencil,
  Search,
  Sparkles,
  Trash2,
  Wand2,
  X,
} from 'lucide-react'

function pluralPrompts(n: number) {
  if (n % 10 === 1 && n % 100 !== 11) return 'промт'
  if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) return 'промта'
  return 'промтов'
}

export function PromptsTab() {
  const { prompts, addPrompt, updatePrompt, deletePrompt } = useStore()

  // Поиск по сохранённым промтам.
  const [query, setQuery] = useState('')

  // Открытый в окне просмотра промт.
  const [openId, setOpenId] = useState<string | null>(null)

  // Редактор (создание/редактирование). editorId === null → создание нового.
  const [editorOpen, setEditorOpen] = useState(false)
  const [editorId, setEditorId] = useState<string | null>(null)

  // Временное уведомление (перенос / автосохранение) без внешних зависимостей.
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const notify = useCallback((message: string) => {
    setToast(message)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 2600)
  }, [])
  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
  }, [])

  const openPrompt = prompts.find((p) => p.id === openId) ?? null
  const editorPrompt = prompts.find((p) => p.id === editorId) ?? null

  const q = query.trim().toLowerCase()
  const visible = useMemo(() => {
    if (!q) return prompts
    return prompts.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        (p.description ?? '').toLowerCase().includes(q) ||
        p.body.toLowerCase().includes(q),
    )
  }, [prompts, q])

  function startCreate() {
    setEditorId(null)
    setEditorOpen(true)
  }
  function startEdit(id: string) {
    setEditorId(id)
    setEditorOpen(true)
    setOpenId(null)
  }
  function removePrompt(id: string) {
    deletePrompt(id)
    setOpenId(null)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
            <Sparkles className="size-5 text-primary" />
            Промты
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Библиотека сохранённых промтов-инструкций. Название и описание — в
            списке, полный текст открывается в отдельном окне. Копируйте,
            редактируйте и переносите промты между вкладками в один клик.
          </p>
        </div>
        <Button size="sm" onClick={startCreate}>
          <Wand2 className="size-4" />
          Новый промт
        </Button>
      </div>

      {/* Поиск по промтам */}
      {prompts.length > 0 ? (
        <div className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск по названию, описанию или тексту…"
            className="pl-9 pr-9"
            inputMode="search"
          />
          {query ? (
            <button
              type="button"
              aria-label="Очистить поиск"
              onClick={() => setQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          ) : null}
        </div>
      ) : null}

      {prompts.length === 0 ? (
        <div className="flex h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card text-center">
          <Sparkles className="size-8 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium">Промтов пока нет</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Создайте первый промт, чтобы сохранить полезную инструкцию.
          </p>
          <Button size="sm" className="mt-4" onClick={startCreate}>
            <Wand2 className="size-4" /> Создать промт
          </Button>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card p-3 sm:p-4">
          <div className="mb-3 flex items-center justify-between px-1">
            <h3 className="text-sm font-medium text-muted-foreground">
              {q ? 'Результаты поиска' : 'Все промты'}
            </h3>
            <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {visible.length} {pluralPrompts(visible.length)}
            </span>
          </div>

          {visible.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Ничего не найдено. Измените запрос поиска.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {visible.map((p) => (
                <PromptRow
                  key={p.id}
                  prompt={p}
                  onOpen={() => setOpenId(p.id)}
                  onEdit={() => startEdit(p.id)}
                  onDelete={() => deletePrompt(p.id)}
                />
              ))}
            </ul>
          )}
        </div>
      )}

      {/* ---- Окно просмотра промта (большое) ---- */}
      <Modal
        open={!!openPrompt}
        onClose={() => setOpenId(null)}
        title={openPrompt?.title ?? 'Промт'}
        description={
          openPrompt
            ? openPrompt.description?.trim()
              ? openPrompt.description
              : `Обновлено: ${new Date(openPrompt.updatedAt).toLocaleString('ru-RU')}`
            : undefined
        }
        size="xl"
      >
        {openPrompt ? (
          <div className="flex flex-col gap-4">
            <div className="max-h-[60vh] overflow-y-auto rounded-xl border border-border bg-background/40 p-4">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                {openPrompt.body || (
                  <span className="text-muted-foreground/60">Промт пуст</span>
                )}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-4">
              <span className="mr-auto inline-flex items-center gap-2 text-xs text-muted-foreground">
                <CopyButton
                  value={openPrompt.body}
                  ariaLabel="Скопировать весь текст промта"
                  onCopied={notify}
                />
                Копировать весь текст
              </span>
              <TransferMenu
                source="prompt"
                title={openPrompt.title}
                text={openPrompt.body}
                onRemove={() => removePrompt(openPrompt.id)}
                onDone={notify}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => startEdit(openPrompt.id)}
              >
                <Pencil className="size-3.5" /> Редактировать
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => removePrompt(openPrompt.id)}
                className="text-[color:var(--negative)]"
              >
                <Trash2 className="size-3.5" /> Удалить
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* ---- Редактор промта (создание / редактирование) ---- */}
      <PromptEditor
        open={editorOpen}
        prompt={editorPrompt}
        onClose={() => setEditorOpen(false)}
        onCreate={(data) => {
          const id = addPrompt(data)
          setEditorId(id)
          return id
        }}
        onUpdate={(id, patch) => updatePrompt(id, patch)}
        onNotify={notify}
      />

      {/* ---- Всплывающее уведомление ---- */}
      {toast ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[60] flex justify-center px-4">
          <div className="pointer-events-auto rounded-full border border-border bg-card px-4 py-2 text-sm text-foreground shadow-lg">
            {toast}
          </div>
        </div>
      ) : null}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Строка списка промтов: название + описание                          */
/* ------------------------------------------------------------------ */

function PromptRow({
  prompt,
  onOpen,
  onEdit,
  onDelete,
}: {
  prompt: PromptItem
  onOpen: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const description = prompt.description?.trim()
  return (
    <li className="group flex items-center gap-3 rounded-xl border border-border bg-background/40 p-3 transition-colors hover:border-primary/50 hover:bg-muted/40">
      <button
        type="button"
        onClick={onOpen}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Sparkles className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium text-foreground">
            {prompt.title}
          </span>
          <span className="mt-0.5 block truncate text-xs text-muted-foreground">
            {description || 'Без описания — нажмите, чтобы открыть промт'}
          </span>
        </span>
      </button>

      <div className="flex shrink-0 items-center gap-1">
        <CopyButton
          value={prompt.body}
          ariaLabel="Скопировать текст промта"
          className="size-8"
        />
        <button
          type="button"
          aria-label="Редактировать"
          onClick={onEdit}
          className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-primary"
        >
          <Pencil className="size-4" />
        </button>
        <button
          type="button"
          aria-label="Удалить"
          onClick={onDelete}
          className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-[color:var(--negative)]"
        >
          <Trash2 className="size-4" />
        </button>
        <ChevronRight className="ml-0.5 hidden size-4 text-muted-foreground sm:block" />
      </div>
    </li>
  )
}
