'use client'

import { useState } from 'react'
import { Check, ChevronDown, Copy, Database, User } from 'lucide-react'
import type { SearchResult } from './use-search'
import { fieldLabel, formatValue } from '@/lib/search/format'

/* --------------------------- утилиты --------------------------- */

interface Group {
  title: string
  records: unknown[]
}

/** Приводит result.data к списку групп с записями. */
function toGroups(data: unknown): Group[] {
  if (data == null) return []
  if (Array.isArray(data)) return [{ title: 'Результаты', records: data }]
  if (typeof data === 'object') {
    const obj = data as Record<string, unknown>
    const entries = Object.entries(obj)
    const allArrays = entries.length > 0 && entries.every(([, v]) => Array.isArray(v))
    if (allArrays) {
      return entries.map(([title, v]) => ({ title, records: v as unknown[] }))
    }
    return [{ title: 'Результат', records: [obj] }]
  }
  return [{ title: 'Результат', records: [data] }]
}

function isTelegramRecord(rec: unknown): boolean {
  if (!rec || typeof rec !== 'object') return false
  const r = rec as Record<string, unknown>
  return 'username' in r || 'first_name' in r || ('number' in r && 'mails' in r)
}

async function copy(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

/* --------------------- кнопка копирования --------------------- */

function CopyButton({
  text,
  label,
  className,
}: {
  text: string
  label?: string
  className?: string
}) {
  const [done, setDone] = useState(false)
  return (
    <button
      type="button"
      onClick={async () => {
        if (await copy(text)) {
          setDone(true)
          setTimeout(() => setDone(false), 1200)
        }
      }}
      className={`inline-flex items-center gap-1.5 rounded-md border border-indigo-500/40 bg-indigo-500/10 px-2.5 py-1.5 text-xs font-medium text-indigo-200 transition-colors hover:bg-indigo-500/20 ${className ?? ''}`}
    >
      {done ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      {label ?? (done ? 'Скопировано' : 'Копировать')}
    </button>
  )
}

/* --------------------- строка поля записи --------------------- */

function FieldRow({ k, v }: { k: string; v: unknown }) {
  const [copied, setCopied] = useState(false)
  const text = formatValue(v)
  return (
    <button
      type="button"
      title="Нажмите, чтобы скопировать значение"
      onClick={async () => {
        if (await copy(text)) {
          setCopied(true)
          setTimeout(() => setCopied(false), 1000)
        }
      }}
      className="group flex w-full items-start justify-between gap-3 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-white/5"
    >
      <span className="shrink-0 text-xs font-medium text-indigo-300/80">
        {fieldLabel(k)}
      </span>
      <span className="flex items-start gap-1.5 break-all text-right text-sm text-slate-100">
        {text}
        {copied ? (
          <Check className="mt-0.5 size-3 shrink-0 text-emerald-400" />
        ) : (
          <Copy className="mt-0.5 size-3 shrink-0 text-slate-500 opacity-0 transition-opacity group-hover:opacity-100" />
        )}
      </span>
    </button>
  )
}

/* ----------------------- карточка записи ----------------------- */

function RecordCard({ rec, index }: { rec: unknown; index: number }) {
  const [open, setOpen] = useState(index < 5)
  const telegram = isTelegramRecord(rec)

  if (!rec || typeof rec !== 'object') {
    return (
      <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100">
        {String(rec)}
      </div>
    )
  }

  const entries = Object.entries(rec as Record<string, unknown>)
  const title = telegram
    ? [
        (rec as Record<string, unknown>).first_name,
        (rec as Record<string, unknown>).last_name,
      ]
        .filter(Boolean)
        .join(' ') ||
      ((rec as Record<string, unknown>).username as string) ||
      `Запись ${index + 1}`
    : `Запись ${index + 1}`

  return (
    <div className="overflow-hidden rounded-lg border border-white/10 bg-slate-900/60 transition-shadow hover:shadow-lg hover:shadow-indigo-900/20">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-slate-100">
          {telegram ? (
            <User className="size-4 text-indigo-400" />
          ) : (
            <Database className="size-4 text-indigo-400" />
          )}
          {title}
        </span>
        <ChevronDown
          className={`size-4 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="border-t border-white/10 p-2">
          <div className="flex flex-col divide-y divide-white/5">
            {entries.map(([k, v]) => (
              <FieldRow key={k} k={k} v={v} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* --------------------------- результат --------------------------- */

export function ResultView({ result }: { result: SearchResult }) {
  const groups = toGroups(result.data)
  const totalRecords = groups.reduce((n, g) => n + g.records.length, 0)
  const countsText =
    typeof result.counts === 'number'
      ? String(result.counts)
      : result.counts
        ? formatValue(result.counts)
        : String(totalRecords)

  return (
    <div className="flex flex-col gap-4">
      {/* Сводка */}
      <div className="rounded-xl border border-indigo-500/30 bg-gradient-to-br from-indigo-950/60 to-violet-950/40 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            <div>
              <span className="text-indigo-300/70">Найдено записей: </span>
              <span className="font-semibold text-white">{countsText}</span>
            </div>
            {result.kind && (
              <div>
                <span className="text-indigo-300/70">Тип: </span>
                <span className="font-semibold text-white">{result.kind}</span>
              </div>
            )}
            {result.cost != null && (
              <div>
                <span className="text-indigo-300/70">Списано: </span>
                <span className="font-semibold text-white">
                  ${result.cost.toFixed(2)}
                </span>
              </div>
            )}
            {result.requestId && (
              <div className="break-all">
                <span className="text-indigo-300/70">ID: </span>
                <span className="font-mono text-xs text-slate-300">
                  {result.requestId}
                </span>
              </div>
            )}
          </div>
          <CopyButton
            text={JSON.stringify(result.raw, null, 2)}
            label="Копировать как JSON"
          />
        </div>
      </div>

      {/* Данные */}
      {totalRecords === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-center text-sm text-slate-300">
          По данному запросу ничего не найдено.
        </div>
      ) : (
        groups.map((g) => (
          <div key={g.title} className="flex flex-col gap-2">
            {groups.length > 1 && (
              <h3 className="flex items-center gap-2 px-1 text-sm font-semibold text-indigo-200">
                <Database className="size-4" /> {g.title}
                <span className="text-xs font-normal text-slate-400">
                  ({g.records.length})
                </span>
              </h3>
            )}
            <div className="flex flex-col gap-2">
              {g.records.map((rec, i) => (
                <RecordCard key={i} rec={rec} index={i} />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
