'use client'

import { useEffect, useRef, useState } from 'react'
import { useStore } from '@/hooks/use-store'
import { htmlToText, textToHtml } from '@/lib/rich-text'
import { cn } from '@/lib/utils'
import {
  ArrowLeftRight,
  BookText,
  Copy,
  NotebookPen,
  Scissors,
  Sparkles,
} from 'lucide-react'

export type TransferKind = 'prompt' | 'note' | 'doc'

/** Целевые вкладки переноса с иконками и подписями. */
const TARGETS: {
  kind: TransferKind
  label: string
  icon: typeof Sparkles
}[] = [
  { kind: 'prompt', label: 'Промты', icon: Sparkles },
  { kind: 'note', label: 'Блокнот', icon: NotebookPen },
  { kind: 'doc', label: 'WORD AI', icon: BookText },
]

/**
 * Универсальное меню «Перенести запись» между вкладками «Промты», «Блокнот»
 * и «WORD AI». Содержимое автоматически конвертируется в формат целевой
 * вкладки (простой текст ↔ HTML) и сразу структурируется как отдельная запись.
 *
 * Поддерживает две операции:
 *  - «Копировать» — создаёт копию в целевой вкладке, оригинал остаётся;
 *  - «Переместить» — создаёт копию и удаляет оригинал (onRemove).
 */
export function TransferMenu({
  source,
  title,
  text,
  html,
  getHtml,
  onRemove,
  onDone,
  className,
}: {
  /** Тип исходной записи (не показывается как цель переноса). */
  source: TransferKind
  /** Заголовок записи. */
  title: string
  /** Текстовое представление содержимого (для промтов/заметок — тело). */
  text?: string
  /** HTML-представление (для документов «WORD AI»). Если нет — построим из text. */
  html?: string
  /** Геттер актуального HTML (для живого contentEditable — приоритетнее html). */
  getHtml?: () => string
  /** Удаление оригинала — включает операцию «Переместить». */
  onRemove?: () => void
  /** Вызывается после успешного переноса (например, чтобы закрыть окно). */
  onDone?: (message: string) => void
  className?: string
}) {
  const { addPrompt, addNote, addDoc, updateDoc } = useStore()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const safeTitle = title.trim() || 'Без названия'

  /** Актуальное содержимое в обоих форматах на момент переноса. */
  function resolveContent(): { plain: string; richHtml: string } {
    const liveHtml = getHtml?.() ?? html
    if (liveHtml != null) {
      // Источник — документ (HTML): текст получаем конвертацией.
      const plainFromHtml = (text ?? htmlToText(liveHtml)).trim()
      return { plain: plainFromHtml, richHtml: liveHtml }
    }
    // Источник — простой текст (промт/заметка): HTML строим из него.
    const plain = (text ?? '').trim()
    return { plain, richHtml: textToHtml(plain) }
  }

  /** Создаёт запись в целевой вкладке из текущего содержимого. */
  function addToTarget(target: TransferKind) {
    const { plain, richHtml } = resolveContent()
    if (target === 'prompt') {
      addPrompt({ title: safeTitle, description: '', body: plain })
    } else if (target === 'note') {
      addNote({ title: safeTitle, body: plain })
    } else {
      const id = addDoc(safeTitle)
      updateDoc(id, { html: richHtml })
    }
  }

  function targetLabel(target: TransferKind) {
    return TARGETS.find((t) => t.kind === target)?.label ?? ''
  }

  function handle(target: TransferKind, move: boolean) {
    addToTarget(target)
    if (move) onRemove?.()
    setOpen(false)
    onDone?.(
      move
        ? `Перемещено в «${targetLabel(target)}»`
        : `Скопировано в «${targetLabel(target)}»`,
    )
  }

  const targets = TARGETS.filter((t) => t.kind !== source)

  return (
    <div ref={ref} className={cn('relative inline-block', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background/40 px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeftRight className="size-3.5" />
        Перенести
      </button>

      {open ? (
        <div className="absolute right-0 z-50 mt-1.5 w-60 rounded-xl border border-border bg-card p-2 shadow-xl">
          <p className="px-2 pb-1.5 pt-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Копировать в
          </p>
          {targets.map((t) => (
            <button
              key={`copy-${t.kind}`}
              type="button"
              onClick={() => handle(t.kind, false)}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-foreground transition-colors hover:bg-muted"
            >
              <t.icon className="size-4 text-primary" />
              <span className="flex-1">{t.label}</span>
              <Copy className="size-3.5 text-muted-foreground" />
            </button>
          ))}

          {onRemove ? (
            <>
              <div className="my-1.5 border-t border-border/60" />
              <p className="px-2 pb-1.5 pt-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Переместить в
              </p>
              {targets.map((t) => (
                <button
                  key={`move-${t.kind}`}
                  type="button"
                  onClick={() => handle(t.kind, true)}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-foreground transition-colors hover:bg-muted"
                >
                  <t.icon className="size-4 text-primary" />
                  <span className="flex-1">{t.label}</span>
                  <Scissors className="size-3.5 text-muted-foreground" />
                </button>
              ))}
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

export { htmlToText }
