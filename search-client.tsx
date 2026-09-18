'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  Loader2,
  RotateCcw,
  Search as SearchIcon,
  Wallet,
} from 'lucide-react'
import { useSearch } from './use-search'
import { ResultView } from './result-view'
import { PricesModal } from './prices-modal'
import {
  isValidDate,
  isValidInn,
  priceForLimit,
  statusLabel,
  usd,
} from '@/lib/search/format'

/* ----------------------------- типы ----------------------------- */

type Method = 'standart' | 'combined' | 'extended' | 'inn-emails'

interface CatalogItem {
  code: string
  titleRu: string
  titleEn: string
  primary: boolean
  fields: string[]
  compatibleInputTypes: string[]
  priceUsd: number
}

const METHODS: { id: Method; label: string }[] = [
  { id: 'standart', label: 'Стандартный' },
  { id: 'combined', label: 'Комбинированный' },
  { id: 'extended', label: 'Расширенный' },
  { id: 'inn-emails', label: 'Почта по ИНН' },
]

const SEARCH_TYPES = [
  { value: '', label: 'Автоопределение' },
  { value: 'phone', label: 'Телефон' },
  { value: 'email', label: 'Email' },
  { value: 'fio', label: 'ФИО' },
  { value: 'fio_dob', label: 'ФИО + дата рождения' },
  { value: 'inn', label: 'ИНН' },
  { value: 'snils', label: 'СНИЛС' },
  { value: 'passport', label: 'Паспорт' },
  { value: 'ip', label: 'IP-адрес' },
  { value: 'vin', label: 'VIN' },
  { value: 'username', label: 'Имя пользователя' },
]

const FIELD_PLACEHOLDERS: Record<string, string> = {
  last_name: 'Фамилия',
  first_name: 'Имя',
  middle_name: 'Отчество',
  birth_day: 'День (ДД)',
  birth_month: 'Месяц (ММ)',
  birth_year: 'Год (ГГГГ)',
  phone: 'Телефон',
  email: 'Email',
  inn: 'ИНН',
  snils: 'СНИЛС',
  passport: 'Серия и номер паспорта',
  address: 'Адрес',
  grn: 'Гос. номер авто',
  vin: 'VIN',
  driver_license: 'Водительское удостоверение',
}

/* --------------------- общие подкомпоненты --------------------- */

const inputCls =
  'w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition-colors focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'

function Field({
  id,
  label,
  children,
}: {
  id: string
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-medium text-indigo-200/80">
        {label}
      </label>
      {children}
    </div>
  )
}

/* ----------------------------- основной ----------------------------- */

