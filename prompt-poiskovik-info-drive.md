# ПРОМТ ДЛЯ v0 — Создание вкладки «Поисковик» (INFO-DRIVE) с API Dyxless

> Скопируй всё, что ниже линии, в новый чат v0 твоего другого проекта.

---

## Задача

Создай в моём Next.js-проекте (App Router) отдельную самостоятельную страницу-поисковик данных под названием **«Поисковик» / INFO-DRIVE**, работающую через внешний API **Dyxless** (`https://api.dyxless.im`). Поисковик должен открываться по маршруту `/search`, а на главной странице/в меню сайта должна быть кнопка, ведущая на него. Внутри поисковика обязательно должна быть **кнопка «На главную»**, возвращающая на корневую страницу сайта (`/`).

Требования к архитектуре — соблюдать строго:

1. **Токен API никогда не должен попадать на клиент.** Токен используется ТОЛЬКО в серверном модуле. Клиент обращается исключительно к внутренним роутам `/api/*`, а они проксируют запрос на внешний API Dyxless, подставляя токен на сервере.
2. Токен берётся из переменной окружения `DYXLESS_TOKEN`, а при её отсутствии используется значение по умолчанию (тот же аккаунт/ключ): `8da72a3e-8f48-46ee-be70-19c0cebf26a8`.
3. Внешний базовый URL: `https://api.dyxless.im`.
4. Все внутренние роуты — `runtime = 'nodejs'`, `dynamic = 'force-dynamic'`.

### Переменная окружения

Добавь в проект переменную окружения:
- **Ключ:** `DYXLESS_TOKEN`
- **Значение:** `8da72a3e-8f48-46ee-be70-19c0cebf26a8`

(Если не задать — код всё равно подставит это же значение как fallback.)

---

## Соответствие внутренних роутов внешнему API

| Внутренний роут | Метод | Внешний путь Dyxless | Назначение |
|---|---|---|---|
| `/api/balance` | POST | `/query/balance` | Баланс + таблица цен |
| `/api/query` | POST | `/v2/query` | Стандартный / Telegram поиск (асинхронный) |
| `/api/query/combined` | POST | `/v2/query/combined` | Комбинированный поиск (псевдо-SQL) |
| `/api/query/inn-emails` | POST | `/v2/query/inn-emails` | Почты по ИНН |
| `/api/extended-search` | POST | `/v2/extended-search` | Расширенный поиск (асинхронный) |
| `/api/extended-search/catalog` | POST | `/v2/extended-search/catalog` | Каталог типов расширенного поиска (только токен) |
| `/api/requests/[requestId]` | GET | `/v2/requests/:requestId` | Опрос статуса асинхронной задачи |

**Логика асинхронности:** POST-запрос поиска возвращает `requestId` (или `request_id`/`id`). Клиент опрашивает `/api/requests/:requestId` каждые **2 секунды**, максимум **30 попыток** (тайм-аут ~1 минута). Когда `state`/`status` = `succeeded|success|done|completed` — показываем результат; `failed|error` — ошибка. Если результат пришёл сразу (синхронно) — показываем без опроса.

---

## Файлы, которые нужно создать (полный исходный код)

### 1. `lib/search/dyxless.ts` (серверный модуль — токен живёт здесь)

