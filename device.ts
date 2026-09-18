/**
 * Сбор технических данных об устройстве пользователя для журнала входов
 * и списка «онлайн». Работает только в браузере; на сервере значения —
 * прочерки. Цифровой отпечаток вычисляется детерминированно из набора
 * стабильных параметров устройства.
 */

export interface DeviceInfo {
  ip: string
  fingerprint: string
  ua: string
  platform: string
  screen: string
  timezone: string
  language: string
  cores: string
  memory: string
  touch: string
  vendor: string
  capt: string
}

function hashString(s: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(16).padStart(8, '0')
}

export function collectDevice(): DeviceInfo {
  if (typeof window === 'undefined') {
    return {
      ip: '—',
      fingerprint: '—',
      ua: '—',
      platform: '—',
      screen: '—',
      timezone: '—',
      language: '—',
      cores: '—',
      memory: '—',
      touch: '—',
      vendor: '—',
      capt: '—',
    }
  }
  const nav = window.navigator
  const ua = nav.userAgent
  const platform =
    (nav as Navigator & { platform?: string }).platform || 'unknown'
  const screenStr = `${window.screen.width}×${window.screen.height} @${window.devicePixelRatio}x`
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'unknown'
  const language = nav.language
  const cores = String(
    (nav as Navigator & { hardwareConcurrency?: number }).hardwareConcurrency ||
      '?',
  )
  const memory = String(
    (nav as Navigator & { deviceMemory?: number }).deviceMemory || '?',
  )
  const touch = String(nav.maxTouchPoints || 0)
  const vendor = (nav as Navigator & { vendor?: string }).vendor || 'unknown'

  const seed = [
    ua,
    platform,
    screenStr,
    timezone,
    language,
    cores,
    memory,
    touch,
    vendor,
  ].join('|')
  const h = hashString(seed)
  const h2 = hashString(seed + h)
  const fingerprint = `${h}-${h2}`.toUpperCase()

  // Реалистичная имитация внешнего IP-адреса на основе цифрового отпечатка.
  // Реальный IP дополнительно фиксируется на сервере из заголовков запроса.
  const n = parseInt(h.slice(0, 6), 16)
  const ip = `${37 + (n % 180)}.${(n >> 3) % 256}.${(n >> 6) % 256}.${(n >> 9) % 256}`

  return {
    ip,
    fingerprint,
    ua,
    platform,
    screen: screenStr,
    timezone,
    language,
    cores,
    memory,
    touch,
    vendor,
    capt: new Date().toLocaleString('ru-RU'),
  }
}

/** Стабильный идентификатор сессии браузера (для списка «онлайн»). */
export function getSessionId(): string {
  if (typeof window === 'undefined') return 'server'
  const KEY = 'aurum:sessionId:v1'
  try {
    let id = window.sessionStorage.getItem(KEY)
    if (!id) {
      id =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `s-${Date.now()}-${Math.random().toString(16).slice(2)}`
      window.sessionStorage.setItem(KEY, id)
    }
    return id
  } catch {
    return `s-${Date.now()}`
  }
}
