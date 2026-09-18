'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { DocItem } from '@/lib/types'
import { transformText, type AiMode } from '@/app/actions/notebook-ai'
import { Modal } from '@/components/crm/modal'
import { TransferMenu } from '@/components/crm/transfer-menu'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Check,
  ChevronLeft,
  Cloud,
  Eraser,
  Italic,
  Lightbulb,
  List,
  ListOrdered,
  Loader2,
  Maximize2,
  Minimize2,
  Minus,
  Palette,
  Plus,
  Redo2,
  Save,
  Sparkles,
  SpellCheck,
  Trash2,
  Underline,
  Undo2,
  WandSparkles,
} from 'lucide-react'

/* ------------------------------------------------------------------ */
/* Конфигурация ИИ-функций                                            */
/* ------------------------------------------------------------------ */

interface AiAction {
  mode: AiMode
  label: string
  icon: typeof SpellCheck
  /** false — результат добавляется отдельным блоком (не заменяет фрагмент). */
  replaces: boolean
  /** требуется ввод параметров пользователем перед запуском. */
  needsInstruction?: boolean
}

const AI_ACTIONS: AiAction[] = [
  { mode: 'spelling', label: 'Орфография и пунктуация', icon: SpellCheck, replaces: true },
  { mode: 'paragraphs', label: 'Выровнять по абзацам', icon: AlignLeft, replaces: true },
  { mode: 'improve', label: 'Улучшить текст', icon: WandSparkles, replaces: true },
  { mode: 'expand', label: 'Увеличить объём', icon: Maximize2, replaces: true },
  { mode: 'shorten', label: 'Сократить объём', icon: Minimize2, replaces: true },
  { mode: 'main_idea', label: 'Главная мысль', icon: Lightbulb, replaces: false },
  {
    mode: 'professional',
    label: 'Проф. улучшение по параметрам',
    icon: Sparkles,
    replaces: true,
    needsInstruction: true,
  },
]

const FONTS = [
  { label: 'Шрифт по умолчанию', value: '' },
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Times New Roman', value: '"Times New Roman", serif' },
  { label: 'Courier', value: '"Courier New", monospace' },
  { label: 'Verdana', value: 'Verdana, sans-serif' },
]

// Реальные размеры в пикселях — меняются прямо в редакторе.
const SIZES = [12, 13, 14, 16, 18, 20, 24, 28, 32, 40, 48]
const DEFAULT_SIZE = 16
const MIN_SIZE = 8
const MAX_SIZE = 96

const COLORS = ['#e6e9ef', '#f5b301', '#2ea3ff', '#3ddc84', '#ff5d5d', '#b388ff', '#ff8a3d', '#9aa3b2']