```ts
import 'server-only'

/**
 * Серверный модуль для работы с API dyxless.im.
 * Токен НИКОГДА не покидает сервер: клиент обращается только к внутренним
 * роутам /api/*, а они проксируют запрос на внешний API с подставленным токеном.
 */

const BASE_URL = 'https://api.dyxless.im'

// Токен берётся из переменной окружения, при отсутствии — значение по умолчанию,
// чтобы проект работал сразу после деплоя без дополнительной настройки.
const TOKEN =
  process.env.DYXLESS_TOKEN ?? '8da72a3e-8f48-46ee-be70-19c0cebf26a8'

/** Понятное русское сообщение для типовых HTTP-кодов внешнего API. */
function messageForStatus(status: number): string {
  switch (status) {
    case 400:
      return 'Некорректный запрос. Проверьте введённые данные.'
    case 401:
      return 'Неверный токен авторизации.'
    case 403:
      return 'Доступ запрещён или недостаточно средств.'
    case 404:
      return 'Запрос не найден.'
    case 429:
      return 'Слишком много запросов, подождите минуту.'
    case 500:
    case 502:
    case 503:
      return 'Сервис временно недоступен. Попробуйте позже.'
    default:
      return 'Произошла ошибка при обращении к сервису.'
  }
}

interface ProxyOptions {
  /** Путь на внешнем API, например '/v2/query'. */
  path: string
  /** HTTP-метод запроса к внешнему API. */
  method?: 'GET' | 'POST'
  /** Тело от клиента (без токена) — токен добавляется автоматически. */
  body?: Record<string, unknown>
}

/**
 * Выполняет запрос к внешнему API и возвращает Response для клиента
 * с тем же статус-кодом и JSON-телом ответа.
 */
export async function proxyToDyxless({
  path,
  method = 'POST',
  body,
}: ProxyOptions): Promise<Response> {
  const url = `${BASE_URL}${path}`

  try {
    const init: RequestInit = {
      method,
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    }
    if (method === 'POST') {
      init.body = JSON.stringify({ ...(body ?? {}), token: TOKEN })
    }

    const res = await fetch(url, init)

    // Пытаемся прочитать JSON; если не получилось — оборачиваем как ошибку.
    const text = await res.text()
    let data: unknown
    try {
      data = text ? JSON.parse(text) : {}
    } catch {
      data = { error: text || messageForStatus(res.status) }
    }

    if (!res.ok) {
      const payload =
        data && typeof data === 'object'
          ? { message: messageForStatus(res.status), ...(data as object) }
          : { message: messageForStatus(res.status), error: data }
      return Response.json(payload, { status: res.status })
    }

    return Response.json(data, { status: res.status })
  } catch {
    // Сетевая ошибка / внешний сервис недоступен.
    return Response.json(
      { message: 'Сервис временно недоступен. Попробуйте позже.' },
      { status: 503 },
    )
  }
}

/** Безопасно читает JSON-тело входящего запроса (или {} при ошибке). */
export async function readJson(req: Request): Promise<Record<string, unknown>> {
  try {
    const data = await req.json()
    return data && typeof data === 'object' ? (data as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}
```

### 2. `lib/search/format.ts` (клиентские утилиты форматирования)

```ts
// Клиентские утилиты форматирования результатов поиска (без серверного кода).

/** Человекочитаемые подписи для распространённых полей ответа. */
const FIELD_LABELS: Record<string, string> = {
  phone: 'Телефон',
  phones: 'Телефоны',
  number: 'Номер',
  email: 'Email',
  mails: 'Почты',
  emails: 'Почты',
  fio: 'ФИО',
  full_name: 'ФИО',
  first_name: 'Имя',
  last_name: 'Фамилия',
  middle_name: 'Отчество',
  username: 'Имя пользователя',
  birthday: 'Дата рождения',
  birth_day: 'День рождения',
  birth_month: 'Месяц рождения',
  birth_year: 'Год рождения',
  inn: 'ИНН',
  snils: 'СНИЛС',
  passport: 'Паспорт',
  address: 'Адрес',
  addresses: 'Адреса',
  locations: 'Локации',
  ip: 'IP-адрес',
  vin: 'VIN',
  grn: 'Гос. номер',
  driver_license: 'Водительское удостоверение',
  region: 'Регион',
  city: 'Город',
  country: 'Страна',
  source: 'Источник',
  database: 'База данных',
  tags: 'Теги',
  telegram_id: 'Telegram ID',
  user_id: 'ID пользователя',
  is_premium: 'Premium',
  last_online: 'Был в сети',
  registration: 'Регистрация',
  gender: 'Пол',
  operator: 'Оператор',
}

/** Возвращает подпись для ключа поля (или аккуратно форматирует сам ключ). */
export function fieldLabel(key: string): string {
  if (FIELD_LABELS[key]) return FIELD_LABELS[key]
  return key
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim()
}

/** Приводит произвольное значение к читаемой строке. */
export function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'boolean') return value ? 'Да' : 'Нет'
  if (typeof value === 'number') return String(value)
  if (Array.isArray(value)) {
    return value
      .map((v) => (typeof v === 'object' ? JSON.stringify(v) : String(v)))
      .join(', ')
  }
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

/** Таблица соответствия лимит → цена для типов с параметром limit (например inn_ul). */
export const LIMIT_PRICE_TABLE: { limit: number; price: number }[] = [
  { limit: 100, price: 1.0 },
  { limit: 1000, price: 10.0 },
  { limit: 10000, price: 100.0 },
  { limit: 30000, price: 300.0 },
]

/** Линейная цена за лимит: $0.01 за единицу (100 → $1.00, 30000 → $300.00). */
export function priceForLimit(limit: number): number {
  const safe = Math.min(30000, Math.max(1, Math.round(limit || 0)))
  return Math.round(safe) * 0.01
}

/** Форматирует доллары: 1.5 → "$1.50". */
export function usd(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return '—'
  return `$${amount.toFixed(2)}`
}

/** Валидация ИНН: 10 или 12 цифр. */
export function isValidInn(inn: string): boolean {
  return /^\d{10}$|^\d{12}$/.test(inn.trim())
}

/** Валидация даты YYYY-MM-DD. */
export function isValidDate(d: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return false
  const dt = new Date(d)
  return !Number.isNaN(dt.getTime())
}

/** Человекочитаемый статус задачи. */
export function statusLabel(state: string): string {
  switch (state) {
    case 'queued':
    case 'pending':
      return 'В очереди'
    case 'processing':
    case 'running':
    case 'in_progress':
      return 'Выполняется'
    case 'succeeded':
    case 'success':
    case 'done':
      return 'Завершён'
    case 'failed':
    case 'error':
      return 'Ошибка'
    default:
      return state || 'Обработка'
  }
}
```

