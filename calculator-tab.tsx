'use client'

import { useCallback, useEffect, useState } from 'react'
import { useStore } from '@/hooks/use-store'
import { Button } from '@/components/ui/button'
import { fmtNum } from '@/lib/format'
import {
  Calculator,
  Delete,
  NotebookPen,
  Pencil,
  Plus,
  Trash2,
  X,
  Check,
  BookOpen,
} from 'lucide-react'
import { cn } from '@/lib/utils'

/** Безопасный калькулятор: разбор и вычисление выражения без eval. */
function evaluate(expr: string): number {
  const tokens = tokenize(expr)
  const rpn = toRPN(tokens)
  return evalRPN(rpn)
}

type Tok = { t: 'num'; v: number } | { t: 'op'; v: string } | { t: 'paren'; v: '(' | ')' }

function tokenize(s: string): Tok[] {
  const out: Tok[] = []
  let i = 0
  const src = s.replace(/×/g, '*').replace(/÷/g, '/').replace(/,/g, '.').replace(/−/g, '-')
  while (i < src.length) {
    const c = src[i]
    if (c === ' ') {
      i++
      continue
    }
    if (/[0-9.]/.test(c)) {
      let num = ''
      while (i < src.length && /[0-9.]/.test(src[i])) {
        num += src[i]
        i++
      }
      out.push({ t: 'num', v: parseFloat(num) })
      continue
    }
    if ('+-*/%'.includes(c)) {
      // unary minus
      if (
        c === '-' &&
        (out.length === 0 || (out[out.length - 1].t === 'op') || (out[out.length - 1].t === 'paren' && out[out.length - 1].v === '('))
      ) {
        // negative number
        let num = '-'
        i++
        while (i < src.length && /[0-9.]/.test(src[i])) {
          num += src[i]
          i++
        }
        out.push({ t: 'num', v: parseFloat(num) })
        continue
      }
      out.push({ t: 'op', v: c })
      i++
      continue
    }
    if (c === '(' || c === ')') {
      out.push({ t: 'paren', v: c })
      i++
      continue
    }
    throw new Error('bad char')
  }
  return out
}

const PREC: Record<string, number> = { '+': 1, '-': 1, '*': 2, '/': 2, '%': 2 }

function toRPN(tokens: Tok[]): Tok[] {
  const out: Tok[] = []
  const ops: Tok[] = []
  for (const tk of tokens) {
    if (tk.t === 'num') out.push(tk)
    else if (tk.t === 'op') {
      while (
        ops.length &&
        ops[ops.length - 1].t === 'op' &&
        PREC[(ops[ops.length - 1] as any).v] >= PREC[tk.v]
      ) {
        out.push(ops.pop()!)
      }
      ops.push(tk)
    } else if (tk.v === '(') ops.push(tk)
    else {
      while (ops.length && !(ops[ops.length - 1].t === 'paren')) out.push(ops.pop()!)
      ops.pop() // remove (
    }
  }
  while (ops.length) out.push(ops.pop()!)
  return out
}

function evalRPN(rpn: Tok[]): number {
  const st: number[] = []
  for (const tk of rpn) {
    if (tk.t === 'num') st.push(tk.v)
    else if (tk.t === 'op') {
      const b = st.pop() ?? 0
      const a = st.pop() ?? 0
      switch (tk.v) {
        case '+':
          st.push(a + b)
          break
        case '-':
          st.push(a - b)
          break
        case '*':
          st.push(a * b)
          break
        case '/':
          st.push(b === 0 ? NaN : a / b)
          break
        case '%':
          st.push(a % b)
          break
      }
    }
  }
  const r = st.pop()
  if (r === undefined || !Number.isFinite(r)) throw new Error('bad expr')
  return Math.round((r + Number.EPSILON) * 1e6) / 1e6
}

const KEYS = [
  ['C', '(', ')', '÷'],
  ['7', '8', '9', '×'],
  ['4', '5', '6', '−'],
  ['1', '2', '3', '+'],
  ['0', '.', '⌫', '='],
]

/**
 * Подсказки-формулы для новичка. Каждая формула адаптирована под логику
 * нашего сервиса (заявка = 1999 ₽, комиссия кассы = 14%). По клику пример
 * подставляется в строку калькулятора, чтобы можно было посчитать вручную.
 */
