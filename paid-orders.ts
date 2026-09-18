import "server-only"
import { pool } from "@/lib/db"
import type {
  Cashbox,
  DailyBreakdownRow,
  PaidOrderInput,
  SyncMeta,
} from "@/lib/sales/types"

export type { Cashbox, DailyBreakdownRow, PaidOrderInput, SyncMeta }

/**
 * ====== Синхронизация оплаченных заявок из проекта с двумя кассами ======
 *
 * Данные приходят к нам ВЕБХУКОМ (fire-and-forget POST от «админ»-сайта касс).
 * Мы храним каждую оплаченную заявку одной строкой в таблице `paid_orders`.
 *
 * Принципы безопасности и надёжности:
 *  • Приём идемпотентен: заявка с тем же `id` не задваивается (UPSERT по id),
 *    поэтому повторная доставка вебхука не искажает статистику.
 *  • Таблица создаётся идемпотентно (CREATE TABLE IF NOT EXISTS) — как и весь
 *    проект, где нет отдельной системы миграций.
 *  • Наш приёмник НИКОГДА не пишет в чужую БД и ничего не запрашивает у
 *    «админ»-сайта: он лишь принимает данные. Поэтому работа проекта касс
 *    не может быть нарушена нашей стороной.
 *  • Все расчёты периодов — по московскому времени, как и остальной учёт.
 */

let tableReady: Promise<void> | null = null