### 3. Внутренние API-роуты

**`app/api/balance/route.ts`**
```ts
import { proxyToDyxless, readJson } from '@/lib/search/dyxless'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// POST /api/balance → /query/balance (баланс и таблица цен)
export async function POST(req: Request) {
  const body = await readJson(req)
  return proxyToDyxless({ path: '/query/balance', method: 'POST', body })
}
```

**`app/api/query/route.ts`**
```ts
import { proxyToDyxless, readJson } from '@/lib/search/dyxless'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// POST /api/query → /v2/query (стандартный / telegram поиск, асинхронный)
export async function POST(req: Request) {
  const body = await readJson(req)
  return proxyToDyxless({ path: '/v2/query', method: 'POST', body })
}
```

**`app/api/query/combined/route.ts`**
```ts
import { proxyToDyxless, readJson } from '@/lib/search/dyxless'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// POST /api/query/combined → /v2/query/combined (комбинированный поиск)
export async function POST(req: Request) {
  const body = await readJson(req)
  return proxyToDyxless({ path: '/v2/query/combined', method: 'POST', body })
}
```

**`app/api/query/inn-emails/route.ts`**
```ts
import { proxyToDyxless, readJson } from '@/lib/search/dyxless'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// POST /api/query/inn-emails → /v2/query/inn-emails (почты по ИНН)
export async function POST(req: Request) {
  const body = await readJson(req)
  return proxyToDyxless({ path: '/v2/query/inn-emails', method: 'POST', body })
}
```

**`app/api/extended-search/route.ts`**
```ts
import { proxyToDyxless, readJson } from '@/lib/search/dyxless'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// POST /api/extended-search → /v2/extended-search (асинхронный, вернёт requestId)
export async function POST(req: Request) {
  const body = await readJson(req)
  return proxyToDyxless({ path: '/v2/extended-search', method: 'POST', body })
}
```

**`app/api/extended-search/catalog/route.ts`**
```ts
import { proxyToDyxless } from '@/lib/search/dyxless'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// POST /api/extended-search/catalog → /v2/extended-search/catalog (только token)
export async function POST() {
  return proxyToDyxless({ path: '/v2/extended-search/catalog', method: 'POST' })
}
```

**`app/api/requests/[requestId]/route.ts`**
```ts
import { proxyToDyxless } from '@/lib/search/dyxless'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/requests/:requestId → /v2/requests/:requestId (опрос статуса задачи)
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ requestId: string }> },
) {
  const { requestId } = await params
  return proxyToDyxless({
    path: `/v2/requests/${encodeURIComponent(requestId)}`,
    method: 'GET',
  })
}
```

### 4. `components/search/use-search.ts` (клиентский хук: submit + опрос)

