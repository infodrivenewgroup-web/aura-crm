'use client'

import { useMemo, useState } from 'react'
import { useStore } from '@/hooks/use-store'
import { RichEditor } from '@/components/crm/notebook/rich-editor'
import { Modal } from '@/components/crm/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import {
  Check,
  FileText,
  Info,
  NotebookPen,
  Plus,
  Search,
  Sparkles,
  X,
} from 'lucide-react'

function plural(n: number) {
  if (n % 10 === 1 && n % 100 !== 11) return 'документ'
  if ([2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100)) return 'документа'
  return 'документов'
}

/** Краткий текстовый превью из HTML (для списка документов). */
function preview(html: string): string {
  if (typeof document === 'undefined') return ''
  const tmp = document.createElement('div')
  tmp.innerHTML = html
  return (tmp.textContent || '').replace(/\s+/g, ' ').trim()
}

export function NotebookTab() {
  const { docs, addDoc, updateDoc, deleteDoc } = useStore()

  const [activeId, setActiveId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [query, setQuery] = useState('')
  const [helpOpen, setHelpOpen] = useState(false)
  // На мобильных устройствах редактор открывается поверх списка.
  const [mobileEditor, setMobileEditor] = useState(false)

  const activeDoc = docs.find((d) => d.id === activeId) ?? null

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return docs
    return docs.filter(
      (d) =>
        d.title.toLowerCase().includes(q) ||
        preview(d.html).toLowerCase().includes(q),
    )
  }, [docs, query])

  function create() {
    const id = addDoc(newTitle)
    setNewTitle('')
    setCreating(false)
    setActiveId(id)
    setMobileEditor(true)
  }

  function openDoc(id: string) {
    setActiveId(id)
    setMobileEditor(true)
  }

  function removeActive() {
    if (!activeDoc) return
    deleteDoc(activeDoc.id)
    setActiveId(null)
    setMobileEditor(false)
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Заголовок раздела */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
            <NotebookPen className="size-5 text-primary" />
            WORD AI
          </h2>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <Sparkles className="size-3.5 text-[color:var(--primary)]" />
            Профессиональный текстовый редактор с ИИ-помощником
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setHelpOpen(true)}>
          <Info className="size-3.5" /> Инструкция
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[300px_1fr]">
        {/* Навигационное меню документов */}
        <aside
          className={cn(
            'flex-col gap-3 rounded-2xl border border-border bg-card p-3 sm:p-4',
            mobileEditor ? 'hidden lg:flex' : 'flex',
          )}
        >
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Поиск документа"
                className="h-9 pl-8"
              />
            </div>
            <Button
              size="icon-sm"
              onClick={() => setCreating((v) => !v)}
              aria-label="Новый документ"
              title="Новый документ"
            >
              {creating ? <X className="size-4" /> : <Plus className="size-4" />}
            </Button>
          </div>

          {creating && (
            <div className="rounded-xl border border-border bg-background/40 p-3">
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && create()}
                placeholder="Название документа"
                autoFocus
              />
              <div className="mt-2 flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setCreating(false)}>
                  Отмена
                </Button>
                <Button size="sm" onClick={create}>
                  <Check className="size-3.5" /> Создать
                </Button>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-medium text-muted-foreground">
              Мои документы
            </span>
            <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
              {docs.length} {plural(docs.length)}
            </span>
          </div>

          <div className="flex max-h-[60vh] flex-col gap-2 overflow-y-auto pr-0.5">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-8 text-center">
                <NotebookPen className="size-7 text-muted-foreground" />
                <p className="mt-2 text-sm font-medium">
                  {docs.length === 0 ? 'Документов пока нет' : 'Ничего не найдено'}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {docs.length === 0
                    ? 'Создайте первый документ.'
                    : 'Измените запрос поиска.'}
                </p>
              </div>
            ) : (
              filtered.map((d) => {
                const active = d.id === activeId
                const text = preview(d.html)
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => openDoc(d.id)}
                    className={cn(
                      'group flex w-full items-start gap-2.5 rounded-xl border p-2.5 text-left transition-colors',
                      active
                        ? 'border-[color:var(--primary)]/50 bg-[color:var(--primary)]/10'
                        : 'border-border bg-background/40 hover:border-primary/40 hover:bg-muted/60',
                    )}
                  >
                    <span
                      className={cn(
                        'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg',
                        active
                          ? 'bg-[color:var(--primary)]/20 text-[color:var(--primary)]'
                          : 'bg-primary/10 text-primary',
                      )}
                    >
                      <FileText className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-foreground">
                        {d.title}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                        {text || 'Пустой документ'}
                      </span>
                    </span>
                  </button>
                )
              })
            )}
          </div>
        </aside>

        {/* Область редактирования */}
        <section className={cn(mobileEditor ? 'block' : 'hidden lg:block')}>
          {activeDoc ? (
            <RichEditor
              key={activeDoc.id}
              doc={activeDoc}
              onChange={(html) => updateDoc(activeDoc.id, { html })}
              onTitleChange={(title) => updateDoc(activeDoc.id, { title })}
              onDelete={removeActive}
              onBack={() => setMobileEditor(false)}
            />
          ) : (
            <div className="flex h-full min-h-[50vh] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card p-6 text-center">
              <Sparkles className="size-9 text-[color:var(--primary)]" />
              <p className="mt-3 text-base font-semibold">Выберите или создайте документ</p>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">
                Полноценный редактор текста с форматированием и встроенным
                ИИ-помощником: проверка орфографии, улучшение, сокращение и
                расширение текста, выделение главной мысли и многое другое.
              </p>
              <Button className="mt-4" size="sm" onClick={() => setCreating(true)}>
                <Plus className="size-4" /> Создать документ
              </Button>
            </div>
          )}
        </section>
      </div>

      <InstructionsModal open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Инструкция по работе с вкладкой                                    */