/* ------------------------------------------------------------------ */
/* Вспомогательные функции                                            */
/* ------------------------------------------------------------------ */

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/** Превращает простой текст ИИ в аккуратный HTML с абзацами и переносами. */
function textToHtml(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, '<br>')}</p>`)
    .join('')
}

interface AiState {
  open: boolean
  action: AiAction | null
  status: 'params' | 'loading' | 'result' | 'error'
  scope: 'selection' | 'document'
  original: string
  suggested: string
  error: string
  instruction: string
}

const initialAi: AiState = {
  open: false,
  action: null,
  status: 'loading',
  scope: 'document',
  original: '',
  suggested: '',
  error: '',
  instruction: '',
}

export function RichEditor({
  doc,
  onChange,
  onTitleChange,
  onDelete,
  onBack,
}: {
  doc: DocItem
  onChange: (html: string) => void
  onTitleChange: (title: string) => void
  onDelete: () => void
  onBack: () => void
}) {
  const editorRef = useRef<HTMLDivElement | null>(null)
  const savedRange = useRef<Range | null>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [versions, setVersions] = useState<string[]>([])
  const [ai, setAi] = useState<AiState>(initialAi)
  const [savedHint, setSavedHint] = useState(false)
  const [title, setTitle] = useState(doc.title)
  const [curFont, setCurFont] = useState('')
  const [curSize, setCurSize] = useState(DEFAULT_SIZE)

  // Засев содержимого один раз при монтировании / смене документа
  // (компонент пересоздаётся по key={doc.id}, поэтому это безопасно).
  useEffect(() => {
    if (editorRef.current) editorRef.current.innerHTML = doc.html || ''
    setTitle(doc.title)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /** Запоминает текущее выделение внутри редактора (для ИИ-операций). */
  const captureSelection = useCallback(() => {
    const sel = window.getSelection()
    const el = editorRef.current
    if (!sel || sel.rangeCount === 0 || !el) return
    const range = sel.getRangeAt(0)
    if (el.contains(range.commonAncestorContainer)) {
      savedRange.current = range.cloneRange()
    }
  }, [])

  /**
   * Автосохранение содержимого раз в ~35 секунд (а не на каждое изменение).
   * Пока запланированное сохранение ещё не сработало, повторные правки НЕ
   * сбрасывают таймер — благодаря этому при непрерывном наборе изменения всё
   * равно сохраняются каждые ~35 секунд. В момент срабатывания записывается
   * актуальное содержимое редактора. Финальное сохранение при выходе из
   * документа гарантируется эффектом размонтирования ниже.
   */
  const scheduleSave = useCallback(() => {
    setSavedHint(false)
    if (saveTimer.current) return
    saveTimer.current = setTimeout(() => {
      saveTimer.current = null
      if (editorRef.current) onChange(editorRef.current.innerHTML)
      setSavedHint(true)
    }, 35000)
  }, [onChange])

  /**
   * Ручное сохранение по кнопке: мгновенно записывает актуальное содержимое
   * редактора, отменяя отложенный таймер автосохранения. Всегда пишет самый
   * свежий innerHTML, поэтому кнопка сохраняет ровно то, что видит пользователь.
   */
  const saveNow = useCallback(() => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current)
      saveTimer.current = null
    }
    if (editorRef.current) onChange(editorRef.current.innerHTML)
    setSavedHint(true)
  }, [onChange])

  // Гарантируем финальное сохранение при размонтировании/смене документа.
  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
      if (editorRef.current) onChange(editorRef.current.innerHTML)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const focusEditor = useCallback(() => {
    editorRef.current?.focus()
  }, [])

  /** Применяет команду форматирования к выделению. */
  const exec = useCallback(
    (command: string, value?: string) => {
      focusEditor()
      try {
        document.execCommand('styleWithCSS', false, 'true')
      } catch {
        /* не критично */
      }
      document.execCommand(command, false, value)
      scheduleSave()
    },
    [focusEditor, scheduleSave],
  )

  /** Есть ли непустое выделение внутри редактора. */
  const hasSelection = useCallback(() => {
    const sel = window.getSelection()
    const el = editorRef.current
    return Boolean(
      sel &&
        sel.rangeCount > 0 &&
        !sel.isCollapsed &&
        el &&
        el.contains(sel.getRangeAt(0).commonAncestorContainer),
    )
  }, [])

  /**
   * Пр��меняет размер шрифта (в px) мгновенно.
   * Есть выделение — меняет только его; нет — задаёт размер всему документу
   * и базовый размер для нового набираемого текста.
   */
  const applyFontSize = useCallback(
    (px: number) => {
      const size = Math.min(MAX_SIZE, Math.max(MIN_SIZE, Math.round(px)))
      setCurSize(size)
      focusEditor()
      const el = editorRef.current
      if (!el) return
      const selected = hasSelection()
      const sel = window.getSelection()

      if (!selected) {
        // базовый размер: мгновенно виден и наследуется новым текстом
        el.style.fontSize = `${size}px`
        // и распространяем на уже существующий текст
        if (el.textContent && sel) {
          const range = document.createRange()
          range.selectNodeContents(el)
          sel.removeAllRanges()
          sel.addRange(range)
        }
      }

      document.execCommand('styleWithCSS', false, 'false')
      document.execCommand('fontSize', false, '7')
      el.querySelectorAll('font[size="7"]').forEach((f) => {
        const span = f as HTMLElement
        span.removeAttribute('size')
        span.style.fontSize = `${size}px`
      })

      if (!selected) sel?.collapseToEnd()
      scheduleSave()
    },
    [focusEditor, hasSelection, scheduleSave],
  )

  /** Применяет семейство шрифта мгновенно (выделение или весь документ). */
  const applyFontName = useCallback(
    (value: string) => {
      setCurFont(value)
      focusEditor()
      const el = editorRef.current
      if (!el) return
      const selected = hasSelection()
      const sel = window.getSelection()

      if (!selected) {
        el.style.fontFamily = value
        if (el.textContent && sel) {
          const range = document.createRange()
          range.selectNodeContents(el)
          sel.removeAllRanges()
          sel.addRange(range)
        }
      }
      if (value) {
        document.execCommand('styleWithCSS', false, 'true')
        document.execCommand('fontName', false, value)
      } else {
        // сброс к шрифту по умолчанию
        el.style.fontFamily = ''
      }
      if (!selected) sel?.collapseToEnd()
      scheduleSave()
    },
    [focusEditor, hasSelection, scheduleSave],
  )

  /** Синхронизирует селекторы шрифта/размера с позицией каретки. */
  const syncControls = useCallback(() => {
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0) return
    let node: Node | null = sel.anchorNode
    if (node && node.nodeType === Node.TEXT_NODE) node = node.parentElement
    if (node && node instanceof Element && editorRef.current?.contains(node)) {
      const cs = window.getComputedStyle(node)
      const px = Math.round(parseFloat(cs.fontSize))
      if (px) setCurSize(px)
    }
  }, [])

  /* ----------------------------- ИИ ----------------------------- */

  function readScope(): { text: string; scope: 'selection' | 'document' } {
    const el = editorRef.current
    const sel = window.getSelection()
    if (
      sel &&
      sel.rangeCount > 0 &&
      !sel.isCollapsed &&
      el &&
      el.contains(sel.getRangeAt(0).commonAncestorContainer)
    ) {
      captureSelection()
      const text = sel.toString()
      if (text.trim()) return { text, scope: 'selection' }
    }
    savedRange.current = null
    return { text: el?.innerText ?? '', scope: 'document' }
  }

  async function runAi(action: AiAction, instruction: string, original: string) {
    setAi((s) => ({ ...s, status: 'loading' }))
    const res = await transformText({ mode: action.mode, text: original, instruction })
    if (res.ok) {
      setAi((s) => ({ ...s, status: 'result', suggested: res.text }))
    } else {
      setAi((s) => ({ ...s, status: 'error', error: res.error }))
    }
  }

  function startAi(action: AiAction) {
    const { text, scope } = readScope()
    if (!text.trim()) {
      setAi({
        ...initialAi,
        open: true,
        action,
        status: 'error',
        error: 'Документ пуст. Напишите или выделите текст.',
      })
      return
    }
    if (action.needsInstruction) {
      setAi({ ...initialAi, open: true, action, status: 'params', scope, original: text, instruction: '' })
      return
    }
    setAi({ ...initialAi, open: true, action, status: 'loading', scope, original: text })
    void runAi(action, '', text)
  }

  function pushVersion() {
    const html = editorRef.current?.innerHTML ?? ''
    setVersions((v) => [html, ...v].slice(0, 50))
  }

  function applyAi() {
    const el = editorRef.current
    if (!el || !ai.action) return
    pushVersion()
    el.focus()

    const html = textToHtml(ai.suggested)
    if (ai.action.replaces && ai.scope === 'selection' && savedRange.current) {
      const sel = window.getSelection()
      sel?.removeAllRanges()
      sel?.addRange(savedRange.current)
      document.execCommand('insertHTML', false, html)
    } else if (ai.action.replaces && ai.scope === 'document') {
      el.innerHTML = html
    } else {
      // Добавляем результат (например, «Главная мысль») отдельным блоком в конце.
      const block = `<hr/><p><strong>Главная мысль:</strong></p>${html}`
      el.innerHTML = el.innerHTML + block
    }
    onChange(el.innerHTML)
    setSavedHint(true)
    savedRange.current = null
    setAi(initialAi)
  }

  function revertVersion() {
    setVersions((v) => {
      if (v.length === 0) return v
      const [last, ...rest] = v
      if (editorRef.current) {
        editorRef.current.innerHTML = last
        onChange(last)
      }
      return rest
    })
  }

  /* --------------------------- разметка --------------------------- */

  const ToolbarButton = ({
    onClick,
    title: t,
    children,
  }: {
    onClick: () => void
    title: string
    children: React.ReactNode
  }) => (
    <button
      type="button"
      title={t}
      aria-label={t}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className="inline-flex size-8 items-center justify-center rounded-md border border-border bg-background/50 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      {children}
    </button>
  )

  return (
    <div className="flex min-h-[60vh] flex-col rounded-2xl border border-border bg-card">
      {/* Заголовок документа + действия */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border p-3 sm:p-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1 rounded-md border border-border bg-background/50 px-2 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground lg:hidden"
        >
          <ChevronLeft className="size-4" /> К списку
        </button>
        <Input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value)
            onTitleChange(e.target.value)
          }}
          placeholder="Название документа"
          className="h-9 min-w-40 flex-1 text-base font-semibold"
        />
        <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
          <Cloud className="size-3.5 text-[color:var(--positive)]" />
          {savedHint ? 'Сохранено' : 'Автосохранение'}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={saveNow}
          aria-label="Сохранить документ"
          title="Сохранить документ"
        >
          <Save className="size-3.5" /> Сохранить
        </Button>
        <TransferMenu
          source="doc"
          title={title}
          getHtml={() => editorRef.current?.innerHTML ?? doc.html}
          onRemove={onDelete}
        />
        <Button
          variant="destructive"
          size="sm"
          onClick={onDelete}
          aria-label="Удалить документ"
        >
          <Trash2 className="size-3.5" /> Удалить
        </Button>
      </div>

      {/* Панель форматирования */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-border bg-muted/30 p-2 sm:px-4">
        <ToolbarButton onClick={() => exec('bold')} title="Жирный">
          <Bold className="size-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => exec('italic')} title="Курсив">
          <Italic className="size-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => exec('underline')} title="Подчёркнутый">
          <Underline className="size-4" />
        </ToolbarButton>

        <span className="mx-1 h-6 w-px bg-border" />

        <select
          aria-label="Шрифт"
          value={curFont}
          onMouseDown={(e) => e.stopPropagation()}
          onChange={(e) => applyFontName(e.target.value)}
          className="h-8 rounded-md border border-border bg-background/50 px-2 text-xs text-foreground outline-none"
        >
          {FONTS.map((f) => (
            <option key={f.label} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>

        {/* Размер шрифта — меняется прямо в редакторе */}
        <div className="inline-flex items-center overflow-hidden rounded-md border border-border bg-background/50">
          <button
            type="button"
            title="Уменьшить шрифт"
            aria-label="Уменьшить шрифт"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => applyFontSize(curSize - 1)}
            className="flex size-8 items-center justify-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Minus className="size-3.5" />
          </button>
          <select
            aria-label="Размер шрифта"
            value={SIZES.includes(curSize) ? String(curSize) : ''}
            onMouseDown={(e) => e.stopPropagation()}
            onChange={(e) => applyFontSize(Number(e.target.value))}
            className="h-8 w-14 border-x border-border bg-transparent px-1 text-center text-xs text-foreground outline-none"
          >
            {!SIZES.includes(curSize) && (
              <option value="">{curSize}</option>
            )}
            {SIZES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <button
            type="button"
            title="Увеличить шрифт"
            aria-label="Увеличить шрифт"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => applyFontSize(curSize + 1)}
            className="flex size-8 items-center justify-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Plus className="size-3.5" />
          </button>
        </div>

        {/* Цвет текста */}
        <label
          title="Цвет текста"
          className="inline-flex size-8 cursor-pointer items-center justify-center rounded-md border border-border bg-background/50 text-muted-foreground hover:text-foreground"
        >
          <Palette className="size-4" />
          <input
            type="color"
            className="sr-only"
            onChange={(e) => exec('foreColor', e.target.value)}
          />
        </label>
        <div className="flex items-center gap-1">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              title={`Цвет ${c}`}
              aria-label={`Цвет ${c}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => exec('foreColor', c)}
              className="size-5 rounded-full border border-border/70"
              style={{ backgroundColor: c }}
            />
          ))}
        </div>

        <span className="mx-1 h-6 w-px bg-border" />

        <ToolbarButton onClick={() => exec('insertUnorderedList')} title="Маркированный список">
          <List className="size-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => exec('insertOrderedList')} title="Нумерованный список">
          <ListOrdered className="size-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => exec('justifyLeft')} title="По левому краю">
          <AlignLeft className="size-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => exec('justifyCenter')} title="По центру">
          <AlignCenter className="size-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => exec('justifyRight')} title="По правому краю">
          <AlignRight className="size-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => exec('justifyFull')} title="По ширине">
          <AlignJustify className="size-4" />
        </ToolbarButton>

        <span className="mx-1 h-6 w-px bg-border" />

        <ToolbarButton onClick={() => exec('removeFormat')} title="Очистить форматирование">
          <Eraser className="size-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => exec('undo')} title="Отменить">
          <Undo2 className="size-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => exec('redo')} title="Повторить">
          <Redo2 className="size-4" />
        </ToolbarButton>
      </div>

      {/* Панель ИИ-помощника */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-border bg-[color:var(--primary)]/5 p-2 sm:px-4">
        <span className="mr-1 inline-flex items-center gap-1 text-[11px] font-semibold text-[color:var(--primary)]">
          <Sparkles className="size-3.5" /> ИИ-помощник
        </span>
        {AI_ACTIONS.map((a) => {
          const Icon = a.icon
          return (
            <button
              key={a.mode}
              type="button"
              onClick={() => startAi(a)}
              className="inline-flex items-center gap-1.5 rounded-md border border-[color:var(--primary)]/30 bg-[color:var(--primary)]/10 px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-[color:var(--primary)]/20"
            >
              <Icon className="size-3.5 text-[color:var(--primary)]" />
              {a.label}
            </button>
          )
        })}
        <button
          type="button"
          onClick={revertVersion}
          disabled={versions.length === 0}
          title="Вернуть версию до последней правки ИИ"
          className="ml-auto inline-flex items-center gap-1.5 rounded-md border border-border bg-background/60 px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
        >
          <Undo2 className="size-3.5" /> Вернуть прежнюю версию
          {versions.length > 0 ? ` (${versions.length})` : ''}
        </button>
      </div>

      {/* Поле редактирования */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label="Текст документа"
        onInput={scheduleSave}
        onMouseUp={() => {
          captureSelection()
          syncControls()
        }}
        onKeyUp={() => {
          captureSelection()
          syncControls()
        }}
        className="notebook-editor flex-1 overflow-y-auto px-4 py-4 text-[15px] leading-relaxed text-foreground/90 outline-none sm:px-6 sm:py-5"
        data-placeholder="Начните вводить текст документа…"
      />

      {/* Окно предпросмотра результата ИИ */}
      <Modal
        open={ai.open}
        onClose={() => setAi(initialAi)}
        title={ai.action ? ai.action.label : 'ИИ-помощник'}
        description={
          ai.scope === 'selection'
            ? 'Обработка выделенного фрагмента'
            : 'Обработка всего документа'
        }
        size="lg"
      >
        {ai.status === 'params' && ai.action && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              Опишите, как именно улучшить текст: стиль, тон, аудитория, формат и
              другие пожелания.
            </p>
            <Textarea
              value={ai.instruction}
              onChange={(e) => setAi((s) => ({ ...s, instruction: e.target.value }))}
              placeholder="Например: сделать деловой тон, структурировать по пунктам, для делового письма…"
              rows={4}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setAi(initialAi)}>
                Отмена
              </Button>
              <Button
                size="sm"
                onClick={() => ai.action && void runAi(ai.action, ai.instruction, ai.original)}
                disabled={!ai.instruction.trim()}
              >
                <Sparkles className="size-3.5" /> Сгенерировать
              </Button>
            </div>
          </div>
        )}

        {ai.status === 'loading' && (
          <div className="flex flex-col items-center justify-center gap-3 py-10 text-muted-foreground">
            <Loader2 className="size-6 animate-spin text-[color:var(--primary)]" />
            <p className="text-sm">ИИ обрабатывает текст…</p>
          </div>
        )}

        {ai.status === 'error' && (
          <div className="flex flex-col gap-4">
            <p className="rounded-md border border-[color:var(--negative)]/40 bg-[color:var(--negative)]/10 px-3 py-2 text-sm text-[color:var(--negative)]">
              {ai.error}
            </p>
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setAi(initialAi)}>
                Закрыть
              </Button>
            </div>
          </div>
        )}

        {ai.status === 'result' && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="flex flex-col">
                <span className="mb-1 text-xs font-medium text-muted-foreground">
                  Было
                </span>
                <div className="max-h-[40vh] overflow-y-auto whitespace-pre-wrap rounded-lg border border-border bg-background/40 p-3 text-sm text-foreground/70">
                  {ai.original}
                </div>
              </div>
              <div className="flex flex-col">
                <span className="mb-1 text-xs font-medium text-[color:var(--primary)]">
                  Предложение ИИ
                </span>
                <div className="max-h-[40vh] overflow-y-auto whitespace-pre-wrap rounded-lg border border-[color:var(--primary)]/40 bg-[color:var(--primary)]/5 p-3 text-sm text-foreground">
                  {ai.suggested}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap justify-end gap-2 border-t border-border/60 pt-4">
              <Button variant="outline" size="sm" onClick={() => setAi(initialAi)}>
                Отклонить
              </Button>
              <Button size="sm" onClick={applyAi}>
                <Check className="size-3.5" />
                {ai.action && !ai.action.replaces ? 'Добавить в документ' : 'Применить изменения'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
