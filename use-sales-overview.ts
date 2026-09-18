"use client"

import useSWR from "swr"
import type { OverviewReport } from "@/lib/sales/types"

async function fetcher(url: string): Promise<OverviewReport> {
  const res = await fetch(url, { cache: "no-store" })
  if (!res.ok) throw new Error(`Ошибка загрузки аналитики (${res.status})`)
  return res.json()
}

/**
 * Живой аналитический отчёт для главной с автообновлением каждые 15 секунд.
 * Данные приходят из /api/sales/overview (только чтение из нашей БД —
 * проект касс при этом не затрагивается).
 */
export function useSalesOverview() {
  const { data, error, isLoading, mutate } = useSWR<OverviewReport>(
    "/api/sales/overview",
    fetcher,
    {
      refreshInterval: 15000,
      revalidateOnFocus: true,
      keepPreviousData: true,
      dedupingInterval: 5000,
    },
  )

  return {
    report: data ?? null,
    error: error as Error | undefined,
    isLoading,
    refresh: mutate,
  }
}