const FORMULAS: {
  title: string
  formula: string
  hint: string
  example: string
}[] = [
  {
    title: 'Сумма заявок',
    formula: 'кол-во × 1999',
    hint: 'Доход от базовых заявок: количество заявок умножаем на цену 1999 ₽.',
    example: '10×1999',
  },
  {
    title: 'Комиссия кассы 14%',
    formula: 'сумма заявок × 0.14',
    hint: 'Касса удерживает 14% от суммы базовых заявок (иные поступления не облагаются).',
    example: '19990×0.14',
  },
  {
    title: 'Итог прихода',
    formula: '(заявки + иные) − возвраты',
    hint: 'Всё, что пришло за день, за вычетом возвратов клиентам.',
    example: '(19990+0)−0',
  },
  {
    title: 'Чистая прибыль',
    formula: 'приход − расход',
    hint: 'Из прихода вычитаем все расходы: комиссию, рекламу, зарплату, прочее.',
    example: '24990−2798.6',
  },
  {
    title: 'Рентабельность, %',
    formula: 'прибыль ÷ приход × 100',
    hint: 'Какую долю прихода составляет чистая прибыль. Чем выше — тем эффективнее.',
    example: '22191.4÷24990×100',
  },
  {
    title: 'ДРР (доля рекламы)',
    formula: 'реклама ÷ приход × 100',
    hint: 'Доля рекламных расходов в приходе. Ориентир — держать ниже 25–30%.',
    example: '2000÷24990×100',
  },
  {
    title: 'Найти % от числа',
    formula: 'число × процент ÷ 100',
    hint: 'Например, 14% от 50 000 ₽.',
    example: '50000×14÷100',
  },
  {
    title: 'Какой процент составляет',
    formula: 'часть ÷ целое × 100',
    hint: 'Например, какой процент 7000 ₽ от 50 000 ₽.',
    example: '7000÷50000×100',
  },
  {
    title: 'Средний чек',
    formula: 'приход ÷ кол-во заявок',
    hint: 'Сколько в среднем приносит одна заявка.',
    example: '24990÷10',
  },
]

