"use client"

import useSWR from "swr"
import type { DailyBreakdownRow } from "@/lib/sales/types"

const fetcher = async (url: string): Promise<{ day: DailyBreakdownRow }> => {
  const res = await fetch(url, { cache: "no-store" })
  if (!res.ok) throw new Error(`request failed: ${res.status}`)
  return res.json()
}

/**
 * Живая разбивка синхронизированных оплаченных заявок за конкретный день
 * (по кассам). Обновляется каждые 20 секунд. Используется в форме баланса,
 * чтобы можно было сверить/подставить количество принятых заявок.
 */
export function useDayOrders(date: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    date ? `/api/sales/day?date=${date}` : null,
    fetcher,
    { refreshInterval: 20000, revalidateOnFocus: true },
  )

  return {
    day: data?.day ?? null,
    isLoading,
    isError: Boolean(error),
    refresh: mutate,
  }
}