```ts
'use client'

import { useCallback, useRef, useState } from 'react'

/* ----------------------------- типы ----------------------------- */

export interface BalanceData {
  balance: number
  prices: Record<string, unknown> | null
}

export interface SearchResult {
  requestId?: string
  kind?: string
  counts?: unknown
  cost?: number | null
  state?: string
  data?: unknown
  raw: Record<string, unknown>
}

export type RunPhase =
  | 'idle'
  | 'submitting'
  | 'queued'
  | 'processing'
  | 'done'
  | 'error'
  | 'timeout'

const POLL_INTERVAL = 2000
const MAX_ATTEMPTS = 30

/* --------------------------- утилиты --------------------------- */

function pickRequestId(d: Record<string, unknown>): string | undefined {
  return (
    (d.requestId as string) ||
    (d.request_id as string) ||
    (d.id as string) ||
    undefined
  )
}

function extractCost(d: Record<string, unknown>): number | null {
  const c = d.cost ?? d.charged ?? d.price ?? d.debited
  return typeof c === 'number' ? c : null
}

/* ----------------------------- хук ----------------------------- */

export function useSearch() {
  const [balance, setBalance] = useState<BalanceData | null>(null)
  const [balanceLoading, setBalanceLoading] = useState(false)
  const [phase, setPhase] = useState<RunPhase>('idle')
  const [statusText, setStatusText] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [error, setError] = useState('')
  const [result, setResult] = useState<SearchResult | null>(null)
  const cancelled = useRef(false)

  /** Запрашивает текущий баланс и таблицу цен. */
  const fetchBalance = useCallback(async () => {
    setBalanceLoading(true)
    try {
      const res = await fetch('/api/balance', { method: 'POST' })
      const data = await res.json()
      if (res.ok && (data.status === true || typeof data.balance === 'number')) {
        setBalance({
          balance: typeof data.balance === 'number' ? data.balance : 0,
          prices: data.prices ?? null,
        })
      }
    } catch {
      /* баланс не критичен для загрузки страницы */
    } finally {
      setBalanceLoading(false)
    }
  }, [])

  const reset = useCallback(() => {
    cancelled.current = true
    setPhase('idle')
    setStatusText('')
    setAttempt(0)
    setError('')
    setResult(null)
  }, [])

  /** Опрос статуса задачи по requestId. */
  const poll = useCallback(
    async (requestId: string) => {
      for (let i = 1; i <= MAX_ATTEMPTS; i++) {
        if (cancelled.current) return
        setAttempt(i)
        await new Promise((r) => setTimeout(r, POLL_INTERVAL))
        if (cancelled.current) return

        let data: Record<string, unknown>
        try {
          const res = await fetch(`/api/requests/${encodeURIComponent(requestId)}`)
          data = await res.json()
          if (!res.ok) {
            setPhase('error')
            setError((data.message as string) || 'Ошибка при получении статуса.')
            return
          }
        } catch {
          setPhase('error')
          setError('Сервис временно недоступен. Попробуйте позже.')
          return
        }

        const state = String(data.state ?? data.status ?? '').toLowerCase()

        if (['succeeded', 'success', 'done', 'completed'].includes(state)) {
          const resultBlock = (data.result ?? data) as Record<string, unknown>
          setResult({
            requestId,
            kind: (data.kind as string) ?? (resultBlock.kind as string),
            counts: data.counts ?? resultBlock.counts,
            cost: extractCost(data) ?? extractCost(resultBlock),
            state,
            data: resultBlock.data ?? resultBlock.records ?? resultBlock.result ?? resultBlock,
            raw: data,
          })
          setPhase('done')
          return
        }
        if (['failed', 'error'].includes(state)) {
          setPhase('error')
          setError(
            (data.message as string) ||
              (data.error as string) ||
              'Поиск завершился с ошибкой.',
          )
          return
        }
        // ещё выполняется
        setPhase('processing')
        setStatusText('Выполняется…')
      }
      // вышли из цикла — тайм-аут
      setPhase('timeout')
      setError(
        'Время ожидания истекло (1 минута). Попробуйте проверить запрос позже.',
      )
    },
    [],
  )

  /**
   * Отправляет запрос к внутреннему роуту и при необходимости запускает опрос.
   * @param endpoint путь внутреннего API (например '/api/query')
   * @param body параметры запроса (без токена)
   */
  const submit = useCallback(
    async (endpoint: string, body: Record<string, unknown>) => {
      cancelled.current = false
      setError('')
      setResult(null)
      setAttempt(0)
      setPhase('submitting')
      setStatusText('Отправка запроса…')

      let data: Record<string, unknown>
      let httpStatus = 0
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        httpStatus = res.status
        data = await res.json()
      } catch {
        setPhase('error')
        setError('Сервис временно недоступен. Попробуйте позже.')
        return
      }

      // Ошибки внешнего API
      if (httpStatus >= 400 || data.status === false) {
        setPhase('error')
        setError(
          (data.message as string) ||
            (data.error as string) ||
            'Не удалось выполнить запрос.',
        )
        return
      }

      const requestId = pickRequestId(data)
      const state = String(data.state ?? data.status ?? '').toLowerCase()

      // Синхронный успешный ответ (на случай, если результат пришёл сразу)
      if (
        !requestId &&
        (data.data || data.result || ['succeeded', 'success', 'done'].includes(state))
      ) {
        const resultBlock = (data.result ?? data) as Record<string, unknown>
        setResult({
          kind: data.kind as string,
          counts: data.counts ?? resultBlock.counts,
          cost: extractCost(data),
          state: 'succeeded',
          data: resultBlock.data ?? resultBlock.records ?? resultBlock,
          raw: data,
        })
        setPhase('done')
        return
      }

      if (requestId) {
        setPhase('queued')
        setStatusText('В очереди…')
        await poll(requestId)
        return
      }

      // Непонятный ответ — показываем как есть
      setResult({ state: 'succeeded', data, raw: data })
      setPhase('done')
    },
    [poll],
  )

  return {
    balance,
    balanceLoading,
    fetchBalance,
    phase,
    statusText,
    attempt,
    maxAttempts: MAX_ATTEMPTS,
    error,
    result,
    submit,
    reset,
  }
}
```

