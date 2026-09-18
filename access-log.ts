'use server'

import { headers } from 'next/headers'
import { pool } from '@/lib/db'
import { requireSession } from '@/lib/auth/server'

/**
 * Журнал входов и присутствия.
 *
 * Таблица `access_log` доступна ТОЛЬКО на добавление и чтение — ни одно
 * действие здесь не обновляет и не удаляет записи, поэтому журнал входов
 * не может быть скорректирован или очищен из приложения.
 */

export interface AccessClientInfo {
  fingerprint?: string
  clientIp?: string
  platform?: string
  screen?: string
  timezone?: string
  language?: string
  cores?: string
  memory?: string
  touch?: string
  vendor?: string
}

export interface AccessLogRow {
  id: string
  createdAt: string
  outcome: 'success' | 'failure'
  ip: string | null
  fingerprint: string | null
  userAgent: string | null
  platform: string | null
  screen: string | null
  timezone: string | null
  language: string | null
  cores: string | null
  attemptNo: number | null
  info: Record<string, unknown>
}

export interface PresenceRow {
  sessionId: string
  firstSeen: string
  lastSeen: string
  ip: string | null
  fingerprint: string | null
  userAgent: string | null
  platform: string | null
}

/** Реальный IP-адрес из заголовков запроса (за прокси Vercel). */
async function serverIp(): Promise<string | null> {
  const h = await headers()
  const fwd = h.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0]?.trim() || null
  return h.get('x-real-ip')
}

async function serverUa(): Promise<string | null> {
  const h = await headers()
  return h.get('user-agent')
}

/**
 * Зафиксировать факт входа или попытку входа (append-only). Реальный IP и
 * User-Agent читаются на сервере; клиентские данные дополняют запись.
 */
export async function recordAccess(params: {
  outcome: 'success' | 'failure'
  attemptNo?: number
  client?: AccessClientInfo
}): Promise<{ ok: true }> {
  const { outcome, attemptNo, client = {} } = params
  const realIp = await serverIp()
  const ua = await serverUa()
  // Предпочитаем реальный серверный IP, иначе вычисленный на клиенте.
  const ip = realIp || client.clientIp || null

  await pool.query(
    `INSERT INTO access_log
       (outcome, ip, fingerprint, user_agent, platform, screen, timezone,
        language, cores, attempt_no, info)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb)`,
    [
      outcome,
      ip,
      client.fingerprint ?? null,
      ua,
      client.platform ?? null,
      client.screen ?? null,
      client.timezone ?? null,
      client.language ?? null,
      client.cores ?? null,
      attemptNo ?? null,
      JSON.stringify({
        clientIp: client.clientIp ?? null,
        memory: client.memory ?? null,
        touch: client.touch ?? null,
        vendor: client.vendor ?? null,
      }),
    ],
  )
  return { ok: true }
}

/** Отметить присутствие пользователя (heartbeat для списка «онлайн»). */
export async function heartbeat(params: {
  sessionId: string
  client?: AccessClientInfo
}): Promise<{ ok: true }> {
  const { sessionId, client = {} } = params
  if (!sessionId) return { ok: true }
  const realIp = await serverIp()
  const ua = await serverUa()
  const ip = realIp || client.clientIp || null

  await pool.query(
    `INSERT INTO presence (session_id, ip, fingerprint, user_agent, platform, last_seen, info)
     VALUES ($1,$2,$3,$4,$5, now(), $6::jsonb)
     ON CONFLICT (session_id)
     DO UPDATE SET last_seen = now(), ip = EXCLUDED.ip,
                   fingerprint = EXCLUDED.fingerprint,
                   user_agent = EXCLUDED.user_agent,
                   platform = EXCLUDED.platform`,
    [
      sessionId,
      ip,
      client.fingerprint ?? null,
      ua,
      client.platform ?? null,
      JSON.stringify({
        timezone: client.timezone ?? null,
        language: client.language ?? null,
        cores: client.cores ?? null,
      }),
    ],
  )
  return { ok: true }
}

/** Прочитать журнал входов (только чтение, по убыванию времени). */
export async function listAccessLog(limit = 200): Promise<AccessLogRow[]> {
  await requireSession()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let rows: any[]
  try {
    const res = await pool.query(
      `SELECT id, created_at, outcome, ip, fingerprint, user_agent, platform,
              screen, timezone, language, cores, attempt_no, info
         FROM access_log
        ORDER BY created_at DESC
        LIMIT $1`,
      [limit],
    )
    rows = res.rows
  } catch (e) {
    console.error('[v0] listAccessLog failed:', (e as Error).message)
    throw e
  }
  return rows.map((r) => ({
    id: String(r.id),
    createdAt: r.created_at.toISOString(),
    outcome: r.outcome,
    ip: r.ip,
    fingerprint: r.fingerprint,
    userAgent: r.user_agent,
    platform: r.platform,
    screen: r.screen,
    timezone: r.timezone,
    language: r.language,
    cores: r.cores,
    attemptNo: r.attempt_no,
    info: r.info ?? {},
  }))
}

/** Кто сейчас в системе — активность за последние 2 минуты. */
export async function listPresence(): Promise<PresenceRow[]> {
  await requireSession()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let rows: any[]
  try {
    const res = await pool.query(
      `SELECT session_id, first_seen, last_seen, ip, fingerprint, user_agent, platform
         FROM presence
        WHERE last_seen > now() - interval '2 minutes'
        ORDER BY last_seen DESC`,
    )
    rows = res.rows
  } catch (e) {
    console.error('[v0] listPresence failed:', (e as Error).message)
    throw e
  }
  return rows.map((r) => ({
    sessionId: r.session_id,
    firstSeen: r.first_seen.toISOString(),
    lastSeen: r.last_seen.toISOString(),
    ip: r.ip,
    fingerprint: r.fingerprint,
    userAgent: r.user_agent,
    platform: r.platform,
  }))
}
