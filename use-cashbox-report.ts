"use client"

import useSWR from "swr"
import type { CashboxReport } from "@/lib/sales/types"

async function fetcher(url: string): Promise<CashboxReport> {
  const res = await fetch(url, { cache: "no-store" })
  if (!res.ok) throw new Error(`Ошибка загрузки отчёта кассы (${res.status})`)
  return res.json()
}

/**
 * Живой отчёт кассы с автообновлением каждые 15 секунд.
 * Данные приходят из /api/sales/cashbox (только чтение из нашей БД —
 * проект касс при этом не затрагивается).
 */
export function useCashboxReport() {
  const { data, error, isLoading, mutate } = useSWR<CashboxReport>(
    "/api/sales/cashbox",
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