/** Гарантирует наличие таблицы `paid_orders`. Выполняется один раз за процесс. */
export function ensurePaidOrdersTable(): Promise<void> {
  if (!tableReady) {
    tableReady = (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS paid_orders (
          id           text PRIMARY KEY,
          cashbox      text NOT NULL,
          amount       numeric NOT NULL DEFAULT 0,
          status       text NOT NULL DEFAULT 'paid',
          paid_at      timestamptz NOT NULL,
          received_at  timestamptz NOT NULL DEFAULT now()
        )
      `)
      await pool.query(
        `CREATE INDEX IF NOT EXISTS paid_orders_paid_at_idx ON paid_orders (paid_at)`,
      )
    })().catch((err) => {
      // Сбрасываем кеш, чтобы следующая попытка повторила создание таблицы.
      tableReady = null
      throw err
    })
  }
  return tableReady
}

/** Приводит произвольное написание кассы к каноническому виду. */
export function normalizeCashbox(raw: unknown): Cashbox | null {
  const v = String(raw ?? "")
    .trim()
    .toLowerCase()
  if (!v) return null
  if (v.includes("platega") || v.includes("платега") || v.includes("платёга")) {
    return "platega"
  }
  if (
    v.includes("kassera") ||
    v.includes("cashera") ||
    v.includes("kasher") ||
    v.includes("кашер") ||
    v.includes("кашера")
  ) {
    return "kassera"
  }
  return null
}

function toAmount(raw: unknown): number {
  const n =
    typeof raw === "number"
      ? raw
      : Number.parseFloat(String(raw ?? "").replace(/\s/g, "").replace(",", "."))
  return Number.isFinite(n) && n >= 0 ? n : 0
}

/**
 * Разбирает и валидирует одну заявку из тела вебхука.
 * Возвращает null, если запись некорректна (её просто пропускаем).
 */
export function parsePaidOrder(raw: unknown): PaidOrderInput | null {
  if (!raw || typeof raw !== "object") return null
  const o = raw as Record<string, unknown>

  const id = String(o.id ?? o.orderId ?? o.order_id ?? "").trim()
  if (!id) return null

  const cashbox = normalizeCashbox(o.cashbox ?? o.cash ?? o.kassa ?? o.касса)
  if (!cashbox) return null

  const status = String(o.status ?? "paid").trim().toLowerCase()

  const paidRaw = o.paidAt ?? o.paid_at ?? o.date ?? o.paidDate ?? o.time
  const paidDate = paidRaw ? new Date(String(paidRaw)) : new Date()
  if (Number.isNaN(paidDate.getTime())) return null

  return {
    id,
    cashbox,
    amount: toAmount(o.amount ?? o.sum ?? o.summa ?? o.сумма),
    status,
    paidAt: paidDate.toISOString(),
  }
}

/** Считается ли статус «оплачено». Учитываются частые варианты написания. */
export function isPaidStatus(status: string): boolean {
  const v = status.trim().toLowerCase()
  return (
    v === "paid" ||
    v === "оплачено" ||
    v === "оплачен" ||
    v === "success" ||
    v === "succeeded" ||
    v === "completed"
  )
}

/**
 * Сохраняет пачку оплаченных заявок идемпотентным UPSERT-ом.
 * Возвращает, сколько записей принято.
 */
export async function recordPaidOrders(
  orders: PaidOrderInput[],
): Promise<{ accepted: number }> {
  await ensurePaidOrdersTable()
  const paid = orders.filter((o) => isPaidStatus(o.status))
  if (paid.length === 0) return { accepted: 0 }

  const client = await pool.connect()
  try {
    await client.query("BEGIN")
    for (const o of paid) {
      await client.query(
        `INSERT INTO paid_orders (id, cashbox, amount, status, paid_at)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO UPDATE
           SET cashbox = EXCLUDED.cashbox,
               amount = EXCLUDED.amount,
               status = EXCLUDED.status,
               paid_at = EXCLUDED.paid_at,
               received_at = now()`,
        [o.id, o.cashbox, o.amount, "paid", o.paidAt],
      )
    }
    await client.query("COMMIT")
  } catch (err) {
    await client.query("ROLLBACK")
    throw err
  } finally {
    client.release()
  }
  return { accepted: paid.length }
}

/**
 * Возвращает разбивку оплаченных заявок по дням (московский календарь) и
 * кассам за диапазон [fromISO, toISO] включительно.
 */
export async function getDailyBreakdown(
  fromISO: string,
  toISO: string,
): Promise<DailyBreakdownRow[]> {
  await ensurePaidOrdersTable()
  const { rows } = await pool.query<{
    day: string
    cashbox: string
    cnt: string
    total: string
  }>(
    `SELECT
        to_char((paid_at AT TIME ZONE 'Europe/Moscow')::date, 'YYYY-MM-DD') AS day,
        cashbox,
        count(*)::int AS cnt,
        coalesce(sum(amount), 0)::float8 AS total
      FROM paid_orders
      WHERE status = 'paid'
        AND (paid_at AT TIME ZONE 'Europe/Moscow')::date >= $1::date
        AND (paid_at AT TIME ZONE 'Europe/Moscow')::date <= $2::date
      GROUP BY day, cashbox`,
    [fromISO, toISO],
  )

  const map = new Map<string, DailyBreakdownRow>()
  for (const r of rows) {
    const row =
      map.get(r.day) ??
      ({
        date: r.day,
        plategaCount: 0,
        plategaSum: 0,
        kasseraCount: 0,
        kasseraSum: 0,
        totalCount: 0,
        totalSum: 0,
      } satisfies DailyBreakdownRow)
    const cnt = Number(r.cnt) || 0
    const total = Number(r.total) || 0
    if (r.cashbox === "platega") {
      row.plategaCount += cnt
      row.plategaSum += total
    } else if (r.cashbox === "kassera") {
      row.kasseraCount += cnt
      row.kasseraSum += total
    }
    row.totalCount += cnt
    row.totalSum += total
    map.set(r.day, row)
  }
  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date))
}

/** Метаданные синхронизации для блока «техническое состояние». */
export async function getSyncMeta(): Promise<SyncMeta> {
  await ensurePaidOrdersTable()
  const { rows } = await pool.query<{
    total: string
    last_paid: string | null
    last_received: string | null
  }>(
    `SELECT
        count(*)::int AS total,
        max(paid_at) AS last_paid,
        max(received_at) AS last_received
      FROM paid_orders
      WHERE status = 'paid'`,
  )
  const r = rows[0]
  return {
    totalOrders: Number(r?.total) || 0,
    lastPaidAt: r?.last_paid ? new Date(r.last_paid).toISOString() : null,
    lastReceivedAt: r?.last_received ? new Date(r.last_received).toISOString() : null,
  }
}
