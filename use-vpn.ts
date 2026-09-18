'use client'

import useSWR from 'swr'
import type { Overview } from '@/data/vpn-guides'

/** Ошибка запроса к внутреннему API /api/vpn/*. */
export class ApiError extends Error {
  status: number
  notConfigured: boolean
  constructor(status: number, message: string, notConfigured = false) {
    super(message)
    this.status = status
    this.notConfigured = notConfigured
  }
}

/** Универсальный fetcher: бросает ApiError с понятным сообщением. */
export async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  const text = await res.text()
  let json: unknown = {}
  try {
    json = text ? JSON.parse(text) : {}
  } catch {
    json = {}
  }
  if (!res.ok) {
    const obj = (json ?? {}) as { message?: string; notConfigured?: boolean }
    throw new ApiError(
      res.status,
      obj.message ?? 'Не удалось выполнить запрос.',
      Boolean(obj.notConfigured),
    )
  }
  return json as T
}

/** Живая сводка по VPN: аккаунт, устройства, шлюзы, ресурсы, статусы. */
export function useOverview() {
  const { data, error, isLoading, mutate } = useSWR<Overview, ApiError>(
    '/api/vpn/overview',
    fetcher,
    {
      refreshInterval: 20000,
      revalidateOnFocus: true,
      shouldRetryOnError: (err) => !(err instanceof ApiError && err.status === 503),
    },
  )
  return { overview: data, error, isLoading, mutate }
}

/** Хелпер для мутаций (POST/PATCH/DELETE) с единым разбором ошибок. */
export async function mutateApi<T = unknown>(
  url: string,
  method: 'POST' | 'PATCH' | 'DELETE',
  body?: unknown,
): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let json: unknown = {}
  try {
    json = text ? JSON.parse(text) : {}
  } catch {
    json = {}
  }
  if (!res.ok) {
    const obj = (json ?? {}) as { message?: string; notConfigured?: boolean }
    throw new ApiError(res.status, obj.message ?? 'Действие не выполнено.', Boolean(obj.notConfigured))
  }
  return json as T
}