### 5. `components/search/splash.tsx` (полноэкранная заставка INFO-DRIVE)

```tsx
'use client'

import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'

/**
 * Полноэкранная заставка INFO-DRIVE с эффектом свечения.
 * Через 2,5 секунды плавно исчезает и вызывает onDone().
 */
export function Splash({ onDone }: { onDone: () => void }) {
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    const fade = setTimeout(() => setLeaving(true), 2200)
    const done = setTimeout(onDone, 2800)
    return () => {
      clearTimeout(fade)
      clearTimeout(done)
    }
  }, [onDone])

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-950 transition-opacity duration-500 ${
        leaving ? 'opacity-0' : 'opacity-100'
      }`}
      aria-hidden={leaving}
    >
      <style>{`
        @keyframes idGlow {
          0%, 100% { text-shadow: 0 0 18px rgba(99,102,241,0.55), 0 0 42px rgba(139,92,246,0.35); }
          50% { text-shadow: 0 0 30px rgba(99,102,241,0.95), 0 0 70px rgba(139,92,246,0.6); }
        }
        @keyframes idRise {
          0% { opacity: 0; transform: translateY(16px) scale(0.96); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes idRing {
          0% { transform: scale(0.8); opacity: 0.7; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        .id-rise { animation: idRise 0.9s ease-out both; }
        .id-glow { animation: idGlow 2.2s ease-in-out infinite; }
        .id-ring { animation: idRing 2s ease-out infinite; }
      `}</style>

      <div className="id-rise relative flex size-28 items-center justify-center">
        <span className="id-ring absolute inset-0 rounded-full border border-indigo-400/60" />
        <span
          className="id-ring absolute inset-0 rounded-full border border-violet-400/50"
          style={{ animationDelay: '0.6s' }}
        />
        <span className="flex size-20 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-[0_0_40px_rgba(99,102,241,0.6)]">
          <Search className="size-10 text-white" strokeWidth={2.5} />
        </span>
      </div>

      <h1
        className="id-rise id-glow mt-8 font-mono text-4xl font-extrabold tracking-[0.25em] text-indigo-100 sm:text-5xl"
        style={{ animationDelay: '0.15s' }}
      >
        INFO-DRIVE
      </h1>
      <p
        className="id-rise mt-3 text-sm tracking-widest text-indigo-300/70"
        style={{ animationDelay: '0.3s' }}
      >
        ПОИСКОВИК ДАННЫХ
      </p>
    </div>
  )
}
```

### 6. `components/search/result-view.tsx` (отображение результатов, копирование)

```tsx
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
```

### 7. `components/search/prices-modal.tsx` (модалка баланса и цен)

```tsx
'use client'

import { useEffect } from 'react'
import { X, Wallet } from 'lucide-react'
import { usd } from '@/lib/search/format'
import type { BalanceData } from './use-search'

