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
