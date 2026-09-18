/**
 * Криптографическая подпись и проверка сессионного токена.
 *
 * Токен: base64url(payloadJSON) + "." + base64url(HMAC-SHA256(payload, secret)).
 * Используется Web Crypto API (globalThis.crypto.subtle), поэтому модуль
 * одинаково работает и в Node-роутах, и в Edge-middleware.
 *
 * ВАЖНО: этот модуль отвечает только за вход/сессию администратора сайта.
 * Он не касается базы данных, Supabase или вебхука синхронизации заявок.
 */

const encoder = new TextEncoder()

/** Имя cookie сессии. HttpOnly + Secure + SameSite=strict выставляются при записи. */
export const SESSION_COOKIE = "sg_session"

/** Срок жизни сессии — 12 часов. По истечении требуется повторный вход. */
export const SESSION_TTL_SECONDS = 12 * 60 * 60

type SessionPayload = {
  /** Признак полностью пройденной двухшаговой аутентификации. */
  ok: true
  /** issued-at (unix seconds). */
  iat: number
  /** expires-at (unix seconds). */
  exp: number
}

function base64urlEncode(bytes: Uint8Array): string {
  let bin = ""
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

function base64urlToBytes(input: string): Uint8Array {
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/")
  const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4))
  const bin = atob(b64 + pad)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

async function importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  )
}

/** Сравнение строк за постоянное время (защита от timing-атак). */
export function timingSafeEqual(a: string, b: string): boolean {
  const ab = encoder.encode(a)
  const bb = encoder.encode(b)
  // Всегда проходим по максимальной длине, чтобы время не зависело от данных.
  const len = Math.max(ab.length, bb.length)
  let diff = ab.length ^ bb.length
  for (let i = 0; i < len; i++) {
    diff |= (ab[i] ?? 0) ^ (bb[i] ?? 0)
  }
  return diff === 0
}

/** Создаёт подписанный сессионный токен со сроком жизни SESSION_TTL_SECONDS. */
export async function createSessionToken(secret: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const payload: SessionPayload = { ok: true, iat: now, exp: now + SESSION_TTL_SECONDS }
  const payloadB64 = base64urlEncode(encoder.encode(JSON.stringify(payload)))
  const key = await importKey(secret)
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payloadB64))
  const sigB64 = base64urlEncode(new Uint8Array(sig))
  return `${payloadB64}.${sigB64}`
}

/**
 * Проверяет токен: корректность подписи (constant-time) и срок жизни.
 * Возвращает true только для валидной непросроченной сессии.
 */
export async function verifySessionToken(
  token: string | undefined | null,
  secret: string,
): Promise<boolean> {
  if (!token || !secret) return false
  const dot = token.indexOf(".")
  if (dot <= 0) return false
  const payloadB64 = token.slice(0, dot)
  const sigB64 = token.slice(dot + 1)

  let expectedSigB64: string
  try {
    const key = await importKey(secret)
    const expected = await crypto.subtle.sign("HMAC", key, encoder.encode(payloadB64))
    expectedSigB64 = base64urlEncode(new Uint8Array(expected))
  } catch {
    return false
  }

  if (!timingSafeEqual(sigB64, expectedSigB64)) return false

  try {
    const payload = JSON.parse(
      new TextDecoder().decode(base64urlToBytes(payloadB64)),
    ) as SessionPayload
    if (payload?.ok !== true) return false
    const now = Math.floor(Date.now() / 1000)
    if (typeof payload.exp !== "number" || payload.exp < now) return false
    return true
  } catch {
    return false
  }
}