/* ------------------------------------------------------------------ */

function Step({ children }: { children: React.ReactNode }) {
  return <li className="text-sm leading-relaxed text-foreground/90">{children}</li>
}

function InstructionsModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Как работать с вкладкой «WORD AI»"
      description="Профессиональный редактор текста с ИИ-помощником"
      size="lg"
    >
      <div className="flex flex-col gap-4">
        <section>
          <h3 className="mb-1.5 text-sm font-semibold text-foreground">
            1. Документы
          </h3>
          <ol className="ml-4 list-decimal space-y-1">
            <Step>
              Нажмите «+», введите название и создайте документ. Все документы
              хранятся в свёрнутом виде в левом меню — нажмите на любой, чтобы
              продолжить работу.
            </Step>
            <Step>
              Поиск вверху меню помогает быстро найти документ по названию или
              содержимому.
            </Step>
          </ol>
        </section>

        <section>
          <h3 className="mb-1.5 text-sm font-semibold text-foreground">
            2. Форматирование текста
          </h3>
          <ol className="ml-4 list-decimal space-y-1">
            <Step>
              Используйте верхнюю панель: жирный, курсив, подчёркивание, выбор
              шрифта и его размера, цвет текста, списки и выравнивание.
            </Step>
            <Step>
              Кнопки «Отменить»/«Повторить» и «Очистить форматирование» помогают
              быстро править оформление.
            </Step>
          </ol>
        </section>

        <section>
          <h3 className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-[color:var(--primary)]">
            <Sparkles className="size-4" /> 3. ИИ-помощник
          </h3>
          <ol className="ml-4 list-decimal space-y-1">
            <Step>
              <b>Выделите фрагмент</b> текста и нажмите ну��ную функцию (проверка
              орфографии и пунктуации, выравнивание по абзацам, улучшение,
              увеличение или сокращение объёма, главная мысль, профессиональное
              улучшение по вашим параметрам). Если ничего не выделено — ИИ
              обработает весь документ.
            </Step>
            <Step>
              ИИ <b>сначала покажет предлагаемый вариант</b> рядом с исходным
              текстом. Изменения вносятся в документ только после нажатия
              «Применить изменения» — иначе текст остаётся прежним.
            </Step>
            <Step>
              Кнопка <b>«Вернуть прежнюю версию»</b> откатывает последнюю правку
              ИИ к тексту до изменения.
            </Step>
          </ol>
        </section>

        <section>
          <h3 className="mb-1.5 text-sm font-semibold text-foreground">
            4. Сохранение
          </h3>
          <p className="text-sm leading-relaxed text-foreground/90">
            Текст сохраняется автоматически в облако и в локальную копию на
            устройстве — даже при отключении интернета изменения не потеряются и
            синхронизируются при восстановлении связи. Работает на телефоне,
            планшете и компьютере.
          </p>
        </section>

        <div className="flex justify-end border-t border-border/60 pt-4">
          <Button size="sm" onClick={onClose}>
            Понятно
          </Button>
        </div>
      </div>
    </Modal>
  )
}
