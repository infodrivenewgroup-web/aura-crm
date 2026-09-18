'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { PromptItem } from '@/lib/types'
import { Modal } from '@/components/crm/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { CopyButton } from '@/components/vpn/copy-button'
import { cn } from '@/lib/utils'
import { Check, Cloud, Loader2 } from 'lucide-react'

/** Интервал автосохранения черновика — 30 секунд. */
const AUTOSAVE_MS = 30_000

type SaveState = 'idle' | 'pending' | 'saved'

/**
 * Полноэкранный редактор промта: удобное большое поле ввода, отдельные поля
 * названия и описания, ручное сохранение и АВТОСОХРАНЕНИЕ каждые 30 секунд.
 *
 * При создании нового промта первое автосохранение создаёт запись в сторе и
 * далее обновляет её же (по возвращённому id), поэтому черновик не теряется.
 */
export function PromptEditor({
  open,
  prompt,
  onClose,
  onCreate,
  onUpdate,
  onNotify,
}: {
  open: boolean
  /** Редактируемый промт или null для создания нового. */
  prompt: PromptItem | null
  onClose: () => void
  onCreate: (data: { title: string; description: string; body: string }) => string
  onUpdate: (
    id: string,
    patch: Partial<Pick<PromptItem, 'title' | 'description' | 'body'>>,
  ) => void
  onNotify?: (message: string) => void
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [body, setBody] = useState('')
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null)

  // Текущий id создаваемой/редактируемой записи (может появиться при первом
  // автосохранении нового промта).
  const idRef = useRef<string | null>(null)
  // Последнее сохранённое значение — чтобы не сохранять без изменений.
  const savedRef = useRef<string>('')
  const autosaveTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  // Инициализация полей при открытии.
  useEffect(() => {
    if (!open) return
    idRef.current = prompt?.id ?? null
    const t = prompt?.title ?? ''
    const d = prompt?.description ?? ''
    const b = prompt?.body ?? ''
    setTitle(t)
    setDescription(d)
    setBody(b)
    savedRef.current = JSON.stringify({ t, d, b })
    setSaveState('idle')
    setLastSavedAt(prompt?.updatedAt ?? null)
  }, [open, prompt])

  const hasContent = title.trim() || description.trim() || body.trim()
  const dirty = JSON.stringify({ t: title, d: description, b: body }) !== savedRef.current

  /** Сохранение (используется и ручным «Сохранить», и автосохранением). */
  const persist = useCallback(
    (opts?: { silent?: boolean }) => {
      const t = title.trim() || 'Без названия'
      const d = description.trim()
      const b = body.trim()
      const snapshot = JSON.stringify({ t: title, d: description, b: body })
      // Нечего сохранять и запись ещё не создана — пропускаем.
      if (!hasContent && !idRef.current) return
      // Ничего не изменилось с прошлого сохранения — пропускаем.
      if (snapshot === savedRef.current && idRef.current) return

      if (idRef.current) {
        onUpdate(idRef.current, { title: t, description: d, body: b })
      } else {
        idRef.current = onCreate({ title: t, description: d, body: b })
      }
      savedRef.current = snapshot
      setLastSavedAt(Date.now())
      setSaveState('saved')
      if (!opts?.silent) onNotify?.('Промт сохранён')
    },
    [title, description, body, hasContent, onCreate, onUpdate, onNotify],
  )

  // Автосохранение каждые 30 секунд, пока окно открыто. `persist` пересоздаётся
  // при изменении полей, поэтому интервал всегда сохраняет актуальные значения.
  useEffect(() => {
    if (!open) return
    autosaveTimer.current = setInterval(() => {
      persist({ silent: true })
    }, AUTOSAVE_MS)
    return () => {
      if (autosaveTimer.current) clearInterval(autosaveTimer.current)
    }
  }, [open, persist])

  // Помечаем «ожидает сохранения» при изменениях.
  useEffect(() => {
    if (!open) return
    if (dirty) setSaveState('pending')
  }, [open, dirty])

  function handleSaveAndClose() {
    persist()
    onClose()
  }

  function handleClose() {
    // Сохраняем черновик перед закрытием, чтобы ничего не потерять.
    if (dirty && hasContent) persist({ silent: true })
    onClose()
  }

  const savedLabel =
    lastSavedAt != null
      ? `Сохранено в ${new Date(lastSavedAt).toLocaleTimeString('ru-RU', {
          hour: '2-digit',
          minute: '2-digit',
        })}`
      : 'Черновик не сохранён'

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={prompt ? 'Редактирование промта' : 'Новый промт'}
      description="Автосохранение каждые 30 секунд. Название и описание видны в списке."
      size="xl"
    >
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Название
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Например: Промт для генерации отзывов"
              className="font-medium"
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Описание (кратко)
            </label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Короткое пояснение для списка"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-muted-foreground">
              Текст промта
            </label>
            <span className="text-[11px] text-muted-foreground">
              {body.length.toLocaleString('ru-RU')} симв.
            </span>
          </div>
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Введите или вставьте полный текст промта-инструкции…"
            className="min-h-[45vh] resize-y font-mono text-[13px] leading-relaxed"
            spellCheck
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-4">
          <span className="mr-auto inline-flex items-center gap-2 text-xs text-muted-foreground">
            {saveState === 'pending' ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                Есть несохранённые изменения
              </>
            ) : (
              <>
                <Cloud
                  className={cn(
                    'size-3.5',
                    saveState === 'saved' && 'text-[color:var(--positive)]',
                  )}
                />
                {savedLabel}
              </>
            )}
          </span>
          <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            <CopyButton value={body} ariaLabel="Скопировать текст промта" onCopied={onNotify} />
            Копировать
          </span>
          <Button variant="outline" size="sm" onClick={handleClose}>
            Закрыть
          </Button>
          <Button size="sm" onClick={handleSaveAndClose} disabled={!hasContent}>
            <Check className="size-4" /> Сохранить
          </Button>
        </div>
      </div>
    </Modal>
  )
}
