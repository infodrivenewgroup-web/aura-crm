import { NextResponse, type NextRequest } from "next/server"
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session"

/**
 * Edge-middleware безопасности.
 *
 * Закрывает все API-эндпоинты с данными за проверкой сессии, КРОМЕ:
 *   • /api/paid-orders  — вебхук синхронизации заявок (своя защита секретом,
 *                          НЕ должен зависеть от входа администратора);
 *   • /api/auth/*       — сам вход/выход/статус сессии.
 *
 * Ничего не знает о БД/Supabase — только проверяет подпись cookie.
 */

// Публичные API-префиксы, которые НЕ требуют сессии.
const PUBLIC_API_PREFIXES = ["/api/auth", "/api/paid-orders"]

function isPublicApi(pathname: string): boolean {
  return PUBLIC_API_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  )
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Проверяем только /api/*. Остальные маршруты (страница-приложение с экраном
  // входа, статика) отдаются как есть — данные всё равно ходят через /api и
  // серверные экшены, которые защищены отдельно.
  if (!pathname.startsWith("/api/")) {
    return NextResponse.next()
  }

  if (isPublicApi(pathname)) {
    return NextResponse.next()
  }

  const secret = process.env.SESSION_SECRET ?? ""
  const token = req.cookies.get(SESSION_COOKIE)?.value
  const ok = await verifySessionToken(token, secret)

  if (!ok) {
    return NextResponse.json(
      { error: "UNAUTHORIZED" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    )
  }

  return NextResponse.next()
}

export const config = {
  // Ограничиваем работу middleware только API-маршрутами — минимум накладных
  // расходов и никакого влияния на отдачу страниц/статики.
  matcher: ["/api/:path*"],
}
