"use client"

import useSWR from "swr"
import type { SalesStats } from "@/lib/sales/types"

async function fetcher(url: string): Promise<SalesStats> {
  const res = await fetch(url, { cache: "no-store" })
  if (!res.ok) throw new Error(`Ошибка загрузки статистики (${res.status})`)
  return res.json()
}

/**
 * Живая статистика продаж с автообновлением каждые 15 секунд.
 * Данные приходят из /api/sales/stats (только чтение из нашей БД —
 * проект касс при этом не затрагивается).
 */
export function useSalesStats() {
  const { data, error, isLoading, mutate } = useSWR<SalesStats>(
    "/api/sales/stats",
    fetcher,
    {
      refreshInterval: 15000,
      revalidateOnFocus: true,
      keepPreviousData: true,
      dedupingInterval: 5000,
    },
  )

  return {
    stats: data ?? null,
    error: error as Error | undefined,
    isLoading,
    refresh: mutate,
  }
}
