import 'server-only'

/**
 * Серверный модуль для работы с API dyxless.im.
 * Токен НИКОГДА не покидает сервер: клиент обращается только к внутренним
 * роутам /api/*, а они проксируют запрос на внешний API с подставленным токеном.
 */

const BASE_URL = 'https://api.dyxless.im'

// Токен берётся из переменной окружения, при отсутствии — значение по умолчанию,
// чтобы проект работал сразу после деплоя без дополнительной настройки.
const TOKEN =
  process.env.DYXLESS_TOKEN ?? ''

/** Понятное русское сообщение для типовых HTTP-кодов внешнего API. */
function messageForStatus(status: number): string {
  switch (status) {
    case 400:
      return 'Некорректный запрос. Проверьте введённые данные.'
    case 401:
      return 'Неверный токен авторизации.'
    case 403:
      return 'Доступ запрещён или недостаточно средств.'
    case 404:
      return 'Запрос не найден.'
    case 429:
      return 'Слишком много запросов, подождите минуту.'
    case 500:
    case 502:
    case 503:
      return 'Сервис временно недоступен. Попробуйте позже.'
    default:
      return 'Произошла ошибка при обращении к сервису.'
  }
}

interface ProxyOptions {
  /** Путь на внешнем API, например '/v2/query'. */
  path: string
  /** HTTP-метод запроса к внешнему API. */
  method?: 'GET' | 'POST'
  /** Тело от клиента (без токена) — токен добавляется автоматически. */
  body?: Record<string, unknown>
}

/**
 * Выполняет запрос к внешнему API и возвращает Response для клиента
 * с тем же статус-кодом и JSON-телом ответа.
 */
export async function proxyToDyxless({
  path,
  method = 'POST',
  body,
}: ProxyOptions): Promise<Response> {
  const url = `${BASE_URL}${path}`

  try {
    const init: RequestInit = {
      method,
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    }
    if (method === 'POST') {
      init.body = JSON.stringify({ ...(body ?? {}), token: TOKEN })
    }

    const res = await fetch(url, init)

    // Пытаемся прочитать JSON; если не получилось — оборачиваем как ошибку.
    const text = await res.text()
    let data: unknown
    try {
      data = text ? JSON.parse(text) : {}
    } catch {
      data = { error: text || messageForStatus(res.status) }
    }

    if (!res.ok) {
      const payload =
        data && typeof data === 'object'
          ? { message: messageForStatus(res.status), ...(data as object) }
          : { message: messageForStatus(res.status), error: data }
      return Response.json(payload, { status: res.status })
    }

    return Response.json(data, { status: res.status })
  } catch {
    // Сетевая ошибка / внешний сервис недоступен.
    return Response.json(
      { message: 'Сервис временно недоступен. Попробуйте позже.' },
      { status: 503 },
    )
  }
}

/** Безопасно читает JSON-тело входящего запроса (или {} при ошибке). */
export async function readJson(req: Request): Promise<Record<string, unknown>> {
  try {
    const data = await req.json()
    return data && typeof data === 'object' ? (data as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}
