"use server"

import { pool } from "@/lib/db"
import { requireSession } from "@/lib/auth/server"

const WORKSPACE = "default"

/**
 * Allowed collection keys. Restricting writes to a known set prevents arbitrary
 * keys from being written to the store.
 */
const ALLOWED_KEYS = ["days", "notes", "tools", "sites", "calcNotes", "bots", "contacts", "emails", "employees", "docs", "vault", "prompts"] as const
export type StateKey = (typeof ALLOWED_KEYS)[number]

export type AllState = Partial<Record<StateKey, unknown>>

/** Load every collection for the workspace in a single round-trip. */
export async function loadAllState(): Promise<AllState> {
  await requireSession()
  const { rows } = await pool.query<{ key: string; value: unknown }>(
    "SELECT key, value FROM app_state WHERE workspace = $1",
    [WORKSPACE],
  )
  const result: AllState = {}
  for (const row of rows) {
    if ((ALLOWED_KEYS as readonly string[]).includes(row.key)) {
      result[row.key as StateKey] = row.value
    }
  }
  return result
}

/**
 * Persist a single collection as an atomic upsert. Returns the server
 * timestamp so callers can reason about freshness if needed.
 */
export async function saveState(key: StateKey, value: unknown): Promise<{ ok: true }> {
  await requireSession()
  if (!(ALLOWED_KEYS as readonly string[]).includes(key)) {
    throw new Error(`Invalid state key: ${key}`)
  }
  await pool.query(
    `INSERT INTO app_state (workspace, key, value, updated_at)
     VALUES ($1, $2, $3::jsonb, now())
     ON CONFLICT (workspace, key)
     DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
    [WORKSPACE, key, JSON.stringify(value)],
  )
  return { ok: true }
}

/** Save multiple collections at once (used for one-time migration). */
export async function saveManyState(entries: AllState): Promise<{ ok: true }> {
  await requireSession()
  const client = await pool.connect()
  try {
    await client.query("BEGIN")
    for (const [key, value] of Object.entries(entries)) {
      if (!(ALLOWED_KEYS as readonly string[]).includes(key)) continue
      if (value === undefined) continue
      await client.query(
        `INSERT INTO app_state (workspace, key, value, updated_at)
         VALUES ($1, $2, $3::jsonb, now())
         ON CONFLICT (workspace, key)
         DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
        [WORKSPACE, key, JSON.stringify(value)],
      )
    }
    await client.query("COMMIT")
  } catch (err) {
    await client.query("ROLLBACK")
    throw err
  } finally {
    client.release()
  }
  return { ok: true }
}