export function SearchClient() {
  const {
    balance,
    fetchBalance,
    phase,
    statusText,
    attempt,
    maxAttempts,
    error,
    result,
    submit,
    reset,
  } = useSearch()

  const [method, setMethod] = useState<Method>('standart')
  const [showPrices, setShowPrices] = useState(false)
  const [catalog, setCatalog] = useState<CatalogItem[]>([])

  // Стандартный поиск
  const [query, setQuery] = useState('')
  const [stdType, setStdType] = useState<'standart' | 'telegram'>('standart')
  const [searchType, setSearchType] = useState('')
  const [birthday, setBirthday] = useState('')

  // Комбинированный
  const [combined, setCombined] = useState('')

  // Расширенный
  const [extCode, setExtCode] = useState('')
  const [extFields, setExtFields] = useState<Record<string, string>>({})
  const [limit, setLimit] = useState(100)

  // Почта по ИНН
  const [inn, setInn] = useState('')

  const [validationError, setValidationError] = useState('')

  /* --------- загрузка баланса и каталога при монтировании --------- */
  useEffect(() => {
    void fetchBalance()
    ;(async () => {
      try {
        const res = await fetch('/api/extended-search/catalog', { method: 'POST' })
        const data = await res.json()
        if (res.ok && Array.isArray(data.catalog)) setCatalog(data.catalog)
      } catch {
        /* каталог подгрузим позже */
      }
    })()
  }, [fetchBalance])

  // Обновляем баланс после каждого завершённого поиска.
  useEffect(() => {
    if (phase === 'done' || phase === 'error' || phase === 'timeout') {
      void fetchBalance()
    }
  }, [phase, fetchBalance])

  const catalogTitles = useMemo(() => {
    const map: Record<string, string> = {}
    for (const c of catalog) map[c.code] = c.titleRu
    return map
  }, [catalog])

  const selectedItem = useMemo(
    () => catalog.find((c) => c.code === extCode) ?? null,
    [catalog, extCode],
  )

  const hasLimit = useMemo(
    () => selectedItem?.fields.includes('limit') || extCode === 'inn_ul',
    [selectedItem, extCode],
  )

  /* ----------------------- расчёт стоимости ----------------------- */
  const cost = useMemo<number | null>(() => {
    const p = balance?.prices as Record<string, unknown> | undefined
    if (method === 'standart') {
      const v = stdType === 'telegram' ? p?.telegram : p?.standart
      return typeof v === 'number' ? v : null
    }
    if (method === 'combined') {
      return typeof p?.standart === 'number' ? (p.standart as number) : null
    }
    if (method === 'inn-emails') {
      const ie = p?.inn_email as { price: number | null } | undefined
      return ie?.price ?? null
    }
    if (method === 'extended' && selectedItem) {
      if (hasLimit) return priceForLimit(limit)
      return selectedItem.priceUsd
    }
    return null
  }, [method, stdType, balance, selectedItem, hasLimit, limit])

  const insufficient =
    cost != null && balance != null && balance.balance < cost

  const busy = ['submitting', 'queued', 'processing'].includes(phase)

  /* --------------------------- отправка --------------------------- */
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setValidationError('')

    if (method === 'standart') {
      if (!query.trim()) return setValidationError('Введите поисковый запрос.')
      if (searchType === 'fio' && birthday && !isValidDate(birthday))
        return setValidationError('Дата рождения должна быть в формате ГГГГ-ММ-ДД.')
      const body: Record<string, unknown> = { query: query.trim(), type: stdType }
      if (searchType) body.searchType = searchType
      if (searchType === 'fio' && birthday) body.birthday = birthday
      void submit('/api/query', body)
      return
    }
    if (method === 'combined') {
      if (!combined.trim())
        return setValidationError('Введите запрос для комбинированного поиска.')
      void submit('/api/query/combined', { query: combined.trim() })
      return
    }
    if (method === 'inn-emails') {
      if (!isValidInn(inn))
        return setValidationError('ИНН должен содержать 10 или 12 цифр.')
      void submit('/api/query/inn-emails', { inn: inn.trim() })
      return
    }
    if (method === 'extended') {
      if (!selectedItem) return setValidationError('Выберите тип поиска.')
      const params: Record<string, unknown> = { searchType: extCode }
      for (const f of selectedItem.fields) {
        if (f === 'limit') continue
        const val = (extFields[f] ?? '').trim()
        if (!val) return setValidationError(`Заполните поле «${FIELD_PLACEHOLDERS[f] ?? f}».`)
        params[f] = val
      }
      if (hasLimit) params.limit = limit
      void submit('/api/extended-search', params)
    }
  }

  /* ----------------------------- разметка ----------------------------- */
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:py-10">
      {/* Шапка */}
      <header className="mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          {/* Кнопка возврата на главную страницу сайта */}
          <a
            href="/"
            title="Вернуться на главную страницу"
            aria-label="Вернуться на главную страницу"
            className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-2.5 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10"
          >
            <ArrowLeft className="size-5 shrink-0" />
            <span className="hidden sm:inline">На главную</span>
          </a>
          <span className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-900/40">
            <SearchIcon className="size-5 text-white" />
          </span>
          <div>
            <h1 className="font-mono text-lg font-bold tracking-wide text-white">
              INFO-DRIVE
            </h1>
            <p className="text-xs text-indigo-300/60">Поисковик данных</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowPrices(true)}
          className="flex items-center gap-2 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-3 py-2 text-sm font-medium text-indigo-100 transition-colors hover:bg-indigo-500/20"
        >
          <Wallet className="size-4 text-indigo-400" />
          {balance ? usd(balance.balance) : '…'}
        </button>
      </header>

      {/* Выбор метода */}
      <div className="mb-5 grid grid-cols-2 gap-1.5 rounded-xl border border-white/10 bg-white/5 p-1.5 sm:grid-cols-4">
        {METHODS.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => {
              setMethod(m.id)
              reset()
              setValidationError('')
            }}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              method === m.id
                ? 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow'
                : 'text-slate-300 hover:bg-white/10'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Форма */}
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-white/10 bg-slate-900/50 p-4 sm:p-5"
      >
        {method === 'standart' && (
          <div className="flex flex-col gap-4">
            <Field id="query" label="Поисковый запрос">
              <input
                id="query"
                className={inputCls}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Телефон, email, ФИО, ИНН…"
              />
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field id="stdType" label="Источник">
                <select
                  id="stdType"
                  className={inputCls}
                  value={stdType}
                  onChange={(e) =>
                    setStdType(e.target.value as 'standart' | 'telegram')
                  }
                >
                  <option value="standart">Стандартный (базы)</option>
                  <option value="telegram">Telegram</option>
                </select>
              </Field>
              <Field id="searchType" label="Тип данных">
                <select
                  id="searchType"
                  className={inputCls}
                  value={searchType}
                  onChange={(e) => setSearchType(e.target.value)}
                >
                  {SEARCH_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            {searchType === 'fio' && (
              <Field id="birthday" label="Дата рождения (необязательно)">
                <input
                  id="birthday"
                  type="date"
                  className={inputCls}
                  value={birthday}
                  onChange={(e) => setBirthday(e.target.value)}
                />
              </Field>
            )}
          </div>
        )}

        {method === 'combined' && (
          <Field id="combined" label="Запрос (псевдо-SQL)">
            <textarea
              id="combined"
              rows={4}
              className={inputCls}
              value={combined}
              onChange={(e) => setCombined(e.target.value)}
              placeholder={`Например: phone = '79991234567' AND (fio = 'Иванов Иван' OR email = 'test@mail.ru')`}
            />
            <p className="mt-1 text-xs text-slate-500">
              Поля: phone, email, inn, passport, fio, fio_dob, birthday, snils,
              ip, vin, username. Операторы: AND, OR, скобки.
            </p>
          </Field>
        )}

        {method === 'extended' && (
          <div className="flex flex-col gap-4">
            <Field id="extCode" label="Тип поиска">
              <select
                id="extCode"
                className={inputCls}
                value={extCode}
                onChange={(e) => {
                  setExtCode(e.target.value)
                  setExtFields({})
                }}
              >
                <option value="">
                  {catalog.length ? 'Выберите тип…' : 'Загрузка каталога…'}
                </option>
                {catalog.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.titleRu} — {usd(c.priceUsd)}
                  </option>
                ))}
              </select>
            </Field>

            {selectedItem &&
              selectedItem.fields
                .filter((f) => f !== 'limit')
                .map((f) => (
                  <Field key={f} id={`ext-${f}`} label={FIELD_PLACEHOLDERS[f] ?? f}>
                    <input
                      id={`ext-${f}`}
                      className={inputCls}
                      value={extFields[f] ?? ''}
                      onChange={(e) =>
                        setExtFields((s) => ({ ...s, [f]: e.target.value }))
                      }
                      placeholder={FIELD_PLACEHOLDERS[f] ?? f}
                    />
                  </Field>
                ))}

            {selectedItem && hasLimit && (
              <Field id="limit" label={`Лимит записей: ${limit} — ${usd(priceForLimit(limit))}`}>
                <input
                  id="limit"
                  type="range"
                  min={1}
                  max={30000}
                  step={1}
                  value={limit}
                  onChange={(e) => setLimit(Number(e.target.value))}
                  className="w-full accent-indigo-500"
                />
                <div className="flex justify-between text-[11px] text-slate-500">
                  <span>1</span>
                  <span>30000</span>
                </div>
              </Field>
            )}
          </div>
        )}

        {method === 'inn-emails' && (
          <Field id="inn" label="ИНН">
            <input
              id="inn"
              className={inputCls}
              value={inn}
              onChange={(e) => setInn(e.target.value.replace(/\D/g, ''))}
              placeholder="10 или 12 цифр"
              inputMode="numeric"
            />
          </Field>
        )}

        {/* Стоимость и баланс */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm">
          <div className="flex items-center gap-3">
            <span className="text-slate-400">
              Стоимость:{' '}
              <span className="font-semibold text-white">
                {cost != null ? usd(cost) : '—'}
              </span>
            </span>
            <span className="text-slate-400">
              Баланс:{' '}
              <span className="font-semibold text-white">
                {balance ? usd(balance.balance) : '…'}
              </span>
            </span>
          </div>
        </div>

        {insufficient && (
          <p className="mt-3 flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-300">
            <AlertTriangle className="size-4 shrink-0" />
            Недостаточно средств для этой операции.
          </p>
        )}

        {validationError && (
          <p className="mt-3 flex items-center gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            <AlertTriangle className="size-4 shrink-0" />
            {validationError}
          </p>
        )}

        <button
          type="submit"
          disabled={busy || insufficient}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-900/40 transition-all hover:shadow-indigo-700/50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <SearchIcon className="size-4" />
          )}
          {busy ? 'Идёт поиск…' : 'Поиск'}
        </button>
      </form>

      {/* Прогресс */}
      {busy && (
        <div className="mt-5 rounded-2xl border border-indigo-500/30 bg-indigo-950/30 p-4">
          <div className="flex items-center gap-3">
            <Loader2 className="size-5 animate-spin text-indigo-400" />
            <div className="flex-1">
              <p className="text-sm font-medium text-white">
                {phase === 'submitting'
                  ? 'Отправка запроса…'
                  : statusText || statusLabel(phase)}
              </p>
              {(phase === 'queued' || phase === 'processing') && (
                <p className="text-xs text-indigo-300/70">
                  Опрос статуса: попытка {attempt} из {maxAttempts}
                </p>
              )}
            </div>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-500"
              style={{ width: `${Math.max(8, (attempt / maxAttempts) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Ошибка / тайм-аут */}
      {(phase === 'error' || phase === 'timeout') && error && (
        <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl border border-red-500/40 bg-red-950/30 p-4">
          <p className="flex items-center gap-2 text-sm text-red-300">
            <AlertTriangle className="size-4 shrink-0" /> {error}
          </p>
          <button
            type="button"
            onClick={reset}
            className="flex shrink-0 items-center gap-1.5 rounded-lg border border-white/15 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-white/10"
          >
            <RotateCcw className="size-3.5" /> Сброс
          </button>
        </div>
      )}

      {/* Результат */}
      {phase === 'done' && result && (
        <div className="mt-6">
          <ResultView result={result} />
        </div>
      )}

      {showPrices && (
        <PricesModal
          balance={balance}
          catalogTitles={catalogTitles}
          onClose={() => setShowPrices(false)}
        />
      )}
    </div>
  )
}
