/**
 * Серверная логика аутентификации администратора сайта.
 * Читает секреты из переменных окружения, сверяет пароль и код доступа за
 * постоянное время и проверяет сессионную cookie.
 *
 * НЕ затрагивает базу данных, Supabase и вебхук синхронизации заявок.
 */
import "server-only"
import { cookies } from "next/headers"
import {
  SESSION_COOKIE,
  timingSafeEqual,
  verifySessionToken,
} from "@/lib/auth/session"

type Secrets = {
  password: string
  code: string
  sessionSecret: string
}

/**
 * Возвращает секреты из окружения. Бросает ошибку, если чего-то нет —
 * это безопасный отказ: без секретов вход невозможен в принципе.
 */
export function getAuthSecrets(): Secrets {
  const password = process.env.APP_ACCESS_PASSWORD ?? ""
  const code = process.env.APP_ACCESS_CODE ?? ""
  const sessionSecret = process.env.SESSION_SECRET ?? ""
  return { password, code, sessionSecret }
}

/** Настроены ли секреты (все три). */
export function authConfigured(): boolean {
  const { password, code, sessionSecret } = getAuthSecrets()
  return Boolean(password && code && sessionSecret)
}

/** Проверка пароля (шаг 1) за постоянное время. */
export function checkPassword(input: string): boolean {
  const { password } = getAuthSecrets()
  if (!password) return false
  return timingSafeEqual(input ?? "", password)
}

/** Проверка кода доступа (шаг 2) за постоянное время. */
export function checkAccessCode(input: string): boolean {
  const { code } = getAuthSecrets()
  if (!code) return false
  return timingSafeEqual(input ?? "", code)
}

/** Проверяет валидность текущей сессии по cookie (для серверных экшенов/страниц). */
export async function hasValidSession(): Promise<boolean> {
  const { sessionSecret } = getAuthSecrets()
  if (!sessionSecret) return false
  const store = await cookies()
  const token = store.get(SESSION_COOKIE)?.value
  return verifySessionToken(token, sessionSecret)
}

/**
 * Гард для серверных экшенов, отдающих или меняющих данные.
 * Бросает ошибку, если сессия невалидна — вызов прерывается до доступа к БД.
 */
export async function requireSession(): Promise<void> {
  const ok = await hasValidSession()
  if (!ok) {
    throw new Error("UNAUTHORIZED")
  }
}

/* --------------------------- Rate limiting входа --------------------------- */

type Bucket = { count: number; resetAt: number }
const attempts = new Map<string, Bucket>()

const WINDOW_MS = 15 * 60 * 1000 // 15 минут
const MAX_ATTEMPTS = 10 // не более 10 неудачных попыток за окно на ключ

/**
 * Регистрирует попытку входа и возвращает, не превышен ли лимит.
 * Возвращает { limited, retryAfterSec }.
 */
export function registerAttempt(key: string): { limited: boolean; retryAfterSec: number } {
  const now = Date.now()
  const b = attempts.get(key)
  if (!b || b.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return { limited: false, retryAfterSec: 0 }
  }
  b.count += 1
  if (b.count > MAX_ATTEMPTS) {
    return { limited: true, retryAfterSec: Math.ceil((b.resetAt - now) / 1000) }
  }
  return { limited: false, retryAfterSec: 0 }
}

/** Сбрасывает счётчик попыток (после успешного входа). */
export function clearAttempts(key: string): void {
  attempts.delete(key)
}