/** Модальное окно с балансом и таблицей цен по всем типам. */
export function PricesModal({
  balance,
  catalogTitles,
  onClose,
}: {
  balance: BalanceData | null
  catalogTitles: Record<string, string>
  onClose: () => void
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const prices = balance?.prices ?? null
  const standart = prices?.standart as number | undefined
  const telegram = prices?.telegram as number | undefined
  const innEmail = prices?.inn_email as
    | { price: number | null; available: boolean }
    | undefined
  const byType =
    (prices?.extended_search as { byType?: Record<string, number> } | undefined)
      ?.byType ?? {}

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Баланс и цены"
    >
      <div
        className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-indigo-500/30 bg-slate-950 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 p-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
            <Wallet className="size-5 text-indigo-400" /> Баланс и цены
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть"
            className="rounded-md p-1 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-4">
          <div className="mb-4 rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-4">
            <div className="text-xs text-indigo-300/80">Текущий баланс</div>
            <div className="mt-1 text-3xl font-bold text-white">
              {usd(balance?.balance ?? 0)}
            </div>
          </div>

          <h3 className="mb-2 text-sm font-semibold text-indigo-200">
            Базовые методы
          </h3>
          <div className="mb-4 flex flex-col gap-1 text-sm">
            <PriceRow label="Стандартный поиск" value={usd(standart)} />
            <PriceRow label="Telegram-поиск" value={usd(telegram)} />
            <PriceRow
              label="Почта по ИНН"
              value={
                innEmail?.available ? usd(innEmail.price) : 'Недоступно'
              }
            />
          </div>

          {Object.keys(byType).length > 0 && (
            <>
              <h3 className="mb-2 text-sm font-semibold text-indigo-200">
                Расширенный поиск ({Object.keys(byType).length} типов)
              </h3>
              <div className="flex flex-col gap-1 text-sm">
                {Object.entries(byType).map(([code, price]) => (
                  <PriceRow
                    key={code}
                    label={catalogTitles[code] ?? code}
                    value={usd(price)}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function PriceRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 odd:bg-white/[0.03]">
      <span className="text-slate-300">{label}</span>
      <span className="font-semibold text-white">{value}</span>
    </div>
  )
}
```

### 8. `components/search/search-client.tsx` (основной компонент формы) — с кнопкой «На главную»

```tsx
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
```

### 9. `app/search/page.tsx` (страница поисковика — маршрут `/search`)

```tsx
'use client'

import { useState } from 'react'
import { Splash } from '@/components/search/splash'
import { SearchClient } from '@/components/search/search-client'

export default function SearchPage() {
  const [ready, setReady] = useState(false)

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950/40 to-violet-950/30 text-slate-100">
      {!ready && <Splash onDone={() => setReady(true)} />}
      {ready && <SearchClient />}
    </main>
  )
}
```

### 10. Кнопка-ссылка на поисковик на главной странице / в меню

Добавь на главную страницу (или в навигацию/меню сайта) кнопку, открывающую поисковик в новой вкладке. Пример (Tailwind + lucide-react):

```tsx
import { Search } from 'lucide-react'

// ...внутри разметки главной страницы или меню:
<a
  href="/search"
  target="_blank"
  rel="noopener noreferrer"
  className="flex shrink-0 items-center gap-2 rounded-lg border border-indigo-500/40 bg-indigo-500/10 px-3 py-2 text-sm font-semibold transition-colors hover:bg-indigo-500/20"
>
  <Search className="size-4 text-indigo-500" />
  <span className="whitespace-nowrap">Поисковик</span>
</a>
```

---

## Зависимости

Проект использует Next.js (App Router) + Tailwind CSS + `lucide-react`. Если `lucide-react` ещё не установлен — установи его. Также нужен пакет `server-only` (обычно доступен в Next.js по умолчанию).

## Итоговый чек-лист (проверь перед завершением)

1. Переменная окружения `DYXLESS_TOKEN` = `8da72a3e-8f48-46ee-be70-19c0cebf26a8` добавлена (и есть fallback в коде).
2. Все 7 API-роутов созданы и проксируют на правильные внешние пути.
3. Токен нигде не используется на клиенте — только в `lib/search/dyxless.ts`.
4. Страница `/search` открывается, показывает заставку INFO-DRIVE, затем форму.
5. Работают все 4 метода: Стандартный, Комбинированный, Расширенный, Почта по ИНН.
6. Показывается баланс и модалка с ценами; каталог расширенного поиска подгружается.
7. Асинхронные задачи опрашиваются (2 сек × 30) с прогресс-баром; результаты отображаются карточками с копированием.
8. **Кнопка «На главную» (href="/") присутствует в шапке поисковика и работает.**
9. `tsc` проходит без ошибок.

Собери всё это, ничего не пропуская. После сборки открой `/search` и проверь, что кнопка «На главную» видна и ведёт на `/`.