export function CalculatorTab() {
  const { calcNotes, addCalcNote, updateCalcNote, deleteCalcNote } = useStore()
  const [expr, setExpr] = useState('')
  const [result, setResult] = useState<string>('0')
  const [error, setError] = useState(false)

  // Состояние панели заметок
  const [draft, setDraft] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingText, setEditingText] = useState('')

  const compute = useCallback(
    (commit: boolean) => {
      if (!expr.trim()) {
        setResult('0')
        setError(false)
        return
      }
      try {
        const r = evaluate(expr)
        setResult(fmtNum(r))
        setError(false)
        if (commit) {
          addCalcNote(`${expr} = ${fmtNum(r)}`)
          setExpr(String(r))
        }
      } catch {
        setError(true)
        if (!commit) setResult('Ошибка')
      }
    },
    [expr, addCalcNote],
  )

  // живой предпросмотр результата
  useEffect(() => {
    if (!expr.trim()) {
      setResult('0')
      setError(false)
      return
    }
    try {
      const r = evaluate(expr)
      setResult(fmtNum(r))
      setError(false)
    } catch {
      setError(true)
    }
  }, [expr])

  function press(key: string) {
    if (key === 'C') {
      setExpr('')
      setResult('0')
      setError(false)
      return
    }
    if (key === '⌫') {
      setExpr((e) => e.slice(0, -1))
      return
    }
    if (key === '=') {
      compute(true)
      return
    }
    setExpr((e) => e + key)
  }

  function saveDraft() {
    const text = draft.trim()
    if (!text) return
    addCalcNote(text)
    setDraft('')
  }

  function startEdit(id: string, text: string) {
    setEditingId(id)
    setEditingText(text)
  }

  function commitEdit() {
    if (editingId && editingText.trim()) {
      updateCalcNote(editingId, editingText.trim())
    }
    setEditingId(null)
    setEditingText('')
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
          <Calculator className="size-5 text-primary" />
          Калькулятор
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Поддерживает скобки и приоритет операций. Слева — подсказки-формулы, справа — заметки.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_1fr]">
        {/* Калькулятор */}
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-4 rounded-xl border border-border bg-background/50 p-4 text-right">
            <div className="thin-scroll min-h-6 overflow-x-auto whitespace-nowrap text-sm text-muted-foreground">
              {expr || '\u00A0'}
            </div>
            <div
              className={cn(
                'mt-1 text-3xl font-bold tabular-nums',
                error ? 'text-[color:var(--negative)]' : 'text-foreground',
              )}
            >
              {error ? 'Ошибка' : result}
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {KEYS.flat().map((k) => {
              const isOp = ['÷', '×', '−', '+', '='].includes(k)
              const isEq = k === '='
              const isClear = k === 'C'
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => press(k)}
                  className={cn(
                    'flex h-14 items-center justify-center rounded-xl border text-lg font-semibold transition-colors',
                    isEq &&
                      'bg-[color:var(--primary)] text-[color:var(--primary-foreground)] border-transparent hover:opacity-90',
                    isClear &&
                      'bg-[color:var(--destructive)]/15 text-[color:var(--destructive)] border-transparent',
                    isOp && !isEq &&
                      'bg-[color:var(--accent)]/15 text-[color:var(--accent)] border-transparent',
                    !isOp && !isClear &&
                      'border-border bg-background/40 text-foreground hover:bg-muted',
                  )}
                  aria-label={`Кнопка ${k}`}
                >
                  {k === '⌫' ? <Delete className="size-5" /> : k}
                </button>
              )
            })}
          </div>

          {/* Сноски-формулы */}
          <div className="mt-5">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <BookOpen className="size-4 text-primary" /> Подсказки-формулы
            </h3>
            <p className="mb-3 text-[11px] text-muted-foreground">
              Нажмите на формулу — пример подставится в калькулятор, и вы сможете посчитать свои
              значения.
            </p>
            <ul className="thin-scroll max-h-72 space-y-2 overflow-y-auto pr-1">
              {FORMULAS.map((f) => (
                <li key={f.title}>
                  <button
                    type="button"
                    onClick={() => setExpr(f.example)}
                    className="w-full rounded-lg border border-border bg-background/40 px-3 py-2 text-left transition-colors hover:border-primary/40 hover:bg-muted"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-foreground">{f.title}</span>
                      <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                        {f.formula}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{f.hint}</p>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Заметки */}
        <div className="rounded-2xl border border-border bg-card p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <NotebookPen className="size-4 text-muted-foreground" /> Заметки
          </h3>

          {/* Поле добавления заметки */}
          <div className="mb-4 flex flex-col gap-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Запишите расчёт, цель или важную цифру…"
              rows={3}
              className="thin-scroll w-full resize-y rounded-lg border border-border bg-background/50 px-3 py-2 text-sm outline-none focus:border-primary/50"
            />
            <div className="flex justify-end">
              <Button size="sm" onClick={saveDraft} disabled={!draft.trim()}>
                <Plus className="size-4" /> Сохранить заметку
              </Button>
            </div>
          </div>

          {calcNotes.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Заметок пока нет. Сохраните расчёт здесь или нажмите «=» в калькуляторе.
            </p>
          ) : (
            <ul className="thin-scroll max-h-[460px] space-y-1.5 overflow-y-auto">
              {calcNotes.map((c) => (
                <li
                  key={c.id}
                  className="group rounded-lg border border-border bg-background/40 px-3 py-2"
                >
                  {editingId === c.id ? (
                    <div className="flex flex-col gap-2">
                      <textarea
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        rows={2}
                        autoFocus
                        className="thin-scroll w-full resize-y rounded-md border border-primary/40 bg-background px-2 py-1.5 text-sm outline-none"
                      />
                      <div className="flex justify-end gap-1">
                        <Button size="xs" variant="ghost" onClick={() => setEditingId(null)}>
                          <X className="size-3" /> отмена
                        </Button>
                        <Button size="xs" onClick={commitEdit}>
                          <Check className="size-3" /> сохранить
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-2">
                      <button
                        type="button"
                        className="min-w-0 flex-1 break-words text-left font-mono text-sm hover:text-primary"
                        onClick={() => {
                          // если это вычисление вида "expr = result" — подставим результат
                          const rhs = c.text.includes('=') ? c.text.split('=').pop()?.trim() : ''
                          if (rhs && /^[-\d.\s]+$/.test(rhs)) setExpr(rhs.replace(/\s/g, ''))
                        }}
                        title="Подставить результат в калькулятор"
                      >
                        {c.text}
                      </button>
                      <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          type="button"
                          aria-label="Редактировать заметку"
                          onClick={() => startEdit(c.id, c.text)}
                          className="text-muted-foreground hover:text-primary"
                        >
                          <Pencil className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          aria-label="Удалить заметку"
                          onClick={() => deleteCalcNote(c.id)}
                          className="text-muted-foreground hover:text-[color:var(--negative)]"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
